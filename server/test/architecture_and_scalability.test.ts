process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/server';
import prisma from '../src/prisma';
import { cacheService } from '../src/services/cacheService';
import { backgroundQueue } from '../src/services/backgroundQueue';

describe('EthnizCouture Production Architecture & Scalability Tests', () => {
  let testProductId: string;
  let initialStock = 5;
  const testOrderIds: string[] = [];
  const testIdempKeys: string[] = [];

  before(async () => {
    // Flush cache before tests
    cacheService.flush();

    // Ensure at least one category exists
    let category = await prisma.category.findFirst();
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'Royal Test Lehengas',
          slug: 'royal-test-lehengas',
          description: 'High-end test bridal collection'
        }
      });
    }

    // Create a deterministic test product with known stock
    const testProduct = await prisma.product.create({
      data: {
        name: `Atelier Test Anarkali ${Date.now()}`,
        slug: `atelier-test-anarkali-${Date.now()}`,
        sku: `TEST-SKU-${Date.now()}`,
        description: 'Varanasi silk heirloom test piece',
        price: 45000,
        stock: initialStock,
        isActive: true,
        categoryId: category.id
      }
    });

    testProductId = testProduct.id;
  });

  after(async () => {
    // 1. Drain background queue and stop workers
    await backgroundQueue.drain(3000);
    await backgroundQueue.stop();

    // 2. Clean up test orders and their relations
    if (testOrderIds.length > 0) {
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: testOrderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: testOrderIds } } });
      for (const oid of testOrderIds) {
        await prisma.backgroundJob.deleteMany({ where: { payload: { contains: oid } } });
      }
      await prisma.order.deleteMany({ where: { id: { in: testOrderIds } } });
    }

    // 3. Clean up test idempotency keys
    if (testIdempKeys.length > 0) {
      await prisma.idempotencyRecord.deleteMany({ where: { key: { in: testIdempKeys } } });
    }

    // 4. Clean up background jobs and audit logs related to testProduct
    if (testProductId) {
      await prisma.auditLog.deleteMany({ where: { entityId: testProductId } });
      await prisma.backgroundJob.deleteMany({
        where: {
          payload: { contains: testProductId }
        }
      });
      await prisma.product.deleteMany({ where: { id: testProductId } });
    }

    await prisma.$disconnect();
  });

  test('1. Health probe reports healthy status with database connectivity and cache stats', async () => {
    const res = await request(app).get('/api/health');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.strictEqual(res.body.brand, 'EthnizCouture');
    assert.strictEqual(res.body.database.status, 'healthy');
    assert.ok(typeof res.body.database.latencyMs === 'number');
    assert.ok(res.body.memory.heapUsedMb > 0);
    assert.ok(res.body.cache.maxEntries > 0);
  });

  test('2. Observability metrics endpoint returns latency metrics and status code distributions', async () => {
    const res = await request(app).get('/api/metrics');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.brand, 'EthnizCouture');
    assert.ok(res.body.metrics.totalRequests >= 1);
    assert.ok(typeof res.body.metrics.uptimeSeconds === 'number');
    assert.ok(typeof res.body.metrics.latency.avgMs === 'number');
  });

  test('3. Public catalogue caching: Miss on first request, Hit on subsequent, with Cache-Control headers', async () => {
    cacheService.flush();

    // First request should be a MISS
    const res1 = await request(app).get('/api/products?limit=5');
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.headers['x-cache'], 'MISS');
    assert.ok(res1.headers['cache-control'].includes('public'));

    // Second request should be a HIT
    const res2 = await request(app).get('/api/products?limit=5');
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.headers['x-cache'], 'HIT');
    assert.ok(res2.headers['cache-control'].includes('public'));
  });

  test('4. Tag-based cache invalidation clears affected product entries', async () => {
    // Seed cache
    await request(app).get('/api/products?limit=5');
    assert.ok(cacheService.getStats().size > 0);

    // Invalidate 'products' tag
    const invalidatedCount = cacheService.invalidateTag('products');
    assert.ok(invalidatedCount > 0);

    // Next request must be a MISS again
    const res = await request(app).get('/api/products?limit=5');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['x-cache'], 'MISS');
  });

  test('5. Atomic checkout with stock reservation decrements stock immediately in transaction', async () => {
    const orderPayload = {
      customerName: 'Princess Gayatri',
      customerEmail: 'gayatri.devi@heritage.in',
      customerPhone: '+919876543210',
      shippingStreet: '10 Palace Gardens',
      shippingCity: 'Jaipur',
      shippingState: 'Rajasthan',
      shippingPincode: '302001',
      items: [
        {
          productId: testProductId,
          quantity: 2
        }
      ]
    };

    const res = await request(app)
      .post('/api/orders')
      .send(orderPayload);

    assert.strictEqual(res.status, 201);
    testOrderIds.push(res.body.order.id);
    assert.ok(res.body.order.orderNumber.startsWith('EC-'));
    assert.strictEqual(res.body.order.items[0].price, 45000);
    assert.strictEqual(res.body.order.subtotal, 90000);
    assert.strictEqual(res.body.order.totalAmount, 90000); // Free shipping over 2999

    // Verify stock was decremented from 5 to 3 in the database
    const updatedProduct = await prisma.product.findUnique({ where: { id: testProductId } });
    assert.strictEqual(updatedProduct?.stock, initialStock - 2);
  });

  test('6. Concurrency & Overselling prevention: Rejects checkout when requested quantity exceeds available stock', async () => {
    const currentProduct = await prisma.product.findUnique({ where: { id: testProductId } });
    const remainingStock = currentProduct?.stock || 0;

    const overLimitPayload = {
      customerName: 'Maharani Padmavati',
      customerEmail: 'padmavati@palace.in',
      customerPhone: '+919999888877',
      shippingStreet: '1 Fort Ramparts',
      shippingCity: 'Chittorgarh',
      shippingState: 'Rajasthan',
      shippingPincode: '312001',
      items: [
        {
          productId: testProductId,
          quantity: remainingStock + 10 // Attempt to buy more than remaining stock
        }
      ]
    };

    const res = await request(app)
      .post('/api/orders')
      .send(overLimitPayload);

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.message.includes('Inventory Conflict') || res.body.message.includes('only has'));

    // Verify stock remained intact and did not become negative
    const productAfterAttempt = await prisma.product.findUnique({ where: { id: testProductId } });
    assert.strictEqual(productAfterAttempt?.stock, remainingStock);
  });

  test('7. Idempotency Key prevents duplicate order creation on network retries', async () => {
    const idempotencyKey = `test_idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const orderPayload = {
      customerName: 'Rani Ahilya',
      customerEmail: 'ahilya@indore.in',
      customerPhone: '+919123456789',
      shippingStreet: '7 Rajwada Chowk',
      shippingCity: 'Indore',
      shippingState: 'Madhya Pradesh',
      shippingPincode: '452001',
      items: [
        {
          productId: testProductId,
          quantity: 1
        }
      ]
    };

    // First attempt
    testIdempKeys.push(idempotencyKey);
    const res1 = await request(app)
      .post('/api/orders')
      .set('Idempotency-Key', idempotencyKey)
      .send(orderPayload);

    assert.strictEqual(res1.status, 201);
    const firstOrderId = res1.body.order.id;
    testOrderIds.push(firstOrderId);

    // Second attempt with exact same idempotency key (simulating network retry or user double-click)
    const res2 = await request(app)
      .post('/api/orders')
      .set('Idempotency-Key', idempotencyKey)
      .send(orderPayload);

    assert.strictEqual(res2.status, 201);
    assert.strictEqual(res2.body.order.id, firstOrderId); // Returns exact same order without duplicate creation!
  });

  test('8. Order lookup IDOR protection masks customer PII for unverified guest requests', async () => {
    // Create an order
    const orderPayload = {
      customerName: 'Secret Patron',
      customerEmail: 'secret.patron@domain.com',
      customerPhone: '+919876500000',
      shippingStreet: '42 Confidential Boulevard',
      shippingCity: 'Mumbai',
      shippingState: 'Maharashtra',
      shippingPincode: '400001',
      items: [{ productId: testProductId, quantity: 1 }]
    };

    const createRes = await request(app).post('/api/orders').send(orderPayload);
    testOrderIds.push(createRes.body.order.id);
    const orderNumber = createRes.body.order.orderNumber;

    // Unauthenticated request without matching email must return sanitized / masked PII
    const viewRes = await request(app).get(`/api/orders/${orderNumber}`);
    assert.strictEqual(viewRes.status, 200);

    // Customer name and email must be masked to prevent IDOR leaks
    assert.ok(viewRes.body.order.customerName.includes('*'));
    assert.ok(viewRes.body.order.customerEmail.includes('*'));
    assert.ok(viewRes.body.order.customerPhone.includes('*'));
    // Street address must not be exposed in unverified sanitized order
    assert.strictEqual(viewRes.body.order.shippingStreet, undefined);

    // When verified with correct email query, full order is accessible
    const verifiedRes = await request(app).get(`/api/orders/${orderNumber}?email=secret.patron@domain.com`);
    assert.strictEqual(verifiedRes.status, 200);
    assert.strictEqual(verifiedRes.body.order.customerName, 'Secret Patron');
    assert.strictEqual(verifiedRes.body.order.shippingStreet, '42 Confidential Boulevard');
  });

  test('9. Payment verification is idempotent: duplicate calls do not double decrement stock', async () => {
    // Create order
    const createRes = await request(app).post('/api/orders').send({
      customerName: 'Lady Meera',
      customerEmail: 'meera@udaipur.in',
      customerPhone: '+919876512345',
      shippingStreet: '5 Lake Palace Rd',
      shippingCity: 'Udaipur',
      shippingState: 'Rajasthan',
      shippingPincode: '313001',
      items: [{ productId: testProductId, quantity: 1 }]
    });

    const order = createRes.body.order;
    testOrderIds.push(order.id);

    const initialStockAfterOrder = (await prisma.product.findUnique({ where: { id: testProductId } }))?.stock;

    // First payment verification
    const verify1 = await request(app).post('/api/payments/verify').send({
      orderId: order.id,
      paymentIntentId: 'pi_mock_test_123'
    });

    assert.strictEqual(verify1.status, 200);
    assert.strictEqual(verify1.body.success, true);
    assert.strictEqual(verify1.body.order.paymentStatus, 'PAID');

    // Second payment verification (simulating user page refresh or retransmitted webhook)
    const verify2 = await request(app).post('/api/payments/verify').send({
      orderId: order.id,
      paymentIntentId: 'pi_mock_test_123'
    });

    assert.strictEqual(verify2.status, 200);
    assert.strictEqual(verify2.body.success, true);

    // Verify stock was NOT decremented again!
    const stockAfterDoubleVerify = (await prisma.product.findUnique({ where: { id: testProductId } }))?.stock;
    assert.strictEqual(stockAfterDoubleVerify, initialStockAfterOrder);
  });
});
