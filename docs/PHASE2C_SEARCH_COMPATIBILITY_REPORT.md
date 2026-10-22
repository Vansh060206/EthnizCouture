# Ethniz Couture — Phase 2C: PostgreSQL & SQLite Case-Insensitive Search Compatibility Report

**Document Date:** October 17, 2026  
**Implementation Lead:** Principal Database Architect & Lead Backend Engineer  
**Status:** **PHASE 2C COMPLETE & VERIFIED**  
**Associated Baseline Audit:** [`docs/ARCHITECTURE_AUDIT.md`](file:///d:/ethnicotuire/docs/ARCHITECTURE_AUDIT.md)  
**Associated Webhook Report:** [`docs/PHASE2C_STRIPE_WEBHOOK_REPORT.md`](file:///d:/ethnicotuire/docs/PHASE2C_STRIPE_WEBHOOK_REPORT.md)  
**Associated Independent Verification:** [`docs/PHASE2B_INDEPENDENT_VERIFICATION.md`](file:///d:/ethnicotuire/docs/PHASE2B_INDEPENDENT_VERIFICATION.md)  

---

## 1. Executive Summary

Phase 2C Workstream B resolves the case-insensitive search disparity between the local development environment (SQLite) and the staging environment (Supabase PostgreSQL 17.11).

In SQLite, `LIKE` queries are case-insensitive by default for ASCII characters. In PostgreSQL, `LIKE` is strictly case-sensitive, meaning queries for `"lehenga"` return zero results for products titled `"Royal Silk Lehenga"`. Furthermore, Prisma's `mode: 'insensitive'` query filter cannot be statically applied across the codebase because Prisma throws an `Unknown argument mode: 'insensitive'` runtime error when running against SQLite.

### Key Accomplishments:
1. **Provider-Compatible Search Filter Abstraction:** Created [`server/src/utils/dbFilter.ts`](file:///d:/ethnicotuire/server/src/utils/dbFilter.ts) with `caseInsensitiveFilter()`, dynamically detecting whether the active Prisma runtime provider supports `QueryMode.insensitive`.
2. **Catalog & Admin Search Integration:** Integrated across [`server/src/controllers/productController.ts`](file:///d:/ethnicotuire/server/src/controllers/productController.ts) (product `name`, `sku`, `description`, `fabric`, `tags`, `size`, `color`) and [`server/src/controllers/adminController.ts`](file:///d:/ethnicotuire/server/src/controllers/adminController.ts) (admin products, inventory, orders, customer queries).
3. **Dual-Database Verification:**
   - **SQLite (`test.db`):** Queries for `lehenga`, `LEHENGA`, `LeHeNgA`, and `LeHeNgA ` returned identical counts without runtime crashes.
   - **PostgreSQL (Supabase Staging):** Queries for `lehenga`, `LEHENGA`, and `LeHeNgA` returned all **5** matching lehengas with `mode: 'insensitive'` (compared to 0 matches without mode).
4. **Preservation of Core Data:** Product names, SKUs, slugs, and customer records were preserved without casing mutations or denormalized lowercase columns.
5. **Preservation of Query Invariants:** Pagination (`page`, `limit`), sorting (`price`, `createdAt`), category filtering, and authorization guards remain completely intact.

---

## 2. Technical Audit & The Dual-Database Incompatibility Problem

### 2.1 Engine Behavioral Differences

| Feature | SQLite (Development / Tests) | PostgreSQL (Staging / Production) |
| :--- | :--- | :--- |
| **Default `LIKE` Matching** | Case-insensitive for ASCII strings | Strictly case-sensitive |
| **Prisma `mode: 'insensitive'`** | **UNSUPPORTED** (throws runtime query validation error) | **SUPPORTED** & required for case-insensitive matching |
| **Prisma Engine `QueryMode` Enum** | `undefined` | `{ default: 'default', insensitive: 'insensitive' }` |

### 2.2 Why Statically Hardcoding `mode: 'insensitive'` Fails
If a developer blindly writes:
```typescript
where: {
  name: { contains: search, mode: 'insensitive' }
}
```
The query succeeds in PostgreSQL staging, but immediately crashes in local development and automated testing on SQLite:
```
PrismaClientValidationError:
Invalid `prisma.product.findMany()` invocation:
Unknown argument `mode`. Available options are marked with ?.
```

Conversely, omitting `mode: 'insensitive'` causes catalog and admin searches to return empty results on PostgreSQL when users enter mixed-case queries.

---

## 3. Implementation: Provider-Compatible Filter Utility

### 3.1 Abstraction in [`server/src/utils/dbFilter.ts`](file:///d:/ethnicotuire/server/src/utils/dbFilter.ts)

We introduced an engine-agnostic filter builder that inspects Prisma's runtime query capabilities:

```typescript
import { Prisma } from '@prisma/client';

export type StringFilterType = 'contains' | 'startsWith' | 'endsWith' | 'equals';

/**
 * Generates an engine-compatible case-insensitive filter condition.
 * - On PostgreSQL: Emits { contains: value, mode: 'insensitive' }
 * - On SQLite: Emits { contains: value } (avoids runtime validation failure)
 */
export function caseInsensitiveFilter(
  value: string | undefined | null,
  matchType: StringFilterType = 'contains',
  prismaModule: any = Prisma
): Record<string, any> | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const filter: Record<string, any> = {
    [matchType]: value
  };

  // Dynamically inspect whether the active Prisma client engine supports QueryMode.insensitive
  if (prismaModule?.QueryMode?.insensitive) {
    filter.mode = 'insensitive';
  }

  return filter;
}
```

### 3.2 Product Controller Updates ([`server/src/controllers/productController.ts`](file:///d:/ethnicotuire/server/src/controllers/productController.ts))

Updated `getProducts` to use `caseInsensitiveFilter` for free-text search across multiple fields:

```typescript
if (search) {
  const searchTerm = String(search).trim();
  where.OR = [
    { name: caseInsensitiveFilter(searchTerm, 'contains') },
    { description: caseInsensitiveFilter(searchTerm, 'contains') },
    { sku: caseInsensitiveFilter(searchTerm, 'contains') },
    { tags: caseInsensitiveFilter(searchTerm, 'contains') },
    { fabric: caseInsensitiveFilter(searchTerm, 'contains') }
  ].filter(Boolean);
}

if (fabric) {
  where.fabric = caseInsensitiveFilter(String(fabric).trim(), 'equals');
}
```

### 3.3 Admin Controller Updates ([`server/src/controllers/adminController.ts`](file:///d:/ethnicotuire/server/src/controllers/adminController.ts))

Updated admin query pipelines:
- **`getAdminProducts`:** Product `name` and `sku` search.
- **`getAdminOrders`:** `orderNumber`, `customerName`, `customerEmail`, and `customerPhone` search.
- **`getAdminCustomers`:** `name`, `email`, and `phone` search.
- **`getInventory`:** Product `name` and `sku` filtering.

---

## 4. Verification & Evidence

### 4.1 SQLite Test Suite Output ([`server/test/stripe_webhook_and_search.test.ts`](file:///d:/ethnicotuire/server/test/stripe_webhook_and_search.test.ts))

```
# Subtest: B1.1: Product search handles mixed case queries identically (lehenga, LEHENGA, LeHeNgA)
# [INFO] HTTP GET /api/products?search=lehenga 200 [13.28ms]
# [INFO] HTTP GET /api/products?search=LEHENGA 200 [6.35ms]
# [INFO] HTTP GET /api/products?search=LeHeNgA 200 [6.5ms]
# [INFO] HTTP GET /api/products?search=LeHeNgA%20 200 [6.99ms]
ok 12 - B1.1: Product search handles mixed case queries identically (lehenga, LEHENGA, LeHeNgA)
  ---
  duration_ms: 54.9749
  type: 'test'
  ...
# Subtest: B1.2: Product search matches fabric in mixed case (velvet, VELVET)
# [INFO] HTTP GET /api/products?fabric=velvet 200 [6.67ms]
# [INFO] HTTP GET /api/products?fabric=VELVET 200 [6.16ms]
ok 13 - B1.2: Product search matches fabric in mixed case (velvet, VELVET)
  ---
  duration_ms: 23.1781
  type: 'test'
  ...
# Subtest: B1.3: Product pagination, sorting, and category filters are preserved with search
# [INFO] HTTP GET /api/products?search=lehenga&category=bridal-lehengas&sortBy=price&order=desc&page=1&limit=5 200 [29.06ms]
ok 14 - B1.3: Product pagination, sorting, and category filters are preserved with search
  ---
  duration_ms: 33.4697
  type: 'test'
```

### 4.2 Live Supabase PostgreSQL Staging Output ([`server/src/scripts/test_pg_search.ts`](file:///d:/ethnicotuire/server/src/scripts/test_pg_search.ts))

Executed against Supabase PostgreSQL 17.11 (`aws-0-ap-south-1.pooler.supabase.com:6543`):

```
Testing Supabase PostgreSQL search queries:
Query: "lehenga " -> WITH mode: 'insensitive': 5 items | WITHOUT mode: 0 items
Query: "LEHENGA " -> WITH mode: 'insensitive': 5 items | WITHOUT mode: 0 items
Query: "LeHeNgA " -> WITH mode: 'insensitive': 5 items | WITHOUT mode: 0 items
```

### 4.3 Staging PostgreSQL Test Suite Output (`npm run staging:test`)

```
TAP version 13
# ℹ️ Connected Database Engine: postgresql 17.11 on aarch64-unknown-linux-gnu, com... (Is PostgreSQL: true)
# Subtest: Phase 2B: Staging Database Migration & PostgreSQL Validation Suite
    ok 1 - 1. Snapshot Integrity: Verifies all 22 models and exact record counts in export
    ok 2 - 2. Order Financial Accuracy: Verifies zero arithmetic drift on orders
    ok 3 - 3. Foreign Key Integrity: Verifies 100% of parent-child relationships
    ok 4 - 4. Atomic Transaction and Rollback Isolation
    ok 5 - 5. Admin Aggregation Queries (PostgreSQL Compatibility)
    ok 6 - 6. Case-Insensitive Search on Staging PostgreSQL (lehenga, LEHENGA, LeHeNgA)
      ---
      duration_ms: 1993.6177
      type: 'test'
      ...
1..6
# tests 6
# suites 1
# pass 6
# fail 0
```

---

## 5. Summary of Files Changed

| File Path | Description of Change |
| :--- | :--- |
| [`server/src/utils/dbFilter.ts`](file:///d:/ethnicotuire/server/src/utils/dbFilter.ts) | Created provider-compatible `caseInsensitiveFilter` utility function. |
| [`server/src/controllers/productController.ts`](file:///d:/ethnicotuire/server/src/controllers/productController.ts) | Applied `caseInsensitiveFilter` to `name`, `sku`, `description`, `fabric`, `tags`, `size`, `color`. |
| [`server/src/controllers/adminController.ts`](file:///d:/ethnicotuire/server/src/controllers/adminController.ts) | Applied `caseInsensitiveFilter` to admin products, orders, inventory, and customers search. |
| [`server/test/stripe_webhook_and_search.test.ts`](file:///d:/ethnicotuire/server/test/stripe_webhook_and_search.test.ts) | Added automated test suite verifying mixed-case queries on SQLite. |
| [`server/test/postgres_staging_validation.test.ts`](file:///d:/ethnicotuire/server/test/postgres_staging_validation.test.ts) | Added Subtest 6 verifying case-insensitive queries on live Supabase PostgreSQL staging. |

---

## 6. Recommendations for Phase 3

1. **Trigram & Full-Text Search Indexes:** For high-volume product catalogs on PostgreSQL in Phase 3, consider adding `pg_trgm` GIN indexes on `Product.name` and `Product.description` for sub-millisecond substring queries.
2. **Preserve Current Abstraction:** Continue using `caseInsensitiveFilter` across any new search endpoints to maintain full parity between local SQLite development and cloud PostgreSQL staging.
