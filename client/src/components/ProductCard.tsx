import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Eye, ShoppingBag, Star, Sparkles, Zap } from 'lucide-react';
import { Product } from '../types';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { QuickViewModal } from './QuickViewModal';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [isDirectBuyPending, setIsDirectBuyPending] = useState(false);

  const primaryImage = product.images?.find((img) => img.isPrimary)?.url || product.images?.[0]?.url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80';
  const secondaryImage = product.images?.[1]?.url || primaryImage;

  const isFavorited = isInWishlist(product.id);
  const sizes = product.availableSizes ? product.availableSizes.split(',').map((s) => s.trim()) : ['Free Size'];

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (sizes.length > 1 && !selectedSize) {
      setIsDirectBuyPending(false);
      setShowSizeDropdown(!showSizeDropdown);
      return;
    }

    addToCart(product, selectedSize || sizes[0]);
    setShowSizeDropdown(false);
  };

  const handleQuickBuy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (sizes.length > 1 && !selectedSize) {
      setIsDirectBuyPending(true);
      setShowSizeDropdown(true);
      return;
    }

    const added = await addToCart(product, selectedSize || sizes[0], undefined, 1, false);
    if (added !== false) {
      navigate('/checkout');
    }
  };

  const selectSizeAndAdd = async (size: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedSize(size);
    setShowSizeDropdown(false);

    if (isDirectBuyPending) {
      setIsDirectBuyPending(false);
      const added = await addToCart(product, size, undefined, 1, false);
      if (added !== false) {
        navigate('/checkout');
      }
    } else {
      addToCart(product, size);
    }
  };

  return (
    <>
      <div className="group relative flex flex-col bg-white rounded-lg overflow-hidden border border-[#E8DEC8] hover:border-[#C6A15D] transition-all duration-500 hover:shadow-luxury">
        
        {/* Image Container with Hover Crossfade & Smooth Scale */}
        <Link to={`/product/${product.slug}`} className="relative block aspect-[3/4] overflow-hidden bg-[#FAF7F2]">
          
          {/* Primary image */}
          <img
            src={primaryImage}
            alt={product.name}
            className="w-full h-full object-cover transition-opacity duration-700 ease-in-out group-hover:opacity-0"
            loading="lazy"
          />

          {/* Secondary image on hover */}
          <img
            src={secondaryImage}
            alt={`${product.name} alternate view`}
            className="w-full h-full object-cover absolute inset-0 opacity-0 transition-all duration-700 ease-in-out group-hover:opacity-100 group-hover:scale-104"
            loading="lazy"
          />

          {/* Subtle vignette on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          {/* Subtle luxury badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
            {product.discountPercent > 0 && (
              <span className="bg-[#3E1A1E] text-[#DFC89D] text-[9px] font-semibold px-2 py-0.5 tracking-[0.15em] uppercase rounded-sm border border-[#C6A15D]/30 shadow-xs">
                -{product.discountPercent}%
              </span>
            )}
            {product.isBestSeller && (
              <span className="bg-[#FAF7F2]/95 backdrop-blur-xs text-[#3E1A1E] text-[9px] font-semibold px-2 py-0.5 tracking-[0.15em] uppercase rounded-sm border border-[#C6A15D]/40 shadow-xs">
                Iconic
              </span>
            )}
            {product.isNewArrival && !product.isBestSeller && (
              <span className="bg-[#FAF7F2]/95 backdrop-blur-xs text-[#1A1A1A] text-[9px] font-medium px-2 py-0.5 tracking-[0.15em] uppercase rounded-sm border border-zinc-300 shadow-xs">
                New In
              </span>
            )}
          </div>

          {/* Wishlist Heart Button with 44px Touch Target */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(product);
            }}
            className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#FAF7F2]/90 hover:bg-white text-[#1A1A1A] hover:text-[#3E1A1E] shadow-sm backdrop-blur-md flex items-center justify-center transition-all z-10 hover:scale-110 active:scale-95 border border-[#C6A15D]/30"
            title="Save to Wardrobe"
            aria-label="Save to Wardrobe"
          >
            <Heart
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
                isFavorited ? 'fill-[#3E1A1E] text-[#3E1A1E]' : 'text-zinc-600'
              }`}
            />
          </button>

          {/* Quick Actions overlay (Slide Up on Hover) */}
          <div className="absolute inset-x-2 bottom-2 sm:inset-x-2.5 sm:bottom-2.5 flex items-center justify-between gap-1 sm:gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-10">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsQuickViewOpen(true);
              }}
              className="flex-1 h-8 sm:h-10 bg-white/95 text-[#1A1A1A] hover:bg-[#3E1A1E] hover:text-[#DFC89D] text-[9px] sm:text-[10px] font-semibold tracking-[0.12em] sm:tracking-[0.15em] uppercase rounded shadow backdrop-blur-md flex items-center justify-center gap-1 transition-colors border border-[#C6A15D]/40"
              title="Quick View"
              aria-label="Quick View"
            >
              <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#C6A15D]" />
              <span className="hidden sm:inline">Quick</span> View
            </button>

            <button
              onClick={handleQuickAdd}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-white/95 hover:bg-[#FAF7F2] text-[#3E1A1E] rounded shadow flex items-center justify-center transition-all duration-200 hover:scale-105 border border-[#3E1A1E]"
              title="Add to Shopping Bag"
              aria-label="Add to Shopping Bag"
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#3E1A1E]" />
            </button>

            <button
              onClick={handleQuickBuy}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-[#3E1A1E] hover:bg-[#2B0C10] text-[#DFC89D] rounded shadow flex items-center justify-center transition-all duration-200 hover:scale-105 border border-[#C6A15D]/60"
              title="Buy Now • Direct Checkout"
              aria-label="Buy Now • Direct Checkout"
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C6A15D] fill-[#C6A15D]" />
            </button>
          </div>

          {/* Quick Size Dropdown Overlay if clicked without size */}
          {showSizeDropdown && (
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="absolute inset-x-2 sm:inset-x-3 bottom-12 sm:bottom-14 bg-white/95 backdrop-blur-md p-2.5 sm:p-3.5 rounded-lg shadow-2xl border border-[#C6A15D] z-20 animate-fade-in text-center"
            >
              <p className="text-[9px] sm:text-[10px] font-bold text-[#3E1A1E] tracking-widest uppercase mb-1.5 sm:mb-2">
                {isDirectBuyPending ? 'Choose Size to Buy:' : 'Choose Size to Add:'}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={(e) => selectSizeAndAdd(s, e)}
                    className="min-h-[32px] sm:min-h-[36px] min-w-[32px] sm:min-w-[36px] px-2 sm:px-3 py-1 text-xs border border-[#E8DEC8] hover:border-[#3E1A1E] hover:bg-[#3E1A1E] hover:text-[#DFC89D] rounded-md text-zinc-800 font-semibold transition-colors flex items-center justify-center"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

        </Link>

        {/* Product Information */}
        <div className="p-2.5 sm:p-4 flex flex-col flex-1 justify-between bg-white">
          <div>
            {/* Category / Fabric & GI Tag */}
            <div className="flex items-center justify-between text-[9px] sm:text-[10px] tracking-wider uppercase text-[#84642C] font-bold">
              <span className="truncate">{product.fabric || product.category?.name || 'Pure Silk'}</span>
              <span className="text-[8px] sm:text-[9px] text-zinc-400 font-normal shrink-0 ml-1">{product.occasion || 'Haute Couture'}</span>
            </div>

            {/* Product Title */}
            <Link to={`/product/${product.slug}`} className="block mt-1">
              <h3 className="font-serif text-xs sm:text-base font-normal text-[#1A1A1A] line-clamp-1 group-hover:text-[#3E1A1E] transition-colors">
                {product.name}
              </h3>
            </Link>

            {/* Rating Stars */}
            <div className="flex items-center gap-1 mt-1 sm:mt-1.5">
              <div className="flex text-[#C6A15D]">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${
                      i < Math.floor(product.rating || 5)
                        ? 'fill-[#C6A15D] text-[#C6A15D]'
                        : 'text-zinc-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] sm:text-[11px] text-zinc-500 font-medium">
                ({product.reviewCount || 1})
              </span>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="mt-2 sm:mt-3 pt-2 sm:pt-2.5 border-t border-zinc-100 flex items-baseline justify-between gap-1">
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className="font-serif text-sm sm:text-lg font-bold text-[#3E1A1E]">
                {formatPrice(product.price)}
              </span>
              {product.comparePrice && product.comparePrice > product.price && (
                <span className="text-[10px] sm:text-xs text-zinc-400 line-through">
                  {formatPrice(product.comparePrice)}
                </span>
              )}
            </div>

            {/* Stock status indicator */}
            {product.stock === 0 ? (
              <span className="text-[8px] sm:text-[9px] text-red-600 font-bold uppercase tracking-wider shrink-0">
                Sold Out
              </span>
            ) : (
              <span className="text-[8px] sm:text-[9px] text-emerald-700 font-bold tracking-wider uppercase bg-emerald-50 px-1 sm:px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                In Stock
              </span>
            )}
          </div>

        </div>

      </div>

      {/* Quick View Modal */}
      {isQuickViewOpen && (
        <QuickViewModal
          product={product}
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
        />
      )}
    </>
  );
};
