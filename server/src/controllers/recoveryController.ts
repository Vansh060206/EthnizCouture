import { Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { emailService } from '../services/emailService';

/**
 * Verifies the n8n inbound secret using timing-safe comparison of SHA-256 digests.
 * Prevents length leaks and timing side-channel attacks.
 */
export function verifyN8nSecret(providedSecret: string | undefined): boolean {
  const configuredSecret = config.n8nInboundSecret;
  if (!configuredSecret || !providedSecret) {
    return false;
  }

  const actualHash = crypto.createHash('sha256').update(providedSecret.trim()).digest();
  const expectedHash = crypto.createHash('sha256').update(configuredSecret.trim()).digest();

  if (crypto.timingSafeEqual(expectedHash, actualHash)) {
    return true;
  }

  // Gracefully accept n8nOutboundSecret if configured and provided
  if (config.n8nOutboundSecret && config.n8nOutboundSecret !== configuredSecret) {
    const outboundHash = crypto.createHash('sha256').update(config.n8nOutboundSecret.trim()).digest();
    if (crypto.timingSafeEqual(outboundHash, actualHash)) {
      return true;
    }
  }

  return false;
}

/**
 * Handles authenticated server-to-server callback from n8n after the wait interval.
 * Re-validates cart state, checks customer marketing consent, enforces idempotency,
 * and triggers luxury recovery email dispatch.
 *
 * NOTE: Responses NEVER include customer PII or cart item details (Requirement 7).
 */
export async function handleCartCallback(req: Request, res: Response): Promise<void> {
  const authHeader = req.header('X-N8N-Key') || req.header('X-N8N-KEY') || req.header('x-n8n-key');

  if (!verifyN8nSecret(authHeader)) {
    logger.warn('[CART RECOVERY] Unauthorized n8n callback attempt rejected');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { cartId, version: rawVersion } = req.body || {};
  const version = typeof rawVersion === 'number'
    ? rawVersion
    : (typeof rawVersion === 'string' && /^\d+$/.test(rawVersion.trim()) ? parseInt(rawVersion.trim(), 10) : NaN);

  if (!cartId || typeof cartId !== 'string' || typeof version !== 'number' || isNaN(version) || version < 1) {
    res.status(400).json({ error: 'Invalid payload: cartId and positive integer version are required' });
    return;
  }

  try {
    // 1. Persistent Idempotency Check: check if this cart version was already handled
    const existingRecovery = await prisma.cartRecovery.findUnique({
      where: {
        cartId_cartVersion: {
          cartId,
          cartVersion: version
        }
      }
    });

    if (existingRecovery) {
      if (existingRecovery.status === 'SENT') {
        logger.info(`[CART RECOVERY] Cart ${cartId} v${version} was already sent on ${existingRecovery.sentAt}, skipping duplicate`);
        res.status(200).json({
          success: true,
          status: 'SKIPPED',
          reason: 'ALREADY_SENT'
        });
        return;
      }

      if (existingRecovery.status === 'PROCESSING') {
        logger.info(`[CART RECOVERY] Cart ${cartId} v${version} is currently processing, skipping concurrent callback`);
        res.status(200).json({
          success: true,
          status: 'SKIPPED',
          reason: 'PROCESSING_IN_PROGRESS'
        });
        return;
      }

      if (existingRecovery.status === 'SKIPPED') {
        logger.info(`[CART RECOVERY] Cart ${cartId} v${version} previously skipped (${existingRecovery.skipReason})`);
        res.status(200).json({
          success: true,
          status: 'SKIPPED',
          reason: existingRecovery.skipReason || 'PREVIOUSLY_SKIPPED'
        });
        return;
      }
    }

    // 2. Fetch current cart state with relations
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        user: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!cart) {
      logger.info(`[CART RECOVERY] Cart ${cartId} not found in database, skipping`);
      res.status(200).json({
        success: true,
        status: 'SKIPPED',
        reason: 'CART_NOT_FOUND'
      });
      return;
    }

    if (!cart.userId || !cart.user) {
      logger.info(`[CART RECOVERY] Cart ${cartId} has no associated user (guest cart), skipping`);
      res.status(200).json({
        success: true,
        status: 'SKIPPED',
        reason: 'GUEST_CART'
      });
      return;
    }

    const userId = cart.userId;

    // Helper to persist skipped state
    const recordSkipped = async (reason: string) => {
      await prisma.cartRecovery.upsert({
        where: { cartId_cartVersion: { cartId, cartVersion: version } },
        create: {
          cartId,
          userId,
          cartVersion: version,
          status: 'SKIPPED',
          skipReason: reason
        },
        update: {
          status: 'SKIPPED',
          skipReason: reason
        }
      });
    };

    // 3. Validation: Cart Version
    if (cart.version !== version) {
      logger.info(`[CART RECOVERY] Cart ${cartId} version changed from v${version} to v${cart.version}, skipping stale callback`);
      await recordSkipped('VERSION_SUPERSEDED');
      res.status(200).json({
        success: true,
        status: 'SKIPPED',
        reason: 'VERSION_SUPERSEDED'
      });
      return;
    }

    // 4. Validation: Cart Contents (Empty Cart)
    if (!cart.items || cart.items.length === 0) {
      logger.info(`[CART RECOVERY] Cart ${cartId} is empty, skipping`);
      await recordSkipped('CART_EMPTY');
      res.status(200).json({
        success: true,
        status: 'SKIPPED',
        reason: 'CART_EMPTY'
      });
      return;
    }

    // 5. Validation: Last Activity
    if (!cart.lastActivityAt) {
      logger.info(`[CART RECOVERY] Cart ${cartId} has no lastActivityAt recorded, skipping legacy cart`);
      await recordSkipped('NO_RECENT_ACTIVITY');
      res.status(200).json({
        success: true,
        status: 'SKIPPED',
        reason: 'NO_RECENT_ACTIVITY'
      });
      return;
    }

    // 6. Validation: Customer Marketing Consent
    if (cart.user.marketingConsent !== true) {
      logger.info(`[CART RECOVERY] User ${userId} has not granted marketing consent, skipping`);
      await recordSkipped('NO_MARKETING_CONSENT');
      res.status(200).json({
        success: true,
        status: 'SKIPPED',
        reason: 'NO_MARKETING_CONSENT'
      });
      return;
    }

    // 7. Validation: Unsubscribed Status
    if (cart.user.unsubscribedAt !== null) {
      logger.info(`[CART RECOVERY] User ${userId} unsubscribed on ${cart.user.unsubscribedAt}, skipping`);
      await recordSkipped('USER_UNSUBSCRIBED');
      res.status(200).json({
        success: true,
        status: 'SKIPPED',
        reason: 'USER_UNSUBSCRIBED'
      });
      return;
    }

    // 8. Validation: Completed or Recent Order
    const recentOrder = await prisma.order.findFirst({
      where: {
        userId,
        createdAt: {
          gte: new Date(cart.lastActivityAt.getTime() - 60000)
        },
        paymentStatus: {
          in: ['PAID', 'PENDING']
        }
      }
    });

    if (recentOrder) {
      logger.info(`[CART RECOVERY] User ${userId} placed order ${recentOrder.orderNumber} since cart activity, skipping`);
      await recordSkipped('ORDER_COMPLETED');
      res.status(200).json({
        success: true,
        status: 'SKIPPED',
        reason: 'ORDER_COMPLETED'
      });
      return;
    }

    // 9. Validation: 72-Hour Recovery Email Cooldown
    const recentSentRecovery = await prisma.cartRecovery.findFirst({
      where: {
        userId,
        status: 'SENT',
        sentAt: {
          gte: new Date(Date.now() - 72 * 60 * 60 * 1000)
        }
      }
    });

    if (recentSentRecovery) {
      logger.info(`[CART RECOVERY] User ${userId} received recovery email within 72h cooldown, skipping`);
      await recordSkipped('COOLDOWN_ACTIVE');
      res.status(200).json({
        success: true,
        status: 'SKIPPED',
        reason: 'COOLDOWN_ACTIVE'
      });
      return;
    }

    // 10. Persistent State Transition: PROCESSING
    await prisma.cartRecovery.upsert({
      where: { cartId_cartVersion: { cartId, cartVersion: version } },
      create: {
        cartId,
        userId,
        cartVersion: version,
        status: 'PROCESSING'
      },
      update: {
        status: 'PROCESSING'
      }
    });

    // 11. Format Email Items & Subtotal
    const emailItems = cart.items.map((item) => ({
      productName: item.product.name,
      productImage: null,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      price: item.product.price
    }));

    const subtotal = emailItems.reduce((acc, it) => acc + it.price * it.quantity, 0);

    // 12. Dispatch Email
    try {
      const emailResult = await emailService.sendAbandonedCartRecoveryEmail({
        customerEmail: cart.user.email,
        customerName: cart.user.name,
        cartId: cart.id,
        items: emailItems,
        subtotal
      });

      // Update persistent record to SENT
      await prisma.cartRecovery.update({
        where: { cartId_cartVersion: { cartId, cartVersion: version } },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          emailMessageId: emailResult.messageId || null
        }
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'CART_RECOVERY_EMAIL_SENT',
          entity: 'CART',
          entityId: cart.id,
          details: JSON.stringify({
            version,
            itemCount: emailItems.length,
            subtotal,
            provider: emailResult.provider,
            messageId: emailResult.messageId
          })
        }
      });

      logger.info(`[CART RECOVERY] Successfully dispatched recovery email for cart ${cartId} v${version}`);

      // Respond to n8n without any customer PII
      res.status(200).json({
        success: true,
        status: 'SENT'
      });
    } catch (sendError: any) {
      logger.error('[CART RECOVERY] Failed to dispatch recovery email:', sendError);

      await prisma.cartRecovery.update({
        where: { cartId_cartVersion: { cartId, cartVersion: version } },
        data: {
          status: 'FAILED',
          metadata: JSON.stringify({ error: sendError.message || 'Unknown email failure' })
        }
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'CART_RECOVERY_EMAIL_FAILED',
          entity: 'CART',
          entityId: cart.id,
          details: JSON.stringify({
            version,
            error: sendError.message
          })
        }
      });

      res.status(500).json({
        success: false,
        status: 'FAILED',
        reason: 'EMAIL_DISPATCH_FAILED'
      });
    }
  } catch (err: any) {
    logger.error('[CART RECOVERY] Unexpected error processing cart callback:', err);
    res.status(500).json({
      error: 'Internal server error processing recovery callback'
    });
  }
}
