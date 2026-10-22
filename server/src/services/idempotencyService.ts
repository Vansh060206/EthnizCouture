import prisma from '../prisma';
import { logger } from '../utils/logger';

export const idempotencyService = {
  async getRecord(key: string) {
    try {
      const record = await prisma.idempotencyRecord.findUnique({
        where: { key }
      });

      if (!record) return null;

      if (new Date() > record.expiresAt) {
        // Expired record, delete asynchronously
        prisma.idempotencyRecord.delete({ where: { id: record.id } }).catch(() => {});
        return null;
      }

      return {
        statusCode: record.statusCode,
        body: JSON.parse(record.responseBody),
        resourceId: record.resourceId
      };
    } catch (error) {
      logger.error('Failed to lookup idempotency record', error, { key });
      return null;
    }
  },

  async saveRecord(key: string, resourceType: string, resourceId: string | null, statusCode: number, responseBody: any) {
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await prisma.idempotencyRecord.upsert({
        where: { key },
        create: {
          key,
          resourceType,
          resourceId,
          statusCode,
          responseBody: JSON.stringify(responseBody),
          expiresAt
        },
        update: {
          statusCode,
          responseBody: JSON.stringify(responseBody),
          expiresAt
        }
      });
    } catch (error) {
      logger.error('Failed to save idempotency record', error, { key, resourceType });
    }
  }
};
