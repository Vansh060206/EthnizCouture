import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, ShoppingBag, Trash2, ArrowRight, Tag, Sparkles, Check, Gift } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';

export const CartDrawer: React.FC = () => {
  const { user } = useAuth();
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    subtotal,
    discountAmount,
    shippingFee,
    total,
    freeShippingThreshold,
    amountNeededForFreeShipping,
    appliedCoupon,
    applyCoupon,
    removeCoupon
  } = useCart();

  const { formatPrice } = useCurrency();
  const [couponInput, setCouponInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setIsApplyingCoupon(true);
    await applyCoupon(couponInput.trim());
    setIsApplyingCoupon(false);
    setCouponInput('');
  };

  const handleQuickApplyChip = async (code: string) => {
    setIsApplyingCoupon(true);
    await applyCoupon(code);
    setIsApplyingCoupon(false);
  };

  const handleCheckoutClick = () => {
    try {
      sessionStorage.removeItem('ethniz_last_completed_order');
    } catch {
      // ignore
    }
    setIsCartOpen(false);
    if (!user) {
      navigate('/login?redirect=/checkout');
    } else {
      navigate('/checkout');
    }
  };

  const freeShippingProgress = Math.min(
    100,
    Math.round(((subtotal - discountAmount) / freeShippingThreshold) * 100)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-[#FAF7F2] shadow-2xl flex flex-col border-l border-gold-300">
          
          {/* Header */}
          <div className="p-5 border-b border-[#E8DEC8] flex items-center justify-between bg-white">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#3E1A1E] rounded-lg text-[#DFC89D]">
                <ShoppingBag className="w-4 h-4 text-[#DFC89D]" />
              </div>
              <h2 className="font-serif text-xl font-bold text-zinc-900">
                Your Couture Bag ({items.reduce((sum, i) => sum + i.quantity, 0)})
              </h2>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-600 hover:text-[#3E1A1E] bg-white hover:bg-zinc-100 shadow-xs border border-[#C6A15D]/30 transition-all hover:scale-105 active:scale-95"
              aria-label="Close bag"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Complimentary Shipping Progress Bar */}
          <div className="bg-[#FAF2F4] px-5 py-3.5 border-b border-[#ECCDD4]">
            {amountNeededForFreeShipping > 0 ? (
              <p className="text-xs text-maroon-900 font-medium">
                Add <span className="font-bold text-maroon-800">{formatPrice(amountNeededForFreeShipping)}</span> more for <span className="font-bold uppercase tracking-wider text-gold-700">Complimentary Air Shipping</span>
              </p>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                <span>Unlocked Complimentary Insured Air Shipping!</span>
              </div>
            )}
            <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-gradient-to-r from-maroon-800 to-gold-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                <div className="p-4 bg-zinc-100 rounded-full mb-3">
                  <ShoppingBag className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-zinc-800">Your bag is empty</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                  Discover heirloom sarees, bridal lehengas, and royal festive wear crafted for celebrations.
                </p>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/shop');
                  }}
                  className="mt-5 px-6 py-2.5 bg-maroon-800 text-gold-100 rounded text-xs font-bold tracking-widest uppercase hover:bg-maroon-900 transition-colors"
                >
                  Explore Collection
                </button>
              </div>
            ) : (
              items.map((item) => {
                const product = item.product;
                if (!product) return null;
                const imgUrl = product.images?.[0]?.url || 'https://via.placeholder.com/100';

                return (
                  <div
                    key={item.id}
                    className="flex gap-4 p-3.5 bg-white rounded-lg border border-[#E8DEC8] shadow-xs"
                  >
                    <img
                      src={imgUrl}
                      alt={product.name}
                      className="w-20 h-24 object-cover rounded bg-zinc-100 shrink-0 shadow-xs"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <Link
                            to={`/product/${product.slug}`}
                            onClick={() => setIsCartOpen(false)}
                            className="font-serif text-sm font-semibold text-zinc-900 line-clamp-1 hover:text-maroon-800"
                          >
                            {product.name}
                          </Link>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-zinc-400 hover:text-red-700 p-1"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Size: <span className="font-medium text-zinc-800">{item.size || 'Standard'}</span>
                          {item.color && (
                            <> | Color: <span className="font-medium text-zinc-800">{item.color}</span></>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100">
                        {/* Quantity Counter */}
                        <div className="inline-flex items-center border border-zinc-300 rounded text-xs">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="px-2 py-0.5 text-zinc-600 hover:bg-zinc-100 font-bold"
                          >
                            -
                          </button>
                          <span className="px-2.5 py-0.5 font-bold text-zinc-800">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="px-2 py-0.5 text-zinc-600 hover:bg-zinc-100 font-bold"
                          >
                            +
                          </button>
                        </div>

                        {/* Price */}
                        <span className="font-serif text-sm font-bold text-maroon-950">
                          {formatPrice(product.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Checkout Area */}
          {items.length > 0 && (
            <div
              className="p-5 border-t border-[#E8DEC8] bg-white space-y-3.5 shadow-lg"
              style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
            >
              
              {/* Promo code field */}
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-300 rounded text-xs">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-bold text-emerald-900 uppercase">{appliedCoupon.code}</span>
                      <span className="text-emerald-700 ml-1.5 font-semibold">
                        (-{formatPrice(appliedCoupon.discountAmount)})
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-xs text-red-600 hover:underline font-bold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter Coupon (e.g. WELCOME10)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="flex-1 h-11 px-3.5 text-base sm:text-xs border border-zinc-300 rounded-lg uppercase placeholder:normal-case focus:outline-none focus:border-maroon-800"
                    />
                    <button
                      type="submit"
                      disabled={isApplyingCoupon || !couponInput.trim()}
                      className="h-11 px-5 bg-zinc-900 text-gold-200 rounded-lg text-xs font-bold tracking-wider uppercase hover:bg-black disabled:bg-zinc-400"
                    >
                      {isApplyingCoupon ? '...' : 'Apply'}
                    </button>
                  </form>

                  {/* 1-Click Coupon Recommendations */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold shrink-0">Try:</span>
                    <button
                      type="button"
                      onClick={() => handleQuickApplyChip('WELCOME10')}
                      className="px-2 py-0.5 bg-gold-50 hover:bg-gold-100 text-gold-900 border border-gold-300 rounded text-[10px] font-bold uppercase tracking-wider shrink-0"
                    >
                      WELCOME10 (10% Off)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickApplyChip('ROYAL500')}
                      className="px-2 py-0.5 bg-gold-50 hover:bg-gold-100 text-gold-900 border border-gold-300 rounded text-[10px] font-bold uppercase tracking-wider shrink-0"
                    >
                      ROYAL500 (₹500 Off)
                    </button>
                  </div>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-zinc-600 pt-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-zinc-900">{formatPrice(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Insured Air Shipping</span>
                  <span className="font-medium text-zinc-900">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-700 font-bold uppercase tracking-wider">Free</span>
                    ) : (
                      formatPrice(shippingFee)
                    )}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-zinc-200 text-sm font-bold text-zinc-950">
                  <span className="font-serif text-base">Grand Total</span>
                  <span className="font-serif text-base text-maroon-950 font-bold">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              {/* Complimentary Gift Box Note */}
              <div className="flex items-center gap-2 p-2 bg-gold-50/60 rounded border border-gold-200 text-[11px] text-zinc-700">
                <Gift className="w-3.5 h-3.5 text-gold-600 shrink-0" />
                <span>Complimentary velvet heirloom box &amp; handwritten calligraphy gift card included.</span>
              </div>

              {/* Checkout Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleCheckoutClick}
                  className="w-full h-12 bg-[#3E1A1E] hover:bg-[#2B0C10] active:bg-[#1A080B] text-[#DFC89D] text-xs font-bold tracking-[0.2em] uppercase rounded-lg shadow-lg transition-all duration-300 border border-[#C6A15D]/50 flex items-center justify-center gap-2 group"
                >
                  <span>CHECKOUT</span>
                  <ArrowRight className="w-4 h-4 text-[#C6A15D] transition-transform group-hover:translate-x-1" />
                </button>
                
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/cart');
                  }}
                  className="w-full h-12 bg-white hover:bg-[#FAF7F2] active:bg-[#F5EFE6] text-[#3E1A1E] text-xs font-bold tracking-[0.2em] uppercase rounded-lg border-2 border-[#3E1A1E] transition-all text-center flex items-center justify-center shadow-xs"
                >
                  VIEW BAG
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
