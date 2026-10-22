# ETHNIZ COUTURE — COMPREHENSIVE UI/UX & RESPONSIVE AUDIT

**Audit Date:** October 20, 2026  
**Auditor:** Senior UI/UX Designer & Design Systems Architect  
**Platform:** React 18 + Vite + TypeScript + Tailwind CSS | Express + Prisma + SQLite/PostgreSQL  
**Scope:** Complete inventory of all storefront customer routes, modals, drawers, checkout flows, and atelier admin console screens.

---

## 1. Complete Route & Component Inventory

### A. Customer-Facing Storefront Routes
| Route Path | Component | Status & Inspection Notes |
| :--- | :--- | :--- |
| `/` | `Home.tsx` | Hero slider, infinite marquee, craft stories, curated collections, reviews, bridal consultation form. |
| `/shop` | `Shop.tsx` | Dual-view catalog grid (2/3/4 cols), facet filters (category, collection, occasion, fabric, price, size, color), search. |
| `/product/:slug` | `ProductDetail.tsx` | Gallery, zoom lightbox, size selector, bespoke measurements accordion, Flipkart-style dual CTAs, mobile sticky bar. |
| `/cart` | `CartPage.tsx` | Shopping bag table, free shipping meter, coupon application, order summary. |
| `/checkout` | `CheckoutPage.tsx` | Multi-step checkout (Address, Shipping, Payment), interactive delivery location picker, UPI QR modal, COD conversion. |
| `/order-confirmation/:id` | `OrderConfirmation.tsx` | Authoritative receipt lookup, royal seal stamp animation, order milestones. |
| `/track-order` | `OrderTracking.tsx` | Real-time milestone tracker, live courier tracking, COD-to-online conversion. |
| `/account` & `/account/:section` | `Account.tsx` | Mobile-first hub: Profile, Order History, Saved Wardrobe, Address Book, Privilege Coupons, Concierge. |
| `/about` | `About.tsx` | Editorial brand story: Varanasi master looms, Awadhi zardozi, karigari statistics. |
| `/contact` | `Contact.tsx` | Bridal concierge appointment form, contact channels, interactive accordion FAQs. |
| `/login` | `Login.tsx` | Dedicated patron sign-in with email/password and official Google 1-Tap integration. |
| `/signup` | `Signup.tsx` | New patron registration with password strength meter, Google Sign-In, and welcome email trigger. |

### B. Shared Global Components, Drawers & Modals
| Component | File Path | Role |
| :--- | :--- | :--- |
| `CustomerLayout` | `client/src/components/CustomerLayout.tsx` | Master storefront wrapper (Navbar, CartDrawer, Concierge, AuthModal, Footer, MobileBottomNav). |
| `Navbar` | `client/src/components/Navbar.tsx` | Top announcement bar, brand logo, mega menu, search dropdown, patron menu, bag badge. |
| `MobileBottomNav` | `client/src/components/MobileBottomNav.tsx` | 5-item mobile tab bar (Home, Explore, Saved, Bag, Account). |
| `Footer` | `client/src/components/Footer.tsx` | Value pillars (Karigari, Shipping, Silk Mark, Bespoke Fit), brand story, newsletter, social links. |
| `CartDrawer` | `client/src/components/CartDrawer.tsx` | Off-canvas slide-out bag with live cart sync, free shipping progress, instant checkout trigger. |
| `QuickViewModal` | `client/src/components/QuickViewModal.tsx` | Rapid product preview modal with thumbnail switcher, size selector, and dual Add/Buy buttons. |
| `SizeGuideModal` | `client/src/components/SizeGuideModal.tsx` | Royal sizing standards chart (Sarees, Lehengas, Anarkalis, Kurtas) with measurement guide. |
| `AuthModal` | `client/src/components/AuthModal.tsx` | Timed delayed modal prompting first-time visitors with luxury introductory privilege. |
| `AtelierConcierge` | `client/src/components/AtelierConcierge.tsx` | Floating concierge widget offering direct styling and WhatsApp advisory. |
| `DeliveryLocationPicker` | `client/src/components/checkout/DeliveryLocationPicker.tsx` | Interactive Leaflet map with GPS reverse geocoding for precise doorstep delivery. |
| `DynamicUpiQrModal` | `client/src/components/checkout/DynamicUpiQrModal.tsx` | Dynamic NPCI-compliant UPI QR modal with live polling and deep-link payment triggers. |
| `OrderSuccessAnimation` | `client/src/components/checkout/OrderSuccessAnimation.tsx` | Custom SVG royal wax seal stamp animation with confetti and order summary. |
| `GoogleSignInButton` | `client/src/components/auth/GoogleSignInButton.tsx` | Official Google Identity Services GIS button integration. |
| `ProductCard` | `client/src/components/ProductCard.tsx` | Catalog card with image crossfade, discount badges, wishlist toggle, quick view, and quick buy. |

### C. Atelier Admin Console Routes (`/atelier-portal`)
| Route Path | Component | Role |
| :--- | :--- | :--- |
| `/atelier-portal/login` | `AdminLogin.tsx` | High-security atelier portal login. |
| `/atelier-portal` | `AdminOverview.tsx` | Financial summary, sales charts, recent order feed, low-stock warnings. |
| `/atelier-portal/products` | `AdminProducts.tsx` | Garment catalog manager, pricing, stock levels, category assignments. |
| `/atelier-portal/inventory` | `AdminInventory.tsx` | Stock tracker, low-inventory alerts, batch replenishment. |
| `/atelier-portal/orders` | `AdminOrders.tsx` | Fulfilment pipeline, milestone management, tracking number generator, invoice print. |
| `/atelier-portal/customers` | `AdminCustomers.tsx` | Patron directory, VIP spend analysis, order count. |
| `/atelier-portal/reviews` | `AdminReviews.tsx` | Review moderation, rating approval, verified buyer badges. |
| `/atelier-portal/categories` | `AdminCategories.tsx` | Category hierarchy and collection taxonomy editor. |
| `/atelier-portal/collections` | `AdminCategories.tsx` | Collection showcase editor. |
| `/atelier-portal/coupons` | `AdminCoupons.tsx` | Promotional discount engine, coupon limits, usage counters. |
| `/atelier-portal/media` | `AdminMedia.tsx` | Atelier image asset gallery and CDN URL manager. |
| `/atelier-portal/content` | `AdminContent.tsx` | Announcement banners, hero slideshow, editorial craft stories. |
| `/atelier-portal/settings` | `AdminSettings.tsx` | Store currency, tax rates, free shipping thresholds, contact data. |

---

## 2. Identified Visual & UX Deficiencies (Pre-Transformation)

### Defect 1: Mobile Bottom Bar Collision on Product Detail Page (Severity: High)
- **Observation:** `MobileBottomNav.tsx` renders fixed at `bottom-0` (`z-40`, height 56px). On `/product/:slug`, `ProductDetail.tsx` renders a Flipkart-style fixed action bar also at `bottom-0` (`z-40`, height 64px).
- **Impact:** On mobile viewports (320px–768px), both bars sit directly on top of each other. Customers attempting to tap "Add to Bag" or "Buy Now" inadvertently tap the bottom navigation icons or suffer visual overlapping.
- **Remedy:** Automatically suppress `MobileBottomNav` when viewing `/product/` so the product direct checkout action bar has clean, dedicated thumb space above the device safe area.

### Defect 2: Color Token Drift & Ad-hoc Hex Fragmentations (Severity: Medium)
- **Observation:** The codebase exhibits conflicting color scales:
  - `maroon-800` vs `burgundy-800` vs `#3E1A1E` vs `#2B0C10` vs `#160307` vs `#1F040A`
  - `gold-500` (`#C6A15D`) vs `#C5A059` vs `#DFC89D` vs `#D4AF37` vs `#84642C`
- **Impact:** Inconsistent visual accents, varied button backgrounds, and random borders across pages.
- **Remedy:** Centralize all brand colors into CSS variables and unified Tailwind token aliases (`brand-burgundy`, `brand-burgundy-deep`, `brand-gold`, `brand-gold-light`, `brand-ivory`, `brand-charcoal`).

### Defect 3: Low Contrast on Light Backgrounds (Severity: Medium / WCAG AA)
- **Observation:** Champagne gold text (`#DFC89D` or `#C6A15D`) was occasionally placed directly on warm ivory (`#FAF7F2`) or white backgrounds for small labels and badges.
- **Impact:** Fails WCAG 2.2 AA 4.5:1 contrast requirement for body text.
- **Remedy:** Use deep antique gold `#84642C` or burgundy `#3E1A1E` on light ivory backgrounds. Reserve champagne gold `#DFC89D` for dark backgrounds (`#3E1A1E`, `#2B0C10`, `#1A1A1A`).

### Defect 4: Touch Target Deficits on Mobile (Severity: Medium)
- **Observation:** Several interactive controls (wishlist buttons, size chips, quantity steppers, mobile drawer dismiss buttons) measured below 40×40px.
- **Impact:** High error rates when navigating on 320px–390px mobile screens.
- **Remedy:** Ensure all interactive touch targets meet or exceed 44×44px with adequate padding and active states.

### Defect 5: Form Input Inconsistency (Severity: Low)
- **Observation:** Inputs across `CheckoutPage.tsx`, `Login.tsx`, `Signup.tsx`, and `Contact.tsx` had mismatched heights (ranging from 36px to 52px), varying border radii, and inconsistent focus rings.
- **Remedy:** Standardize form inputs to a consistent luxury field design: height 46px (`h-11.5`), rounded-lg, warm neutral border `#E5DFD5`, focus ring in champagne gold `ring-2 ring-[#C6A15D]/40`, and clear label placement.

---

## 3. Viewport Testing Matrix

| Viewport | Device Profile | Target Checks |
| :--- | :--- | :--- |
| **320 × 640** | Narrow Mobile (iPhone SE 1st gen) | Header announcement truncation, single-column product grid, 44px tap targets, zero horizontal scroll. |
| **360 × 800** | Small Android (Samsung Galaxy A-series) | Product card padding, mobile bottom nav clearance, modal centering. |
| **390 × 844** | Modern Mobile (iPhone 13/14/15) | Touch target ergonomics, sticky action bar, cart drawer slide. |
| **430 × 932** | Large Mobile (iPhone Pro Max) | Typography scaling, fluid clamp headers, image aspect ratio preservation. |
| **768 × 1024** | Tablet Portrait (iPad Mini/Air) | 2-column to 3-column grid transitions, filter drawer vs sidebar breakpoint. |
| **1024 × 768** | Tablet Landscape / Small Laptop | Mega menu dropdown trigger, checkout dual-column layout. |
| **1280 × 800** | Standard Laptop (MacBook Air) | Container max-width 7xl (1280px), generous whitespace, refined micro-animations. |
| **1440 × 900** | Desktop Monitor | Balanced gutters, razor-sharp typography, hero focal centering. |
| **1920 × 1080** | Large Full HD Desktop | Max-width containment preventing overstretched content blocks. |

---

## 4. Accessibility & Motion Compliance Plan

1. **Semantic Hierarchy:** Ensure single `<h1>` per page, sequential `<h2>` and `<h3>` tags.
2. **Keyboard Navigation:** Explicit visible focus rings (`focus-visible:ring-2 focus-visible:ring-[#C6A15D]`) on all interactive buttons, links, inputs, and tab triggers.
3. **Screen Readers:** ARIA attributes (`aria-label`, `aria-expanded`, `aria-hidden`, `aria-live`) on icon-only buttons, modal overlays, and live status badges.
4. **Motion Restraint:** Full `@media (prefers-reduced-motion: reduce)` support across all CSS keyframes, disabling marquee and transforms when requested.
