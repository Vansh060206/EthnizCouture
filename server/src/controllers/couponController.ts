import { Request, Response } from 'express';
import prisma from '../prisma';

export const validateCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, subtotal } = req.body;

    if (!code) {
      res.status(400).json({ message: 'Coupon code is required' });
      return;
    }

    const orderSubtotal = parseFloat(subtotal) || 0;

    const coupon = await prisma.coupon.findUnique({
      where: { code: String(code).trim().toUpperCase() }
    });

    if (!coupon || !coupon.isActive) {
      res.status(404).json({ message: 'Invalid or inactive coupon code' });
      return;
    }

    if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
      res.status(400).json({ message: 'This coupon has expired' });
      return;
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      res.status(400).json({ message: 'Coupon usage limit has been reached' });
      return;
    }

    if (coupon.minOrderValue && orderSubtotal < coupon.minOrderValue) {
      res.status(400).json({
        message: `Minimum order value of ₹${coupon.minOrderValue.toLocaleString('en-IN')} required for this coupon`
      });
      return;
    }

    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = (orderSubtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      discountAmount = Math.min(orderSubtotal, coupon.discountValue);
    }

    res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: Math.round(discountAmount * 100) / 100,
      message: `Coupon ${coupon.code} applied successfully!`
    });
  } catch (error: any) {
    console.error('validateCoupon error:', error);
    res.status(500).json({ message: 'Failed to validate coupon' });
  }
};

export const getActiveCoupons = async (req: Request, res: Response): Promise<void> => {
  try {
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        OR: [
          { expiryDate: null },
          { expiryDate: { gt: new Date() } }
        ]
      },
      select: {
        id: true,
        code: true,
        discountType: true,
        discountValue: true,
        minOrderValue: true,
        maxDiscount: true,
        expiryDate: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ coupons });
  } catch (error: any) {
    console.error('getActiveCoupons error:', error);
    res.status(500).json({ message: 'Failed to retrieve available coupons' });
  }
};
