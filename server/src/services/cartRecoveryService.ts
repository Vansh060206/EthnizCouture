import { config } from '../config';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { backgroundQueue } from './backgroundQueue';

export interface MinimalCartEventPayload {
  cartId: string;
  version: number;
  eventId: string;
  occurredAt: string;
}

export const cartRecoveryService = {
  /**
   * TRANSACTIONAL OUTBOX:
   * Writes a durable N8N_CART_RECOVERY_TRIGGER job to the BackgroundJob table
   * using the active database transaction client (tx).
   *
   * If the enclosing cart mutation transaction commits, the job is persisted.
   * If the mutation transaction rolls back, this job is rolled back with it.
   */
  async recordCartMutationOutbox(
    tx: any,
    cartId: string,
    newVersion: number
  ): Promise<MinimalCartEventPayload> {
    const eventId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `cre_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const payload: MinimalCartEventPayload = {
      cartId: String(cartId),
      version: Number(newVersion),
      eventId,
      occurredAt: new Date().toISOString()
    };

    await tx.backgroundJob.create({
      data: {
        type: 'N8N_CART_RECOVERY_TRIGGER',
        payload: JSON.stringify(payload),
        status: 'PENDING',
        scheduledAt: new Date()
      }
    });

    return payload;
  },

  /**
   * Dispatches minimal payload to the n8n webhook endpoint with bounded timeout and auth header.
   * Whitelist prevents any customer PII, addresses, or items from ever being transmitted.
   */
  async postWebhook(payload: MinimalCartEventPayload): Promise<void> {
    if (!config.n8nWebhookUrl) {
      logger.debug('[CART RECOVERY] n8n webhook URL not configured, skipping HTTP post', {
        cartId: payload.cartId,
        version: payload.version
      });
      return;
    }

    const sanitizedBody = {
      cartId: String(payload.cartId),
      version: Number(payload.version),
      eventId: String(payload.eventId),
      occurredAt: String(payload.occurredAt)
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'EthnizCouture-CartRecovery/1.0',
      'X-Event-Id': payload.eventId
    };

    const outboundSecret = config.n8nOutboundSecret || config.n8nInboundSecret;
    if (outboundSecret) {
      headers['X-N8N-Key'] = outboundSecret;
    }

    const response = await fetch(config.n8nWebhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(sanitizedBody),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`n8n webhook responded with HTTP ${response.status}`);
    }

    logger.info(`[CART RECOVERY] Dispatched cart event to n8n successfully [Cart: ${payload.cartId}, v${payload.version}, Event: ${payload.eventId}]`);
  },

  /**
   * Executes the N8N_CART_RECOVERY_TRIGGER background job with:
   * 1. Safe deduplication & idempotency checking via AuditLog
   * 2. Superseded version detection (skips stale older version if cart already advanced)
   * 3. Preserves the exact same eventId across automatic retries
   */
  async handleTriggerJob(payload: MinimalCartEventPayload): Promise<void> {
    // 1. Check if this exact event was already delivered
    const existingDelivery = await prisma.auditLog.findFirst({
      where: {
        action: 'N8N_CART_EVENT_DELIVERED',
        entity: 'CART',
        entityId: payload.cartId,
        details: { contains: payload.eventId }
      }
    });

    if (existingDelivery) {
      logger.info(`[CART RECOVERY] Event ${payload.eventId} already delivered for cart ${payload.cartId}, skipping duplicate.`);
      return;
    }

    // 2. Check if a newer version of the cart already exists
    const currentCart = await prisma.cart.findUnique({
      where: { id: payload.cartId },
      select: { version: true }
    });

    if (currentCart && currentCart.version > payload.version) {
      logger.info(`[CART RECOVERY] Cart ${payload.cartId} has already advanced to v${currentCart.version}. Superseding v${payload.version}.`);
      // Record as superseded so worker marks it completed
      await prisma.auditLog.create({
        data: {
          action: 'N8N_CART_EVENT_SUPERSEDED',
          entity: 'CART',
          entityId: payload.cartId,
          details: JSON.stringify({
            eventId: payload.eventId,
            supersededVersion: payload.version,
            currentVersion: currentCart.version,
            recordedAt: new Date().toISOString()
          })
        }
      });
      return;
    }

    // 3. Dispatch to n8n webhook
    await this.postWebhook(payload);

    // 4. Record successful delivery idempotency log
    await prisma.auditLog.create({
      data: {
        action: 'N8N_CART_EVENT_DELIVERED',
        entity: 'CART',
        entityId: payload.cartId,
        details: JSON.stringify({
          eventId: payload.eventId,
          version: payload.version,
          dispatchedAt: new Date().toISOString()
        })
      }
    });
  }
};

// Register durable outbox handler with backgroundQueue
backgroundQueue.registerHandler('N8N_CART_RECOVERY_TRIGGER', async (payload: MinimalCartEventPayload) => {
  await cartRecoveryService.handleTriggerJob(payload);
});
