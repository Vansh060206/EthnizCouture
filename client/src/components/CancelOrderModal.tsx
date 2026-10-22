import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, RefreshCw, ShieldAlert, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Order } from '../types';

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSuccess: (updatedOrderNumber: string) => void;
  guestEmail?: string;
  guestPhone?: string;
}

const CANCELLATION_REASONS = [
  { id: 'WRONG_SIZE_COLOR', label: 'Ordered wrong size or color variant' },
  { id: 'WRONG_ADDRESS', label: 'Incorrect delivery address or contact details' },
  { id: 'CHANGED_MIND', label: 'Changed my mind / No longer needed' },
  { id: 'DELIVERY_TOO_LATE', label: 'Estimated delivery date is too late for occasion' },
  { id: 'ANOTHER_OUTFIT', label: 'Selected another ensemble from the atelier' },
  { id: 'OTHER', label: 'Other personal reason' },
];

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onSuccess,
  guestEmail,
  guestPhone
}) => {
  const { showToast } = useToast();

  const [selectedReason, setSelectedReason] = useState(CANCELLATION_REASONS[0].label);
  const [comments, setComments] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedReason(CANCELLATION_REASONS[0].label);
      setComments('');
      setErrorMessage('');
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const isPrepaid = order.paymentStatus === 'PAID' || (order.paymentMethod !== 'COD' && order.paymentStatus !== 'FAILED');

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const fullReason = comments.trim() ? `${selectedReason} - ${comments.trim()}` : selectedReason;

    try {
      const res = await api.put(`/orders/${order.id}/cancel`, {
        reason: fullReason,
        customerEmail: guestEmail || order.customerEmail,
        customerPhone: guestPhone || order.customerPhone
      });

      showToast(res.data.message || 'Order cancelled successfully. Stock restored.', 'success');
      onSuccess(order.orderNumber);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Unable to cancel order. Please contact atelier concierge.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-order-title"
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 overflow-x-hidden transition-all"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full sm:max-w-md md:max-w-lg bg-white rounded-t-[32px] sm:rounded-2xl shadow-2xl border-t sm:border border-red-200/60 sm:border-zinc-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in slide-in-from-bottom duration-300"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}
      >
        
        {/* Mobile Pull Handle Indicator */}
        <div className="w-12 h-1 bg-zinc-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-5 py-4 sm:p-6 sm:pb-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-red-50/60">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-red-700 bg-red-100/80 px-2 py-0.5 rounded">
                ORDER CANCELLATION
              </span>
              <h2 id="cancel-order-title" className="text-base sm:text-lg font-serif font-bold text-zinc-900 mt-0.5 truncate">
                Cancel {order.orderNumber}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/50 active:scale-95 flex items-center justify-center transition-all shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleConfirmCancel} className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Order Summary Snapshot */}
          <div className="bg-[#FAF7F2] border border-[#EBE4D8] rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="min-w-0 pr-2">
              <p className="text-zinc-500 text-[11px] truncate">Items: {order.items?.length || 1} piece(s)</p>
              <p className="font-semibold text-zinc-900 mt-0.5">
                Total Value: <strong className="font-serif text-sm">₹{order.totalAmount.toLocaleString('en-IN')}</strong>
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded font-bold uppercase text-[10px]">
                {order.orderStatus.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Refund Notice */}
          <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
            isPrepaid
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-zinc-50 border-zinc-200 text-zinc-700'
          }`}>
            {isPrepaid ? (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Full Refund:</strong> Your payment of <strong>₹{order.totalAmount.toLocaleString('en-IN')}</strong> will be credited back to your original payment method / UPI within 5-7 business banking days.
                </span>
              </div>
            ) : (
              <span>
                <strong>Cash on Delivery Order:</strong> Since this order has not been paid yet, no amount was charged and no refund is required.
              </span>
            )}
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">
              Select Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {CANCELLATION_REASONS.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all break-words ${
                    selectedReason === r.label
                      ? 'border-[#3E1A1E] bg-[#FAF7F2] font-semibold text-zinc-900 shadow-2xs'
                      : 'border-zinc-200 hover:border-zinc-300 text-zinc-700 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancelReason"
                    value={r.label}
                    checked={selectedReason === r.label}
                    onChange={() => setSelectedReason(r.label)}
                    className="mt-0.5 accent-[#3E1A1E] text-[#3E1A1E] shrink-0"
                  />
                  <span className="leading-snug">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Optional Details */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
              Additional Details <span className="text-zinc-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Tell us more about why you're cancelling..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full p-3 rounded-xl border border-zinc-200 text-base sm:text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#3E1A1E]/10 transition-all resize-none bg-white"
            />
          </div>

          {/* Action CTAs: Stacked on mobile with 48px height, side-by-side on desktop */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:flex-1 h-12 sm:h-11 border border-zinc-300 hover:bg-zinc-100 active:scale-[0.98] text-zinc-700 rounded-xl font-bold uppercase tracking-wider text-xs transition-all"
            >
              Keep My Order
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:flex-1 h-12 sm:h-11 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <span>Confirm Cancellation</span>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
