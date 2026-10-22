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
import {
  validatePincode,
  checkPincodeServiceability,
  validateStreet,
  validateCity,
  validateState
} from '../src/utils/validation';

describe('Phase 2D: GPS Delivery Address Picker & Location Security Tests', () => {
  let customerUser: any;
  let customerToken: string;
  let testProduct: any;

  before(async () => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Customer@123456', salt);

    // Create test customer
    customerUser = await prisma.user.upsert({
      where: { email: 'phase2d.customer@ethnizcouture.com' },
      update: { role: 'CUSTOMER' },
      create: {
        name: 'Aarohi Sen',
        email: 'phase2d.customer@ethnizcouture.com',
        passwordHash,
        role: 'CUSTOMER',
        phone: '+919820012345'
      }
    });

    customerToken = jwt.sign(
      { id: customerUser.id, email: customerUser.email, role: 'CUSTOMER', name: customerUser.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // Find an active product with stock >= 5
    testProduct = await prisma.product.findFirst({
      where: { stock: { gte: 5 } }
    });

    assert.ok(testProduct, 'Test product must exist in test database');
  });

  after(async () => {
    if (customerUser) {
      await prisma.order.deleteMany({ where: { userId: customerUser.id } });
      await prisma.address.deleteMany({ where: { userId: customerUser.id } });
      await prisma.user.deleteMany({ where: { email: customerUser.email } });
    }
    await backgroundQueue.stop();
  });

  // --- 1. Indian PIN-Code Validation & Serviceability Tests ---

  test('1.1: PIN validation accepts valid 6-digit Indian postal codes', () => {
    const validCodes = ['400050', '110001', '560038', '700016', '600017', '302001'];
    for (const pin of validCodes) {
      const res = validatePincode(pin);
      assert.strictEqual(res.isValid, true, `Pincode ${pin} should be valid`);
    }
  });

  test('1.2: PIN validation rejects empty or whitespace input', () => {
    const emptyRes = validatePincode('');
    assert.strictEqual(emptyRes.isValid, false);
    assert.ok(emptyRes.message.includes('required'));

    const nullRes = validatePincode(null as any);
    assert.strictEqual(nullRes.isValid, false);
  });

  test('1.3: PIN validation rejects codes starting with 0', () => {
    const zeroPin = validatePincode('012345');
    assert.strictEqual(zeroPin.isValid, false);
    assert.ok(zeroPin.message.includes('cannot begin with 0'));
  });

  test('1.4: PIN validation rejects non-6-digit length (5 or 7 digits)', () => {
    assert.strictEqual(validatePincode('40005').isValid, false, '5-digit PIN must fail');
    assert.strictEqual(validatePincode('4000501').isValid, false, '7-digit PIN must fail');
  });

  test('1.5: PIN validation rejects alphanumeric strings and special characters', () => {
    assert.strictEqual(validatePincode('40005A').isValid, false);
    assert.strictEqual(validatePincode('400-05').isValid, false);
    assert.strictEqual(validatePincode('ABCDEF').isValid, false);
  });

  test('1.6: checkPincodeServiceability accurately reports postal circle status without fabricating courier promises', () => {
    const res = checkPincodeServiceability('400050');
    assert.strictEqual(res.isValidFormat, true);
    assert.strictEqual(res.isServiceable, true);
    assert.strictEqual(res.source, 'CONFIGURED_SOURCE');

    const invalidRes = checkPincodeServiceability('999');
    assert.strictEqual(invalidRes.isValidFormat, false);
    assert.strictEqual(invalidRes.isServiceable, false);
    assert.strictEqual(invalidRes.source, 'SYNTAX_RULE');
  });

  // --- 2. Order Creation with GPS Delivery Metadata ---

  test('2.1: Order creation with GPS latitude and longitude succeeds and stores coordinates in order notes', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        customerName: 'Aarohi Sen',
        customerEmail: 'phase2d.customer@ethnizcouture.com',
        customerPhone: '+919820012345',
        shippingStreet: 'Linking Road, Bandra West',
        shippingApartment: 'Flat 4B, Imperial Towers',
        shippingCity: 'Mumbai',
        shippingState: 'Maharashtra',
        shippingPincode: '400050',
        shippingCountry: 'India',
        latitude: 19.0596,
        longitude: 72.8295,
        items: [
          {
            productId: testProduct.id,
            quantity: 1
          }
        ],
        paymentMethod: 'STRIPE'
      });

    assert.strictEqual(res.status, 201, `Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.order);
    assert.strictEqual(res.body.order.shippingPincode, '400050');
    assert.strictEqual(res.body.order.shippingCity, 'Mumbai');

    // Verify notes contain high-precision GPS coordinates tag
    assert.ok(res.body.order.notes, 'Order notes must be populated');
    assert.ok(res.body.order.notes.includes('GPS: 19.05960, 72.82950'), 'Notes must preserve GPS coordinate metadata');
  });

  test('2.2: Order creation without GPS metadata preserves manual address entry seamlessly', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        customerName: 'Aarohi Sen',
        customerEmail: 'phase2d.customer@ethnizcouture.com',
        customerPhone: '+919820012345',
        shippingStreet: 'Connaught Place Outer Circle',
        shippingCity: 'New Delhi',
        shippingState: 'Delhi',
        shippingPincode: '110001',
        shippingCountry: 'India',
        items: [
          {
            productId: testProduct.id,
            quantity: 1
          }
        ],
        paymentMethod: 'STRIPE'
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.order);
    assert.strictEqual(res.body.order.shippingCity, 'New Delhi');
    assert.strictEqual(res.body.order.shippingPincode, '110001');
  });

  test('2.3: Order creation rejects invalid Indian PIN code with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        customerName: 'Aarohi Sen',
        customerEmail: 'phase2d.customer@ethnizcouture.com',
        customerPhone: '+919820012345',
        shippingStreet: 'Linking Road, Bandra West',
        shippingCity: 'Mumbai',
        shippingState: 'Maharashtra',
        shippingPincode: '40005', // 5 digits only
        shippingCountry: 'India',
        items: [
          {
            productId: testProduct.id,
            quantity: 1
          }
        ],
        paymentMethod: 'STRIPE'
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.field, 'shippingPincode');
    assert.ok(res.body.message.includes('PIN code'));
  });

  // --- 3. User Address Management & Authorization ---

  test('3.1: Authenticated customer can save a delivery address', async () => {
    const res = await request(app)
      .post('/api/users/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        fullName: 'Aarohi Sen',
        phone: '+919820012345',
        street: '100 Feet Road, Indiranagar',
        apartment: 'Suite 201',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
        country: 'India',
        isDefault: true
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.address);
    assert.strictEqual(res.body.address.pincode, '560038');
    assert.strictEqual(res.body.address.userId, customerUser.id);
  });

  test('3.2: Unauthenticated address fetch returns 401 Unauthorized', async () => {
    const res = await request(app).get('/api/users/addresses');
    assert.strictEqual(res.status, 401);
  });

  test('3.3: Authenticated customer only receives their own saved addresses', async () => {
    const res = await request(app)
      .get('/api/users/addresses')
      .set('Authorization', `Bearer ${customerToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.addresses));
    for (const addr of res.body.addresses) {
      assert.strictEqual(addr.userId, customerUser.id);
    }
  });

  // --- 4. Location Proxy Endpoints ---

  test('4.1: GET /api/location/reverse-geocode returns authentic street and area details', async () => {
    const res = await request(app)
      .get('/api/location/reverse-geocode')
      .query({ lat: 28.6139, lng: 77.2090 });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.street);
    assert.strictEqual(res.body.city, 'New Delhi');
    assert.strictEqual(res.body.pincode, '110004');
  });

  test('4.2: GET /api/location/search returns structured Indian landmark suggestions', async () => {
    const res = await request(app)
      .get('/api/location/search')
      .query({ q: 'Indiranagar' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.results));
  });
});

