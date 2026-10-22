import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { idempotencyService } from '../services/idempotencyService';
import { backgroundQueue } from '../services/backgroundQueue';
import { metricsService } from '../services/metricsService';
import { emailService } from '../services/emailService';
import { logger } from '../utils/logger';
import {
  validateEmail,
  validateFullName,
  validatePhone,
  validateStreet,
  validateCity,
  validateState,
  validatePincode,
  validateGstin
} from '../utils/validation';

// Helper to mask PII for public tracking
function maskString(str: string, visibleStart = 2, visibleEnd = 2): string {
  if (!str || str.length <= visibleStart + visibleEnd) return '***';
  return (
    str.substring(0, visibleStart) +
    '*'.repeat(Math.max(3, str.length - visibleStart - visibleEnd)) +
    str.substring(str.length - visibleEnd)
  );
}

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  const idempotencyKey = (req.headers['idempotency-key'] as string) || (req.body?.idempotencyKey as string);

  // 1. Check idempotency record if key provided
  if (idempotencyKey) {
    const cached = await idempotencyService.getRecord(idempotencyKey);
    if (cached) {
      logger.info(`Returning cached response for idempotency key: ${idempotencyKey}`);
      res.status(cached.statusCode).json(cached.body);
      return;
    }
  }

  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingStreet,
      shippingApartment,
      shippingCity,
      shippingState,
      shippingPincode,
      shippingCountry = 'India',
      billingAddress,
      gstin,
      businessName,
      latitude,
      longitude,
      notes,
      items,
      couponCode,
      paymentMethod = 'STRIPE'
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'Cart items are required' });
      return;
    }

    const nameVal = validateFullName(customerName, 'Recipient Name');
    if (!nameVal.isValid) {
      res.status(400).json({ message: nameVal.message, field: 'customerName' });
      return;
    }

    const emailVal = validateEmail(customerEmail);
    if (!emailVal.isValid) {
      res.status(400).json({ message: emailVal.message, field: 'customerEmail' });
      return;
    }

    const phoneVal = validatePhone(customerPhone, true);
    if (!phoneVal.isValid) {
      res.status(400).json({ message: phoneVal.message, field: 'customerPhone' });
      return;
    }

    const streetVal = validateStreet(shippingStreet);
    if (!streetVal.isValid) {
      res.status(400).json({ message: streetVal.message, field: 'shippingStreet' });
      return;
    }

    const cityVal = validateCity(shippingCity);
    if (!cityVal.isValid) {
      res.status(400).json({ message: cityVal.message, field: 'shippingCity' });
      return;
    }

    const stateVal = validateState(shippingState);
    if (!stateVal.isValid) {
      res.status(400).json({ message: stateVal.message, field: 'shippingState' });
      return;
    }

    const pincodeVal = validatePincode(shippingPincode);
    if (!pincodeVal.isValid) {
      res.status(400).json({ message: pincodeVal.message, field: 'shippingPincode' });
      return;
    }

    // Validate separate billing address if supplied
    if (billingAddress && typeof billingAddress === 'object') {
      const bStreet = validateStreet(billingAddress.street, 'Billing Street Address');
      if (!bStreet.isValid) {
        res.status(400).json({ message: bStreet.message, field: 'billingStreet' });
        return;
      }
      const bCity = validateCity(billingAddress.city, 'Billing City');
      if (!bCity.isValid) {
        res.status(400).json({ message: bCity.message, field: 'billingCity' });
        return;
      }
      const bState = validateState(billingAddress.state, 'Billing State');
      if (!bState.isValid) {
        res.status(400).json({ message: bState.message, field: 'billingState' });
        return;
      }
      const bPin = validatePincode(billingAddress.pincode);
      if (!bPin.isValid) {
        res.status(400).json({ message: bPin.message, field: 'billingPincode' });
        return;
      }
    }

    // Validate GSTIN if supplied
    if (gstin && typeof gstin === 'string' && gstin.trim().length > 0) {
      const gstinVal = validateGstin(gstin);
      if (!gstinVal.isValid) {
        res.status(400).json({ message: gstinVal.message, field: 'gstin' });
        return;
      }
    }

    // Generate high-entropy order number (e.g. EC-2026-A8K2F9)
    const year = new Date().getFullYear();
    const entropy = crypto.randomBytes(4).toString('hex').toUpperCase();
    const orderNumber = `EC-${year}-${entropy}`;

    // Estimated delivery: 5-7 business days
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 6);

    // 2. Execute stock check, atomic reservation, coupon validation and order creation inside a transaction
    const transactionResult = await prisma.$transaction(async (tx: any) => {
      let subtotal = 0;
      const validatedItems: any[] = [];
      const stockAlerts: { productId: string; productName: string; remainingStock: number }[] = [];

      for (const item of items) {
        if (!item.productId) {
          throw new Error('Each item must include a valid product ID');
        }

        const quantity = Math.max(1, parseInt(String(item.quantity), 10) || 1);

        // Fetch fresh product from database to guarantee authoritative price and stock
        const product = await tx.product.findUnique({
          where: { id: String(item.productId) },
          include: {
            images: {
              where: { isPrimary: true },
              take: 1
            }
          }
        });

        if (!product || !product.isActive) {
          throw new Error(`The item "${item.name || 'product'}" is no longer active or available.`);
        }

        if (product.stock < quantity) {
          metricsService.recordInventoryConflict();
          throw new Error(`Inventory Conflict: "${product.name}" only has ${product.stock} items remaining. Please adjust your cart.`);
        }

        // Authoritative price calculation (never trusting client prices)
        const itemTotal = Math.round(product.price * quantity * 100) / 100;
        subtotal += itemTotal;

        // Atomically reserve stock inside the transaction
        const updatedProduct = await tx.product.update({
          where: { id: product.id },
          data: {
            stock: {
              decrement: quantity
            }
          }
        });

        if (updatedProduct.stock < 0) {
          metricsService.recordInventoryConflict();
          throw new Error(`Inventory race condition: "${product.name}" became out of stock during checkout.`);
        }

        if (updatedProduct.stock <= 5) {
          stockAlerts.push({
            productId: product.id,
            productName: product.name,
            remainingStock: updatedProduct.stock
          });
        }

        const primaryImage = product.images[0]?.url || item.image || null;

        validatedItems.push({
          productId: product.id,
          productName: product.name,
          productImage: primaryImage,
          size: item.size || null,
          color: item.color || null,
          price: product.price,
          quantity,
          total: itemTotal
        });
      }

      // Calculate authoritative coupon discount
      let discountAmount = 0;
      let verifiedCouponCode: string | null = null;

      if (couponCode) {
        const cleanCode = String(couponCode).trim().toUpperCase();
        const coupon = await tx.coupon.findUnique({
          where: { code: cleanCode }
        });

        if (coupon && coupon.isActive) {
          const isNotExpired = !coupon.expiryDate || new Date() <= new Date(coupon.expiryDate);
          const meetsMinOrder = !coupon.minOrderValue || subtotal >= coupon.minOrderValue;
          const withinUsageLimit = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit;

          if (isNotExpired && meetsMinOrder && withinUsageLimit) {
            verifiedCouponCode = coupon.code;
            if (coupon.discountType === 'PERCENTAGE') {
              discountAmount = (subtotal * coupon.discountValue) / 100;
              if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                discountAmount = coupon.maxDiscount;
              }
            } else {
              discountAmount = Math.min(subtotal, coupon.discountValue);
            }

            discountAmount = Math.round(discountAmount * 100) / 100;

            // Increment coupon usage atomically
            await tx.coupon.update({
              where: { id: coupon.id },
              data: { usedCount: { increment: 1 } }
            });
          }
        }
      }

      // Shipping: Complimentary for orders >= ₹2,999, else ₹199
      const payableAfterDiscount = Math.max(0, subtotal - discountAmount);
      const shippingFee = payableAfterDiscount >= 2999 ? 0 : 199;
      const taxAmount = 0; // Tax included in haute couture retail price
      const totalAmount = Math.round((payableAfterDiscount + shippingFee + taxAmount) * 100) / 100;

      // Create Order record
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: req.user ? req.user.id : null,
          customerName: customerName.trim(),
          customerEmail: customerEmail.toLowerCase().trim(),
          customerPhone: customerPhone.trim(),
          shippingStreet: shippingStreet.trim(),
          shippingApartment: shippingApartment?.trim() || null,
          shippingCity: shippingCity.trim(),
          shippingState: shippingState.trim(),
          shippingPincode: shippingPincode.trim(),
          shippingCountry,
          subtotal,
          discountAmount,
          shippingFee,
          taxAmount,
          totalAmount,
          couponCode: verifiedCouponCode,
          paymentStatus: 'PENDING',
          orderStatus: paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING',
          paymentMethod,
          estimatedDelivery,
          notes: (() => {
            const parts: string[] = [];
            if (notes && String(notes).trim()) {
              parts.push(String(notes).trim());
            }
            if (paymentMethod === 'COD') {
              parts.push('[Payment Method: Cash on Delivery]');
            }
            if (typeof latitude === 'number' && typeof longitude === 'number') {
              parts.push(`[GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}]`);
            }
            if (billingAddress && typeof billingAddress === 'object') {
              const apt = billingAddress.apartment ? `${billingAddress.apartment}, ` : '';
              parts.push(`[Billing Address: ${billingAddress.street.trim()}, ${apt}${billingAddress.city.trim()}, ${billingAddress.state.trim()} - ${billingAddress.pincode.trim()}, ${billingAddress.country || 'India'}]`);
            }
            if (gstin && typeof gstin === 'string' && gstin.trim()) {
              const bName = businessName ? ` | Entity: ${businessName.trim()}` : '';
              parts.push(`[GSTIN: ${gstin.trim().toUpperCase()}${bName}]`);
            }
            return parts.length > 0 ? parts.join(' | ') : null;
          })(),
          idempotencyKey: idempotencyKey || null,
          items: {
            create: validatedItems
          },
          statusHistory: {
            create: {
              status: paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING',
              notes: paymentMethod === 'COD'
                ? 'Order confirmed with Cash on Delivery. Payment due upon handover.'
                : 'Order created with inventory reserved. Awaiting payment authorization.'
            }
          }
        },
        include: {
          items: true,
          statusHistory: true
        }
      });

      // Clear user cart if authenticated
      if (req.user) {
        const userCart = await tx.cart.findUnique({ where: { userId: req.user.id } });
        if (userCart) {
          await tx.cartItem.deleteMany({ where: { cartId: userCart.id } });
        }

        // Auto-save phone number to user profile if provided and not yet set or changed
        if (customerPhone && (!req.user.phone || req.user.phone.trim().length === 0)) {
          await tx.user.update({
            where: { id: req.user.id },
            data: { phone: customerPhone.trim() }
          }).catch(() => {});
        }

        // Auto-save delivery address into customer's Address Book for seamless 1-click future checkouts
        if (shippingStreet && shippingCity && shippingPincode) {
          const existingAddr = await tx.address.findFirst({
            where: {
              userId: req.user.id,
              street: shippingStreet.trim(),
              city: shippingCity.trim(),
              pincode: shippingPincode.trim()
            }
          });

          if (!existingAddr) {
            const count = await tx.address.count({ where: { userId: req.user.id } });
            await tx.address.create({
              data: {
                userId: req.user.id,
                fullName: customerName.trim(),
                phone: customerPhone.trim(),
                street: shippingStreet.trim(),
                apartment: shippingApartment?.trim() || null,
                city: shippingCity.trim(),
                state: shippingState.trim(),
                pincode: shippingPincode.trim(),
                country: shippingCountry || 'India',
                isDefault: count === 0
              }
            }).catch(() => {});
          }
        }
      } else if (customerEmail) {
        // Fallback for registered users checking out with matching email
        const matchedUser = await tx.user.findUnique({
          where: { email: customerEmail.toLowerCase().trim() }
        });
        if (matchedUser) {
          if (customerPhone && (!matchedUser.phone || matchedUser.phone.trim().length === 0)) {
            await tx.user.update({
              where: { id: matchedUser.id },
              data: { phone: customerPhone.trim() }
            }).catch(() => {});
          }

          if (shippingStreet && shippingCity && shippingPincode) {
            const existingAddr = await tx.address.findFirst({
              where: {
                userId: matchedUser.id,
                street: shippingStreet.trim(),
                city: shippingCity.trim(),
                pincode: shippingPincode.trim()
              }
            });

            if (!existingAddr) {
              const count = await tx.address.count({ where: { userId: matchedUser.id } });
              await tx.address.create({
                data: {
                  userId: matchedUser.id,
                  fullName: customerName.trim(),
                  phone: customerPhone.trim(),
                  street: shippingStreet.trim(),
                  apartment: shippingApartment?.trim() || null,
                  city: shippingCity.trim(),
                  state: shippingState.trim(),
                  pincode: shippingPincode.trim(),
                  country: shippingCountry || 'India',
                  isDefault: count === 0
                }
              }).catch(() => {});
            }
          }
        }
      }

      return { order: createdOrder, stockAlerts };
    });

    // 3. Post-transaction async background processing
    for (const alert of transactionResult.stockAlerts) {
      backgroundQueue.enqueue('INVENTORY_ALERT', alert).catch(() => {});
    }

    // Immediately enqueue luxury order confirmation receipt & SMS alert for COD / confirmed orders
    if (transactionResult.order.orderStatus === 'CONFIRMED') {
      backgroundQueue.enqueue('ORDER_CONFIRMATION', {
        orderId: transactionResult.order.id,
        orderNumber: transactionResult.order.orderNumber,
        customerEmail: transactionResult.order.customerEmail,
        totalAmount: transactionResult.order.totalAmount
      }).catch(() => {});
    }

    const responsePayload = {
      message: 'Order created successfully and inventory reserved',
      order: transactionResult.order
    };

    // Save idempotency record if key was provided
    if (idempotencyKey) {
      await idempotencyService.saveRecord(
        idempotencyKey,
        'ORDER_CREATE',
        transactionResult.order.id,
        201,
        responsePayload
      );
    }

    res.status(201).json(responsePayload);
  } catch (error: any) {
    logger.error('createOrder transaction error', error);
    res.status(400).json({ message: error.message || 'Failed to create order' });
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { userId: req.user.id },
          { customerEmail: req.user.email.toLowerCase() }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    res.json({ orders });
  } catch (error: any) {
    logger.error('getMyOrders error', error);
    res.status(500).json({ message: 'Failed to retrieve orders' });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id).trim();
    const verificationEmail = (req.query.email as string)?.toLowerCase().trim();

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }]
      },
      include: {
        items: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // IDOR Authorization guard:
    const isAuthenticatedOwner = req.user && (req.user.id === order.userId || req.user.email.toLowerCase() === order.customerEmail.toLowerCase());
    const isAdmin = req.user && req.user.role === 'ADMIN';
    const isVerifiedGuest = verificationEmail && verificationEmail === order.customerEmail.toLowerCase();

    // Allow order viewing if authenticated owner, admin, or guest with verified email
    // Or if the order is brand new (pending payment initiated in the same session)
    if (!isAuthenticatedOwner && !isAdmin && !isVerifiedGuest) {
      // Return order overview with redacted PII for confirmation screen
      const sanitizedOrder = {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: maskString(order.customerName, 1, 1),
        customerEmail: maskString(order.customerEmail, 2, 4),
        customerPhone: maskString(order.customerPhone, 2, 2),
        shippingCity: order.shippingCity,
        shippingState: order.shippingState,
        shippingCountry: order.shippingCountry,
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        shippingFee: order.shippingFee,
        taxAmount: order.taxAmount,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        paymentMethod: order.paymentMethod,
        estimatedDelivery: order.estimatedDelivery,
        createdAt: order.createdAt,
        items: order.items,
        statusHistory: order.statusHistory
      };

      res.json({ order: sanitizedOrder });
      return;
    }

    res.json({ order });
  } catch (error: any) {
    logger.error('getOrderById error', error);
    res.status(500).json({ message: 'Failed to retrieve order' });
  }
};

export const trackOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderNumber = (req.query.orderNumber as string)?.trim().toUpperCase();
    const email = (req.query.email as string)?.trim().toLowerCase();

    if (!orderNumber) {
      res.status(400).json({ message: 'Order number is required' });
      return;
    }

    const where: any = { orderNumber };
    if (email) {
      where.customerEmail = email;
    }

    const order = await prisma.order.findFirst({
      where,
      include: {
        items: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!order) {
      res.status(404).json({ message: 'No matching order found. Please check your order number.' });
      return;
    }

    const isAuthenticatedOwner = req.user && (req.user.id === order.userId || req.user.email?.toLowerCase() === order.customerEmail.toLowerCase());
    const isAdmin = req.user && req.user.role === 'ADMIN';

    // If authenticated owner or admin, return complete order
    if (isAuthenticatedOwner || isAdmin) {
      res.json({ order });
      return;
    }

    // Public tracking with safe masked data for unauthenticated or external lookup
    const maskedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      trackingNumber: order.trackingNumber,
      carrierName: order.carrierName,
      dispatchedAt: order.dispatchedAt,
      deliveredAt: order.deliveredAt,
      estimatedDelivery: order.estimatedDelivery,
      createdAt: order.createdAt,
      customerName: maskString(order.customerName, 1, 1),
      customerPhone: maskString(order.customerPhone, 2, 2),
      shippingStreet: order.shippingStreet,
      shippingCity: order.shippingCity,
      shippingState: order.shippingState,
      shippingPincode: order.shippingPincode,
      shippingCountry: order.shippingCountry,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      shippingFee: order.shippingFee,
      taxAmount: order.taxAmount,
      totalAmount: order.totalAmount,
      items: order.items.map((i: any) => ({
        id: i.id,
        productId: i.productId,
        productName: i.productName,
        productImage: i.productImage,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
        price: i.price,
        total: i.total
      })),
      statusHistory: order.statusHistory.map((h: any) => ({
        id: h.id,
        status: h.status,
        notes: h.notes,
        createdAt: h.createdAt
      }))
    };

    res.json({ order: maskedOrder });
  } catch (error: any) {
    logger.error('trackOrder error', error);
    res.status(500).json({ message: 'Failed to track order' });
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { reason, customerEmail, customerPhone } = req.body || {};

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Ownership Verification:
    // 1. Authenticated user owns order OR is admin
    // 2. Unauthenticated guest matches customerEmail AND customerPhone
    const cleanGuestEmail = typeof customerEmail === 'string' ? customerEmail.toLowerCase().trim() : '';
    const cleanGuestPhone = typeof customerPhone === 'string' ? customerPhone.replace(/\D/g, '') : '';
    const orderPhone = order.customerPhone.replace(/\D/g, '');

    const isGuestAuthorized = Boolean(
      cleanGuestEmail &&
      cleanGuestPhone &&
      order.customerEmail.toLowerCase() === cleanGuestEmail &&
      (orderPhone.endsWith(cleanGuestPhone) || cleanGuestPhone.endsWith(orderPhone))
    );

    const isAuthorized = Boolean(
      (req.user && (req.user.id === order.userId || req.user.role === 'ADMIN')) ||
      isGuestAuthorized
    );

    if (!isAuthorized) {
      res.status(403).json({ message: 'You are not authorized to cancel this order.' });
      return;
    }

    // Guard against duplicate cancellation (prevents double stock release)
    if (order.orderStatus === 'CANCELLED') {
      res.status(400).json({ message: 'This order has already been cancelled.' });
      return;
    }

    if (['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURN_REQUESTED'].includes(order.orderStatus)) {
      res.status(400).json({
        message: 'Cannot cancel an order that has already been dispatched with a courier. If already delivered, please submit a Return / Exchange request.'
      });
      return;
    }

    const cancelReason = typeof reason === 'string' && reason.trim()
      ? reason.trim()
      : 'Order cancelled by customer.';

    // Execute cancellation & stock restoration atomically
    await prisma.$transaction(async (tx: any) => {
      await tx.order.update({
        where: { id },
        data: {
          orderStatus: 'CANCELLED',
          statusHistory: {
            create: {
              status: 'CANCELLED',
              notes: `Cancellation reason: ${cancelReason}. Stock restored to inventory.`,
              actorId: req.user?.id || 'customer',
              source: req.user?.role === 'ADMIN' ? 'ADMIN_ACTION' : 'CUSTOMER'
            }
          }
        }
      });

      // Restore stock safely
      for (const item of order.items) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity
              }
            }
          });
        }
      }
    });

    // Send cancellation email notification asynchronously
    emailService.sendOrderCancellationEmail({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      totalAmount: order.totalAmount,
      reason: cancelReason,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus
    }).catch((emailErr) => {
      logger.error('Failed to send order cancellation receipt email', emailErr);
    });

    logger.info(`Order ${order.orderNumber} successfully cancelled by customer [Reason: ${cancelReason}]`);

    res.json({
      message: 'Order cancelled successfully and stock restored.',
      orderNumber: order.orderNumber,
      orderStatus: 'CANCELLED'
    });
  } catch (error: any) {
    logger.error('cancelOrder error', error);
    res.status(500).json({ message: 'Failed to cancel order' });
  }
};

export const requestReturn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { reason, resolution, comments, customerEmail, customerPhone } = req.body || {};

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      res.status(400).json({ message: 'Please select a reason for the return / exchange request.' });
      return;
    }

    const validResolutions = ['EXCHANGE', 'REFUND', 'STORE_CREDIT'];
    const chosenResolution = validResolutions.includes(resolution) ? resolution : 'EXCHANGE';

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Ownership check
    const cleanGuestEmail = typeof customerEmail === 'string' ? customerEmail.toLowerCase().trim() : '';
    const cleanGuestPhone = typeof customerPhone === 'string' ? customerPhone.replace(/\D/g, '') : '';
    const orderPhone = order.customerPhone.replace(/\D/g, '');

    const isGuestAuthorized = Boolean(
      cleanGuestEmail &&
      cleanGuestPhone &&
      order.customerEmail.toLowerCase() === cleanGuestEmail &&
      (orderPhone.endsWith(cleanGuestPhone) || cleanGuestPhone.endsWith(orderPhone))
    );

    const isAuthorized = Boolean(
      (req.user && (
        req.user.id === order.userId ||
        (req.user.email && req.user.email.toLowerCase() === order.customerEmail.toLowerCase()) ||
        req.user.role === 'ADMIN'
      )) ||
      isGuestAuthorized
    );

    if (!isAuthorized) {
      res.status(403).json({ message: 'You are not authorized to request a return for this order.' });
      return;
    }

    if (order.orderStatus !== 'DELIVERED') {
      res.status(400).json({
        message: 'Returns can only be requested once the order has been delivered.'
      });
      return;
    }

    // Check return window: 7 days policy
    const deliveryReferenceDate = order.deliveredAt || order.updatedAt;
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - new Date(deliveryReferenceDate).getTime() > sevenDaysInMs) {
      res.status(400).json({
        message: 'The 7-day atelier return and exchange window for this order has expired. Please contact concierge support for bespoke assistance.'
      });
      return;
    }

    const returnNotes = `Reason: ${reason.trim()} | Preferred Resolution: ${chosenResolution}${comments?.trim() ? ` | Notes: ${comments.trim()}` : ''}`;

    await prisma.order.update({
      where: { id },
      data: {
        orderStatus: 'RETURN_REQUESTED',
        statusHistory: {
          create: {
            status: 'RETURN_REQUESTED',
            notes: returnNotes,
            actorId: req.user?.id || 'customer',
            source: 'CUSTOMER'
          }
        }
      }
    });

    // Send return request confirmation email asynchronously
    emailService.sendReturnRequestEmail({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      reason: reason.trim(),
      resolution: chosenResolution,
      comments: comments?.trim() || null
    }).catch((emailErr) => {
      logger.error('Failed to send return request confirmation email', emailErr);
    });

    logger.info(`Return requested for Order ${order.orderNumber} [Resolution: ${chosenResolution}]`);

    res.json({
      message: 'Return request submitted successfully. Our atelier concierge will review within 24 hours.',
      orderNumber: order.orderNumber,
      orderStatus: 'RETURN_REQUESTED'
    });
  } catch (error: any) {
    logger.error('requestReturn error', error);
    res.status(500).json({ message: 'Failed to submit return request' });
  }
};

