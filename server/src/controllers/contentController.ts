import { Request, Response } from 'express';
import prisma from '../prisma';
import { cacheService } from '../services/cacheService';
import { logger } from '../utils/logger';

export const getBanners = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.query;
    const cacheKey = `banners:${key || 'all'}`;

    const cached = cacheService.get<any>(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=60');
      res.json(cached);
      return;
    }

    const where: any = { isActive: true };
    if (key) {
      where.key = String(key);
    }

    const banners = await prisma.banner.findMany({
      where,
      orderBy: { order: 'asc' }
    });

    const result = { banners };
    cacheService.set(cacheKey, result, 120, ['banners']);

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=60');
    res.json(result);
  } catch (error: any) {
    logger.error('getBanners error', error);
    res.status(500).json({ message: 'Failed to fetch content banners' });
  }
};

export const submitContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      res.status(400).json({ message: 'Name, email, subject and message are required' });
      return;
    }

    const contact = await prisma.contactMessage.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        subject: subject.trim(),
        message: message.trim()
      }
    });

    res.status(201).json({
      message: 'Thank you for reaching out. Our concierge team will contact you shortly.',
      contact
    });
  } catch (error: any) {
    logger.error('submitContact error', error);
    res.status(500).json({ message: 'Failed to submit message' });
  }
};

export const subscribeNewsletter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      res.status(400).json({ message: 'Valid email address required' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: cleanEmail }
    });

    if (existing) {
      res.json({ message: 'You are already subscribed to the EthnizCouture Gazette.' });
      return;
    }

    await prisma.newsletterSubscriber.create({
      data: { email: cleanEmail }
    });

    res.status(201).json({
      message: 'Welcome to EthnizCouture. You will now receive private previews and festive showcases.'
    });
  } catch (error: any) {
    logger.error('subscribeNewsletter error', error);
    res.status(500).json({ message: 'Failed to subscribe' });
  }
};
