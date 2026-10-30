import request from 'supertest';
import app from '../server';
import prisma from '../prisma';
import { config } from '../config';

async function run() {
  console.log('Testing synthetic fixture against server...');
  const cart = await prisma.cart.findFirst({
    where: { user: { email: 'recovery.test.patron@ethnizcouture.com' } }
  });

  if (!cart) {
    console.error('Fixture cart not found. Run npm run dev:fixture first.');
    process.exit(1);
  }

  const secret = config.n8nInboundSecret || 'test-synthetic-secret-32-chars-long';
  config.n8nInboundSecret = secret;

  console.log(`\n1. Executing first recovery callback [Cart: ${cart.id}, v${cart.version}]...`);
  const res1 = await request(app)
    .post('/api/recovery/cart-callback')
    .set('X-N8N-Key', secret)
    .send({ cartId: cart.id, version: cart.version });

  console.log(`Response 1: HTTP ${res1.status}`, res1.body);

  console.log(`\n2. Replaying identical callback to verify idempotency...`);
  const res2 = await request(app)
    .post('/api/recovery/cart-callback')
    .set('X-N8N-Key', secret)
    .send({ cartId: cart.id, version: cart.version });

  console.log(`Response 2: HTTP ${res2.status}`, res2.body);

  const recoveryRecord = await prisma.cartRecovery.findUnique({
    where: { cartId_cartVersion: { cartId: cart.id, cartVersion: cart.version } }
  });

  console.log(`\n3. Database State in CartRecovery:`);
  console.log(`   • ID     : ${recoveryRecord?.id}`);
  console.log(`   • Status : ${recoveryRecord?.status}`);
  console.log(`   • Sent At: ${recoveryRecord?.sentAt}`);

  await prisma.$disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
