import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import api from '../services/api';

interface WishlistContextType {
  wishlist: Product[];
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: Product) => Promise<void>;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [wishlist, setWishlist] = useState<Product[]>(() => {
    const saved = localStorage.getItem('ethniz_wishlist');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('ethniz_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    const fetchServerWishlist = async () => {
      if (user) {
        try {
          const res = await api.get('/users/wishlist');
          if (res.data.wishlist) {
            const products = res.data.wishlist.map((w: any) => w.product);
            setWishlist(products);
          }
        } catch (err) {
          console.error('Failed to fetch wishlist from server:', err);
        }
      } else {
        setWishlist([]);
        localStorage.removeItem('ethniz_wishlist');
      }
    };
    fetchServerWishlist();
  }, [user]);

  const isInWishlist = (productId: string): boolean => {
    return wishlist.some((p) => p.id === productId);
  };

  const toggleWishlist = async (product: Product) => {
    if (!user) {
      showToast('Please sign in to save items to your wishlist', 'info');
      const currentPath = window.location.pathname + window.location.search;
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      return;
    }

    const currentlyIn = isInWishlist(product.id);

    if (currentlyIn) {
      setWishlist((prev) => prev.filter((p) => p.id !== product.id));
      showToast(`Removed "${product.name}" from your wishlist`, 'info');
    } else {
      setWishlist((prev) => [...prev, product]);
      showToast(`Saved "${product.name}" to your wishlist`, 'success');
    }

    try {
      await api.post('/users/wishlist/toggle', { productId: product.id });
    } catch (err) {
      console.error('Wishlist sync failed:', err);
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        isInWishlist,
        toggleWishlist,
        wishlistCount: wishlist.length
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
