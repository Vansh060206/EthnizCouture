process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/server';
import prisma from '../src/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import { backgroundQueue } from '../src/services/backgroundQueue';

describe('Phase: Mobile-First Customer Account & Personal Shopping Tests', () => {
  let testUser: any;
  let testToken: string;

  before(async () => {
    // 1. Create unique test customer
    const passwordHash = await bcrypt.hash('RoyalPassword123!', 10);
    testUser = await prisma.user.create({
      data: {
        email: `sharmila.couture.${Date.now()}@example.com`,
        passwordHash,
        name: 'Sharmila Tagore',
        phone: '9820012345',
        role: 'CUSTOMER'
      }
    });

    testToken = jwt.sign(
      { id: testUser.id, email: testUser.email, role: testUser.role },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  after(async () => {
    try {
      if (testUser) {
        await prisma.address.deleteMany({ where: { userId: testUser.id } });
        await prisma.order.deleteMany({ where: { customerEmail: testUser.email } });
        await prisma.user.delete({ where: { id: testUser.id } });
      }
    } catch {
      // ignore
    }
    backgroundQueue.stop();
  });

  test('1. GET /api/auth/me returns customer identity, addresses and activity counts', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${testToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.id, testUser.id);
    assert.strictEqual(res.body.user.name, 'Sharmila Tagore');
    assert.strictEqual(res.body.user.phone, '9820012345');
    assert.ok(res.body.user._count);
    assert.strictEqual(typeof res.body.user._count.orders, 'number');
    assert.strictEqual(typeof res.body.user._count.wishlist, 'number');
  });

  test('2. PUT /api/auth/profile updates profile and enforces Indian phone validation', async () => {
    // 2.1 Rejects invalid phone number (e.g. invalid digits)
    const invalidRes = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ phone: '12345' });

    assert.strictEqual(invalidRes.status, 400);

    // 2.2 Accepts valid updated name and phone
    const validRes = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        name: 'Begum Sharmila Tagore Pataudi',
        phone: '9820098200'
      });

    assert.strictEqual(validRes.status, 200);
    assert.strictEqual(validRes.body.user.name, 'Begum Sharmila Tagore Pataudi');
    assert.strictEqual(validRes.body.user.phone, '9820098200');
  });

  test('3. GET /api/coupons returns available public atelier coupons for account hub', async () => {
    const res = await request(app).get('/api/coupons');

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.coupons));
    if (res.body.coupons.length > 0) {
      const c = res.body.coupons[0];
      assert.ok(c.code);
      assert.ok(c.discountType);
      assert.ok(c.discountValue > 0);
      assert.strictEqual(c.usedCount, undefined); // Sensitive admin counts not leaked
    }
  });

  test('4. Customer address management: Add address, verify in list, and delete', async () => {
    // 4.1 Add address
    const addRes = await request(app)
      .post('/api/users/addresses')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        fullName: 'Begum Sharmila Tagore Pataudi',
        phone: '9820098200',
        street: '1 Pataudi Palace Drive',
        apartment: 'Heritage Wing',
        city: 'Gurugram',
        state: 'Haryana',
        pincode: '122503',
        country: 'India',
        isDefault: true
      });

    assert.strictEqual(addRes.status, 201);
    const newAddressId = addRes.body.address.id;

    // 4.2 Verify in list
    const listRes = await request(app)
      .get('/api/users/addresses')
      .set('Authorization', `Bearer ${testToken}`);

    assert.strictEqual(listRes.status, 200);
    assert.ok(listRes.body.addresses.some((a: any) => a.id === newAddressId));

    // 4.3 Delete address
    const delRes = await request(app)
      .delete(`/api/users/addresses/${newAddressId}`)
      .set('Authorization', `Bearer ${testToken}`);

    assert.strictEqual(delRes.status, 200);
  });
});
