import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Truck,
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  AlertCircle,
  Sparkles,
  CreditCard,
  ChevronRight,
  ArrowLeft,
  Printer,
  HelpCircle,
  ShieldCheck,
  Check,
  Search,
  X,
  Smartphone,
  Building,
  RefreshCw,
  QrCode,
  FileText,
  Mail,
  XCircle,
  RotateCcw
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';
import { DynamicUpiQrModal } from '../components/checkout/DynamicUpiQrModal';
import { WriteReviewModal } from '../components/WriteReviewModal';
import { TaxInvoiceModal } from '../components/TaxInvoiceModal';
import { CancelOrderModal } from '../components/CancelOrderModal';
import { ReturnRequestModal } from '../components/ReturnRequestModal';
import { launchRazorpayStandardCheckout } from '../utils/razorpay';

interface MilestoneStage {
  key: string;
  label: string;
  desc: string;
}

const FLIPKART_STAGES: MilestoneStage[] = [
  { key: 'CONFIRMED', label: 'Order Confirmed', desc: 'Order verified & reserved' },
  { key: 'PROCESSING', label: 'Artisanal Preparation', desc: 'Handloom finishing & quality audit' },
  { key: 'SHIPPED', label: 'Shipped', desc: 'Dispatched with Blue Dart Express Air' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Courier agent en route to your address' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'Safely handed over to patron' }
];

export const OrderTracking: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const orderNumberParam = searchParams.get('orderNumber') || '';
  const emailParam = searchParams.get('email') || '';

  const [order, setOrder] = useState<Order | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Switch / search order modal state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchOrderNumberInput, setSearchOrderNumberInput] = useState('');

  // Pay Online for COD modal state
  const [isPayOnlineModalOpen, setIsPayOnlineModalOpen] = useState(false);
  const [selectedOnlineMethod, setSelectedOnlineMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [upiId, setUpiId] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isUpiQrModalOpen, setIsUpiQrModalOpen] = useState(false);
  const [reviewModalItem, setReviewModalItem] = useState<{ productId: string; productName: string; productImage?: string } | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // Fetch tracking details (silent = true refreshes data in background without a disruptive full-page loader)
  const fetchOrderTracking = useCallback(
    async (targetOrderNumber: string, silent = false) => {
      if (!targetOrderNumber.trim()) return;

      if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const res = await api.get('/orders/track', {
          params: {
            orderNumber: targetOrderNumber.trim().toUpperCase(),
            ...(emailParam ? { email: emailParam.trim().toLowerCase() } : {})
          }
        });

        const latestOrder = res.data.order;
        if (latestOrder) {
          setOrder((prev) => {
            if (prev && prev.id === latestOrder.id) {
              if (prev.orderStatus !== latestOrder.orderStatus) {
                showToast(
                  `Milestone updated: ${latestOrder.orderStatus.replace(/_/g, ' ')}`,
                  'info'
                );
              } else if (!prev.trackingNumber && latestOrder.trackingNumber) {
                showToast(
                  `Dispatch registered: ${latestOrder.carrierName || 'Courier'} (AWB: ${latestOrder.trackingNumber})`,
                  'success'
                );
              }
            }
            return latestOrder;
          });
          setError(null);
        }
      } catch (err: any) {
        if (!silent) {
          setError(err.response?.data?.message || 'Unable to locate order with the provided reference.');
          setOrder(null);
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [emailParam, showToast]
  );

  // Initialize tracking on parameter change or initial load
  useEffect(() => {
    if (orderNumberParam.trim()) {
      fetchOrderTracking(orderNumberParam.trim(), false);
    } else if (user) {
      setLoading(true);
      api
        .get('/orders/my-orders')
        .then((res) => {
          const orders: Order[] = res.data.orders || [];
          setUserOrders(orders);
          if (orders.length > 0) {
            setOrder(orders[0]);
            setSearchParams({ orderNumber: orders[0].orderNumber });
          } else {
            setOrder(null);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch user orders', err);
          setOrder(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [orderNumberParam, user, fetchOrderTracking, setSearchParams]);

  // Dynamic Live Tracking: Auto-poll every 3.5 seconds while order is active so user does not need to refresh
  useEffect(() => {
    const currentNum = orderNumberParam.trim() || order?.orderNumber;
    if (!currentNum) return;

    const isTerminal = order?.orderStatus === 'DELIVERED' || order?.orderStatus === 'CANCELLED';
    const pollIntervalMs = isTerminal ? 15000 : 3500;

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchOrderTracking(currentNum, true);
      }
    }, pollIntervalMs);

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchOrderTracking(currentNum, true);
      }
    };
    window.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
    };
  }, [orderNumberParam, order?.orderNumber, order?.orderStatus, fetchOrderTracking]);

  // Flipkart-style Browser Back-button trapping: Prevent returning to checkout and route cleanly to Orders
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      navigate('/account?tab=orders', { replace: true });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate]);

  // Load user orders for switching if logged in
  useEffect(() => {
    if (user && userOrders.length === 0) {
      api.get('/orders/my-orders')
        .then((res) => setUserOrders(res.data.orders || []))
        .catch(() => {});
    }
  }, [user]);

  // Handle switching order
  const handleSelectOrder = (num: string) => {
    setSearchParams({ orderNumber: num });
    setIsSearchModalOpen(false);
  };

  const handleManualSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchOrderNumberInput.trim()) {
      setSearchParams({ orderNumber: searchOrderNumberInput.trim().toUpperCase() });
      setIsSearchModalOpen(false);
      setSearchOrderNumberInput('');
    }
  };

  // Pay Online for COD Order
  const handlePayOnlineConfirm = async () => {
    if (!order) return;

    if (selectedOnlineMethod === 'UPI') {
      setIsPayOnlineModalOpen(false);
      setIsUpiQrModalOpen(true);
      return;
    }

    setIsProcessingPayment(true);
    try {
      await launchRazorpayStandardCheckout({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        onSuccess: () => {
          showToast('Payment successful! Your order is now prepaid.', 'success');
          setIsPayOnlineModalOpen(false);

          // Update local order state immediately
          setOrder((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              paymentStatus: 'PAID',
              paymentMethod: 'RAZORPAY',
              orderStatus: prev.orderStatus === 'PENDING' ? 'CONFIRMED' : prev.orderStatus,
              statusHistory: [
                ...(prev.statusHistory || []),
                {
                  id: `hist_${Date.now()}`,
                  orderId: prev.id,
                  status: 'CONFIRMED',
                  notes: 'Payment completed online via Razorpay Standard Checkout (converted from Cash on Delivery).',
                  createdAt: new Date().toISOString()
                }
              ]
            };
          });
        },
        onError: (errMsg: string) => {
          showToast(errMsg, 'error');
        },
        onDismiss: () => {
          showToast('Payment modal closed.', 'info');
        }
      });
    } catch (err: any) {
      console.error('Online payment error:', err);
      showToast(err.response?.data?.message || 'Payment processing failed. Please try again.', 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Determine stage progress on Flipkart stepper
  const getStageIndex = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'CONFIRMED':
        return 0; // Order Confirmed
      case 'PROCESSING':
      case 'PACKED':
        return 1; // Artisanal Preparation
      case 'SHIPPED':
        return 2; // Shipped
      case 'OUT_FOR_DELIVERY':
        return 3; // Out for Delivery
      case 'DELIVERED':
        return 4; // Delivered
      default:
        return 0;
    }
  };

  const effectiveStageIndex = order ? getStageIndex(order.orderStatus) : 0;

  // Format dates
  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-8 text-zinc-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Top Header & Breadcrumb (Flipkart Style) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E8DEC8] gap-4">
          <div className="space-y-1">
            <nav className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Link to="/" replace={true} className="hover:text-maroon-800">Home</Link>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              <Link to="/account?tab=orders" replace={true} className="hover:text-maroon-800">My Orders</Link>
              {order && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="font-mono font-semibold text-zinc-800">{order.orderNumber}</span>
                </>
              )}
            </nav>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/account?tab=orders', { replace: true })}
                className="inline-flex items-center gap-1 text-xs font-semibold text-maroon-800 hover:text-maroon-900"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Orders</span>
              </button>
              {order && (
                <span className="text-xs text-zinc-400">|</span>
              )}
              {order && (
                <span className="text-xs font-medium text-zinc-600">
                  Order ID: <strong className="font-mono text-zinc-900">{order.orderNumber}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Action buttons on top right */}
          <div className="flex items-center gap-2">
            {userOrders.length > 1 && (
              <div className="relative">
                <select
                  value={order?.orderNumber || ''}
                  onChange={(e) => handleSelectOrder(e.target.value)}
                  className="text-xs py-1.5 px-3 bg-white border border-[#E8DEC8] rounded font-medium text-zinc-800 hover:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer shadow-xs"
                >
                  {userOrders.map((o) => (
                    <option key={o.id} value={o.orderNumber}>
                      {o.orderNumber} ({formatDate(o.createdAt)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="text-xs py-1.5 px-3 bg-white hover:bg-zinc-50 border border-[#E8DEC8] rounded font-medium text-zinc-700 flex items-center gap-1.5 shadow-xs"
              title="Track another order ID"
            >
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              <span>Track Another</span>
            </button>

            {order && (
              <button
                onClick={() => setIsInvoiceModalOpen(true)}
                className="text-xs py-1.5 px-3 bg-white hover:bg-zinc-50 border border-[#E8DEC8] rounded font-medium text-zinc-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="View & Download Official Tax Invoice"
              >
                <Printer className="w-3.5 h-3.5 text-zinc-500" />
                <span className="hidden sm:inline">Tax Invoice</span>
              </button>
            )}

            {/* Cancel Button if order is in fulfillment before dispatch */}
            {order && ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED'].includes(order.orderStatus) && (
              <button
                onClick={() => setIsCancelModalOpen(true)}
                className="text-xs py-1.5 px-3 bg-white hover:bg-red-50 border border-red-200 text-red-700 hover:border-red-300 rounded font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Cancel order before courier dispatch"
              >
                <XCircle className="w-3.5 h-3.5 text-red-600" />
                <span>Cancel Order</span>
              </button>
            )}

            {/* Return / Exchange Button if delivered */}
            {order && order.orderStatus === 'DELIVERED' && (
              <button
                onClick={() => setIsReturnModalOpen(true)}
                className="text-xs py-1.5 px-3 bg-white hover:bg-[#FAF7F2] border border-[#C5A262]/70 text-[#84642C] hover:text-[#3E1A1E] rounded font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Request a return or size exchange"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#C5A262]" />
                <span>Return / Exchange</span>
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg border border-[#E8DEC8] p-12 text-center space-y-4 shadow-xs">
            <RefreshCw className="w-8 h-8 text-maroon-800 animate-spin mx-auto" />
            <p className="font-serif text-lg font-bold text-zinc-800">Locating Royal Order Journey...</p>
            <p className="text-xs text-zinc-500">Retrieving authentic tracking milestones from our atelier ledger.</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-white rounded-lg border border-red-200 p-8 text-center space-y-4 shadow-xs">
            <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
            <h2 className="font-serif text-xl font-bold text-zinc-900">Order Not Located</h2>
            <p className="text-xs text-zinc-600 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="px-5 py-2 bg-maroon-800 hover:bg-maroon-900 text-white text-xs font-bold uppercase tracking-wider rounded shadow"
            >
              Enter Valid Order ID
            </button>
          </div>
        )}

        {/* Empty State when no orders exist */}
        {!loading && !order && !error && (
          <div className="bg-white rounded-lg border border-[#E8DEC8] p-12 text-center space-y-4 shadow-xs">
            <Package className="w-12 h-12 text-gold-500 mx-auto" />
            <h2 className="font-serif text-2xl font-bold text-zinc-900">No Orders in Journey</h2>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              You do not have any active orders currently in fulfillment. Explore our royal collections to place your bespoke order.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link
                to="/shop"
                replace={true}
                className="px-6 py-2.5 bg-maroon-800 hover:bg-maroon-900 text-white rounded text-xs font-bold uppercase tracking-wider shadow"
              >
                Explore Handloom Catalog
              </Link>
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="px-5 py-2.5 bg-white border border-[#E8DEC8] text-zinc-700 rounded text-xs font-bold uppercase tracking-wider hover:bg-zinc-50"
              >
                Track by ID
              </button>
            </div>
          </div>
        )}

        {/* MAIN FLIPKART-STYLE ORDER DETAILS DISPLAY */}
        {!loading && order && (
          <div className="space-y-6">

            {/* CARD 1: DELIVERY ADDRESS (Flipkart Top Card) */}
            <div className="bg-white rounded-lg border border-[#E8DEC8] p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-maroon-800 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Delivery Address
                    </h3>
                  </div>
                  <div className="text-xs text-zinc-800 pl-6 space-y-0.5">
                    <p className="font-bold text-sm text-zinc-950">{order.customerName}</p>
                    <p>
                      {order.shippingStreet ? `${order.shippingStreet}, ` : ''}
                      {order.shippingCity}, {order.shippingState} - {order.shippingPincode}
                    </p>
                    {order.customerPhone && (
                      <p className="pt-1 text-zinc-700">
                        <strong className="font-semibold text-zinc-900">Phone number:</strong> {order.customerPhone}
                      </p>
                    )}
                  </div>
                </div>

                {/* More details / carrier */}
                <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-100 text-xs text-zinc-600 pl-6 sm:pl-0 space-y-1">
                  <p className="text-zinc-500">
                    Carrier:{' '}
                    <span className="font-semibold text-zinc-900">
                      {order.carrierName || (['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus) ? 'Express Air Courier' : 'Allocation upon dispatch')}
                    </span>
                  </p>
                  {order.trackingNumber ? (
                    <p className="font-mono text-zinc-800">
                      AWB: <span className="font-bold text-maroon-800">{order.trackingNumber}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-zinc-400 italic">AWB assigned upon dispatch</p>
                  )}
                  {order.estimatedDelivery && (
                    <p className="text-emerald-700 font-medium">
                      Expected by: {formatDate(order.estimatedDelivery)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Confirmation Email & WhatsApp Dispatch Notice */}
            <div className="bg-[#FAF7F2] rounded-lg border border-[#DFC89D]/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-700 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#3E1A1E] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Mail className="w-4 h-4 text-[#DFC89D]" />
                </div>
                <div>
                  <span className="font-semibold text-zinc-900 block">
                    Order confirmation &amp; digital invoice dispatched
                  </span>
                  <p className="text-[11px] text-zinc-500">
                    Sent to <strong className="text-zinc-800">{order.customerEmail}</strong> with live tracking link and itemized receipt.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <button
                  onClick={() => setIsInvoiceModalOpen(true)}
                  className="px-2.5 py-1 bg-white hover:bg-zinc-50 border border-[#DFC89D] text-[#84642C] rounded-full text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <FileText className="w-3 h-3" /> View Invoice
                </button>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Dispatched
                </span>
              </div>
            </div>

            {/* CARD 2: COD "PAY ONLINE" BANNER (Flipkart's Signature Feature) */}
            {order.paymentMethod === 'COD' && order.paymentStatus !== 'PAID' && (
              <div className="bg-gradient-to-r from-[#2A080E] via-[#3E1A1E] to-[#2A080E] text-white rounded-lg p-5 border border-gold-500/40 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-gold-500/20 ring-1 ring-gold-400/50 flex items-center justify-center shrink-0 text-gold-300">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-amber-500/30 text-amber-200 border border-amber-400/30">
                        Cash on Delivery Selected
                      </span>
                      <span className="text-[10px] text-gold-300 font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Contactless Delivery Available
                      </span>
                    </div>
                    <h4 className="font-serif text-base sm:text-lg font-bold text-gold-100">
                      Pay Online for Order
                    </h4>
                    <p className="text-xs text-gold-200/80 max-w-xl">
                      Avoid cash handover at doorstep. You can pay <strong>₹{order.totalAmount.toLocaleString('en-IN')}</strong> securely online right now using UPI (GPay, PhonePe, Paytm), Debit/Credit Card, or Netbanking.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <button
                    onClick={() => setIsPayOnlineModalOpen(true)}
                    className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-gold-500 via-gold-400 to-gold-600 hover:brightness-105 active:scale-95 text-maroon-950 text-xs font-bold uppercase tracking-wider rounded shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 text-maroon-900" />
                    <span>Pay ₹{order.totalAmount.toLocaleString('en-IN')} Online</span>
                  </button>
                </div>
              </div>
            )}

            {/* IF PAID ONLINE (Post-conversion or direct online payment) */}
            {order.paymentStatus === 'PAID' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-emerald-950">Prepaid Online — Payment Verified</p>
                    <p className="text-emerald-700">
                      ₹{order.totalAmount.toLocaleString('en-IN')} paid successfully. No payment is required at delivery.
                    </p>
                  </div>
                </div>
                <span className="font-mono text-[11px] bg-emerald-100 px-2.5 py-1 rounded text-emerald-800 font-bold uppercase">
                  Verified
                </span>
              </div>
            )}

            {/* CANCELLATION NOTICE CARD */}
            {order.orderStatus === 'CANCELLED' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-5 flex items-start gap-3.5 text-xs text-red-900">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-serif text-base font-bold text-red-950">
                    Order Cancelled
                  </h4>
                  <p className="text-red-700 leading-relaxed">
                    This bespoke order has been cancelled and is no longer in journey. The reserved garments have been returned to atelier stock.
                    {order.paymentStatus === 'REFUNDED' && ' Any prepaid amount has been initiated for refund via the original payment source.'}
                  </p>
                  <p className="text-[11px] text-red-600 pt-1">
                    For bespoke concierge assistance, contact support@ethnizcouture.com.
                  </p>
                </div>
              </div>
            )}

            {/* RETURN REQUESTED NOTICE CARD */}
            {order.orderStatus === 'RETURN_REQUESTED' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex items-start gap-3.5 text-xs text-amber-900">
                <RotateCcw className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-serif text-base font-bold text-amber-950">
                    Return / Exchange Under Atelier Review
                  </h4>
                  <p className="text-amber-800 leading-relaxed">
                    We have received your return request. Our concierge team is reviewing the details and will schedule a doorstep reverse pickup via BlueDart / Delhivery within 24 hours.
                  </p>
                  <p className="text-[11px] text-amber-700 pt-1">
                    Please keep the garments unworn in original packaging with designer tags attached.
                  </p>
                </div>
              </div>
            )}

            {/* CARD 3: SINGLE MILESTONE TRACKING STEPPER FOR WHOLE ORDER */}
            <div className="bg-white rounded-lg border border-[#E8DEC8] p-5 sm:p-6 shadow-xs space-y-6">
              
              {/* Stepper Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                    <h3 className="font-serif text-lg font-bold text-zinc-950">
                      Order Fulfillment Journey
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Live milestone pipeline for Order <strong className="font-mono text-zinc-800">{order.orderNumber}</strong>
                  </p>
                </div>

                <div className="sm:text-right space-y-0.5 text-xs">
                  <span className="inline-block px-3 py-1 bg-maroon-800 text-white rounded font-bold uppercase tracking-wider text-[10px]">
                    Status: {order.orderStatus.replace(/_/g, ' ')}
                  </span>
                  {order.estimatedDelivery && (
                    <p className="text-emerald-700 font-semibold pt-1">
                      Expected Delivery: {formatDate(order.estimatedDelivery)}
                    </p>
                  )}
                </div>
              </div>

              {/* DESKTOP HORIZONTAL STEPPER */}
              <div className="hidden sm:block pt-2 pb-2">
                <div className="relative flex items-center justify-between">
                  
                  {/* Continuous progress line background */}
                  <div className="absolute top-3.5 left-4 right-4 h-1 bg-zinc-200 -z-0" />
                  
                  {/* Active progress fill */}
                  <div
                    className="absolute top-3.5 left-4 h-1 bg-emerald-600 transition-all duration-700 -z-0"
                    style={{
                      width: `${(effectiveStageIndex / (FLIPKART_STAGES.length - 1)) * 90}%`
                    }}
                  />

                  {FLIPKART_STAGES.map((stg, stgIdx) => {
                    const isPassed = stgIdx <= effectiveStageIndex;
                    const isCurrent = stgIdx === effectiveStageIndex;

                    return (
                      <div key={stg.key} className="flex flex-col items-center relative z-10 text-center w-28">
                        {/* Step Circle Node */}
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                            isPassed
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-zinc-200 text-zinc-400'
                          } ${isCurrent ? 'ring-4 ring-emerald-100 scale-110' : ''}`}
                        >
                          {isPassed ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-zinc-400" />
                          )}
                        </div>

                        {/* Step Label */}
                        <span className={`text-[11px] font-bold mt-2 leading-tight ${
                          isCurrent ? 'text-zinc-950' : isPassed ? 'text-zinc-800' : 'text-zinc-400'
                        }`}>
                          {stg.label}
                        </span>

                        {/* Description */}
                        <span className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                          {stg.desc}
                        </span>

                        {/* Timestamp if available */}
                        {stgIdx === 0 && order.createdAt && (
                          <span className="text-[10px] text-zinc-400 mt-0.5">
                            {formatDate(order.createdAt)}
                          </span>
                        )}
                        {stgIdx === FLIPKART_STAGES.length - 1 && order.estimatedDelivery && (
                          <span className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                            {formatDate(order.estimatedDelivery)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MOBILE VERTICAL STEPPER */}
              <div className="sm:hidden space-y-4 border-l-2 border-zinc-200 ml-3 pl-5 pt-1">
                {FLIPKART_STAGES.map((stg, stgIdx) => {
                  const isPassed = stgIdx <= effectiveStageIndex;
                  const isCurrent = stgIdx === effectiveStageIndex;

                  return (
                    <div key={stg.key} className="relative">
                      <div
                        className={`absolute -left-[27px] top-0 w-6 h-6 rounded-full flex items-center justify-center ${
                          isPassed ? 'bg-emerald-600 text-white' : 'bg-zinc-200 text-zinc-400'
                        } ${isCurrent ? 'ring-4 ring-emerald-100' : ''}`}
                      >
                        {isPassed ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />}
                      </div>
                      <div>
                        <h5 className={`text-xs font-bold ${isCurrent ? 'text-maroon-900 text-sm' : isPassed ? 'text-zinc-900' : 'text-zinc-400'}`}>
                          {stg.label}
                        </h5>
                        <p className="text-[11px] text-zinc-500">{stg.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Status Highlight Note */}
              <div className="p-3 bg-[#FAF7F2] rounded border border-zinc-200 text-xs text-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${order.orderStatus === 'CANCELLED' ? 'bg-red-600' : 'bg-emerald-600 animate-pulse'} shrink-0`} />
                  <span>
                    {order.orderStatus === 'DELIVERED'
                      ? 'Package has been safely delivered to patron.'
                      : order.orderStatus === 'OUT_FOR_DELIVERY'
                      ? 'Courier agent is en route for doorstep delivery to your address.'
                      : order.orderStatus === 'SHIPPED'
                      ? `In transit with ${order.carrierName || 'express courier'}${order.trackingNumber ? ` (AWB: ${order.trackingNumber})` : ''}.`
                      : order.orderStatus === 'PACKED'
                      ? 'Garments inspected, packed in bespoke presentation packaging, and awaiting carrier dispatch.'
                      : order.orderStatus === 'PROCESSING'
                      ? 'Artisanal preparation started. Handloom quality inspection in progress.'
                      : order.orderStatus === 'CANCELLED'
                      ? 'This order has been cancelled. Reserved inventory has been restored.'
                      : 'Order confirmed and reserved. Certified handloom artisans assigned.'}
                  </span>
                </div>
                {order.statusHistory && order.statusHistory.length > 0 && (
                  <span className="text-[11px] text-zinc-400 shrink-0">
                    Updated {new Date(order.statusHistory[order.statusHistory.length - 1].createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {/* Verified Atelier Milestone History */}
              {order.statusHistory && order.statusHistory.length > 0 && (
                <div className="pt-2 border-t border-zinc-100 space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                    Verified Milestone Ledger
                  </h4>
                  <div className="space-y-1.5">
                    {order.statusHistory.map((hist) => (
                      <div key={hist.id} className="flex items-start justify-between gap-3 text-xs p-2.5 rounded bg-zinc-50 border border-zinc-100">
                        <div className="space-y-0.5">
                          <span className="font-bold text-zinc-900 uppercase tracking-wide text-[10px] px-1.5 py-0.2 bg-zinc-200/80 rounded inline-block">
                            {hist.status.replace(/_/g, ' ')}
                          </span>
                          <p className="text-zinc-600 text-[11px] mt-0.5">{hist.notes || 'Status updated.'}</p>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                          {new Date(hist.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* CARD 4: ITEMS IN THIS ORDER (Clean Product List) */}
            <div className="bg-white rounded-lg border border-[#E8DEC8] p-5 sm:p-6 shadow-xs space-y-4">
              <h3 className="font-semibold text-zinc-950 text-xs uppercase tracking-wider border-b border-zinc-100 pb-2.5">
                Items in this Order ({order.items.length})
              </h3>

              <div className="divide-y divide-zinc-100">
                {order.items.map((item, idx) => (
                  <div key={item.id || idx} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={item.productImage || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80'}
                        alt={item.productName}
                        className="w-16 h-20 object-cover rounded bg-[#FAF7F2] border border-zinc-200 shrink-0 shadow-xs"
                      />
                      <div className="space-y-0.5 text-xs">
                        <h4 className="font-semibold text-zinc-950 text-sm hover:text-maroon-800 transition-colors line-clamp-1">
                          {item.productName}
                        </h4>
                        <p className="text-zinc-500">
                          {item.color && <span>Color: <strong className="text-zinc-700">{item.color}</strong> · </span>}
                          {item.size && <span>Size: <strong className="text-zinc-700">{item.size}</strong> · </span>}
                          <span>Qty: <strong className="text-zinc-700">{item.quantity}</strong></span>
                        </p>
                        <p className="text-zinc-500 text-[11px]">
                          Seller: <span className="font-medium text-maroon-900">Ethniz Royal Atelier</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-serif text-base font-bold text-zinc-950">
                        ₹{(item.price || item.total).toLocaleString('en-IN')}
                      </p>
                      {item.quantity > 1 && item.price && (
                        <p className="text-[11px] text-zinc-400">
                          ₹{item.price.toLocaleString('en-IN')} each
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CARD 4: PRICE DETAILS BREAKDOWN (Flipkart Style) */}
            <div className="bg-white rounded-lg border border-[#E8DEC8] p-5 shadow-xs space-y-4">
              <h3 className="font-semibold text-zinc-950 text-xs uppercase tracking-wider border-b border-zinc-100 pb-2.5">
                Price Details
              </h3>
              
              <div className="space-y-2 text-xs text-zinc-700">
                <div className="flex justify-between">
                  <span>List Price ({order.items.length} item{order.items.length > 1 ? 's' : ''})</span>
                  <span>₹{(order.subtotal || order.totalAmount).toLocaleString('en-IN')}</span>
                </div>

                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Atelier Special Discount</span>
                    <span>-₹{order.discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="text-emerald-700 font-bold uppercase tracking-wider text-[11px]">
                    FREE
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Heritage Presentation Box</span>
                  <span className="text-emerald-700 font-bold uppercase tracking-wider text-[11px]">
                    FREE
                  </span>
                </div>

                <div className="border-t border-dashed border-zinc-200 pt-3 flex justify-between font-serif text-base font-bold text-zinc-950">
                  <span>Total Amount</span>
                  <span>₹{order.totalAmount.toLocaleString('en-IN')}</span>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-zinc-600">
                  <span>Payment Mode:</span>
                  <span className="font-medium text-zinc-900">
                    {order.paymentMethod === 'COD' && order.paymentStatus !== 'PAID' ? (
                      <span className="text-amber-700 font-bold">Cash on Delivery (Pending)</span>
                    ) : (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Prepaid Online (Verified)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 5: HELP & CONCIERGE ASSISTANCE (Flipkart Style) */}
            <div className="bg-white rounded-lg border border-[#E8DEC8] p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gold-100 text-maroon-800 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-900">Need Help with this Order?</p>
                  <p className="text-zinc-500">Contact our private atelier concierge for sizing, delivery updates, or queries.</p>
                </div>
              </div>
              <Link
                to="/contact"
                className="px-4 py-2 border border-maroon-800 text-maroon-800 hover:bg-maroon-800 hover:text-white rounded font-bold uppercase tracking-wider text-[11px] transition-colors text-center shrink-0"
              >
                Atelier Concierge
              </Link>
            </div>

            {/* CARD 6: DELIVERED VERIFIED PATRON REVIEW BANNER (Only on DELIVERED status) */}
            {order.orderStatus === 'DELIVERED' && order.items && order.items.length > 0 && (
              <div className="bg-[#FAF7F2] rounded-xl border border-[#C6A15D] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs animate-fade-in">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#3E1A1E] text-[#DFC89D] flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-5 h-5 text-[#C6A15D]" />
                  </div>
                  <div>
                    <p className="font-serif text-sm font-bold text-zinc-900">Your Piece Has Arrived — Review Experience</p>
                    <p className="text-zinc-600 text-[11px] mt-0.5">
                      Share your thoughts on the silk drape, embroidery, and fit to guide fellow patrons.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const firstItem = order.items[0];
                    if (firstItem && firstItem.productId) {
                      setReviewModalItem({
                        productId: firstItem.productId,
                        productName: firstItem.productName,
                        productImage: firstItem.productImage || undefined
                      });
                    }
                  }}
                  className="px-5 py-2.5 bg-[#3E1A1E] hover:bg-[#2B0C10] text-[#DFC89D] hover:text-white rounded-lg font-bold uppercase tracking-widest text-[11px] border border-[#C6A15D] transition-colors text-center shrink-0 shadow-sm cursor-pointer"
                >
                  ★ Write Verified Review
                </button>
              </div>
            )}

          </div>
        )}

      </div>

      {/* MODAL 1: PAY ONLINE FOR COD ORDER */}
      {isPayOnlineModalOpen && order && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-t-[28px] sm:rounded-xl border-t sm:border border-gold-300 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
            {/* Mobile Pull Handle */}
            <div className="w-12 h-1.5 bg-zinc-300 rounded-full mx-auto sm:hidden" />
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-maroon-800" />
                <h3 className="font-serif text-lg font-bold text-zinc-950">
                  Pay Online & Convert to Prepaid
                </h3>
              </div>
              <button
                onClick={() => setIsPayOnlineModalOpen(false)}
                className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                aria-label="Close payment modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Price Summary */}
            <div className="p-3 bg-[#FAF7F2] rounded border border-zinc-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-zinc-500">Order ID: </span>
                <span className="font-mono font-bold text-zinc-900">{order.orderNumber}</span>
              </div>
              <div>
                <span className="text-zinc-500">Payable: </span>
                <span className="font-serif font-bold text-base text-maroon-900">
                  ₹{order.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Method Selectors */}
            <div className="space-y-2 text-xs">
              <label className="block font-bold uppercase tracking-wider text-zinc-700">
                Choose Payment Method
              </label>

              {/* Option 1: Dynamic UPI QR */}
              <div
                onClick={() => setSelectedOnlineMethod('UPI')}
                className={`p-3 rounded border cursor-pointer flex items-center justify-between transition-all ${
                  selectedOnlineMethod === 'UPI'
                    ? 'border-maroon-800 bg-maroon-50/50 ring-1 ring-maroon-800'
                    : 'border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <QrCode className="w-4 h-4 text-maroon-800" />
                  <div>
                    <p className="font-bold text-zinc-900">Dynamic UPI QR Code</p>
                    <p className="text-[11px] text-zinc-500">Scan with Google Pay, PhonePe, Paytm, or BHIM</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="onlineMethod"
                  checked={selectedOnlineMethod === 'UPI'}
                  onChange={() => setSelectedOnlineMethod('UPI')}
                  className="accent-maroon-800"
                />
              </div>

              {/* Option 2: Cards */}
              <div
                onClick={() => setSelectedOnlineMethod('CARD')}
                className={`p-3 rounded border cursor-pointer flex items-center justify-between transition-all ${
                  selectedOnlineMethod === 'CARD'
                    ? 'border-maroon-800 bg-maroon-50/50 ring-1 ring-maroon-800'
                    : 'border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-maroon-800" />
                  <div>
                    <p className="font-bold text-zinc-900">Credit / Debit Card</p>
                    <p className="text-[11px] text-zinc-500">Visa, Mastercard, RuPay, Amex</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="onlineMethod"
                  checked={selectedOnlineMethod === 'CARD'}
                  onChange={() => setSelectedOnlineMethod('CARD')}
                  className="accent-maroon-800"
                />
              </div>

              {/* Option 3: Netbanking */}
              <div
                onClick={() => setSelectedOnlineMethod('NETBANKING')}
                className={`p-3 rounded border cursor-pointer flex items-center justify-between transition-all ${
                  selectedOnlineMethod === 'NETBANKING'
                    ? 'border-maroon-800 bg-maroon-50/50 ring-1 ring-maroon-800'
                    : 'border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-maroon-800" />
                  <div>
                    <p className="font-bold text-zinc-900">Net Banking</p>
                    <p className="text-[11px] text-zinc-500">All major Indian banks supported</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="onlineMethod"
                  checked={selectedOnlineMethod === 'NETBANKING'}
                  onChange={() => setSelectedOnlineMethod('NETBANKING')}
                  className="accent-maroon-800"
                />
              </div>
            </div>

            {/* UPI QR helper note if UPI chosen */}
            {selectedOnlineMethod === 'UPI' && (
              <div className="p-3 bg-white rounded-lg border border-gold-200 text-xs space-y-1">
                <p className="font-bold text-zinc-800">Scan &amp; Pay directly from any UPI app</p>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Clicking "Pay ₹{order.totalAmount.toLocaleString('en-IN')}" will generate a dynamic, single-use QR code locked to this exact order.
                </p>
              </div>
            )}

            {/* Security note */}
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 bg-zinc-50 p-2.5 rounded">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Payments are encrypted with 256-bit SSL and authenticated via verified gateway.</span>
            </div>

            {/* Modal actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPayOnlineModalOpen(false)}
                disabled={isProcessingPayment}
                className="w-1/2 py-2.5 border border-zinc-300 text-zinc-700 rounded text-xs font-bold uppercase tracking-wider hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePayOnlineConfirm}
                disabled={isProcessingPayment}
                className="w-1/2 py-2.5 bg-maroon-800 hover:bg-maroon-900 disabled:bg-zinc-400 text-white rounded text-xs font-bold uppercase tracking-wider shadow flex items-center justify-center gap-2"
              >
                {isProcessingPayment ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Pay ₹{order.totalAmount.toLocaleString('en-IN')}</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: TRACK ANOTHER ORDER BY ID */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-t-[28px] sm:rounded-xl border-t sm:border border-gold-300 shadow-2xl max-w-sm w-full p-5 sm:p-6 space-y-4 animate-scale-up">
            {/* Mobile Pull Handle */}
            <div className="w-12 h-1.5 bg-zinc-300 rounded-full mx-auto sm:hidden" />

            <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
              <h3 className="font-serif text-lg font-bold text-zinc-950">Track Another Order</h3>
              <button
                onClick={() => setIsSearchModalOpen(false)}
                className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                aria-label="Close track order modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualSearchSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Order Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EC-2026-XXXXX"
                  value={searchOrderNumberInput}
                  onChange={(e) => setSearchOrderNumberInput(e.target.value)}
                  className="w-full h-12 sm:h-11 px-3.5 border border-zinc-300 rounded-lg focus:outline-none focus:border-maroon-800 uppercase font-mono text-base sm:text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsSearchModalOpen(false)}
                  className="w-1/2 h-11 border border-zinc-300 text-zinc-700 rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 h-11 bg-maroon-800 hover:bg-maroon-900 text-white rounded-lg font-bold uppercase tracking-wider text-xs shadow flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Track</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic UPI QR Modal for COD-to-Online conversion */}
      {isUpiQrModalOpen && order && (
        <DynamicUpiQrModal
          isOpen={isUpiQrModalOpen}
          orderId={order.id}
          orderNumber={order.orderNumber}
          totalAmount={order.totalAmount}
          onClose={() => setIsUpiQrModalOpen(false)}
          onPaymentSuccess={() => {
            setIsUpiQrModalOpen(false);
            showToast('Payment successful! Your royal couture order is now prepaid via UPI.', 'success');
            setOrder((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                paymentStatus: 'PAID',
                paymentMethod: 'UPI',
                orderStatus: prev.orderStatus === 'PENDING' ? 'CONFIRMED' : prev.orderStatus,
                statusHistory: [
                  ...(prev.statusHistory || []),
                  {
                    id: `hist_${Date.now()}`,
                    orderId: prev.id,
                    status: 'CONFIRMED',
                    notes: 'Dynamic UPI QR Payment completed online (converted from Cash on Delivery).',
                    createdAt: new Date().toISOString()
                  }
                ]
              };
            });
          }}
        />
      )}

      {/* Write Review Modal for Delivered Order */}
      {reviewModalItem && (
        <WriteReviewModal
          isOpen={reviewModalItem !== null}
          onClose={() => setReviewModalItem(null)}
          productId={reviewModalItem.productId}
          productName={reviewModalItem.productName}
          productImage={reviewModalItem.productImage}
          onReviewSubmitted={() => {
            showToast('Thank you! Your verified review has been published.', 'success');
          }}
        />
      )}

      {/* Official GST Tax Invoice Modal */}
      {order && (
        <TaxInvoiceModal
          order={order}
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
        />
      )}

      {/* Customer Self-Service Cancel Order Modal */}
      {isCancelModalOpen && order && (
        <CancelOrderModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          order={order}
          guestEmail={emailParam || undefined}
          guestPhone={order.customerPhone || undefined}
          onSuccess={(orderNum) => {
            fetchOrderTracking(orderNum, true);
            setOrder((prev) => prev ? { ...prev, orderStatus: 'CANCELLED' } : null);
          }}
        />
      )}

      {/* Customer Self-Service Return / Exchange Modal */}
      {isReturnModalOpen && order && (
        <ReturnRequestModal
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          order={order}
          guestEmail={emailParam || undefined}
          guestPhone={order.customerPhone || undefined}
          onSuccess={(orderNum) => {
            fetchOrderTracking(orderNum, true);
            setOrder((prev) => prev ? { ...prev, orderStatus: 'RETURN_REQUESTED' } : null);
          }}
        />
      )}

    </div>
  );
};
