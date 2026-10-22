import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const getProductReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = String(req.params.productId);

    const reviews = await prisma.review.findMany({
      where: {
        productId,
        status: 'APPROVED'
      },
      include: {
        user: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ reviews });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
};

export const checkReviewEligibility = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.json({ canReview: false, reason: 'AUTH_REQUIRED' });
      return;
    }

    if (req.user.role === 'ADMIN') {
      res.json({ canReview: true, reason: 'ADMIN_PRIVILEGE' });
      return;
    }

    const productId = String(req.params.productId);
    const deliveredOrder = await prisma.order.findFirst({
      where: {
        userId: req.user.id,
        orderStatus: 'DELIVERED',
        items: {
          some: { productId }
        }
      }
    });

    if (deliveredOrder) {
      res.json({ canReview: true, orderId: deliveredOrder.id, orderNumber: deliveredOrder.orderNumber });
    } else {
      // Check if user has an ongoing pending or shipped order
      const inTransitOrder = await prisma.order.findFirst({
        where: {
          userId: req.user.id,
          items: {
            some: { productId }
          }
        }
      });

      if (inTransitOrder) {
        res.json({
          canReview: false,
          reason: 'ORDER_IN_TRANSIT',
          status: inTransitOrder.orderStatus,
          orderNumber: inTransitOrder.orderNumber
        });
      } else {
        res.json({ canReview: false, reason: 'NOT_PURCHASED' });
      }
    }
  } catch (error: any) {
    res.status(500).json({ canReview: false, message: 'Failed to verify review eligibility' });
  }
};

export const submitReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required to submit review' });
      return;
    }

    const { productId, rating, title, comment, imageUrl } = req.body;

    if (!productId || !rating || !title || !comment) {
      res.status(400).json({ message: 'Product, rating (1-5), title and comment are required' });
      return;
    }

    const numericRating = parseInt(String(rating), 10);
    if (numericRating < 1 || numericRating > 5) {
      res.status(400).json({ message: 'Rating must be between 1 and 5' });
      return;
    }

    // STRICT RULE: Verified reviews are strictly permitted ONLY after the order is DELIVERED
    const deliveredOrder = await prisma.order.findFirst({
      where: {
        userId: req.user.id,
        orderStatus: 'DELIVERED',
        items: {
          some: { productId: String(productId) }
        }
      }
    });

    if (!deliveredOrder && req.user.role !== 'ADMIN') {
      // Check if order is still in transit
      const pendingOrder = await prisma.order.findFirst({
        where: {
          userId: req.user.id,
          items: {
            some: { productId: String(productId) }
          }
        }
      });

      if (pendingOrder) {
        res.status(403).json({
          message: `Your couture piece is currently ${pendingOrder.orderStatus.replace(/_/g, ' ')}. Reviews can only be submitted once the package is officially delivered to your doorstep.`,
          code: 'ORDER_IN_TRANSIT'
        });
        return;
      }

      res.status(403).json({
        message: 'Reviews are reserved exclusively for patrons who have ordered and received this piece.',
        code: 'NOT_DELIVERED'
      });
      return;
    }

    // Prevent duplicate review for the same product
    const existingReview = await prisma.review.findFirst({
      where: {
        userId: req.user.id,
        productId: String(productId)
      }
    });

    if (existingReview) {
      const updated = await prisma.review.update({
        where: { id: existingReview.id },
        data: {
          rating: numericRating,
          title: title.trim(),
          comment: comment.trim(),
          imageUrl: imageUrl || null
        }
      });
      res.json({ message: 'Your review has been updated', review: updated });
      return;
    }

    const isVerifiedPurchase = Boolean(deliveredOrder) || req.user.role === 'ADMIN';

    const review = await prisma.review.create({
      data: {
        productId: String(productId),
        userId: req.user.id,
        rating: numericRating,
        title: title.trim(),
        comment: comment.trim(),
        imageUrl: imageUrl || null,
        isVerifiedPurchase,
        status: 'APPROVED'
      }
    });

    res.status(201).json({ message: 'Review submitted successfully', review });
  } catch (error: any) {
    console.error('submitReview error:', error);
    res.status(500).json({ message: 'Failed to submit review' });
  }
};
