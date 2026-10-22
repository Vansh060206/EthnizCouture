import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

// STRICT SAFETY GUARD: Prevent automated tests from EVER modifying dev.db or production
if (process.env.NODE_ENV === 'test') {
  const testDbPath = path.resolve(__dirname, '../prisma/test.db');
  const backupDbPath = path.resolve(__dirname, '../prisma/backup/dev_backup_phase2a.db');

  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('dev.db')) {
    process.env.DATABASE_URL = `file:${testDbPath}`;
  }

  // Auto-initialize test.db from clean baseline if it does not exist
  if (!fs.existsSync(testDbPath) && fs.existsSync(backupDbPath)) {
    fs.copyFileSync(backupDbPath, testDbPath);
  }
}

const databaseUrl = process.env.DATABASE_URL || '';
const isPostgres = databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');

let ClientClass: any = PrismaClient;
if (isPostgres) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient: PgClient } = require('./generated/pg-client');
    ClientClass = PgClient;
  } catch {
    ClientClass = PrismaClient;
  }
}

const prisma: PrismaClient = new ClientClass(
  databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined
) as PrismaClient;

export default prisma;

