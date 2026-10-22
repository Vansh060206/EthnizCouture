process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/server';
import prisma from '../src/prisma';
import { backgroundQueue } from '../src/services/backgroundQueue';
import { validateGstin, validateStreet, validateCity } from '../src/utils/validation';

describe('Checkout Distinct Billing Address & Business GSTIN Invoicing Contract Tests', () => {
  let activeProduct: any;
  let testCustomer: any;

  before(async () => {
    // 1. Fetch or create active product for order placement
    activeProduct = await prisma.product.findFirst({
      where: { isActive: true, stock: { gt: 10 } }
    });

    if (!activeProduct) {
      activeProduct = await prisma.product.create({
        data: {
          name: 'Handcrafted Zardozi Sherwani',
          slug: `zardozi-sherwani-${Date.now()}`,
          sku: `SKU-SHER-${Date.now()}`,
          description: 'Heritage royal embroidery wedding sherwani',
          price: 65000,
          stock: 20,
          isActive: true
        }
      });
    }

    testCustomer = {
      name: 'Aditya Birla Corporate Concierge',
      email: `aditya.birla.${Date.now()}@example.com`,
      phone: '9820011223'
    };
  });

  after(async () => {
    try {
      await prisma.order.deleteMany({
        where: { customerEmail: { contains: 'aditya.birla.' } }
      });
    } catch {
      // ignore cleanup errors
    }
    backgroundQueue.stop();
  });

  describe('1. Validation Unit Verification', () => {
    test('1.1: validateGstin accepts valid 15-character Indian GSTINs', () => {
      const validGstin = '27AAAAA0000A1Z5';
      const result = validateGstin(validGstin);
      assert.strictEqual(result.isValid, true);
    });

    test('1.2: validateGstin rejects malformed or invalid checksum GSTINs', () => {
      const invalidShort = '27AAAAA0000A1Z';
      const resShort = validateGstin(invalidShort);
      assert.strictEqual(resShort.isValid, false);
      assert.match(resShort.message || '', /exactly 15 characters/i);

      const invalidChars = '27AAAAA0000A1!5';
      const resChars = validateGstin(invalidChars);
      assert.strictEqual(resChars.isValid, false);
      assert.match(resChars.message || '', /valid Indian GSTIN/i);
    });

    test('1.3: validateStreet and validateCity accept optional fieldName labels', () => {
      const resStreet = validateStreet('12', 'Billing Street');
      assert.strictEqual(resStreet.isValid, false);
      assert.match(resStreet.message || '', /Billing Street must be at least 6 characters/i);

      const resCity = validateCity('123', 'Billing City');
      assert.strictEqual(resCity.isValid, false);
      assert.match(resCity.message || '', /Billing City must contain letters and spaces only/i);
    });
  });

  describe('2. Order API Validation Rejections', () => {
    test('2.1: Rejects checkout when separate billing address has short street or invalid city', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          customerName: testCustomer.name,
          customerEmail: testCustomer.email,
          customerPhone: testCustomer.phone,
          shippingStreet: '12 Marine Drive, Nariman Point',
          shippingCity: 'Mumbai',
          shippingState: 'Maharashtra',
          shippingPincode: '400021',
          shippingCountry: 'India',
          paymentMethod: 'COD',
          billingAddress: {
            street: 'No. 4', // too short (< 6 chars)
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400021'
          },
          items: [
            {
              productId: activeProduct.id,
              quantity: 1
            }
          ]
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.field, 'billingStreet');
      assert.match(res.body.message, /Billing Street Address must be at least 6 characters/i);
    });

    test('2.2: Rejects checkout when invalid GSTIN is provided', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          customerName: testCustomer.name,
          customerEmail: testCustomer.email,
          customerPhone: testCustomer.phone,
          shippingStreet: '12 Marine Drive, Nariman Point',
          shippingCity: 'Mumbai',
          shippingState: 'Maharashtra',
          shippingPincode: '400021',
          shippingCountry: 'India',
          paymentMethod: 'COD',
          gstin: 'INVALID_GSTIN_1',
          businessName: 'Birla Haute Apparels Ltd',
          items: [
            {
              productId: activeProduct.id,
              quantity: 1
            }
          ]
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.field, 'gstin');
      assert.match(res.body.message, /valid Indian GSTIN/i);
    });
  });

  describe('3. Successful Order Placement with Distinct Billing & GSTIN', () => {
    test('3.1: Successfully creates order with separate billing address and valid GSTIN', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          customerName: testCustomer.name,
          customerEmail: testCustomer.email,
          customerPhone: testCustomer.phone,
          shippingStreet: 'Plot 42, Bandra Kurla Complex',
          shippingApartment: 'Tower B, 14th Floor',
          shippingCity: 'Mumbai',
          shippingState: 'Maharashtra',
          shippingPincode: '400051',
          shippingCountry: 'India',
          paymentMethod: 'COD',
          billingAddress: {
            street: 'Century Bhavan, Dr. Annie Besant Road',
            apartment: 'Executive Suite 501',
            city: 'Worli',
            state: 'Maharashtra',
            pincode: '400030',
            country: 'India'
          },
          gstin: '27AAAAA0000A1Z5',
          businessName: 'Birla Couture Enterprise LLP',
          items: [
            {
              productId: activeProduct.id,
              quantity: 1
            }
          ]
        });

      assert.strictEqual(res.status, 201);
      assert.ok(res.body.order);
      assert.ok(res.body.order.orderNumber);

      const notes = res.body.order.notes || '';
      assert.ok(notes.includes('[Billing Address: Century Bhavan, Dr. Annie Besant Road, Executive Suite 501, Worli, Maharashtra - 400030, India]'));
      assert.ok(notes.includes('[GSTIN: 27AAAAA0000A1Z5 | Entity: Birla Couture Enterprise LLP]'));
      assert.ok(notes.includes('[Payment Method: Cash on Delivery]'));
    });

    test('3.2: Successfully creates order with valid GSTIN and default shipping billing', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          customerName: testCustomer.name,
          customerEmail: testCustomer.email,
          customerPhone: testCustomer.phone,
          shippingStreet: '88 MG Road, Near Brigade Junction',
          shippingCity: 'Bangalore',
          shippingState: 'Karnataka',
          shippingPincode: '560001',
          shippingCountry: 'India',
          paymentMethod: 'COD',
          gstin: '29ABCDE1234F1Z5',
          businessName: 'Karnataka Textiles Ltd',
          items: [
            {
              productId: activeProduct.id,
              quantity: 1
            }
          ]
        });

      assert.strictEqual(res.status, 201);
      assert.ok(res.body.order);

      const notes = res.body.order.notes || '';
      assert.ok(notes.includes('[GSTIN: 29ABCDE1234F1Z5 | Entity: Karnataka Textiles Ltd]'));
      assert.strictEqual(notes.includes('[Billing Address:'), false);
    });
  });
});
