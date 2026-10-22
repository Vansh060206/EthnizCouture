import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, X, CheckCircle2, Sparkles, AlertCircle, Truck, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productImage?: string;
  onReviewSubmitted?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  5: 'Exceptional Royal Couture ★★★★★',
  4: 'Very Good / Beautiful Craftsmanship ★★★★☆',
  3: 'Average / Standard Quality ★★★☆☆',
  2: 'Below Expectations ★★☆☆☆',
  1: 'Disappointing / Poor ★☆☆☆☆'
};

const FIT_OPTIONS = ['Runs Small', 'True to Size', 'Runs Large'];
const OCCASION_OPTIONS = ['Bridal / Wedding', 'Reception', 'Sangeet & Mehendi', 'Festive Celebration', 'Royal Gala / Party'];

export const WriteReviewModal: React.FC<WriteReviewModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  productImage,
  onReviewSubmitted
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [selectedFit, setSelectedFit] = useState<string>('True to Size');
  const [selectedOccasion, setSelectedOccasion] = useState<string>('Bridal / Wedding');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Review eligibility check state (strictly enforced upon delivery)
  const [checkingEligibility, setCheckingEligibility] = useState<boolean>(true);
  const [eligibility, setEligibility] = useState<{
    canReview: boolean;
    reason?: string;
    status?: string;
    orderNumber?: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (!user) {
      setCheckingEligibility(false);
      setEligibility({ canReview: false, reason: 'AUTH_REQUIRED' });
      return;
    }

    setCheckingEligibility(true);
    api.get(`/reviews/eligibility/${productId}`)
      .then((res) => {
        setEligibility(res.data);
      })
      .catch(() => {
        setEligibility({ canReview: false, reason: 'ERROR' });
      })
      .finally(() => {
        setCheckingEligibility(false);
      });
  }, [isOpen, productId, user]);

  if (!isOpen) return null;

  const activeStarCount = hoverRating ?? rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to share your verified review.', 'info');
      return;
    }

    if (!title.trim() || !comment.trim()) {
      setError('Please provide both a headline and detailed review.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Format rich review with fit & occasion metadata
    const structuredComment = `[Fit: ${selectedFit} | Occasion: ${selectedOccasion}]\n\n${comment.trim()}`;

    try {
      await api.post('/reviews', {
        productId,
        rating,
        title: title.trim(),
        comment: structuredComment
      });

      showToast('Your verified review has been published with the royal atelier!', 'success');
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Unable to submit review. Please try again.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div className="bg-[#FAF7F2] rounded-t-[28px] sm:rounded-xl border-t sm:border border-[#C6A15D]/40 shadow-2xl max-w-lg w-full max-h-[90vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-zinc-300 rounded-full mx-auto mt-3 sm:hidden" />

        {/* Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-[#E8DEC8] flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#84642C] uppercase block">
              Patron Testimonial
            </span>
            <h3 id="review-modal-title" className="font-serif text-lg font-bold text-[#1A1A1A]">
              Review Your Couture Piece
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Close review modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Product Snapshot */}
          <div className="flex items-center gap-3.5 p-3 rounded-lg bg-white border border-[#E8DEC8]/80 shadow-2xs">
            {productImage && (
              <img
                src={productImage}
                alt={productName}
                className="w-12 h-16 object-cover rounded bg-zinc-100 border border-zinc-200 shrink-0"
              />
            )}
            <div className="min-w-0">
              <h4 className="font-serif text-sm font-bold text-zinc-900 truncate">{productName}</h4>
              <p className="text-[11px] text-[#84642C] flex items-center gap-1 font-medium mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Verified Handloom Inspection</span>
              </p>
            </div>
          </div>

          {/* 1. LOADING ELIGIBILITY CHECK */}
          {checkingEligibility ? (
            <div className="py-12 text-center space-y-3 bg-white rounded-xl border border-zinc-200 p-6">
              <Loader2 className="w-8 h-8 text-[#C6A15D] animate-spin mx-auto" />
              <p className="text-xs text-zinc-600 font-medium">Verifying delivered order eligibility...</p>
            </div>
          ) : !user ? (
            /* 2. AUTHENTICATION REQUIRED */
            <div className="p-6 text-center bg-white rounded-xl border border-[#C6A15D]/30 space-y-3 shadow-xs">
              <ShieldCheck className="w-10 h-10 text-[#C6A15D] mx-auto" />
              <h4 className="font-serif text-base font-bold text-zinc-900">Sign In Required</h4>
              <p className="text-xs text-zinc-600 leading-relaxed max-w-sm mx-auto">
                Sign in with your Ethniz Couture patron account to publish your verified review.
              </p>
              <a
                href={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                className="inline-block px-5 py-2.5 bg-[#3E1A1E] hover:bg-[#2B0C10] text-[#DFC89D] rounded-lg text-xs font-bold uppercase tracking-widest border border-[#C6A15D]/60 transition-colors"
              >
                Sign In to Review
              </a>
            </div>
          ) : eligibility?.canReview === false ? (
            /* 3. NOT ELIGIBLE: ORDER IN TRANSIT OR NOT DELIVERED */
            eligibility.reason === 'ORDER_IN_TRANSIT' ? (
              <div className="p-6 text-center bg-white rounded-xl border border-amber-300/80 space-y-3 shadow-xs">
                <Truck className="w-10 h-10 text-amber-700 mx-auto" />
                <h4 className="font-serif text-base font-bold text-zinc-900">
                  Consignment in Transit ({eligibility.status?.replace(/_/g, ' ')})
                </h4>
                <p className="text-xs text-zinc-600 leading-relaxed max-w-sm mx-auto">
                  Your couture piece ({eligibility.orderNumber}) is currently on its way. To maintain 100% authentic customer reviews, review privileges unlock as soon as your parcel is officially marked <strong>Delivered</strong>.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <Link
                    to={`/track-order?orderNumber=${eligibility.orderNumber}`}
                    onClick={onClose}
                    className="px-4 py-2 bg-[#3E1A1E] hover:bg-[#2B0C10] text-[#DFC89D] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Track Delivery
                  </Link>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center bg-white rounded-xl border border-[#E8DEC8] space-y-3 shadow-xs">
                <ShieldCheck className="w-10 h-10 text-[#C6A15D] mx-auto" />
                <h4 className="font-serif text-base font-bold text-zinc-900">
                  Delivered Purchase Required
                </h4>
                <p className="text-xs text-zinc-600 leading-relaxed max-w-sm mx-auto">
                  To ensure complete integrity and protect our patrons, reviews can only be submitted once you have ordered this piece and it has been safely delivered to your address.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Understood
                </button>
              </div>
            )
          ) : (
            /* 4. VERIFIED DELIVERED PATRON FORM */
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Star Rating Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5">
                  Your Overall Rating <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      className="p-1 min-w-[36px] min-h-[36px] flex items-center justify-center text-amber-500 hover:scale-115 transition-transform cursor-pointer"
                      aria-label={`Rate ${star} stars`}
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          star <= activeStarCount
                            ? 'fill-[#C6A15D] text-[#C6A15D]'
                            : 'text-zinc-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-semibold text-[#84642C] mt-1">
                  {RATING_LABELS[activeStarCount] || ''}
                </p>
              </div>

              {/* Fit & Sizing Feedback */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5">
                  How Did the Sizing Fit?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {FIT_OPTIONS.map((fit) => (
                    <button
                      type="button"
                      key={fit}
                      onClick={() => setSelectedFit(fit)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all border ${
                        selectedFit === fit
                          ? 'bg-[#3E1A1E] text-[#DFC89D] border-[#C6A15D] shadow-xs'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      {fit}
                    </button>
                  ))}
                </div>
              </div>

              {/* Occasion Celebrated */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5">
                  Occasion Celebrated
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {OCCASION_OPTIONS.map((occ) => (
                    <button
                      type="button"
                      key={occ}
                      onClick={() => setSelectedOccasion(occ)}
                      className={`py-1.5 px-3 rounded-full text-[11px] font-medium transition-all border ${
                        selectedOccasion === occ
                          ? 'bg-[#3E1A1E] text-white border-[#3E1A1E]'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      {occ}
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Headline */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5">
                  Review Headline <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  placeholder="e.g. Stunning Banarasi weave, felt like royalty"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-12 sm:h-11 px-3.5 bg-white border border-zinc-300 rounded-lg text-base sm:text-xs text-zinc-900 focus:outline-none focus:border-[#3E1A1E] focus:ring-1 focus:ring-[#3E1A1E]"
                />
              </div>

              {/* Detailed Review Text */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5">
                  Your Detailed Experience <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  maxLength={1000}
                  placeholder="Describe the handloom silk feel, embroidery sparkle, bespoke blouse stitching, and compliments received..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-3.5 bg-white border border-zinc-300 rounded-lg text-base sm:text-xs text-zinc-900 focus:outline-none focus:border-[#3E1A1E] focus:ring-1 focus:ring-[#3E1A1E] leading-relaxed resize-none"
                />
                <div className="flex justify-between items-center text-[10px] text-zinc-500 mt-1">
                  <span>Minimum 20 characters recommended</span>
                  <span>{comment.length} / 1000</span>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-gradient-to-r from-[#3E1A1E] via-[#4A1F24] to-[#3E1A1E] hover:from-[#2B0C10] hover:to-[#2B0C10] disabled:bg-zinc-400 text-[#DFC89D] hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest border border-[#C6A15D] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4 text-[#C6A15D]" />
                  <span>{isSubmitting ? 'Publishing Review...' : 'Publish Verified Review'}</span>
                </button>
              </div>

            </form>
          )}

        </div>

        {/* Footer Note */}
        <div className="p-3.5 bg-white border-t border-[#E8DEC8] text-center text-[11px] text-zinc-500 shrink-0">
          <span>Reviews from patrons with verified orders receive the official Authenticity Crest.</span>
        </div>

      </div>
    </div>
  );
};
