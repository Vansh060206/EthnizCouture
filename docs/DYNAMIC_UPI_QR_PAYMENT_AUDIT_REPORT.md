# Ethniz Couture — Phase 1 & 2: Dynamic UPI QR Payment Integration Audit & Provider Evaluation

**Document Date:** October 18, 2026  
**Implementation Lead:** Principal Payment Architect & Senior Full-Stack Engineer  
**Status:** **PHASE 1 AUDIT & PHASE 2 EVALUATION COMPLETE**  
**Theme:** Royal Burgundy (`#3E1A1E`), Champagne Gold (`#C6A15D`), Warm Ivory (`#FAF7F2`)  

---

## 1. Executive Summary

This report establishes the architectural baseline and technical feasibility for introducing a production-minded **Dynamic UPI QR Payment Experience** on Ethniz Couture. 

Currently, Ethniz Couture supports Credit/Debit Cards via Stripe and Cash on Delivery (COD). While the checkout UI displays a "UPI / GPay" option, selecting it previously fell through to the credit card form. 

This initiative will introduce:
1. An authentic **Dynamic UPI QR Code** generated per order with the exact order amount locked in.
2. Compatibility with all major Indian UPI applications: **Google Pay, PhonePe, Paytm, BHIM, CRED, and banking UPI apps**.
3. A mobile-friendly intent fallback (*"Open in UPI App"* deep link: `upi://pay?...`).
4. Dual verification: Authoritative server-to-server webhooks paired with client polling (`/api/payments/status/:orderId`).
5. Seamless activation of the signature burgundy-and-champagne-gold order-success animation **strictly upon authoritative payment confirmation**.

---

## 2. Phase 1 — Comprehensive Audit of the Existing Payment Architecture

### 2.1 Checkout & Payment Selection ([`CheckoutPage.tsx`](file:///d:/ethnicotuire/client/src/pages/CheckoutPage.tsx))
- **Current Flow:** Multi-step stepper (`Address` -> `Delivery` -> `Payment`).
- **Payment Method Selector:** Radios for `CARD`, `UPI`, `NETBANKING`, and `COD`.
- **Existing Handling:**
  - `COD`: Order is created with `paymentMethod: 'COD'`, `orderStatus: 'CONFIRMED'`, `paymentStatus: 'PENDING'`. Cart is cleared, and patron is redirected immediately to `/order-confirmation/:orderNumber`.
  - `CARD`: Validates card details client-side, creates order via `POST /api/orders`, calls `POST /api/payments/create-intent`, then calls `POST /api/payments/verify`.
  - `UPI`: Currently renders the card form container; lacks dedicated QR rendering, expiration timer, deep link triggers, and polling.
- **Reusability:** The stepper, order creation logic, idempotency key generation, and total calculations can be 100% reused.

### 2.2 Payment Controller Endpoints ([`paymentController.ts`](file:///d:/ethnicotuire/server/src/controllers/paymentController.ts))
- **`POST /api/payments/create-intent`:**
  - Accepts `orderId`.
  - Authoritatively fetches the order total from the database (`order.totalAmount`), converts to paise (`Math.round(totalAmount * 100)`), and enforces `currency: 'inr'`.
  - Stores `paymentIntentId` on the `Order` record.
  - Supports simulated fallback (`pi_mock_...`) when running in local development or test mode.
- **`POST /api/payments/verify`:**
  - Validates order existence and enforces idempotency: if `order.paymentStatus === 'PAID'`, returns success immediately.
  - Verifies payment status against gateway.
  - Atomic update: marks order `paymentStatus: 'PAID'`, `orderStatus: 'CONFIRMED'`, records audit history, and enqueues asynchronous `ORDER_CONFIRMATION` background email job.
- **`POST /api/payments/webhook` (`handleStripeWebhook`):**
  - Mounted before JSON parsers with `express.raw({ type: 'application/json' })` for HMAC signature validation.
  - Deduplicates events via `IdempotencyRecord` table.
  - Contains terminal state protection (prevents late failed events from downgrading fulfilled orders).
  - Handles stock restoration on payment failure/cancellation.

### 2.3 Order Creation & Idempotency ([`orderController.ts`](file:///d:/ethnicotuire/server/src/controllers/orderController.ts))
- Generates human-readable order numbers (`EC-YYYY-XXXXXXXX`) and UUID `id`.
- Enforces strict `Idempotency-Key` headers to prevent double billing or duplicate order placement on network hiccups.
- Performs atomic inventory deductions inside a Prisma transaction: rejects order creation if inventory is insufficient.

### 2.4 COD to Online Payment Conversion
- Supports seamless conversion of existing COD orders to online payment via `/track-order` and `/account?tab=orders`.
- The payment controller updates `paymentMethod` to `'ONLINE'` and notes `'Payment completed online (converted from Cash on Delivery).'` in order status history.

### 2.5 Order Success Animation ([`OrderSuccessAnimation.tsx`](file:///d:/ethnicotuire/client/src/components/checkout/OrderSuccessAnimation.tsx))
- Displays the royal burgundy seal (`#3E1A1E`), concentric gold hairline (`#C6A15D`), animated checkmark stroke, and champagne gold particle burst.
- Activated only when `paymentStatus === 'PAID'` (or for confirmed COD). Refreshes are read-only and idempotent.

---

## 3. Phase 2 — Payment Gateway Provider Evaluation for Dynamic UPI QR

We evaluated the official dynamic UPI QR specifications and merchant capabilities across the three candidates:

| Evaluation Dimension | Razorpay | Cashfree Payments | Stripe India |
| :--- | :--- | :--- | :--- |
| **Dynamic UPI QR API** | Dedicated `POST /v1/payments/qr_codes` (`type: "upi_qr"`) | `POST /pg/orders/sessions` (`channel: "qr"`) | `POST /v1/payment_intents` with `payment_method_types: ['upi']` |
| **Exact Fixed Amount** | Enforced via `fixed_amount: true`, `payment_amount: paise`. Amount cannot be edited in UPI apps. | Enforced via `order_amount`. Non-editable in UPI apps. | Enforced via `amount: paise`. Non-editable in UPI apps. |
| **Unique Reference (`tr`)** | Distinct `qr_code_id` and unique transaction reference encoded per order. | Unique `order_id` / `cf_payment_id` encoded in UPI payload. | Encodes `payment_intent_id` into transaction reference. |
| **Single-Use Behavior** | Native `usage: "single_use"`. Auto-closes immediately upon receipt. | Single-use per payment session; auto-expires. | Single-use per PaymentIntent. |
| **QR Expiry & Timer** | Configurable via `close_by` (UNIX timestamp, e.g., 10–15 mins). On-demand closure API available. | Configurable order/session expiry (10–15 mins). | 23-hour intent window; requires frontend TTL enforcement. |
| **Payload Returned** | Returns both hosted PNG image (`image_url`) and raw NPCI string (`upi://pay?...`). | Returns Base64 image and raw string (`data.payload`). | Returns `qr_code.image_url_png`, `svg`, and raw string `data`. |
| **Mobile Deep Link (UPI Intent)** | Direct `upi://pay?...` enables 1-tap "Pay with GPay / PhonePe" on mobile. | Direct `upi://pay?...` supported. | Supported via mobile redirect URL or raw QR string. |
| **Signed Webhooks** | `X-Razorpay-Signature` (HMAC-SHA256). Event: `qr_code.credited` or `payment.captured`. | `x-webhook-signature` (HMAC-SHA256). Event: `PAYMENT_SUCCESS_WEBHOOK`. | `Stripe-Signature` (HMAC-SHA256). Event: `payment_intent.succeeded`. |
| **Polling / Status API** | `GET /v1/payments/qr_codes/:id` returns status and payments received. | `GET /pg/orders/:order_id` returns `PAID`. | `GET /v1/payment_intents/:id` returns `succeeded`. |
| **Sandbox Experience** | Comprehensive test mode (`rzp_test_...`). Simulates instant credit or failure without real bank account. | Sandbox simulator available. | Test mode available, but cannot generate real scannable QR for actual phone apps without Stripe Link. |
| **Merchant Eligibility in India** | Native Indian PA license; instant UPI onboarding. | Native Indian PA license; instant UPI onboarding. | Operates on invite-only basis in India since late 2023 due to RBI PA regulations. |

---

## 4. Architectural Recommendation

To ensure maximum reliability, compliance with Indian banking standards (NPCI/RBI), and optimal patron experience:

### Recommended Architecture: Dual-Gateway Strategy
1. **Retain Stripe:** For domestic and international Credit/Debit card payments (`paymentMethod: 'CARD'`).
2. **Implement Dedicated Dynamic UPI QR Service:**
   - **Preferred Option (Razorpay):** Highest conversion rate, native `single_use` dynamic QR API, automatic `qr_code.credited` webhooks, and seamless developer sandbox simulation.
   - **Alternative (Stripe Native UPI):** If the patron prefers a single vendor, use Stripe's `upi` payment method type with `upi_handle_redirect_or_display_qr_code`.
   - **Alternative (Cashfree):** Solid second choice with competitive rates and robust order pay QR APIs.
3. **Frontend Luxury Experience:**
   - Display a bespoke **Ethniz Couture Dynamic QR Modal** (`bg-white/95 border-[#C6A15D]`):
     - High-resolution dynamic QR code with centered Ethniz Couture logo.
     - Formatted amount: `₹[totalAmount]`.
     - 10-minute countdown timer with pulsating gold indicator.
     - One-tap mobile button: *"Open in Google Pay / PhonePe"* (`upi://pay?...`).
     - Real-time client polling (`/api/payments/status/:orderId`) every 2.5 seconds.
     - As soon as payment is confirmed, triggers the signature burgundy-and-champagne-gold order-success animation.

---

## 5. Phase 3 & 4 — Implementation Summary & Automated Verification Results

### 5.1 Backend Implementations
- **Environment & Configuration ([`config.ts`](file:///d:/ethnicotuire/server/src/config.ts)):**
  - Added `razorpayKeyId`, `razorpayKeySecret`, `razorpayWebhookSecret`, `upiMerchantVpa` (`ethnizcouture@icici`), and `upiMerchantName` (`Ethniz Couture`).
- **Dependencies ([`server/package.json`](file:///d:/ethnicotuire/server/package.json)):**
  - Installed `qrcode` and `@types/qrcode` with 0 audit vulnerabilities for high-resolution Base64 PNG generation.
- **Endpoints ([`paymentRoutes.ts`](file:///d:/ethnicotuire/server/src/routes/paymentRoutes.ts) & [`paymentController.ts`](file:///d:/ethnicotuire/server/src/controllers/paymentController.ts)):**
  1. `POST /api/payments/upi/create-qr`:
     - Authoritatively loads order amount, enforces `cu=INR`, locks amount, sets 15-minute dynamic expiry (`expiresAt`), and constructs NPCI string (`upi://pay?pa=...&pn=...&am=...&tr=...&cu=INR`).
     - Returns crisp Base64 PNG Data URL (`qrDataUrl`), deep-link (`upiUrl`), and stores transaction identifier on the order.
  2. `GET /api/payments/status/:orderId`:
     - Lightweight status lookup queried every 2.5s by the modal. Supports lookup by UUID `id` or human-readable `orderNumber`.
  3. `POST /api/payments/webhook/razorpay` & `/api/webhooks/razorpay`:
     - Mounted with `express.raw({ type: 'application/json' })` before general JSON parsers for cryptographic HMAC-SHA256 signature verification.
     - Captures `qr_code.credited` and `payment.captured` events.
     - Implements deduplication using the `IdempotencyRecord` table with 7-day retention.
     - Transitions order `paymentStatus` to `PAID` and `orderStatus` to `CONFIRMED`.
     - Asynchronously enqueues `ORDER_CONFIRMATION` background email worker.
  4. `POST /api/payments/upi/simulate-pay`:
     - Instant one-click approval endpoint for sandbox/development/testing environments.

### 5.2 Frontend Luxury Experience
- **[`DynamicUpiQrModal.tsx`](file:///d:/ethnicotuire/client/src/components/checkout/DynamicUpiQrModal.tsx):**
  - Rendered with Haute Couture burgundy (`#3E1A1E`) and champagne gold (`#C6A15D`) accents.
  - Displays locked order total (`₹...`), live QR code with centered EC monogram watermark, and 15-minute countdown timer with pulsating gold status ring.
  - Badges for supported apps: Google Pay, PhonePe, Paytm, BHIM, CRED.
  - Mobile shopper action: One-tap *"Open in UPI App Directly"* (`upiUrl`).
  - Copy VPA helper for `ethnizcouture@icici`.
  - Polling every 2.5s via `/api/payments/status/:orderId`.
  - Instant sandbox approval simulator button active in dev/demo mode.
- **[`CheckoutPage.tsx`](file:///d:/ethnicotuire/client/src/pages/CheckoutPage.tsx):**
  - Updated Step 3 with *"Pay by UPI QR"* selector.
  - Clicking *"PAY ₹... VIA UPI QR"* creates the order with atomic stock deduction and idempotency key, then opens `DynamicUpiQrModal`.
  - Authoritative payment confirmation triggers cart clearance, toast notification, and navigates to `/order-confirmation/:orderNumber` to fire the royal confetti animation.
- **[`OrderTracking.tsx`](file:///d:/ethnicotuire/client/src/pages/OrderTracking.tsx):**
  - Upgraded COD "Pay Online" modal to support Dynamic UPI QR payment alongside Card and Net Banking.

### 5.3 Automated Verification Results
1. **Frontend Production Build:**
   ```bash
   npm --prefix client run build
   # Result: 0 errors. dist/ produced cleanly in 3.74s.
   ```
2. **Dedicated UPI QR Integration Test Suite:**
   ```bash
   npm --prefix server run test:upi-qr
   # Output:
   # ok 1 - 1. Reject QR creation when orderId is missing or invalid
   # ok 2 - 2. Generate dynamic NPCI UPI QR code with locked order total
   # ok 3 - 3. Real-time payment status polling returns accurate pending state
   # ok 4 - 4. Signed Razorpay Webhook authoritatively approves UPI payment and updates order
   # ok 5 - 5. Duplicate webhook events are handled idempotently without redundant mutations
   # ok 6 - 6. Real-time polling reflects isPaid: true immediately after webhook approval
   # ok 7 - 7. Instant sandbox simulation endpoint enables frictionless automated test approval
   # 1..7 (7/7 tests passed, 0 failed, duration: 1.25s)
   ```
3. **Full Backend Regression Test Suite:**
   ```bash
   npm --prefix server test
   # Result: All 4 test suites (Architecture, Security, Stripe Webhook, Location & Delivery) passed cleanly (100% pass rate).
   ```
