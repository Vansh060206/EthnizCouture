import { Request, Response } from 'express';
import slugify from 'slugify';
import prisma from '../prisma';
import fs from 'fs';
import path from 'path';
import { cacheService } from '../services/cacheService';
import { logger } from '../utils/logger';
import { caseInsensitiveFilter } from '../utils/dbFilter';
import { emailService } from '../services/emailService';

// --- DASHBOARD ANALYTICS (MEMORY BOUNDED & AGGREGATED) ---
export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [
      totalProducts,
      lowStockProducts,
      totalOrders,
      pendingOrders,
      paidRevenueAggregate,
      totalCustomers,
      totalReviews,
      recentOrders,
      recentOrdersForRevenue
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { stock: { lte: 5 } } }),
      prisma.order.count(),
      prisma.order.count({ where: { orderStatus: { in: ['PENDING', 'PROCESSING'] } } }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: 'PAID' }
      }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.review.count(),
      prisma.order.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          user: { select: { name: true, email: true } }
        }
      }),
      // Bound monthly revenue to last 6 months instead of loading all historical orders into memory
      prisma.order.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: {
          totalAmount: true,
          paymentStatus: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    const totalRevenue = paidRevenueAggregate._sum.totalAmount || 0;

    // Sales by Category (Bounded query)
    const categoriesWithCount = await prisma.category.findMany({
      take: 10,
      include: {
        products: {
          take: 20,
          select: {
            id: true,
            orderItems: { select: { quantity: true, total: true } }
          }
        }
      }
    });

    const categorySales = categoriesWithCount.map((cat: any) => {
      const totalUnits = cat.products.reduce(
        (acc: number, p: any) => acc + p.orderItems.reduce((iAcc: number, item: any) => iAcc + item.quantity, 0),
        0
      );
      const totalRev = cat.products.reduce(
        (acc: number, p: any) => acc + p.orderItems.reduce((iAcc: number, item: any) => iAcc + item.total, 0),
        0
      );
      return {
        id: cat.id,
        name: cat.name,
        unitsSold: totalUnits,
        revenue: totalRev
      };
    });

    // Top selling products (Indexed bounded query)
    const topProducts = await prisma.product.findMany({
      take: 5,
      include: {
        images: { where: { isPrimary: true } },
        orderItems: { select: { quantity: true, total: true } }
      }
    });

    const formattedTopProducts = topProducts
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        stock: p.stock,
        image: p.images[0]?.url || null,
        totalUnitsSold: p.orderItems.reduce((a: number, b: any) => a + b.quantity, 0),
        revenue: p.orderItems.reduce((a: number, b: any) => a + b.total, 0)
      }))
      .sort((a: any, b: any) => b.totalUnitsSold - a.totalUnitsSold);

    // Monthly revenue breakdown (Computed on bounded 6-month window)
    const monthlyRevenue: Record<string, number> = {};
    recentOrdersForRevenue.forEach((o: any) => {
      const month = new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (o.paymentStatus === 'PAID' ? o.totalAmount : 0);
    });

    res.json({
      metrics: {
        totalRevenue: Math.round(totalRevenue),
        totalOrders,
        pendingOrders,
        totalCustomers,
        totalProducts,
        lowStockProducts,
        totalReviews
      },
      categorySales,
      topProducts: formattedTopProducts,
      recentOrders,
      monthlyRevenue
    });
  } catch (error: any) {
    logger.error('getDashboardStats error', error);
    res.status(500).json({ message: 'Failed to compute dashboard analytics' });
  }
};

// --- PRODUCT MANAGEMENT ---
export const getAdminProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, category, stockStatus, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: caseInsensitiveFilter(q) },
        { sku: caseInsensitiveFilter(q) },
        { description: caseInsensitiveFilter(q) }
      ];
    }

    if (category && category !== 'ALL') {
      where.categoryId = String(category);
    }

    if (stockStatus === 'OUT_OF_STOCK') {
      where.stock = 0;
    } else if (stockStatus === 'LOW_STOCK') {
      where.stock = { gt: 0, lte: 5 };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] }
        }
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      products,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error: any) {
    logger.error('getAdminProducts error', error);
    res.status(500).json({ message: 'Failed to retrieve admin products' });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      description,
      details,
      fabric,
      careInstructions,
      gender = 'WOMEN',
      categoryId,
      collectionId,
      price,
      comparePrice,
      stock = 10,
      isFeatured = false,
      isBestSeller = false,
      isNewArrival = true,
      isActive = true,
      tags,
      availableSizes = 'XS,S,M,L,XL,XXL',
      availableColors,
      images = []
    } = req.body;

    if (!name || price === undefined || !categoryId) {
      res.status(400).json({ message: 'Product name, price, and category are required' });
      return;
    }

    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const skuPrefix = name.substring(0, 3).toUpperCase();
    const randomSku = Math.floor(1000 + Math.random() * 9000);
    const sku = req.body.sku || `EC-${skuPrefix}-${randomSku}`;

    const numPrice = parseFloat(price);
    const numCompare = comparePrice ? parseFloat(comparePrice) : null;
    const discountPercent = numCompare && numCompare > numPrice ? Math.round(((numCompare - numPrice) / numCompare) * 100) : 0;

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        slug,
        sku,
        description: description?.trim() || '',
        details: details?.trim() || null,
        fabric: fabric?.trim() || null,
        careInstructions: careInstructions?.trim() || null,
        gender,
        categoryId: String(categoryId),
        collectionId: collectionId ? String(collectionId) : null,
        price: numPrice,
        comparePrice: numCompare,
        discountPercent,
        stock: parseInt(String(stock), 10) || 0,
        isFeatured: Boolean(isFeatured),
        isBestSeller: Boolean(isBestSeller),
        isNewArrival: Boolean(isNewArrival),
        isActive: Boolean(isActive),
        tags: tags ? String(tags) : null,
        availableSizes: availableSizes ? String(availableSizes) : 'XS,S,M,L,XL,XXL',
        availableColors: availableColors ? String(availableColors) : null,
        images: {
          create: images.map((img: any, idx: number) => ({
            url: img.url,
            altText: img.altText || name,
            isPrimary: img.isPrimary !== undefined ? img.isPrimary : idx === 0,
            order: img.order || idx
          }))
        }
      },
      include: {
        category: true,
        images: true
      }
    });

    // Invalidate public catalogue cache
    cacheService.invalidateTag('products');

    await prisma.auditLog.create({
      data: {
        action: 'CREATE_PRODUCT',
        entity: 'PRODUCT',
        entityId: product.id,
        details: JSON.stringify({ name: product.name, price: product.price, stock: product.stock })
      }
    });

    res.status(201).json({ message: 'Product created successfully', product });
  } catch (error: any) {
    logger.error('createProduct error', error);
    res.status(500).json({ message: 'Failed to create product' });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const {
      name,
      sku,
      description,
      details,
      fabric,
      careInstructions,
      gender,
      categoryId,
      collectionId,
      price,
      comparePrice,
      stock,
      isFeatured,
      isBestSeller,
      isNewArrival,
      isActive,
      tags,
      availableSizes,
      availableColors,
      images
    } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    const numPrice = price !== undefined ? parseFloat(price) : existing.price;
    const numCompare = comparePrice !== undefined ? (comparePrice ? parseFloat(comparePrice) : null) : existing.comparePrice;
    const discountPercent = numCompare && numCompare > numPrice ? Math.round(((numCompare - numPrice) / numCompare) * 100) : 0;

    if (images && Array.isArray(images)) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
      await prisma.productImage.createMany({
        data: images.map((img: any, idx: number) => ({
          productId: id,
          url: img.url,
          altText: img.altText || existing.name,
          isPrimary: img.isPrimary !== undefined ? img.isPrimary : idx === 0,
          order: img.order || idx
        }))
      });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        sku: sku ? sku.trim() : undefined,
        description: description !== undefined ? description.trim() : undefined,
        details: details !== undefined ? details.trim() : undefined,
        fabric: fabric !== undefined ? fabric.trim() : undefined,
        careInstructions: careInstructions !== undefined ? careInstructions.trim() : undefined,
        gender: gender || undefined,
        categoryId: categoryId ? String(categoryId) : undefined,
        collectionId: collectionId !== undefined ? (collectionId ? String(collectionId) : null) : undefined,
        price: numPrice,
        comparePrice: numCompare,
        discountPercent,
        stock: stock !== undefined ? parseInt(String(stock), 10) : undefined,
        isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : undefined,
        isBestSeller: isBestSeller !== undefined ? Boolean(isBestSeller) : undefined,
        isNewArrival: isNewArrival !== undefined ? Boolean(isNewArrival) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        tags: tags !== undefined ? String(tags) : undefined,
        availableSizes: availableSizes !== undefined ? String(availableSizes) : undefined,
        availableColors: availableColors !== undefined ? String(availableColors) : undefined
      },
      include: {
        category: true,
        images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] }
      }
    });

    // Invalidate public product cache
    cacheService.invalidateTag('products');

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_PRODUCT',
        entity: 'PRODUCT',
        entityId: updated.id,
        details: JSON.stringify({ name: updated.name, price: updated.price, stock: updated.stock })
      }
    });

    res.json({ message: 'Product updated successfully', product: updated });
  } catch (error: any) {
    logger.error('updateProduct error', error);
    res.status(500).json({ message: 'Failed to update product' });
  }
};

export const duplicateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const source = await prisma.product.findUnique({
      where: { id },
      include: { images: true }
    });

    if (!source) {
      res.status(404).json({ message: 'Source product not found' });
      return;
    }

    const newName = `${source.name} (Copy)`;
    const baseSlug = slugify(newName, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const sku = `EC-DUP-${Math.floor(10000 + Math.random() * 90000)}`;

    const duplicate = await prisma.product.create({
      data: {
        name: newName,
        slug,
        sku,
        description: source.description,
        details: source.details,
        fabric: source.fabric,
        careInstructions: source.careInstructions,
        gender: source.gender,
        categoryId: source.categoryId,
        collectionId: source.collectionId,
        price: source.price,
        comparePrice: source.comparePrice,
        discountPercent: source.discountPercent,
        stock: source.stock,
        isFeatured: false,
        isBestSeller: false,
        isNewArrival: true,
        isActive: false,
        tags: source.tags,
        availableSizes: source.availableSizes,
        availableColors: source.availableColors,
        images: {
          create: source.images.map((img: any) => ({
            url: img.url,
            altText: img.altText,
            isPrimary: img.isPrimary,
            order: img.order
          }))
        }
      },
      include: {
        images: true,
        category: true
      }
    });

    cacheService.invalidateTag('products');

    res.status(201).json({ message: 'Product duplicated successfully', product: duplicate });
  } catch (error: any) {
    logger.error('duplicateProduct error', error);
    res.status(500).json({ message: 'Failed to duplicate product' });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.product.delete({ where: { id } });
    cacheService.invalidateTag('products');
    res.json({ message: 'Product deleted permanently' });
  } catch (error: any) {
    logger.error('deleteProduct error', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
};

// --- INVENTORY MANAGEMENT ---
export const getInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, lowStockOnly, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: caseInsensitiveFilter(String(search)) },
        { sku: caseInsensitiveFilter(String(search)) }
      ];
    }
    if (lowStockOnly === 'true') {
      where.stock = { lte: 5 };
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        take,
        skip,
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          price: true,
          gender: true,
          isActive: true,
          category: { select: { name: true } },
          images: { where: { isPrimary: true }, select: { url: true } }
        },
        orderBy: { stock: 'asc' }
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      inventory: items,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error: any) {
    logger.error('getInventory error', error);
    res.status(500).json({ message: 'Failed to retrieve inventory' });
  }
};

export const updateStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { stock } = req.body;
    const newStock = parseInt(String(stock), 10);

    if (isNaN(newStock) || newStock < 0) {
      res.status(400).json({ message: 'Stock must be a non-negative integer' });
      return;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { stock: newStock }
    });

    cacheService.invalidateTag('products');

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_STOCK',
        entity: 'PRODUCT',
        entityId: id,
        details: JSON.stringify({ newStock })
      }
    });

    res.json({ message: 'Stock updated', product: updated });
  } catch (error: any) {
    logger.error('updateStock error', error);
    res.status(500).json({ message: 'Failed to update stock' });
  }
};

// --- ORDER & FULFILMENT MANAGEMENT ---
import { orderFulfilmentService, FulfilmentActionType } from '../services/orderFulfilmentService';

export const getFulfilmentStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await orderFulfilmentService.getFulfilmentQueueCounts();
    res.json({ stats });
  } catch (error: any) {
    logger.error('getFulfilmentStats error', error);
    res.status(500).json({ message: 'Failed to retrieve fulfilment statistics' });
  }
};

export const getAdminOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      status,
      paymentStatus,
      dateRange,
      sortBy = 'date_desc',
      page = '1',
      limit = '20'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * take;

    const where: any = {};

    // 1. Fulfilment queue / status filtering
    if (status && status !== 'ALL') {
      const st = String(status).toUpperCase();
      if (st === 'NEW') {
        where.orderStatus = 'PENDING';
      } else if (st === 'IN_TRANSIT') {
        where.orderStatus = { in: ['SHIPPED', 'OUT_FOR_DELIVERY'] };
      } else if (st === 'RETURNED') {
        where.orderStatus = { in: ['RETURN_APPROVED', 'RETURNED'] };
      } else {
        where.orderStatus = st;
      }
    }

    // 2. Payment status filter
    if (paymentStatus && paymentStatus !== 'ALL') {
      where.paymentStatus = String(paymentStatus).toUpperCase();
    }

    // 3. Date range filter
    if (dateRange && dateRange !== 'ALL') {
      const now = new Date();
      if (dateRange === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        where.createdAt = { gte: startOfDay };
      } else if (dateRange === 'last7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        where.createdAt = { gte: sevenDaysAgo };
      } else if (dateRange === 'last30days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        where.createdAt = { gte: thirtyDaysAgo };
      }
    }

    // 4. Multi-field search
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { orderNumber: caseInsensitiveFilter(q) },
        { customerName: caseInsensitiveFilter(q) },
        { customerEmail: caseInsensitiveFilter(q) },
        { customerPhone: caseInsensitiveFilter(q) },
        { trackingNumber: caseInsensitiveFilter(q) }
      ];
    }

    // 5. Sorting
    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'date_asc') orderBy = { createdAt: 'asc' };
    else if (sortBy === 'amount_desc') orderBy = { totalAmount: 'desc' };
    else if (sortBy === 'amount_asc') orderBy = { totalAmount: 'asc' };

    const [orders, total, queueStats] = await Promise.all([
      prisma.order.findMany({
        where,
        take,
        skip,
        orderBy,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  stock: true,
                  availableSizes: true,
                  availableColors: true
                }
              }
            }
          },
          statusHistory: {
            orderBy: { createdAt: 'desc' }
          },
          user: { select: { id: true, name: true, email: true, phone: true } }
        }
      }),
      prisma.order.count({ where }),
      orderFulfilmentService.getFulfilmentQueueCounts()
    ]);

    res.json({
      orders,
      queueStats,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error: any) {
    logger.error('getAdminOrders error', error);
    res.status(500).json({ message: 'Failed to retrieve orders' });
  }
};

/**
 * Authoritative admin fulfilment transition execution endpoint
 * POST /api/admin/orders/:id/fulfilment-action
 */
export const executeFulfilmentAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const adminUser = (req as any).user;
    const adminId = adminUser?.id || 'admin_operator';

    const {
      action,
      expectedStatus,
      expectedUpdatedAt,
      carrierName,
      trackingNumber,
      dispatchedAt,
      estimatedDelivery,
      customerNotes,
      internalNotes,
      cancellationReason,
      codCollected,
      returnResolution,
      returnRejectionReason,
      refundAmount,
      restoreStockOnReturn
    } = req.body;

    if (!action) {
      res.status(400).json({ success: false, message: 'Fulfilment action type is required' });
      return;
    }

    const result = await orderFulfilmentService.executeTransition({
      orderId: id,
      adminId,
      action: action as FulfilmentActionType,
      expectedStatus,
      expectedUpdatedAt,
      carrierName,
      trackingNumber,
      dispatchedAt,
      estimatedDelivery,
      customerNotes,
      internalNotes,
      cancellationReason,
      codCollected,
      returnResolution,
      returnRejectionReason,
      refundAmount,
      restoreStockOnReturn
    });

    res.status(result.statusCode).json(result);
  } catch (error: any) {
    logger.error('executeFulfilmentAction error', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute fulfilment action'
    });
  }
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const adminUser = (req as any).user;
    const adminId = adminUser?.id || 'admin_operator';
    const { orderStatus, trackingNumber, carrierName, notes, internalNotes, cancellationReason } = req.body;

    // Map legacy direct status update to authoritative state machine action
    let mappedAction: FulfilmentActionType | undefined;
    switch (orderStatus) {
      case 'CONFIRMED':
        mappedAction = 'CONFIRM_ORDER';
        break;
      case 'PROCESSING':
        mappedAction = 'START_PREPARATION';
        break;
      case 'PACKED':
        mappedAction = 'MARK_PACKED';
        break;
      case 'SHIPPED':
        mappedAction = 'DISPATCH_ORDER';
        break;
      case 'OUT_FOR_DELIVERY':
        mappedAction = 'MARK_OUT_FOR_DELIVERY';
        break;
      case 'DELIVERED':
        mappedAction = 'CONFIRM_DELIVERY';
        break;
      case 'CANCELLED':
        mappedAction = 'CANCEL_ORDER';
        break;
    }

    if (mappedAction) {
      const result = await orderFulfilmentService.executeTransition({
        orderId: id,
        adminId,
        action: mappedAction,
        carrierName: carrierName || (trackingNumber ? 'Standard Express' : undefined),
        trackingNumber,
        customerNotes: notes,
        internalNotes,
        cancellationReason: cancellationReason || notes || 'Administrative status adjustment'
      });
      res.status(result.statusCode).json(result);
      return;
    }

    // If only tracking or notes were updated without changing status
    if (trackingNumber || carrierName) {
      const result = await orderFulfilmentService.executeTransition({
        orderId: id,
        adminId,
        action: 'UPDATE_TRACKING',
        carrierName,
        trackingNumber,
        customerNotes: notes,
        internalNotes
      });
      res.status(result.statusCode).json(result);
      return;
    }

    res.status(400).json({ success: false, message: 'No valid fulfilment change specified' });
  } catch (error: any) {
    logger.error('updateOrderStatus error', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
};

// --- CUSTOMER MANAGEMENT ---
export const getAdminCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * take;

    const where: any = { role: 'CUSTOMER' };
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: caseInsensitiveFilter(q) },
        { email: caseInsensitiveFilter(q) },
        { phone: caseInsensitiveFilter(q) }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take,
        skip,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          orders: {
            take: 10,
            select: {
              id: true,
              totalAmount: true,
              createdAt: true,
              orderStatus: true,
              paymentStatus: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    const customers = users.map((user: any) => {
      const totalSpent = user.orders
        .filter((o: any) => o.paymentStatus === 'PAID')
        .reduce((sum: number, o: any) => sum + o.totalAmount, 0);
      const lastOrder = user.orders.length > 0 ? user.orders[0].createdAt : null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        joinedAt: user.createdAt,
        orderCount: user.orders.length,
        totalSpent: Math.round(totalSpent),
        lastOrderDate: lastOrder,
        recentOrders: user.orders.slice(0, 3)
      };
    });

    res.json({
      customers,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error: any) {
    logger.error('getAdminCustomers error', error);
    res.status(500).json({ message: 'Failed to retrieve customers' });
  }
};

// --- REVIEW MANAGEMENT ---
export const getAdminReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, rating, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = String(status);
    }
    if (rating) {
      where.rating = parseInt(String(rating), 10);
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        take,
        skip,
        include: {
          product: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.review.count({ where })
    ]);

    res.json({
      reviews,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error: any) {
    logger.error('getAdminReviews error', error);
    res.status(500).json({ message: 'Failed to retrieve reviews' });
  }
};

export const updateReviewStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status } = req.body;

    const updated = await prisma.review.update({
      where: { id },
      data: { status }
    });

    cacheService.invalidateTag('products');

    res.json({ message: `Review status updated to ${status}`, review: updated });
  } catch (error: any) {
    logger.error('updateReviewStatus error', error);
    res.status(500).json({ message: 'Failed to update review' });
  }
};

export const deleteReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.review.delete({ where: { id } });
    cacheService.invalidateTag('products');
    res.json({ message: 'Review deleted successfully' });
  } catch (error: any) {
    logger.error('deleteReview error', error);
    res.status(500).json({ message: 'Failed to delete review' });
  }
};

// --- CATEGORY & COLLECTION CRUD ---
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, image, featured = false } = req.body;
    if (!name) {
      res.status(400).json({ message: 'Category name is required' });
      return;
    }

    const slug = slugify(name, { lower: true, strict: true });
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        image: image || null,
        featured: Boolean(featured)
      }
    });

    cacheService.invalidateTag('categories');
    cacheService.invalidateTag('products');

    res.status(201).json({ message: 'Category created', category });
  } catch (error: any) {
    logger.error('createCategory error', error);
    res.status(500).json({ message: 'Failed to create category' });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, description, image, featured } = req.body;

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        description: description !== undefined ? description?.trim() : undefined,
        image: image !== undefined ? image : undefined,
        featured: featured !== undefined ? Boolean(featured) : undefined
      }
    });

    cacheService.invalidateTag('categories');
    cacheService.invalidateTag('products');

    res.json({ message: 'Category updated', category: updated });
  } catch (error: any) {
    logger.error('updateCategory error', error);
    res.status(500).json({ message: 'Failed to update category' });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.category.delete({ where: { id } });
    cacheService.invalidateTag('categories');
    cacheService.invalidateTag('products');
    res.json({ message: 'Category deleted' });
  } catch (error: any) {
    logger.error('deleteCategory error', error);
    res.status(500).json({ message: 'Failed to delete category' });
  }
};

// --- COUPON CRUD ---
export const getAdminCoupons = async (_req: Request, res: Response): Promise<void> => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ coupons });
  } catch (error: any) {
    logger.error('getAdminCoupons error', error);
    res.status(500).json({ message: 'Failed to retrieve coupons' });
  }
};

export const createCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, discountType, discountValue, minOrderValue = 0, maxDiscount, expiryDate, usageLimit, isActive = true } = req.body;

    if (!code || discountValue === undefined) {
      res.status(400).json({ message: 'Coupon code and discount value are required' });
      return;
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        discountType: discountType || 'PERCENTAGE',
        discountValue: parseFloat(discountValue),
        minOrderValue: parseFloat(minOrderValue) || 0,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        usageLimit: usageLimit ? parseInt(String(usageLimit), 10) : null,
        isActive: Boolean(isActive)
      }
    });

    res.status(201).json({ message: 'Coupon created successfully', coupon });
  } catch (error: any) {
    logger.error('createCoupon error', error);
    res.status(500).json({ message: 'Failed to create coupon' });
  }
};

export const updateCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { discountValue, minOrderValue, maxDiscount, expiryDate, usageLimit, isActive } = req.body;

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        discountValue: discountValue !== undefined ? parseFloat(discountValue) : undefined,
        minOrderValue: minOrderValue !== undefined ? parseFloat(minOrderValue) : undefined,
        maxDiscount: maxDiscount !== undefined ? (maxDiscount ? parseFloat(maxDiscount) : null) : undefined,
        expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : undefined,
        usageLimit: usageLimit !== undefined ? (usageLimit ? parseInt(String(usageLimit), 10) : null) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined
      }
    });

    res.json({ message: 'Coupon updated successfully', coupon: updated });
  } catch (error: any) {
    logger.error('updateCoupon error', error);
    res.status(500).json({ message: 'Failed to update coupon' });
  }
};

export const deleteCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.coupon.delete({ where: { id } });
    res.json({ message: 'Coupon deleted' });
  } catch (error: any) {
    logger.error('deleteCoupon error', error);
    res.status(500).json({ message: 'Failed to delete coupon' });
  }
};

// --- CONTENT & BANNER MANAGEMENT ---
export const getAdminBanners = async (_req: Request, res: Response): Promise<void> => {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: [{ key: 'asc' }, { order: 'asc' }]
    });
    res.json({ banners });
  } catch (error: any) {
    logger.error('getAdminBanners error', error);
    res.status(500).json({ message: 'Failed to retrieve banners' });
  }
};

export const createBanner = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, title, subtitle, buttonText, buttonLink, imageUrl, tag, order = 0, isActive = true } = req.body;

    if (!key || !title) {
      res.status(400).json({ message: 'Key and title are required' });
      return;
    }

    const banner = await prisma.banner.create({
      data: {
        key,
        title: title.trim(),
        subtitle: subtitle?.trim() || null,
        buttonText: buttonText?.trim() || null,
        buttonLink: buttonLink?.trim() || null,
        imageUrl: imageUrl || null,
        tag: tag || null,
        order: parseInt(String(order), 10) || 0,
        isActive: Boolean(isActive)
      }
    });

    cacheService.invalidateTag('banners');

    res.status(201).json({ message: 'Banner created successfully', banner });
  } catch (error: any) {
    logger.error('createBanner error', error);
    res.status(500).json({ message: 'Failed to create banner' });
  }
};

export const updateBanner = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { title, subtitle, buttonText, buttonLink, imageUrl, tag, order, isActive } = req.body;

    const updated = await prisma.banner.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        subtitle: subtitle !== undefined ? subtitle.trim() : undefined,
        buttonText: buttonText !== undefined ? buttonText.trim() : undefined,
        buttonLink: buttonLink !== undefined ? buttonLink.trim() : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        tag: tag !== undefined ? tag : undefined,
        order: order !== undefined ? parseInt(String(order), 10) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined
      }
    });

    cacheService.invalidateTag('banners');

    res.json({ message: 'Banner updated successfully', banner: updated });
  } catch (error: any) {
    logger.error('updateBanner error', error);
    res.status(500).json({ message: 'Failed to update banner' });
  }
};

export const deleteBanner = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.banner.delete({ where: { id } });
    cacheService.invalidateTag('banners');
    res.json({ message: 'Banner deleted' });
  } catch (error: any) {
    logger.error('deleteBanner error', error);
    res.status(500).json({ message: 'Failed to delete banner' });
  }
};

// --- MEDIA ASSET LIBRARY ---
export const getMediaAssets = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '30' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 30));
    const skip = (pageNum - 1) * take;

    const [media, total] = await Promise.all([
      prisma.mediaAsset.findMany({
        take,
        skip,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.mediaAsset.count()
    ]);

    res.json({
      media,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error: any) {
    logger.error('getMediaAssets error', error);
    res.status(500).json({ message: 'Failed to retrieve media assets' });
  }
};

export const uploadMediaAsset = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const url = `/uploads/${file.filename}`;

    const asset = await prisma.mediaAsset.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        url,
        size: file.size,
        mimeType: file.mimetype
      }
    });

    res.status(201).json({ message: 'Media asset uploaded successfully', asset, url });
  } catch (error: any) {
    logger.error('uploadMediaAsset error', error);
    res.status(500).json({ message: 'Failed to upload media asset' });
  }
};

export const deleteMediaAsset = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) {
      res.status(404).json({ message: 'Media asset not found' });
      return;
    }

    const filePath = path.join(__dirname, '../../uploads', asset.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkErr) {
        logger.warn('Failed to delete media file from disk', { filePath });
      }
    }

    await prisma.mediaAsset.delete({ where: { id } });
    res.json({ message: 'Media asset removed' });
  } catch (error: any) {
    logger.error('deleteMediaAsset error', error);
    res.status(500).json({ message: 'Failed to delete media asset' });
  }
};

// --- CONTACT INQUIRIES MANAGEMENT ---

export const getAdminInquiries = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '20',
      status = 'ALL',
      search = ''
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * take;

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = String(status).toUpperCase();
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: caseInsensitiveFilter(q) },
        { email: caseInsensitiveFilter(q) },
        { phone: caseInsensitiveFilter(q) },
        { subject: caseInsensitiveFilter(q) },
        { message: caseInsensitiveFilter(q) }
      ];
    }

    const [inquiries, total, unreadCount, readCount, resolvedCount] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.contactMessage.count({ where }),
      prisma.contactMessage.count({ where: { status: 'UNREAD' } }),
      prisma.contactMessage.count({ where: { status: 'READ' } }),
      prisma.contactMessage.count({ where: { status: 'RESOLVED' } })
    ]);

    res.json({
      inquiries,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / take) || 1,
      stats: {
        total: unreadCount + readCount + resolvedCount,
        unread: unreadCount,
        read: readCount,
        resolved: resolvedCount
      }
    });
  } catch (error: any) {
    logger.error('getAdminInquiries error', error);
    res.status(500).json({ message: 'Failed to retrieve patron contact inquiries' });
  }
};

export const getInquiryStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [total, unread, read, resolved] = await Promise.all([
      prisma.contactMessage.count(),
      prisma.contactMessage.count({ where: { status: 'UNREAD' } }),
      prisma.contactMessage.count({ where: { status: 'READ' } }),
      prisma.contactMessage.count({ where: { status: 'RESOLVED' } })
    ]);

    res.json({ total, unread, read, resolved });
  } catch (error: any) {
    logger.error('getInquiryStats error', error);
    res.status(500).json({ message: 'Failed to calculate inquiry stats' });
  }
};

export const updateInquiryStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status } = req.body;

    const allowed = ['UNREAD', 'READ', 'RESOLVED'];
    if (!status || !allowed.includes(String(status).toUpperCase())) {
      res.status(400).json({ message: `Invalid status. Allowed: ${allowed.join(', ')}` });
      return;
    }

    const cleanStatus = String(status).toUpperCase();
    const existing = await prisma.contactMessage.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Contact inquiry not found' });
      return;
    }

    const inquiry = await prisma.contactMessage.update({
      where: { id },
      data: { status: cleanStatus }
    });

    const adminUser = (req as any).user;
    await prisma.auditLog.create({
      data: {
        userId: adminUser?.id || null,
        action: 'INQUIRY_STATUS_UPDATE',
        entity: 'CONTACT_MESSAGE',
        entityId: id,
        details: JSON.stringify({ from: existing.status, to: cleanStatus, email: existing.email })
      }
    });

    res.json({ message: `Inquiry status updated to ${cleanStatus}`, inquiry });
  } catch (error: any) {
    logger.error('updateInquiryStatus error', error);
    res.status(500).json({ message: 'Failed to update contact inquiry status' });
  }
};

export const replyToInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { replyMessage, senderName, markAsResolved = true } = req.body;

    if (!replyMessage || !replyMessage.trim()) {
      res.status(400).json({ message: 'Reply message text is required' });
      return;
    }

    const inquiry = await prisma.contactMessage.findUnique({ where: { id } });
    if (!inquiry) {
      res.status(404).json({ message: 'Contact inquiry not found' });
      return;
    }

    // 1. Dispatch luxury email to the customer
    await emailService.sendContactReplyEmail({
      customerName: inquiry.name,
      customerEmail: inquiry.email,
      originalSubject: inquiry.subject,
      originalMessage: inquiry.message,
      replyMessage: replyMessage.trim(),
      senderName: senderName?.trim() || 'Atelier Concierge'
    });

    // 2. Update status if requested
    const newStatus = markAsResolved ? 'RESOLVED' : inquiry.status;
    const updatedInquiry = await prisma.contactMessage.update({
      where: { id },
      data: { status: newStatus }
    });

    // 3. Log audit trail
    const adminUser = (req as any).user;
    await prisma.auditLog.create({
      data: {
        userId: adminUser?.id || null,
        action: 'INQUIRY_REPLIED',
        entity: 'CONTACT_MESSAGE',
        entityId: id,
        details: JSON.stringify({
          recipient: inquiry.email,
          subject: inquiry.subject,
          replyPreview: replyMessage.trim().substring(0, 100),
          status: newStatus
        })
      }
    });

    res.json({
      message: 'Official response dispatched successfully to customer',
      inquiry: updatedInquiry
    });
  } catch (error: any) {
    logger.error('replyToInquiry error', error);
    res.status(500).json({ message: 'Failed to send reply to inquiry' });
  }
};

export const deleteInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.contactMessage.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Contact inquiry not found' });
      return;
    }

    await prisma.contactMessage.delete({ where: { id } });

    const adminUser = (req as any).user;
    await prisma.auditLog.create({
      data: {
        userId: adminUser?.id || null,
        action: 'INQUIRY_DELETE',
        entity: 'CONTACT_MESSAGE',
        entityId: id,
        details: JSON.stringify({ email: existing.email, subject: existing.subject })
      }
    });

    res.json({ message: 'Inquiry deleted successfully' });
  } catch (error: any) {
    logger.error('deleteInquiry error', error);
    res.status(500).json({ message: 'Failed to delete contact inquiry' });
  }
};

// --- NEWSLETTER SUBSCRIBERS ---

export const getNewsletterSubscribers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '50', search = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.max(1, Math.min(200, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (search) {
      where.email = caseInsensitiveFilter(String(search).trim());
    }

    const [subscribers, total] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.newsletterSubscriber.count({ where })
    ]);

    res.json({
      subscribers,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / take) || 1
    });
  } catch (error: any) {
    logger.error('getNewsletterSubscribers error', error);
    res.status(500).json({ message: 'Failed to retrieve newsletter subscribers' });
  }
};

export const exportNewsletterSubscribers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    const csvRows = ['Email,Status,SubscribedAt'];
    for (const sub of subscribers) {
      const email = `"${sub.email.replace(/"/g, '""')}"`;
      const status = sub.isActive ? 'ACTIVE' : 'INACTIVE';
      const date = `"${sub.createdAt.toISOString()}"`;
      csvRows.push(`${email},${status},${date}`);
    }

    const csvContent = csvRows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ethniz_newsletter_subscribers_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (error: any) {
    logger.error('exportNewsletterSubscribers error', error);
    res.status(500).json({ message: 'Failed to export subscribers' });
  }
};

