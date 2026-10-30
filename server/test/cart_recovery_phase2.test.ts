process.env.NODE_ENV = 'test';
import { test, describe, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/server';
import prisma from '../src/prisma';
import { config } from '../src/config';
import { verifyN8nSecret } from '../src/controllers/recoveryController';
import {
  emailService,
  generateAbandonedCartEmailHtml,
  generateAbandonedCartEmailText
} from '../src/services/emailService';

describe('Phase 2: Abandoned Cart Recovery Server-to-Server Endpoint Tests', () => {
  const originalFetch = global.fetch;
  const originalInboundSecret = config.n8nInboundSecret;
  const TEST_INBOUND_SECRET = 'n8n_test_inbound_secret_token_high_entropy_32c';

  let testProduct: any;

  before(async () => {
    config.n8nInboundSecret = TEST_INBOUND_SECRET;

    // Create a luxury product for cart tests
    const category = await prisma.category.upsert({
      where: { slug: 'phase2-recovery-cat' },
      update: {},
      create: {
        name: 'Phase 2 Recovery Category',
        slug: 'phase2-recovery-cat'
      }
    });

    testProduct = await prisma.product.upsert({
      where: { sku: 'SKU-P2-REC-001' },
      update: { price: 8999, stock: 20 },
      create: {
        name: 'Varanasi Royal Crimson Katan Silk Saree',
        slug: 'varanasi-royal-crimson-katan-silk-saree-p2',
        sku: 'SKU-P2-REC-001',
        description: 'Bespoke handwoven silk saree with zari borders.',
        price: 8999,
        stock: 20,
        categoryId: category.id
      }
    });
  });

  after(() => {
    global.fetch = originalFetch;
    config.n8nInboundSecret = originalInboundSecret;
  });

  // =========================================================================
  // 1. Authentication & Security Tests (Timing-Safe Secret Verification)
  // =========================================================================
  describe('1. Timing-Safe Secret Verification & Authentication', () => {
    test('verifyN8nSecret correctly validates matching secret', () => {
      assert.strictEqual(verifyN8nSecret(TEST_INBOUND_SECRET), true);
    });

    test('verifyN8nSecret rejects mismatched secret safely', () => {
      assert.strictEqual(verifyN8nSecret('wrong-secret-token'), false);
      assert.strictEqual(verifyN8nSecret(TEST_INBOUND_SECRET + 'extra'), false);
      assert.strictEqual(verifyN8nSecret(TEST_INBOUND_SECRET.slice(0, 10)), false);
    });

    test('verifyN8nSecret rejects empty or undefined input', () => {
      assert.strictEqual(verifyN8nSecret(''), false);
      assert.strictEqual(verifyN8nSecret(undefined), false);
    });

    test('POST /api/recovery/cart-callback rejects missing X-N8N-Key with 401', async () => {
      const res = await request(app)
        .post('/api/recovery/cart-callback')
        .send({ cartId: 'any-cart-id', version: 1 });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'Unauthorized');
    });

    test('POST /api/recovery/cart-callback rejects invalid X-N8N-Key with 401', async () => {
      const res = await request(app)
        .post('/api/recovery/cart-callback')
        .set('X-N8N-Key', 'invalid-secret-attempt')
        .send({ cartId: 'any-cart-id', version: 1 });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'Unauthorized');
    });

    test('POST /api/recovery/cart-callback accepts X-N8N-KEY uppercase header and authorizes successfully', async () => {
      const res = await request(app)
        .post('/api/recovery/cart-callback')
        .set('X-N8N-KEY', TEST_INBOUND_SECRET)
        .send({ cartId: 'non-existent-cart', version: 1 });

      // Should pass auth and fail at cart lookup (200 SKIPPED: CART_NOT_FOUND) instead of 401
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.reason, 'CART_NOT_FOUND');
    });

    test('POST /api/recovery/cart-callback accepts numeric string version ("1") seamlessly', async () => {
      const res = await request(app)
        .post('/api/recovery/cart-callback')
        .set('X-N8N-Key', TEST_INBOUND_SECRET)
        .send({ cartId: 'non-existent-cart', version: '1' });

      // Should parse string "1" into integer 1 and reach cart lookup
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.reason, 'CART_NOT_FOUND');
    });

    test('POST /api/recovery/cart-callback rejects invalid payload format with 400', async () => {
      const res = await request(app)
        .post('/api/recovery/cart-callback')
        .set('X-N8N-Key', TEST_INBOUND_SECRET)
        .send({ cartId: '', version: -1 });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error);
    });
  });

  // =========================================================================
  // 2. Empty Cart Validation
  // =========================================================================
  describe('2. Empty Cart Validation', () => {
    test('Skips recovery when cart has no items', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Empty Cart Patron',
          email: `empty.cart.${Date.now()}@ethnizcouture.com`,
          marketingConsent: true,
          marketingConsentAt: new Date()
        }
      });

      const cart = await prisma.cart.create({
        data: {
          userId: user.id,
          version: 1,
          lastActivityAt: new Date()
        }
      });

      const res = await request(app)
        .post('/api/recovery/cart-callback')
        .set('X-N8N-Key', TEST_INBOUND_SECRET)
        .send({ cartId: cart.id, version: 1 });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.status, 'SKIPPED');
      assert.strictEqual(res.body.reason, 'CART_EMPTY');

      // Verify persistent state in CartRecovery table
      const recoveryRecord = await prisma.cartRecovery.findUnique({
        where: { cartId_cartVersion: { cartId: cart.id, cartVersion: 1 } }
      });
      assert.ok(recoveryRecord);
      assert.strictEqual(recoveryRecord.status, 'SKIPPED');
      assert.strictEqual(recoveryRecord.skipReason, 'CART_EMPTY');
    });
  });

  // =========================================================================
  // 3. Changed Cart Version (Superseded Version Detection)
  // =========================================================================
  describe('3. Changed Cart Version (Superseded Callback)', () => {
    test('Skips recovery when cart has advanced to a higher version', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Superseded Cart Patron',
          email: `superseded.${Date.now()}@ethnizcouture.com`,
          marketingConsent: true,
          marketingConsentAt: new Date()
        }
      });

      const cart = await prisma.cart.create({
        data: {
          userId: user.id,
          version: 3, // Current version is 3
          lastActivityAt: new Date(),
          items: {
            create: {
              productId: testProduct.id,
              quantity: 1,
              size: 'Free Size',
              color: 'Crimson'
            }
          }
        }
      });

      // n8n callback arrives for stale version 2
      const res = await request(app)
        .post('/api/recovery/cart-callback')
        .set('X-N8N-Key', TEST_INBOUND_SECRET)
        .send({ cartId: cart.id, version: 2 });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.status, 'SKIPPED');
      assert.strictEqual(res.body.reason, 'VERSION_SUPERSEDED');

      const recoveryRecord = await prisma.cartRecovery.findUnique({
        where: { cartId_cartVersion: { cartId: cart.id, cartVersion: 2 } }
      });
      assert.ok(recoveryRecord);
      assert.strictEqual(recoveryRecord.status, 'SKIPPED');
      assert.strictEqual(recoveryRecord.skipReason, 'VERSION_SUPERSEDED');
    });
  });

  // =========================================================================
  // 4. Marketing Consent & Unsubscribe Validation
  // =========================================================================
  describe('4. Marketing Consent & Unsubscribed Status Enforcement', () => {
    test('Skips recovery when user marketingConsent is false', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'No Consent Patron',
          email: `no.consent.${Date.now()}@ethnizcouture.com`,
          marketingConsent: false // Explicitly opted out / no consent
        }
      });

      const cart = await prisma.cart.create({
        data: {
          userId: user.id,
          version: 1,
          lastActivityAt: new Date(),
          items: {
            create: {
              productId: testProduct.id,
              quantity: 1
            }
          }
        }
      });

      const res = await request(app)
        .post('/api/recovery/cart-callback')
        .set('X-N8N-Key', TEST_INBOUND_SECRET)
        .send({ cartId: cart.id, version: 1 });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.status, 'SKIPPED');
      assert.strictEqual(res.body.reason, 'NO_MARKETING_CONSENT');

      const recoveryRecord = await prisma.cartRecovery.findUnique({
        where: { cartId_cartVersion: { cartId: cart.id, cartVersion: 1 } }
      });
      assert.ok(recoveryRecord);
      assert.strictEqual(recoveryRecord.status, 'SKIPPED');
      assert.strictEqual(recoveryRecord.skipReason, 'NO_MARKETING_CONSENT');
    });

    test('Skips recovery when user has unsubscribed (unsubscribedAt !== null)', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Unsubscribed Patron',
          email: `unsubscribed.${Date.now()}@ethnizcouture.com`,
          marketingConsent: true,
          unsubscribedAt: new Date(Date.now() - 3600000) // Unsubscribed 1h ago
        }
      });

      const cart = await prisma.cart.create({
        data: {
          userId: user.id,
          version: 1,
          lastActivityAt: new Date(),
          items: {
            create: {
              productId: testProduct.id,
              quantity: 1
            }
          }
        }
      });

      const res = await request(app)
        .post('/api/recovery/cart-callback')
        .set('X-N8N-Key', TEST_INBOUND_SECRET)
        .send({ cartId: cart.id, version: 1 });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.status, 'SKIPPED');
      assert.strictEqual(res.body.reason, 'USER_UNSUBSCRIBED');

      const recoveryRecord = await prisma.cartRecovery.findUnique({
        where: { cartId_cartVersion: { cartId: cart.id, cartVersion: 1 } }
      });
      assert.ok(recoveryRecord);
      assert.strictEqual(recoveryRecord.status, 'SKIPPED');
      assert.strictEqual(recoveryRecord.skipReason, 'USER_UNSUBSCRIBED');
    });
  });

  // =========================================================================
  // 5. Completed Order Validation
  // =========================================================================
  describe('5. Completed Order Validation', () => {
    test('Skips recovery when customer already placed an order after cart activity', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Ordered Patron',
          email: `ordered.${Date.now()}@ethnizcouture.com`,
          marketingConsent: true,
          marketingConsentAt: new Date()
        }
      });

      const cartActivity = new Date(Date.now() - 1800000); // 30 mins ago
      const cart = await prisma.cart.create({
        data: {
          userId: user.id,
          version: 1,
          lastActivityAt: cartActivity,
          items: {
            create: {
              productId: testProduct.id,
              quantity: 1
            }
          }
        }
      });

      // Customer completed an order 10 minutes ago
      await prisma.order.create({
        data: {
          orderNumber: `EC-TEST-${Date.now()}`,
          userId: user.id,
          customerName: user.name,
          customerEmail: user.email,
          customerPhone: '9876543210',
          shippingStreet: '12 Heritage Way',
          shippingCity: 'Mumbai',
          shippingState: 'Maharashtra',
          shippingPincode: '400001',
          subtotal: 8999,
          totalAmount: 8999,
          paymentStatus: 'PAID',
          orderStatus: 'CONFIRMED',
          createdAt: new Date(Date.now() - 600000)
        }
      });

      const res = await request(app)
        .post('/api/recovery/cart-callback')
        .set('X-N8N-Key', TEST_INBOUND_SECRET)
        .send({ cartId: cart.id, version: 1 });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.status, 'SKIPPED');
      assert.strictEqual(res.body.reason, 'ORDER_COMPLETED');

      const recoveryRecord = await prisma.cartRecovery.findUnique({
        where: { cartId_cartVersion: { cartId: cart.id, cartVersion: 1 } }
      });
      assert.ok(recoveryRecord);
      assert.strictEqual(recoveryRecord.status, 'SKIPPED');
      assert.strictEqual(recoveryRecord.skipReason, 'ORDER_COMPLETED');
    });
  });

  // =========================================================================
  // 6. Persistent Idempotency & Duplicate Callbacks
  // =========================================================================
  describe('6. Persistent Idempotency & Duplicate Callback Protection', () => {
    test('Repeated callbacks for the same cart and version do NOT send duplicate recovery emails', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Idempotency Patron',
          email: `idempotency.${Date.now()}@ethnizcouture.com`,
          marketingConsent: true,
          marketingConsentAt: new Date()
        }
      });

      const cart = await prisma.cart.create({
        data: {
          userId: user.id,
          version: 1,
          lastActivityAt: new Date(Date.now() - 3600000),
          items: {
            create: {
              productId: testProduct.id,
              quantity: 1,
              size: 'M',
              color: 'Royal Red'
            }
          }
        }
      });

      // First callback: should successfully dispatch
      const firstRes = await request(app)
        .post('/api/recovery/cart-callback')
        .set('X-N8N-Key', TEST_INBOUND_SECRET)
        .send({ cartId: cart.id, version: 1 });

      assert.strictEqual(firstRes.status, 200);
      assert.strictEqual(firstRes.body.success, true);
      assert.strictEqual(firstRes.body.status, 'SENT');

      const firstRecord = await prisma.cartRecovery.findUnique({
        where: { cartId_cartVersion: { cartId: cart.id, cartVersion: 1 } }
      });
      assert.ok(firstRecord);
      assert.strictEqual(firstRecord.status, 'SENT');
      assert.ok(firstRecord.sentAt);

      // Second duplicate callback (e.g. n8n retry or network duplicate)
      const secondRes = await request(app)
        .post('/api/recovery/cart-callback')
        .set('X-N8N-Key', TEST_INBOUND_SECRET)
        .send({ cartId: cart.id, version: 1 });

      assert.strictEqual(secondRes.status, 200);
      assert.strictEqual(secondRes.body.success, true);
      assert.strictEqual(secondRes.body.status, 'SKIPPED');
      assert.strictEqual(secondRes.body.reason, 'ALREADY_SENT');

      // Ensure recovery table still only has 1 record for this cart and version
      const allRecords = await prisma.cartRecovery.findMany({
        where: { cartId: cart.id, cartVersion: 1 }
      });
      assert.strictEqual(allRecords.length, 1);
    });
  });

  // =========================================================================
  // 7. Resend Email Failure Handling & Status Tracking
  // =========================================================================
  describe('7. Resend Email Failure Handling', () => {
    test('Marks recovery record as FAILED and logs audit error when email service fails', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Failure Patron',
          email: `failure.${Date.now()}@ethnizcouture.com`,
          marketingConsent: true,
          marketingConsentAt: new Date()
        }
      });

      const cart = await prisma.cart.create({
        data: {
          userId: user.id,
          version: 1,
          lastActivityAt: new Date(Date.now() - 3600000),
          items: {
            create: {
              productId: testProduct.id,
              quantity: 1
            }
          }
        }
      });

      // Mock emailService to simulate dispatch failure
      const originalSend = emailService.sendAbandonedCartRecoveryEmail;
      emailService.sendAbandonedCartRecoveryEmail = async () => {
        throw new Error('Simulated Resend API 500 Network Timeout');
      };

      try {
        const res = await request(app)
          .post('/api/recovery/cart-callback')
          .set('X-N8N-Key', TEST_INBOUND_SECRET)
          .send({ cartId: cart.id, version: 1 });

        assert.strictEqual(res.status, 500);
        assert.strictEqual(res.body.success, false);
        assert.strictEqual(res.body.status, 'FAILED');
        assert.strictEqual(res.body.reason, 'EMAIL_DISPATCH_FAILED');

        const record = await prisma.cartRecovery.findUnique({
          where: { cartId_cartVersion: { cartId: cart.id, cartVersion: 1 } }
        });
        assert.ok(record);
        assert.strictEqual(record.status, 'FAILED');
        assert.ok(record.metadata?.includes('Simulated Resend API 500 Network Timeout'));

        const audit = await prisma.auditLog.findFirst({
          where: {
            entity: 'CART',
            entityId: cart.id,
            action: 'CART_RECOVERY_EMAIL_FAILED'
          }
        });
        assert.ok(audit);
      } finally {
        emailService.sendAbandonedCartRecoveryEmail = originalSend;
      }
    });
  });

  // =========================================================================
  // 8. Zero PII Guarantee in Responses (Requirement 7)
  // =========================================================================
  describe('8. Zero PII Response Isolation', () => {
    test('Successful callback response exposes zero customer email, names, or cart items to n8n', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Secret Customer',
          email: `secret.patron.${Date.now()}@ethnizcouture.com`,
          marketingConsent: true,
          marketingConsentAt: new Date()
        }
      });

      const cart = await prisma.cart.create({
        data: {
          userId: user.id,
          version: 1,
          lastActivityAt: new Date(Date.now() - 3600000),
          items: {
            create: {
              productId: testProduct.id,
              quantity: 2,
              size: 'XL',
              color: 'Gold'
            }
          }
        }
      });

      const res = await request(app)
        .post('/api/recovery/cart-callback')
        .set('X-N8N-Key', TEST_INBOUND_SECRET)
        .send({ cartId: cart.id, version: 1 });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.status, 'SENT');

      // Negative assertions: Strictly ensure NO PII or cart details are returned in response
      assert.strictEqual((res.body as any).customerEmail, undefined);
      assert.strictEqual((res.body as any).email, undefined);
      assert.strictEqual((res.body as any).customerName, undefined);
      assert.strictEqual((res.body as any).name, undefined);
      assert.strictEqual((res.body as any).phone, undefined);
      assert.strictEqual((res.body as any).items, undefined);
      assert.strictEqual((res.body as any).subtotal, undefined);
      assert.strictEqual((res.body as any).cart, undefined);
    });
  });

  // =========================================================================
  // 9. Luxury Email Template & Brand Consistency Tests
  // =========================================================================
  describe('9. Luxury Recovery Email Template Verification', () => {
    test('generateAbandonedCartEmailHtml contains royal branding and safe escaped HTML', () => {
      const html = generateAbandonedCartEmailHtml({
        customerEmail: 'test@ethnizcouture.com',
        customerName: 'Aaradhya <script>alert("xss")</script>',
        cartId: 'test-cart-id',
        items: [
          {
            productName: 'Royal Varanasi Silk Lehenga',
            size: 'M',
            color: 'Crimson Gold',
            quantity: 1,
            price: 24999
          }
        ],
        subtotal: 24999
      });

      // Brand headers & aesthetic
      assert.ok(html.includes('ETHNIZ'));
      assert.ok(html.includes('Couture'));
      assert.ok(html.includes('Wear Your Heritage. Own Your Style.'));
      assert.ok(html.includes('#3E1A1E')); // Deep Burgundy
      assert.ok(html.includes('#DFC89D')); // Warm Gold

      // Product and price formatting
      assert.ok(html.includes('Royal Varanasi Silk Lehenga'));
      assert.ok(html.includes('₹24,999'));
      assert.ok(html.includes('RESUME YOUR SELECTION'));

      // Safe URL destination: standard cart page, no insecure public token
      assert.ok(html.includes('/cart'));
      assert.ok(!html.includes('token='));

      // XSS escaping: customerName script tags must be escaped
      assert.ok(!html.includes('<script>'));
      assert.ok(html.includes('&lt;script&gt;'));
    });

    test('generateAbandonedCartEmailText generates clean plain-text fallback', () => {
      const text = generateAbandonedCartEmailText({
        customerEmail: 'test@ethnizcouture.com',
        customerName: 'Meera Sharma',
        cartId: 'test-cart-id',
        items: [
          {
            productName: 'Handwoven Banarasi Dupatta',
            size: 'Free Size',
            color: 'Emerald',
            quantity: 2,
            price: 4999
          }
        ],
        subtotal: 9998
      });

      assert.ok(text.includes('Dear Meera Sharma'));
      assert.ok(text.includes('Handwoven Banarasi Dupatta'));
      assert.ok(text.includes('₹4,999'));
      assert.ok(text.includes('₹9,998'));
      assert.ok(text.includes('/cart'));
      assert.ok(text.includes('Team Ethniz Couture'));
    });
  });

  // =========================================================================
  // 10. Resend API Dispatch & Consent Guard Verification
  // =========================================================================
  describe('10. Resend API Dispatch & Consent Guard Verification', () => {
    const originalFetch = globalThis.fetch;
    const originalLiveSend = config.enableRecoveryEmailLiveSend;
    const originalApiKey = config.emailApiKey;

    afterEach(() => {
      globalThis.fetch = originalFetch;
      config.enableRecoveryEmailLiveSend = originalLiveSend;
      config.emailApiKey = originalApiKey;
      delete process.env.TEST_ALLOW_LIVE_RESEND_MOCK;
    });

    test('Eligible patron with explicit marketing consent dispatches to Resend API when live send is enabled', async () => {
      let capturedUrl = '';
      let capturedMethod = '';
      let capturedHeaders: any = {};
      let capturedBody: any = {};

      globalThis.fetch = (async (url: any, init: any) => {
        capturedUrl = String(url);
        capturedMethod = init?.method || '';
        capturedHeaders = init?.headers || {};
        capturedBody = JSON.parse(init?.body || '{}');
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'resend_live_test_msg_888' })
        } as any;
      }) as any;

      config.enableRecoveryEmailLiveSend = true;
      config.emailApiKey = 're_test_mock_secret_key_888';
      process.env.TEST_ALLOW_LIVE_RESEND_MOCK = 'true';

      const user = await prisma.user.create({
        data: {
          name: 'Eligible Live Patron',
          email: `eligible.live.${Date.now()}@ethnizcouture.com`,
          marketingConsent: true,
          marketingConsentAt: new Date(),
          marketingConsentSource: 'ACCOUNT_PROFILE',
          unsubscribedAt: null
        }
      });

      const cart = await prisma.cart.create({
        data: {
          userId: user.id,
          version: 1,
          lastActivityAt: new Date(Date.now() - 3600000),
          items: {
            create: {
              productId: testProduct.id,
              quantity: 1,
              size: 'M',
              color: 'Gold'
            }
          }
        }
      });

      const res = await request(app)
        .post('/api/recovery/cart-callback')
        .set('X-N8N-Key', TEST_INBOUND_SECRET)
        .send({ cartId: cart.id, version: 1 });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.status, 'SENT');

      // Verify Resend REST API invocation details
      assert.strictEqual(capturedUrl, 'https://api.resend.com/emails');
      assert.strictEqual(capturedMethod, 'POST');
      assert.strictEqual(capturedHeaders['Authorization'], 'Bearer re_test_mock_secret_key_888');
      assert.strictEqual(capturedHeaders['Content-Type'], 'application/json');
      assert.deepStrictEqual(capturedBody.to, [user.email]);
      assert.strictEqual(capturedBody.subject, 'Your Handcrafted Selection Awaits — Ethniz Couture');
      assert.ok(capturedBody.html?.includes('ETHNIZ'));

      // Verify persistent record in CartRecovery
      const recoveryRecord = await prisma.cartRecovery.findUnique({
        where: { cartId_cartVersion: { cartId: cart.id, cartVersion: 1 } }
      });
      assert.ok(recoveryRecord);
      assert.strictEqual(recoveryRecord.status, 'SENT');
      assert.strictEqual(recoveryRecord.emailMessageId, 'resend_live_test_msg_888');
    });

    test('Patron WITHOUT marketing consent NEVER triggers Resend API even when live send is enabled', async () => {
      let fetchCalled = false;
      globalThis.fetch = (async () => {
        fetchCalled = true;
        return { ok: true, json: async () => ({ id: 'should_not_be_called' }) } as any;
      }) as any;

      config.enableRecoveryEmailLiveSend = true;
      config.emailApiKey = 're_test_mock_secret_key_888';
      process.env.TEST_ALLOW_LIVE_RESEND_MOCK = 'true';

      const user = await prisma.user.create({
        data: {
          name: 'Non Consenting Patron',
          email: `no.consent.live.${Date.now()}@ethnizcouture.com`,
          marketingConsent: false, // NO CONSENT
          unsubscribedAt: null
        }
      });

      const cart = await prisma.cart.create({
        data: {
          userId: user.id,
          version: 1,
          lastActivityAt: new Date(Date.now() - 3600000),
          items: {
            create: {
              productId: testProduct.id,
              quantity: 1
            }
          }
        }
      });

      const res = await request(app)
        .post('/api/recovery/cart-callback')
        .set('X-N8N-Key', TEST_INBOUND_SECRET)
        .send({ cartId: cart.id, version: 1 });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.status, 'SKIPPED');
      assert.strictEqual(res.body.reason, 'NO_MARKETING_CONSENT');
      assert.strictEqual(fetchCalled, false, 'Resend API must never be reached without customer marketing consent');
    });

    test('Unsubscribed patron NEVER triggers Resend API even when live send is enabled', async () => {
      let fetchCalled = false;
      globalThis.fetch = (async () => {
        fetchCalled = true;
        return { ok: true, json: async () => ({ id: 'should_not_be_called' }) } as any;
      }) as any;

      config.enableRecoveryEmailLiveSend = true;
      config.emailApiKey = 're_test_mock_secret_key_888';
      process.env.TEST_ALLOW_LIVE_RESEND_MOCK = 'true';

      const user = await prisma.user.create({
        data: {
          name: 'Unsubscribed Live Patron',
          email: `unsub.live.${Date.now()}@ethnizcouture.com`,
          marketingConsent: true,
          unsubscribedAt: new Date() // UNSUBSCRIBED
        }
      });

      const cart = await prisma.cart.create({
        data: {
          userId: user.id,
          version: 1,
          lastActivityAt: new Date(Date.now() - 3600000),
          items: {
            create: {
              productId: testProduct.id,
              quantity: 1
            }
          }
        }
      });

      const res = await request(app)
        .post('/api/recovery/cart-callback')
        .set('X-N8N-Key', TEST_INBOUND_SECRET)
        .send({ cartId: cart.id, version: 1 });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.status, 'SKIPPED');
      assert.strictEqual(res.body.reason, 'USER_UNSUBSCRIBED');
      assert.strictEqual(fetchCalled, false, 'Resend API must never be reached for unsubscribed customer');
    });
  });
});
