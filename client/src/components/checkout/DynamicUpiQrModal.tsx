import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  X,
  Sparkles,
  Zap
} from 'lucide-react';
import api from '../../services/api';

interface DynamicUpiQrModalProps {
  isOpen: boolean;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  onClose: () => void;
  onPaymentSuccess: (orderData: any) => void;
}

export const DynamicUpiQrModal: React.FC<DynamicUpiQrModalProps> = ({
  isOpen,
  orderId,
  orderNumber,
  totalAmount,
  onClose,
  onPaymentSuccess
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [upiUrl, setUpiUrl] = useState<string | null>(null);
  const [vpa, setVpa] = useState<string>('ethnizcouture@icici');
  const [merchantName, setMerchantName] = useState<string>('Ethniz Couture');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900); // 15 mins default
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [isSimulatedMode, setIsSimulatedMode] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch or generate dynamic UPI QR code
  const generateQr = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/payments/upi/create-qr', { orderId });
      if (res.data?.success) {
        setQrDataUrl(res.data.qrDataUrl || res.data.imageUrl);
        setUpiUrl(res.data.upiUrl);
        setVpa(res.data.vpa || 'ethnizcouture@icici');
        setMerchantName(res.data.merchantName || 'Ethniz Couture');
        setIsSimulatedMode(Boolean(res.data.isSimulated));

        if (res.data.expiresAt) {
          const exp = new Date(res.data.expiresAt);
          setExpiresAt(exp);
          const diffSeconds = Math.max(0, Math.floor((exp.getTime() - Date.now()) / 1000));
          setSecondsRemaining(diffSeconds);
        } else {
          setSecondsRemaining(900);
        }
      } else {
        setError(res.data?.message || 'Unable to generate dynamic UPI QR. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to create UPI QR:', err);
      setError(
        err.response?.data?.message || 'Network error while generating UPI QR code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Initial load when modal opens
  useEffect(() => {
    if (isOpen && orderId) {
      setIsPaidSuccess(false);
      generateQr();
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isOpen, orderId, generateQr]);

  // Expiry countdown timer
  useEffect(() => {
    if (!isOpen || isPaidSuccess || loading) return;

    timerIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isOpen, isPaidSuccess, loading]);

  // Real-time authoritative payment status polling (every 2.5s)
  useEffect(() => {
    if (!isOpen || isPaidSuccess || secondsRemaining <= 0 || !orderId) return;

    const checkPaymentStatus = async () => {
      try {
        const res = await api.get(`/payments/status/${orderId}`);
        if (res.data?.isPaid || res.data?.paymentStatus === 'PAID') {
          // Authoritative payment confirmed!
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          setIsPaidSuccess(true);

          // Give user a brief moment to admire the bank success banner before continuing
          setTimeout(() => {
            onPaymentSuccess(res.data);
          }, 1200);
        }
      } catch (err) {
        // Silently continue polling on transient network glitch
        console.debug('Polling payment status...', err);
      }
    };

    // First check after 1.5 seconds
    const initialTimeout = setTimeout(checkPaymentStatus, 1500);

    // Subsequent checks every 2.5 seconds
    pollIntervalRef.current = setInterval(checkPaymentStatus, 2500);

    return () => {
      clearTimeout(initialTimeout);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, isPaidSuccess, secondsRemaining, orderId, onPaymentSuccess]);

  // Handle instant sandbox payment approval simulation
  const handleSimulatePayment = async () => {
    if (!orderId || isSimulating) return;
    setIsSimulating(true);
    try {
      const res = await api.post('/payments/upi/simulate-pay', { orderId });
      if (res.data?.success) {
        setIsPaidSuccess(true);
        setTimeout(() => {
          onPaymentSuccess(res.data);
        }, 1200);
      }
    } catch (err: any) {
      console.error('Simulation error:', err);
      setError(err.response?.data?.message || 'Failed to simulate payment');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCopyVpa = () => {
    if (!vpa) return;
    navigator.clipboard.writeText(vpa);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  if (!isOpen) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isExpired = secondsRemaining <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#C6A15D]/40 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header - Haute Couture Burgundy and Gold */}
        <div className="bg-[#3E1A1E] px-6 py-4 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C6A15D] animate-pulse" />
              <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#DFC89D]">
                ETHNIZ COUTURE ATELIER
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isPaidSuccess}
              className="text-zinc-300 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors disabled:opacity-40"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-white tracking-wide">
                Scan to Pay via UPI
              </h2>
              <p className="text-xs text-zinc-300 mt-0.5">
                Order Reference: <span className="font-mono text-[#DFC89D] font-bold">{orderNumber}</span>
              </p>
            </div>

            {/* Authoritative Locked Amount */}
            <div className="text-right">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Total Payable</span>
              <span className="font-serif text-2xl font-bold text-[#DFC89D]">
                ₹{totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">

          {/* Success Overlay Banner */}
          {isPaidSuccess ? (
            <div className="py-10 text-center space-y-4 animate-scale-up">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-12 h-12 animate-bounce" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#84642C]">
                  Authoritative Confirmation
                </span>
                <h3 className="font-serif text-2xl font-bold text-zinc-950">
                  Payment Approved by Bank!
                </h3>
                <p className="text-xs text-zinc-600 max-w-xs mx-auto">
                  Your UPI transaction has been authoritatively verified. Preparing your royal couture receipt...
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-800">
                <Sparkles className="w-4 h-4 text-[#C6A15D]" />
                <span>Redirecting to Order Confirmation</span>
              </div>
            </div>
          ) : loading ? (
            /* Loading Skeleton */
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto border-3 border-[#C6A15D] border-t-[#3E1A1E] rounded-full animate-spin" />
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-bold text-zinc-900">
                  Generating Dynamic UPI QR...
                </h3>
                <p className="text-xs text-zinc-500">
                  Securing order reference and binding exact amount of ₹{totalAmount.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          ) : error ? (
            /* Error State */
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-bold text-zinc-900">
                  QR Generation Failed
                </h3>
                <p className="text-xs text-zinc-600 max-w-xs mx-auto">
                  {error}
                </p>
              </div>
              <button
                type="button"
                onClick={generateQr}
                className="px-6 py-2.5 bg-[#3E1A1E] text-[#DFC89D] rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#2B0C10] transition-colors flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Generation</span>
              </button>
            </div>
          ) : (
            /* Dynamic QR Display */
            <>
              {/* Dynamic QR Display Card */}
              <div className="relative mx-auto w-64 h-64 sm:w-68 sm:h-68 bg-white p-4 rounded-2xl border-2 border-[#C6A15D]/60 shadow-xl flex items-center justify-center group">
                {/* Haute Couture Golden Corners */}
                <span className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-[#84642C]" />
                <span className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-[#84642C]" />
                <span className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-[#84642C]" />
                <span className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-[#84642C]" />

                {isExpired ? (
                  <div className="text-center space-y-3 p-4">
                    <Clock className="w-10 h-10 text-amber-600 mx-auto" />
                    <div>
                      <p className="font-serif text-base font-bold text-zinc-900">
                        Dynamic QR Expired
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        For security, dynamic single-use QR codes expire after 15 minutes.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={generateQr}
                      className="px-4 py-2 bg-[#3E1A1E] text-[#DFC89D] rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#2B0C10] flex items-center gap-1.5 mx-auto"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Generate Fresh QR</span>
                    </button>
                  </div>
                ) : qrDataUrl ? (
                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <img
                      src={qrDataUrl}
                      alt="Ethniz Couture Dynamic UPI QR Code"
                      className="w-full h-full object-contain rounded-lg"
                    />

                    {/* Subtle centered brand monogram watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-white/95 border border-[#C6A15D] flex items-center justify-center shadow-md">
                        <span className="font-serif text-[11px] font-bold text-[#3E1A1E] tracking-tighter">
                          EC
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Expiry & Real-time Live Status Bar */}
              {!isExpired && (
                <div className="flex items-center justify-between px-3 py-2 bg-[#FAF7F2] rounded-xl border border-[#C6A15D]/30 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                    </span>
                    <span className="text-zinc-700 font-medium">Awaiting bank verification...</span>
                  </div>

                  <div className="flex items-center gap-1 font-mono font-bold text-[#3E1A1E]">
                    <Clock className="w-3.5 h-3.5 text-[#C6A15D]" />
                    <span>{formattedTime}</span>
                  </div>
                </div>
              )}

              {/* Supported UPI Apps Pills */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold text-center">
                  Works with all compatible Indian UPI apps
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-medium text-zinc-700">
                  <span className="px-2.5 py-1 bg-zinc-100 rounded-md border border-zinc-200">Google Pay</span>
                  <span className="px-2.5 py-1 bg-zinc-100 rounded-md border border-zinc-200">PhonePe</span>
                  <span className="px-2.5 py-1 bg-zinc-100 rounded-md border border-zinc-200">Paytm</span>
                  <span className="px-2.5 py-1 bg-zinc-100 rounded-md border border-zinc-200">BHIM</span>
                  <span className="px-2.5 py-1 bg-zinc-100 rounded-md border border-zinc-200">CRED</span>
                </div>
              </div>

              {/* Mobile Shopper Action: One-Tap Open in UPI App */}
              {upiUrl && (
                <div className="sm:hidden pt-1">
                  <a
                    href={upiUrl}
                    className="w-full py-3 bg-[#3E1A1E] hover:bg-[#2B0C10] text-[#DFC89D] text-xs font-bold uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 border border-[#C6A15D]/40"
                  >
                    <Smartphone className="w-4 h-4 text-[#C6A15D]" />
                    <span>Open in UPI App Directly</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                  </a>
                </div>
              )}

              {/* Payee VPA Details */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-zinc-600">
                  <span>Payee:</span>
                  <span className="font-semibold text-zinc-900">{merchantName}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-600">
                  <span>Merchant UPI ID:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-zinc-900 font-semibold">{vpa}</span>
                    <button
                      type="button"
                      onClick={handleCopyVpa}
                      className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors"
                      title="Copy UPI VPA"
                    >
                      {copiedVpa ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Simulation / Sandbox Test Approval Button */}
              {isSimulatedMode && (
                <div className="pt-2 border-t border-dashed border-gold-300">
                  <button
                    type="button"
                    onClick={handleSimulatePayment}
                    disabled={isSimulating || isPaidSuccess}
                    className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100/80 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>
                      {isSimulating ? 'Simulating Bank Approval...' : 'Simulate Instant UPI Approval (Sandbox/Demo)'}
                    </span>
                  </button>
                  <p className="text-[10px] text-zinc-400 text-center mt-1">
                    * Available in test/demo mode to verify real-time status transitions and royal confetti animation.
                  </p>
                </div>
              )}
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#FAF7F2] border-t border-[#C6A15D]/20 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>256-Bit Encrypted UPI Switch</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPaidSuccess}
            className="text-[11px] font-bold text-zinc-600 hover:text-zinc-900 uppercase tracking-wider disabled:opacity-40"
          >
            Cancel / Close
          </button>
        </div>

      </div>
    </div>
  );
};
