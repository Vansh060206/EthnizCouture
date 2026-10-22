process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import app from '../src/server';
import prisma from '../src/prisma';

describe('Password Recovery & Reset Verification Flow', () => {
  const testEmail = 'patron.recovery.test@ethnizcouture.com';
  const initialPassword = 'InitialSecurePass123!';
  const updatedPassword = 'NewSecretAtelierPass456!';
  let testUser: any;

  before(async () => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(initialPassword, salt);

    // Clean up any lingering data
    await prisma.passwordReset.deleteMany({ where: { email: testEmail } });
    await prisma.user.deleteMany({ where: { email: testEmail } });

    testUser = await prisma.user.create({
      data: {
        name: 'Patron Recovery Test',
        email: testEmail,
        passwordHash,
        role: 'CUSTOMER'
      }
    });
  });

  after(async () => {
    await prisma.passwordReset.deleteMany({ where: { email: testEmail } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  test('POST /api/auth/forgot-password fails with invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'invalid-email' });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.field, 'email');
  });

  test('POST /api/auth/forgot-password returns 200 for non-existent email (prevents account enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'ghost.user.xyz@unknownbrand.com' });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message.includes('recovery code has been sent'));
  });

  test('POST /api/auth/forgot-password generates OTP and creates PasswordReset record for registered patron', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testEmail });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message.includes('recovery code has been sent'));

    // Verify record in database
    const resetRecord = await prisma.passwordReset.findFirst({
      where: { email: testEmail, used: false },
      orderBy: { createdAt: 'desc' }
    });

    assert.ok(resetRecord, 'PasswordReset record must be created');
    assert.strictEqual(resetRecord.used, false);
    assert.strictEqual(resetRecord.attempts, 0);
    assert.ok(resetRecord.expiresAt > new Date(), 'Expiry must be in the future');
  });

  test('POST /api/auth/forgot-password enforces 60s rate limit on subsequent requests', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testEmail });

    assert.strictEqual(res.status, 429);
    assert.ok(res.body.message.includes('wait 60 seconds'));
  });

  test('POST /api/auth/verify-reset-otp rejects invalid 6-digit code', async () => {
    const res = await request(app)
      .post('/api/auth/verify-reset-otp')
      .send({ email: testEmail, otp: '000000' });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.message.includes('Incorrect verification code'));
  });

  test('POST /api/auth/verify-reset-otp accepts valid code matching hash', async () => {
    // Inject a deterministic OTP for testing
    const knownOtp = '742918';
    const knownHash = crypto.createHash('sha256').update(knownOtp).digest('hex');

    await prisma.passwordReset.create({
      data: {
        email: testEmail,
        otpHash: knownHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        attempts: 0,
        used: false
      }
    });

    const res = await request(app)
      .post('/api/auth/verify-reset-otp')
      .send({ email: testEmail, otp: knownOtp });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.valid, true);
  });

  test('POST /api/auth/reset-password updates password and consumes the reset token', async () => {
    const knownOtp = '583921';
    const knownHash = crypto.createHash('sha256').update(knownOtp).digest('hex');

    await prisma.passwordReset.create({
      data: {
        email: testEmail,
        otpHash: knownHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        attempts: 0,
        used: false
      }
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({
        email: testEmail,
        otp: knownOtp,
        newPassword: updatedPassword
      });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message.includes('Password reset successful'));

    // Check token is now marked used
    const consumedToken = await prisma.passwordReset.findFirst({
      where: { email: testEmail, otpHash: knownHash }
    });
    assert.strictEqual(consumedToken?.used, true);

    // Verify patron can authenticate with new password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: updatedPassword });

    assert.strictEqual(loginRes.status, 200);
    assert.ok(loginRes.body.token);

    // Old password must fail
    const oldLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: initialPassword });

    assert.strictEqual(oldLoginRes.status, 401);
  });

  test('POST /api/auth/reset-password prevents token re-use', async () => {
    // Invalidate any lingering active tokens to isolate re-use test
    await prisma.passwordReset.updateMany({
      where: { email: testEmail },
      data: { used: true }
    });

    const consumedOtp = '583921';

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({
        email: testEmail,
        otp: consumedOtp,
        newPassword: 'AnotherPassword999!'
      });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.message.includes('expired or is invalid'));
  });
});
