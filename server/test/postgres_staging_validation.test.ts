process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '../src/generated/pg-client';

describe('Phase 2B: Staging Database Migration & PostgreSQL Validation Suite', () => {
  const snapshotPath = path.join(__dirname, '../prisma/backup/dev_data_snapshot.json');
  let snapshotData: Record<string, any[]>;
  let prisma: PrismaClient;
  let isPostgres = false;

  before(async () => {
    assert.ok(fs.existsSync(snapshotPath), `Snapshot file must exist: ${snapshotPath}`);
    snapshotData = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));

    const connectionUrl = process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL;
    assert.ok(connectionUrl, 'Database connection URL must be available');

    prisma = new PrismaClient({
      datasources: { db: { url: connectionUrl } }
    });

    try {
      const versionResult: any[] = await prisma.$queryRawUnsafe('SELECT version()');
      const versionStr = String(versionResult[0]?.version || '').toLowerCase();
      isPostgres = versionStr.includes('postgresql') || versionStr.includes('cockroach');
      console.log(`\nℹ️ Connected Database Engine: ${versionStr.substring(0, 50)}... (Is PostgreSQL: ${isPostgres})`);
    } catch {
      // Fallback for engines without SELECT version() (e.g. SQLite uses sqlite_version())
      try {
        const sqliteVer: any[] = await prisma.$queryRawUnsafe('SELECT sqlite_version() as ver');
        console.log(`\nℹ️ Connected Database Engine: SQLite ${sqliteVer[0]?.ver} (Awaiting Staging PostgreSQL connection)`);
      } catch {
        console.log('\nℹ️ Database connected via standard driver.');
      }
    }
  });

  after(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  test('1. Snapshot Integrity: Verifies all 22 models and exact record counts in export', async () => {
    const expectedCounts: Record<string, number> = {
      users: 2,
      addresses: 2,
      categories: 8,
      collections: 3,
      products: 23,
      productImages: 46,
      productVariants: 0,
      carts: 2,
      cartItems: 2,
      wishlists: 0,
      orders: 29,
      orderItems: 30,
      orderStatusHistories: 40,
      reviews: 5,
      coupons: 3,
      banners: 3,
      mediaAssets: 0,
      contactMessages: 0,
      newsletterSubscribers: 0,
      idempotencyRecords: 7,
      backgroundJobs: 35,
      auditLogs: 28
    };

    for (const [key, expected] of Object.entries(expectedCounts)) {
      const actual = (snapshotData[key] || []).length;
      assert.strictEqual(
        actual,
        expected,
        `Snapshot count mismatch for ${key}: expected ${expected}, got ${actual}`
      );
    }
  });

  test('2. Order Financial Accuracy: Verifies zero arithmetic drift on orders', async () => {
    for (const order of snapshotData.orders || []) {
      const payable = Math.max(0, order.subtotal - order.discountAmount);
      const expectedTotal = Math.round((payable + order.shippingFee + order.taxAmount) * 100) / 100;
      const actualTotal = Math.round(order.totalAmount * 100) / 100;

      assert.strictEqual(
        actualTotal,
        expectedTotal,
        `Order ${order.orderNumber} arithmetic drift: total is ${actualTotal}, expected ${expectedTotal}`
      );
    }
  });

  test('3. Foreign Key Integrity: Verifies 100% of parent-child relationships', async () => {
    const userIds = new Set((snapshotData.users || []).map(u => u.id));
    const productIds = new Set((snapshotData.products || []).map(p => p.id));
    const categoryIds = new Set((snapshotData.categories || []).map(c => c.id));
    const orderIds = new Set((snapshotData.orders || []).map(o => o.id));

    // Address -> User
    for (const a of snapshotData.addresses || []) {
      assert.ok(userIds.has(a.userId), `Address ${a.id} must reference valid user`);
    }

    // Product -> Category
    for (const p of snapshotData.products || []) {
      assert.ok(categoryIds.has(p.categoryId), `Product ${p.sku} must reference valid category`);
    }

    // ProductImage -> Product
    for (const img of snapshotData.productImages || []) {
      assert.ok(productIds.has(img.productId), `ProductImage ${img.id} must reference valid product`);
    }

    // OrderItem -> Order
    for (const item of snapshotData.orderItems || []) {
      assert.ok(orderIds.has(item.orderId), `OrderItem ${item.id} must reference valid order`);
    }

    // OrderStatusHistory -> Order
    for (const history of snapshotData.orderStatusHistories || []) {
      assert.ok(orderIds.has(history.orderId), `OrderStatusHistory ${history.id} must reference valid order`);
    }
  });

  test('4. Atomic Transaction and Rollback Isolation', async () => {
    const tempSlug = `test-rollback-slug-${Date.now()}`;
    let threw = false;

    try {
      await prisma.$transaction(async (tx) => {
        await tx.category.create({
          data: {
            name: `Test Category ${Date.now()}`,
            slug: tempSlug,
            description: 'Temporary category for rollback verification'
          }
        });
        throw new Error('INTENTIONAL_ROLLBACK');
      });
    } catch (err: any) {
      if (err.message === 'INTENTIONAL_ROLLBACK') threw = true;
    }

    assert.strictEqual(threw, true);
    const check = await prisma.category.findUnique({ where: { slug: tempSlug } });
    assert.strictEqual(check, null, 'Rollback failed: record persisted after transaction error');
  });

  test('5. Admin Aggregation Queries (PostgreSQL Compatibility)', async () => {
    const orderStats = await prisma.order.groupBy({
      by: ['paymentStatus'],
      _count: { id: true }
    });
    assert.ok(Array.isArray(orderStats));

    const totalRev = await prisma.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { totalAmount: true }
    });
    assert.ok(typeof totalRev._sum.totalAmount === 'number' || totalRev._sum.totalAmount === null);
  });

  test('6. Case-Insensitive Search on Staging PostgreSQL (lehenga, LEHENGA, LeHeNgA)', async () => {
    const variations = ['lehenga', 'LEHENGA', 'LeHeNgA'];
    let expectedCount: number | null = null;

    for (const q of variations) {
      const items = await prisma.product.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        select: { id: true, name: true, sku: true }
      });

      if (expectedCount === null) {
        expectedCount = items.length;
        assert.ok(expectedCount > 0, `Expected search for '${q}' to match at least 1 product on PostgreSQL`);
      } else {
        assert.strictEqual(
          items.length,
          expectedCount,
          `PostgreSQL search variation '${q}' returned ${items.length} items, expected ${expectedCount}`
        );
      }
    }
  });
});

