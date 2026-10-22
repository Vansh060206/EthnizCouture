import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ShoppingBag, Search } from 'lucide-react';
import api from '../services/api';
import { Order } from '../types';
import { OrderSuccessAnimation } from '../components/checkout/OrderSuccessAnimation';

export const OrderConfirmation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Browser back-button trapping & ensure viewport is at the top
  useEffect(() => {
    window.scrollTo(0, 0);
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      navigate('/account?tab=orders', { replace: true });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate]);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.get(`/orders/${id}`);
      if (res.data?.order) {
        setOrder(res.data.order);
      } else {
        setErrorMessage('We could not retrieve details for this order reference.');
      }
    } catch (err: any) {
      console.error('Failed to fetch order confirmation:', err);
      if (err.response?.status === 404) {
        setErrorMessage('The requested order reference could not be found.');
      } else {
        setErrorMessage(
          err.response?.data?.message || 'Unable to retrieve order details. Please verify your connection.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Loading State
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-28 text-center space-y-4">
        <div className="w-12 h-12 border-3 border-[#C6A15D] border-t-[#3E1A1E] rounded-full animate-spin mx-auto" />
        <h2 className="font-serif text-2xl font-bold text-zinc-900 tracking-wide">
          Retrieving Couture Receipt...
        </h2>
        <p className="text-xs text-zinc-500">
          Fetching authoritative verification from Ethniz Couture Atelier
        </p>
      </div>
    );
  }

  // Error / Not Found State
  if (errorMessage || !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 bg-red-50 text-red-700 rounded-2xl flex items-center justify-center mx-auto border border-red-200">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#84642C]">
            Receipt Lookup
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-zinc-950">
            Order Reference Not Found
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-md mx-auto">
            {errorMessage || 'We could not locate this order in our records. Please verify the order number or check your order history.'}
          </p>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/track-order"
            replace={true}
            className="px-6 py-3 bg-[#3E1A1E] hover:bg-[#2E1115] text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow flex items-center gap-2"
          >
            <Search className="w-4 h-4 text-[#DFC89D]" />
            <span>Track by Order ID</span>
          </Link>
          <Link
            to="/shop"
            replace={true}
            className="px-6 py-3 bg-[#FAF7F2] border border-[#C6A15D]/40 hover:border-[#3E1A1E] text-zinc-800 text-xs font-bold uppercase tracking-widest rounded-xl flex items-center gap-2"
          >
            <ShoppingBag className="w-4 h-4 text-[#84642C]" />
            <span>Return to Boutique</span>
          </Link>
        </div>
      </div>
    );
  }

  // Authoritative Order Success Sequence
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <OrderSuccessAnimation order={order} onRefresh={fetchOrder} />
    </div>
  );
};

export default OrderConfirmation;
