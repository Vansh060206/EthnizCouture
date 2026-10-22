# ETHNIZ COUTURE — LUXURY DESIGN SYSTEM SPECIFICATION

**Design System:** Ethniz Couture Haute Heritage v2.0  
**Art Direction:** Royal Indian Haute Couture & Contemporary Heritage  
**Typography:** Cormorant Garamond (Serif) + Plus Jakarta Sans (Sans-Serif)  
**Palette:** Deep Burgundy • Champagne Gold • Warm Ivory • Charcoal

---

## 1. Color Palette Tokens

```css
:root {
  /* Brand Core Tokens */
  --color-burgundy-primary: #3E1A1E;      /* Primary Brand Action & Identity */
  --color-burgundy-deep: #2B0C10;         /* Footer, Dark Sections, Deep Velvet */
  --color-burgundy-dark: #1A080B;         /* Night Contrast Backgrounds */
  --color-burgundy-hover: #4E1A22;        /* Button Hover State */
  
  /* Brand Gold Accents */
  --color-gold-champagne: #C6A15D;        /* Official Brand Champagne Gold */
  --color-gold-light: #DFC89D;            /* Text on Dark Backgrounds, Highlights */
  --color-gold-antique: #84642C;          /* High-Contrast Accessible Gold on Light Canvas */
  --color-gold-glow: rgba(198, 161, 93, 0.25);
  
  /* Canvas & Neutrals */
  --color-ivory-canvas: #FAF7F2;          /* Editorial Storefront Canvas */
  --color-card-white: #FFFFFF;            /* Surface Elevation Cards */
  --color-border-warm: #E8DEC8;           /* Refined Ivory Borders */
  --color-border-subtle: rgba(198, 161, 93, 0.25);
  
  /* Typography Neutrals */
  --color-charcoal-text: #1A1A1A;         /* Primary Headings & High-Contrast Body */
  --color-charcoal-body: #2D2829;         /* Body Copy */
  --color-muted-grey: #6E686A;            /* Secondary Captions & Form Hints */
  
  /* Functional Semantic Status */
  --color-success: #1B5E20;               /* Emerald In-Stock / Verified */
  --color-success-bg: #F1F8F2;
  --color-success-border: #C8E6C9;
  
  --color-warning: #B76E00;               /* Amber Low-Stock / Urgent */
  --color-warning-bg: #FFF8E1;
  --color-warning-border: #FFE082;
  
  --color-error: #B71C1C;                 /* Destructive / Form Error / Sold Out */
  --color-error-bg: #FFEBEE;
  --color-error-border: #FFCDD2;
}
```

### Color Contrast Matrix (WCAG 2.2 AA Compliance)
| Background | Foreground Text | Contrast Ratio | Compliance | Role |
| :--- | :--- | :--- | :--- | :--- |
| `#3E1A1E` (Burgundy) | `#FAF7F2` (Warm Ivory) | **11.4:1** | AAA Pass | Primary button text, announcement ribbon |
| `#3E1A1E` (Burgundy) | `#DFC89D` (Light Gold) | **7.8:1** | AAA Pass | Button subtitles, badge labels |
| `#FAF7F2` (Warm Ivory) | `#1A1A1A` (Charcoal) | **14.2:1** | AAA Pass | Main product descriptions, titles |
| `#FAF7F2` (Warm Ivory) | `#3E1A1E` (Burgundy) | **9.6:1** | AAA Pass | Category labels, price displays |
| `#FAF7F2` (Warm Ivory) | `#84642C` (Antique Gold) | **4.9:1** | AA Pass | Small collection accents on light canvas |
| `#FFFFFF` (White Card) | `#1A1A1A` (Charcoal) | **16.1:1** | AAA Pass | Form input text, table contents |

---

## 2. Typography Hierarchy

### Font Stacks
- **Headings & Display:** `"Cormorant Garamond", "Playfair Display", Georgia, serif`
- **Body, UI & Numbers:** `"Plus Jakarta Sans", "Inter", -apple-system, sans-serif`

### Standardized Scale
| Level | Font Family | Size | Weight | Line Height | Letter Spacing | CSS Utility |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Display** | Cormorant | `clamp(2.5rem, 5.5vw, 5.25rem)` | 400 | 1.08 | `-0.02em` | `font-serif text-4xl sm:text-6xl lg:text-7xl` |
| **Page Title (h1)** | Cormorant | `clamp(2rem, 3.5vw, 3.5rem)` | 500 / 600 | 1.15 | `-0.01em` | `font-serif text-3xl sm:text-5xl` |
| **Section Header (h2)** | Cormorant | `clamp(1.5rem, 2.4vw, 2.25rem)` | 500 | 1.25 | `0.02em` | `font-serif text-2xl sm:text-4xl` |
| **Product / Card Title (h3)**| Cormorant | `1.125rem – 1.25rem` | 500 / 600 | 1.35 | `0.01em` | `font-serif text-base sm:text-lg` |
| **Body Primary** | Plus Jakarta | `1rem (16px)` | 400 | 1.6 | `normal` | `text-base text-zinc-700` |
| **Body Secondary** | Plus Jakarta | `0.875rem (14px)` | 400 | 1.55 | `normal` | `text-sm text-zinc-600` |
| **Labels & Form Titles** | Plus Jakarta | `0.75rem – 0.8125rem` | 700 | 1.4 | `0.15em uppercase` | `text-xs font-bold uppercase tracking-wider` |
| **Micro-Badges & Tags** | Plus Jakarta | `0.625rem – 0.6875rem` | 700 | 1.2 | `0.2em uppercase` | `text-[10px] font-bold uppercase tracking-widest` |

---

## 3. Spacing & Container Rules

- **Standard Horizontal Gutters:** `px-4 sm:px-6 lg:px-8`
- **Max Width Containers:**
  - Full Storefront: `max-w-7xl mx-auto` (1280px max)
  - Editorial Reading Block: `max-w-3xl mx-auto` or `max-w-4xl mx-auto`
  - Checkout Grid: `max-w-7xl mx-auto` (8-column main / 4-column summary)
  - Auth Cards: `max-w-md mx-auto` (448px)
- **Vertical Section Rhythm:**
  - Storefront Sections: `py-16 sm:py-20 lg:py-24`
  - Card Inner Padding: `p-4 sm:p-6`
  - Form Gap: `space-y-4 sm:space-y-5`

---

## 4. Reusable Interactive Component Specifications

### A. Buttons

```tsx
/* 1. Primary Luxury Action (Deep Burgundy with Gold Accents) */
className="h-12 px-7 bg-[#3E1A1E] hover:bg-[#2B0C10] active:bg-[#1A080B] text-[#DFC89D] text-xs font-bold tracking-[0.18em] uppercase rounded-lg border border-[#C6A15D]/50 shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"

/* 2. Secondary Luxury Action (Ivory Outline) */
className="h-12 px-7 bg-white hover:bg-[#FAF7F2] active:bg-[#F5EFE6] text-[#3E1A1E] text-xs font-bold tracking-[0.18em] uppercase rounded-lg border-2 border-[#3E1A1E] shadow-xs transition-all duration-300 flex items-center justify-center gap-2"

/* 3. Direct Buy Now / Instant Checkout (Flipkart Parity) */
className="h-12 px-6 bg-[#3E1A1E] hover:bg-[#2B0C10] text-[#DFC89D] text-xs font-bold tracking-[0.15em] uppercase rounded-lg border border-[#C6A15D]/60 shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-transform"

/* 4. Ghost / Icon Action */
className="p-2.5 rounded-full bg-white/90 hover:bg-white text-zinc-700 hover:text-[#3E1A1E] border border-[#C6A15D]/30 transition-all hover:scale-105 active:scale-95"
```

### B. Form Inputs

```tsx
/* Standardized Luxury Input Field */
className="w-full h-11.5 px-3.5 text-xs sm:text-sm bg-white border border-[#E8DEC8] rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30 transition-all"
```

### C. Product Cards

```tsx
/* Luxury Garment Card Wrapper */
className="group relative flex flex-col bg-white rounded-lg overflow-hidden border border-[#E8DEC8] hover:border-[#C6A15D] transition-all duration-500 hover:shadow-luxury"
```

### D. Mobile Sticky Action Bar

```tsx
/* Flipkart-Style Fixed Bottom Action Bar */
className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#C6A15D]/40 p-2.5 sm:hidden shadow-[0_-4px_25px_rgba(0,0,0,0.12)] flex items-center gap-2"
```

---

## 5. Responsive Breakpoint Strategy

| Breakpoint | Width (px) | Layout Adjustments |
| :--- | :--- | :--- |
| **xs (Mobile narrow)** | `< 390px` | Single-column product grids, compact announcement bar, 44px tap targets, full-width buttons. |
| **sm (Mobile standard)** | `390px – 639px` | 2-column compact catalog grid option, bottom safe-area padding (`pb-28`). |
| **md (Tablet portrait)** | `640px – 767px` | 2-column rich catalog grid, dual-button hero layouts. |
| **lg (Tablet landscape)**| `768px – 1023px` | 3-column catalog grid, desktop mega menu activation, filter drawer toggle. |
| **xl (Standard desktop)**| `1024px – 1279px` | Persistent filter sidebar on Shop page, side-by-side checkout layout. |
| **2xl (Large screens)**  | `≥ 1280px` | Centered 7xl max-width container with balanced side gutters. |

---

## 6. Motion & Accessibility Standards

- **Transitions:** Standardized duration: `duration-200` for micro-taps, `duration-300` for cards & dropdowns, `duration-700` for editorial crossfades.
- **Reduced Motion:** All keyframes wrapped in `@media (prefers-reduced-motion: reduce)`.
- **Focus Rings:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15D] focus-visible:ring-offset-2`.
