import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ArrowRight, ShieldCheck, Tag, ShoppingBag, Sparkles, ArrowLeft, Gift } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';

export const CartPage: React.FC = () => {
  const { user } = useAuth();
  const {
    items,
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
  const [isApplying, setIsApplying] = useState(false);
  const navigate = useNavigate();

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setIsApplying(true);
    await applyCoupon(couponInput.trim());
    setIsApplying(false);
    setCouponInput('');
  };

  const handleQuickApplyChip = async (code: string) => {
    setIsApplying(true);
    await applyCoupon(code);
    setIsApplying(false);
  };

  const freeShippingProgress = Math.min(
    100,
    Math.round(((subtotal - discountAmount) / freeShippingThreshold) * 100)
  );

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 bg-maroon-50 text-maroon-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-maroon-200 shadow-sm">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-zinc-900">Your Couture Bag is Empty</h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-2 max-w-md mx-auto leading-relaxed">
          Explore handcrafted Varanasi silks, bridal lehengas, and royal heritage sherwanis crafted for life's most unforgettable moments.
        </p>
        <Link
          to="/shop"
          className="mt-6 inline-flex items-center gap-2 px-8 py-3.5 bg-maroon-800 text-gold-100 rounded text-xs font-bold tracking-widest uppercase hover:bg-maroon-900 shadow-md transition-all gold-shimmer-btn"
        >
          <span>Explore Collection</span>
          <ArrowRight className="w-4 h-4 text-gold-300" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 pb-32 sm:pb-12 space-y-6 sm:space-y-10">
      
      <div>
        <span className="text-[10px] font-bold tracking-[0.25em] text-gold-700 uppercase block mb-1">
          Atelier Bag &amp; Review
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-zinc-950">
          Your Shopping Bag
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Review your chosen pieces before proceeding to address &amp; secure encrypted payment.
        </p>
      </div>

      {/* Free Shipping Alert Banner */}
      <div className="bg-[#FAF2F4] p-4 sm:p-5 rounded-lg border border-[#ECCDD4] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-gold-600 shrink-0" />
          <p className="text-xs text-maroon-900 font-medium">
            {amountNeededForFreeShipping > 0 ? (
              <>
                Add <span className="font-bold text-maroon-800">{formatPrice(amountNeededForFreeShipping)}</span> more to qualify for <span className="font-bold uppercase tracking-wider text-gold-700">Complimentary Pan-India Air Shipping</span>
              </>
            ) : (
              <span className="font-bold text-emerald-800">
                You’ve qualified for Complimentary Insured Express Shipping!
              </span>
            )}
          </p>
        </div>
        <div className="w-full sm:w-56 bg-zinc-200 h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-maroon-800 to-gold-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${freeShippingProgress}%` }}
          />
        </div>
      </div>

      {/* Main Grid: Items Table on Left + Summary Card on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* ITEMS LIST (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-lg border border-[#E8DEC8] overflow-hidden shadow-xs">
          <div className="divide-y divide-zinc-200">
            {items.map((item) => {
              const prod = item.product;
              if (!prod) return null;
              const imgUrl = prod.images?.[0]?.url || 'https://via.placeholder.com/120';

              return (
                <div key={item.id} className="p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                  <div className="flex gap-4 items-center">
                    <img
                      src={imgUrl}
                      alt={prod.name}
                      className="w-20 h-26 object-cover rounded bg-zinc-100 border border-zinc-200 shrink-0 shadow-xs"
                    />
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gold-700">
                        {prod.fabric || prod.category?.name}
                      </span>
                      <Link
                        to={`/product/${prod.slug}`}
                        className="block font-serif text-base font-bold text-zinc-900 hover:text-maroon-800 transition-colors"
                      >
                        {prod.name}
                      </Link>
                      <p className="text-xs text-zinc-500">
                        Size: <span className="font-semibold text-zinc-800">{item.size || 'Standard'}</span>
                        {item.color && (
                          <> · Color: <span className="font-semibold text-zinc-800">{item.color}</span></>
                        )}
                      </p>
                      <p className="font-serif text-sm font-bold text-maroon-900 sm:hidden">
                        {formatPrice(prod.price * item.quantity)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full sm:w-auto sm:gap-8">
                    {/* Quantity controls */}
                    <div className="inline-flex items-center border border-zinc-300 rounded text-xs bg-[#FAF7F2]">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2.5 py-1 text-zinc-600 hover:bg-zinc-200 font-bold"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 font-bold text-zinc-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2.5 py-1 text-zinc-600 hover:bg-zinc-200 font-bold"
                      >
                        +
                      </button>
                    </div>

                    {/* Total Price */}
                    <span className="hidden sm:block font-serif text-base font-bold text-maroon-950">
                      {formatPrice(prod.price * item.quantity)}
                    </span>

                    {/* Remove button */}
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 text-zinc-400 hover:text-red-700 transition-colors"
                      title="Remove from bag"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-[#FAF7F2] border-t border-zinc-200 flex justify-between items-center text-xs">
            <Link to="/shop" className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-maroon-800 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              <span>Continue Shopping</span>
            </Link>
          </div>
        </div>

        {/* SUMMARY CARD (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 sm:p-8 rounded-lg border border-[#E8DEC8] shadow-sm space-y-6">
          <h2 className="font-serif text-xl font-bold text-zinc-900 pb-3 border-b border-zinc-200">
            Order Summary
          </h2>

          {/* Coupon Box */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800">
              Promotional Coupon
            </label>
            {appliedCoupon ? (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold text-emerald-900 uppercase">{appliedCoupon.code}</span>
                    <span className="text-emerald-700 ml-1 font-semibold">
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
                <form onSubmit={handleCouponSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. WELCOME10"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="flex-1 h-11 px-3.5 text-base sm:text-xs border border-zinc-300 rounded-lg uppercase focus:outline-none focus:border-maroon-800"
                  />
                  <button
                    type="submit"
                    disabled={isApplying || !couponInput.trim()}
                    className="h-11 px-5 bg-zinc-900 text-gold-200 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-black disabled:bg-zinc-400"
                  >
                    {isApplying ? '...' : 'Apply'}
                  </button>
                </form>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">Quick:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickApplyChip('WELCOME10')}
                    className="px-2 py-0.5 bg-gold-50 hover:bg-gold-100 text-gold-900 border border-gold-300 rounded text-[10px] font-bold uppercase"
                  >
                    WELCOME10
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickApplyChip('ROYAL500')}
                    className="px-2 py-0.5 bg-gold-50 hover:bg-gold-100 text-gold-900 border border-gold-300 rounded text-[10px] font-bold uppercase"
                  >
                    ROYAL500
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Breakdown */}
          <div className="space-y-2.5 text-xs text-zinc-600 border-t border-zinc-200 pt-4">
            <div className="flex justify-between">
              <span>Bag Subtotal</span>
              <span className="font-semibold text-zinc-900">{formatPrice(subtotal)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Coupon Savings</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Estimated Shipping</span>
              <span className="font-semibold text-zinc-900">
                {shippingFee === 0 ? (
                  <span className="text-emerald-700 font-bold uppercase tracking-wider">Complimentary</span>
                ) : (
                  formatPrice(shippingFee)
                )}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Estimated GST / Duties</span>
              <span className="font-semibold text-zinc-900">Included</span>
            </div>

            <div className="pt-3 border-t border-zinc-200 flex justify-between items-baseline">
              <span className="font-serif text-lg font-bold text-zinc-950">Grand Total</span>
              <span className="font-serif text-2xl font-bold text-maroon-950">
                {formatPrice(total)}
              </span>
            </div>
          </div>

          {/* Gift Wrapping note */}
          <div className="flex items-center gap-2 p-2.5 bg-gold-50/60 rounded border border-gold-200 text-xs text-zinc-700">
            <Gift className="w-4 h-4 text-gold-600 shrink-0" />
            <span>Signature royal velvet gift casing included at zero extra cost.</span>
          </div>

          {/* Checkout CTA */}
          <button
            onClick={() => {
              try {
                sessionStorage.removeItem('ethniz_last_completed_order');
              } catch {
                // ignore
              }
              if (!user) {
                navigate('/login?redirect=/checkout');
              } else {
                navigate('/checkout');
              }
            }}
            className="w-full py-4 bg-[#3E1A1E] hover:bg-[#2B0C10] text-[#DFC89D] text-xs font-bold tracking-[0.2em] uppercase rounded shadow-lg transition-all duration-300 border border-[#C6A15D]/40 flex items-center justify-center gap-2 group"
          >
            <span>PROCEED TO SECURE CHECKOUT</span>
            <ArrowRight className="w-4 h-4 text-[#C6A15D] transition-transform group-hover:translate-x-1" />
          </button>

          <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 pt-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Encrypted 256-bit Secure Checkout by Stripe</span>
          </div>

        </div>

      </div>

      {/* Flipkart-Style Mobile Sticky Checkout Bar */}
      <div
        className="fixed bottom-14 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E8DEC8] px-4 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] flex items-center justify-between sm:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)' }}
      >
        <div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Total Amount</span>
          <span className="font-serif text-lg font-bold text-[#3E1A1E]">{formatPrice(total)}</span>
        </div>
        <button
          onClick={() => {
            try {
              sessionStorage.removeItem('ethniz_last_completed_order');
            } catch {
              // ignore
            }
            if (!user) {
              navigate('/login?redirect=/checkout');
            } else {
              navigate('/checkout');
            }
          }}
          className="h-11 px-5 bg-[#3E1A1E] hover:bg-[#2B0C10] active:scale-95 text-[#DFC89D] text-xs font-bold uppercase tracking-wider rounded-lg shadow-md flex items-center gap-1.5 transition-transform"
        >
          <span>PLACE ORDER</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
