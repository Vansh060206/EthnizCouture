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
  Volume2,
  VolumeX,
  Pause
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
  videoSrc: string;
  productName: string;
  productPrice: string;
  productLink: string;
  instagramUrl: string;
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
    videoSrc: '/reels/reel-1.mp4',
    productName: 'Rose Pink Embroidered Palazzo Set',
    productPrice: '₹28,500',
    productLink: '/shop?category=kurta-sets',
    instagramUrl: 'https://www.instagram.com/reel/Ddi6--xsCbI/'
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
    videoSrc: '/reels/reel-2.mp4',
    productName: 'Black & White 3-Piece Silk Set',
    productPrice: '₹31,000',
    productLink: '/shop?category=heritage-silks',
    instagramUrl: 'https://www.instagram.com/reel/DdWEgyFofeF/'
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
    videoSrc: '/reels/reel-3.mp4',
    productName: 'Sunshine Mul Chanderi Festive Set',
    productPrice: '₹29,500',
    productLink: '/shop?category=kurta-sets',
    instagramUrl: 'https://www.instagram.com/reel/DdEJEAPIoc2/'
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
    videoSrc: '/reels/reel-4.mp4',
    productName: 'Silver Grey Royal Anarkali Ensemble',
    productPrice: '₹34,000',
    productLink: '/shop?category=anarkalis',
    instagramUrl: 'https://www.instagram.com/reel/DdOgt9toGpo/'
  }
];

export const InstagramReelsSection: React.FC = () => {
  const [activeReelModal, setActiveReelModal] = useState<ReelData | null>(null);
  const [likedReels, setLikedReels] = useState<Record<string, boolean>>({});

  // Optimized smooth video player states
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showPlayAnim, setShowPlayAnim] = useState<boolean>(false);

  useEffect(() => {
    if (activeReelModal && videoRef.current) {
      setIsPlaying(true);
      if (progressBarRef.current) {
        progressBarRef.current.style.width = '0%';
      }
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If unmuted autoplay is restricted by browser policy, smoothly fall back to muted autoplay to prevent lag
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().catch(() => {});
          }
        });
      }
    }
  }, [activeReelModal]);

  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    setShowPlayAnim(true);
    setTimeout(() => setShowPlayAnim(false), 550);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !progressBarRef.current) return;
    const { currentTime, duration } = videoRef.current;
    if (duration > 0) {
      const pct = (currentTime / duration) * 100;
      progressBarRef.current.style.width = `${pct}%`;
    }
  };

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

      {/* Reel Theater Modal: Pure Full-Bleed Video + Direct Instagram Option */}
      {activeReelModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in"
          onClick={() => setActiveReelModal(null)}
        >
          {/* 9:16 Vertical Video Frame */}
          <div 
            className="relative w-full max-w-[400px] aspect-[9/16] max-h-[88vh] rounded-2xl sm:rounded-3xl overflow-hidden bg-black shadow-[0_0_60px_rgba(0,0,0,0.95)] border border-[#C6A15D]/40 flex flex-col justify-between select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar Floating Controls */}
            <div className="absolute top-0 inset-x-0 z-30 p-3 sm:p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#833AB4] p-0.5 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Instagram className="w-4 h-4" />
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-white drop-shadow">@ethniz_couture</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C6A15D] fill-[#C6A15D]" />
                  </div>
                  <span className="text-[10px] text-[#DFC89D] block uppercase font-mono tracking-wider">
                    {activeReelModal.collectionTag}
                  </span>
                </div>
              </div>

              {/* Direct Instagram App Option + Audio Toggle + Close */}
              <div className="flex items-center gap-2">
                {/* Audio Toggle */}
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all border ${
                    isMuted 
                      ? 'bg-black/60 text-zinc-400 border-white/20' 
                      : 'bg-[#3E1A1E] text-[#DFC89D] border-[#C6A15D]/70 shadow-sm'
                  } active:scale-95`}
                  title={isMuted ? 'Tap to unmute sound' : 'Tap to mute sound'}
                  aria-label="Toggle sound"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
                </button>

                <a
                  href={activeReelModal.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] hover:brightness-110 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
                  title="Watch this exact reel on Instagram"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Watch on</span>
                  <span>Insta ↗</span>
                </a>

                <button
                  type="button"
                  onClick={() => setActiveReelModal(null)}
                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-sm transition-all border border-white/20 active:scale-95"
                  aria-label="Close video player"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* In That Whole Mode: ONLY Video Playing Edge-to-Edge with Tap to Play/Pause */}
            <div 
              className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden cursor-pointer"
              onClick={togglePlayPause}
            >
              <video
                ref={videoRef}
                key={activeReelModal.id}
                src={activeReelModal.videoSrc}
                poster={activeReelModal.image}
                autoPlay
                loop
                playsInline
                muted={isMuted}
                preload="auto"
                disablePictureInPicture
                onTimeUpdate={handleTimeUpdate}
                className="w-full h-full object-cover bg-black select-none pointer-events-none"
                style={{ transform: 'translate3d(0, 0, 0)', willChange: 'transform', backfaceVisibility: 'hidden' }}
              />

              {/* Tap to Play / Pause Center Animation Indicator */}
              {showPlayAnim && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-black/65 backdrop-blur-md border border-white/25 flex items-center justify-center text-white scale-110 shadow-2xl transition-all">
                    {isPlaying ? (
                      <Play className="w-8 h-8 fill-current text-[#DFC89D] ml-1" />
                    ) : (
                      <Pause className="w-8 h-8 fill-current text-[#DFC89D]" />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Overlay: Smooth Scrubber Bar + Title + Shop Button (NO PRICE) */}
            <div className="absolute bottom-0 inset-x-0 z-30 pointer-events-auto bg-gradient-to-t from-black/95 via-black/60 to-transparent">
              {/* Sleek Progress Scrubber Line */}
              <div className="w-full h-1 bg-white/15 overflow-hidden">
                <div 
                  ref={progressBarRef}
                  className="h-full bg-gradient-to-r from-[#C6A15D] via-[#DFC89D] to-[#C6A15D] w-0 transition-[width] duration-75 ease-linear"
                />
              </div>

              {/* Title & Shop Ensemble Action (No Price) */}
              <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs sm:text-sm font-semibold truncate drop-shadow">
                    {activeReelModal.title}
                  </p>
                  <p className="text-[#DFC89D] text-[11px] font-mono tracking-wider flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C6A15D]" />
                    <span>{activeReelModal.collectionTag}</span>
                  </p>
                </div>

                <Link
                  to={activeReelModal.productLink}
                  onClick={() => setActiveReelModal(null)}
                  className="py-2 px-3.5 rounded-xl bg-[#3E1A1E]/95 hover:bg-[#522127] text-[#DFC89D] border border-[#C6A15D]/60 hover:border-[#DFC89D] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg active:scale-95 transition-all shrink-0 backdrop-blur-sm"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#C6A15D]" />
                  <span>Shop Ensemble</span>
                </Link>
              </div>
            </div>

          </div>
        </div>
      )}
    </section>
  );
};
