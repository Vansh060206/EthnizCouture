import { Request, Response } from 'express';
import prisma from '../prisma';
import { cacheService } from '../services/cacheService';
import { logger } from '../utils/logger';

export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'categories:all';
    const cached = cacheService.get<any>(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=60');
      res.json(cached);
      return;
    }

    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const result = { categories };
    cacheService.set(cacheKey, result, 120, ['categories']);

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=60');
    res.json(result);
  } catch (error: any) {
    logger.error('getCategories error', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

export const getCollections = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'collections:all';
    const cached = cacheService.get<any>(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=60');
      res.json(cached);
      return;
    }

    const collections = await prisma.collection.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const result = { collections };
    cacheService.set(cacheKey, result, 120, ['categories']);

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=60');
    res.json(result);
  } catch (error: any) {
    logger.error('getCollections error', error);
    res.status(500).json({ message: 'Failed to fetch collections' });
  }
};
