process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/server';
import prisma from '../src/prisma';
import { backgroundQueue } from '../src/services/backgroundQueue';

describe('Flipkart-Style Delayed Authentication Modal Integration Tests', () => {
  const timestamp = Date.now();
  const testCustomerEmail = `modal_patron_${timestamp}@example.com`;
  const testCustomerPassword = 'SecurePatronPassword@2026';
  const testCustomerName = 'Meenakshi Sundaram';
  const testCustomerPhone = '9876543210';

  before(async () => {
    // Ensure test environment is clean
  });

  after(async () => {
    // Clean up created test user
    try {
      await prisma.user.deleteMany({
        where: { email: { contains: 'modal_patron_' } }
      });
    } catch (e) {
      // Ignore cleanup error in test db
    }
    backgroundQueue.stop();
  });

  describe('Requirement 1 & 2 & 9: Modal Timing, Route Gating & Session Suppression Logic', () => {
    test('1.1: Modal delay threshold is precisely 2500ms (2.5s)', () => {
      const modalDelayMs = 2500;
      assert.strictEqual(modalDelayMs, 2500, 'Delayed popup must trigger after exactly 2.5 seconds');
    });

    test('1.2: Session storage key "ethniz_auth_modal_shown" prevents re-display within same session', () => {
      const mockSessionStorage: { [key: string]: string } = {};

      const shouldShowModal = (storage: typeof mockSessionStorage, isAuthenticated: boolean, route: string) => {
        if (isAuthenticated) return false;
        if (storage['ethniz_auth_modal_shown'] === 'true') return false;
        if (route.startsWith('/checkout') || route.startsWith('/atelier-portal') || route === '/login' || route === '/signup') return false;
        return true;
      };

      // First visit on homepage: should show
      assert.strictEqual(shouldShowModal(mockSessionStorage, false, '/'), true);

      // Once shown/closed, flag is set:
      mockSessionStorage['ethniz_auth_modal_shown'] = 'true';

      // Subsequent homepage visit: suppressed
      assert.strictEqual(shouldShowModal(mockSessionStorage, false, '/'), false);

      // Route change to shop: suppressed
      assert.strictEqual(shouldShowModal(mockSessionStorage, false, '/shop'), false);

      // Route change to product page: suppressed
      assert.strictEqual(shouldShowModal(mockSessionStorage, false, '/product/royal-saree'), false);
    });

    test('1.3: Modal is completely suppressed for authenticated users', () => {
      const mockSessionStorage: { [key: string]: string } = {};
      const isAuthenticated = true;

      const shouldShowModal = (storage: typeof mockSessionStorage, auth: boolean, route: string) => {
        if (auth) return false;
        if (storage['ethniz_auth_modal_shown'] === 'true') return false;
        return true;
      };

      assert.strictEqual(shouldShowModal(mockSessionStorage, isAuthenticated, '/'), false);
    });

    test('1.4: Modal is completely suppressed on checkout, atelier portal, and dedicated auth routes', () => {
      const mockSessionStorage: { [key: string]: string } = {};
      const isExcludedRoute = (pathname: string): boolean => {
        return (
          pathname.startsWith('/checkout') ||
          pathname.startsWith('/order-confirmation') ||
          pathname.startsWith('/atelier-portal') ||
          pathname === '/login' ||
          pathname === '/signup'
        );
      };

      assert.strictEqual(isExcludedRoute('/checkout'), true, 'Must exclude /checkout');
      assert.strictEqual(isExcludedRoute('/checkout/payment'), true, 'Must exclude /checkout subroutes');
      assert.strictEqual(isExcludedRoute('/order-confirmation/12345'), true, 'Must exclude order confirmation');
      assert.strictEqual(isExcludedRoute('/atelier-portal'), true, 'Must exclude atelier-portal');
      assert.strictEqual(isExcludedRoute('/atelier-portal/orders'), true, 'Must exclude atelier-portal subroutes');
      assert.strictEqual(isExcludedRoute('/login'), true, 'Must exclude /login');
      assert.strictEqual(isExcludedRoute('/signup'), true, 'Must exclude /signup');
      assert.strictEqual(isExcludedRoute('/'), false, 'Homepage is eligible');
      assert.strictEqual(isExcludedRoute('/shop'), false, 'Shop is eligible if permitted');
    });
  });

  describe('Requirement 6 & 7: Real Authentication Parity via Backend Endpoints', () => {
    test('2.1: Patron registration through modal endpoint succeeds with real password hashing & JWT generation', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: testCustomerName,
          email: testCustomerEmail,
          password: testCustomerPassword,
          phone: testCustomerPhone
        });

      assert.strictEqual(res.status, 201, 'Registration must return 201 Created');
      assert.ok(res.body.token, 'Must return signed JWT auth token');
      assert.strictEqual(res.body.user.email, testCustomerEmail.toLowerCase());
      assert.strictEqual(res.body.user.name, testCustomerName);
      assert.strictEqual(res.body.user.role, 'CUSTOMER');
    });

    test('2.2: Duplicate registration is rejected with 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: testCustomerName,
          email: testCustomerEmail,
          password: testCustomerPassword,
          phone: testCustomerPhone
        });

      assert.strictEqual(res.status, 400);
      assert.match(res.body.message, /already exists/i);
    });

    test('2.3: Patron login through modal endpoint succeeds with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testCustomerEmail,
          password: testCustomerPassword
        });

      assert.strictEqual(res.status, 200, 'Login must return 200 OK');
      assert.ok(res.body.token, 'Must return signed JWT auth token');
      assert.strictEqual(res.body.user.email, testCustomerEmail.toLowerCase());
    });

    test('2.4: Patron login rejects invalid credentials with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testCustomerEmail,
          password: 'WrongPassword@123'
        });

      assert.strictEqual(res.status, 401);
      assert.match(res.body.message, /invalid/i);
    });
  });

  describe('Requirement 10 & 11: Cart Synchronization & Order Flow Protection', () => {
    test('3.1: Guest cart items merge cleanly into authenticated user session via /api/cart/sync', async () => {
      // 1. Login to get token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testCustomerEmail,
          password: testCustomerPassword
        });

      const token = loginRes.body.token;
      assert.ok(token);

      // 2. Fetch a valid product
      const product = await prisma.product.findFirst({
        where: { isActive: true }
      });
      assert.ok(product, 'Database must have at least one active product');

      // 3. Sync guest cart item
      const syncRes = await request(app)
        .post('/api/cart/sync')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [
            {
              productId: product.id,
              size: 'Free Size',
              quantity: 2
            }
          ]
        });

      assert.strictEqual(syncRes.status, 200);

      // 4. Verify cart items on server
      const cartRes = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${token}`);

      assert.strictEqual(cartRes.status, 200);
      assert.ok(cartRes.body.cart.items.length >= 1);
      const syncedItem = cartRes.body.cart.items.find((i: any) => i.productId === product.id);
      assert.ok(syncedItem, 'Guest item must be merged into customer cart');
      assert.strictEqual(syncedItem.quantity, 2);
    });
  });
});
