import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateOrderConfirmationEmailHtml,
  generateOrderConfirmationEmailText,
  emailService,
  OrderConfirmationEmailOptions
} from '../src/services/emailService';
import { backgroundQueue } from '../src/services/backgroundQueue';
import prisma from '../src/prisma';

describe('Order Confirmation Email & Notification Dispatch System', () => {
  const sampleOrder: OrderConfirmationEmailOptions = {
    orderId: 'test-order-uuid-999',
    orderNumber: 'EC-2026-TEST99',
    customerName: 'Kavita Krishnamurthy <script>alert("xss")</script>',
    customerEmail: 'kavita@example.com',
    customerPhone: '+91 98200 88888',
    shippingStreet: 'Flat 402, Lotus Grandeur, Linking Road',
    shippingApartment: 'Building B',
    shippingCity: 'Mumbai',
    shippingState: 'Maharashtra',
    shippingPincode: '400050',
    shippingCountry: 'India',
    subtotal: 35000,
    discountAmount: 3500,
    shippingFee: 0,
    totalAmount: 31500,
    paymentMethod: 'UPI',
    paymentStatus: 'PAID',
    couponCode: 'ROYAL10',
    items: [
      {
        productName: 'Emerald Banarasi Silk Lehenga',
        productImage: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80',
        size: 'Custom Stitch',
        color: 'Deep Emerald',
        quantity: 1,
        price: 35000,
        total: 35000
      }
    ]
  };

  it('1. Generates luxury HTML email with escaped XSS, item details and tracking links', () => {
    const html = generateOrderConfirmationEmailHtml(sampleOrder);

    // Brand and header
    assert.ok(html.includes('ETHNIZ'), 'Must include brand name ETHNIZ');
    assert.ok(html.includes('Couture'), 'Must include brand name Couture');
    assert.ok(html.includes('Order Confirmation Receipt'), 'Must have order receipt title');

    // Order number and customer name
    assert.ok(html.includes('EC-2026-TEST99'), 'Must contain order number');
    assert.ok(html.includes('Kavita Krishnamurthy'), 'Must contain customer name');
    assert.ok(!html.includes('<script>'), 'Must NOT contain unescaped script tag');
    assert.ok(html.includes('&lt;script&gt;'), 'Must have safely escaped script tag');

    // Line items and pricing
    assert.ok(html.includes('Emerald Banarasi Silk Lehenga'), 'Must contain item name');
    assert.ok(html.includes('Custom Stitch'), 'Must contain size');
    assert.ok(html.includes('ROYAL10'), 'Must contain coupon code');

    // Tracking link
    assert.ok(html.includes('/order-tracking?orderId=test-order-uuid-999'), 'Must link to live order tracking');
  });

  it('2. Generates clean plain-text version for terminal / text email clients', () => {
    const text = generateOrderConfirmationEmailText(sampleOrder);

    assert.ok(text.includes('Dear Kavita Krishnamurthy'), 'Must include recipient');
    assert.ok(text.includes('EC-2026-TEST99'), 'Must include order number');
    assert.ok(text.includes('Emerald Banarasi Silk Lehenga'), 'Must list items');
    assert.ok(text.includes('TRACK YOUR ORDER LIVE:'), 'Must have tracking section');
  });

  it('3. EmailService dispatches order confirmation in simulated development mode cleanly', async () => {
    const result = await emailService.sendOrderConfirmationEmail(sampleOrder);

    assert.equal(result.success, true, 'Dispatch must report success');
    assert.ok(result.messageId, 'Must generate messageId');
    assert.equal(result.provider, 'simulated', 'Default local provider is simulated');
  });

  it('4. BackgroundQueue executes ORDER_CONFIRMATION job and logs audit record', async () => {
    // Create temporary patron and order in test database
    const user = await prisma.user.create({
      data: {
        email: `test_order_${Date.now()}@example.com`,
        name: 'Simran Singh',
        passwordHash: 'dummyhash',
        role: 'CUSTOMER'
      }
    });

    const order = await prisma.order.create({
      data: {
        orderNumber: `EC-2026-UNIT-${Date.now().toString().slice(-4)}`,
        userId: user.id,
        customerName: 'Simran Singh',
        customerEmail: user.email,
        customerPhone: '+91 99887 76655',
        shippingStreet: '12 Rose Avenue',
        shippingCity: 'Jaipur',
        shippingState: 'Rajasthan',
        shippingPincode: '302001',
        subtotal: 18000,
        totalAmount: 18000,
        paymentStatus: 'PAID',
        orderStatus: 'CONFIRMED',
        paymentMethod: 'COD',
        items: {
          create: [
            {
              productName: 'Royal Chanderi Anarkali',
              price: 18000,
              quantity: 1,
              total: 18000
            }
          ]
        }
      }
    });

    // Enqueue order confirmation job
    const jobId = await backgroundQueue.enqueue('ORDER_CONFIRMATION', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerEmail: order.customerEmail,
      totalAmount: order.totalAmount
    });

    assert.ok(jobId, 'Job must be enqueued');

    // Allow worker to process
    await new Promise((r) => setTimeout(r, 600));
    await backgroundQueue.drain(1500);

    // Verify audit log record exists
    const audit = await prisma.auditLog.findFirst({
      where: {
        action: 'ORDER_CONFIRMATION_DISPATCHED',
        entity: 'ORDER',
        entityId: order.id
      }
    });

    assert.ok(audit, 'AuditLog must record ORDER_CONFIRMATION_DISPATCHED');
  });
});
