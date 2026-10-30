process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { config, validateN8nConfig } from '../src/config';
import { cartRecoveryService, MinimalCartEventPayload } from '../src/services/cartRecoveryService';
import prisma from '../src/prisma';

describe('Phase 1: Cart Recovery Service & Minimal Event Isolation Tests', () => {
  const originalFetch = global.fetch;
  const originalWebhookUrl = config.n8nWebhookUrl;
  const originalInboundSecret = config.n8nInboundSecret;

  after(() => {
    global.fetch = originalFetch;
    config.n8nWebhookUrl = originalWebhookUrl;
    config.n8nInboundSecret = originalInboundSecret;
  });

  describe('1. Configuration Validation (No Secret Leaks)', () => {
    test('Correctly identifies valid http/https URLs and secret presence', () => {
      const res = validateN8nConfig('https://n8n.example.com/webhook/test', 'secret-key-123');
      assert.strictEqual(res.isConfigured, true);
      assert.strictEqual(res.webhookUrlValid, true);
    });

    test('Rejects invalid URLs gracefully without throwing', () => {
      const res = validateN8nConfig('not-a-valid-url', 'secret-key-123');
      assert.strictEqual(res.isConfigured, false);
      assert.strictEqual(res.webhookUrlValid, false);
    });

    test('Flags unconfigured state when URL or secret is missing', () => {
      const emptySecret = validateN8nConfig('https://n8n.example.com/webhook/test', '');
      assert.strictEqual(emptySecret.isConfigured, false);
      assert.strictEqual(emptySecret.webhookUrlValid, true);

      const emptyUrl = validateN8nConfig('', 'secret-key-123');
      assert.strictEqual(emptyUrl.isConfigured, false);
      assert.strictEqual(emptyUrl.webhookUrlValid, false);
    });
  });

  describe('2. Minimal Event Payload Isolation (Strict Anti-PII Guarantee)', () => {
    test('Dispatches only cartId, version, eventId, and occurredAt to n8n webhook', async () => {
      config.n8nWebhookUrl = 'https://n8n.example.com/webhook/cart-events';
      config.n8nInboundSecret = 'test-secret-token';

      let capturedUrl = '';
      let capturedHeaders: any = {};
      let capturedBody: any = null;

      global.fetch = (async (url: any, init: any) => {
        capturedUrl = String(url);
        capturedHeaders = init?.headers || {};
        capturedBody = JSON.parse(init?.body || '{}');
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        } as any;
      }) as any;

      const testPayload: MinimalCartEventPayload = {
        cartId: 'test-cart-uuid-101',
        version: 3,
        eventId: 'cre_test_uuid_101',
        occurredAt: new Date().toISOString()
      };

      await cartRecoveryService.postWebhook(testPayload);

      // Verify destination and authentication header: exactly one X-N8N-Key header
      assert.strictEqual(capturedUrl, 'https://n8n.example.com/webhook/cart-events');
      assert.strictEqual(capturedHeaders['X-N8N-Key'], 'test-secret-token');
      assert.strictEqual(capturedHeaders['X-N8N-KEY'], undefined);
      const normalizedHeaderValue = new Headers(capturedHeaders).get('x-n8n-key');
      assert.strictEqual(normalizedHeaderValue, 'test-secret-token');
      assert.ok(!normalizedHeaderValue?.includes(','), 'Header must not contain comma-joined duplicate values');

      // Verify payload contains strictly allowed minimal fields
      const keys = Object.keys(capturedBody).sort();
      assert.deepStrictEqual(keys, ['cartId', 'eventId', 'occurredAt', 'version'].sort());

      assert.strictEqual(capturedBody.cartId, testPayload.cartId);
      assert.strictEqual(capturedBody.version, testPayload.version);
      assert.strictEqual(capturedBody.eventId, testPayload.eventId);
      assert.ok(!isNaN(Date.parse(capturedBody.occurredAt)));

      // Strict negative assertions: no customer PII or bag items
      assert.strictEqual((capturedBody as any).email, undefined);
      assert.strictEqual((capturedBody as any).customerName, undefined);
      assert.strictEqual((capturedBody as any).phone, undefined);
      assert.strictEqual((capturedBody as any).items, undefined);
      assert.strictEqual((capturedBody as any).total, undefined);
      assert.strictEqual((capturedBody as any).token, undefined);
    });
  });

  describe('3. Webhook Failure Resilience & Transactional Outbox', () => {
    test('recordCartMutationOutbox writes durable BackgroundJob within a transaction', async () => {
      const testCartId = 'cart-outbox-test-999';
      const testVersion = 2;

      let recordedPayload: any = null;
      await prisma.$transaction(async (tx) => {
        recordedPayload = await cartRecoveryService.recordCartMutationOutbox(tx, testCartId, testVersion);
      });

      assert.ok(recordedPayload);
      assert.strictEqual(recordedPayload.cartId, testCartId);
      assert.strictEqual(recordedPayload.version, testVersion);

      // Verify BackgroundJob was created in the database
      const job = await prisma.backgroundJob.findFirst({
        where: {
          type: 'N8N_CART_RECOVERY_TRIGGER',
          payload: { contains: testCartId }
        },
        orderBy: { createdAt: 'desc' }
      });

      assert.ok(job);
      assert.strictEqual(job.status, 'PENDING');
      const parsed = JSON.parse(job.payload);
      assert.strictEqual(parsed.cartId, testCartId);
      assert.strictEqual(parsed.version, testVersion);
      assert.strictEqual(parsed.eventId, recordedPayload.eventId);

      // Clean up
      await prisma.backgroundJob.delete({ where: { id: job.id } });
    });

    test('postWebhook throws error when n8n returns HTTP error status for background worker to catch & retry', async () => {
      config.n8nWebhookUrl = 'https://n8n.example.com/webhook/error-endpoint';
      config.n8nInboundSecret = 'test-secret-token';

      // Mock fetch failure
      global.fetch = (async () => {
        return {
          ok: false,
          status: 502,
          statusText: 'Bad Gateway'
        } as any;
      }) as any;

      const testPayload: MinimalCartEventPayload = {
        cartId: 'cart-err-test',
        version: 1,
        eventId: 'cre_err_1',
        occurredAt: new Date().toISOString()
      };

      await assert.rejects(
        async () => {
          await cartRecoveryService.postWebhook(testPayload);
        },
        /n8n webhook responded with HTTP 502/
      );
    });

    test('postWebhook safely skips dispatch when webhook URL is blank', async () => {
      config.n8nWebhookUrl = '';

      const testPayload: MinimalCartEventPayload = {
        cartId: 'cart-blank-url',
        version: 1,
        eventId: 'cre_blank_1',
        occurredAt: new Date().toISOString()
      };

      await assert.doesNotReject(async () => {
        await cartRecoveryService.postWebhook(testPayload);
      });
    });
  });
});
