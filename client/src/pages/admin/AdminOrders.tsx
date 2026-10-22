import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Eye,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  X,
  Package,
  AlertTriangle,
  RefreshCw,
  Send,
  ShieldCheck,
  Check,
  ChevronRight,
  Filter,
  User,
  Phone,
  Mail,
  AlertCircle,
  Scissors,
  ArrowRight,
  Printer,
  RotateCcw,
  CreditCard
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Order } from '../../types';
import { TaxInvoiceModal } from '../../components/TaxInvoiceModal';

interface QueueStats {
  all: number;
  new: number;
  confirmed: number;
  preparing: number;
  packed: number;
  shipped: number;
  outForDelivery: number;
  delivered: number;
  cancelled: number;
  inTransit: number;
  returnRequested?: number;
  returned?: number;
}

const CARRIER_OPTIONS = [
  'Blue Dart Express Air',
  'Delhivery Surface & Air',
  'DTDC Express Cargo',
  'India Post Speed Post',
  'Shadowfax Royal Logistics',
  'DHL Express Worldwide',
  'Custom / Hand Delivery Concierge'
];

export const AdminOrders: React.FC = () => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    all: 0,
    new: 0,
    confirmed: 0,
    preparing: 0,
    packed: 0,
    shipped: 0,
    outForDelivery: 0,
    delivered: 0,
    cancelled: 0,
    inTransit: 0,
    returnRequested: 0,
    returned: 0
  });
  const [loading, setLoading] = useState(true);

  // Operational Queue Selection
  const [activeQueue, setActiveQueue] = useState<string>(
    () => sessionStorage.getItem('ethniz_admin_orders_queue') || 'ALL'
  );

  // Search & Filter state
  const [search, setSearch] = useState(() => sessionStorage.getItem('ethniz_admin_orders_search') || '');
  const [paymentFilter, setPaymentFilter] = useState(() => sessionStorage.getItem('ethniz_admin_orders_payment') || 'ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState(() => sessionStorage.getItem('ethniz_admin_orders_daterange') || 'ALL');
  const [sortBy, setSortBy] = useState(() => sessionStorage.getItem('ethniz_admin_orders_sort') || 'date_desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Selected Order for Detail Drawer
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Action in flight
  const [actionLoading, setActionLoading] = useState(false);

  // Preparation checklist local state (transient for drawer)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Confirmation Modals State
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isReturnApproveModalOpen, setIsReturnApproveModalOpen] = useState(false);
  const [isReturnRejectModalOpen, setIsReturnRejectModalOpen] = useState(false);

  // Return Resolution Form Fields
  const [returnResolution, setReturnResolution] = useState<'EXCHANGE' | 'REFUND' | 'STORE_CREDIT'>('REFUND');
  const [returnCarrier, setReturnCarrier] = useState('Blue Dart Express Reverse Logistics');
  const [returnTrackingNumber, setReturnTrackingNumber] = useState('');
  const [returnCustomerNotes, setReturnCustomerNotes] = useState('');
  const [returnInternalNotes, setReturnInternalNotes] = useState('');
  const [returnRestoreStock, setReturnRestoreStock] = useState(true);
  const [returnActionType, setReturnActionType] = useState<'SCHEDULE_PICKUP' | 'IMMEDIATE_REFUND'>('SCHEDULE_PICKUP');

  // Return Rejection Form Fields
  const [returnRejectionReason, setReturnRejectionReason] = useState('Outside 7-day atelier return window');
  const [returnRejectionNotes, setReturnRejectionNotes] = useState('');

  // Dispatch Form Fields
  const [dispatchCarrier, setDispatchCarrier] = useState(CARRIER_OPTIONS[0]);
  const [dispatchTrackingNumber, setDispatchTrackingNumber] = useState('');
  const [dispatchEstimatedDelivery, setDispatchEstimatedDelivery] = useState('');
  const [dispatchCustomerNotes, setDispatchCustomerNotes] = useState('');
  const [dispatchInternalNotes, setDispatchInternalNotes] = useState('');

  // Cancellation Form Fields
  const [cancelReason, setCancelReason] = useState('');

  // Delivery Form Fields
  const [codCashCollected, setCodCashCollected] = useState(false);

  // Persist filters to session storage
  useEffect(() => {
    sessionStorage.setItem('ethniz_admin_orders_queue', activeQueue);
  }, [activeQueue]);

  useEffect(() => {
    sessionStorage.setItem('ethniz_admin_orders_search', search);
  }, [search]);

  useEffect(() => {
    sessionStorage.setItem('ethniz_admin_orders_payment', paymentFilter);
  }, [paymentFilter]);

  useEffect(() => {
    sessionStorage.setItem('ethniz_admin_orders_daterange', dateRangeFilter);
  }, [dateRangeFilter]);

  useEffect(() => {
    sessionStorage.setItem('ethniz_admin_orders_sort', sortBy);
  }, [sortBy]);

  // Fetch orders from backend (silent = true refreshes in background without showing full loading spinner)
  const fetchOrders = async (targetPage = page, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/admin/orders', {
        params: {
          status: activeQueue !== 'ALL' ? activeQueue : undefined,
          paymentStatus: paymentFilter !== 'ALL' ? paymentFilter : undefined,
          dateRange: dateRangeFilter !== 'ALL' ? dateRangeFilter : undefined,
          search: search.trim() || undefined,
          sortBy,
          page: targetPage,
          limit: 15
        }
      });

      setOrders(res.data.orders || []);
      if (res.data.queueStats) {
        setQueueStats(res.data.queueStats);
      }
      if (res.data.pagination) {
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalOrders(res.data.pagination.total || 0);
        setPage(res.data.pagination.page || 1);
      }
    } catch (err) {
      if (!silent) {
        console.error('Failed to load orders', err);
        showToast('Failed to load operational orders queue', 'error');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchOrders(1);
  }, [activeQueue, paymentFilter, dateRangeFilter, sortBy]);

  // Dynamic Background Polling for Admin Queue: Refresh order counts and lists every 6s without full page reload
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && !actionLoading) {
        fetchOrders(page, true);
      }
    }, 6000);

    const handleFocus = () => {
      if (document.visibilityState === 'visible' && !actionLoading) {
        fetchOrders(page, true);
      }
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, [page, activeQueue, paymentFilter, dateRangeFilter, sortBy, search, actionLoading]);

  // Open detail drawer and initialize state
  const handleOpenOrder = (order: Order) => {
    setSelectedOrder(order);
    setCheckedItems({});
    setDispatchCarrier(order.carrierName || CARRIER_OPTIONS[0]);
    setDispatchTrackingNumber(order.trackingNumber || `BD-${order.orderNumber.replace(/[^A-Z0-9]/g, '')}`);
    setDispatchEstimatedDelivery(
      order.estimatedDelivery ? new Date(order.estimatedDelivery).toISOString().split('T')[0] : ''
    );
    setDispatchCustomerNotes('');
    setDispatchInternalNotes(order.internalNotes || '');
    setCancelReason('');
    setCodCashCollected(order.paymentMethod === 'COD');
  };

  // Execute State Machine Fulfilment Action
  const handleExecuteAction = async (
    action: string,
    extraPayload: Record<string, any> = {}
  ) => {
    if (!selectedOrder) return;

    setActionLoading(true);
    try {
      const res = await api.post(`/admin/orders/${selectedOrder.id}/fulfilment-action`, {
        action,
        expectedStatus: selectedOrder.orderStatus,
        expectedUpdatedAt: selectedOrder.updatedAt,
        ...extraPayload
      });

      if (res.data.success) {
        const updated = res.data.order;
        showToast(res.data.message || 'Order transitioned successfully', 'success');

        // Update local order & table
        setSelectedOrder(updated);
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));

        // Close any modals
        setIsDispatchModalOpen(false);
        setIsCancelModalOpen(false);
        setIsDeliveryModalOpen(false);

        // Refresh stats
        fetchOrders(page);
      } else {
        showToast(res.data.message || 'Action rejected by fulfilment policy', 'error');
      }
    } catch (err: any) {
      console.error('Fulfilment transition error', err);
      const statusCode = err.response?.status;
      const message = err.response?.data?.message || 'Fulfilment transition failed';

      if (statusCode === 409) {
        showToast(message, 'info');
        // Concurrency conflict: refresh latest data
        if (err.response?.data?.order) {
          setSelectedOrder(err.response.data.order);
        }
        fetchOrders(page);
      } else {
        showToast(message, 'error');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Dispatch Form
  const handleSubmitDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchCarrier.trim() || !dispatchTrackingNumber.trim()) {
      showToast('Carrier name and Tracking / AWB number are required to dispatch.', 'error');
      return;
    }

    handleExecuteAction('DISPATCH_ORDER', {
      carrierName: dispatchCarrier.trim(),
      trackingNumber: dispatchTrackingNumber.trim(),
      estimatedDelivery: dispatchEstimatedDelivery ? new Date(dispatchEstimatedDelivery).toISOString() : undefined,
      customerNotes: dispatchCustomerNotes.trim() || undefined,
      internalNotes: dispatchInternalNotes.trim() || undefined
    });
  };

  // Submit Cancel Form
  const handleSubmitCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      showToast('Please provide an operational reason for cancellation.', 'error');
      return;
    }

    handleExecuteAction('CANCEL_ORDER', {
      cancellationReason: cancelReason.trim()
    });
  };

  // Submit Delivery Form
  const handleSubmitDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecuteAction('CONFIRM_DELIVERY', {
      codCollected: codCashCollected
    });
  };

  // Submit Return Approval
  const handleSubmitApproveReturn = (e: React.FormEvent) => {
    e.preventDefault();
    const action = returnActionType === 'SCHEDULE_PICKUP' ? 'APPROVE_RETURN' : 'COMPLETE_RETURN';
    handleExecuteAction(action, {
      returnResolution,
      carrierName: returnCarrier.trim() || undefined,
      trackingNumber: returnTrackingNumber.trim() || undefined,
      customerNotes: returnCustomerNotes.trim() || undefined,
      internalNotes: returnInternalNotes.trim() || undefined,
      restoreStockOnReturn: returnRestoreStock
    });
    setIsReturnApproveModalOpen(false);
  };

  // Submit Return Rejection
  const handleSubmitRejectReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnRejectionNotes.trim()) {
      showToast('Please provide an explanation for declining the return request.', 'error');
      return;
    }
    handleExecuteAction('REJECT_RETURN', {
      returnRejectionReason,
      customerNotes: returnRejectionNotes.trim()
    });
    setIsReturnRejectModalOpen(false);
  };

  // Queue definitions with badges
  const QUEUE_TABS = useMemo(() => [
    { key: 'ALL', label: 'All Orders', count: queueStats.all, icon: Package },
    { key: 'NEW', label: 'New Orders', count: queueStats.new, icon: Clock },
    { key: 'CONFIRMED', label: 'Confirmed', count: queueStats.confirmed, icon: CheckCircle2 },
    { key: 'PROCESSING', label: 'Preparing', count: queueStats.preparing, icon: Scissors },
    { key: 'PACKED', label: 'Packed', count: queueStats.packed, icon: Package },
    { key: 'IN_TRANSIT', label: 'In Transit', count: queueStats.inTransit, icon: Truck },
    { key: 'DELIVERED', label: 'Delivered', count: queueStats.delivered, icon: Check },
    {
      key: 'RETURN_REQUESTED',
      label: 'Return Requests',
      count: queueStats.returnRequested || 0,
      icon: RotateCcw,
      isAlert: (queueStats.returnRequested || 0) > 0
    },
    { key: 'RETURNED', label: 'Returns & Refunds', count: queueStats.returned || 0, icon: RotateCcw },
    { key: 'CANCELLED', label: 'Cancelled', count: queueStats.cancelled, icon: AlertCircle }
  ], [queueStats]);

  return (
    <div className="space-y-6 text-zinc-100">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gold-900/40">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-gold-500">
            Atelier Operations & Logistics
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white mt-1">
            Order Fulfilment Pipeline
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Admin-controlled order validation, bespoke handloom preparation, packing verification, and authenticated courier dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchOrders(page)}
            disabled={loading}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-zinc-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-gold-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Operational Queue Tabs */}
      <div className="bg-[#1C060E] p-2 rounded-lg border border-gold-900/40 shadow-md overflow-x-auto scrollbar-thin">
        <div className="flex items-center gap-1.5 min-w-max">
          {QUEUE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeQueue === tab.key;
            const isAlertTab = (tab as any).isAlert;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveQueue(tab.key)}
                className={`px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? isAlertTab
                      ? 'bg-amber-700 text-white shadow-md border border-amber-300'
                      : 'bg-maroon-800 text-white shadow-md border border-gold-500/50'
                    : isAlertTab
                    ? 'text-amber-300 hover:text-amber-100 bg-amber-950/60 border border-amber-600/70'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-gold-300' : isAlertTab ? 'text-amber-300' : 'text-zinc-500'}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? 'bg-gold-500/30 text-gold-200 font-bold border border-gold-400/40'
                      : isAlertTab
                      ? 'bg-amber-400 text-black font-extrabold animate-pulse'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#1C060E] p-4 rounded-lg border border-gold-900/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        
        {/* Search */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            fetchOrders(1);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search order #, customer, phone, AWB..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500 placeholder-zinc-500 text-xs"
            />
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-maroon-800 hover:bg-maroon-700 text-white rounded font-bold uppercase tracking-wider text-xs"
          >
            Find
          </button>
        </form>

        {/* Payment Status Filter */}
        <div className="flex items-center gap-2">
          <label className="text-zinc-400 shrink-0 font-medium text-[11px] uppercase">Payment:</label>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-full px-2.5 py-2 bg-black/40 border border-zinc-700 rounded text-zinc-200 focus:outline-none focus:border-gold-500 text-xs"
          >
            <option value="ALL">All Payments</option>
            <option value="PAID">Paid Only</option>
            <option value="PENDING">Pending (COD/Unpaid)</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          <label className="text-zinc-400 shrink-0 font-medium text-[11px] uppercase">Date:</label>
          <select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value)}
            className="w-full px-2.5 py-2 bg-black/40 border border-zinc-700 rounded text-zinc-200 focus:outline-none focus:border-gold-500 text-xs"
          >
            <option value="ALL">All Time</option>
            <option value="today">Today</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <label className="text-zinc-400 shrink-0 font-medium text-[11px] uppercase">Sort:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-2.5 py-2 bg-black/40 border border-zinc-700 rounded text-zinc-200 focus:outline-none focus:border-gold-500 text-xs"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Highest Value</option>
            <option value="amount_asc">Lowest Value</option>
          </select>
        </div>

      </div>

      {/* Orders Table & Cards View */}
      <div className="bg-[#1C060E] rounded-lg border border-gold-900/40 overflow-hidden shadow-lg">
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-black/40 text-gold-300 uppercase tracking-wider font-semibold border-b border-zinc-800">
              <tr>
                <th className="p-3.5">Order ID & Date</th>
                <th className="p-3.5">Customer Contact</th>
                <th className="p-3.5">Destination</th>
                <th className="p-3.5">Items & Pieces</th>
                <th className="p-3.5">Amount & Payment</th>
                <th className="p-3.5">Fulfilment State</th>
                <th className="p-3.5">Courier & AWB</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-zinc-500 space-y-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-gold-400 mx-auto" />
                    <p className="font-medium text-xs">Accessing atelier ledger...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-zinc-500 space-y-2">
                    <Package className="w-8 h-8 text-gold-600 mx-auto opacity-60" />
                    <p className="font-serif text-sm font-bold text-zinc-300">No Orders in Selected Queue</p>
                    <p className="text-xs text-zinc-500">There are no orders matching the active filter criteria.</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/5 transition-colors">
                    
                    {/* Order ID & Date */}
                    <td className="p-3.5 font-mono">
                      <p className="font-bold text-gold-300">{order.orderNumber}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </td>

                    {/* Customer */}
                    <td className="p-3.5">
                      <p className="font-bold text-white">{order.customerName}</p>
                      <p className="text-[11px] text-zinc-400">{order.customerPhone}</p>
                      <p className="text-[11px] text-zinc-500 truncate max-w-[140px]">{order.customerEmail}</p>
                    </td>

                    {/* Destination */}
                    <td className="p-3.5 text-zinc-300">
                      <p className="font-medium">{order.shippingCity}, {order.shippingState}</p>
                      <p className="text-[11px] text-zinc-500 font-mono">PIN: {order.shippingPincode}</p>
                    </td>

                    {/* Items */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                        <span className="font-semibold text-white">
                          {order.items?.length || 1} {order.items?.length === 1 ? 'Garment' : 'Garments'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate max-w-[150px] mt-0.5">
                        {order.items?.[0]?.productName}
                      </p>
                    </td>

                    {/* Amount & Payment */}
                    <td className="p-3.5">
                      <p className="font-serif font-bold text-white text-sm">
                        ₹{order.totalAmount.toLocaleString('en-IN')}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                            order.paymentStatus === 'PAID'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">({order.paymentMethod})</span>
                      </div>
                    </td>

                    {/* Fulfilment State Badge */}
                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          order.orderStatus === 'DELIVERED'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : order.orderStatus === 'RETURN_REQUESTED'
                            ? 'bg-amber-950 text-amber-200 border-amber-600 animate-pulse'
                            : order.orderStatus === 'RETURN_APPROVED'
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                            : order.orderStatus === 'RETURNED'
                            ? 'bg-purple-950 text-purple-300 border-purple-800'
                            : order.orderStatus === 'SHIPPED' || order.orderStatus === 'OUT_FOR_DELIVERY'
                            ? 'bg-blue-950 text-blue-300 border-blue-800'
                            : order.orderStatus === 'PACKED'
                            ? 'bg-purple-950 text-purple-300 border-purple-800'
                            : order.orderStatus === 'PROCESSING'
                            ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                            : order.orderStatus === 'CANCELLED'
                            ? 'bg-red-950 text-red-300 border-red-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}
                      >
                        {order.orderStatus.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Carrier & Tracking */}
                    <td className="p-3.5 text-zinc-300 font-mono text-[11px]">
                      {order.carrierName ? (
                        <div>
                          <p className="text-zinc-200 font-sans font-semibold">{order.carrierName}</p>
                          <p className="text-gold-400 font-bold">{order.trackingNumber || 'Pending AWB'}</p>
                        </div>
                      ) : (
                        <span className="text-zinc-600 font-sans italic">Not yet dispatched</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleOpenOrder(order)}
                        className="px-3.5 py-1.5 bg-maroon-900 hover:bg-maroon-800 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ml-auto border border-gold-900/60 shadow-xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-gold-300" />
                        <span>Inspect &amp; Advance</span>
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-zinc-800">
          {loading ? (
            <div className="p-8 text-center text-zinc-500">
              <RefreshCw className="w-6 h-6 animate-spin text-gold-400 mx-auto mb-2" />
              <span>Loading orders...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 space-y-1">
              <p className="font-bold text-zinc-300">No Orders in Queue</p>
              <p className="text-xs">Adjust your active filter criteria.</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-gold-300 text-sm">
                      {order.orderNumber}
                    </span>
                    <p className="text-[11px] text-zinc-500">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      order.orderStatus === 'DELIVERED'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : order.orderStatus === 'SHIPPED'
                        ? 'bg-blue-950 text-blue-300 border-blue-800'
                        : order.orderStatus === 'CANCELLED'
                        ? 'bg-red-950 text-red-300 border-red-800'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}
                  >
                    {order.orderStatus.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-white">{order.customerName}</p>
                  <p className="text-zinc-400">{order.customerPhone} · {order.shippingCity}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-serif font-bold text-sm text-gold-200">
                      ₹{order.totalAmount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded font-bold uppercase">
                      {order.paymentStatus} ({order.paymentMethod})
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenOrder(order)}
                  className="w-full py-2 bg-maroon-900 hover:bg-maroon-800 text-white rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border border-gold-900/60"
                >
                  <Eye className="w-3.5 h-3.5 text-gold-300" />
                  <span>Inspect Order &amp; Advance</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Pagination Bar */}
        <div className="p-3.5 bg-black/40 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span>
            Showing <strong className="text-white">{orders.length}</strong> of{' '}
            <strong className="text-white">{totalOrders}</strong> orders
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (page > 1) {
                  setPage(page - 1);
                  fetchOrders(page - 1);
                }
              }}
              disabled={page <= 1 || loading}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded text-white font-bold"
            >
              Previous
            </button>
            <span className="font-mono text-zinc-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => {
                if (page < totalPages) {
                  setPage(page + 1);
                  fetchOrders(page + 1);
                }
              }}
              disabled={page >= totalPages || loading}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded text-white font-bold"
            >
              Next
            </button>
          </div>
        </div>

      </div>

      {/* ORDER FULFILMENT DETAIL DRAWER / MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-[#1C060E] rounded-xl shadow-2xl max-w-4xl w-full border border-gold-900/80 max-h-[92vh] overflow-y-auto space-y-6 p-5 sm:p-7 text-xs">
            
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-zinc-800 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-500">
                    Atelier Order Fulfilment
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      selectedOrder.orderStatus === 'DELIVERED'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : selectedOrder.orderStatus === 'SHIPPED'
                        ? 'bg-blue-950 text-blue-300 border-blue-800'
                        : selectedOrder.orderStatus === 'CANCELLED'
                        ? 'bg-red-950 text-red-300 border-red-800'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}
                  >
                    {selectedOrder.orderStatus.replace(/_/g, ' ')}
                  </span>
                </div>
                <h3 className="font-serif text-2xl font-bold text-white mt-1">
                  Order #{selectedOrder.orderNumber}
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsInvoiceModalOpen(true)}
                  className="px-3 py-1.5 bg-[#C6A15D]/20 hover:bg-[#C6A15D]/35 border border-[#C6A15D]/60 text-gold-200 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  title="Generate Official GST Tax Invoice"
                >
                  <Printer className="w-3.5 h-3.5 text-gold-400" />
                  <span>Tax Invoice</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ACTION PANEL (Context-Sensitive Primary Actions) */}
            <div className="p-4 bg-black/40 rounded-lg border border-gold-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-bold text-gold-300 uppercase tracking-wider text-xs">
                  Available Fulfilment Actions
                </p>
                <span className="text-[11px] text-zinc-400">
                  Current Stage: <strong className="text-white">{selectedOrder.orderStatus}</strong>
                </span>
              </div>

              {/* Action Buttons based on current state */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                
                {/* PENDING -> CONFIRMED */}
                {selectedOrder.orderStatus === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleExecuteAction('CONFIRM_ORDER')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-40 text-white rounded font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 shadow"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>Confirm Order</span>
                    </button>
                    <button
                      onClick={() => setIsCancelModalOpen(true)}
                      disabled={actionLoading}
                      className="px-3.5 py-2 bg-zinc-800 hover:bg-red-950 text-red-300 hover:text-red-200 border border-zinc-700 hover:border-red-800 rounded font-bold uppercase tracking-wider text-xs"
                    >
                      Cancel Order
                    </button>
                  </>
                )}

                {/* CONFIRMED -> PROCESSING */}
                {selectedOrder.orderStatus === 'CONFIRMED' && (
                  <>
                    <button
                      onClick={() => handleExecuteAction('START_PREPARATION')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-maroon-800 hover:bg-maroon-700 disabled:opacity-40 text-white rounded font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 shadow"
                    >
                      <Scissors className="w-4 h-4 text-gold-300" />
                      <span>Start Artisanal Preparation</span>
                    </button>
                    <button
                      onClick={() => setIsCancelModalOpen(true)}
                      disabled={actionLoading}
                      className="px-3.5 py-2 bg-zinc-800 hover:bg-red-950 text-red-300 border border-zinc-700 rounded font-bold uppercase tracking-wider text-xs"
                    >
                      Cancel Order
                    </button>
                  </>
                )}

                {/* PROCESSING -> PACKED */}
                {selectedOrder.orderStatus === 'PROCESSING' && (
                  <>
                    <button
                      onClick={() => handleExecuteAction('MARK_PACKED')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-purple-800 hover:bg-purple-700 disabled:opacity-40 text-white rounded font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 shadow"
                    >
                      <Package className="w-4 h-4 text-purple-200" />
                      <span>Mark Ready to Pack / Packed</span>
                    </button>
                    <button
                      onClick={() => setIsCancelModalOpen(true)}
                      disabled={actionLoading}
                      className="px-3.5 py-2 bg-zinc-800 hover:bg-red-950 text-red-300 border border-zinc-700 rounded font-bold uppercase tracking-wider text-xs"
                    >
                      Cancel Order
                    </button>
                  </>
                )}

                {/* PACKED -> SHIPPED */}
                {selectedOrder.orderStatus === 'PACKED' && (
                  <>
                    <button
                      onClick={() => setIsDispatchModalOpen(true)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-blue-800 hover:bg-blue-700 disabled:opacity-40 text-white rounded font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 shadow"
                    >
                      <Truck className="w-4 h-4 text-blue-200" />
                      <span>Dispatch &amp; Record Shipment</span>
                    </button>
                    <button
                      onClick={() => handleExecuteAction('START_PREPARATION', { customerNotes: 'Returned to preparation for additional alterations.' })}
                      disabled={actionLoading}
                      className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded font-bold uppercase tracking-wider text-xs"
                    >
                      Return to Preparation
                    </button>
                    <button
                      onClick={() => setIsCancelModalOpen(true)}
                      disabled={actionLoading}
                      className="px-3.5 py-2 bg-zinc-800 hover:bg-red-950 text-red-300 border border-zinc-700 rounded font-bold uppercase tracking-wider text-xs"
                    >
                      Cancel Order
                    </button>
                  </>
                )}

                {/* SHIPPED -> OUT_FOR_DELIVERY or DELIVERED */}
                {selectedOrder.orderStatus === 'SHIPPED' && (
                  <>
                    <button
                      onClick={() => handleExecuteAction('MARK_OUT_FOR_DELIVERY')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-indigo-800 hover:bg-indigo-700 disabled:opacity-40 text-white rounded font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 shadow"
                    >
                      <Truck className="w-4 h-4 text-indigo-200" />
                      <span>Mark Out for Delivery</span>
                    </button>
                    <button
                      onClick={() => setIsDeliveryModalOpen(true)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-40 text-white rounded font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 shadow"
                    >
                      <Check className="w-4 h-4 text-emerald-200" />
                      <span>Confirm Delivery</span>
                    </button>
                    <button
                      onClick={() => setIsDispatchModalOpen(true)}
                      disabled={actionLoading}
                      className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded font-bold uppercase tracking-wider text-xs"
                    >
                      Update Tracking
                    </button>
                  </>
                )}

                {/* OUT_FOR_DELIVERY -> DELIVERED */}
                {selectedOrder.orderStatus === 'OUT_FOR_DELIVERY' && (
                  <button
                    onClick={() => setIsDeliveryModalOpen(true)}
                    disabled={actionLoading}
                    className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-40 text-white rounded font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 shadow"
                  >
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>Confirm Doorstep Delivery</span>
                  </button>
                )}

                {/* Terminal & Return States */}
                {selectedOrder.orderStatus === 'DELIVERED' && (
                  <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/60 p-2.5 rounded border border-emerald-800">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Order successfully delivered to patron. Fulfilment pipeline complete.</span>
                  </div>
                )}

                {/* RETURN_REQUESTED: Action block */}
                {selectedOrder.orderStatus === 'RETURN_REQUESTED' && (
                  <div className="w-full space-y-3">
                    <div className="p-3.5 bg-amber-950/70 rounded-lg border border-amber-600/70 text-amber-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5 text-xs text-amber-300">
                          <RotateCcw className="w-4 h-4 text-amber-400" />
                          <span>Patron Return / Exchange Request Pending</span>
                        </span>
                        <span className="px-2 py-0.5 bg-amber-900 text-amber-200 rounded text-[10px] font-bold uppercase tracking-wider">
                          Requires Decision
                        </span>
                      </div>
                      {selectedOrder.statusHistory?.find(h => h.status === 'RETURN_REQUESTED') && (
                        <p className="text-[11px] text-amber-100/90 bg-black/40 p-2.5 rounded border border-amber-900/50 leading-relaxed font-mono">
                          {selectedOrder.statusHistory.find(h => h.status === 'RETURN_REQUESTED')?.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          const returnEvent = selectedOrder.statusHistory?.find(h => h.status === 'RETURN_REQUESTED');
                          if (returnEvent?.notes) {
                            if (returnEvent.notes.includes('Resolution: EXCHANGE')) setReturnResolution('EXCHANGE');
                            else if (returnEvent.notes.includes('Resolution: STORE_CREDIT')) setReturnResolution('STORE_CREDIT');
                            else setReturnResolution('REFUND');
                          }
                          setIsReturnApproveModalOpen(true);
                        }}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-40 text-white rounded font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 shadow"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                        <span>Approve Return &amp; Schedule Pickup</span>
                      </button>
                      <button
                        onClick={() => setIsReturnRejectModalOpen(true)}
                        disabled={actionLoading}
                        className="px-3.5 py-2 bg-zinc-800 hover:bg-red-950 text-red-300 border border-zinc-700 rounded font-bold uppercase tracking-wider text-xs flex items-center gap-1.5"
                      >
                        <X className="w-4 h-4 text-red-400" />
                        <span>Decline Request</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* RETURN_APPROVED: Reverse pickup & inspection in progress */}
                {selectedOrder.orderStatus === 'RETURN_APPROVED' && (
                  <div className="w-full space-y-3">
                    <div className="p-3 bg-cyan-950/60 rounded-lg border border-cyan-800 text-cyan-200 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div className="text-xs">
                        <p className="font-bold">Reverse Pickup in Progress with Courier</p>
                        <p className="text-[11px] text-cyan-300/80">Awaiting garment handover and atelier quality verification.</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleExecuteAction('COMPLETE_RETURN', {
                        restoreStockOnReturn: true,
                        customerNotes: 'Garment received at atelier, passed quality inspection. Stock restored.'
                      })}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-purple-800 hover:bg-purple-700 disabled:opacity-40 text-white rounded font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 shadow"
                    >
                      <Check className="w-4 h-4 text-purple-200" />
                      <span>Complete Return &amp; Restock Garments</span>
                    </button>
                  </div>
                )}

                {/* RETURNED: Final terminal state */}
                {selectedOrder.orderStatus === 'RETURNED' && (
                  <div className="flex items-center gap-2 text-purple-300 bg-purple-950/60 p-2.5 rounded border border-purple-800">
                    <RotateCcw className="w-4 h-4 text-purple-400" />
                    <span>Return successfully resolved. Garment restocked and financial accounting closed.</span>
                  </div>
                )}

                {selectedOrder.orderStatus === 'CANCELLED' && (
                  <div className="flex items-center gap-2 text-red-400 bg-red-950/60 p-2.5 rounded border border-red-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Order is cancelled. Stock has been restored to warehouse inventory.</span>
                  </div>
                )}

              </div>
            </div>

            {/* THREE-COLUMN OVERVIEW GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Col 1: Customer Contact */}
              <div className="p-4 bg-black/30 rounded-lg border border-zinc-800 space-y-2">
                <div className="flex items-center gap-1.5 text-gold-400 font-bold uppercase tracking-wider text-[11px]">
                  <User className="w-3.5 h-3.5" />
                  <span>Patron Contact</span>
                </div>
                <p className="font-bold text-white text-sm">{selectedOrder.customerName}</p>
                <p className="flex items-center gap-1.5 text-zinc-300">
                  <Phone className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{selectedOrder.customerPhone}</span>
                </p>
                <p className="flex items-center gap-1.5 text-zinc-300 truncate">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{selectedOrder.customerEmail}</span>
                </p>
              </div>

              {/* Col 2: Shipping Destination */}
              <div className="p-4 bg-black/30 rounded-lg border border-zinc-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-gold-400 font-bold uppercase tracking-wider text-[11px]">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Delivery Address</span>
                </div>
                <p className="text-zinc-200">
                  {selectedOrder.shippingStreet}
                  {selectedOrder.shippingApartment ? `, ${selectedOrder.shippingApartment}` : ''}
                </p>
                <p className="text-zinc-300">
                  {selectedOrder.shippingCity}, {selectedOrder.shippingState} - {selectedOrder.shippingPincode}
                </p>
                <p className="text-zinc-500 font-medium">{selectedOrder.shippingCountry}</p>
              </div>

              {/* Col 3: Payment & Accounting */}
              <div className="p-4 bg-black/30 rounded-lg border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-gold-400 font-bold uppercase tracking-wider text-[11px]">
                    Financial Audit
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                      selectedOrder.paymentStatus === 'PAID'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {selectedOrder.paymentStatus}
                  </span>
                </div>
                <p className="text-zinc-300">Method: <strong className="text-white">{selectedOrder.paymentMethod}</strong></p>
                <p className="text-zinc-400">Subtotal: ₹{selectedOrder.subtotal.toLocaleString('en-IN')}</p>
                {selectedOrder.discountAmount > 0 && (
                  <p className="text-emerald-400">Discount: -₹{selectedOrder.discountAmount.toLocaleString('en-IN')}</p>
                )}
                <p className="font-serif font-bold text-sm text-gold-200 pt-1 border-t border-zinc-800">
                  Total Payable: ₹{selectedOrder.totalAmount.toLocaleString('en-IN')}
                </p>
              </div>

            </div>

            {/* GARMENT PREPARATION & WAREHOUSE STOCK REVIEW */}
            <div className="p-4 bg-black/30 rounded-lg border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif text-base font-bold text-white">
                    Garments in this Order ({selectedOrder.items?.length})
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Review ordered variants and verify warehouse stock before packaging.
                  </p>
                </div>
                <span className="text-[11px] text-gold-400 font-mono">
                  {Object.values(checkedItems).filter(Boolean).length}/{selectedOrder.items?.length} Verified
                </span>
              </div>

              <div className="divide-y divide-zinc-800 border border-zinc-800/80 rounded-lg overflow-hidden bg-black/40">
                {selectedOrder.items?.map((item) => {
                  const isChecked = !!checkedItems[item.id];
                  const productStock = item.product?.stock ?? null;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setCheckedItems((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                      className={`p-3.5 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                        isChecked ? 'bg-emerald-950/20' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 rounded accent-maroon-800 cursor-pointer"
                        />
                        <img
                          src={item.productImage || 'https://via.placeholder.com/60'}
                          alt=""
                          className="w-12 h-16 object-cover rounded bg-zinc-800 border border-zinc-700"
                        />
                        <div>
                          <p className="font-bold text-white text-sm">{item.productName}</p>
                          <p className="text-zinc-400 text-xs mt-0.5">
                            Size: <strong className="text-gold-200">{item.size || 'Standard'}</strong>
                            {item.color && (
                              <span> · Color: <strong className="text-gold-200">{item.color}</strong></span>
                            )}
                            <span> · Ordered Qty: <strong className="text-white">{item.quantity}</strong></span>
                          </p>
                          {item.product?.sku && (
                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                              SKU: {item.product.sku}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-serif font-bold text-white text-sm">
                          ₹{item.total.toLocaleString('en-IN')}
                        </p>
                        {productStock !== null && (
                          <p className={`text-[11px] mt-0.5 font-medium ${
                            productStock <= 3 ? 'text-amber-400' : 'text-zinc-400'
                          }`}>
                            Current Stock: {productStock} units
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SHIPMENT & DISPATCH RECORD SECTION */}
            <div className="p-4 bg-black/30 rounded-lg border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-gold-400" />
                  <h4 className="font-serif text-base font-bold text-white">Courier &amp; Logistics Record</h4>
                </div>
                {selectedOrder.carrierName && (
                  <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold uppercase text-[10px]">
                    Dispatched
                  </span>
                )}
              </div>

              {selectedOrder.carrierName ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-black/50 rounded border border-zinc-800 text-zinc-300">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Assigned Carrier</span>
                    <p className="font-bold text-white mt-0.5">{selectedOrder.carrierName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">AWB / Tracking Number</span>
                    <p className="font-mono font-bold text-gold-300 mt-0.5">{selectedOrder.trackingNumber || 'Pending'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Dispatch Timestamp</span>
                    <p className="text-zinc-300 mt-0.5">
                      {selectedOrder.dispatchedAt ? new Date(selectedOrder.dispatchedAt).toLocaleString('en-IN') : 'Recorded'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-black/40 rounded border border-dashed border-zinc-700 text-zinc-400 flex items-center justify-between">
                  <span>No physical dispatch recorded yet. Ready to dispatch upon final packaging.</span>
                  {selectedOrder.orderStatus === 'PACKED' && (
                    <button
                      onClick={() => setIsDispatchModalOpen(true)}
                      className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 text-white rounded font-bold uppercase text-[11px]"
                    >
                      Record Dispatch
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* STATUS HISTORY & AUDIT LOG TIMELINE */}
            <div className="p-4 bg-black/30 rounded-lg border border-zinc-800 space-y-3">
              <h4 className="font-serif text-base font-bold text-white">
                Fulfilment Timeline &amp; Ledger
              </h4>

              <div className="space-y-3 border-l-2 border-zinc-700 ml-2 pl-4 pt-1">
                {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 ? (
                  selectedOrder.statusHistory.map((hist) => (
                    <div key={hist.id} className="relative space-y-0.5">
                      <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-gold-500 ring-4 ring-[#1C060E]" />
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-gold-300 uppercase tracking-wider text-[11px]">
                          {hist.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(hist.createdAt).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300">{hist.notes || 'Status updated.'}</p>
                      {hist.source && (
                        <span className="inline-block text-[9px] uppercase px-1.5 py-0.2 bg-zinc-800 text-zinc-400 rounded">
                          Source: {hist.source}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500 italic">No historical transitions recorded.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 1: DISPATCH / RECORD SHIPMENT CONFIRMATION */}
      {isDispatchModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1C060E] rounded-xl border border-gold-900 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scale-up text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-400" />
                <h3 className="font-serif text-lg font-bold text-white">Record Courier Dispatch</h3>
              </div>
              <button onClick={() => setIsDispatchModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitDispatch} className="space-y-3.5">
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Carrier Name *</label>
                <select
                  value={dispatchCarrier}
                  onChange={(e) => setDispatchCarrier(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded text-white focus:border-gold-500"
                >
                  {CARRIER_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-zinc-300 font-bold">Tracking / AWB Number *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const prefix = dispatchCarrier.includes('Delhivery') ? 'DLV' : dispatchCarrier.includes('DTDC') ? 'DTDC' : dispatchCarrier.includes('Speed') ? 'EMS' : 'BD';
                      setDispatchTrackingNumber(`${prefix}-${selectedOrder.orderNumber.replace(/[^A-Z0-9]/g, '')}`);
                    }}
                    className="text-[10px] text-gold-400 hover:text-gold-300 underline uppercase tracking-wider font-bold"
                  >
                    Auto-fill AWB
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. BD-89214798"
                  value={dispatchTrackingNumber}
                  onChange={(e) => setDispatchTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded text-white font-mono focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">Estimated Delivery Date (Optional)</label>
                <input
                  type="date"
                  value={dispatchEstimatedDelivery}
                  onChange={(e) => setDispatchEstimatedDelivery(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded text-white focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">Customer-Visible Milestone Note</label>
                <input
                  type="text"
                  placeholder="e.g. Handed over to Blue Dart Express Air. Dispatched from Mumbai Central Atelier."
                  value={dispatchCustomerNotes}
                  onChange={(e) => setDispatchCustomerNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded text-white focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">Internal Operational Notes (Admin Only)</label>
                <input
                  type="text"
                  placeholder="e.g. Package inspected by Master Weaver Ramesh. Sealed in water-resistant golden pouch."
                  value={dispatchInternalNotes}
                  onChange={(e) => setDispatchInternalNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded text-white focus:border-gold-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="w-1/2 py-2.5 border border-zinc-700 text-zinc-300 rounded font-bold uppercase tracking-wider hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-1/2 py-2.5 bg-blue-800 hover:bg-blue-700 text-white rounded font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Dispatching...' : 'Confirm Dispatch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CANCEL ORDER CONFIRMATION */}
      {isCancelModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1C060E] rounded-xl border border-red-900 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up text-xs">
            <div className="flex items-center gap-3 pb-2 border-b border-zinc-800">
              <div className="w-9 h-9 rounded-full bg-red-950/80 border border-red-800 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Cancel Order #{selectedOrder.orderNumber}</h3>
                <p className="text-[11px] text-zinc-400">Irreversible cancellation with inventory replenishment.</p>
              </div>
            </div>

            <p className="text-zinc-300 leading-relaxed">
              Are you sure you want to cancel this order? This will safely restore reserved stock for{' '}
              <strong className="text-white">{selectedOrder.items?.length} items</strong> back to warehouse inventory.
            </p>

            <form onSubmit={handleSubmitCancel} className="space-y-3">
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Cancellation Reason *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Patron requested cancellation prior to bespoke weaving; size adjustment needed."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded text-white focus:border-red-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="w-1/2 py-2.5 border border-zinc-700 text-zinc-300 rounded font-bold uppercase tracking-wider hover:bg-white/5"
                >
                  Abort
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-1/2 py-2.5 bg-red-800 hover:bg-red-700 text-white rounded font-bold uppercase tracking-wider shadow"
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRM DELIVERY (With COD Cash Settlement Check) */}
      {isDeliveryModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1C060E] rounded-xl border border-emerald-900 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up text-xs">
            <div className="flex items-center gap-3 pb-2 border-b border-zinc-800">
              <div className="w-9 h-9 rounded-full bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Confirm Doorstep Delivery</h3>
                <p className="text-[11px] text-zinc-400">Order #{selectedOrder.orderNumber}</p>
              </div>
            </div>

            <p className="text-zinc-300 leading-relaxed">
              Confirm that the package has been safely handed over to patron{' '}
              <strong className="text-white">{selectedOrder.customerName}</strong>.
            </p>

            {selectedOrder.paymentMethod === 'COD' && selectedOrder.paymentStatus !== 'PAID' && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="codCashCheck"
                    checked={codCashCollected}
                    onChange={(e) => setCodCashCollected(e.target.checked)}
                    className="w-4 h-4 rounded accent-maroon-800"
                  />
                  <label htmlFor="codCashCheck" className="text-amber-200 font-bold cursor-pointer">
                    Cash Amount ₹{selectedOrder.totalAmount.toLocaleString('en-IN')} Collected
                  </label>
                </div>
                <p className="text-[11px] text-amber-300/80 pl-6">
                  Checking this box will mark the order's payment status as PAID in financial accounting.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmitDelivery} className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeliveryModalOpen(false)}
                className="w-1/2 py-2.5 border border-zinc-700 text-zinc-300 rounded font-bold uppercase tracking-wider hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="w-1/2 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded font-bold uppercase tracking-wider shadow"
              >
                {actionLoading ? 'Updating...' : 'Authorize Delivery'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: APPROVE RETURN / EXCHANGE */}
      {isReturnApproveModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1C060E] rounded-xl border border-emerald-900 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scale-up text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 pb-2 border-b border-zinc-800">
              <div className="w-9 h-9 rounded-full bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Approve Return #{selectedOrder.orderNumber}</h3>
                <p className="text-[11px] text-zinc-400">Patron: {selectedOrder.customerName} ({selectedOrder.customerPhone})</p>
              </div>
            </div>

            <form onSubmit={handleSubmitApproveReturn} className="space-y-4">
              {/* Action Type */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Resolution Strategy</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReturnActionType('SCHEDULE_PICKUP')}
                    className={`p-2.5 rounded border text-left cursor-pointer transition-all ${
                      returnActionType === 'SCHEDULE_PICKUP'
                        ? 'bg-emerald-950/80 border-emerald-500 text-white font-bold'
                        : 'bg-black/40 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <p className="text-xs">Schedule Reverse Pickup</p>
                    <p className="text-[10px] text-zinc-400">Status &rarr; RETURN_APPROVED</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReturnActionType('IMMEDIATE_REFUND')}
                    className={`p-2.5 rounded border text-left cursor-pointer transition-all ${
                      returnActionType === 'IMMEDIATE_REFUND'
                        ? 'bg-emerald-950/80 border-emerald-500 text-white font-bold'
                        : 'bg-black/40 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <p className="text-xs">Immediate Restock &amp; Refund</p>
                    <p className="text-[10px] text-zinc-400">Status &rarr; RETURNED</p>
                  </button>
                </div>
              </div>

              {/* Resolution selection */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Agreed Resolution with Patron</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['REFUND', 'EXCHANGE', 'STORE_CREDIT'] as const).map((res) => (
                    <button
                      type="button"
                      key={res}
                      onClick={() => setReturnResolution(res)}
                      className={`p-2 rounded border text-center text-xs font-bold uppercase transition-all cursor-pointer ${
                        returnResolution === res
                          ? 'bg-gold-500/20 border-gold-400 text-gold-300'
                          : 'bg-black/40 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {res.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Carrier & Tracking */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Reverse Logistics Courier</label>
                  <input
                    type="text"
                    value={returnCarrier}
                    onChange={(e) => setReturnCarrier(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded text-white text-xs"
                    placeholder="e.g. Blue Dart Reverse Express"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Pickup Tracking / AWB #</label>
                  <input
                    type="text"
                    value={returnTrackingNumber}
                    onChange={(e) => setReturnTrackingNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded text-white text-xs font-mono"
                    placeholder="e.g. BDX-REV-908231"
                  />
                </div>
              </div>

              {/* Stock Restoring */}
              <div className="flex items-center gap-2 p-3 bg-black/30 border border-zinc-800 rounded">
                <input
                  type="checkbox"
                  id="returnRestoreStockCheck"
                  checked={returnRestoreStock}
                  onChange={(e) => setReturnRestoreStock(e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-600"
                />
                <label htmlFor="returnRestoreStockCheck" className="text-zinc-200 cursor-pointer">
                  Replenish warehouse stock for {selectedOrder.items?.length || 1} item(s) automatically
                </label>
              </div>

              {/* Notes to Customer */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Customer Instructions (included in email)</label>
                <textarea
                  rows={2}
                  value={returnCustomerNotes}
                  onChange={(e) => setReturnCustomerNotes(e.target.value)}
                  placeholder="e.g. Reverse pickup arranged for tomorrow. Please hand over the garment in its original padded heirloom packaging."
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded text-white text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsReturnApproveModalOpen(false)}
                  className="w-1/2 py-2.5 border border-zinc-700 text-zinc-300 rounded font-bold uppercase tracking-wider hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-1/2 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded font-bold uppercase tracking-wider shadow cursor-pointer"
                >
                  {actionLoading ? 'Processing...' : 'Authorize Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: DECLINE RETURN REQUEST */}
      {isReturnRejectModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1C060E] rounded-xl border border-red-900 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up text-xs">
            <div className="flex items-center gap-3 pb-2 border-b border-zinc-800">
              <div className="w-9 h-9 rounded-full bg-red-950/80 border border-red-800 flex items-center justify-center text-red-400 shrink-0">
                <X className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Decline Return #{selectedOrder.orderNumber}</h3>
                <p className="text-[11px] text-zinc-400">Order will revert to status: DELIVERED</p>
              </div>
            </div>

            <form onSubmit={handleSubmitRejectReturn} className="space-y-4">
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Select Policy Reason *</label>
                <select
                  value={returnRejectionReason}
                  onChange={(e) => setReturnRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded text-white text-xs"
                >
                  <option value="Outside 7-day atelier return window">Outside 7-day atelier return window</option>
                  <option value="Garment shows signs of wear, dry cleaning, or alteration">Garment shows signs of wear or alteration</option>
                  <option value="Bullion security seal or designer tags removed">Bullion security seal or designer tags removed</option>
                  <option value="Custom bespoke bridal order (non-returnable per policy)">Custom bespoke bridal order (non-returnable)</option>
                  <option value="Other atelier exception">Other bespoke policy exception</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">Concierge Explanation to Patron *</label>
                <textarea
                  required
                  rows={3}
                  value={returnRejectionNotes}
                  onChange={(e) => setReturnRejectionNotes(e.target.value)}
                  placeholder="Provide courteous explanation for why the return cannot be accepted under atelier guidelines..."
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded text-white text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsReturnRejectModalOpen(false)}
                  className="w-1/2 py-2.5 border border-zinc-700 text-zinc-300 rounded font-bold uppercase tracking-wider hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-1/2 py-2.5 bg-red-800 hover:bg-red-700 text-white rounded font-bold uppercase tracking-wider shadow cursor-pointer"
                >
                  {actionLoading ? 'Declining...' : 'Decline Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official GST Tax Invoice Modal */}
      {isInvoiceModalOpen && selectedOrder && (
        <TaxInvoiceModal
          order={selectedOrder}
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
        />
      )}

    </div>
  );
};
