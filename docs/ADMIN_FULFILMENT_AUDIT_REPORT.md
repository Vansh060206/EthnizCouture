# Ethniz Couture — Pre-Implementation Audit Report
## Admin-Controlled Order Fulfilment Workflow

**Audit Date:** October 19, 2026  
**Audited Subsystems:** Express Backend, Prisma ORM, React Admin Dashboard, Customer Order Tracking (`OrderTracking.tsx`), Inventory & Payment Services.

---

### 1. Existing Functionality Reused

1. **Prisma Models & Database Schema:**
   - `Order`: Existing fields `orderNumber`, `customerName`, `customerEmail`, `customerPhone`, `shippingStreet`, `shippingCity`, `shippingState`, `shippingPincode`, `shippingCountry`, `subtotal`, `discountAmount`, `shippingFee`, `totalAmount`, `paymentStatus`, `orderStatus`, `paymentMethod`, `paymentIntentId`, `trackingNumber`, `estimatedDelivery`, `notes`, `createdAt`, `updatedAt`.
   - `OrderItem`: Stores snapshots of product details (`productName`, `productImage`, `size`, `color`, `price`, `quantity`, `total`, `productId`).
   - `OrderStatusHistory`: Existing model linked to `Order` recording historical status changes.
   - `AuditLog`: Existing model for security and administrative audit logs (`userId`, `action`, `entity`, `entityId`, `details`, `createdAt`).
   - `Product` & `ProductVariant`: Stock management with atomic `decrement` / `increment`.

2. **Order Lifecycle & Payment Separation:**
   - Distinction between `orderStatus` (`PENDING`, `CONFIRMED`, `PROCESSING`, `PACKED`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`) and `paymentStatus` (`PENDING`, `PAID`, `FAILED`, `REFUNDED`).
   - Payment webhooks (Stripe & Razorpay) and COD flows already maintain this separation.
   - COD orders are created with `paymentStatus: 'PENDING'` and can be converted to online prepaid via `OrderTracking.tsx` or collected at doorstep.

3. **Inventory Lifecycle:**
   - `createOrder` inside `orderController.ts` atomically checks and decrements `product.stock` upon order placement.
   - `cancelOrder` inside `orderController.ts` increments stock upon cancellation.
   - Background inventory alert worker (`INVENTORY_ALERT`) triggers when stock drops below threshold ($\le 5$).

4. **Security & Authorization Middleware:**
   - `authenticateUser` and `requireAdmin` in `server/src/middleware/auth.ts` enforce JWT authentication and `role === 'ADMIN'`.

5. **Customer Tracking:**
   - `OrderTracking.tsx` provides Flipkart-inspired stepper and milestone tracking connected to `GET /api/orders/track`.

---

### 2. Gaps & Missing Functionality Identified

1. **State Machine Enforcement Missing:**
   - `updateOrderStatus` in `adminController.ts` permitted arbitrary status updates directly from frontend input without transition rules, validation, or concurrency checks.
   - An unpaid online order could be moved to preparation or dispatch.
   - An order could be marked as `SHIPPED` without carrier or tracking information.
   - Terminal states (`DELIVERED`, `CANCELLED`) could be overridden.

2. **Double Stock Deduction & Double Release Risks:**
   - `updateOrderStatus` lacked cancellation handling; if an admin set `orderStatus: 'CANCELLED'` via the admin dropdown, stock was never returned.
   - Conversely, `cancelOrder` lacked an idempotency guard: if called repeatedly, it would increment stock multiple times.
   - Fulfilment transitions lacked guards to prevent re-deducting stock.

3. **Admin Dashboard Lacked Operational Fulfilment Queues:**
   - `AdminOrders.tsx` was a generic table with an unvalidated `<select>` dropdown.
   - Missing dedicated operational queues (New, Confirmed, Preparing, Packed, Dispatched, Delivered, Cancelled) with live queue count badges.
   - Missing item preparation checklist, warehouse stock visibility during packing, and shipment recording modal (carrier, AWB, dispatch timestamp, estimated delivery).
   - Missing visual order status history timeline in the admin order drawer.

4. **Hardcoded Carrier & Tracking in Customer Tracking Page:**
   - `OrderTracking.tsx` hardcoded `Blue Dart Express Air` even for orders that had not yet been dispatched or had a different carrier assigned.
   - Stepper did not reflect `PACKED` state distinctly or handle cancelled orders gracefully.

---

### 3. Conflicting Status Transitions to Prevent

| Prohibited Transition | Business Hazard | Prevention Rule |
|---|---|---|
| Unpaid Online Order $\rightarrow$ `PROCESSING` / `PACKED` / `SHIPPED` | Shipping unpaid bespoke couture | Require `paymentStatus === 'PAID'` (unless `paymentMethod === 'COD'`). |
| Any Status $\rightarrow$ `SHIPPED` without Courier/AWB | Ghost dispatch without customer tracking | Enforce valid `carrierName` and non-empty `trackingNumber`. |
| Jump from `PENDING` $\rightarrow$ `DELIVERED` | Skipping physical preparation & transit | Strict step progression: `SHIPPED` or `OUT_FOR_DELIVERY` $\rightarrow$ `DELIVERED`. |
| `DELIVERED` $\rightarrow$ `PENDING` / `PROCESSING` | Inverting completed legal transaction | `DELIVERED` is an irreversible terminal state. |
| `CANCELLED` $\rightarrow$ `CONFIRMED` / `SHIPPED` | Resurrecting cancelled order | `CANCELLED` is a terminal state. |
| Double `CANCELLED` execution | Duplicate inventory inflation | Idempotency guard: reject if already `CANCELLED`. |
| Duplicate action submissions | Redundant history records & race conditions | Optimistic concurrency check (`updatedAt` matching) & transactional updates. |

---

### 4. Minimal Database Schema Enhancements

To support structured shipment tracking and administrative auditability without breaking existing models, we add minimal, nullable/defaulted fields to `schema.prisma` and `schema.postgresql.prisma`:

1. **`Order` Model:**
   - `carrierName String?` — Real carrier (e.g. "Blue Dart", "Delhivery", "DTDC", "Speed Post").
   - `dispatchedAt DateTime?` — Actual physical dispatch timestamp.
   - `deliveredAt DateTime?` — Actual doorstep delivery timestamp.
   - `internalNotes String?` — Admin-only operational notes (never leaked to customer tracking API).

2. **`OrderStatusHistory` Model:**
   - `actorId String?` — User ID of the admin who performed the transition.
   - `source String @default("SYSTEM")` — Origin (`ADMIN_ACTION`, `SYSTEM`, `CUSTOMER`, `GATEWAY_WEBHOOK`).

*All additions are optional or carry defaults, ensuring zero breaking changes to existing database records or tests.*

---

### 5. Files and Endpoints to Be Created or Modified

| Component | File Path | Action | Scope |
|---|---|---|---|
| Schema | `server/prisma/schema.prisma` & `schema.postgresql.prisma` | Modify | Add optional shipment & history fields |
| Fulfilment Service | `server/src/services/orderFulfilmentService.ts` | **Create** | Centralized, transactional state machine with transition validation, inventory safety, and audit logging |
| Admin Controller | `server/src/controllers/adminController.ts` | Modify | Update `getAdminOrders` with queue counts, date/payment filters; rewire `updateOrderStatus` to fulfilment service |
| Order Controller | `server/src/controllers/orderController.ts` | Modify | Guard `cancelOrder` against double-restoration; expose real `carrierName`, `dispatchedAt`, and customer-safe notes in `trackOrder` |
| Admin Routes | `server/src/routes/adminRoutes.ts` | Modify | Add `/orders/fulfilment-stats` and `/orders/:id/fulfilment-action` endpoints |
| Admin Workspace | `client/src/pages/admin/AdminOrders.tsx` | Modify | Rebuild with operational queues, count badges, filters, item preparation checklist, dispatch modal, and status timeline |
| Customer Tracking | `client/src/pages/OrderTracking.tsx` | Modify | Dynamically display real carrier/AWB, show actual status history notes, and handle cancelled state |
| Automated Tests | `server/test/admin_order_fulfilment.test.ts` | **Create** | Comprehensive suite covering valid transitions, invalid transitions, concurrency, inventory safety, COD safety, and tracking integration |
| Documentation | `docs/ADMIN_CONTROLLED_FULFILMENT_REPORT.md` | **Create** | Comprehensive final deliverable documentation |
