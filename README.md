# ⚜ EthnizCouture — Haute Indian Ethnic Wear & Atelier

> **A luxury full-stack e-commerce experience crafted for royalty, weddings, and grand celebrations.**
> Combining time-honored Indian textile heritage (Varanasi Katan silk, Awadhi zardozi, Lucknowi chikankari, Rajasthan gota patti) with modern, minimal, haute-couture aesthetics.

---

## 🏛 Brand Identity & Design Philosophy

- **Color Palette:**
  - **Royal Maroon (`#4A0E1A`, `#320911`, `#1F040A`):** Evoking imperial Mughal velvet and bridal vermillion.
  - **Antique Zari Gold (`#C5A059`, `#DFC89D`, `#96742E`):** Pure metallic luster derived from hallmarked bullion wires.
  - **Warm Ivory (`#FAF7F2`, `#F2ECE1`):** Soft, archival backdrop reminiscent of handmade wasli paper.
  - **Deep Charcoal (`#171717`, `#0D0D0D`):** Editorial grounding for high-contrast typography.
- **Typography:**
  - **Headings & Display:** `Cormorant Garamond` (classic serif reflecting courtly grandeur).
  - **Body & Navigation:** `Plus Jakarta Sans` (ultra-clean, highly legible modern geometry).
- **Artisanal Elements:**
  - Subtle Mughal **Jaali Lattice** geometric background overlays.
  - Metallic **Gold Shimmer** reflection effects on primary buttons and badges.
  - Seamless, infinite **Royal Marquee Ribbon** ticker.
  - Dual-image hover cross-fade with silk texture preview.
  - Floating **Atelier Concierge** with 1-click WhatsApp styling, live tracking, and hotline.

---

## ⚡ Architecture & Tech Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite 5 | SPA with fast client-side routing & HMR |
| **Styling** | Tailwind CSS + Vanilla CSS Tokens | Custom luxury palette, jaali patterns, gold shimmers |
| **Global State** | React Context API | `AuthContext`, `CartContext`, `WishlistContext`, `CurrencyContext`, `ToastContext` |
| **Currencies** | Real-time conversion | INR (₹), USD ($), GBP (£), EUR (€), AED (د.إ) |
| **Backend** | Express 5, TypeScript, Node.js | RESTful architecture with structured controllers & error handling |
| **Database & ORM**| SQLite, Prisma ORM 6.x | Relational schema with cascade deletes & foreign keys |
| **Authentication** | JWT & Bcrypt | Role-Based Access Control (`CUSTOMER` & `ADMIN`) |
| **Payments** | Stripe Integration | Server-side PaymentIntent with simulated test fallback mode |
| **Media Uploads** | Multer | Multi-image product uploads served statically via `/uploads` |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18 or higher)
- npm

### 1. Start Backend Server
```bash
cd server
npm install
npx prisma db push
npx prisma db seed
npm run dev
```
*API will run at `http://localhost:5000`*

### 2. Start Customer Storefront & Admin
```bash
cd ../client
npm install
npm run dev
```
*Application will run at `http://localhost:5173`*

---

## 🔑 Demo Credentials

To test the application effortlessly without registering, you can use the **1-click instant login buttons** located directly inside the **Patron / Account menu** in the header:

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Atelier Director (Admin)** | `admin@ethnizcouture.com` | `Admin@123456` | Full access to `/admin` dashboard suite |
| **Royal Patron (Customer)** | `priya@example.com` | `Customer@123456` | Saved addresses, order history, wishlist |

---

## 🛍 Customer Experience Features

1. **Haute Couture Hero Section:**
   - 3-slide editorial lookbook (Bridal Lehengas, Varanasi Sarees, Imperial Sherwanis) with auto-slide & manual navigation.
2. **Infinite Royal Marquee Ticker:**
   - Smooth continuous announcement ribbon highlighting GI-tagged purity, free insured worldwide shipping, and bespoke fitting.
3. **The Ancient Arts of Karigari (Craftsmanship Pavilion):**
   - Interactive visual showcase exploring 4 historic Indian disciplines: *Awadh Zardozi*, *Banarasi Kadwa Weaving*, *Lucknowi Chikankari & Mukaish*, and *Rajasthan Gota Patti*.
4. **Bespoke Bridal Concierge Booking:**
   - Interactive appointment booking card for private 1-on-1 video styling consultations with senior atelier stylists.
5. **Shop & Vault Filtering:**
   - Multi-currency price presets (Under ₹15,000 to ₹75,000+ Heirloom Bridal).
   - Filter by Fabric (Katan Silk, Velvet, Organza, Chanderi, Georgette).
   - Filter by Occasion (Bridal, Sangeet, Mehendi, Reception, Festive).
   - Grid layout switcher (2 columns, 3 columns, 4 columns).
   - Active filter chips with 1-click removal.
6. **Product Detail Experience:**
   - High-resolution gallery with thumbnail selector and fullscreen lightbox.
   - Live viewer counter (*"14 brides & patrons are admiring this piece right now"*).
   - Pincode delivery estimator with instant transit estimation.
   - Bespoke made-to-measure blouse tailoring option with custom bust, waist, length, and neckline inputs.
   - Verified buyer review submission with star ratings.
7. **Cart Drawer & Multi-Step Checkout:**
   - Free shipping threshold progress bar.
   - One-click coupon chips (`WELCOME10`, `ROYAL500`, `FESTIVE20`).
   - Multi-step checkout (Address -> Insured Transit -> Payment method).
   - Celebratory gold/maroon confetti upon order placement.
8. **Live Milestone Order Tracking (`/track-order`):**
   - 7-stage visual pipeline: *Order Placed -> Payment Verified -> Loom Loom Weaving / Crafting -> Quality Inspection -> Velvet Box Packaging -> Dispatched via Air -> Delivered*.

---

## 👑 Self-Service Admin Dashboard Suite (`/admin`)

Located at `/admin` (guarded by JWT authentication and Admin role check):

- **Overview Analytics (`/admin`):**
  - Gross Revenue, Active Orders, Average Order Value, Customer Count.
  - Revenue by Category breakdown and Low-Stock urgency alerts.
- **Product Management (`/admin/products`):**
  - Add new products with multi-image uploads, sku, sizes, fabrics, occasion tags.
  - 1-click **Duplicate Product** action to replicate templates.
  - Quick toggle for Featured, Best Seller, New Arrival, and Active status.
- **Inventory Control (`/admin/inventory`):**
  - Instant inline stock adjustments with real-time sync to customer storefront.
- **Order Pipeline (`/admin/orders`):**
  - View patron details, line items, payment status, and shipping address.
  - Advance order milestone status with automatic sync to the customer tracking timeline.
- **Customer Directory (`/admin/customers`):**
  - Patron profiles, order totals, and lifetime spend calculation.
- **Review Moderation (`/admin/reviews`):**
  - Approve or remove customer reviews with verified purchase flags.
- **Category & Collection CMS (`/admin/categories`):**
  - Create and edit pavilions dynamically.
- **Coupon Promotion Engine (`/admin/coupons`):**
  - Create flat or percentage discount codes, minimum order value thresholds, and expiry dates.
- **Live Content CMS (`/admin/content`):**
  - Update top announcement bar, homepage hero titles, tags, and spotlight banners in real time.

---

## 📜 License

Created exclusively for **EthnizCouture**. Crafted with passion for Indian art and haute couture fashion.
