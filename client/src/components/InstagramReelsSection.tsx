import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Instagram, 
  Play, 
  Heart, 
  Share2, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  ShoppingBag,
  X,
  Sparkles,
  CheckCircle2,
  Crown,
  Loader2,
  Maximize2
} from 'lucide-react';

interface ReelData {
  id: string;
  shortcode: string;
  rank: number;
  collectionTag: string;
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

// 4 Verified Reels from official @ethniz_couture boutique feed in Ahmedabad
const VERIFIED_REELS: ReelData[] = [
  {
    id: 'reel-1',
    shortcode: 'Ddi6--xsCbI',
    rank: 1,
    collectionTag: 'NEW ARRIVAL',
    title: 'Rose Pink Embroidered Kurta & Palazzo Set',
    caption: 'A graceful rose pink kurta & palazzo set featuring delicate neckline embroidery, fine zari accents, and a comfortable wide-leg silhouette crafted for festive occasions.',
    audioTrack: '♫ Heritage Rhythms • Ahmedabad Atelier',
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
    collectionTag: 'CEREMONIAL SILK',
    title: 'Monochrome Black & White Embroidered 3-Piece Set',
    caption: 'Step into effortless style with this beautiful black & white 3-piece suit set, featuring delicate floral embroidery paired with a matching printed dupatta.',
    audioTrack: '♫ Sufi Melodies • Darbari Strings',
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
    collectionTag: 'MUL CHANDERI',
    title: 'Sunshine Yellow Mul Chanderi Floral Kurta Set',
    caption: 'Sunshine yellow festive floral set in authentic mul chanderi with delicate hand-stitched neck detailing and matching dupatta for daytime festivities.',
    audioTrack: '♫ Morning Raag • Folk Acoustic',
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
    collectionTag: 'ROYAL ANARKALI',
    title: 'Silver Grey Embroidered Festive Anarkali Set',
    caption: 'Timeless grace meets regal flair in this silver grey flared Anarkali ensemble with fine embroidery and statement border work for celebratory evenings.',
    audioTrack: '♫ Royal Shehnai • Palace Recital',
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

  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for elegant entrance animation
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

  // Reset loading state on active reel change
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
    setLikedReels((prev) => ({ ...prev, [reelId]: !prev[reelId] }));
  };

  const handleShare = async (reel: ReelData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${reel.title} | Ethniz Couture`,
          text: reel.caption,
          url: reel.instagramUrl
        });
      } catch {
        // User cancelled or unsupported
      }
    } else {
      window.open(reel.instagramUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <section 
      ref={sectionRef} 
      className="relative py-16 sm:py-24 bg-gradient-to-b from-[#140306] via-[#1F070B] to-[#140306] text-white overflow-hidden border-y border-[#C6A15D]/25"
    >
      {/* Ambient Lighting & Luxury Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#C6A15D]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#7E192F]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-jaali-dark opacity-15 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header: Verified Handle + Title */}
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
              className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/60 border border-[#C6A15D]/40 hover:border-[#C6A15D] text-xs transition-all duration-300 group shadow-lg backdrop-blur-md mb-3"
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
                <Sparkles className="w-3.5 h-3.5 text-[#C6A15D]" />
                <span>Curated Reel Showcase</span>
              </span>
            </div>

            <h2 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight text-[#FAF7F2] mt-1.5">
              Reels from Our Atelier
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-light mt-2 max-w-xl leading-relaxed">
              Explore authentic celebratory ensembles straight from our Ahmedabad flagship. Tap any reel to play directly on site, or open it inside Instagram.
            </p>
          </div>

          {/* Action Row: Follow on Instagram + Carousel Nav Arrows */}
          <div className="flex items-center gap-3">
            <a
              href={INSTAGRAM_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] hover:opacity-95 text-white rounded-lg text-xs font-bold tracking-wider uppercase flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all"
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

        {/* 4 REELS: Clean 4-Column Grid on Desktop, Smooth Touch Scroll on Mobile */}
        <div
          ref={scrollContainerRef}
          className="flex lg:grid lg:grid-cols-4 gap-4 sm:gap-6 overflow-x-auto lg:overflow-visible pb-6 lg:pb-0 pt-2 scrollbar-none snap-x snap-mandatory px-4 sm:px-0 -mx-4 sm:mx-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {VERIFIED_REELS.map((reel, index) => {
            const isLiked = !!likedReels[reel.id];

            return (
              <div
                key={reel.id}
                onClick={() => setActiveReelModal(reel)}
                className={`snap-center sm:snap-start shrink-0 w-[80vw] max-w-[295px] sm:w-80 lg:w-auto group cursor-pointer transition-all duration-700 select-none ${
                  isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-14 scale-95'
                }`}
                style={{ transitionDelay: `${index * 130}ms` }}
              >
                {/* Smartphone 9:16 Aspect Ratio Frame */}
                <div className="relative aspect-[9/16] rounded-2xl overflow-hidden border border-[#C6A15D]/40 bg-black shadow-2xl transition-all duration-500 group-hover:border-[#C6A15D] group-hover:shadow-[0_0_35px_rgba(198,161,93,0.4)] group-hover:-translate-y-2">
                  
                  {/* Authentic Reel Editorial Cover Image */}
                  <img
                    src={reel.image}
                    alt={reel.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108 filter brightness-[0.94] group-hover:brightness-105"
                    loading="lazy"
                  />

                  {/* Gradient Overlays for Readability & Cinematic Luxury */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/60 pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-black/25 pointer-events-none" />

                  {/* Top Bar: Clean Editorial Tag (No dummy views) */}
                  <div className="absolute top-3.5 right-3.5 z-10">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest bg-black/75 border border-[#C6A15D]/50 text-[#DFC89D] backdrop-blur-md shadow-md uppercase">
                      {reel.collectionTag}
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
                        aria-label={`Play ${reel.title} on website`}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/70 border-2 border-[#C6A15D] text-[#DFC89D] flex items-center justify-center backdrop-blur-md shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:bg-[#3E1A1E] group-hover:text-white cursor-pointer"
                      >
                        <Play className="w-6 h-6 fill-current translate-x-0.5" />
                      </button>
                    </div>
                  </div>

                  {/* Right Side Social Floating Actions */}
                  <div className="absolute right-3 bottom-28 flex flex-col items-center gap-3 z-20">
                    {/* Like Heart */}
                    <button
                      type="button"
                      onClick={(e) => toggleLike(reel.id, e)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md border transition-all active:scale-125 ${
                        isLiked 
                          ? 'bg-rose-600/90 border-rose-400 text-white shadow-lg shadow-rose-900/50' 
                          : 'bg-black/55 border-white/20 text-white hover:text-rose-400 hover:border-rose-400'
                      }`}
                      title="Save to favorites"
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    </button>

                    {/* Share / Open on Instagram */}
                    <button
                      type="button"
                      onClick={(e) => handleShare(reel, e)}
                      className="w-9 h-9 rounded-full bg-black/55 border border-white/20 text-white hover:text-[#C6A15D] hover:border-[#C6A15D] flex items-center justify-center backdrop-blur-md transition-colors active:scale-110"
                      title="Share reel or open on Instagram"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bottom Content Area: Profile Tag, Title, & Dual Play Actions */}
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
                      <span className="truncate max-w-[170px] drop-shadow-sm text-zinc-300">
                        {reel.audioTrack}
                      </span>
                    </div>

                    {/* Dual Action Buttons: Play Reel on Website + Watch on Instagram */}
                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/10">
                      {/* Button 1: Play Reel on Website */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveReelModal(reel);
                        }}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#3E1A1E] hover:bg-[#522127] text-[#DFC89D] text-[11px] font-bold uppercase tracking-wider border border-[#C6A15D]/40 hover:border-[#C6A15D] flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Play Video</span>
                      </button>

                      {/* Button 2: Watch on Instagram */}
                      <a
                        href={reel.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] hover:opacity-95 text-white text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 shrink-0"
                        title="Watch directly on Instagram app"
                      >
                        <Instagram className="w-3.5 h-3.5" />
                        <span>Insta ↗</span>
                      </a>
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

      {/* Reel Theater Modal: High-Performance In-Site Video Player + Direct Instagram Option */}
      {activeReelModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/92 backdrop-blur-lg flex items-center justify-center p-3 sm:p-5 animate-fade-in"
          onClick={() => setActiveReelModal(null)}
        >
          <div 
            className="relative w-full max-w-[430px] rounded-3xl overflow-hidden border-2 border-[#C6A15D]/70 bg-[#120205] shadow-[0_0_50px_rgba(198,161,93,0.35)] flex flex-col justify-between"
            style={{ maxHeight: '92vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Navigation Bar */}
            <div className="p-3.5 flex items-center justify-between text-white border-b border-[#C6A15D]/30 bg-gradient-to-r from-black via-[#1F070B] to-black z-20">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#833AB4] p-0.5 flex items-center justify-center text-white shrink-0 shadow-sm">
                  <Instagram className="w-4 h-4" />
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold">@ethniz_couture</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C6A15D] fill-[#C6A15D]" />
                  </div>
                  <span className="text-[10px] text-[#DFC89D] block uppercase font-mono tracking-wider">
                    {activeReelModal.collectionTag}
                  </span>
                </div>
              </div>

              {/* Direct Instagram App Option in Header */}
              <div className="flex items-center gap-2">
                <a
                  href={activeReelModal.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:opacity-95 shadow-md active:scale-95 transition-all"
                  title="Watch this exact reel on Instagram"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span>Watch on Insta</span>
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

            {/* Reel Video Player Viewport */}
            <div className="relative w-full aspect-[9/16] bg-black flex items-center justify-center overflow-hidden">
              {iframeLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/95 gap-3 text-[#DFC89D]">
                  <Loader2 className="w-8 h-8 animate-spin text-[#C6A15D]" />
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Loading Video...</span>
                </div>
              )}

              {/* Exact Instagram Reel Player Frame */}
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
            <div className="p-3.5 bg-gradient-to-t from-black via-[#160307] to-black border-t border-[#C6A15D]/25 flex items-center justify-between gap-2.5 z-20">
              <Link
                to={activeReelModal.productLink}
                onClick={() => setActiveReelModal(null)}
                className="flex-1 py-2.5 px-3 rounded-lg bg-[#3E1A1E] text-[#DFC89D] border border-[#C6A15D]/40 hover:border-[#C6A15D] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-[#C6A15D]" />
                <span className="truncate">{activeReelModal.productName}</span>
              </Link>

              <a
                href={activeReelModal.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:opacity-95 transition-all shrink-0 active:scale-95"
              >
                <span>Insta View</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>
        </div>
      )}
    </section>
  );
};
