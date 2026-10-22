import React, { useState, useEffect } from 'react';
import { RotateCcw, X, RefreshCw, Sparkles, CreditCard, ShieldCheck, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Order } from '../types';

interface ReturnRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSuccess: (updatedOrderNumber: string) => void;
  guestEmail?: string;
  guestPhone?: string;
}

const RETURN_RESOLUTIONS = [
  {
    id: 'EXCHANGE',
    title: 'Exchange Size / Color',
    desc: 'Swap for a different size or color of the same silhouette',
    icon: RotateCcw,
  },
  {
    id: 'REFUND',
    title: 'Refund to Source',
    desc: 'Credited directly back to your bank account / UPI',
    icon: CreditCard,
  },
  {
    id: 'STORE_CREDIT',
    title: 'Store Credit',
    desc: 'Instant store credit voucher with no expiration date',
    icon: Sparkles,
  },
];

const RETURN_REASONS = [
  { id: 'SIZE_FIT', label: 'Size or fit issue (Garment is too tight / loose)' },
  { id: 'DEFECTIVE', label: 'Item defective, damaged, or embellishment loose' },
  { id: 'COLOR_VARIATION', label: 'Color or handloom weave noticeably differs from catalog' },
  { id: 'QUALITY_FABRIC', label: 'Fabric texture or feel did not meet expectations' },
  { id: 'WRONG_ITEM', label: 'Incorrect size, color, or ensemble delivered' },
  { id: 'OTHER', label: 'Other personal reason' },
];

export const ReturnRequestModal: React.FC<ReturnRequestModalProps> = ({
  isOpen,
  onClose,
  order,
  onSuccess,
  guestEmail,
  guestPhone
}) => {
  const { showToast } = useToast();

  const [resolution, setResolution] = useState<'EXCHANGE' | 'REFUND' | 'STORE_CREDIT'>('EXCHANGE');
  const [reason, setReason] = useState(RETURN_REASONS[0].label);
  const [comments, setComments] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setResolution('EXCHANGE');
      setReason(RETURN_REASONS[0].label);
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

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await api.post(`/orders/${order.id}/return`, {
        reason,
        resolution,
        comments: comments.trim() || undefined,
        customerEmail: guestEmail || order.customerEmail,
        customerPhone: guestPhone || order.customerPhone
      });

      showToast(res.data.message || 'Return request submitted successfully.', 'success');
      onSuccess(order.orderNumber);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit return request. Please try again.';
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
      aria-labelledby="return-modal-title"
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 overflow-x-hidden transition-all"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full sm:max-w-md md:max-w-lg bg-white rounded-t-[32px] sm:rounded-2xl shadow-2xl border-t sm:border border-[#C5A262]/40 sm:border-zinc-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in slide-in-from-bottom duration-300"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}
      >
        
        {/* Mobile Pull Handle Indicator */}
        <div className="w-12 h-1 bg-zinc-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-5 py-4 sm:p-6 sm:pb-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-[#FAF7F2]">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#FAF1DF] text-[#84642C] border border-[#EBE4D8] flex items-center justify-center shrink-0">
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-[#84642C] bg-[#FAF1DF] px-2 py-0.5 rounded">
                7-DAY ATELIER GUARANTEE
              </span>
              <h2 id="return-modal-title" className="text-base sm:text-lg font-serif font-bold text-[#3E1A1E] mt-0.5 truncate">
                Return / Exchange #{order.orderNumber}
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
        <form onSubmit={handleSubmitReturn} className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Delivered Order Snapshot */}
          <div className="bg-[#FAF7F2] border border-[#EBE4D8] rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="min-w-0 pr-2">
              <p className="font-semibold text-zinc-900 truncate">Order #{order.orderNumber}</p>
              <p className="text-zinc-500 text-[11px] mt-0.5">
                Total Value: <strong className="font-serif text-sm text-[#3E1A1E]">₹{order.totalAmount.toLocaleString('en-IN')}</strong>
              </p>
            </div>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold uppercase text-[10px] shrink-0">
              Delivered
            </span>
          </div>

          {/* Preferred Resolution */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">
              Preferred Resolution <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {RETURN_RESOLUTIONS.map((res) => {
                const Icon = res.icon;
                const isSelected = resolution === res.id;
                return (
                  <button
                    type="button"
                    key={res.id}
                    onClick={() => setResolution(res.id as any)}
                    className={`p-3 rounded-xl border text-left flex items-start sm:flex-col justify-between gap-3 sm:gap-2 transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'border-[#3E1A1E] bg-[#FAF7F2] ring-2 ring-[#3E1A1E]/10'
                        : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isSelected ? 'text-[#3E1A1E]' : 'text-zinc-400'}`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-[#3E1A1E]' : 'text-zinc-800'}`}>
                        {res.title}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">
                        {res.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">
              Reason for Return / Exchange <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {RETURN_REASONS.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all break-words ${
                    reason === r.label
                      ? 'border-[#3E1A1E] bg-[#FAF7F2] font-semibold text-zinc-900 shadow-2xs'
                      : 'border-zinc-200 hover:border-zinc-300 text-zinc-700 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="returnReason"
                    value={r.label}
                    checked={reason === r.label}
                    onChange={() => setReason(r.label)}
                    className="mt-0.5 accent-[#3E1A1E] text-[#3E1A1E] shrink-0"
                  />
                  <span className="leading-snug">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Optional Comments */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
              Fitting Details / Specific Requests <span className="text-zinc-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="E.g., Need Size L instead of M, or sleeves need adjustments..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full p-3 rounded-xl border border-zinc-200 text-base sm:text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#3E1A1E]/10 transition-all resize-none bg-white"
            />
          </div>

          {/* Reverse Pickup Guarantee */}
          <div className="bg-[#FAF7F2] border border-[#EBE4D8] rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-[#84642C]">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#C5A262]" />
            <span>
              Complimentary doorstep reverse pickup will be scheduled via BlueDart / Delhivery once reviewed. Ensure designer tags remain attached.
            </span>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:flex-1 h-12 sm:h-11 border border-zinc-300 hover:bg-zinc-100 active:scale-[0.98] text-zinc-700 rounded-xl font-bold uppercase tracking-wider text-xs transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:flex-1 h-12 sm:h-11 bg-[#3E1A1E] hover:bg-[#2C1215] active:scale-[0.98] text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <span>Submit Return Request</span>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
