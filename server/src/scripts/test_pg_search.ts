import { PrismaClient } from '../generated/pg-client';

const prisma = new PrismaClient();

async function run() {
  console.log('Testing Supabase PostgreSQL search queries:');
  for (const q of ['lehenga', 'LEHENGA', 'LeHeNgA']) {
    const withMode = await prisma.product.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      select: { name: true }
    });
    const withoutMode = await prisma.product.findMany({
      where: { name: { contains: q } },
      select: { name: true }
    });
    console.log(`Query: "${q.padEnd(8)}" -> WITH mode: 'insensitive': ${withMode.length} items | WITHOUT mode: ${withoutMode.length} items`);
  }
  await prisma.$disconnect();
}

run().catch(console.error);
