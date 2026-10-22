process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server';
import prisma from '../src/prisma';
import { config } from '../src/config';

describe('Customer Self-Service Order Cancellation & Return Request Suite', () => {
  let customerUser: any;
  let otherUser: any;
  let customerToken: string;
  let otherToken: string;
  let testProduct: any;

  before(async () => {
    // Setup test customer
    customerUser = await prisma.user.upsert({
      where: { email: 'cancel.patron@ethnizcouture.com' },
      update: {},
      create: {
        name: 'Cancel Test Patron',
        email: 'cancel.patron@ethnizcouture.com',
        phone: '+91 98200 99999',
        role: 'CUSTOMER'
      }
    });

    otherUser = await prisma.user.upsert({
      where: { email: 'unauth.user@ethnizcouture.com' },
      update: {},
      create: {
        name: 'Unauthorized Stranger',
        email: 'unauth.user@ethnizcouture.com',
        phone: '+91 98200 88888',
        role: 'CUSTOMER'
      }
    });

    customerToken = jwt.sign(
      { id: customerUser.id, email: customerUser.email, role: 'CUSTOMER', name: customerUser.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    otherToken = jwt.sign(
      { id: otherUser.id, email: otherUser.email, role: 'CUSTOMER', name: otherUser.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // Ensure a test product with known stock exists
    let category = await prisma.category.findFirst();
    if (!category) {
      category = await prisma.category.create({
        data: { name: 'Men Couture', slug: `men-couture-${Date.now()}` }
      });
    }

    testProduct = await prisma.product.create({
      data: {
        name: 'Royal Heritage Brocade Sherwani',
        slug: `royal-sherwani-test-${Date.now()}`,
        sku: `SKU-SHERWANI-${Date.now()}`,
        description: 'Artisanal handwoven gold zari sherwani',
        price: 45000,
        stock: 10,
        isActive: true,
        gender: 'MEN',
        categoryId: category.id
      }
    });
  });

  after(async () => {
    if (testProduct) {
      await prisma.orderItem.deleteMany({ where: { productId: testProduct.id } });
      await prisma.product.delete({ where: { id: testProduct.id } });
    }
    await prisma.user.deleteMany({
      where: { email: { in: ['cancel.patron@ethnizcouture.com', 'unauth.user@ethnizcouture.com'] } }
    });
  });

  test('Customer successfully cancels a CONFIRMED order with reason & restores stock', async () => {
    // 1. Create a confirmed order for this customer
    const orderNumber = `EC-TEST-CANCEL-${Date.now()}`;
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: customerUser.id,
        customerName: customerUser.name,
        customerEmail: customerUser.email,
        customerPhone: '+91 98200 99999',
        shippingStreet: '12 Heritage Boulevard',
        shippingCity: 'Mumbai',
        shippingState: 'Maharashtra',
        shippingPincode: '400001',
        subtotal: 45000,
        totalAmount: 45000,
        paymentStatus: 'PAID',
        paymentMethod: 'STRIPE',
        orderStatus: 'CONFIRMED',
        items: {
          create: [
            {
              productId: testProduct.id,
              productName: testProduct.name,
              price: 45000,
              quantity: 2,
              total: 90000
            }
          ]
        }
      }
    });

    // Manually decrement product stock by 2 as if ordered
    await prisma.product.update({
      where: { id: testProduct.id },
      data: { stock: { decrement: 2 } }
    });

    const stockBeforeCancel = (await prisma.product.findUnique({ where: { id: testProduct.id } }))?.stock;
    assert.strictEqual(stockBeforeCancel, 8);

    // 2. Perform cancellation
    const cancelReason = 'Ordered wrong size or color variant';
    const res = await request(app)
      .put(`/api/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: cancelReason });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.orderStatus, 'CANCELLED');

    // 3. Verify database state
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { statusHistory: true }
    });
    assert.strictEqual(updatedOrder?.orderStatus, 'CANCELLED');

    const historyEntry = updatedOrder?.statusHistory.find((h) => h.status === 'CANCELLED');
    assert.ok(historyEntry, 'Status history entry for CANCELLED must exist');
    assert.ok(historyEntry.notes?.includes(cancelReason));

    // 4. Verify stock was restored by +2 (back to 10)
    const stockAfterCancel = (await prisma.product.findUnique({ where: { id: testProduct.id } }))?.stock;
    assert.strictEqual(stockAfterCancel, 10);

    // Cleanup
    await prisma.order.delete({ where: { id: order.id } });
  });

  test('Re-cancelling an already CANCELLED order is strictly rejected', async () => {
    const orderNumber = `EC-TEST-DOUBLE-CANCEL-${Date.now()}`;
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: customerUser.id,
        customerName: customerUser.name,
        customerEmail: customerUser.email,
        customerPhone: '+91 98200 99999',
        shippingStreet: '12 Heritage Boulevard',
        shippingCity: 'Mumbai',
        shippingState: 'Maharashtra',
        shippingPincode: '400001',
        subtotal: 45000,
        totalAmount: 45000,
        orderStatus: 'CANCELLED',
        items: {
          create: [
            {
              productId: testProduct.id,
              productName: testProduct.name,
              price: 45000,
              quantity: 1,
              total: 45000
            }
          ]
        }
      }
    });

    const res = await request(app)
      .put(`/api/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'Trying to cancel again' });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.message.includes('already been cancelled'));

    await prisma.order.delete({ where: { id: order.id } });
  });

  test('Cannot cancel an order that has already been SHIPPED or OUT_FOR_DELIVERY', async () => {
    const orderNumber = `EC-TEST-SHIPPED-${Date.now()}`;
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: customerUser.id,
        customerName: customerUser.name,
        customerEmail: customerUser.email,
        customerPhone: '+91 98200 99999',
        shippingStreet: '12 Heritage Boulevard',
        shippingCity: 'Mumbai',
        shippingState: 'Maharashtra',
        shippingPincode: '400001',
        subtotal: 45000,
        totalAmount: 45000,
        orderStatus: 'SHIPPED',
        trackingNumber: 'BLUEDART-8829103'
      }
    });

    const res = await request(app)
      .put(`/api/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'Changed mind' });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.message.includes('already been dispatched'));

    await prisma.order.delete({ where: { id: order.id } });
  });

  test('Unauthorized user cannot cancel another customer’s order', async () => {
    const orderNumber = `EC-TEST-UNAUTH-${Date.now()}`;
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: customerUser.id,
        customerName: customerUser.name,
        customerEmail: customerUser.email,
        customerPhone: '+91 98200 99999',
        shippingStreet: '12 Heritage Boulevard',
        shippingCity: 'Mumbai',
        shippingState: 'Maharashtra',
        shippingPincode: '400001',
        subtotal: 45000,
        totalAmount: 45000,
        orderStatus: 'CONFIRMED'
      }
    });

    const res = await request(app)
      .put(`/api/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ reason: 'Malicious attempt' });

    assert.strictEqual(res.status, 403);
    assert.ok(res.body.message.includes('not authorized'));

    await prisma.order.delete({ where: { id: order.id } });
  });

  test('Customer submits return request for DELIVERED order within 7 days', async () => {
    const orderNumber = `EC-TEST-DELIVERED-${Date.now()}`;
    const deliveredAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // Delivered 2 days ago

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: customerUser.id,
        customerName: customerUser.name,
        customerEmail: customerUser.email,
        customerPhone: '+91 98200 99999',
        shippingStreet: '12 Heritage Boulevard',
        shippingCity: 'Mumbai',
        shippingState: 'Maharashtra',
        shippingPincode: '400001',
        subtotal: 45000,
        totalAmount: 45000,
        paymentStatus: 'PAID',
        orderStatus: 'DELIVERED',
        deliveredAt
      }
    });

    const res = await request(app)
      .post(`/api/orders/${order.id}/return`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        reason: 'Size or fit issue (Garment is too tight / loose)',
        resolution: 'EXCHANGE',
        comments: 'Need Size 42 instead of 40'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.orderStatus, 'RETURN_REQUESTED');

    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: { statusHistory: true }
    });

    assert.strictEqual(updated?.orderStatus, 'RETURN_REQUESTED');
    const returnHist = updated?.statusHistory.find((h) => h.status === 'RETURN_REQUESTED');
    assert.ok(returnHist);
    assert.ok(returnHist.notes?.includes('EXCHANGE'));
    assert.ok(returnHist.notes?.includes('Need Size 42'));

    await prisma.order.delete({ where: { id: order.id } });
  });

  test('Cannot request return for undelivered order', async () => {
    const orderNumber = `EC-TEST-PROCESSING-${Date.now()}`;
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: customerUser.id,
        customerName: customerUser.name,
        customerEmail: customerUser.email,
        customerPhone: '+91 98200 99999',
        shippingStreet: '12 Heritage Boulevard',
        shippingCity: 'Mumbai',
        shippingState: 'Maharashtra',
        shippingPincode: '400001',
        subtotal: 45000,
        totalAmount: 45000,
        orderStatus: 'PROCESSING'
      }
    });

    const res = await request(app)
      .post(`/api/orders/${order.id}/return`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        reason: 'Defective item',
        resolution: 'REFUND'
      });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.message.includes('only be requested once the order has been delivered'));

    await prisma.order.delete({ where: { id: order.id } });
  });

  test('Return request rejected if 7-day window has expired', async () => {
    const orderNumber = `EC-TEST-EXPIRED-RETURN-${Date.now()}`;
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: customerUser.id,
        customerName: customerUser.name,
        customerEmail: customerUser.email,
        customerPhone: '+91 98200 99999',
        shippingStreet: '12 Heritage Boulevard',
        shippingCity: 'Mumbai',
        shippingState: 'Maharashtra',
        shippingPincode: '400001',
        subtotal: 45000,
        totalAmount: 45000,
        orderStatus: 'DELIVERED',
        deliveredAt: eightDaysAgo,
        updatedAt: eightDaysAgo
      }
    });

    const res = await request(app)
      .post(`/api/orders/${order.id}/return`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        reason: 'Fabric texture or feel did not meet expectations',
        resolution: 'REFUND'
      });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.message.includes('7-day atelier return and exchange window for this order has expired'));

    await prisma.order.delete({ where: { id: order.id } });
  });
});
