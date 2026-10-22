| Model | 1. Binary Backup (`dev_backup_phase2a.db`) | 2. JSON Snapshot (`dev_data_snapshot.json`) | 3. Live Supabase PostgreSQL | 4. Active SQLite (`dev.db`) | Migration Parity (1 vs 2 vs 3) |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`User`** | 2 | 2 | 2 | 2 | **✅ 100% PARITY** |
| **`Address`** | 2 | 2 | 2 | 2 | **✅ 100% PARITY** |
| **`Category`** | 8 | 8 | 8 | 8 | **✅ 100% PARITY** |
| **`Collection`** | 3 | 3 | 3 | 3 | **✅ 100% PARITY** |
| **`Product`** | 23 | 23 | 23 | 23 | **✅ 100% PARITY** |
| **`ProductImage`** | 46 | 46 | 46 | 46 | **✅ 100% PARITY** |
| **`ProductVariant`** | 0 | 0 | 0 | 0 | **✅ 100% PARITY** |
| **`Cart`** | 2 | 2 | 2 | 2 | **✅ 100% PARITY** |
| **`CartItem`** | 2 | 2 | 2 | 2 | **✅ 100% PARITY** |
| **`Wishlist`** | 0 | 0 | 0 | 0 | **✅ 100% PARITY** |
| **`Order`** | 29 | 29 | 29 | 41 | **✅ 100% PARITY** |
| **`OrderItem`** | 30 | 30 | 30 | 42 | **✅ 100% PARITY** |
| **`OrderStatusHistory`** | 40 | 40 | 40 | 55 | **✅ 100% PARITY** |
| **`Review`** | 5 | 5 | 5 | 5 | **✅ 100% PARITY** |
| **`Coupon`** | 3 | 3 | 3 | 3 | **✅ 100% PARITY** |
| **`Banner`** | 3 | 3 | 3 | 3 | **✅ 100% PARITY** |
| **`MediaAsset`** | 0 | 0 | 0 | 0 | **✅ 100% PARITY** |
| **`ContactMessage`** | 0 | 0 | 0 | 0 | **✅ 100% PARITY** |
| **`NewsletterSubscriber`** | 0 | 0 | 0 | 0 | **✅ 100% PARITY** |
| **`IdempotencyRecord`** | 7 | 7 | 7 | 10 | **✅ 100% PARITY** |
| **`BackgroundJob`** | 35 | 35 | 35 | 50 | **✅ 100% PARITY** |
| **`AuditLog`** | 28 | 28 | 28 | 40 | **✅ 100% PARITY** |
| **Total Rows** | **268** | **268** | **268** | **337** | **✅ 100% PARITY (0 Discrepancies)** |