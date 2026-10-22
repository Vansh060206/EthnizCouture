process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import prisma from '../src/prisma';
import bcrypt from 'bcryptjs';

describe('Phase 2A: Database Compatibility & Integrity Validation Suite', () => {
  before(async () => {
    // Non-destructive initialization: Ensure connection is open
    await prisma.$queryRawUnsafe('SELECT 1');
  });

  after(async () => {
    await prisma.$disconnect();
  });

  test('1. Database Connectivity & Raw Query Latency', async () => {
    const start = Date.now();
    const result = await prisma.$queryRawUnsafe('SELECT 1 as connected');
    const latency = Date.now() - start;

    assert.ok(Array.isArray(result));
    assert.ok(latency < 500, `Database roundtrip latency should be reasonable (<500ms over WAN, actual: ${latency}ms)`);
  });

  test('2. User & Authentication Integrity: Validates roles, unique emails, and password hashes', async () => {
    const users = await prisma.user.findMany({
      include: { addresses: true }
    });

    assert.ok(users.length >= 2, 'Should have at least seeded admin and customer accounts');

    const admin = users.find(u => u.role === 'ADMIN');
    assert.ok(admin, 'Must have an active ADMIN account');
    assert.ok(admin.passwordHash.startsWith('$2'), 'Password must be hashed with bcrypt');

    const customer = users.find(u => u.role === 'CUSTOMER');
    assert.ok(customer, 'Must have an active CUSTOMER account');

    // Verify bcrypt hash verification works
    const isCustomerPasswordValid = await bcrypt.compare('Customer@123456', customer.passwordHash);
    assert.strictEqual(isCustomerPasswordValid, true, 'Customer password hash must match baseline');
  });

  test('3. Product Catalog & Inventory Integrity: Active items, pricing, relations', async () => {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        collection: true,
        images: true
      }
    });

    assert.ok(products.length >= 20, `Should have catalog products (found: ${products.length})`);

    for (const p of products) {
      assert.ok(p.price > 0, `Product ${p.sku} must have price > 0`);
      assert.ok(p.stock >= 0, `Product ${p.sku} must have non-negative stock (actual: ${p.stock})`);
      assert.ok(p.slug.length > 0, `Product ${p.id} must have a non-empty slug`);
      assert.ok(p.sku.length > 0, `Product ${p.id} must have a non-empty SKU`);
      assert.ok(p.category, `Product ${p.sku} must belong to a valid Category`);
    }
  });

  test('4. Order & Financial Arithmetic Integrity: Subtotals, discounts, and totals', async () => {
    const orders = await prisma.order.findMany({
      include: {
        items: true,
        statusHistory: true
      }
    });

    assert.ok(orders.length > 0, 'Orders table should contain verified order records');

    for (const order of orders) {
      assert.ok(order.orderNumber.startsWith('EC-'), `Order number must follow EC- prefix convention: ${order.orderNumber}`);
      assert.ok(['PENDING', 'PAID', 'FAILED', 'REFUNDED'].includes(order.paymentStatus), `Valid payment status: ${order.paymentStatus}`);

      // Verify financial equation
      const expectedPayable = Math.max(0, order.subtotal - order.discountAmount);
      const expectedTotal = Math.round((expectedPayable + order.shippingFee + order.taxAmount) * 100) / 100;
      assert.strictEqual(
        Math.round(order.totalAmount * 100) / 100,
        expectedTotal,
        `Order ${order.orderNumber} totalAmount mismatch: recorded ${order.totalAmount}, expected ${expectedTotal}`
      );
    }
  });

  test('5. Coupon System Constraints: Code uniqueness and discount calculations', async () => {
    const coupons = await prisma.coupon.findMany();
    assert.ok(coupons.length >= 3, 'Should have baseline promotional coupons');

    const couponCodes = new Set<string>();
    for (const coupon of coupons) {
      assert.ok(!couponCodes.has(coupon.code), `Duplicate coupon code detected: ${coupon.code}`);
      couponCodes.add(coupon.code);
      assert.ok(['PERCENTAGE', 'FIXED'].includes(coupon.discountType));
      assert.ok(coupon.discountValue > 0);
    }
  });

  test('6. Atomic Transaction Isolation: Validates rollback on simulated failure', async () => {
    const uniqueCategorySlug = `temp-test-cat-${Date.now()}`;
    let categoryCreated = false;

    try {
      await prisma.$transaction(async (tx) => {
        await tx.category.create({
          data: {
            name: `Temp Category ${Date.now()}`,
            slug: uniqueCategorySlug,
            description: 'Temporary category to verify rollback'
          }
        });
        categoryCreated = true;

        // Intentional failure to trigger rollback
        throw new Error('SIMULATED_TRANSACTION_FAILURE');
      });
    } catch (err: any) {
      assert.strictEqual(err.message, 'SIMULATED_TRANSACTION_FAILURE');
    }

    // Verify rollback: category must NOT exist
    const found = await prisma.category.findUnique({
      where: { slug: uniqueCategorySlug }
    });
    assert.strictEqual(found, null, 'Transaction rollback failed: record exists in database');
  });

  test('7. Idempotency Records & Background Job Table Consistency', async () => {
    const idempRecords = await prisma.idempotencyRecord.findMany();
    assert.ok(Array.isArray(idempRecords));

    const jobs = await prisma.backgroundJob.findMany();
    assert.ok(Array.isArray(jobs));
    for (const job of jobs) {
      assert.ok(['ORDER_CONFIRMATION', 'INVENTORY_ALERT', 'WELCOME_EMAIL'].includes(job.type));
      assert.ok(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(job.status));
    }
  });

  test('8. Admin Dashboard Metric Query Compatibility (Aggregations)', async () => {
    // 1. Order status distribution
    const statusCounts = await prisma.order.groupBy({
      by: ['orderStatus'],
      _count: { id: true }
    });
    assert.ok(Array.isArray(statusCounts));

    // 2. Revenue aggregation
    const paidRevenue = await prisma.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { totalAmount: true }
    });
    assert.ok(typeof paidRevenue._sum.totalAmount === 'number' || paidRevenue._sum.totalAmount === null);

    // 3. Category count
    const totalCategories = await prisma.category.count();
    assert.ok(totalCategories >= 8);
  });
});
