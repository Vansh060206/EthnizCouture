import { Prisma } from '@prisma/client';

/**
 * Ethniz Couture — Provider-Compatible Case-Insensitive Filter
 *
 * Ensures consistent search behavior across database providers:
 * - In PostgreSQL (Supabase staging & production): Uses `mode: 'insensitive'` for ILIKE matching.
 * - In SQLite (local dev & test): Omits `mode` to prevent Prisma schema validation errors,
 *   relying on SQLite's native case-insensitive LIKE operator for ASCII strings.
 *
 * @param value The search term to match
 * @param type The matching type ('contains', 'startsWith', 'endsWith')
 * @param prismaModule Optional Prisma namespace for custom/generated clients
 */
export function caseInsensitiveFilter(
  value: string,
  type: 'contains' | 'startsWith' | 'endsWith' = 'contains',
  prismaModule: any = Prisma
): any {
  if (prismaModule?.QueryMode?.insensitive) {
    return {
      [type]: value,
      mode: 'insensitive'
    };
  }

  return {
    [type]: value
  };
}
