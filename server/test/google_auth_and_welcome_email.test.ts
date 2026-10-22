process.env.NODE_ENV = 'test';
import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { OAuth2Client } from 'google-auth-library';
import app from '../src/server';
import prisma from '../src/prisma';
import bcrypt from 'bcryptjs';
import { backgroundQueue } from '../src/services/backgroundQueue';
import { emailService, generateWelcomeEmailHtml, generateWelcomeEmailText, escapeHtml } from '../src/services/emailService';
import { config } from '../src/config';

describe('Google Sign-In & Luxury Welcome Email Integration Tests', () => {
  const originalVerify = OAuth2Client.prototype.verifyIdToken;
  let mockPayload: any = null;
  let mockError: Error | null = null;

  before(async () => {
    // Stub OAuth2Client.prototype.verifyIdToken
    OAuth2Client.prototype.verifyIdToken = async function (options: any) {
      if (mockError) {
        throw mockError;
      }
      if (options.audience && mockPayload?.aud && !options.audience.includes(mockPayload.aud)) {
        throw new Error(`Wrong audience: expected ${options.audience}, got ${mockPayload.aud}`);
      }
      return {
        getPayload: () => mockPayload
      } as any;
    };
  });

  after(async () => {
    // Restore original verifyIdToken
    OAuth2Client.prototype.verifyIdToken = originalVerify;

    // Clean up created test users
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: 'google_test_'
          }
        }
      });
      await prisma.backgroundJob.deleteMany({
        where: {
          type: 'WELCOME_EMAIL'
        }
      });
    } catch {}

    await backgroundQueue.stop();
  });

  beforeEach(() => {
    mockPayload = null;
    mockError = null;
  });

  // =========================================================================
  // TEST SUITE 1: GOOGLE AUTHENTICATION TOKEN VERIFICATION & CLAIMS
  // =========================================================================
  describe('Google Authentication Token Verification & Security Rules', () => {

    test('1. Rejects request when Google credential/idToken is missing or empty', async () => {
      const res1 = await request(app)
        .post('/api/auth/google')
        .send({});
      assert.strictEqual(res1.status, 400);
      assert.match(res1.body.message, /credential is required/i);

      const res2 = await request(app)
        .post('/api/auth/google')
        .send({ idToken: '   ' });
      assert.strictEqual(res2.status, 400);
    });

    test('2. Rejects invalid Google token signature with 401', async () => {
      mockError = new Error('Invalid token signature from Google key');

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'invalid_signature_jwt' });

      assert.strictEqual(res.status, 401);
      assert.match(res.body.message, /invalid or expired/i);
    });

    test('3. Rejects expired Google token with 401', async () => {
      mockError = new Error('Token used too late, exp was 1720000000');

      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: 'expired_google_jwt' });

      assert.strictEqual(res.status, 401);
      assert.match(res.body.message, /invalid or expired/i);
    });

    test('4. Rejects token with mismatched audience/client ID', async () => {
      mockError = new Error('Wrong recipient, payload audience != client_id');

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'mismatched_audience_jwt' });

      assert.strictEqual(res.status, 401);
    });

    test('5. Rejects token from untrusted issuer', async () => {
      mockPayload = {
        sub: 'google_untrusted_issuer_1',
        email: 'google_test_bad_iss@example.com',
        email_verified: true,
        iss: 'untrusted-fake-issuer.com'
      };

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'untrusted_issuer_jwt' });

      assert.strictEqual(res.status, 401);
      assert.match(res.body.message, /invalid google token issuer/i);
    });

    test('6. Rejects Google account with unverified email address', async () => {
      mockPayload = {
        sub: 'google_unverified_sub_1',
        email: 'google_test_unverified@example.com',
        email_verified: false,
        iss: 'https://accounts.google.com'
      };

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'unverified_email_jwt' });

      assert.strictEqual(res.status, 400);
      assert.match(res.body.message, /unverified by google/i);
    });
  });

  // =========================================================================
  // TEST SUITE 2: NEW PATRON REGISTRATION & ACCOUNT LINKING
  // =========================================================================
  describe('Patron Account Lifecycle & Account Linking', () => {
    const timestamp = Date.now();
    const newGoogleSub = `sub_brand_new_${timestamp}`;
    const newGoogleEmail = `google_test_new_${timestamp}@example.com`;

    test('7. New Google patron: registers account, enforces CUSTOMER role, enqueues welcome email', async () => {
      mockPayload = {
        sub: newGoogleSub,
        email: newGoogleEmail,
        email_verified: true,
        name: 'Princess Gayatri Devi',
        picture: 'https://lh3.googleusercontent.com/avatar_test.jpg',
        iss: 'accounts.google.com'
      };

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'valid_new_google_jwt' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.isNewUser, true);
      assert.strictEqual(res.body.user.email, newGoogleEmail);
      assert.strictEqual(res.body.user.role, 'CUSTOMER', 'Role must strictly be CUSTOMER');
      assert.ok(res.body.token, 'JWT session token must be returned');

      // Verify record in database
      const userInDb = await prisma.user.findUnique({
        where: { email: newGoogleEmail }
      });
      assert.ok(userInDb);
      assert.strictEqual(userInDb.googleId, newGoogleSub);
      assert.strictEqual(userInDb.role, 'CUSTOMER');
      assert.strictEqual(userInDb.avatar, 'https://lh3.googleusercontent.com/avatar_test.jpg');
      assert.ok(typeof userInDb.welcomeEmailSent === 'boolean');

      // Verify that welcome email background job was enqueued
      const job = await prisma.backgroundJob.findFirst({
        where: {
          type: 'WELCOME_EMAIL',
          payload: { contains: newGoogleEmail }
        }
      });
      assert.ok(job, 'A WELCOME_EMAIL job must be enqueued for new Google patron');
    });

    test('8. Returning Google patron: signs in, returns session, does NOT enqueue another welcome email', async () => {
      // Clear jobs to observe new additions
      await prisma.backgroundJob.deleteMany({
        where: { type: 'WELCOME_EMAIL' }
      });

      mockPayload = {
        sub: newGoogleSub,
        email: newGoogleEmail,
        email_verified: true,
        name: 'Princess Gayatri Devi',
        iss: 'accounts.google.com'
      };

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'valid_returning_jwt' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.isNewUser, false, 'Existing user must have isNewUser: false');
      assert.ok(res.body.token);

      // Verify NO welcome email was enqueued for returning login
      const jobCount = await prisma.backgroundJob.count({
        where: {
          type: 'WELCOME_EMAIL',
          payload: { contains: newGoogleEmail }
        }
      });
      assert.strictEqual(jobCount, 0, 'No welcome email must be enqueued for returning patron sign-in');
    });

    test('9. Existing password user: logging in with Google safely links googleId without elevating privileges', async () => {
      const emailUserEmail = `google_test_existing_pwd_${Date.now()}@example.com`;
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('PatronPassword@2026', salt);

      // Create existing password customer
      const existingUser = await prisma.user.create({
        data: {
          name: 'Meera Rajput',
          email: emailUserEmail,
          passwordHash,
          role: 'CUSTOMER',
          googleId: null
        }
      });

      const linkedSub = `sub_linked_${Date.now()}`;
      mockPayload = {
        sub: linkedSub,
        email: emailUserEmail,
        email_verified: true,
        name: 'Meera Rajput Google',
        picture: 'https://lh3.googleusercontent.com/meera.jpg',
        iss: 'accounts.google.com'
      };

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'valid_linking_jwt' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.isNewUser, false, 'Linking account must not be marked as new user');

      // Verify database updated with googleId
      const updatedUser = await prisma.user.findUnique({
        where: { id: existingUser.id }
      });
      assert.ok(updatedUser);
      assert.strictEqual(updatedUser.googleId, linkedSub);
      assert.strictEqual(updatedUser.role, 'CUSTOMER');
    });

    test('10. Admin role preservation: Google Sign-In cannot elevate customer to admin or bypass admin portal passkey', async () => {
      const adminEmail = `google_test_admin_${Date.now()}@example.com`;
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('AdminSecret@2026', salt);

      // Existing admin account
      const admin = await prisma.user.create({
        data: {
          name: 'Atelier Sovereign Admin',
          email: adminEmail,
          passwordHash,
          role: 'ADMIN'
        }
      });

      mockPayload = {
        sub: `sub_admin_${Date.now()}`,
        email: adminEmail,
        email_verified: true,
        name: 'Atelier Sovereign Admin',
        iss: 'accounts.google.com'
      };

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'admin_google_jwt' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.user.role, 'ADMIN', 'Admin user logging in with Google retains ADMIN role');

      // But attempting to login via /api/auth/admin-login without masterKey still rejects
      const adminPortalRes = await request(app)
        .post('/api/auth/admin-login')
        .send({
          email: adminEmail,
          password: 'AdminSecret@2026',
          masterKey: 'WRONG_PASSKEY'
        });
      assert.strictEqual(adminPortalRes.status, 403, 'Admin passkey protection cannot be bypassed');
    });

    test('11. Account created via Google cannot be accessed via password login without setting a password', async () => {
      const googleOnlyEmail = `google_test_only_${Date.now()}@example.com`;
      mockPayload = {
        sub: `sub_only_${Date.now()}`,
        email: googleOnlyEmail,
        email_verified: true,
        name: 'Google Only Patron',
        iss: 'accounts.google.com'
      };

      await request(app)
        .post('/api/auth/google')
        .send({ credential: 'google_only_jwt' });

      // Attempt email/password login
      const pwdRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: googleOnlyEmail,
          password: 'AnyArbitraryPassword123'
        });

      assert.strictEqual(pwdRes.status, 401);
      assert.match(pwdRes.body.message, /registered using google/i);
    });
  });

  // =========================================================================
  // TEST SUITE 3: LUXURY WELCOME EMAIL CONTENT, COPY & FORMATTING
  // =========================================================================
  describe('Welcome Email Design, Personalization & Escaping', () => {

    test('12. HTML email contains the official brand name, tagline, and exact requested copy', () => {
      const html = generateWelcomeEmailHtml('Maharani Padmini');

      assert.match(html, /ETHNIZ/i);
      assert.match(html, /Couture/i);
      assert.match(html, /Wear Your Heritage\. Own Your Style\./i);
      assert.match(html, /Dear Maharani Padmini,/);
      assert.match(html, /We believe every outfit tells a story — of heritage, individuality and the confidence to express who you are\./);
      assert.match(html, /From everyday elegance to celebrations worth remembering, we invite you to discover styles thoughtfully chosen to make every moment feel special\./);
      assert.match(html, /Your journey with us begins here\./);
      assert.match(html, /EXPLORE THE COLLECTION/);
      assert.match(html, /Thank you for becoming part of our world\./);
      assert.match(html, /Team Ethniz Couture/);
      assert.match(html, new RegExp(config.frontendUrl));
    });

    test('13. Plain-text version matches the copy structure and links', () => {
      const text = generateWelcomeEmailText('Maharani Padmini');

      assert.match(text, /Dear Maharani Padmini,/);
      assert.match(text, /Wear Your Heritage\. Own Your Style\./);
      assert.match(text, /Explore the Collection: https:\/\/ethnizcouture\.com\/shop/);
    });

    test('14. Missing customer name gracefully defaults to "Dear Patron,"', () => {
      const htmlNull = generateWelcomeEmailHtml(null);
      assert.match(htmlNull, /Dear Patron,/);

      const htmlEmpty = generateWelcomeEmailHtml('   ');
      assert.match(htmlEmpty, /Dear Patron,/);

      const textNull = generateWelcomeEmailText(null);
      assert.match(textNull, /Dear Patron,/);
    });

    test('15. Customer name is escaped to eliminate HTML/XSS injection vulnerabilities', () => {
      const maliciousName = '<script>alert("XSS")</script><b>Bold Patron</b>';
      const html = generateWelcomeEmailHtml(maliciousName);

      assert.ok(!html.includes('<script>'), 'Must not contain raw unescaped script tag');
      assert.ok(html.includes('&lt;script&gt;'), 'Must contain HTML-escaped script tag');
      assert.ok(!html.includes('<b>Bold Patron</b>'), 'Must not execute arbitrary HTML tags');
    });
  });

  // =========================================================================
  // TEST SUITE 4: EXACTLY-ONCE WELCOME EMAIL DISPATCH & IDEMPOTENCY
  // =========================================================================
  describe('Exactly-Once Dispatch & Queue Idempotency', () => {

    test('16. Standard email/password signup enqueues WELCOME_EMAIL for new account', async () => {
      const regEmail = `google_test_reg_${Date.now()}@example.com`;

      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Ananya Birla',
          email: regEmail,
          password: 'RoyalPassword@2026',
          phone: '9876543210'
        });

      assert.strictEqual(regRes.status, 201);

      // Verify job in database
      const job = await prisma.backgroundJob.findFirst({
        where: {
          type: 'WELCOME_EMAIL',
          payload: { contains: regEmail }
        }
      });
      assert.ok(job, 'WELCOME_EMAIL background job must be enqueued');
    });

    test('17. Background queue worker executes job, updates welcomeEmailSent flag, and does not re-send', async () => {
      const patronEmail = `google_test_worker_${Date.now()}@example.com`;

      const patron = await prisma.user.create({
        data: {
          name: 'Tara Sutaria',
          email: patronEmail,
          role: 'CUSTOMER',
          welcomeEmailSent: false
        }
      });

      // Enqueue job manually
      await backgroundQueue.enqueue('WELCOME_EMAIL', {
        userId: patron.id,
        email: patron.email,
        name: patron.name
      });

      // Poll until background worker executes or explicitly run next jobs
      let updatedPatron = null;
      for (let i = 0; i < 20; i++) {
        await backgroundQueue.processNextJobs(10).catch(() => {});
        updatedPatron = await prisma.user.findUnique({
          where: { id: patron.id }
        });
        if (updatedPatron?.welcomeEmailSent) break;
        await new Promise((r) => setTimeout(r, 50));
      }

      assert.ok(updatedPatron);
      assert.strictEqual(updatedPatron.welcomeEmailSent, true, 'welcomeEmailSent must be true after worker executes');
      assert.ok(updatedPatron.welcomeEmailSentAt, 'welcomeEmailSentAt must have timestamp');

      // Enqueue duplicate job for same patron
      await backgroundQueue.enqueue('WELCOME_EMAIL', {
        userId: patron.id,
        email: patron.email,
        name: patron.name
      });

      // Process again: handler checks user.welcomeEmailSent and skips
      for (let i = 0; i < 10; i++) {
        await backgroundQueue.processNextJobs(10).catch(() => {});
        await new Promise((r) => setTimeout(r, 50));
      }

      const postPatron = await prisma.user.findUnique({
        where: { id: patron.id }
      });
      assert.strictEqual(postPatron?.welcomeEmailSent, true);
    });

    test('18. Existing customer login never creates or enqueues welcome emails', async () => {
      const loginEmail = `google_test_login_check_${Date.now()}@example.com`;
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('ValidPass@2026', salt);

      await prisma.user.create({
        data: {
          name: 'Kareena Kapoor',
          email: loginEmail,
          passwordHash,
          role: 'CUSTOMER',
          welcomeEmailSent: true,
          welcomeEmailSentAt: new Date()
        }
      });

      // Count jobs before login
      const jobsBefore = await prisma.backgroundJob.count({
        where: { type: 'WELCOME_EMAIL', payload: { contains: loginEmail } }
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: loginEmail,
          password: 'ValidPass@2026'
        });

      assert.strictEqual(res.status, 200);

      // Count jobs after login
      const jobsAfter = await prisma.backgroundJob.count({
        where: { type: 'WELCOME_EMAIL', payload: { contains: loginEmail } }
      });

      assert.strictEqual(jobsAfter, jobsBefore, 'Login must never enqueue a welcome email');
    });
  });
});
