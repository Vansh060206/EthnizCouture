import path from 'path';
import { PrismaClient } from '@prisma/client';

/**
 * Script to audit row counts in dev.db and test.db to verify isolation.
 */
async function countRows(dbPath: string): Promise<Record<string, number>> {
  const prisma = new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } }
  });

  const tables = [
    'user', 'address', 'category', 'collection', 'product', 'productImage',
    'productVariant', 'cart', 'cartItem', 'wishlist', 'order', 'orderItem',
    'orderStatusHistory', 'review', 'coupon', 'banner', 'mediaAsset',
    'contactMessage', 'newsletterSubscriber', 'idempotencyRecord', 'backgroundJob', 'auditLog'
  ];

  const counts: Record<string, number> = {};
  for (const t of tables) {
    counts[t] = await (prisma as any)[t].count();
  }
  await prisma.$disconnect();
  return counts;
}

async function main() {
  const devDb = path.resolve(__dirname, '../../prisma/dev.db');
  const testDb = path.resolve(__dirname, '../../prisma/test.db');
  const backupDb = path.resolve(__dirname, '../../prisma/backup/dev_backup_phase2a.db');

  console.log('📊 Auditing database counts for isolation verification...');
  const devCounts = await countRows(devDb);
  const devTotal = Object.values(devCounts).reduce((a, b) => a + b, 0);
  console.log(`\n📁 ACTIVE dev.db Total Rows: ${devTotal}`);

  const backupCounts = await countRows(backupDb);
  const backupTotal = Object.values(backupCounts).reduce((a, b) => a + b, 0);
  console.log(`📁 BASELINE dev_backup_phase2a.db Total Rows: ${backupTotal}`);

  try {
    const testCounts = await countRows(testDb);
    const testTotal = Object.values(testCounts).reduce((a, b) => a + b, 0);
    console.log(`📁 ISOLATED test.db Total Rows: ${testTotal}`);

    console.log('\n--- Differences between test.db and baseline backup ---');
    for (const [k, v] of Object.entries(testCounts)) {
      if (v !== backupCounts[k]) {
        console.log(`  • ${k}: test.db=${v}, backup=${backupCounts[k]} (diff: ${v - backupCounts[k]})`);
      }
    }
  } catch (err: any) {
    console.log(`📁 ISOLATED test.db: Not yet created or query error: ${err.message}`);
  }
}

main().catch(console.error);
