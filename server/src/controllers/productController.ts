import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../prisma';
import { cacheService } from '../services/cacheService';
import { logger } from '../utils/logger';
import { caseInsensitiveFilter } from '../utils/dbFilter';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      category,
      gender,
      fabric,
      size,
      color,
      minPrice,
      maxPrice,
      inStock,
      collection,
      featured,
      bestSeller,
      newArrival,
      sort = 'featured',
      page = '1',
      limit = '12'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.max(1, Math.min(50, parseInt(limit as string, 10) || 12));
    const skip = (pageNum - 1) * take;

    // Generate deterministic cache key
    const queryString = JSON.stringify({
      search, category, gender, fabric, size, color, minPrice, maxPrice, inStock, collection, featured, bestSeller, newArrival, sort, pageNum, take
    });
    const queryHash = crypto.createHash('md5').update(queryString).digest('hex');
    const cacheKey = `products:list:${queryHash}`;

    const cachedResult = cacheService.get<any>(cacheKey);
    if (cachedResult) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=30');
      res.json(cachedResult);
      return;
    }

    const where: any = {
      isActive: true
    };

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: caseInsensitiveFilter(q) },
        { sku: caseInsensitiveFilter(q) },
        { description: caseInsensitiveFilter(q) },
        { tags: caseInsensitiveFilter(q) },
        { fabric: caseInsensitiveFilter(q) }
      ];
    }

    if (category) {
      where.category = {
        OR: [
          { slug: String(category) },
          { id: String(category) }
        ]
      };
    }

    if (collection) {
      where.collection = {
        OR: [
          { slug: String(collection) },
          { id: String(collection) }
        ]
      };
    }

    if (gender && gender !== 'ALL') {
      where.gender = String(gender).toUpperCase();
    }

    if (fabric) {
      where.fabric = caseInsensitiveFilter(String(fabric));
    }

    if (size) {
      where.availableSizes = caseInsensitiveFilter(String(size));
    }

    if (color) {
      where.availableColors = caseInsensitiveFilter(String(color));
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(String(minPrice));
      if (maxPrice) where.price.lte = parseFloat(String(maxPrice));
    }

    if (inStock === 'true') {
      where.stock = { gt: 0 };
    }

    if (featured === 'true') where.isFeatured = true;
    if (bestSeller === 'true') where.isBestSeller = true;
    if (newArrival === 'true') where.isNewArrival = true;

    // Sorting with indexed fields
    let orderBy: any = [{ isFeatured: 'desc' }, { createdAt: 'desc' }];
    if (sort === 'newest') {
      orderBy = [{ createdAt: 'desc' }];
    } else if (sort === 'price_asc') {
      orderBy = [{ price: 'asc' }];
    } else if (sort === 'price_desc') {
      orderBy = [{ price: 'desc' }];
    } else if (sort === 'bestselling') {
      orderBy = [{ isBestSeller: 'desc' }, { createdAt: 'desc' }];
    } else if (sort === 'rating' || sort === 'best_rated') {
      orderBy = [{ isBestSeller: 'desc' }, { createdAt: 'desc' }];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        take,
        skip,
        orderBy,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: {
            orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }]
          },
          reviews: {
            where: { status: 'APPROVED' },
            select: { rating: true }
          }
        }
      }),
      prisma.product.count({ where })
    ]);

    // Format products with computed rating
    const formattedProducts = products.map((product: any) => {
      const ratings = product.reviews.map((r: { rating: number }) => r.rating);
      const avgRating = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 5.0;
      const { reviews, ...rest } = product;
      return {
        ...rest,
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: ratings.length
      };
    });

    if (sort === 'best_rated' || sort === 'rating') {
      formattedProducts.sort((a: any, b: any) => b.rating - a.rating);
    }

    const result = {
      products: formattedProducts,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    };

    // Store in cache (60s TTL)
    cacheService.set(cacheKey, result, 60, ['products']);

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=30');
    res.json(result);
  } catch (error: any) {
    logger.error('getProducts error', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};

export const getProductBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = String(req.params.slug).trim();
    const cacheKey = `products:slug:${slug}`;

    const cached = cacheService.get<any>(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=30');
      res.json(cached);
      return;
    }

    const product = await prisma.product.findFirst({
      where: {
        OR: [{ slug }, { id: slug }]
      },
      include: {
        category: true,
        collection: true,
        images: {
          orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }]
        },
        variants: true,
        reviews: {
          where: { status: 'APPROVED' },
          include: {
            user: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    const ratings = product.reviews.map((r: { rating: number }) => r.rating);
    const avgRating = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 5.0;

    const ratingDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratings.forEach((r: number) => {
      if (ratingDistribution[r] !== undefined) {
        ratingDistribution[r]++;
      }
    });

    // Related products in the same category (indexed query)
    const relatedProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        isActive: true
      },
      take: 4,
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }]
        }
      }
    });

    const result = {
      product: {
        ...product,
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: ratings.length,
        ratingDistribution
      },
      relatedProducts
    };

    cacheService.set(cacheKey, result, 60, ['products']);

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=30');
    res.json(result);
  } catch (error: any) {
    logger.error('getProductBySlug error', error);
    res.status(500).json({ message: 'Failed to retrieve product details' });
  }
};

export const getFeaturedProducts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'products:featured';
    const cached = cacheService.get<any>(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=30');
      res.json(cached);
      return;
    }

    const products = await prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      take: 8,
      include: {
        category: true,
        images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] }
      }
    });

    const result = { products };
    cacheService.set(cacheKey, result, 60, ['products']);

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=30');
    res.json(result);
  } catch (error: any) {
    logger.error('getFeaturedProducts error', error);
    res.status(500).json({ message: 'Failed to fetch featured products' });
  }
};

export const getNewArrivals = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'products:new-arrivals';
    const cached = cacheService.get<any>(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=30');
      res.json(cached);
      return;
    }

    const products = await prisma.product.findMany({
      where: { isActive: true, isNewArrival: true },
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] }
      }
    });

    const result = { products };
    cacheService.set(cacheKey, result, 60, ['products']);

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=30');
    res.json(result);
  } catch (error: any) {
    logger.error('getNewArrivals error', error);
    res.status(500).json({ message: 'Failed to fetch new arrivals' });
  }
};

export const getBestSellers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'products:best-sellers';
    const cached = cacheService.get<any>(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=30');
      res.json(cached);
      return;
    }

    const products = await prisma.product.findMany({
      where: { isActive: true, isBestSeller: true },
      take: 8,
      include: {
        category: true,
        images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] }
      }
    });

    const result = { products };
    cacheService.set(cacheKey, result, 60, ['products']);

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=30');
    res.json(result);
  } catch (error: any) {
    logger.error('getBestSellers error', error);
    res.status(500).json({ message: 'Failed to fetch best sellers' });
  }
};
