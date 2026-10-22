import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../prisma';

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

    const product = await prisma.product.findUnique({ where: { id: String(productId) } });
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    if (product.stock < quantity) {
      res.status(400).json({ message: `Only ${product.stock} items available in stock` });
      return;
    }

    let cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId: req.user.id } });
    }

    // Check if matching item already exists
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: String(productId),
        size: size || null,
        color: color || null
      }
    });

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (newQty > product.stock) {
        res.status(400).json({ message: `Cannot add more than ${product.stock} items to cart` });
        return;
      }
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty }
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: String(productId),
          size: size || null,
          color: color || null,
          quantity
        }
      });
    }

    // Return updated cart
    const updatedCart = await prisma.cart.findUnique({
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

    res.json({ message: 'Item added to cart', cart: updatedCart });
  } catch (error: any) {
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

    if (quantity < 1) {
      await prisma.cartItem.delete({ where: { id } });
      res.json({ message: 'Item removed from cart' });
      return;
    }

    const item = await prisma.cartItem.findUnique({
      where: { id },
      include: { product: true }
    });

    if (!item || !item.product) {
      res.status(404).json({ message: 'Cart item not found' });
      return;
    }

    if (item.product.stock < quantity) {
      res.status(400).json({ message: `Only ${item.product.stock} items available in stock` });
      return;
    }

    const updated = await prisma.cartItem.update({
      where: { id },
      data: { quantity }
    });

    res.json({ message: 'Cart item updated', item: updated });
  } catch (error: any) {
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
    await prisma.cartItem.delete({ where: { id } });
    res.json({ message: 'Item removed from cart' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete cart item' });
  }
};

export const syncGuestCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { items } = req.body; // Array of { productId, size, color, quantity }
    if (!Array.isArray(items)) {
      res.status(400).json({ message: 'Items array expected' });
      return;
    }

    let cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId: req.user.id } });
    }

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: String(item.productId) } });
      if (!product || product.stock < 1) continue;

      const existing = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: String(item.productId),
          size: item.size || null,
          color: item.color || null
        }
      });

      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: {
            quantity: Math.min(product.stock, existing.quantity + (item.quantity || 1))
          }
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: String(item.productId),
            size: item.size || null,
            color: item.color || null,
            quantity: Math.min(product.stock, item.quantity || 1)
          }
        });
      }
    }

    const updatedCart = await prisma.cart.findUnique({
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

    res.json({ message: 'Cart synced successfully', cart: updatedCart });
  } catch (error: any) {
    console.error('syncGuestCart error:', error);
    res.status(500).json({ message: 'Failed to sync cart' });
  }
};
