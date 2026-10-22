import fs from 'fs';
import path from 'path';

/**
 * Ethniz Couture — Test Database Setup & Isolation Script
 *
 * Ensures tests run on an isolated replica of the Phase 2A baseline (test.db)
 * and guarantees that the active development database (dev.db) is NEVER touched.
 */

export function setupTestDatabase(): void {
  const prismaDir = path.resolve(__dirname, '../../prisma');
  const backupDb = path.join(prismaDir, 'backup/dev_backup_phase2a.db');
  const testDb = path.join(prismaDir, 'test.db');
  const devDb = path.join(prismaDir, 'dev.db');

  if (!fs.existsSync(backupDb)) {
    throw new Error(`Baseline backup database not found at: ${backupDb}`);
  }

  // Preserve dev.db mtime and size for validation
  const devDbStatBefore = fs.existsSync(devDb) ? fs.statSync(devDb) : null;

  // Cleanly copy backup to test.db
  fs.copyFileSync(backupDb, testDb);

  // Clean up any stale SQLite journals for test.db
  const journalPath = path.join(prismaDir, 'test.db-journal');
  if (fs.existsSync(journalPath)) {
    try {
      fs.unlinkSync(journalPath);
    } catch {}
  }

  // Ensure test.db schema matches current Prisma models
  try {
    const { execFileSync } = require('child_process');
    const pyScript = `
import sqlite3
con = sqlite3.connect(r'${testDb}')
cur = con.cursor()
order_cols = [c[1] for c in cur.execute("PRAGMA table_info('Order')").fetchall()]
for col, col_type in [('carrierName', 'TEXT'), ('dispatchedAt', 'DATETIME'), ('deliveredAt', 'DATETIME'), ('internalNotes', 'TEXT')]:
    if col not in order_cols:
        cur.execute(f"ALTER TABLE 'Order' ADD COLUMN {col} {col_type}")

history_cols = [c[1] for c in cur.execute("PRAGMA table_info('OrderStatusHistory')").fetchall()]
for col, col_type, default in [('actorId', 'TEXT', None), ('source', 'TEXT', "'SYSTEM'")]:
    if col not in history_cols:
        def_clause = f" DEFAULT {default}" if default else ""
        cur.execute(f"ALTER TABLE 'OrderStatusHistory' ADD COLUMN {col} {col_type}{def_clause}")

user_col_map = dict([(c[1], c[3]) for c in cur.execute("PRAGMA table_info('User')").fetchall()])
user_cols = list(user_col_map.keys())
for col, col_type, default in [('googleId', 'TEXT', None), ('avatar', 'TEXT', None), ('welcomeEmailSent', 'BOOLEAN', '0'), ('welcomeEmailSentAt', 'DATETIME', None)]:
    if col not in user_cols:
        def_clause = f" DEFAULT {default}" if default else ""
        cur.execute(f"ALTER TABLE 'User' ADD COLUMN {col} {col_type}{def_clause}")
cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS 'User_googleId_key' ON 'User'('googleId')")

if user_col_map.get('passwordHash') == 1:
    cur.execute("PRAGMA foreign_keys=OFF")
    cur.execute("BEGIN TRANSACTION")
    cur.execute('''
        CREATE TABLE new_User (
            id TEXT NOT NULL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            passwordHash TEXT,
            phone TEXT,
            role TEXT NOT NULL DEFAULT 'CUSTOMER',
            googleId TEXT,
            avatar TEXT,
            welcomeEmailSent BOOLEAN NOT NULL DEFAULT 0,
            welcomeEmailSentAt DATETIME,
            createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME NOT NULL
        )
    ''')
    cur.execute('''
        INSERT INTO new_User (id, name, email, passwordHash, phone, role, googleId, avatar, welcomeEmailSent, welcomeEmailSentAt, createdAt, updatedAt)
        SELECT id, name, email, passwordHash, phone, role, googleId, avatar, coalesce(welcomeEmailSent, 0), welcomeEmailSentAt, createdAt, updatedAt FROM User
    ''')
    cur.execute("DROP TABLE User")
    cur.execute("ALTER TABLE new_User RENAME TO User")
    cur.execute("CREATE UNIQUE INDEX User_email_key ON User(email)")
    cur.execute("CREATE INDEX IF NOT EXISTS User_role_idx ON User(role)")
    cur.execute("CREATE UNIQUE INDEX User_googleId_key ON User(googleId)")
    cur.execute("COMMIT")
    cur.execute("PRAGMA foreign_keys=ON")

cur.execute('''
    CREATE TABLE IF NOT EXISTS PasswordReset (
        id TEXT NOT NULL PRIMARY KEY,
        email TEXT NOT NULL,
        otpHash TEXT NOT NULL,
        expiresAt DATETIME NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        used BOOLEAN NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
''')
cur.execute("CREATE INDEX IF NOT EXISTS PasswordReset_email_used_idx ON PasswordReset(email, used)")
cur.execute("CREATE INDEX IF NOT EXISTS PasswordReset_expiresAt_idx ON PasswordReset(expiresAt)")

con.commit()
con.close()
`;
    execFileSync('python', ['-c', pyScript]);
  } catch (err: any) {
    console.error('Warning: could not verify schema extensions on test.db', err.message);
  }

  // Verify dev.db was untouched
  if (devDbStatBefore && fs.existsSync(devDb)) {
    const devDbStatAfter = fs.statSync(devDb);
    if (devDbStatBefore.mtimeMs !== devDbStatAfter.mtimeMs) {
      throw new Error('CRITICAL SAFETY FAILURE: dev.db was modified during test database setup!');
    }
  }

  const testStat = fs.statSync(testDb);
  console.log(`✅ Isolated test database ready at: ${testDb} (${testStat.size} bytes cloned from dev_backup_phase2a.db)`);
}

if (require.main === module) {
  setupTestDatabase();
}
