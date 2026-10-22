import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Truck,
  Sparkles,
  MapPin,
  Calendar,
  ShieldCheck,
  Check,
  Copy,
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShoppingBag,
  Building2
} from 'lucide-react';
import { Order } from '../../types';
import { useCurrency } from '../../context/CurrencyContext';
import { useToast } from '../../context/ToastContext';
import { parseOrderNotes } from '../../utils/validation';

interface OrderSuccessAnimationProps {
  order: Order;
  onRefresh?: () => void;
}

export const OrderSuccessAnimation: React.FC<OrderSuccessAnimationProps> = ({ order, onRefresh }) => {
  const { formatPrice } = useCurrency();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  // Detect reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  // Determine authoritative payment and order state
  const isPaid = order.paymentStatus === 'PAID';
  const isCOD = order.paymentMethod === 'COD' || order.paymentMethod === 'CASH_ON_DELIVERY';
  const isConfirmed = order.orderStatus === 'CONFIRMED' || isPaid || (isCOD && order.orderStatus !== 'CANCELLED');
  const isPending = order.paymentStatus === 'PENDING' && !isCOD;
  const isFailed = order.paymentStatus === 'FAILED' || order.orderStatus === 'CANCELLED';

  const parsedNotes = parseOrderNotes(order.notes);
  const hasDistinctBilling = Boolean(parsedNotes.billingAddress || parsedNotes.gstin || parsedNotes.businessName);

  // Synchronized restrained gold confetti burst
  useEffect(() => {
    if (prefersReducedMotion || !isConfirmed) return;

    const timer = setTimeout(() => {
      try {
        confetti({
          particleCount: 50,
          spread: 65,
          origin: { y: 0.38 },
          colors: ['#C6A15D', '#DFC89D', '#F5EFE3', '#843241', '#FAF7F2'],
          ticks: 180,
          gravity: 0.85,
          scalar: 0.9,
          disableForReducedMotion: true
        });
      } catch {
        // Safe fallback if canvas is unavailable
      }
    }, 650);

    return () => clearTimeout(timer);
  }, [prefersReducedMotion, isConfirmed]);

  const handleCopyOrderNumber = () => {
    if (navigator.clipboard && order.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      showToast('Order number copied to clipboard', 'info');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      
      {/* =========================================================================
          HERO ANIMATION CARD
          ========================================================================= */}
      <div className="bg-white p-8 sm:p-12 rounded-2xl border border-[#DFC89D] shadow-luxury text-center relative overflow-hidden">
        
        {/* Subtle Ambient Background Jaali Pattern */}
        <div className="absolute inset-0 bg-jaali-subtle opacity-50 pointer-events-none" />

        {/* Floating Twinkling Golden Sparkles (Pure CSS) */}
        {!prefersReducedMotion && (
          <>
            <div className="absolute top-8 left-10 text-[#C6A15D] animate-sparkle-1 pointer-events-none hidden sm:block">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="absolute top-12 right-12 text-[#DFC89D] animate-sparkle-2 pointer-events-none hidden sm:block">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="absolute bottom-10 left-16 text-[#DFC89D] animate-sparkle-3 pointer-events-none hidden sm:block">
              <Sparkles className="w-4 h-4" />
            </div>
          </>
        )}

        <div className="relative z-10 space-y-6">
          
          {/* 1. SIGNATURE CONFIRMATION SEAL */}
          <div className="relative flex items-center justify-center w-28 h-28 mx-auto">
            {/* Outer Radiating Champagne Gold Ring */}
            {isConfirmed && !prefersReducedMotion && (
              <div
                className="absolute inset-0 rounded-full border border-[#C6A15D] animate-gold-ring pointer-events-none"
                aria-hidden="true"
              />
            )}

            {/* Inner Seal Disc */}
            <div
              className={`w-24 h-24 rounded-full shadow-luxury flex items-center justify-center relative overflow-hidden border-2 ${
                isFailed
                  ? 'bg-red-900 border-red-400 text-white'
                  : isPending
                  ? 'bg-amber-900 border-amber-400 text-[#DFC89D]'
                  : 'bg-gradient-to-br from-[#3E1A1E] via-[#2E1115] to-[#1C080B] border-[#C6A15D] text-[#DFC89D] animate-seal-pop animate-gold-aura'
              }`}
            >
              {/* Subtle jaali texture inside seal */}
              <div className="absolute inset-0 bg-jaali-dark opacity-35 pointer-events-none" />

              {/* Status Graphic */}
              {isConfirmed ? (
                <svg
                  className="w-14 h-14 relative z-10"
                  viewBox="0 0 52 52"
                  fill="none"
                  aria-label="Order Confirmed Checkmark"
                >
                  {/* Decorative concentric hairline */}
                  <circle
                    cx="26"
                    cy="26"
                    r="22"
                    stroke="#C6A15D"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.6"
                  />
                  {/* SVG Animated Stroke Checkmark */}
                  <path
                    className="seal-checkmark-path"
                    d="M15 27 L23 35 L37 19"
                    fill="none"
                    stroke="#DFC89D"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : isPending ? (
                <Clock className="w-10 h-10 text-amber-300 relative z-10 animate-spin" />
              ) : (
                <AlertCircle className="w-10 h-10 text-red-300 relative z-10" />
              )}
            </div>
          </div>

          {/* 2. HEADLINE & SUPPORTING TEXT (Staggered Reveals) */}
          <div className="space-y-2">
            {/* Status Ribbon */}
            <div className="animate-reveal-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.25em] uppercase bg-[#C6A15D]/15 text-[#84642C] border border-[#C6A15D]/30">
                <Sparkles className="w-3 h-3 text-[#C6A15D]" />
                {isFailed
                  ? 'Payment Declined'
                  : isPending
                  ? 'Authorization In Progress'
                  : isCOD
                  ? 'Atelier Order Placed'
                  : 'Atelier Order Confirmed'}
              </span>
            </div>

            {/* Headline */}
            <h1 className="animate-reveal-1 font-serif text-3xl sm:text-5xl font-bold text-zinc-950 tracking-wide">
              {isFailed
                ? 'Payment Authorization Failed'
                : isPending
                ? 'Payment is Pending Authorization'
                : isCOD
                ? 'Your order is placed!'
                : 'Your order is confirmed!'}
            </h1>

            {/* Supporting Text */}
            <p className="animate-reveal-2 font-serif italic text-base sm:text-xl text-[#84642C]">
              {isFailed
                ? 'Your transaction could not be completed.'
                : isPending
                ? 'Awaiting final confirmation from your financial provider.'
                : 'A beautiful choice, made just for you.'}
            </p>

            {/* Explanatory Details */}
            <p className="animate-reveal-2 text-xs sm:text-sm text-zinc-600 max-w-xl mx-auto leading-relaxed pt-1">
              {isFailed ? (
                'Your payment was declined by the card issuer or gateway. Your reserved items remain safe in your couture bag.'
              ) : isPending ? (
                'We have registered your order and are waiting for gateway confirmation. Please refresh shortly or contact the atelier concierge.'
              ) : isCOD ? (
                <>
                  Thank you for shopping with Ethniz Couture. Order{' '}
                  <span className="font-bold text-[#3E1A1E]">#{order.orderNumber}</span> has been received. Payment of{' '}
                  <span className="font-bold text-[#3E1A1E]">{formatPrice(order.totalAmount)}</span> is due upon delivery at your doorstep.
                </>
              ) : (
                <>
                  Thank you for shopping with Ethniz Couture. Your payment has been verified for order{' '}
                  <span className="font-bold text-[#3E1A1E]">#{order.orderNumber}</span>. Our master karigars are preparing your pieces with signature bespoke packaging.
                </>
              )}
            </p>
          </div>

          {/* 3. ORDER NUMBER BADGE */}
          <div className="animate-reveal-2 flex items-center justify-center gap-2 pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FAF7F2] border border-[#C6A15D]/40 rounded-xl text-xs">
              <span className="text-zinc-500 uppercase tracking-wider text-[11px] font-semibold">
                Order Reference:
              </span>
              <span className="font-mono font-bold text-[#3E1A1E] text-sm tracking-wider">
                {order.orderNumber}
              </span>
              <button
                type="button"
                onClick={handleCopyOrderNumber}
                className="p-1 text-zinc-400 hover:text-[#3E1A1E] transition-colors rounded"
                title="Copy Order Number"
                aria-label="Copy order number to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* 4. PRIMARY ACTIONS */}
          <div className="animate-reveal-4 pt-3 flex flex-wrap items-center justify-center gap-4">
            {isFailed ? (
              <>
                <Link
                  to="/checkout"
                  className="px-7 py-3.5 bg-[#3E1A1E] hover:bg-[#2E1115] text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-102"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry Checkout</span>
                </Link>
                <Link
                  to="/contact"
                  className="px-7 py-3.5 bg-[#FAF7F2] border border-zinc-300 hover:border-[#3E1A1E] text-zinc-800 text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
                >
                  Concierge Support
                </Link>
              </>
            ) : isPending ? (
              <>
                {onRefresh && (
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="px-7 py-3.5 bg-[#3E1A1E] hover:bg-[#2E1115] text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh Payment Status</span>
                  </button>
                )}
                <Link
                  to="/contact"
                  className="px-7 py-3.5 bg-[#FAF7F2] border border-zinc-300 hover:border-[#3E1A1E] text-zinc-800 text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
                >
                  Contact Concierge
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={`/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}`}
                  replace={true}
                  className="px-7 py-3.5 bg-[#3E1A1E] hover:bg-[#2E1115] text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-102"
                >
                  <Truck className="w-4 h-4 text-[#DFC89D]" />
                  <span>Track My Order</span>
                </Link>

                <Link
                  to="/shop"
                  replace={true}
                  className="px-7 py-3.5 bg-[#FAF7F2] border border-[#C6A15D]/50 hover:border-[#3E1A1E] text-[#1F040A] text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 hover:bg-white"
                >
                  <ShoppingBag className="w-4 h-4 text-[#84642C]" />
                  <span>Continue Shopping</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          ORDER DETAILS BREAKDOWN (Receipt Card)
          ========================================================================= */}
      <div className="animate-reveal-3 bg-white p-6 sm:p-8 rounded-2xl border border-[#E8DEC8] shadow-xs space-y-6">
        
        {/* Status Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-5 border-b border-zinc-200">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Order Status</p>
            <p className="font-serif text-lg font-bold text-zinc-950 mt-0.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#C6A15D]" />
              <span>{order.orderStatus}</span>
            </p>
          </div>

          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Estimated Dispatch</p>
            <p className="text-xs font-bold text-[#3E1A1E] flex items-center gap-1.5 mt-1">
              <Calendar className="w-4 h-4 text-[#C6A15D]" />
              <span>
                {order.estimatedDelivery
                  ? new Date(order.estimatedDelivery).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })
                  : '5–7 Business Days'}
              </span>
            </p>
          </div>

          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Payment Status</p>
            <span
              className={`inline-block mt-1 px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border ${
                isPaid
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : isCOD
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : isFailed
                  ? 'bg-red-50 text-red-800 border-red-300'
                  : 'bg-zinc-100 text-zinc-800 border-zinc-300'
              }`}
            >
              {isCOD ? 'Due on Delivery (COD)' : order.paymentStatus}
            </span>
          </div>
        </div>

        {/* Delivery & Billing Address Cards */}
        {hasDistinctBilling ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shipped To */}
            <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#C6A15D]/30 flex items-start gap-3.5">
              <MapPin className="w-4 h-4 text-[#3E1A1E] shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-700 leading-relaxed">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#84642C] block mb-1">
                  Shipped To (Destination)
                </span>
                <p className="font-bold text-zinc-900 text-sm">{order.customerName}</p>
                <p>{order.shippingStreet}{order.shippingApartment ? `, ${order.shippingApartment}` : ''}</p>
                <p>{order.shippingCity}, {order.shippingState} – {order.shippingPincode}, {order.shippingCountry}</p>
                <p className="text-zinc-500 mt-1">Contact: {order.customerPhone}</p>
              </div>
            </div>

            {/* Billed To / Business Entity */}
            <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#C6A15D]/30 flex items-start gap-3.5">
              <Building2 className="w-4 h-4 text-[#84642C] shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-700 leading-relaxed">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#84642C] block mb-1">
                  Billed To (Tax Invoice Entity)
                </span>
                <p className="font-bold text-zinc-900 text-sm">
                  {parsedNotes.businessName || order.customerName}
                </p>
                {parsedNotes.businessName && (
                  <p className="text-[11px] text-zinc-500 mb-0.5">Attn: {order.customerName}</p>
                )}
                {parsedNotes.billingAddress ? (
                  <p>{parsedNotes.billingAddress.fullAddress}</p>
                ) : (
                  <p className="text-zinc-500 italic">Same as delivery destination address</p>
                )}
                {parsedNotes.gstin && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-white rounded border border-[#C6A15D]/50 text-zinc-900 font-mono text-[11px] font-bold">
                    <span className="text-[#84642C]">GSTIN:</span>
                    <span>{parsedNotes.gstin}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#C6A15D]/30 flex items-start gap-3.5">
            <MapPin className="w-4 h-4 text-[#3E1A1E] shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-700 leading-relaxed">
              <p className="font-bold text-zinc-900 text-sm">{order.customerName}</p>
              <p>{order.shippingStreet}{order.shippingApartment ? `, ${order.shippingApartment}` : ''}</p>
              <p>{order.shippingCity}, {order.shippingState} – {order.shippingPincode}, {order.shippingCountry}</p>
              <p className="text-zinc-500 mt-1">Contact: {order.customerPhone} · {order.customerEmail}</p>
            </div>
          </div>
        )}

        {/* Enclosed Heirlooms Items */}
        {order.items && order.items.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="font-serif text-lg font-bold text-zinc-900 flex items-center justify-between">
              <span>Enclosed Heirlooms</span>
              <span className="text-xs text-zinc-500 font-sans font-normal">
                {order.items.length} {order.items.length === 1 ? 'creation' : 'creations'}
              </span>
            </h3>

            <div className="divide-y divide-zinc-100">
              {order.items.map((item) => (
                <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={item.productImage || '/logo-card.png'}
                      alt={item.productName}
                      className="w-14 h-18 object-cover rounded-lg bg-zinc-100 shrink-0 border border-zinc-200"
                    />
                    <div>
                      <p className="text-xs font-bold text-zinc-900">{item.productName}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Qty: {item.quantity} · Size: {item.size || 'Standard Free Size'}
                        {item.color && ` · Color: ${item.color}`}
                      </p>
                      <span className="text-[10px] text-[#84642C] font-semibold">Handcrafted Heritage Piece</span>
                    </div>
                  </div>
                  <span className="font-serif text-sm font-bold text-[#3E1A1E]">
                    {formatPrice(item.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Summary */}
        <div className="border-t border-zinc-200 pt-4 space-y-2 text-xs text-zinc-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-zinc-900">{formatPrice(order.subtotal)}</span>
          </div>

          {order.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Promotional Privilege {order.couponCode ? `(${order.couponCode})` : ''}</span>
              <span>–{formatPrice(order.discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Insured Courier & Sizing Logistics</span>
            <span className="font-semibold text-zinc-900">
              {order.shippingFee === 0 ? (
                <span className="text-emerald-700 font-bold uppercase tracking-wider text-[11px]">
                  Complimentary
                </span>
              ) : (
                formatPrice(order.shippingFee)
              )}
            </span>
          </div>

          <div className="pt-3 border-t border-zinc-200 flex justify-between items-baseline text-sm">
            <span className="font-serif text-base font-bold text-zinc-950">Grand Total</span>
            <span className="font-serif text-xl sm:text-2xl font-bold text-[#3E1A1E]">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
