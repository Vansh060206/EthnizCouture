process.env.NODE_ENV = 'test';
import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/server';
import prisma from '../src/prisma';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import { backgroundQueue } from '../src/services/backgroundQueue';
import { cartRecoveryService } from '../src/services/cartRecoveryService';

describe('Phase 1: Cart Versioning, Transactions & Outbox Tests', () => {
  let testUser: any;
  let testToken: string;
  let testProduct: any;
  const originalFetch = global.fetch;
  const originalWebhookUrl = config.n8nWebhookUrl;
  const originalInboundSecret = config.n8nInboundSecret;
  let deliveredEvents: any[] = [];

  before(async () => {
    // Setup test customer
    testUser = await prisma.user.upsert({
      where: { email: 'cart.version.test@ethnizcouture.com' },
      update: { role: 'CUSTOMER', marketingConsent: false },
      create: {
        name: 'Cart Version Test Patron',
        email: 'cart.version.test@ethnizcouture.com',
        role: 'CUSTOMER',
        marketingConsent: false
      }
    });

    testToken = jwt.sign(
      { id: testUser.id, email: testUser.email, role: 'CUSTOMER', name: testUser.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // Setup test category & product
    const category = await prisma.category.upsert({
      where: { slug: 'test-cart-recovery-category' },
      update: {},
      create: {
        name: 'Cart Recovery Test Category',
        slug: 'test-cart-recovery-category'
      }
    });

    testProduct = await prisma.product.upsert({
      where: { sku: 'TEST-SKU-CART-REC-001' },
      update: { stock: 50, price: 4999, isActive: true },
      create: {
        name: 'Royal Banarasi Silk Lehenga (Test)',
        slug: 'royal-banarasi-silk-lehenga-test',
        sku: 'TEST-SKU-CART-REC-001',
        description: 'Luxury handwoven pure katan silk lehenga for testing.',
        price: 4999,
        stock: 50,
        isActive: true,
        categoryId: category.id
      }
    });

    // Mock n8n webhook fetch
    config.n8nWebhookUrl = 'https://n8n.example.com/webhook/cart-events';
    config.n8nInboundSecret = 'phase1-test-secret';

    global.fetch = (async (url: any, init: any) => {
      const body = JSON.parse(init?.body || '{}');
      deliveredEvents.push({
        url: String(url),
        headers: init?.headers,
        body
      });
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      } as any;
    }) as any;
  });

  after(async () => {
    global.fetch = originalFetch;
    config.n8nWebhookUrl = originalWebhookUrl;
    config.n8nInboundSecret = originalInboundSecret;

    // Clean up test data
    if (testUser) {
      const cart = await prisma.cart.findUnique({ where: { userId: testUser.id } });
      if (cart) {
        await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        await prisma.cart.delete({ where: { id: cart.id } });
      }
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
  });

  beforeEach(async () => {
    await backgroundQueue.drain();
    await new Promise((r) => setTimeout(r, 50));
    deliveredEvents = [];

    // Reset cart & pending test jobs to clean slate
    const existingCart = await prisma.cart.findUnique({ where: { userId: testUser.id } });
    if (existingCart) {
      await prisma.cartItem.deleteMany({ where: { cartId: existingCart.id } });
      await prisma.backgroundJob.deleteMany({ where: { payload: { contains: existingCart.id } } });
      await prisma.cart.delete({ where: { id: existingCart.id } });
    }
  });

  describe('1. Existing-Cart Eligibility & Migration Baseline', () => {
    test('Pre-existing cart has null lastActivityAt and marketingConsent is false', async () => {
      // Create cart simulating a pre-existing record created before cart activity tracking
      const legacyCart = await prisma.cart.create({
        data: {
          userId: testUser.id,
          version: 1,
          lastActivityAt: null // Explicitly uninitialized
        }
      });

      assert.strictEqual(legacyCart.version, 1);
      assert.strictEqual(legacyCart.lastActivityAt, null);

      // Verify customer marketing consent is strictly false
      const user = await prisma.user.findUnique({ where: { id: testUser.id } });
      assert.strictEqual(user?.marketingConsent, false);
      assert.strictEqual(user?.unsubscribedAt, null);
    });
  });

  describe('2. State-Changing Cart Mutations Increment Version & Outbox', () => {
    test('POST /api/cart/items increments cart.version and creates outbox BackgroundJob', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          productId: testProduct.id,
          size: 'M',
          color: 'Royal Maroon',
          quantity: 2
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.cart.version, 2);
      assert.ok(res.body.cart.lastActivityAt !== null);

      // Verify outbox BackgroundJob was created in the same transaction
      const job = await prisma.backgroundJob.findFirst({
        where: {
          type: 'N8N_CART_RECOVERY_TRIGGER',
          payload: { contains: res.body.cart.id }
        },
        orderBy: { createdAt: 'desc' }
      });

      assert.ok(job, 'Transactional outbox BackgroundJob must exist');
      const payload = JSON.parse(job.payload);
      assert.strictEqual(payload.cartId, res.body.cart.id);
      assert.strictEqual(payload.version, 2);
      assert.ok(payload.eventId.startsWith('cre_') || payload.eventId.length > 10);
    });

    test('No-op quantity update does NOT increment cart.version or create outbox job', async () => {
      // First add an item (version becomes 2)
      const addRes = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ productId: testProduct.id, quantity: 2 });

      assert.strictEqual(addRes.status, 200);
      const cartId = addRes.body.cart.id;
      const itemId = addRes.body.cart.items[0].id;
      const initialVersion = addRes.body.cart.version;

      const jobsCountBefore = await prisma.backgroundJob.count({
        where: { type: 'N8N_CART_RECOVERY_TRIGGER', payload: { contains: cartId } }
      });

      // Update with the exact same quantity: 2
      const updateRes = await request(app)
        .put(`/api/cart/items/${itemId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ quantity: 2 });

      assert.strictEqual(updateRes.status, 200);

      // Cart version MUST NOT have changed
      const cartAfter = await prisma.cart.findUnique({ where: { id: cartId } });
      assert.strictEqual(cartAfter?.version, initialVersion);

      // No new outbox job should have been created
      const jobsCountAfter = await prisma.backgroundJob.count({
        where: { type: 'N8N_CART_RECOVERY_TRIGGER', payload: { contains: cartId } }
      });
      assert.strictEqual(jobsCountAfter, jobsCountBefore);
    });

    test('Changing quantity or removing item increments cart.version', async () => {
      // Add item (version 2)
      const addRes = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ productId: testProduct.id, quantity: 1 });

      const cartId = addRes.body.cart.id;
      const itemId = addRes.body.cart.items[0].id;

      // Update quantity to 3 (version should become 3)
      const updateRes = await request(app)
        .put(`/api/cart/items/${itemId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ quantity: 3 });

      assert.strictEqual(updateRes.status, 200);
      const cartAfterUpdate = await prisma.cart.findUnique({ where: { id: cartId } });
      assert.strictEqual(cartAfterUpdate?.version, 3);

      // Remove item (version should become 4)
      const removeRes = await request(app)
        .delete(`/api/cart/items/${itemId}`)
        .set('Authorization', `Bearer ${testToken}`);

      assert.strictEqual(removeRes.status, 200);
      const cartAfterRemove = await prisma.cart.findUnique({ where: { id: cartId } });
      assert.strictEqual(cartAfterRemove?.version, 4);
    });
  });

  describe('3. Transaction Rollback & Concurrency Controls', () => {
    test('Rolls back version increment and outbox job if mutation exceeds stock', async () => {
      // Initial cart setup
      const addRes = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ productId: testProduct.id, quantity: 1 });

      const cartId = addRes.body.cart.id;
      const baselineVersion = addRes.body.cart.version;

      const jobsCountBefore = await prisma.backgroundJob.count({
        where: { type: 'N8N_CART_RECOVERY_TRIGGER', payload: { contains: cartId } }
      });

      // Attempt to add 9999 items (exceeding stock)
      const failRes = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ productId: testProduct.id, quantity: 9999 });

      assert.strictEqual(failRes.status, 400);

      // Verify transaction rolled back: version unchanged, no job created
      const cartAfterFail = await prisma.cart.findUnique({ where: { id: cartId } });
      assert.strictEqual(cartAfterFail?.version, baselineVersion);

      const jobsCountAfter = await prisma.backgroundJob.count({
        where: { type: 'N8N_CART_RECOVERY_TRIGGER', payload: { contains: cartId } }
      });
      assert.strictEqual(jobsCountAfter, jobsCountBefore);
    });

    test('Sequential atomic mutations advance version reliably without race condition corruption', async () => {
      // Perform 3 sequential mutations
      for (let i = 1; i <= 3; i++) {
        const res = await request(app)
          .post('/api/cart/items')
          .set('Authorization', `Bearer ${testToken}`)
          .send({
            productId: testProduct.id,
            size: `Size_${i}`,
            quantity: 1
          });
        assert.strictEqual(res.status, 200);
      }

      const cart = await prisma.cart.findUnique({
        where: { userId: testUser.id },
        include: { items: true }
      });

      // Cart started at v1, 3 distinct adds => v4
      assert.strictEqual(cart?.version, 4);
      assert.strictEqual(cart?.items.length, 3);
    });
  });

  describe('4. Outbox Worker Execution, Deduplication & Superseded Handling', () => {
    test('Background worker dispatches to n8n, preserves eventId, and deduplicates retries', async () => {
      // Add item to produce outbox job
      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ productId: testProduct.id, quantity: 1 });

      const cartId = res.body.cart.id;
      const version = res.body.cart.version;

      // Wait for outbox job to settle
      await new Promise((r) => setTimeout(r, 60));
      await backgroundQueue.processNextJobs(10);

      // Verify n8n received the event with exact expected payload
      const matchingDelivery = deliveredEvents.find(e => e.body.cartId === cartId && e.body.version === version);
      assert.ok(matchingDelivery, 'n8n should receive the dispatched event');
      assert.strictEqual(matchingDelivery.headers['X-N8N-Key'], 'phase1-test-secret');
      assert.strictEqual(matchingDelivery.body.cartId, cartId);
      assert.strictEqual(matchingDelivery.body.version, version);

      // Verify AuditLog record was created for exactly-once delivery
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'N8N_CART_EVENT_DELIVERED',
          entity: 'CART',
          entityId: cartId,
          details: { contains: matchingDelivery.body.eventId }
        }
      });
      assert.ok(audit, 'AuditLog delivery record must exist');

      // Attempt duplicate delivery of the exact same eventId
      const deliveryCountBefore = deliveredEvents.length;
      await cartRecoveryService.handleTriggerJob(matchingDelivery.body);

      // Verify no duplicate HTTP POST occurred
      assert.strictEqual(deliveredEvents.length, deliveryCountBefore, 'Duplicate event must be skipped');
    });

    test('Supersedes older version if cart already advanced to a higher version', async () => {
      // Add item (creates v2)
      const res1 = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ productId: testProduct.id, quantity: 1 });

      const cartId = res1.body.cart.id;

      // Add another item (creates v3)
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ productId: testProduct.id, size: 'XL', quantity: 1 });

      const cartCurrent = await prisma.cart.findUnique({ where: { id: cartId } });
      assert.strictEqual(cartCurrent?.version, 3);

      // Wait for background worker to process v3 job before testing manual stale dispatch
      await new Promise((r) => setTimeout(r, 60));
      await backgroundQueue.processNextJobs(10);
      deliveredEvents = [];

      // Manually trigger execution of an old v2 job
      const stalePayload = {
        cartId,
        version: 2,
        eventId: 'cre_stale_test_123',
        occurredAt: new Date().toISOString()
      };

      await cartRecoveryService.handleTriggerJob(stalePayload);

      // Stale event should be superseded and NOT dispatched to n8n
      assert.strictEqual(deliveredEvents.length, 0, 'Stale version event should not be dispatched to n8n');

      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'N8N_CART_EVENT_SUPERSEDED',
          entity: 'CART',
          entityId: cartId,
          details: { contains: 'cre_stale_test_123' }
        }
      });
      assert.ok(audit, 'AuditLog must record N8N_CART_EVENT_SUPERSEDED');
    });
  });

  describe('5. Checkout Cart Clearance Advances Cart Version', () => {
    test('Order creation clears user cart, increments version, and creates outbox job', async () => {
      // Add item to cart (v2)
      const addRes = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ productId: testProduct.id, quantity: 1 });

      const cartId = addRes.body.cart.id;
      const initialVersion = addRes.body.cart.version;

      // Place COD Order with authenticated user
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          customerName: 'Cart Version Checkout Tester',
          customerEmail: testUser.email,
          customerPhone: '9876543210',
          shippingStreet: '101 Heritage Boulevard',
          shippingCity: 'Mumbai',
          shippingState: 'Maharashtra',
          shippingPincode: '400001',
          shippingCountry: 'India',
          paymentMethod: 'COD',
          items: [
            {
              productId: testProduct.id,
              quantity: 1
            }
          ]
        });

      assert.strictEqual(orderRes.status, 201);

      // Cart should be empty and version should have incremented
      const cartAfterOrder = await prisma.cart.findUnique({
        where: { id: cartId },
        include: { items: true }
      });

      assert.strictEqual(cartAfterOrder?.items.length, 0);
      assert.strictEqual(cartAfterOrder?.version, initialVersion + 1);

      // Verify outbox job exists for cart clearance
      const clearanceJob = await prisma.backgroundJob.findFirst({
        where: {
          type: 'N8N_CART_RECOVERY_TRIGGER',
          payload: { contains: cartId }
        },
        orderBy: { createdAt: 'desc' }
      });

      assert.ok(clearanceJob, 'Clearance outbox job must exist');
      const payload = JSON.parse(clearanceJob.payload);
      assert.strictEqual(payload.version, initialVersion + 1);
    });
  });
});
