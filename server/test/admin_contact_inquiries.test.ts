process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server';
import prisma from '../src/prisma';
import { config } from '../src/config';
import { backgroundQueue } from '../src/services/backgroundQueue';

describe('Admin Contact Inquiries Inbox & Concierge Resolution Tests', () => {
  let adminToken: string;
  let customerToken: string;
  let testInquiryIds: string[] = [];

  before(async () => {
    // 1. Ensure test admin user exists
    let adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          name: 'Master Atelier Admin',
          email: `admin.inquiries.${Date.now()}@ethnizcouture.com`,
          passwordHash: 'dummy_hash',
          role: 'ADMIN'
        }
      });
    }

    // 2. Ensure test customer user exists
    let customerUser = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
    if (!customerUser) {
      customerUser = await prisma.user.create({
        data: {
          name: 'Ananya Birla',
          email: `ananya.${Date.now()}@example.com`,
          passwordHash: 'dummy_hash',
          role: 'CUSTOMER'
        }
      });
    }

    adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: 'ADMIN', name: adminUser.name },
      config.jwtSecret,
      { expiresIn: '2h' }
    );

    customerToken = jwt.sign(
      { id: customerUser.id, email: customerUser.email, role: 'CUSTOMER', name: customerUser.name },
      config.jwtSecret,
      { expiresIn: '2h' }
    );
  });

  after(async () => {
    try {
      if (testInquiryIds.length > 0) {
        await prisma.contactMessage.deleteMany({
          where: { id: { in: testInquiryIds } }
        });
      }
    } catch {
      // ignore
    }
    backgroundQueue.stop();
  });

  test('1. Patron submits public contact message at /api/content/contact', async () => {
    const res = await request(app)
      .post('/api/content/contact')
      .send({
        name: 'Tara Sutaria',
        email: `tara.${Date.now()}@example.com`,
        phone: '+91 98200 99887',
        subject: 'Bespoke Lehenga Sizing & Wedding Timeline',
        message: 'Hello, I am getting married in December and need custom blouse measurements for the Royal Crimson Katan Silk ensemble.'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.contact.name, 'Tara Sutaria');
    assert.strictEqual(res.body.contact.status, 'UNREAD');
    testInquiryIds.push(res.body.contact.id);
  });

  test('2. Admin Inquiries API: Unauthorized and customer tokens are strictly rejected', async () => {
    // Unauthenticated
    const unauthRes = await request(app).get('/api/admin/inquiries');
    assert.strictEqual(unauthRes.status, 401);

    // Customer role (non-admin)
    const customerRes = await request(app)
      .get('/api/admin/inquiries')
      .set('Authorization', `Bearer ${customerToken}`);
    assert.strictEqual(customerRes.status, 403);
  });

  test('3. Admin Inquiries API: Retrieves list with status filters and unread count stats', async () => {
    const res = await request(app)
      .get('/api/admin/inquiries')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.inquiries));
    assert.ok(res.body.total >= 1);
    assert.ok(res.body.stats);
    assert.ok(typeof res.body.stats.unread === 'number');

    // Stats endpoint
    const statsRes = await request(app)
      .get('/api/admin/inquiries/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(statsRes.status, 200);
    assert.ok(typeof statsRes.body.unread === 'number');
  });

  test('4. Admin Inquiries API: Search matches subject, message keywords, and patron details', async () => {
    const res = await request(app)
      .get('/api/admin/inquiries')
      .query({ search: 'Crimson Katan' })
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.inquiries.length >= 1);
    assert.strictEqual(res.body.inquiries[0].id, testInquiryIds[0]);
  });

  test('5. Admin updates status to READ', async () => {
    const inquiryId = testInquiryIds[0];
    const res = await request(app)
      .put(`/api/admin/inquiries/${inquiryId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'READ' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.inquiry.status, 'READ');

    const dbRecord = await prisma.contactMessage.findUnique({ where: { id: inquiryId } });
    assert.strictEqual(dbRecord?.status, 'READ');
  });

  test('6. Admin dispatches official atelier reply email and marks inquiry as RESOLVED', async () => {
    const inquiryId = testInquiryIds[0];
    const res = await request(app)
      .post(`/api/admin/inquiries/${inquiryId}/reply`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        replyMessage: 'Dear Ms. Sutaria, congratulations on your upcoming wedding! Our master karigars can custom-stitch the blouse to your exact measurements with delivery guaranteed by November 20th.',
        senderName: 'Atelier Head Stylist Kavita',
        markAsResolved: true
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.inquiry.status, 'RESOLVED');

    const dbRecord = await prisma.contactMessage.findUnique({ where: { id: inquiryId } });
    assert.strictEqual(dbRecord?.status, 'RESOLVED');

    // Verify audit log was recorded
    const auditLog = await prisma.auditLog.findFirst({
      where: { entityId: inquiryId, action: 'INQUIRY_REPLIED' }
    });
    assert.ok(auditLog);
  });

  test('7. Admin exports newsletter subscribers as CSV', async () => {
    // Ensure at least one active subscriber exists
    await prisma.newsletterSubscriber.upsert({
      where: { email: 'patron.vip@ethnizcouture.com' },
      update: { isActive: true },
      create: { email: 'patron.vip@ethnizcouture.com', isActive: true }
    });

    const res = await request(app)
      .get('/api/admin/newsletter/export')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/csv'));
    assert.ok(res.text.includes('Email,Status,SubscribedAt'));
    assert.ok(res.text.includes('patron.vip@ethnizcouture.com'));
  });

  test('8. Admin deletes inquiry permanently', async () => {
    const inquiryId = testInquiryIds[0];
    const res = await request(app)
      .delete(`/api/admin/inquiries/${inquiryId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);

    const deleted = await prisma.contactMessage.findUnique({ where: { id: inquiryId } });
    assert.strictEqual(deleted, null);

    // Remove from cleanup array since already deleted
    testInquiryIds = testInquiryIds.filter((id) => id !== inquiryId);
  });
});
