process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/server';
import prisma from '../src/prisma';
import { backgroundQueue } from '../src/services/backgroundQueue';

describe('Order Success Experience & Payment Confirmation Contract Tests', () => {
  let activeProduct: any;
  let testCustomer: any;

  before(async () => {
    // 1. Fetch or create active product
    activeProduct = await prisma.product.findFirst({
      where: { isActive: true, stock: { gt: 5 } }
    });

    if (!activeProduct) {
      activeProduct = await prisma.product.create({
        data: {
          name: 'Varanasi Royal Brocade Lehengas',
          slug: `royal-brocade-lehenga-${Date.now()}`,
          sku: `SKU-LEH-${Date.now()}`,
          description: 'Handcrafted bridal brocade lehenga',
          price: 45000,
          stock: 15,
          isActive: true
        }
      });
    }

    // 2. Test Customer
    testCustomer = {
      name: 'Priyanka Chopra Jonas',
      email: `priyanka.couture.${Date.now()}@example.com`,
      phone: '9820098200'
    };
  });

  after(async () => {
    try {
      await prisma.order.deleteMany({
        where: { customerEmail: { contains: 'priyanka.couture.' } }
      });
    } catch {
      // ignore
    }
    backgroundQueue.stop();
  });

  describe('1. Confirmed Online Payment and Order', () => {
    test('1.1: Online order creation followed by successful payment verification returns authoritative PAID status', async () => {
      // 1. Create Order
      const createRes = await request(app)
        .post('/api/orders')
        .send({
          customerName: testCustomer.name,
          customerEmail: testCustomer.email,
          customerPhone: testCustomer.phone,
          shippingStreet: '88 Marine Drive',
          shippingCity: 'Mumbai',
          shippingState: 'Maharashtra',
          shippingPincode: '400020',
          shippingCountry: 'India',
          paymentMethod: 'CARD',
          items: [
            {
              productId: activeProduct.id,
              name: activeProduct.name,
              price: activeProduct.price,
              quantity: 1,
              size: 'M'
            }
          ]
        });

      assert.strictEqual(createRes.status, 201);
      const order = createRes.body.order;
      assert.ok(order.orderNumber);
      assert.strictEqual(order.paymentStatus, 'PENDING');

      // 2. Verify Payment
      const verifyRes = await request(app)
        .post('/api/payments/verify')
        .send({
          orderId: order.id,
          paymentIntentId: `pi_test_confirmed_${Date.now()}`
        });

      assert.strictEqual(verifyRes.status, 200);
      assert.strictEqual(verifyRes.body.success, true);
      assert.strictEqual(verifyRes.body.order.paymentStatus, 'PAID');
      assert.strictEqual(verifyRes.body.order.orderStatus, 'CONFIRMED');

      // 3. Fetch Order Confirmation receipt by orderNumber
      const receiptRes = await request(app).get(`/api/orders/${order.orderNumber}`);
      assert.strictEqual(receiptRes.status, 200);
      assert.strictEqual(receiptRes.body.order.orderNumber, order.orderNumber);
      assert.strictEqual(receiptRes.body.order.paymentStatus, 'PAID');
      assert.strictEqual(receiptRes.body.order.orderStatus, 'CONFIRMED');
      assert.strictEqual(receiptRes.body.order.items.length, 1);
    });
  });

  describe('2. Cash on Delivery (COD) Order Distinction', () => {
    test('2.1: COD order is successfully recorded with distinct PENDING payment status and paymentMethod COD', async () => {
      const codRes = await request(app)
        .post('/api/orders')
        .send({
          customerName: testCustomer.name,
          customerEmail: testCustomer.email,
          customerPhone: testCustomer.phone,
          shippingStreet: '12 Linking Road',
          shippingCity: 'Mumbai',
          shippingState: 'Maharashtra',
          shippingPincode: '400050',
          shippingCountry: 'India',
          paymentMethod: 'COD',
          items: [
            {
              productId: activeProduct.id,
              name: activeProduct.name,
              price: activeProduct.price,
              quantity: 1
            }
          ]
        });

      assert.strictEqual(codRes.status, 201);
      const codOrder = codRes.body.order;
      assert.strictEqual(codOrder.paymentMethod, 'COD');
      // Critical correctness requirement: COD must not claim to be PAID before delivery!
      assert.strictEqual(codOrder.paymentStatus, 'PENDING');

      // Retrieve via GET /orders/:id
      const fetchRes = await request(app).get(`/api/orders/${codOrder.id}`);
      assert.strictEqual(fetchRes.status, 200);
      assert.strictEqual(fetchRes.body.order.paymentMethod, 'COD');
      assert.strictEqual(fetchRes.body.order.paymentStatus, 'PENDING');
    });
  });

  describe('3. Pending Payment State Handling', () => {
    test('3.1: Online order before payment verification reports PENDING without false success', async () => {
      const pendingRes = await request(app)
        .post('/api/orders')
        .send({
          customerName: testCustomer.name,
          customerEmail: testCustomer.email,
          customerPhone: testCustomer.phone,
          shippingStreet: '44 Colaba Causeway',
          shippingCity: 'Mumbai',
          shippingState: 'Maharashtra',
          shippingPincode: '400005',
          shippingCountry: 'India',
          paymentMethod: 'CARD',
          items: [
            {
              productId: activeProduct.id,
              name: activeProduct.name,
              price: activeProduct.price,
              quantity: 1
            }
          ]
        });

      assert.strictEqual(pendingRes.status, 201);
      const pendingOrder = pendingRes.body.order;

      // Verify the receipt endpoint faithfully reports PENDING
      const fetchRes = await request(app).get(`/api/orders/${pendingOrder.id}`);
      assert.strictEqual(fetchRes.status, 200);
      assert.strictEqual(fetchRes.body.order.paymentStatus, 'PENDING');
      assert.strictEqual(fetchRes.body.order.orderStatus, 'PENDING');
    });
  });

  describe('4. Failed Payment State Handling', () => {
    test('4.1: Failed payment updates order to FAILED for transparent user messaging', async () => {
      // 1. Create order
      const res = await request(app)
        .post('/api/orders')
        .send({
          customerName: testCustomer.name,
          customerEmail: testCustomer.email,
          customerPhone: testCustomer.phone,
          shippingStreet: '55 Bandra West',
          shippingCity: 'Mumbai',
          shippingState: 'Maharashtra',
          shippingPincode: '400050',
          shippingCountry: 'India',
          paymentMethod: 'CARD',
          items: [
            {
              productId: activeProduct.id,
              name: activeProduct.name,
              price: activeProduct.price,
              quantity: 1
            }
          ]
        });

      assert.strictEqual(res.status, 201);
      const order = res.body.order;

      // Mark payment failed in db directly or via failure transition
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'FAILED' }
      });

      const receiptRes = await request(app).get(`/api/orders/${order.id}`);
      assert.strictEqual(receiptRes.status, 200);
      assert.strictEqual(receiptRes.body.order.paymentStatus, 'FAILED');
    });
  });

  describe('5. Duplicate Order Submission & Page Refresh Idempotency', () => {
    test('5.1: Idempotency Key prevents duplicate orders on network retries or rapid double clicks', async () => {
      const idempotencyKey = `idemp_anim_test_${Date.now()}`;

      const payload = {
        customerName: testCustomer.name,
        customerEmail: testCustomer.email,
        customerPhone: testCustomer.phone,
        shippingStreet: '99 Juhu Tara Road',
        shippingCity: 'Mumbai',
        shippingState: 'Maharashtra',
        shippingPincode: '400049',
        shippingCountry: 'India',
        paymentMethod: 'CARD',
        items: [
          {
            productId: activeProduct.id,
            name: activeProduct.name,
            price: activeProduct.price,
            quantity: 1
          }
        ]
      };

      // First submission
      const firstRes = await request(app)
        .post('/api/orders')
        .set('Idempotency-Key', idempotencyKey)
        .send(payload);

      assert.strictEqual(firstRes.status, 201);
      const firstOrderId = firstRes.body.order.id;

      // Duplicate submission with exact same key
      const secondRes = await request(app)
        .post('/api/orders')
        .set('Idempotency-Key', idempotencyKey)
        .send(payload);

      assert.strictEqual(secondRes.status, 201);
      assert.strictEqual(secondRes.body.order.id, firstOrderId, 'Must return same order without creating second');
    });

    test('5.2: Page refresh on order-confirmation endpoint performs safe GET with zero mutations', async () => {
      // 1. Fetch order
      const order = await prisma.order.findFirst({
        where: { customerEmail: testCustomer.email }
      });
      assert.ok(order);

      const beforeUpdatedAt = order.updatedAt;

      // 2. Perform 5 simulated rapid browser refreshes
      for (let i = 0; i < 5; i++) {
        const res = await request(app).get(`/api/orders/${order.orderNumber}`);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.order.orderNumber, order.orderNumber);
      }

      // 3. Confirm order was not mutated or re-charged
      const afterOrder = await prisma.order.findUnique({
        where: { id: order.id }
      });
      assert.strictEqual(afterOrder?.updatedAt.getTime(), beforeUpdatedAt.getTime());
    });
  });

  describe('6. Invalid Order Reference & Privacy Guard (IDOR)', () => {
    test('6.1: Non-existent order ID returns 404 Not Found', async () => {
      const res = await request(app).get('/api/orders/EC-NON-EXISTENT-99999');
      assert.strictEqual(res.status, 404);
      assert.match(res.body.message, /not found/i);
    });

    test('6.2: Unauthenticated order access masks sensitive customer PII while providing receipt totals', async () => {
      const order = await prisma.order.findFirst({
        where: { customerEmail: testCustomer.email }
      });
      assert.ok(order);

      const res = await request(app).get(`/api/orders/${order.id}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.order.orderNumber, order.orderNumber);

      // PII should be masked for unauthenticated viewer
      assert.notStrictEqual(res.body.order.customerEmail, testCustomer.email);
      assert.match(res.body.order.customerEmail, /\*\*\*/);
    });
  });
});
