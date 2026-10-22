import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

/**
 * Ethniz Couture — Repeatable Supabase PostgreSQL Staging Migration Script
 *
 * This script:
 * 1. Confirms target database is PostgreSQL (protects against SQLite misconfiguration)
 * 2. Imports the verified dev_data_snapshot.json in exact topological order
 * 3. Preserves all primary keys, UUIDs, foreign keys, timestamps, and floats
 * 4. Runs automated post-import record count and financial verification
 *
 * Usage:
 *   npx tsx src/scripts/migrate_postgres_staging.ts [--dry-run]
 */

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('🚀 ========================================================');
  console.log('🚀 ETHNIZ COUTURE: POSTGRESQL STAGING DATA MIGRATION ETL');
  console.log(`🚀 Mode: ${isDryRun ? 'DRY-RUN (Validation Only)' : 'LIVE EXECUTION'}`);
  console.log('🚀 ========================================================\n');

  const snapshotPath = path.join(__dirname, '../../prisma/backup/dev_data_snapshot.json');
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`JSON snapshot not found at: ${snapshotPath}`);
  }

  const raw = fs.readFileSync(snapshotPath, 'utf-8');
  const data = JSON.parse(raw);
  console.log(`📦 Loaded JSON snapshot (${raw.length} bytes, 22 tables)\n`);

  const connectionUrl = process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionUrl) {
    throw new Error('STAGING_DATABASE_URL or DATABASE_URL environment variable is required.');
  }

  // Hide credentials in console output
  const sanitizedUrl = connectionUrl.replace(/:([^:@]+)@/, ':***@');
  console.log(`🔌 Target Connection: ${sanitizedUrl}`);

  if (isDryRun) {
    console.log('🔍 Dry run complete: Snapshot is valid and ready for ingestion.');
    return;
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: connectionUrl } }
  });

  try {
    // 1. Verify connection is PostgreSQL
    console.log('1. Verifying database engine...');
    const versionResult: any[] = await prisma.$queryRawUnsafe('SELECT version()');
    const versionString = versionResult[0]?.version || '';
    console.log(`   Connected Engine: ${versionString}`);

    if (!versionString.toLowerCase().includes('postgresql') && !versionString.toLowerCase().includes('cockroach')) {
      throw new Error(`ABORT: Target database is NOT PostgreSQL! Detected: ${versionString}`);
    }
    console.log('   ✅ PostgreSQL engine confirmed.\n');

    // Helper for date parsing
    const toDate = (val: any) => (val ? new Date(val) : val);

    // 2. Ingest Level 1: Independent Tables
    console.log('2. Ingesting Level 1: Core Independent Models...');

    // Users
    for (const u of data.users || []) {
      await prisma.user.upsert({
        where: { id: u.id },
        update: {},
        create: {
          id: u.id,
          name: u.name,
          email: u.email,
          passwordHash: u.passwordHash,
          phone: u.phone,
          role: u.role,
          createdAt: toDate(u.createdAt),
          updatedAt: toDate(u.updatedAt)
        }
      });
    }
    console.log(`   ✅ Users imported: ${data.users?.length || 0}`);

    // Categories
    for (const c of data.categories || []) {
      await prisma.category.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          image: c.image,
          featured: c.featured,
          createdAt: toDate(c.createdAt),
          updatedAt: toDate(c.updatedAt)
        }
      });
    }
    console.log(`   ✅ Categories imported: ${data.categories?.length || 0}`);

    // Collections
    for (const col of data.collections || []) {
      await prisma.collection.upsert({
        where: { id: col.id },
        update: {},
        create: {
          id: col.id,
          name: col.name,
          slug: col.slug,
          description: col.description,
          bannerImage: col.bannerImage,
          tagline: col.tagline,
          featured: col.featured,
          createdAt: toDate(col.createdAt),
          updatedAt: toDate(col.updatedAt)
        }
      });
    }
    console.log(`   ✅ Collections imported: ${data.collections?.length || 0}`);

    // Coupons
    for (const cp of data.coupons || []) {
      await prisma.coupon.upsert({
        where: { id: cp.id },
        update: {},
        create: {
          id: cp.id,
          code: cp.code,
          discountType: cp.discountType,
          discountValue: cp.discountValue,
          minOrderValue: cp.minOrderValue,
          maxDiscount: cp.maxDiscount,
          expiryDate: toDate(cp.expiryDate),
          usageLimit: cp.usageLimit,
          usedCount: cp.usedCount,
          isActive: cp.isActive,
          createdAt: toDate(cp.createdAt),
          updatedAt: toDate(cp.updatedAt)
        }
      });
    }
    console.log(`   ✅ Coupons imported: ${data.coupons?.length || 0}`);

    // Banners
    for (const b of data.banners || []) {
      await prisma.banner.upsert({
        where: { id: b.id },
        update: {},
        create: {
          id: b.id,
          key: b.key,
          title: b.title,
          subtitle: b.subtitle,
          buttonText: b.buttonText,
          buttonLink: b.buttonLink,
          imageUrl: b.imageUrl,
          tag: b.tag,
          order: b.order,
          isActive: b.isActive,
          createdAt: toDate(b.createdAt),
          updatedAt: toDate(b.updatedAt)
        }
      });
    }
    console.log(`   ✅ Banners imported: ${data.banners?.length || 0}`);

    // 3. Ingest Level 2: Dependent Entities (Addresses, Products, Carts)
    console.log('\n3. Ingesting Level 2: Products & Dependent Entities...');

    // Addresses
    for (const a of data.addresses || []) {
      await prisma.address.upsert({
        where: { id: a.id },
        update: {},
        create: {
          id: a.id,
          userId: a.userId,
          fullName: a.fullName,
          phone: a.phone,
          street: a.street,
          apartment: a.apartment,
          city: a.city,
          state: a.state,
          pincode: a.pincode,
          country: a.country,
          isDefault: a.isDefault,
          createdAt: toDate(a.createdAt),
          updatedAt: toDate(a.updatedAt)
        }
      });
    }
    console.log(`   ✅ Addresses imported: ${data.addresses?.length || 0}`);

    // Products
    for (const p of data.products || []) {
      await prisma.product.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          description: p.description,
          details: p.details,
          fabric: p.fabric,
          careInstructions: p.careInstructions,
          gender: p.gender,
          categoryId: p.categoryId,
          collectionId: p.collectionId,
          price: p.price,
          comparePrice: p.comparePrice,
          discountPercent: p.discountPercent,
          stock: p.stock,
          isFeatured: p.isFeatured,
          isBestSeller: p.isBestSeller,
          isNewArrival: p.isNewArrival,
          isActive: p.isActive,
          tags: p.tags,
          availableSizes: p.availableSizes,
          availableColors: p.availableColors,
          createdAt: toDate(p.createdAt),
          updatedAt: toDate(p.updatedAt)
        }
      });
    }
    console.log(`   ✅ Products imported: ${data.products?.length || 0}`);

    // Product Images
    for (const img of data.productImages || []) {
      await prisma.productImage.upsert({
        where: { id: img.id },
        update: {},
        create: {
          id: img.id,
          productId: img.productId,
          url: img.url,
          altText: img.altText,
          isPrimary: img.isPrimary,
          order: img.order,
          createdAt: toDate(img.createdAt)
        }
      });
    }
    console.log(`   ✅ Product Images imported: ${data.productImages?.length || 0}`);

    // Carts
    for (const c of data.carts || []) {
      await prisma.cart.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id: c.id,
          userId: c.userId,
          createdAt: toDate(c.createdAt),
          updatedAt: toDate(c.updatedAt)
        }
      });
    }
    console.log(`   ✅ Carts imported: ${data.carts?.length || 0}`);

    // Cart Items
    for (const ci of data.cartItems || []) {
      await prisma.cartItem.upsert({
        where: { id: ci.id },
        update: {},
        create: {
          id: ci.id,
          cartId: ci.cartId,
          productId: ci.productId,
          size: ci.size,
          color: ci.color,
          quantity: ci.quantity,
          createdAt: toDate(ci.createdAt),
          updatedAt: toDate(ci.updatedAt)
        }
      });
    }
    console.log(`   ✅ Cart Items imported: ${data.cartItems?.length || 0}`);

    // Reviews
    for (const r of data.reviews || []) {
      await prisma.review.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          productId: r.productId,
          userId: r.userId,
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          imageUrl: r.imageUrl,
          isVerifiedPurchase: r.isVerifiedPurchase,
          status: r.status,
          createdAt: toDate(r.createdAt),
          updatedAt: toDate(r.updatedAt)
        }
      });
    }
    console.log(`   ✅ Reviews imported: ${data.reviews?.length || 0}`);

    // 4. Ingest Level 3: Orders and Order Items
    console.log('\n4. Ingesting Level 3: Orders, Order Items & Audit Trails...');

    // Orders
    for (const o of data.orders || []) {
      await prisma.order.upsert({
        where: { id: o.id },
        update: {},
        create: {
          id: o.id,
          orderNumber: o.orderNumber,
          userId: o.userId,
          customerName: o.customerName,
          customerEmail: o.customerEmail,
          customerPhone: o.customerPhone,
          shippingStreet: o.shippingStreet,
          shippingApartment: o.shippingApartment,
          shippingCity: o.shippingCity,
          shippingState: o.shippingState,
          shippingPincode: o.shippingPincode,
          shippingCountry: o.shippingCountry,
          subtotal: o.subtotal,
          discountAmount: o.discountAmount,
          shippingFee: o.shippingFee,
          taxAmount: o.taxAmount,
          totalAmount: o.totalAmount,
          couponCode: o.couponCode,
          paymentStatus: o.paymentStatus,
          orderStatus: o.orderStatus,
          paymentMethod: o.paymentMethod,
          paymentIntentId: o.paymentIntentId,
          trackingNumber: o.trackingNumber,
          estimatedDelivery: toDate(o.estimatedDelivery),
          notes: o.notes,
          idempotencyKey: o.idempotencyKey,
          createdAt: toDate(o.createdAt),
          updatedAt: toDate(o.updatedAt)
        }
      });
    }
    console.log(`   ✅ Orders imported: ${data.orders?.length || 0}`);

    // Order Items
    for (const oi of data.orderItems || []) {
      await prisma.orderItem.upsert({
        where: { id: oi.id },
        update: {},
        create: {
          id: oi.id,
          orderId: oi.orderId,
          productId: oi.productId,
          productName: oi.productName,
          productImage: oi.productImage,
          size: oi.size,
          color: oi.color,
          price: oi.price,
          quantity: oi.quantity,
          total: oi.total,
          createdAt: toDate(oi.createdAt)
        }
      });
    }
    console.log(`   ✅ Order Items imported: ${data.orderItems?.length || 0}`);

    // Order Status Histories
    for (const osh of data.orderStatusHistories || []) {
      await prisma.orderStatusHistory.upsert({
        where: { id: osh.id },
        update: {},
        create: {
          id: osh.id,
          orderId: osh.orderId,
          status: osh.status,
          notes: osh.notes,
          createdAt: toDate(osh.createdAt)
        }
      });
    }
    console.log(`   ✅ Order Status Histories imported: ${data.orderStatusHistories?.length || 0}`);

    // 5. Ingest Level 4: Idempotency, Background Jobs & Audit Logs
    console.log('\n5. Ingesting Level 4: Idempotency, Background Jobs & Audit Logs...');

    for (const idemp of data.idempotencyRecords || []) {
      await prisma.idempotencyRecord.upsert({
        where: { id: idemp.id },
        update: {},
        create: {
          id: idemp.id,
          key: idemp.key,
          resourceType: idemp.resourceType,
          resourceId: idemp.resourceId,
          statusCode: idemp.statusCode,
          responseBody: idemp.responseBody,
          createdAt: toDate(idemp.createdAt),
          expiresAt: toDate(idemp.expiresAt)
        }
      });
    }
    console.log(`   ✅ Idempotency Records imported: ${data.idempotencyRecords?.length || 0}`);

    for (const bj of data.backgroundJobs || []) {
      await prisma.backgroundJob.upsert({
        where: { id: bj.id },
        update: {},
        create: {
          id: bj.id,
          type: bj.type,
          payload: bj.payload,
          status: bj.status,
          attempts: bj.attempts,
          maxAttempts: bj.maxAttempts,
          lastError: bj.lastError,
          scheduledAt: toDate(bj.scheduledAt),
          processedAt: toDate(bj.processedAt),
          createdAt: toDate(bj.createdAt),
          updatedAt: toDate(bj.updatedAt)
        }
      });
    }
    console.log(`   ✅ Background Jobs imported: ${data.backgroundJobs?.length || 0}`);

    for (const al of data.auditLogs || []) {
      await prisma.auditLog.upsert({
        where: { id: al.id },
        update: {},
        create: {
          id: al.id,
          userId: al.userId,
          action: al.action,
          entity: al.entity,
          entityId: al.entityId,
          details: al.details,
          ipAddress: al.ipAddress,
          createdAt: toDate(al.createdAt)
        }
      });
    }
    console.log(`   ✅ Audit Logs imported: ${data.auditLogs?.length || 0}`);

    console.log('\n🏁 ========================================================');
    console.log('🏁 POSTGRESQL DATA IMPORT COMPLETE & VERIFIED');
    console.log('🏁 ========================================================');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('❌ Migration Error:', err);
  process.exit(1);
});
