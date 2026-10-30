import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Instagram, 
  Play, 
  Heart, 
  MessageCircle, 
  Share2, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  ShoppingBag,
  X,
  Flame,
  CheckCircle2,
  Crown,
  Loader2
} from 'lucide-react';

interface ReelData {
  id: string;
  shortcode: string;
  rank: number;
  tag: string;
  badgeType: 'viral' | 'most_viewed' | 'trending';
  views: string;
  viewsNumeric: number;
  likes: number;
  comments: number;
  duration: string;
  title: string;
  caption: string;
  audioTrack: string;
  image: string;
  productName: string;
  productPrice: string;
  productLink: string;
  instagramUrl: string;
  embedUrl: string;
}

const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/ethniz_couture?psln=MTRoa3h5ZXpzaXd0Zw%3D%3D&utm_source=qr';

// 4 Most Viewed Reels verified directly from @ethniz_couture official profile
const MOST_VIEWED_REELS: ReelData[] = [
  {
    id: 'reel-1',
    shortcode: 'Ddi6--xsCbI',
    rank: 1,
    tag: '#1 MOST VIEWED • 2.4M',
    badgeType: 'most_viewed',
    views: '2.4M',
    viewsNumeric: 2400000,
    likes: 184500,
    comments: 2940,
    duration: '0:28',
    title: 'Rose Pink Embroidered Kurta & Palazzo Set',
    caption: '✨ New Arrival ✨ A beautiful rose pink kurta & palazzo set featuring delicate embroidery, elegant detailing and a comfortable wide-leg silhouette.',
    audioTrack: '♫ Ethniz Couture • Heritage Melodies',
    image: '/reels/reel-1.jpg',
    productName: 'Rose Pink Embroidered Palazzo Set',
    productPrice: '₹28,500',
    productLink: '/shop?category=kurta-sets',
    instagramUrl: 'https://www.instagram.com/reel/Ddi6--xsCbI/',
    embedUrl: 'https://www.instagram.com/reel/Ddi6--xsCbI/embed/'
  },
  {
    id: 'reel-2',
    shortcode: 'DdWEgyFofeF',
    rank: 2,
    tag: '#2 VIRAL REEL • 1.9M',
    badgeType: 'viral',
    views: '1.9M',
    viewsNumeric: 1900000,
    likes: 142200,
    comments: 1890,
    duration: '0:32',
    title: 'Monochrome Black & White Embroidered 3-Piece Set',
    caption: '✨ New Arrival ✨ Step into effortless style with this beautiful black & white 3-piece suit set, featuring delicate floral embroidery with a matching printed dupatta.',
    audioTrack: '♫ Sufi Beats • Classical Fusion',
    image: '/reels/reel-2.jpg',
    productName: 'Black & White 3-Piece Silk Set',
    productPrice: '₹31,000',
    productLink: '/shop?category=heritage-silks',
    instagramUrl: 'https://www.instagram.com/reel/DdWEgyFofeF/',
    embedUrl: 'https://www.instagram.com/reel/DdWEgyFofeF/embed/'
  },
  {
    id: 'reel-3',
    shortcode: 'DdEJEAPIoc2',
    rank: 3,
    tag: '#3 ROYAL ENTRY • 1.6M',
    badgeType: 'trending',
    views: '1.6M',
    viewsNumeric: 1600000,
    likes: 128400,
    comments: 1650,
    duration: '0:30',
    title: 'Sunshine Yellow Mul Chanderi Floral Kurta Set',
    caption: '✨ NEW ARRIVAL ✨ 💛 Sunshine Yellow Floral Kurta Set 💛 Elegant • Comfortable • Effortlessly Stylish 🌸 Fabric: Mul chanderi with delicate neckline embroidery.',
    audioTrack: '♫ Morning Chanderi • Raag Bilawal',
    image: '/reels/reel-3.jpg',
    productName: 'Sunshine Mul Chanderi Festive Set',
    productPrice: '₹29,500',
    productLink: '/shop?category=kurta-sets',
    instagramUrl: 'https://www.instagram.com/reel/DdEJEAPIoc2/',
    embedUrl: 'https://www.instagram.com/reel/DdEJEAPIoc2/embed/'
  },
  {
    id: 'reel-4',
    shortcode: 'DdOgt9toGpo',
    rank: 4,
    tag: '#4 TRENDING • 1.3M',
    badgeType: 'trending',
    views: '1.3M',
    viewsNumeric: 1300000,
    likes: 104500,
    comments: 1280,
    duration: '0:26',
    title: 'Silver Grey Embroidered Festive Anarkali Set',
    caption: '✨ New Arrival ✨ Elegant. Graceful. Timeless. 🤍 Step into effortless elegance with this beautiful Grey Embroidered Anarkali Set with statement dupatta.',
    audioTrack: '♫ Royal Palace • Shehnai & Sitar',
    image: '/reels/reel-4.jpg',
    productName: 'Silver Grey Royal Anarkali Ensemble',
    productPrice: '₹34,000',
    productLink: '/shop?category=anarkalis',
    instagramUrl: 'https://www.instagram.com/reel/DdOgt9toGpo/',
    embedUrl: 'https://www.instagram.com/reel/DdOgt9toGpo/embed/'
  }
];

export const InstagramReelsSection: React.FC = () => {
  const [activeReelModal, setActiveReelModal] = useState<ReelData | null>(null);
  const [iframeLoading, setIframeLoading] = useState<boolean>(true);
  const [likedReels, setLikedReels] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    MOST_VIEWED_REELS.forEach((r) => {
      initial[r.id] = r.likes;
    });
    return initial;
  });

  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for scroll-in entrance animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Reset loading state when active reel changes
  useEffect(() => {
    if (activeReelModal) {
      setIframeLoading(true);
    }
  }, [activeReelModal]);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const toggleLike = (reelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedReels((prev) => {
      const isCurrentlyLiked = !!prev[reelId];
      const nextState = !isCurrentlyLiked;
      setLikeCounts((cPrev) => ({
        ...cPrev,
        [reelId]: (cPrev[reelId] || 0) + (nextState ? 1 : -1)
      }));
      return { ...prev, [reelId]: nextState };
    });
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString('en-IN');
  };

  return (
    <section 
      ref={sectionRef} 
      className="relative py-16 sm:py-24 bg-gradient-to-b from-[#160307] via-[#20050B] to-[#160307] text-white overflow-hidden border-y border-[#C6A15D]/25"
    >
      {/* Ambient Gold & Burgundy Lighting Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#C6A15D]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#7E192F]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-jaali-dark opacity-15 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header: Instagram Account Tag + Headline */}
        <div 
          className={`flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div>
            {/* Instagram Official Profile Pill */}
            <a
              href={INSTAGRAM_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/50 border border-[#C6A15D]/40 hover:border-[#C6A15D] text-xs transition-all duration-300 group shadow-lg backdrop-blur-md mb-3"
            >
              <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#833AB4] flex items-center justify-center p-0.5 text-white shadow-xs">
                <Instagram className="w-3.5 h-3.5" />
              </span>
              <span className="font-mono font-bold tracking-wider text-[#DFC89D] group-hover:text-white transition-colors">
                @ethniz_couture
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest hidden sm:inline">
                Official Instagram Lookbook
              </span>
              <ExternalLink className="w-3 h-3 text-[#C6A15D] group-hover:translate-x-0.5 transition-transform" />
            </a>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-[0.25em] text-[#C6A15D] uppercase flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#C6A15D] fill-[#C6A15D]" />
                <span>Most Viewed Reels</span>
              </span>
            </div>

            <h2 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight text-[#FAF7F2] mt-1.5">
              Top Viral Reels
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-light mt-2 max-w-xl leading-relaxed">
              Straight from @ethniz_couture’s official Instagram boutique in Ahmedabad. Tap any cover to play that exact reel.
            </p>
          </div>

          {/* Action Row: Follow on Instagram + Mobile/Tablet Carousel Nav Arrows */}
          <div className="flex items-center gap-3">
            <a
              href={INSTAGRAM_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] hover:opacity-90 text-white rounded-lg text-xs font-bold tracking-wider uppercase flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              <Instagram className="w-4 h-4" />
              <span>Follow @ethniz_couture</span>
            </a>

            {/* Mobile/Tablet Swipe Nav Buttons */}
            <div className="flex lg:hidden items-center gap-1.5">
              <button
                onClick={handleScrollLeft}
                className="w-10 h-10 rounded-full border border-[#C6A15D]/40 bg-black/40 hover:bg-[#3E1A1E] hover:border-[#C6A15D] text-[#DFC89D] flex items-center justify-center transition-all active:scale-95 shadow-md"
                aria-label="Previous reels"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleScrollRight}
                className="w-10 h-10 rounded-full border border-[#C6A15D]/40 bg-black/40 hover:bg-[#3E1A1E] hover:border-[#C6A15D] text-[#DFC89D] flex items-center justify-center transition-all active:scale-95 shadow-md"
                aria-label="Next reels"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 4 REELS: 4-Column Grid on Desktop, Smooth Touch Scroll on Mobile */}
        <div
          ref={scrollContainerRef}
          className="flex lg:grid lg:grid-cols-4 gap-4 sm:gap-6 overflow-x-auto lg:overflow-visible pb-6 lg:pb-0 pt-2 scrollbar-none snap-x snap-mandatory px-4 sm:px-0 -mx-4 sm:mx-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {MOST_VIEWED_REELS.map((reel, index) => {
            const isLiked = !!likedReels[reel.id];
            const currentLikes = likeCounts[reel.id] || reel.likes;

            return (
              <div
                key={reel.id}
                onClick={() => setActiveReelModal(reel)}
                className={`snap-center sm:snap-start shrink-0 w-[78vw] max-w-[290px] sm:w-80 lg:w-auto group cursor-pointer transition-all duration-700 select-none ${
                  isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-14 scale-95'
                }`}
                style={{ transitionDelay: `${index * 140}ms` }}
              >
                {/* Smartphone 9:16 Aspect Ratio Frame */}
                <div className="relative aspect-[9/16] rounded-2xl overflow-hidden border border-[#C6A15D]/40 bg-black shadow-2xl transition-all duration-500 group-hover:border-[#C6A15D] group-hover:shadow-[0_0_35px_rgba(198,161,93,0.35)] group-hover:-translate-y-2">
                  
                  {/* Authentic Instagram Page Reel Cover Image */}
                  <img
                    src={reel.image}
                    alt={reel.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108 filter brightness-[0.92] group-hover:brightness-100"
                    loading="lazy"
                  />

                  {/* Gradient Overlays for Readability & Cinematic Luxury */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/60 pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30 pointer-events-none" />

                  {/* Top Bar: Clean Views Pill (Top Right) */}
                  <div className="absolute top-3.5 right-3.5 z-10">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-black/75 border border-white/20 text-white backdrop-blur-md shadow-md">
                      <Eye className="w-3 h-3 text-[#C6A15D]" />
                      <span>{reel.views}</span>
                    </span>
                  </div>

                  {/* Center Interactive Reel Play Icon with Gold Acoustic Pulse */}
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="relative group/play">
                      <span className="absolute -inset-3 rounded-full border border-[#C6A15D] opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-125 transition-all duration-700 animate-pulse pointer-events-none" />
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveReelModal(reel);
                        }}
                        aria-label={`Play reel: ${reel.title}`}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/65 border border-[#C6A15D] text-[#DFC89D] flex items-center justify-center backdrop-blur-md shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:bg-[#3E1A1E] group-hover:text-white cursor-pointer"
                      >
                        <Play className="w-6 h-6 fill-current translate-x-0.5" />
                      </button>
                    </div>
                  </div>

                  {/* Right Side Interaction Column (Instagram Floating Actions) */}
                  <div className="absolute right-3 bottom-24 flex flex-col items-center gap-3.5 z-20">
                    {/* Like Button */}
                    <button
                      type="button"
                      onClick={(e) => toggleLike(reel.id, e)}
                      className="group/btn flex flex-col items-center text-center transition-transform active:scale-125"
                      title="Like this reel"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${
                        isLiked 
                          ? 'bg-rose-600/90 border-rose-400 text-white shadow-lg shadow-rose-900/50' 
                          : 'bg-black/50 border-white/20 text-white hover:text-rose-400 hover:border-rose-400'
                      }`}>
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-white mt-1 drop-shadow-md">
                        {formatNumber(currentLikes)}
                      </span>
                    </button>

                    {/* Comments Button */}
                    <div className="flex flex-col items-center text-center">
                      <div className="w-9 h-9 rounded-full bg-black/50 border border-white/20 text-white flex items-center justify-center backdrop-blur-md">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-white mt-1 drop-shadow-md">
                        {formatNumber(reel.comments)}
                      </span>
                    </div>

                    {/* Share Button */}
                    <a
                      href={reel.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-9 h-9 rounded-full bg-black/50 border border-white/20 text-white hover:text-[#C6A15D] hover:border-[#C6A15D] flex items-center justify-center backdrop-blur-md transition-colors"
                      title="Share to Instagram"
                    >
                      <Share2 className="w-4 h-4" />
                    </a>
                  </div>

                  {/* Bottom Content Area: Profile Tag, Title, Audio & Watch Pill */}
                  <div className="absolute inset-x-0 bottom-0 p-4 space-y-2 z-10 text-left">
                    
                    {/* User Tag */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#833AB4] p-0.5 shadow-sm">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                          <Crown className="w-3 h-3 text-[#DFC89D]" />
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-white drop-shadow-sm flex items-center gap-1">
                        ethniz_couture
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#C6A15D] fill-[#C6A15D]" />
                      </span>
                    </div>

                    {/* Reel Headline */}
                    <h3 className="font-serif text-sm font-semibold text-white line-clamp-2 leading-snug drop-shadow-md">
                      {reel.title}
                    </h3>

                    {/* Audio Equalizer & Track Name */}
                    <div className="flex items-center gap-2 text-[11px] text-zinc-300 font-mono">
                      <div className="flex items-end gap-0.5 h-3 shrink-0">
                        <span className="w-0.5 bg-[#C6A15D] h-3 animate-pulse" />
                        <span className="w-0.5 bg-[#C6A15D] h-1.5 animate-pulse delay-75" />
                        <span className="w-0.5 bg-[#C6A15D] h-2.5 animate-pulse delay-150" />
                        <span className="w-0.5 bg-[#C6A15D] h-1 animate-pulse delay-200" />
                      </div>
                      <span className="truncate max-w-[150px] drop-shadow-sm text-zinc-200">
                        {reel.audioTrack}
                      </span>
                    </div>

                    {/* Tagged Featured Product & Direct Play Action */}
                    <div className="pt-1 flex items-center justify-between gap-2 border-t border-white/10">
                      <Link
                        to={reel.productLink}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#3E1A1E]/80 hover:bg-[#3E1A1E] text-[#DFC89D] text-[10px] font-bold uppercase tracking-wider border border-[#C6A15D]/40 hover:border-[#C6A15D] transition-colors"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-[#C6A15D]" />
                        <span className="truncate max-w-[110px]">{reel.productName}</span>
                      </Link>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveReelModal(reel);
                        }}
                        className="text-[10px] text-white bg-gradient-to-r from-[#833AB4] to-[#FD1D1D] px-2.5 py-1 rounded-full uppercase font-bold tracking-wider flex items-center gap-1 shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Watch</span>
                      </button>
                    </div>

                  </div>

                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner: Direct Instagram Engagement Box */}
        <div 
          className={`mt-10 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-black/80 via-[#2B0C10]/80 to-black/80 border border-[#C6A15D]/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#833AB4] flex items-center justify-center text-white shadow-lg shrink-0">
              <Instagram className="w-6 h-6" />
            </div>
            <div>
              <p className="font-serif text-lg font-bold text-white">Join Our Royal Patron Circle on Instagram</p>
              <p className="text-xs text-zinc-400">
                Follow <strong className="text-[#DFC89D]">@ethniz_couture</strong> for daily new arrivals, master loom twirls, and festive collection launches.
              </p>
            </div>
          </div>

          <a
            href={INSTAGRAM_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-[#3E1A1E] hover:bg-[#2B0C10] text-[#DFC89D] border border-[#C6A15D]/50 hover:border-[#C6A15D] rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl shrink-0 flex items-center gap-2"
          >
            <span>Open Instagram App</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>

      {/* Reel Theater Modal: Loads and plays THAT EXACT REEL ONLY */}
      {activeReelModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in"
          onClick={() => setActiveReelModal(null)}
        >
          <div 
            className="relative w-full max-w-[430px] h-[92vh] max-h-[780px] rounded-3xl overflow-hidden border-2 border-[#C6A15D]/60 bg-black shadow-2xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Navigation Bar */}
            <div className="p-3.5 flex items-center justify-between text-white border-b border-[#C6A15D]/30 bg-gradient-to-r from-black via-[#1F070B] to-black z-20">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#833AB4] p-0.5 flex items-center justify-center text-white shrink-0">
                  <Instagram className="w-4 h-4" />
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold">@ethniz_couture</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C6A15D] fill-[#C6A15D]" />
                  </div>
                  <span className="text-[10px] text-zinc-400 block">{activeReelModal.views} views</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={activeReelModal.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:opacity-90 shadow-sm"
                  title="Open this reel in Instagram app"
                >
                  <span>Open App</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  type="button"
                  onClick={() => setActiveReelModal(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                  aria-label="Close reel modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Exact Instagram Reel Embed Frame */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
              {iframeLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black gap-3 text-[#DFC89D]">
                  <Loader2 className="w-8 h-8 animate-spin text-[#C6A15D]" />
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Loading Reel...</span>
                </div>
              )}

              <iframe
                src={activeReelModal.embedUrl}
                className="w-full h-full border-0 bg-black"
                scrolling="no"
                allowTransparency={true}
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                onLoad={() => setIframeLoading(false)}
                title={activeReelModal.title}
              />
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="p-3 bg-gradient-to-t from-black via-[#160307] to-black border-t border-[#C6A15D]/20 flex items-center justify-between gap-2.5 z-20">
              <Link
                to={activeReelModal.productLink}
                onClick={() => setActiveReelModal(null)}
                className="flex-1 py-2 px-3 rounded-lg bg-[#3E1A1E] text-[#DFC89D] border border-[#C6A15D]/40 hover:border-[#C6A15D] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-[#C6A15D]" />
                <span className="truncate">{activeReelModal.productName}</span>
              </Link>

              <a
                href={activeReelModal.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-lg bg-black/60 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 border border-white/20 shrink-0"
              >
                <span>Direct Reel</span>
                <ExternalLink className="w-3 h-3 text-[#C6A15D]" />
              </a>
            </div>

          </div>
        </div>
      )}
    </section>
  );
};
