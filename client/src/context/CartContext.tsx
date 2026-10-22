import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import api from '../services/api';

interface AppliedCoupon {
  code: string;
  discountAmount: number;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, size?: string, color?: string, quantity?: number, openDrawer?: boolean) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  total: number;
  freeShippingThreshold: number;
  amountNeededForFreeShipping: number;
  appliedCoupon: AppliedCoupon | null;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  totalItemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<CartItem[]>(() => {
    const local = localStorage.getItem('ethniz_cart');
    return local ? JSON.parse(local) : [];
  });
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(() => {
    const local = localStorage.getItem('ethniz_coupon');
    return local ? JSON.parse(local) : null;
  });
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('ethniz_cart', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem('ethniz_coupon', JSON.stringify(appliedCoupon));
    } else {
      localStorage.removeItem('ethniz_coupon');
    }
  }, [appliedCoupon]);

  // When user logs in, merge local items to server and fetch authoritative cart
  useEffect(() => {
    const syncWithServer = async () => {
      if (user) {
        try {
          if (items.length > 0) {
            await api.post('/cart/sync', {
              items: items.map((i) => ({
                productId: i.productId,
                size: i.size,
                color: i.color,
                quantity: i.quantity
              }))
            });
          }
          const res = await api.get('/cart');
          if (res.data.cart?.items) {
            setItems(res.data.cart.items);
          }
        } catch (err) {
          console.error('Failed to sync cart with server:', err);
        }
      }
    };
    syncWithServer();
  }, [user]);

  const addToCart = async (
    product: Product,
    size?: string,
    color?: string,
    quantity: number = 1,
    openDrawer: boolean = true
  ): Promise<boolean> => {
    // When adding new items to bag, reset any previous completed order lock
    try {
      sessionStorage.removeItem('ethniz_last_completed_order');
    } catch {
      // ignore
    }

    // Check stock
    if (product.stock < quantity) {
      showToast(`Only ${product.stock} items remaining in stock.`, 'error');
      return false;
    }

    const effectiveSize = size || (product.availableSizes ? product.availableSizes.split(',')[0].trim() : 'Free Size');
    const effectiveColor = color || (product.availableColors ? product.availableColors.split(',')[0].trim() : undefined);

    if (user) {
      try {
        const res = await api.post('/cart/items', {
          productId: product.id,
          size: effectiveSize,
          color: effectiveColor,
          quantity
        });
        if (res.data.cart?.items) {
          setItems(res.data.cart.items);
        }
      } catch (err: any) {
        showToast(err.response?.data?.message || 'Failed to add item to cart', 'error');
        return false;
      }
    } else {
      // Guest local cart update
      let stockExceeded = false;
      setItems((prev) => {
        const existingIndex = prev.findIndex(
          (i) => i.productId === product.id && i.size === effectiveSize && i.color === effectiveColor
        );
        if (existingIndex > -1) {
          const updated = [...prev];
          const newQty = updated[existingIndex].quantity + quantity;
          if (newQty > product.stock) {
            stockExceeded = true;
            return prev;
          }
          updated[existingIndex].quantity = newQty;
          return updated;
        } else {
          const newItem: CartItem = {
            id: 'guest_' + Date.now().toString(),
            productId: product.id,
            size: effectiveSize,
            color: effectiveColor,
            quantity,
            product
          };
          return [...prev, newItem];
        }
      });
      if (stockExceeded) {
        showToast(`Cannot exceed maximum available stock (${product.stock}).`, 'error');
        return false;
      }
    }

    if (openDrawer) {
      showToast(`Added "${product.name}" to your couture bag`, 'success');
      setIsCartOpen(true);
    }
    return true;
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(itemId);
      return;
    }

    if (user && !itemId.startsWith('guest_')) {
      try {
        await api.put(`/cart/items/${itemId}`, { quantity });
        setItems((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
        );
      } catch (err: any) {
        showToast(err.response?.data?.message || 'Failed to update quantity', 'error');
      }
    } else {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            if (item.product && item.product.stock < quantity) {
              showToast(`Only ${item.product.stock} items available in stock.`, 'error');
              return item;
            }
            return { ...item, quantity };
          }
          return item;
        })
      );
    }
  };

  const removeFromCart = async (itemId: string) => {
    if (user && !itemId.startsWith('guest_')) {
      try {
        await api.delete(`/cart/items/${itemId}`);
      } catch (err) {
        console.error('Failed to remove server item');
      }
    }
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    showToast('Item removed from your bag', 'info');
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    localStorage.removeItem('ethniz_cart');
    localStorage.removeItem('ethniz_coupon');
  };

  const subtotal = items.reduce((sum, item) => {
    const price = item.product?.price || 0;
    return sum + price * item.quantity;
  }, 0);

  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const freeShippingThreshold = 2999;
  const netBeforeShipping = Math.max(0, subtotal - discountAmount);
  const shippingFee = items.length === 0 || netBeforeShipping >= freeShippingThreshold ? 0 : 199;
  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - netBeforeShipping);
  const total = items.length === 0 ? 0 : Math.max(0, netBeforeShipping + shippingFee);

  const applyCoupon = async (code: string): Promise<boolean> => {
    try {
      const res = await api.post('/coupons/validate', {
        code,
        subtotal
      });
      if (res.data.valid) {
        setAppliedCoupon({
          code: res.data.code,
          discountAmount: res.data.discountAmount,
          discountType: res.data.discountType,
          discountValue: res.data.discountValue
        });
        showToast(res.data.message || `Coupon ${res.data.code} applied!`, 'success');
        return true;
      }
      return false;
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Invalid or expired coupon code', 'error');
      return false;
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    showToast('Coupon removed', 'info');
  };

  const totalItemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        subtotal,
        discountAmount,
        shippingFee,
        total,
        freeShippingThreshold,
        amountNeededForFreeShipping,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        isCartOpen,
        setIsCartOpen,
        totalItemCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
