process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/server';
import prisma from '../src/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validateJwtSecret, KNOWN_INSECURE_SECRETS, config } from '../src/config';
import { backgroundQueue } from '../src/services/backgroundQueue';

describe('Phase 1: JWT Configuration & Authentication Security Tests', () => {
  let customerUser: any;
  let adminUser: any;
  let customerToken: string;
  let adminToken: string;

  before(async () => {
    const salt = await bcrypt.genSalt(10);
    const testPasswordHash = await bcrypt.hash('SecuredTest@2026', salt);

    // Ensure a test customer exists
    customerUser = await prisma.user.upsert({
      where: { email: 'sec.customer.test@ethnizcouture.com' },
      update: { role: 'CUSTOMER' },
      create: {
        name: 'Secured Patron Test',
        email: 'sec.customer.test@ethnizcouture.com',
        passwordHash: testPasswordHash,
        role: 'CUSTOMER'
      }
    });

    // Ensure a test administrator exists
    adminUser = await prisma.user.upsert({
      where: { email: 'sec.admin.test@ethnizcouture.com' },
      update: { role: 'ADMIN' },
      create: {
        name: 'Secured Admin Test',
        email: 'sec.admin.test@ethnizcouture.com',
        passwordHash: testPasswordHash,
        role: 'ADMIN'
      }
    });

    customerToken = jwt.sign(
      { id: customerUser.id, email: customerUser.email, role: 'CUSTOMER', name: customerUser.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: 'ADMIN', name: adminUser.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  after(async () => {
    if (customerUser) {
      await prisma.user.deleteMany({ where: { email: customerUser.email } });
    }
    if (adminUser) {
      await prisma.user.deleteMany({ where: { email: adminUser.email } });
    }
    await backgroundQueue.stop();
  });

  // --- 1. Production Configuration Validation Tests ---

  test('1.1 validateJwtSecret rejects missing or empty secret in production', () => {
    assert.throws(
      () => validateJwtSecret(undefined, 'production'),
      /JWT_SECRET environment variable is missing or empty in production/
    );

    assert.throws(
      () => validateJwtSecret('', 'production'),
      /JWT_SECRET environment variable is missing or empty in production/
    );

    assert.throws(
      () => validateJwtSecret('   ', 'production'),
      /JWT_SECRET environment variable is missing or empty in production/
    );
  });

  test('1.2 validateJwtSecret rejects all known insecure placeholders in production', () => {
    for (const placeholder of KNOWN_INSECURE_SECRETS) {
      assert.throws(
        () => validateJwtSecret(placeholder, 'production'),
        /JWT_SECRET cannot use a default, test, or known placeholder value in production/
      );
    }
  });

  test('1.3 validateJwtSecret rejects secrets shorter than 32 characters in production', () => {
    assert.throws(
      () => validateJwtSecret('my-short-custom-token-12345', 'production'),
      /JWT_SECRET must be at least 32 characters long in production/
    );
  });

  test('1.4 validateJwtSecret accepts valid high-entropy 32+ char secret in production', () => {
    const validSecret = 'ethniz_couture_super_luxury_production_signing_key_948271';
    const result = validateJwtSecret(validSecret, 'production');
    assert.strictEqual(result, validSecret);
  });

  test('1.5 validateJwtSecret provides safe explicit fallback in non-production environments', () => {
    const devFallback = validateJwtSecret(undefined, 'development');
    assert.ok(typeof devFallback === 'string');
    assert.ok(devFallback.length >= 32);
    assert.ok(devFallback.includes('dev-secret'));

    const testFallback = validateJwtSecret(undefined, 'test');
    assert.ok(typeof testFallback === 'string');
    assert.ok(testFallback.length >= 32);
  });

  // --- 2. Authentication & Admin Authorization Boundary Tests ---

  test('2.1 Normal customer can authenticate via email and password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'sec.customer.test@ethnizcouture.com',
        password: 'SecuredTest@2026'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.email, 'sec.customer.test@ethnizcouture.com');
    assert.strictEqual(res.body.user.role, 'CUSTOMER');
    assert.ok(typeof res.body.token === 'string');
  });

  test('2.2 Authentication fails with incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'sec.customer.test@ethnizcouture.com',
        password: 'WrongPassword@123'
      });

    assert.strictEqual(res.status, 401);
    assert.ok(res.body.message.includes('Invalid email or password'));
  });

  test('2.3 Unauthenticated request to /api/admin/stats returns 401 Unauthorized', async () => {
    const res = await request(app).get('/api/admin/stats');
    assert.strictEqual(res.status, 401);
    assert.ok(res.body.message.includes('Authorization token required'));
  });

  test('2.4 Authenticated Customer token requesting /api/admin/stats returns 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${customerToken}`);

    assert.strictEqual(res.status, 403);
    assert.ok(res.body.message.includes('Administrative privileges required'));
  });

  test('2.5 Authenticated Admin token requesting /api/admin/stats succeeds with 200', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.metrics !== undefined);
    assert.ok(typeof res.body.metrics.totalProducts === 'number');
  });

  test('2.6 Forged token with invalid signature returns 401 Invalid Token', async () => {
    const forgedToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: 'ADMIN', name: 'Forged Admin' },
      'wrong_fake_secret_key_attacking_server_now',
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${forgedToken}`);

    assert.strictEqual(res.status, 401);
    assert.ok(res.body.message.includes('Invalid or expired token'));
  });

  test('2.7 POST /api/auth/admin-login without masterKey returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/admin-login')
      .send({ email: adminUser.email, password: 'SecuredTest@2026' });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.message.includes('Passkey is required'));
  });

  test('2.8 POST /api/auth/admin-login with incorrect masterKey returns 403 Invalid Atelier Secret Passkey', async () => {
    const res = await request(app)
      .post('/api/auth/admin-login')
      .send({ email: adminUser.email, password: 'SecuredTest@2026', masterKey: 'WRONG-PASSKEY-1234' });

    assert.strictEqual(res.status, 403);
    assert.ok(res.body.message.includes('Invalid Atelier Secret Passkey'));
  });

  test('2.9 POST /api/auth/admin-login with Customer credentials and valid masterKey returns 403', async () => {
    const res = await request(app)
      .post('/api/auth/admin-login')
      .send({ email: customerUser.email, password: 'SecuredTest@2026', masterKey: config.adminMasterKey });

    assert.strictEqual(res.status, 403);
    assert.ok(res.body.message.includes('Account lacks administrative privileges'));
  });

  test('2.10 POST /api/auth/admin-login with Admin credentials and incorrect password returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/admin-login')
      .send({ email: adminUser.email, password: 'WrongPassword@999', masterKey: config.adminMasterKey });

    assert.strictEqual(res.status, 401);
    assert.ok(res.body.message.includes('Invalid administrator credentials'));
  });

  test('2.11 POST /api/auth/admin-login with Admin credentials and valid masterKey succeeds with 200 and token', async () => {
    const res = await request(app)
      .post('/api/auth/admin-login')
      .send({ email: adminUser.email, password: 'SecuredTest@2026', masterKey: config.adminMasterKey });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.role, 'ADMIN');
    assert.strictEqual(res.body.user.email, adminUser.email);
  });
});
