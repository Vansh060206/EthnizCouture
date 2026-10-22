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
  const candidatePaths = [
    path.resolve(__dirname, './generated/pg-client'),
    path.resolve(__dirname, '../src/generated/pg-client'),
    path.resolve(process.cwd(), 'dist/generated/pg-client'),
    path.resolve(process.cwd(), 'src/generated/pg-client'),
    './generated/pg-client',
    '../src/generated/pg-client'
  ];

  let loaded = false;
  for (const candidate of candidatePaths) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PrismaClient: PgClient } = require(candidate);
      if (PgClient) {
        ClientClass = PgClient;
        loaded = true;
        break;
      }
    } catch {
      // Try next candidate
    }
  }

  if (!loaded) {
    console.warn('[PRISMA] Notice: Custom pg-client not found at standard candidate paths, falling back to @prisma/client');
    ClientClass = PrismaClient;
  }
}

const prisma: PrismaClient = new ClientClass(
  databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined
) as PrismaClient;

export default prisma;

