process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server';
import prisma from '../src/prisma';
import { config } from '../src/config';
import { backgroundQueue } from '../src/services/backgroundQueue';

describe('Admin-Controlled Order Fulfilment State Machine Tests', () => {
  let adminToken: string;
  let customerToken: string;
  let activeProduct: any;
  let testOrderIds: string[] = [];

  before(async () => {
    // 1. Ensure test admin user exists
    let adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          name: 'Master Atelier Admin',
          email: `admin.fulfilment.${Date.now()}@ethnizcouture.com`,
          passwordHash: 'dummy_hash',
          role: 'ADMIN'
        }
      });
    }

    // 2. Ensure test customer user exists
    let customerUser = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
    if (!customerUser) {
      customerUser = await prisma.user.create({
        data: {
          name: 'Maharani Patron',
          email: `patron.${Date.now()}@example.com`,
          passwordHash: 'dummy_hash',
          role: 'CUSTOMER'
        }
      });
    }

    adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: 'ADMIN', name: adminUser.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    customerToken = jwt.sign(
      { id: customerUser.id, email: customerUser.email, role: 'CUSTOMER', name: customerUser.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 3. Ensure test product exists
    activeProduct = await prisma.product.findFirst({ where: { isActive: true, stock: { gt: 10 } } });
    if (!activeProduct) {
      activeProduct = await prisma.product.create({
        data: {
          name: 'Gulmarg Silk Jamawar Shawl',
          slug: `gulmarg-silk-shawl-${Date.now()}`,
          sku: `SKU-JAM-${Date.now()}`,
          description: 'Authentic royal Kashmiri handloom masterpiece',
          price: 32000,
          stock: 20,
          isActive: true
        }
      });
    }
  });

  after(async () => {
    try {
      if (testOrderIds.length > 0) {
        await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: testOrderIds } } });
        await prisma.auditLog.deleteMany({ where: { entity: 'ORDER', entityId: { in: testOrderIds } } });
        await prisma.orderItem.deleteMany({ where: { orderId: { in: testOrderIds } } });
        await prisma.order.deleteMany({ where: { id: { in: testOrderIds } } });
      }
    } catch {
      // ignore cleanup
    }
    backgroundQueue.stop();
  });

  test('1. Authorization: Non-admin or unauthenticated requests are rejected', async () => {
    // Unauthenticated
    const resNoAuth = await request(app)
      .get('/api/admin/orders/fulfilment-stats');
    assert.strictEqual(resNoAuth.status, 401);

    // Customer role
    const resCustomer = await request(app)
      .get('/api/admin/orders/fulfilment-stats')
      .set('Authorization', `Bearer ${customerToken}`);
    assert.strictEqual(resCustomer.status, 403);
  });

  test('2. Fulfilment Queue Stats: Returns counts for all operational stages', async () => {
    const res = await request(app)
      .get('/api/admin/orders/fulfilment-stats')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.stats);
    assert.strictEqual(typeof res.body.stats.all, 'number');
    assert.strictEqual(typeof res.body.stats.new, 'number');
    assert.strictEqual(typeof res.body.stats.confirmed, 'number');
    assert.strictEqual(typeof res.body.stats.preparing, 'number');
    assert.strictEqual(typeof res.body.stats.packed, 'number');
    assert.strictEqual(typeof res.body.stats.shipped, 'number');
    assert.strictEqual(typeof res.body.stats.delivered, 'number');
    assert.strictEqual(typeof res.body.stats.cancelled, 'number');
  });

  test('3. Happy Path: Order advances through complete verified lifecycle', async () => {
    // A. Create new COD order
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'Shalini Devi',
        customerEmail: `shalini.${Date.now()}@example.com`,
        customerPhone: '9820098200',
        shippingStreet: '12 Havelock Road, Heritage Fort',
        shippingCity: 'Udaipur',
        shippingState: 'Rajasthan',
        shippingPincode: '313001',
        shippingCountry: 'India',
        items: [{ productId: activeProduct.id, name: activeProduct.name, quantity: 1 }],
        paymentMethod: 'ONLINE'
      });

    assert.strictEqual(orderRes.status, 201);
    const order = orderRes.body.order;
    testOrderIds.push(order.id);
    assert.strictEqual(order.orderStatus, 'PENDING');
    assert.strictEqual(order.paymentStatus, 'PENDING');

    // B. CONFIRM_ORDER
    const confirmRes = await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'CONFIRM_ORDER', customerNotes: 'Atelier confirmed order.' });

    assert.strictEqual(confirmRes.status, 200);
    assert.strictEqual(confirmRes.body.order.orderStatus, 'CONFIRMED');

    // Simulate customer completing online payment
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'PAID' }
    });

    // C. START_PREPARATION
    const prepRes = await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'START_PREPARATION' });

    assert.strictEqual(prepRes.status, 200);
    assert.strictEqual(prepRes.body.order.orderStatus, 'PROCESSING');

    // D. MARK_PACKED
    const packRes = await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'MARK_PACKED' });

    assert.strictEqual(packRes.status, 200);
    assert.strictEqual(packRes.body.order.orderStatus, 'PACKED');

    // E. DISPATCH_ORDER without tracking number -> MUST FAIL with 400
    const failDispatchRes = await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'DISPATCH_ORDER', carrierName: 'Blue Dart' });

    assert.strictEqual(failDispatchRes.status, 400);
    assert.match(failDispatchRes.body.message, /Tracking number is required/i);

    // F. DISPATCH_ORDER with valid carrier and tracking
    const dispatchRes = await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'DISPATCH_ORDER',
        carrierName: 'Blue Dart Express Air',
        trackingNumber: 'BD-AWB-987654321',
        estimatedDelivery: new Date(Date.now() + 4 * 86400000).toISOString(),
        customerNotes: 'Handed over at Mumbai central depot.',
        internalNotes: 'Double-wrapped in waterproof sleeve.'
      });

    assert.strictEqual(dispatchRes.status, 200);
    assert.strictEqual(dispatchRes.body.order.orderStatus, 'SHIPPED');
    assert.strictEqual(dispatchRes.body.order.carrierName, 'Blue Dart Express Air');
    assert.strictEqual(dispatchRes.body.order.trackingNumber, 'BD-AWB-987654321');
    assert.ok(dispatchRes.body.order.dispatchedAt);

    // G. MARK_OUT_FOR_DELIVERY
    const outRes = await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'MARK_OUT_FOR_DELIVERY' });

    assert.strictEqual(outRes.status, 200);
    assert.strictEqual(outRes.body.order.orderStatus, 'OUT_FOR_DELIVERY');

    // H. CONFIRM_DELIVERY with codCollected: true
    const deliveryRes = await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'CONFIRM_DELIVERY', codCollected: true });

    assert.strictEqual(deliveryRes.status, 200);
    assert.strictEqual(deliveryRes.body.order.orderStatus, 'DELIVERED');
    assert.strictEqual(deliveryRes.body.order.paymentStatus, 'PAID');
    assert.ok(deliveryRes.body.order.deliveredAt);

    // I. Terminal State Check: Cannot transition from DELIVERED
    const revertRes = await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'START_PREPARATION' });

    assert.strictEqual(revertRes.status, 400);
    assert.match(revertRes.body.message, /terminal state DELIVERED/i);
  });

  test('4. Invalid & Out-of-Order Transitions are strictly prevented', async () => {
    // Create new order
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'Sunita Rao',
        customerEmail: `sunita.${Date.now()}@example.com`,
        customerPhone: '9833398333',
        shippingStreet: '88 Malabar Hill',
        shippingCity: 'Mumbai',
        shippingState: 'Maharashtra',
        shippingPincode: '400006',
        shippingCountry: 'India',
        items: [{ productId: activeProduct.id, name: activeProduct.name, quantity: 1 }],
        paymentMethod: 'COD'
      });

    const order = orderRes.body.order;
    testOrderIds.push(order.id);

    // Attempt to jump directly to DELIVERED from PENDING
    const jumpRes = await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'CONFIRM_DELIVERY' });

    assert.strictEqual(jumpRes.status, 400);
    assert.match(jumpRes.body.message, /Cannot confirm delivery/i);

    // Attempt to jump directly to DISPATCH_ORDER from PENDING
    const jumpDispatchRes = await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'DISPATCH_ORDER', carrierName: 'Blue Dart', trackingNumber: 'BD123' });

    assert.strictEqual(jumpDispatchRes.status, 400);
  });

  test('5. Concurrency Conflict Guard: Rejects update if status changed concurrently', async () => {
    // Create new order
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'Ritu Kumar',
        customerEmail: `ritu.${Date.now()}@example.com`,
        customerPhone: '9811198111',
        shippingStreet: '10 Defence Colony',
        shippingCity: 'New Delhi',
        shippingState: 'Delhi',
        shippingPincode: '110024',
        shippingCountry: 'India',
        items: [{ productId: activeProduct.id, name: activeProduct.name, quantity: 1 }],
        paymentMethod: 'COD'
      });

    const order = orderRes.body.order;
    testOrderIds.push(order.id);

    // Transition to CONFIRMED
    await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'CONFIRM_ORDER' });

    // Another admin submits expecting order to still be PENDING
    const conflictRes = await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'CANCEL_ORDER', expectedStatus: 'PENDING', cancellationReason: 'Slow response' });

    assert.strictEqual(conflictRes.status, 409);
    assert.match(conflictRes.body.message, /conflict/i);
    assert.strictEqual(conflictRes.body.order.orderStatus, 'CONFIRMED');
  });

  test('6. Inventory Safety: Stock is not deducted twice, and cancellation restores stock exactly once', async () => {
    // Refresh product stock
    const freshProduct = await prisma.product.findUnique({ where: { id: activeProduct.id } });
    const stockBeforeOrder = freshProduct!.stock;

    // Create order for 2 units
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'Ananya Birla',
        customerEmail: `ananya.${Date.now()}@example.com`,
        customerPhone: '9844498444',
        shippingStreet: '4 Altamount Road',
        shippingCity: 'Mumbai',
        shippingState: 'Maharashtra',
        shippingPincode: '400026',
        shippingCountry: 'India',
        items: [{ productId: activeProduct.id, name: activeProduct.name, quantity: 2 }],
        paymentMethod: 'COD'
      });

    const order = orderRes.body.order;
    testOrderIds.push(order.id);

    // Stock should be decremented by 2 at order placement
    const productAfterOrder = await prisma.product.findUnique({ where: { id: activeProduct.id } });
    assert.strictEqual(productAfterOrder!.stock, stockBeforeOrder - 2);

    // Advance to CONFIRMED, PROCESSING, PACKED
    await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'CONFIRM_ORDER' });

    await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'START_PREPARATION' });

    await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'MARK_PACKED' });

    // Stock must NOT have changed during fulfilment steps!
    const productDuringFulfilment = await prisma.product.findUnique({ where: { id: activeProduct.id } });
    assert.strictEqual(productDuringFulfilment!.stock, stockBeforeOrder - 2);

    // Cancel order
    const cancelRes = await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'CANCEL_ORDER', cancellationReason: 'Client requested size modification' });

    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelRes.body.order.orderStatus, 'CANCELLED');

    // Stock should now be restored by 2
    const productAfterCancel = await prisma.product.findUnique({ where: { id: activeProduct.id } });
    assert.strictEqual(productAfterCancel!.stock, stockBeforeOrder);

    // Replay cancellation: must be rejected with 400 and NOT restore stock again
    const replayCancel = await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'CANCEL_ORDER', cancellationReason: 'Duplicate attempt' });

    assert.strictEqual(replayCancel.status, 400);

    const productAfterReplay = await prisma.product.findUnique({ where: { id: activeProduct.id } });
    assert.strictEqual(productAfterReplay!.stock, stockBeforeOrder);
  });

  test('7. Customer Tracking API: Displays real carrier, tracking, and sanitized milestones', async () => {
    // Create and dispatch an order
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'Pooja Hegde',
        customerEmail: `pooja.${Date.now()}@example.com`,
        customerPhone: '9855598555',
        shippingStreet: '15 Juhu Tara Road',
        shippingCity: 'Mumbai',
        shippingState: 'Maharashtra',
        shippingPincode: '400049',
        shippingCountry: 'India',
        items: [{ productId: activeProduct.id, name: activeProduct.name, quantity: 1 }],
        paymentMethod: 'COD'
      });

    const order = orderRes.body.order;
    testOrderIds.push(order.id);

    await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'START_PREPARATION' });

    await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'MARK_PACKED' });

    await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'DISPATCH_ORDER',
        carrierName: 'Delhivery Surface & Air',
        trackingNumber: 'DEL-SURF-554433',
        customerNotes: 'Dispatched via Delhivery Express from Mumbai Atelier.',
        internalNotes: 'VIP Customer - packed with gold seal ribbon.'
      });

    // Public tracking query
    const trackRes = await request(app)
      .get(`/api/orders/track?orderNumber=${order.orderNumber}`);

    assert.strictEqual(trackRes.status, 200);
    const trackedOrder = trackRes.body.order;
    assert.strictEqual(trackedOrder.orderStatus, 'SHIPPED');
    assert.strictEqual(trackedOrder.carrierName, 'Delhivery Surface & Air');
    assert.strictEqual(trackedOrder.trackingNumber, 'DEL-SURF-554433');
    assert.ok(trackedOrder.dispatchedAt);

    // Verify internal notes are strictly NEVER leaked to customer tracking
    assert.strictEqual(trackedOrder.internalNotes, undefined);
    assert.ok(trackedOrder.statusHistory.length >= 2);
  });

  test('8. Admin Return Resolution: Approves return request, schedules pickup, and completes return with restock', async () => {
    // 1. Create and deliver an order
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'Kareena Kapoor',
        customerEmail: `kareena.${Date.now()}@example.com`,
        customerPhone: '9866698666',
        shippingStreet: 'Bandra West Promenade',
        shippingCity: 'Mumbai',
        shippingState: 'Maharashtra',
        shippingPincode: '400050',
        shippingCountry: 'India',
        items: [{ productId: activeProduct.id, name: activeProduct.name, quantity: 2 }],
        paymentMethod: 'ONLINE'
      });

    const order = orderRes.body.order;
    testOrderIds.push(order.id);

    // Set order to DELIVERED with PAID payment
    await prisma.order.update({
      where: { id: order.id },
      data: {
        orderStatus: 'DELIVERED',
        paymentStatus: 'PAID',
        deliveredAt: new Date()
      }
    });

    // 2. Customer initiates return request
    const returnReqRes = await request(app)
      .post(`/api/orders/${order.id}/return`)
      .send({
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        reason: 'Size or fit issue (Garment is too tight / loose)',
        resolution: 'REFUND',
        comments: 'Need a refund to bank account, sleeve is snug.'
      });

    assert.strictEqual(returnReqRes.status, 200);
    assert.strictEqual(returnReqRes.body.orderStatus, 'RETURN_REQUESTED');

    // 3. Admin approves return with reverse pickup
    const initialProduct = await prisma.product.findUnique({ where: { id: activeProduct.id } });
    const stockBeforeApprove = initialProduct?.stock || 0;

    const approveRes = await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'APPROVE_RETURN',
        returnResolution: 'REFUND',
        carrierName: 'Blue Dart Reverse Logistics',
        trackingNumber: 'BD-REV-AWB-112233',
        customerNotes: 'Reverse courier booked for tomorrow.',
        restoreStockOnReturn: false
      });

    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveRes.body.order.orderStatus, 'RETURN_APPROVED');

    // 4. Admin finalizes inspection: COMPLETE_RETURN (restores stock & marks returned)
    const completeRes = await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'COMPLETE_RETURN',
        customerNotes: 'Garment received and inspected at atelier. Passed quality check.'
      });

    assert.strictEqual(completeRes.status, 200);
    assert.strictEqual(completeRes.body.order.orderStatus, 'RETURNED');
    assert.strictEqual(completeRes.body.order.paymentStatus, 'REFUNDED');

    // Verify stock was restored
    const finalProduct = await prisma.product.findUnique({ where: { id: activeProduct.id } });
    assert.strictEqual(finalProduct?.stock, stockBeforeApprove + 2);
  });

  test('9. Admin Return Rejection: Declines return request with operational explanation and reverts to DELIVERED', async () => {
    // 1. Create and deliver an order
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'Mira Rajput',
        customerEmail: `mira.${Date.now()}@example.com`,
        customerPhone: '9877798777',
        shippingStreet: 'Juhu Tara Road',
        shippingCity: 'Mumbai',
        shippingState: 'Maharashtra',
        shippingPincode: '400049',
        shippingCountry: 'India',
        items: [{ productId: activeProduct.id, name: activeProduct.name, quantity: 1 }],
        paymentMethod: 'ONLINE'
      });

    const order = orderRes.body.order;
    testOrderIds.push(order.id);

    await prisma.order.update({
      where: { id: order.id },
      data: {
        orderStatus: 'DELIVERED',
        deliveredAt: new Date()
      }
    });

    const customerJwt = jwt.sign(
      { id: order.userId || 'guest_user', email: order.customerEmail, role: 'CUSTOMER' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // Customer initiates return
    const returnReqRes = await request(app)
      .post(`/api/orders/${order.id}/return`)
      .send({
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        reason: 'Other personal reason',
        resolution: 'REFUND',
        comments: 'No longer attending the wedding event.'
      });

    assert.strictEqual(returnReqRes.status, 200);
    assert.strictEqual(returnReqRes.body.orderStatus, 'RETURN_REQUESTED');

    // 2. Admin declines return (Missing reason should fail with 400)
    const failRejectRes = await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'REJECT_RETURN' });

    assert.strictEqual(failRejectRes.status, 400);

    // 3. Admin declines return with valid explanation
    const rejectRes = await request(app)
      .post(`/api/admin/orders/${order.id}/fulfilment-action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'REJECT_RETURN',
        returnRejectionReason: 'Bullion security seal and designer tags were removed',
        customerNotes: 'Security ribbons missing from ensemble.'
      });

    assert.strictEqual(rejectRes.status, 200);
    assert.strictEqual(rejectRes.body.order.orderStatus, 'DELIVERED');

    // Verify audit status history recorded rejection
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { statusHistory: { orderBy: { createdAt: 'desc' } } }
    });

    assert.ok(updatedOrder?.statusHistory[0].notes?.includes('Return request declined by atelier admin'));
  });
});
