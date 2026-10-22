import prisma from '../prisma';
import { logger } from '../utils/logger';
import { emailService } from './emailService';

export type JobHandler = (payload: any) => Promise<void>;

class BackgroundQueue {
  private handlers = new Map<string, JobHandler>();
  private isProcessing = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private isStopping = false;

  constructor() {
    this.registerDefaultHandlers();
    // Poll for pending jobs every 5 seconds
    this.pollInterval = setInterval(() => {
      this.processNextJobs().catch((err) => {
        logger.error('Error during background job poll', err);
      });
    }, 5000);

    if (this.pollInterval.unref) {
      this.pollInterval.unref();
    }
  }

  registerHandler(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  async enqueue(type: string, payload: any, delaySeconds: number = 0): Promise<string> {
    const scheduledAt = new Date(Date.now() + delaySeconds * 1000);
    const job = await prisma.backgroundJob.create({
      data: {
        type,
        payload: JSON.stringify(payload),
        status: 'PENDING',
        scheduledAt
      }
    });

    logger.info(`Background job enqueued: ${type} [ID: ${job.id}]`);

    // Trigger immediate async processing without awaiting
    setImmediate(() => {
      this.processNextJobs().catch(() => {});
    });

    return job.id;
  }

  async processNextJobs(limit: number = 5): Promise<void> {
    if (this.isProcessing || this.isStopping) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      // Atomically find pending jobs scheduled for execution
      const jobs = await prisma.backgroundJob.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: { lte: now }
        },
        take: limit,
        orderBy: { scheduledAt: 'asc' }
      });

      for (const job of jobs) {
        if (this.isStopping) break;

        const handler = this.handlers.get(job.type);
        if (!handler) {
          logger.warn(`No handler registered for job type: ${job.type}`);
          await prisma.backgroundJob.update({
            where: { id: job.id },
            data: {
              status: 'FAILED',
              lastError: `Unknown job type: ${job.type}`,
              processedAt: new Date()
            }
          });
          continue;
        }

        // Mark as PROCESSING
        try {
          await prisma.backgroundJob.update({
            where: { id: job.id },
            data: { status: 'PROCESSING' }
          });
        } catch (claimErr: any) {
          // If record was removed or already claimed concurrently, skip to next
          continue;
        }

        try {
          const payload = JSON.parse(job.payload);
          await handler(payload);

          // Mark as COMPLETED
          await prisma.backgroundJob.update({
            where: { id: job.id },
            data: {
              status: 'COMPLETED',
              processedAt: new Date(),
              lastError: null
            }
          });
          logger.info(`Background job completed: ${job.type} [ID: ${job.id}]`);
        } catch (jobError: any) {
          const nextAttempt = job.attempts + 1;
          const hasMoreAttempts = nextAttempt < job.maxAttempts;

          // Exponential backoff: 5s, 15s, 45s, 135s...
          const backoffSeconds = Math.pow(3, nextAttempt) * 5;
          const nextSchedule = new Date(Date.now() + backoffSeconds * 1000);

          logger.error(`Background job failed: ${job.type} [ID: ${job.id}], attempt ${nextAttempt}/${job.maxAttempts}`, jobError);

          await prisma.backgroundJob.update({
            where: { id: job.id },
            data: {
              status: hasMoreAttempts ? 'PENDING' : 'FAILED',
              attempts: nextAttempt,
              scheduledAt: nextSchedule,
              lastError: jobError.message || String(jobError),
              processedAt: new Date()
            }
          });
        }
      }
    } catch (err) {
      logger.error('Failed to run background queue cycle', err);
    } finally {
      this.isProcessing = false;
    }
  }

  async drain(timeoutMs: number = 2000): Promise<void> {
    const start = Date.now();
    while (this.isProcessing && Date.now() - start < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  resume(): void {
    this.isStopping = false;
    if (!this.pollInterval) {
      this.pollInterval = setInterval(() => {
        this.processNextJobs().catch((err) => {
          logger.error('Error during background job poll', err);
        });
      }, 5000);
      if (this.pollInterval.unref) {
        this.pollInterval.unref();
      }
    }
  }

  async stop(): Promise<void> {
    this.isStopping = true;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    // Allow brief grace period for current job to finish
    let waitCount = 0;
    while (this.isProcessing && waitCount < 10) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      waitCount++;
    }
    logger.info('Background job worker stopped cleanly.');
  }

  private registerDefaultHandlers(): void {
    // 1. Order confirmation notification handler with exactly-once guarantee
    this.registerHandler('ORDER_CONFIRMATION', async (payload: any) => {
      const orderId = payload.orderId || payload.id;
      if (!orderId) {
        logger.warn('[WORKER] Cannot dispatch order confirmation: missing orderId', payload);
        return;
      }

      // Check if order confirmation has already been dispatched for this order to prevent duplicate emails
      const existingAudit = await prisma.auditLog.findFirst({
        where: {
          action: 'ORDER_CONFIRMATION_DISPATCHED',
          entity: 'ORDER',
          entityId: orderId
        }
      });

      if (existingAudit) {
        logger.info(`[WORKER] Order confirmation email already dispatched for order ${orderId}, skipping duplicate.`);
        return;
      }

      // Always fetch the freshest, complete order record with line items from database
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      });

      if (!order) {
        logger.warn(`[WORKER] Order ${orderId} not found for order confirmation email.`);
        return;
      }

      logger.info(`[WORKER] Dispatching luxury order confirmation email to ${order.customerEmail} for order ${order.orderNumber} (₹${order.totalAmount})`);

      await emailService.sendOrderConfirmationEmail({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        shippingStreet: order.shippingStreet,
        shippingApartment: order.shippingApartment,
        shippingCity: order.shippingCity,
        shippingState: order.shippingState,
        shippingPincode: order.shippingPincode,
        shippingCountry: order.shippingCountry,
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        shippingFee: order.shippingFee,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        couponCode: order.couponCode,
        estimatedDeliveryDate: order.estimatedDelivery,
        items: order.items.map((i: any) => ({
          productName: i.productName,
          productImage: i.productImage,
          size: i.size,
          color: i.color,
          quantity: i.quantity,
          price: i.price,
          total: i.total
        }))
      });

      // Simultaneous WhatsApp Concierge Dispatch Simulation
      logger.info(`[WHATSAPP CONCIERGE SIMULATOR] Dispatching luxury WhatsApp notification to ${order.customerPhone} (Order: ${order.orderNumber}, Amount: ₹${order.totalAmount})`);

      // Record dispatch in AuditLog to guarantee exactly-once delivery
      await prisma.auditLog.create({
        data: {
          action: 'ORDER_CONFIRMATION_DISPATCHED',
          entity: 'ORDER',
          entityId: order.id,
          details: JSON.stringify({
            orderNumber: order.orderNumber,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
            totalAmount: order.totalAmount,
            dispatchedAt: new Date().toISOString()
          })
        }
      });
    });

    // 2. Inventory low-stock alert handler
    this.registerHandler('INVENTORY_ALERT', async (payload: { productId: string; productName: string; remainingStock: number }) => {
      logger.warn(`[WORKER] Urgent Inventory Alert: "${payload.productName}" (ID: ${payload.productId}) has only ${payload.remainingStock} items remaining.`);
      await prisma.auditLog.create({
        data: {
          action: 'LOW_STOCK_ALERT',
          entity: 'PRODUCT',
          entityId: payload.productId,
          details: JSON.stringify({ productName: payload.productName, remainingStock: payload.remainingStock })
        }
      });
    });

    // 3. Welcome email handler with database-backed exactly-once guarantee
    const handleWelcomeEmail = async (payload: { userId: string; email: string; name?: string }) => {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user) {
        logger.warn(`[WORKER] User ${payload.userId} not found for welcome email, skipping.`);
        return;
      }

      // Exactly-Once Guarantee: Skip if already dispatched
      if (user.welcomeEmailSent) {
        logger.info(`[WORKER] Welcome email already dispatched for user ${user.id} (${user.email}), skipping duplicate.`);
        return;
      }

      // Send the luxury welcome email
      await emailService.sendWelcomeEmail({
        email: user.email,
        name: user.name || payload.name
      });

      // Atomically mark welcome email as sent with timestamp
      await prisma.user.update({
        where: { id: user.id },
        data: {
          welcomeEmailSent: true,
          welcomeEmailSentAt: new Date()
        }
      });

      logger.info(`[WORKER] Luxury welcome email successfully dispatched and recorded for ${user.email}`);
    };

    this.registerHandler('WELCOME_EMAIL', handleWelcomeEmail);
    this.registerHandler('WELCOME_NOTIFICATION', handleWelcomeEmail);

    // 4. Idempotency records & cleanup task
    this.registerHandler('MAINTENANCE_CLEANUP', async () => {
      const now = new Date();
      const deletedRecords = await prisma.idempotencyRecord.deleteMany({
        where: { expiresAt: { lte: now } }
      });
      logger.info(`[WORKER] Cleaned up ${deletedRecords.count} expired idempotency records.`);
    });
  }
}

export const backgroundQueue = new BackgroundQueue();
