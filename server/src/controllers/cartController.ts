import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import { cartRecoveryService } from '../services/cartRecoveryService';
import { backgroundQueue } from '../services/backgroundQueue';

export const getCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required for server cart' });
      return;
    }

    let cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }]
                }
              }
            }
          }
        }
      }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: req.user.id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: {
                    orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }]
                  }
                }
              }
            }
          }
        }
      });
    }

    res.json({ cart });
  } catch (error: any) {
    console.error('getCart error:', error);
    res.status(500).json({ message: 'Failed to retrieve cart' });
  }
};

export const addToCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { productId, size, color, quantity = 1 } = req.body;

    if (!productId) {
      res.status(400).json({ message: 'Product ID is required' });
      return;
    }

    const parsedQty = Math.max(1, parseInt(String(quantity), 10) || 1);

    // Execute atomic mutation, version increment, and outbox creation inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: String(productId) } });
      if (!product) {
        throw new Error('PRODUCT_NOT_FOUND');
      }

      if (product.stock < parsedQty) {
        throw new Error(`Only ${product.stock} items available in stock`);
      }

      let cart = await tx.cart.findUnique({ where: { userId: req.user!.id } });
      if (!cart) {
        cart = await tx.cart.create({ data: { userId: req.user!.id } });
      }

      // Check if matching line item exists
      const existingItem = await tx.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: String(productId),
          size: size || null,
          color: color || null
        }
      });

      if (existingItem) {
        const newQty = existingItem.quantity + parsedQty;
        if (newQty > product.stock) {
          throw new Error(`Cannot add more than ${product.stock} items to cart`);
        }
        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newQty }
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId: String(productId),
            size: size || null,
            color: color || null,
            quantity: parsedQty
          }
        });
      }

      // Atomically increment cart version and record activity timestamp
      const updatedCart = await tx.cart.update({
        where: { id: cart.id },
        data: {
          version: { increment: 1 },
          lastActivityAt: new Date()
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] }
                }
              }
            }
          }
        }
      });

      // Transactional Outbox: durable event record in the same atomic transaction
      await cartRecoveryService.recordCartMutationOutbox(tx, cart.id, updatedCart.version);

      return updatedCart;
    });

    // Trigger queue worker to immediately process outbox without 5-second polling delay
    backgroundQueue.triggerImmediate();

    res.json({ message: 'Item added to cart', cart: result });
  } catch (error: any) {
    if (error.message === 'PRODUCT_NOT_FOUND') {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    if (error.message && error.message.includes('stock')) {
      res.status(400).json({ message: error.message });
      return;
    }
    console.error('addToCart error:', error);
    res.status(500).json({ message: 'Failed to add item to cart' });
  }
};

export const updateCartItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const id = String(req.params.id);
    const { quantity } = req.body;
    const parsedQty = parseInt(String(quantity), 10);

    const result = await prisma.$transaction(async (tx) => {
      const userCart = await tx.cart.findUnique({ where: { userId: req.user!.id } });
      if (!userCart) {
        throw new Error('CART_NOT_FOUND');
      }

      const item = await tx.cartItem.findFirst({
        where: { id, cartId: userCart.id },
        include: { product: true }
      });

      if (!item || !item.product) {
        throw new Error('ITEM_NOT_FOUND');
      }

      // Removal case: quantity < 1
      if (parsedQty < 1) {
        await tx.cartItem.delete({ where: { id: item.id } });

        const updatedCart = await tx.cart.update({
          where: { id: userCart.id },
          data: {
            version: { increment: 1 },
            lastActivityAt: new Date()
          }
        });

        await cartRecoveryService.recordCartMutationOutbox(tx, userCart.id, updatedCart.version);
        return { removed: true, item: null };
      }

      // No-op check: if quantity is unchanged, do not increment version
      if (item.quantity === parsedQty) {
        return { removed: false, item, unchanged: true };
      }

      if (item.product.stock < parsedQty) {
        throw new Error(`Only ${item.product.stock} items available in stock`);
      }

      const updated = await tx.cartItem.update({
        where: { id: item.id },
        data: { quantity: parsedQty }
      });

      const updatedCart = await tx.cart.update({
        where: { id: userCart.id },
        data: {
          version: { increment: 1 },
          lastActivityAt: new Date()
        }
      });

      await cartRecoveryService.recordCartMutationOutbox(tx, userCart.id, updatedCart.version);

      return { removed: false, item: updated, unchanged: false };
    });

    if (!result.unchanged) {
      backgroundQueue.triggerImmediate();
    }

    if (result.removed) {
      res.json({ message: 'Item removed from cart' });
      return;
    }

    res.json({ message: 'Cart item updated', item: result.item });
  } catch (error: any) {
    if (error.message === 'CART_NOT_FOUND' || error.message === 'ITEM_NOT_FOUND') {
      res.status(404).json({ message: 'Cart item not found' });
      return;
    }
    if (error.message && error.message.includes('stock')) {
      res.status(400).json({ message: error.message });
      return;
    }
    console.error('updateCartItem error:', error);
    res.status(500).json({ message: 'Failed to update cart item' });
  }
};

export const removeCartItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const id = String(req.params.id);

    await prisma.$transaction(async (tx) => {
      const userCart = await tx.cart.findUnique({ where: { userId: req.user!.id } });
      if (!userCart) {
        throw new Error('CART_NOT_FOUND');
      }

      const item = await tx.cartItem.findFirst({
        where: { id, cartId: userCart.id }
      });

      if (!item) {
        throw new Error('ITEM_NOT_FOUND');
      }

      await tx.cartItem.delete({ where: { id: item.id } });

      const updatedCart = await tx.cart.update({
        where: { id: userCart.id },
        data: {
          version: { increment: 1 },
          lastActivityAt: new Date()
        }
      });

      await cartRecoveryService.recordCartMutationOutbox(tx, userCart.id, updatedCart.version);
    });

    backgroundQueue.triggerImmediate();

    res.json({ message: 'Item removed from cart' });
  } catch (error: any) {
    if (error.message === 'CART_NOT_FOUND' || error.message === 'ITEM_NOT_FOUND') {
      res.status(404).json({ message: 'Cart item not found' });
      return;
    }
    console.error('removeCartItem error:', error);
    res.status(500).json({ message: 'Failed to delete cart item' });
  }
};

export const syncGuestCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ message: 'Items array expected' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      let cart = await tx.cart.findUnique({ where: { userId: req.user!.id } });
      if (!cart) {
        cart = await tx.cart.create({ data: { userId: req.user!.id } });
      }

      let stateChanged = false;

      for (const item of items) {
        if (!item.productId) continue;
        const product = await tx.product.findUnique({ where: { id: String(item.productId) } });
        if (!product || product.stock < 1) continue;

        const existing = await tx.cartItem.findFirst({
          where: {
            cartId: cart.id,
            productId: String(item.productId),
            size: item.size || null,
            color: item.color || null
          }
        });

        const targetQty = Math.min(product.stock, item.quantity || 1);

        if (existing) {
          const newQty = Math.min(product.stock, existing.quantity + targetQty);
          if (newQty !== existing.quantity) {
            await tx.cartItem.update({
              where: { id: existing.id },
              data: { quantity: newQty }
            });
            stateChanged = true;
          }
        } else {
          await tx.cartItem.create({
            data: {
              cartId: cart.id,
              productId: String(item.productId),
              size: item.size || null,
              color: item.color || null,
              quantity: targetQty
            }
          });
          stateChanged = true;
        }
      }

      let updatedCart = cart;
      if (stateChanged) {
        updatedCart = await tx.cart.update({
          where: { id: cart.id },
          data: {
            version: { increment: 1 },
            lastActivityAt: new Date()
          }
        });

        await cartRecoveryService.recordCartMutationOutbox(tx, cart.id, updatedCart.version);
      }

      const fullCart = await tx.cart.findUnique({
        where: { id: cart.id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] }
                }
              }
            }
          }
        }
      });

      return { fullCart, stateChanged };
    });

    if (result.stateChanged) {
      backgroundQueue.triggerImmediate();
    }

    res.json({ message: 'Cart synced successfully', cart: result.fullCart });
  } catch (error: any) {
    console.error('syncGuestCart error:', error);
    res.status(500).json({ message: 'Failed to sync cart' });
  }
};
