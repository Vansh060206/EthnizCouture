import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Compass, Heart, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';

export const MobileBottomNav: React.FC = () => {
  const { totalItemCount, setIsCartOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const { user } = useAuth();
  const location = useLocation();

  // Hide on admin routes, checkout, or product detail pages (where dedicated Flipkart-style action bar is present)
  if (
    location.pathname.startsWith('/atelier-portal') ||
    location.pathname === '/checkout' ||
    location.pathname.startsWith('/product/')
  ) {
    return null;
  }

  const isAccountActive = location.pathname.startsWith('/account');

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-[#E8DEC8] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-5 h-14 items-center">
        
        {/* 1. Home */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center h-full transition-colors ${
              isActive && !isAccountActive
                ? 'text-[#3E1A1E] font-bold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Home className={`w-5 h-5 ${isActive && !isAccountActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] mt-0.5 tracking-wider">Home</span>
            </>
          )}
        </NavLink>

        {/* 2. Explore / Collections */}
        <NavLink
          to="/shop"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center h-full transition-colors ${
              isActive && !isAccountActive
                ? 'text-[#3E1A1E] font-bold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Compass className={`w-5 h-5 ${isActive && !isAccountActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] mt-0.5 tracking-wider">Explore</span>
            </>
          )}
        </NavLink>

        {/* 3. Saved Pieces (Wishlist) */}
        <NavLink
          to={user ? "/account?tab=wishlist" : "/login?redirect=/account?tab=wishlist"}
          className={() =>
            `flex flex-col items-center justify-center h-full relative transition-colors ${
              location.search.includes('wishlist')
                ? 'text-[#3E1A1E] font-bold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`
          }
        >
          <div className="relative">
            <Heart className={`w-5 h-5 ${location.search.includes('wishlist') ? 'stroke-[2.5] fill-[#3E1A1E]' : 'stroke-[1.8]'}`} />
            {wishlistCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 bg-[#3E1A1E] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                {wishlistCount > 99 ? '99+' : wishlistCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-wider">Saved</span>
        </NavLink>

        {/* 4. Bag Drawer Trigger */}
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center justify-center h-full text-zinc-500 hover:text-zinc-800 relative transition-colors focus:outline-none"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 stroke-[1.8] text-[#3E1A1E]" />
            {totalItemCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 bg-[#C6A15D] text-zinc-950 text-[9px] font-extrabold rounded-full flex items-center justify-center shadow-xs">
                {totalItemCount > 99 ? '99+' : totalItemCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-wider">Bag</span>
        </button>

        {/* 5. Account */}
        <NavLink
          to="/account"
          className={() =>
            `flex flex-col items-center justify-center h-full transition-colors ${
              isAccountActive
                ? 'text-[#3E1A1E] font-bold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`
          }
        >
          <div className="relative">
            <User className={`w-5 h-5 ${isAccountActive ? 'stroke-[2.5] text-[#3E1A1E]' : 'stroke-[1.8]'}`} />
            {isAccountActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#3E1A1E] rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-wider">Account</span>
        </NavLink>

      </div>
    </nav>
  );
};
