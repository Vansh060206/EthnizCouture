import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Star, ShoppingBag, ArrowRight, Zap } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';

interface QuickViewModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, isOpen, onClose }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();
  const [selectedImage, setSelectedImage] = useState<string>(
    product.images?.[0]?.url || 'https://via.placeholder.com/600x800'
  );
  const [quantity, setQuantity] = useState<number>(1);

  const sizes = product.availableSizes ? product.availableSizes.split(',').map((s) => s.trim()) : ['Free Size'];
  const [selectedSize, setSelectedSize] = useState<string>(sizes[0]);

  if (!isOpen) return null;

  const handleAddToCart = () => {
    addToCart(product, selectedSize, undefined, quantity);
    onClose();
  };

  const handleBuyNow = async () => {
    if (!product || product.stock === 0) return;
    const added = await addToCart(product, selectedSize, undefined, quantity, false);
    if (added !== false) {
      onClose();
      navigate('/checkout');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div 
        className="relative bg-[#FAF7F2] rounded-t-[28px] sm:rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden border-t sm:border border-[#C6A15D]/40 max-h-[90vh] overflow-y-auto animate-scale-up"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-zinc-300 rounded-full mx-auto mt-3 sm:hidden" />
        
        {/* Close button with 44px Touch Target */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-zinc-600 hover:text-[#3E1A1E] bg-white/90 hover:bg-white rounded-full shadow-sm border border-[#C6A15D]/30 transition-all hover:scale-105 active:scale-95"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-8">
          
          {/* Left Gallery */}
          <div className="space-y-3">
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-[#F6F2EB] shadow-inner border border-[#E8DEC8]">
              <img
                src={selectedImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(img.url)}
                    className={`w-14 h-18 rounded-md overflow-hidden border-2 shrink-0 transition-all ${
                      selectedImage === img.url ? 'border-[#3E1A1E] ring-1 ring-[#C6A15D]' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Product Details */}
          <div className="flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-gold-700">
                  {product.category?.name || 'Couture'}
                </span>
                <h2 className="font-serif text-2xl font-bold text-zinc-900 mt-1">
                  {product.name}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">SKU: {product.sku}</p>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(product.rating || 5)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-zinc-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-zinc-600">
                  {product.rating} ({product.reviewCount || 1} reviews)
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 pt-1">
                <span className="font-serif text-2xl font-bold text-maroon-950">
                  {formatPrice(product.price)}
                </span>
                {product.comparePrice && product.comparePrice > product.price && (
                  <span className="text-sm text-zinc-400 line-through">
                    {formatPrice(product.comparePrice)}
                  </span>
                )}
                {product.discountPercent > 0 && (
                  <span className="text-xs font-bold text-gold-900 bg-gold-100 px-2 py-0.5 rounded border border-gold-300">
                    Save {product.discountPercent}%
                  </span>
                )}
              </div>

              {/* Description summary */}
              <p className="text-xs text-zinc-600 line-clamp-3 leading-relaxed">
                {product.description}
              </p>

              {/* Size Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-2">
                  Select Size:
                </label>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`min-h-[40px] min-w-[40px] px-3.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center justify-center ${
                        selectedSize === s
                          ? 'bg-[#3E1A1E] text-[#DFC89D] border-[#C6A15D] shadow'
                          : 'bg-white text-zinc-800 border-[#E8DEC8] hover:border-[#3E1A1E]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5">
                  Quantity:
                </label>
                <div className="inline-flex items-center border border-[#E8DEC8] rounded-lg bg-white h-11">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3.5 py-1 text-zinc-600 hover:text-black font-semibold text-sm h-full flex items-center justify-center"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="px-3.5 py-1 text-xs font-bold text-zinc-900">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="px-3.5 py-1 text-zinc-600 hover:text-black font-semibold text-sm h-full flex items-center justify-center"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                {product.stock <= 4 && (
                  <span className="ml-3 text-xs text-amber-700 font-semibold">
                    Only {product.stock} left in stock!
                  </span>
                )}
              </div>
            </div>

            {/* Actions: Add to Bag + Buy Now Direct Place Order */}
            <div className="pt-6 border-t border-zinc-200 mt-6 space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="w-full h-12 bg-white hover:bg-[#FAF7F2] active:bg-[#F5EFE6] disabled:bg-zinc-200 text-[#3E1A1E] text-xs font-bold tracking-wider uppercase rounded-lg border-2 border-[#3E1A1E] shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ShoppingBag className="w-4 h-4 text-[#3E1A1E]" />
                  <span>{product.stock === 0 ? 'Out of Stock' : 'Add to Bag'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={product.stock === 0}
                  className="w-full h-12 bg-gradient-to-r from-[#3E1A1E] via-[#4A1F24] to-[#3E1A1E] hover:from-[#2B0C10] hover:to-[#2B0C10] active:scale-[0.99] disabled:bg-zinc-300 text-[#DFC89D] hover:text-white text-xs font-bold tracking-wider uppercase rounded-lg border border-[#C6A15D] shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Zap className="w-4 h-4 text-[#C6A15D] fill-[#C6A15D]" />
                  <span>Buy Now</span>
                </button>
              </div>

              <Link
                to={`/product/${product.slug}`}
                onClick={onClose}
                className="w-full py-2.5 text-center text-xs font-bold tracking-wider text-[#3E1A1E] hover:text-[#2B0C10] flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>View Complete Heritage Details</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C6A15D]" />
              </Link>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
