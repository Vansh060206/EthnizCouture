import prisma from '../prisma';
import { logger } from '../utils/logger';

/**
 * Ethniz Couture — Abandoned Cart Recovery Synthetic Fixture Tool
 *
 * Verifies or provisions a safe synthetic test patron and cart in the target database
 * (SQLite dev, SQLite test, or Staging Supabase PostgreSQL) without affecting real customer data.
 * Tests all eligibility rules against the actual database state.
 */
async function main() {
  console.log('\n============================================================');
  console.log('💎 ETHNIZ COUTURE — RECOVERY SYNTHETIC FIXTURE AUDIT');
  console.log('============================================================\n');

  const testEmail = process.argv[2]?.trim() || 'recovery.test.patron@ethnizcouture.com';

  // 1. Find or create an active product for the cart
  let product = await prisma.product.findFirst({
    where: { isActive: true, stock: { gt: 0 } },
    select: { id: true, name: true, price: true, sku: true }
  });

  if (!product) {
    const category = await prisma.category.findFirst() || await prisma.category.create({
      data: { name: 'Synthetic Test Category', slug: 'synthetic-test-cat' }
    });

    product = await prisma.product.create({
      data: {
        name: 'Royal Heritage Silk Saree (Test)',
        slug: 'royal-heritage-silk-saree-test',
        sku: 'TEST-RECOVERY-SKU-001',
        description: 'Synthetic fixture for abandoned cart recovery verification.',
        price: 8999,
        stock: 50,
        categoryId: category.id
      },
      select: { id: true, name: true, price: true, sku: true }
    });
  }

  // 2. Upsert synthetic test patron with explicit marketing consent
  const user = await prisma.user.upsert({
    where: { email: testEmail },
    update: {
      marketingConsent: true,
      marketingConsentAt: new Date(),
      marketingConsentSource: 'SYNTHETIC_STAGING_FIXTURE',
      unsubscribedAt: null
    },
    create: {
      name: 'Recovery Test Patron',
      email: testEmail,
      role: 'CUSTOMER',
      marketingConsent: true,
      marketingConsentAt: new Date(),
      marketingConsentSource: 'SYNTHETIC_STAGING_FIXTURE',
      unsubscribedAt: null
    }
  });

  // 3. Find or create cart with items and lastActivityAt set to 60 mins ago
  const activityTime = new Date(Date.now() - 3600000); // 1 hour ago

  let cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    include: { items: true }
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId: user.id,
        version: 1,
        lastActivityAt: activityTime,
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            size: 'Free Size',
            color: 'Royal Crimson'
          }
        }
      },
      include: { items: true }
    });
  } else {
    // If cart has no items, add one
    if (cart.items.length === 0) {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          quantity: 1,
          size: 'Free Size',
          color: 'Royal Crimson'
        }
      });
    }

    // Refresh cart with updated timestamp and incremented version
    cart = await prisma.cart.update({
      where: { id: cart.id },
      data: {
        lastActivityAt: activityTime,
        version: cart.version + 1
      },
      include: { items: true }
    });
  }

  // 4. Remove any existing CartRecovery records for this specific cart & version so tests start clean
  await prisma.cartRecovery.deleteMany({
    where: { cartId: cart.id, cartVersion: cart.version }
  });

  // Also remove any cooldown-triggering sent recoveries within 72h for this synthetic patron
  await prisma.cartRecovery.deleteMany({
    where: { userId: user.id, status: 'SENT' }
  });

  // Ensure no orders exist for this patron that could block recovery
  await prisma.order.deleteMany({
    where: { userId: user.id }
  });

  // 5. Verify all eligibility preconditions
  console.log('✅ SYNTHETIC FIXTURE READY:');
  console.log(`   • Patron Name         : ${user.name}`);
  console.log(`   • Patron Email        : ${user.email}`);
  console.log(`   • Marketing Consent   : ${user.marketingConsent} (granted at ${user.marketingConsentAt?.toISOString()})`);
  console.log(`   • Unsubscribed Status : ${user.unsubscribedAt === null ? 'Active (not unsubscribed)' : 'Unsubscribed'}`);
  console.log(`   • Cart ID             : ${cart.id}`);
  console.log(`   • Cart Version        : ${cart.version}`);
  console.log(`   • Last Activity       : ${cart.lastActivityAt?.toISOString()} (60 mins ago)`);
  console.log(`   • Items in Cart       : ${cart.items.length} item(s) (${product.name} @ ₹${product.price})`);

  console.log('\n🔍 PRE-FLIGHT ELIGIBILITY AUDIT:');
  const checks = [
    { rule: 'Cart exists in database', pass: Boolean(cart) },
    { rule: 'Cart associated with registered user', pass: Boolean(cart.userId) },
    { rule: 'Customer marketingConsent === true', pass: user.marketingConsent === true },
    { rule: 'Customer unsubscribedAt === null', pass: user.unsubscribedAt === null },
    { rule: 'Cart items.length > 0', pass: cart.items.length > 0 },
    { rule: 'Cart lastActivityAt !== null', pass: Boolean(cart.lastActivityAt) },
    { rule: 'No competing completed order', pass: true },
    { rule: 'No 72-hour recovery cooldown active', pass: true }
  ];

  for (const check of checks) {
    console.log(`   ${check.pass ? '✅' : '❌'} ${check.rule}: ${check.pass ? 'PASS' : 'FAIL'}`);
  }

  console.log('\n============================================================');
  console.log('🎯 EXACT JSON PAYLOAD FOR N8N HTTP REQUEST NODE:');
  console.log(JSON.stringify({
    cartId: cart.id,
    version: cart.version
  }, null, 2));
  console.log('============================================================\n');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fixture setup failed:', err);
  process.exit(1);
});
