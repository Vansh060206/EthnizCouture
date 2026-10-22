import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Star,
  Heart,
  ShoppingBag,
  Truck,
  ShieldCheck,
  RefreshCw,
  Ruler,
  ChevronDown,
  ChevronUp,
  Maximize2,
  X,
  Sparkles,
  Send,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SizeGuideModal } from '../components/SizeGuideModal';
import { WriteReviewModal } from '../components/WriteReviewModal';
import { ProductCard } from '../components/ProductCard';
import { useCurrency } from '../context/CurrencyContext';
import api from '../services/api';

export const ProductDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { formatPrice } = useCurrency();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals & UI states
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>('fabric');
  const [isBespokeOpen, setIsBespokeOpen] = useState(false);

  // Pincode delivery estimator with real postal data
  const [pincode, setPincode] = useState(() => localStorage.getItem('ethniz_pincode') || '');
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeResult, setPincodeResult] = useState<{
    success: boolean;
    location?: string;
    deliveryDays?: string;
    carrier?: string;
    estimatedDeliveryDate?: string;
    message?: string;
  } | null>(null);

  const checkPincodeAvailability = async (codeToCheck?: string) => {
    const targetPin = (codeToCheck || pincode).trim();
    if (!/^[1-9][0-9]{5}$/.test(targetPin)) {
      setPincodeResult({
        success: false,
        message: 'Please enter a valid 6-digit Indian postal pincode (e.g. 110001).'
      });
      return;
    }

    setPincodeLoading(true);
    try {
      const res = await api.get(`/location/pincode/${targetPin}`);
      if (res.data?.success) {
        localStorage.setItem('ethniz_pincode', targetPin);
        setPincodeResult({
          success: true,
          location: `${res.data.city}, ${res.data.state}`,
          deliveryDays: res.data.deliveryDays,
          carrier: res.data.carrier,
          estimatedDeliveryDate: res.data.estimatedDeliveryDate
        });
      } else {
        setPincodeResult({
          success: false,
          message: res.data?.message || 'Pincode not currently serviceable.'
        });
      }
    } catch {
      setPincodeResult({
        success: false,
        message: 'Unable to check delivery timeline. Please try again.'
      });
    } finally {
      setPincodeLoading(false);
    }
  };

  // Auto-check if a saved pincode exists on mount
  useEffect(() => {
    const savedPin = localStorage.getItem('ethniz_pincode');
    if (savedPin && /^[1-9][0-9]{5}$/.test(savedPin)) {
      checkPincodeAvailability(savedPin);
    }
  }, []);

  // Review submission state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const prevSlugRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      // Only scroll to top if navigating to a different product, keeping scroll location on refresh
      if (prevSlugRef.current && prevSlugRef.current !== slug) {
        window.scrollTo(0, 0);
      }
      prevSlugRef.current = slug || null;
      try {
        const res = await api.get(`/products/${slug}`);
        const prod: Product = res.data.product;
        setProduct(prod);
        setRelatedProducts(res.data.relatedProducts || []);

        const initialImg = prod.images?.find((i) => i.isPrimary)?.url || prod.images?.[0]?.url || '';
        setSelectedImage(initialImg);

        const sizes = prod.availableSizes ? prod.availableSizes.split(',').map((s) => s.trim()) : ['Free Size'];
        setSelectedSize(sizes[0] || 'Free Size');

        const colors = prod.availableColors ? prod.availableColors.split(',').map((c) => c.trim()) : [];
        if (colors.length > 0) setSelectedColor(colors[0]);
      } catch (err) {
        console.error('Failed to load product:', err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-3 border-maroon-800 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-serif text-lg text-zinc-600">Unveiling Royal Heirlooms...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="font-serif text-3xl font-bold text-zinc-900">Piece Not Found</h2>
        <p className="text-xs text-zinc-500 mt-2">The requested garment may have concluded its limited artisanal run.</p>
        <Link to="/shop" className="mt-6 inline-block px-6 py-2.5 bg-maroon-800 text-white rounded text-xs font-bold uppercase tracking-wider">
          Return to Collection
        </Link>
      </div>
    );
  }

  const sizes = product.availableSizes ? product.availableSizes.split(',').map((s) => s.trim()) : ['Free Size'];
  const colors = product.availableColors ? product.availableColors.split(',').map((c) => c.trim()) : [];
  const isFavorited = isInWishlist(product.id);

  const handleAddToCart = () => {
    addToCart(product, selectedSize, selectedColor, quantity);
  };

  const handleBuyNow = async () => {
    if (!product || product.stock === 0) return;
    const added = await addToCart(product, selectedSize, selectedColor, quantity, false);
    if (added !== false) {
      navigate('/checkout');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to write a review.', 'error');
      navigate(`/login?redirect=/product/${product.slug}`);
      return;
    }
    if (!reviewTitle.trim() || !reviewComment.trim()) {
      showToast('Please complete all review fields.', 'error');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await api.post('/reviews', {
        productId: product.id,
        rating: reviewRating,
        title: reviewTitle.trim(),
        comment: reviewComment.trim()
      });
      showToast('Review submitted successfully for publication!', 'success');
      setReviewTitle('');
      setReviewComment('');
      // Reload product to see review
      const res = await api.get(`/products/${slug}`);
      setProduct(res.data.product);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to submit review.', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const toggleAccordion = (section: string) => {
    setActiveAccordion(activeAccordion === section ? null : section);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 pb-32 sm:pb-36 lg:pb-16 space-y-12 sm:space-y-20">
      
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-widest">
        <Link to="/" className="hover:text-zinc-900">Home</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-zinc-900">Couture</Link>
        <span>/</span>
        <Link to={`/shop?category=${product.category?.slug}`} className="hover:text-zinc-900 capitalize">
          {product.category?.name}
        </Link>
        <span>/</span>
        <span className="text-zinc-900 font-bold truncate">{product.name}</span>
      </div>

      {/* Main Product Layout: Gallery on Left + Buy Box on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* LEFT: IMAGE GALLERY */}
        <div className="lg:col-span-7 flex flex-col-reverse md:flex-row gap-4">
          
          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto max-h-[620px] pb-2 md:pb-0 shrink-0">
              {product.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img.url)}
                  className={`w-18 h-24 md:w-20 md:h-28 rounded overflow-hidden border-2 transition-all shrink-0 ${
                    selectedImage === img.url
                      ? 'border-maroon-800 ring-1 ring-maroon-800'
                      : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt={product.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Main Display Image with Lightbox Zoom Trigger */}
          <div className="relative flex-1 aspect-[3/4] rounded-lg overflow-hidden bg-[#F6F2EB] shadow-md border border-[#EBE3D5] group">
            <img
              src={selectedImage || 'https://via.placeholder.com/800x1000'}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 cursor-zoom-in"
              onClick={() => setIsLightboxOpen(true)}
            />

            <button
              onClick={() => setIsLightboxOpen(true)}
              className="absolute bottom-4 right-4 p-2.5 bg-white/90 backdrop-blur-sm rounded-full text-zinc-800 shadow hover:bg-white transition-colors"
              title="View Fullscreen Lightbox"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* RIGHT: DETAILS & BUY BOX */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Title & SKU */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-gold-700">
                {product.fabric || product.category?.name}
              </span>
              <button
                onClick={() => toggleWishlist(product)}
                className="p-2 rounded-full hover:bg-zinc-100 text-zinc-700 transition-colors"
                title="Save to Wishlist"
              >
                <Heart
                  className={`w-5 h-5 ${
                    isFavorited ? 'fill-maroon-700 text-maroon-700' : 'text-zinc-600'
                  }`}
                />
              </button>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-zinc-900 mt-1">
              {product.name}
            </h1>
            <p className="text-xs text-zinc-500 mt-1">SKU: {product.sku}</p>
          </div>

          {/* Rating Stars & Count */}
          <div className="flex items-center gap-2 pt-1 border-b border-zinc-200 pb-4">
            <div className="flex text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(product.rating || 5)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-zinc-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-zinc-800">
              {product.rating} / 5.0
            </span>
            <span className="text-xs text-zinc-400">·</span>
            <a href="#reviews" className="text-xs text-[#84642C] hover:text-[#3E1A1E] underline font-medium">
              Read {product.reviewCount || 1} verified customer reviews
            </a>
            <span className="text-xs text-zinc-300">·</span>
            <button
              type="button"
              onClick={() => setIsReviewModalOpen(true)}
              className="text-xs text-[#3E1A1E] font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Star className="w-3.5 h-3.5 fill-[#C6A15D] text-[#C6A15D]" />
              <span>Write a Review</span>
            </button>
          </div>

          {/* Pricing Box */}
          <div className="flex items-baseline gap-4">
            <span className="font-serif text-3xl sm:text-4xl font-bold text-maroon-950">
              {formatPrice(product.price)}
            </span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span className="text-base text-zinc-400 line-through">
                {formatPrice(product.comparePrice)}
              </span>
            )}
            {product.discountPercent > 0 && (
              <span className="text-xs font-bold text-gold-900 bg-gold-100 px-2.5 py-1 rounded border border-gold-300">
                Save {product.discountPercent}%
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gold-700 bg-gold-50/70 p-2 rounded border border-gold-200">
            <Sparkles className="w-3.5 h-3.5 text-gold-600 animate-pulse" />
            <span className="font-medium">14 brides &amp; patrons are admiring this heirloom piece right now</span>
          </div>

          <p className="text-[11px] text-zinc-500 -mt-1">Inclusive of all taxes, GI-authenticity seal &amp; luxury velvet preservation box</p>

          {/* Low Stock Banner */}
          {product.stock <= 4 && product.stock > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded flex items-center gap-2 text-xs text-amber-900 font-semibold">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Only {product.stock} pieces remaining in this artisanal batch. Order promptly to secure.</span>
            </div>
          )}

          {/* Product Description */}
          <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-light">
            {product.description}
          </p>

          {/* Color Selector (if available) */}
          {colors.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-900 mb-2">
                Color Palette: <span className="font-normal text-zinc-600">{selectedColor}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {colors.map((col) => (
                  <button
                    key={col}
                    onClick={() => setSelectedColor(col)}
                    className={`px-3 py-1.5 text-xs rounded border transition-all ${
                      selectedColor === col
                        ? 'bg-zinc-900 text-white border-zinc-900 font-bold shadow-xs'
                        : 'bg-white text-zinc-800 border-zinc-300 hover:border-maroon-800'
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selector + Size Guide Modal Link */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                Select Size: <span className="font-normal text-zinc-600">{selectedSize}</span>
              </label>
              <button
                type="button"
                onClick={() => setIsSizeGuideOpen(true)}
                className="inline-flex items-center gap-1 text-xs text-maroon-800 font-bold hover:underline"
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>Size Guide</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  className={`min-w-12 h-11 px-4 text-xs font-bold rounded-lg border transition-all flex items-center justify-center ${
                    selectedSize === s
                      ? 'bg-[#3E1A1E] text-[#DFC89D] border-[#C6A15D] shadow-md'
                      : 'bg-white text-zinc-800 border-[#E8DEC8] hover:border-[#3E1A1E]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Bespoke Made-to-Measure Blouse / Kurta Option */}
          <div className="p-3.5 bg-gold-50/50 rounded-lg border border-gold-300 space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isBespokeOpen}
                onChange={(e) => setIsBespokeOpen(e.target.checked)}
                className="w-4 h-4 accent-maroon-800 rounded"
              />
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wide">
                Complimentary Bespoke Blouse / Made-to-Measure Fitting
              </span>
            </label>
            {isBespokeOpen && (
              <div className="pt-2 grid grid-cols-2 gap-2 text-xs animate-fade-in">
                <input
                  type="text"
                  placeholder="Bust (inches, e.g. 36)"
                  className="px-3 h-10 bg-white border border-gold-300 rounded-lg text-base sm:text-xs focus:outline-none focus:border-maroon-800"
                />
                <input
                  type="text"
                  placeholder="Waist (inches, e.g. 30)"
                  className="px-3 h-10 bg-white border border-gold-300 rounded-lg text-base sm:text-xs focus:outline-none focus:border-maroon-800"
                />
                <input
                  type="text"
                  placeholder="Blouse Length (e.g. 14.5)"
                  className="px-3 h-10 bg-white border border-gold-300 rounded-lg text-base sm:text-xs focus:outline-none focus:border-maroon-800"
                />
                <input
                  type="text"
                  placeholder="Neckline (e.g. Sweetheart)"
                  className="px-3 h-10 bg-white border border-gold-300 rounded-lg text-base sm:text-xs focus:outline-none focus:border-maroon-800"
                />
                <p className="col-span-2 text-[10px] text-zinc-500 italic">
                  * Our master karigars will contact you via WhatsApp for final sleeve &amp; neckline alignment.
                </p>
              </div>
            )}
          </div>

          {/* Pincode Delivery Estimator */}
          <div className="bg-white p-3.5 rounded-lg border border-[#C6A15D]/30 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 block">
                Estimated Delivery &amp; Express Dispatch
              </span>
              <span className="text-[10px] text-[#84642C] font-medium flex items-center gap-1">
                <Truck className="w-3 h-3 text-[#C6A15D]" /> Insured Courier
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                placeholder="Enter 6-digit Pincode (e.g. 110001)"
                value={pincode}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, '').substring(0, 6);
                  setPincode(clean);
                  if (clean.length === 6) {
                    checkPincodeAvailability(clean);
                  } else if (pincodeResult) {
                    setPincodeResult(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    checkPincodeAvailability();
                  }
                }}
                className="flex-1 px-3.5 h-11 text-base sm:text-xs border border-zinc-300 rounded-lg focus:outline-none focus:border-maroon-800 font-mono"
              />
              <button
                type="button"
                onClick={() => checkPincodeAvailability()}
                disabled={pincodeLoading || pincode.length !== 6}
                className="px-4 h-11 bg-[#3E1A1E] text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#2B0C10] disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
              >
                {pincodeLoading ? (
                  <>
                    <div className="w-3 h-3 rounded-full border-2 border-[#C6A15D] border-t-transparent animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  'Check'
                )}
              </button>
            </div>
            {pincodeResult && (
              pincodeResult.success ? (
                <div className="text-xs text-zinc-800 bg-gradient-to-r from-[#FAF7F2] to-amber-50/40 p-2.5 rounded border border-[#C6A15D]/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-[#3E1A1E]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Delivering to {pincodeResult.location}</span>
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Eligible
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-[#84642C] shrink-0" />
                    <span>Expected by <strong>{pincodeResult.estimatedDeliveryDate}</strong> ({pincodeResult.deliveryDays}) via {pincodeResult.carrier}</span>
                  </p>
                  <p className="text-[10px] text-zinc-500 font-medium">
                    ✓ Complimentary Insured Air Shipping &amp; COD Available
                  </p>
                </div>
              ) : (
                <p className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded border border-red-200 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{pincodeResult.message}</span>
                </p>
              )
            )}
          </div>

          {/* Quantity & Dual Action Buttons (Flipkart-Style Direct Checkout) */}
          <div className="space-y-4 pt-2">
            {/* Quantity Selector & Stock Status Row */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Quantity:</span>
                {product.stock <= 5 && product.stock > 0 && (
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    Only {product.stock} pieces left in atelier
                  </span>
                )}
                {product.stock > 5 && (
                  <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    In Stock • Ready to Dispatch
                  </span>
                )}
              </div>

              {/* Luxury Quantity Stepper */}
              <div className="inline-flex items-center border border-[#C6A15D]/50 rounded-lg bg-white overflow-hidden shadow-xs h-10">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-9 h-full flex items-center justify-center text-zinc-600 hover:text-[#3E1A1E] hover:bg-[#FAF7F2] font-bold text-base transition-colors cursor-pointer select-none"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="w-10 text-center text-xs font-bold text-zinc-900 font-mono select-none">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="w-9 h-full flex items-center justify-center text-zinc-600 hover:text-[#3E1A1E] hover:bg-[#FAF7F2] font-bold text-base transition-colors cursor-pointer select-none"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Dual Luxury Action Buttons (Add to Bag + Buy Now) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              {/* 1. ADD TO BAG BUTTON */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="w-full h-13 min-h-[52px] px-4 bg-white hover:bg-[#FAF7F2] active:bg-[#F5EFE6] disabled:bg-zinc-100 disabled:text-zinc-400 text-[#3E1A1E] text-xs sm:text-sm font-bold tracking-[0.14em] uppercase rounded-lg border-2 border-[#3E1A1E] shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
              >
                <ShoppingBag className="w-4 h-4 text-[#3E1A1E] transition-transform group-hover:scale-110 shrink-0" />
                <span>{product.stock === 0 ? 'Sold Out' : 'ADD TO BAG'}</span>
              </button>

              {/* 2. DIRECT BUY NOW BUTTON */}
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={product.stock === 0}
                className="w-full h-13 min-h-[52px] px-4 bg-gradient-to-r from-[#3E1A1E] via-[#4A1F24] to-[#3E1A1E] hover:from-[#2B0C10] hover:to-[#2B0C10] active:scale-[0.99] disabled:bg-zinc-300 disabled:text-zinc-500 text-[#DFC89D] hover:text-white text-xs sm:text-sm font-bold tracking-[0.14em] uppercase rounded-lg border border-[#C6A15D] shadow-md hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Zap className="w-4 h-4 text-[#C6A15D] fill-[#C6A15D] transition-transform group-hover:scale-110 shrink-0" />
                <span>BUY NOW</span>
              </button>
            </div>
          </div>

          {/* Trust Highlights */}
          <div className="p-4 bg-white rounded border border-[#C6A15D]/25 divide-y divide-zinc-100 text-xs text-zinc-600 space-y-3 pt-3">
            <div className="flex items-center gap-3">
              <Truck className="w-4 h-4 text-[#C6A15D] shrink-0" />
              <span>Complimentary insured express shipping on all domestic couture orders.</span>
            </div>
            <div className="flex items-center gap-3 pt-3">
              <ShieldCheck className="w-4 h-4 text-[#C6A15D] shrink-0" />
              <span>Silk Mark certified handlooms &amp; hallmarked bullion zari embroidery.</span>
            </div>
            <div className="flex items-center gap-3 pt-3">
              <RefreshCw className="w-4 h-4 text-[#C6A15D] shrink-0" />
              <span>Hassle-free 7-day pickup &amp; bespoke sizing alteration support.</span>
            </div>
          </div>

          {/* Accordions */}
          <div className="divide-y divide-zinc-200 border-y border-zinc-200 text-xs">
            
            {/* 1. Shipping Information */}
            <div>
              <button
                onClick={() => toggleAccordion('shipping')}
                className="w-full py-3.5 flex items-center justify-between font-serif text-sm font-semibold text-zinc-900 text-left uppercase tracking-wider"
              >
                <span>Shipping Information</span>
                {activeAccordion === 'shipping' ? <ChevronUp className="w-4 h-4 text-[#C6A15D]" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
              </button>
              {activeAccordion === 'shipping' && (
                <div className="pb-4 text-zinc-600 leading-relaxed space-y-1.5 font-light">
                  <p>Dispatched in 2-3 business days in our signature padded luxury velvet box with custom seal.</p>
                  <p>Estimated delivery within 4-6 business days across India. Insured international express air delivery available via DHL Express (5-8 business days).</p>
                </div>
              )}
            </div>

            {/* 2. Returns & Exchanges */}
            <div>
              <button
                onClick={() => toggleAccordion('returns')}
                className="w-full py-3.5 flex items-center justify-between font-serif text-sm font-semibold text-zinc-900 text-left uppercase tracking-wider"
              >
                <span>Returns & Exchanges</span>
                {activeAccordion === 'returns' ? <ChevronUp className="w-4 h-4 text-[#C6A15D]" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
              </button>
              {activeAccordion === 'returns' && (
                <div className="pb-4 text-zinc-600 leading-relaxed space-y-1.5 font-light">
                  <p>We offer a hassle-free 7-day pickup and size exchange policy for all ready-to-wear ensembles.</p>
                  <p>Bespoke custom-stitched garments undergo digital master-tailor approval prior to dispatch to ensure perfection.</p>
                </div>
              )}
            </div>

            {/* 3. Product Details */}
            <div>
              <button
                onClick={() => toggleAccordion('details')}
                className="w-full py-3.5 flex items-center justify-between font-serif text-sm font-semibold text-zinc-900 text-left uppercase tracking-wider"
              >
                <span>Product Details</span>
                {activeAccordion === 'details' ? <ChevronUp className="w-4 h-4 text-[#C6A15D]" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
              </button>
              {activeAccordion === 'details' && (
                <div className="pb-4 text-zinc-600 leading-relaxed space-y-2 font-light">
                  <p>{product.details || 'Handcrafted on traditional pit looms by heritage artisan families in Varanasi and Lucknow.'}</p>
                  <p><strong>Department:</strong> {product.gender === 'WOMEN' ? "Women's Couture" : "Royal Menswear"}</p>
                  {product.sku && <p><strong>Artisan Serial:</strong> {product.sku}</p>}
                </div>
              )}
            </div>

            {/* 4. Fabric & Weave */}
            <div>
              <button
                onClick={() => toggleAccordion('fabric')}
                className="w-full py-3.5 flex items-center justify-between font-serif text-sm font-semibold text-zinc-900 text-left uppercase tracking-wider"
              >
                <span>Fabric & Weave</span>
                {activeAccordion === 'fabric' ? <ChevronUp className="w-4 h-4 text-[#C6A15D]" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
              </button>
              {activeAccordion === 'fabric' && (
                <div className="pb-4 text-zinc-600 leading-relaxed space-y-2 font-light">
                  <p><strong>Primary Fabric:</strong> {product.fabric || 'Pure Handloom Silk'}</p>
                  <p>Certified 100% natural fibers with fine bullion metallic zari work. We never blend synthetic filaments into our ceremonial heirlooms.</p>
                </div>
              )}
            </div>

            {/* 5. Care Instructions */}
            <div>
              <button
                onClick={() => toggleAccordion('care')}
                className="w-full py-3.5 flex items-center justify-between font-serif text-sm font-semibold text-zinc-900 text-left uppercase tracking-wider"
              >
                <span>Care Instructions</span>
                {activeAccordion === 'care' ? <ChevronUp className="w-4 h-4 text-[#C6A15D]" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
              </button>
              {activeAccordion === 'care' && (
                <div className="pb-4 text-zinc-600 leading-relaxed font-light">
                  <p>{product.careInstructions || 'Dry clean only. Store wrapped in unbleached pure cotton or muslin fabric. Avoid spraying perfumes or chemicals directly on the gold zari embroidery.'}</p>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* REVIEWS SECTION */}
      <section id="reviews" className="pt-16 border-t border-zinc-200">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E8DEC8]">
            <div>
              <span className="text-xs font-bold tracking-[0.25em] text-[#84642C] uppercase block">
                Patron Testimonials
              </span>
              <h2 className="font-serif text-3xl font-bold text-zinc-900 mt-0.5">
                Customer Reviews
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsReviewModalOpen(true)}
              className="px-5 py-2.5 bg-[#3E1A1E] hover:bg-[#2B0C10] text-[#DFC89D] hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest border border-[#C6A15D] shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <Star className="w-3.5 h-3.5 fill-[#C6A15D] text-[#C6A15D]" />
              <span>Write a Review</span>
            </button>
          </div>

          {/* Rating Summary Box */}
          <div className="bg-white p-6 sm:p-8 rounded-lg border border-[#E8DEC8] grid grid-cols-1 md:grid-cols-2 gap-8 items-center shadow-xs">
            <div className="text-center md:text-left md:border-r md:border-zinc-200 md:pr-8">
              <span className="font-serif text-5xl font-bold text-maroon-900">
                {product.rating}
              </span>
              <span className="text-zinc-400 text-sm"> / 5.0</span>
              <div className="flex justify-center md:justify-start text-amber-500 my-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(product.rating || 5)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-zinc-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-zinc-500">Based on {product.reviewCount || 1} verified purchases</p>
            </div>

            {/* Distribution bars */}
            <div className="space-y-2 text-xs">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = product.ratingDistribution?.[stars] || (stars === 5 ? 1 : 0);
                const percent = product.reviewCount ? Math.round((count / product.reviewCount) * 100) : (stars === 5 ? 100 : 0);
                return (
                  <div key={stars} className="flex items-center gap-3">
                    <span className="w-12 text-zinc-600 font-medium">{stars} Stars</span>
                    <div className="flex-1 bg-zinc-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-gold-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="w-8 text-right text-zinc-400">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit Review Form */}
          <div className="bg-[#FAF7F2] p-6 rounded-lg border border-gold-300 shadow-xs">
            <h3 className="font-serif text-xl font-bold text-zinc-900 mb-2">
              Share Your Experience
            </h3>
            <p className="text-xs text-zinc-600 mb-4">
              Help fellow patrons with insights on drape, silk feel, and celebration styling.
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1">
                  Your Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="p-1 text-amber-500 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-zinc-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1">
                  Review Headline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stunning Banarasi weave, felt like royalty"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded text-xs focus:outline-none focus:border-maroon-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1">
                  Detailed Review
                </label>
                <textarea
                  rows={4}
                  placeholder="Share details regarding the fabric quality, embroidery finish, fitting, and occasion..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded text-xs focus:outline-none focus:border-maroon-800"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReview}
                className="px-6 py-2.5 bg-maroon-800 hover:bg-maroon-900 disabled:bg-zinc-400 text-white text-xs font-bold uppercase tracking-widest rounded shadow flex items-center gap-2"
              >
                <span>{isSubmittingReview ? 'Submitting...' : 'Submit Verified Review'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* List of Customer Reviews */}
          <div className="space-y-4">
            {product.reviews && product.reviews.length > 0 ? (
              product.reviews.map((rev) => {
                const fitMatch = rev.comment.match(/\[Fit:\s*([^|]+)\s*\|\s*Occasion:\s*([^\]]+)\]/);
                const cleanComment = fitMatch ? rev.comment.replace(/\[Fit:[^\]]+\]\s*/, '') : rev.comment;

                return (
                  <div
                    key={rev.id}
                    className="bg-white p-6 rounded-xl border border-[#E8DEC8] shadow-xs space-y-2.5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex text-amber-500">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-[#C6A15D] text-[#C6A15D]" />
                        ))}
                      </div>
                      <span className="text-[11px] text-zinc-400">
                        {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    <h4 className="font-serif text-base font-bold text-zinc-900">{rev.title}</h4>
                    
                    {fitMatch && (
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-semibold border border-zinc-200">
                          Fit: {fitMatch[1].trim()}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#84642C] text-[10px] font-semibold border border-[#C6A15D]/40">
                          Occasion: {fitMatch[2].trim()}
                        </span>
                      </div>
                    )}

                    <p className="text-xs text-zinc-700 leading-relaxed font-light whitespace-pre-line">{cleanComment}</p>

                    <div className="flex items-center gap-2 pt-2 text-[11px] text-zinc-500 font-medium border-t border-zinc-100 mt-2">
                      <span>By {rev.user?.name || 'Verified Patron'}</span>
                      {rev.isVerifiedPurchase && (
                        <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-emerald-200/60">
                          ✓ Verified Purchase
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 bg-white rounded-xl border border-[#E8DEC8] p-6 space-y-3">
                <Star className="w-8 h-8 text-[#C6A15D] mx-auto opacity-60" />
                <p className="font-serif text-base font-bold text-zinc-800">Be the First to Review This Masterpiece</p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Share your impressions on the silk drape, bullion zari craftsmanship, and celebration styling.
                </p>
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(true)}
                  className="inline-block px-5 py-2 bg-[#3E1A1E] text-[#DFC89D] rounded-lg text-xs font-bold uppercase tracking-widest border border-[#C6A15D]/60 hover:bg-[#2B0C10] transition-colors"
                >
                  Write First Review
                </button>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* Review Modal */}
      {isReviewModalOpen && (
        <WriteReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          productId={product.id}
          productName={product.name}
          productImage={product.images?.[0]?.url}
          onReviewSubmitted={async () => {
            try {
              const res = await api.get(`/products/${slug}`);
              setProduct(res.data.product);
            } catch (err) {
              console.error('Failed to reload product reviews', err);
            }
          }}
        />
      )}

      {/* RELATED PRODUCTS */}
      {relatedProducts.length > 0 && (
        <section className="pt-16 border-t border-zinc-200">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-[0.25em] text-gold-700 uppercase">
              Complementary Masterpieces
            </span>
            <h2 className="font-serif text-3xl font-bold text-zinc-900 mt-1">
              You May Also Admire
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((relProd) => (
              <ProductCard key={relProd.id} product={relProd} />
            ))}
          </div>
        </section>
      )}

      {/* Sizing Modal */}
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        gender={product.gender}
      />

      {/* Lightbox Fullscreen Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-6 right-6 p-3 text-white/80 hover:text-white rounded-full bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedImage}
            alt={product.name}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded shadow-2xl"
          />
        </div>
      )}

      {/* Flipkart-Style Mobile/Tablet Sticky Bottom Action Bar with Safe Area */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#C6A15D]/40 p-2.5 sm:p-3 lg:hidden shadow-[0_-4px_25px_rgba(0,0,0,0.12)] flex items-center gap-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
      >
        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          className="w-12 h-12 flex flex-col items-center justify-center rounded-lg border border-[#E8DEC8] bg-[#FAF7F2] text-zinc-700 active:scale-95 transition-transform shrink-0"
          title="Save to Wardrobe"
          aria-label="Save to Wardrobe"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isInWishlist(product.id) ? 'fill-[#3E1A1E] text-[#3E1A1E]' : 'text-zinc-600'
            }`}
          />
          <span className="text-[9px] font-bold mt-0.5 text-zinc-600">Wishlist</span>
        </button>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="flex-1 h-12 bg-white hover:bg-[#FAF7F2] active:bg-[#F5EFE6] text-[#3E1A1E] border-2 border-[#3E1A1E] text-xs font-bold tracking-wider uppercase rounded-lg flex items-center justify-center gap-1.5 active:scale-98 transition-transform disabled:opacity-50"
          aria-label="Add to Bag"
        >
          <ShoppingBag className="w-4 h-4 text-[#3E1A1E]" />
          <span>Add to Bag</span>
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={product.stock === 0}
          className="flex-1 h-12 bg-gradient-to-r from-[#3E1A1E] via-[#4A1F24] to-[#3E1A1E] hover:from-[#2B0C10] hover:to-[#2B0C10] text-[#DFC89D] border border-[#C6A15D] text-xs font-bold tracking-wider uppercase rounded-lg flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-transform disabled:opacity-50"
          aria-label="Buy Now • Direct Checkout"
        >
          <Zap className="w-4 h-4 text-[#C6A15D] fill-[#C6A15D]" />
          <span>Buy Now</span>
        </button>
      </div>

    </div>
  );
};
