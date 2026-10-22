import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
  Heart,
  Truck,
  RefreshCw,
  Star,
  Quote,
  Crown,
  CheckCircle2,
  Calendar,
  Layers,
  Compass,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { Product, Category, Banner } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

interface HeroSlide {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  image: string;
  primaryLink: string;
  primaryLabel: string;
  secondaryLink: string;
  secondaryLabel: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    tag: 'Haute Couture Bridal 2026',
    title: 'Where Royal Heritage Meets Timeless Grace',
    subtitle: 'Heirloom bridal lehengas handcrafted with real zari bullion, jewelled velvet, and antique Awadhi zardozi.',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=2000&q=90',
    primaryLink: '/shop?category=lehengas',
    primaryLabel: 'DISCOVER BRIDALWEAR',
    secondaryLink: '/shop?gender=WOMEN',
    secondaryLabel: 'EXPLORE WOMEN'
  },
  {
    id: 2,
    tag: 'Varanasi Master Looms',
    title: 'Pure Katan Silk & Brocade Treasures',
    subtitle: 'Woven over 180 artisan hours using time-honored interlocking kadwa techniques straight from Varanasi.',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=2000&q=90',
    primaryLink: '/shop?category=sarees',
    primaryLabel: 'EXPLORE SAREES',
    secondaryLink: '/shop?fabric=Pure+Katan+Silk',
    secondaryLabel: 'KATAN SILK EDIT'
  },
  {
    id: 3,
    tag: 'Bespoke Festive Atelier',
    title: 'Festive & Soirée Anarkalis',
    subtitle: 'Graceful kalidar silhouettes, tissue organza dupattas, and intricate gota patti embroidery for grand celebrations.',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=2000&q=90',
    primaryLink: '/shop?category=anarkalis',
    primaryLabel: 'EXPLORE ANARKALIS',
    secondaryLink: '/shop?category=kurta-sets',
    secondaryLabel: 'KURTA SETS'
  }
];

const CRAFT_STORIES = [
  {
    id: 'zardozi',
    name: 'Agra & Awadh Zardozi',
    technique: 'Heavy Bullion Metallic Wire Embroidery',
    history: 'Favored by the Mughal imperial courts since the 16th century, authentic Zardozi employs twisted metallic gold and silver threads, dabka springs, and semi-precious beads meticulously sewn onto pure velvet.',
    image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80',
    hours: '140+ Hours per Ensemble',
    link: '/shop?search=zardozi'
  },
  {
    id: 'banarasi',
    name: 'Banarasi Kadwa Weaving',
    technique: 'Pure Silk Interlocking Jacquard',
    history: 'Each motif is engraved onto the loom by hand without any loose floating threads on the reverse side. Authentic Katan silk provides a natural heirloom sheen that deepens with each generation.',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
    hours: '180+ Hours on Handloom',
    link: '/shop?category=sarees'
  },
  {
    id: 'chikankari',
    name: 'Lucknowi Chikankari & Mukaish',
    technique: 'Shadow Needlework & Flattened Metal Badla',
    history: 'Crafted exclusively by women artisans across rural Awadh, utilizing 32 distinct delicate stitches such as Bakhiya, Phanda, and Murri, highlighted by pure metallic mukaish dots.',
    image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80',
    hours: '90+ Hours of Hand-Stitching',
    link: '/shop?search=chikankari'
  },
  {
    id: 'gota',
    name: 'Rajasthan Royal Gota Patti',
    technique: 'Hand-Cut Metallic Ribbon Appliqué',
    history: 'Originating in royal Jaipur and Mewar, ribbons of real zari ribbon are meticulously cut into floral diamond and petal shapes, then hand-appliquéd onto fine chanderi and tissue silks.',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
    hours: '110+ Hours of Appliqué',
    link: '/shop?search=gota'
  }
];

export const Home: React.FC = () => {
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [heroBanner, setHeroBanner] = useState<Banner | null>(null);
  const [festiveBanner, setFestiveBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [activeCraftTab, setActiveCraftTab] = useState(0);
  const [consultationSubmitted, setConsultationSubmitted] = useState(false);
  const [consultationName, setConsultationName] = useState('');
  const [consultationPhone, setConsultationPhone] = useState('');
  const [consultationDate, setConsultationDate] = useState('');
  const [consultationNote, setConsultationNote] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [arrivalsRes, bestRes, catRes, bannersRes] = await Promise.all([
          api.get('/products/new-arrivals'),
          api.get('/products/best-sellers'),
          api.get('/categories'),
          api.get('/content/banners')
        ]);

        setNewArrivals(arrivalsRes.data.products || []);
        setBestSellers(bestRes.data.products || []);
        setCategories(catRes.data.categories || []);

        const banners: Banner[] = bannersRes.data.banners || [];
        const hero = banners.find((b) => b.key === 'hero');
        const festive = banners.find((b) => b.key === 'festive_spotlight');
        if (hero) setHeroBanner(hero);
        if (festive) setFestiveBanner(festive);
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadHomeData();
  }, []);

  // Auto-slide Hero every 7 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const handleConsultationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultationName || !consultationPhone) {
      showToast('Please provide your name and contact phone number.', 'error');
      return;
    }
    setConsultationSubmitted(true);
    showToast('Your Bridal Styling Consultation is confirmed! Our Senior Atelier Concierge will connect with you.', 'success');
  };

  const activeSlide = HERO_SLIDES[currentHeroIndex];
  const activeCraft = CRAFT_STORIES[activeCraftTab];

  return (
    <div className="space-y-24 pb-20 overflow-hidden">

      {/* 1. HAUTE COUTURE HERO SECTION */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-[#160307]">
        {/* Background Images with smooth opacity crossfade */}
        {HERO_SLIDES.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentHeroIndex ? 'opacity-55 scale-100' : 'opacity-0 scale-105 pointer-events-none'
              }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover object-top filter brightness-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#160307] via-black/40 to-black/60" />
            <div className="absolute inset-0 bg-jaali-dark opacity-30" />
          </div>
        ))}

        {/* Hero Slider Controls */}
        <button
          onClick={() => setCurrentHeroIndex((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1))}
          className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full border border-gold-500/40 bg-black/40 text-gold-300 hover:text-white hover:border-gold-300 hover:bg-black/70 backdrop-blur-md items-center justify-center transition-all"
          aria-label="Previous Slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={() => setCurrentHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length)}
          className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full border border-gold-500/40 bg-black/40 text-gold-300 hover:text-white hover:border-gold-300 hover:bg-black/70 backdrop-blur-md items-center justify-center transition-all"
          aria-label="Next Slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white py-24">

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 border border-gold-400/50 text-gold-300 text-[11px] font-bold tracking-[0.25em] uppercase mb-6 backdrop-blur-md shadow-gold-glow animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-gold-400" />
            <span>{activeSlide.tag}</span>
            <Sparkles className="w-3.5 h-3.5 text-gold-400" />
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-tight text-[#FAF7F2] leading-[1.08] max-w-4xl mx-auto drop-shadow-lg">
            {activeSlide.title}
          </h1>

          <p className="mt-6 text-base sm:text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto font-light leading-relaxed">
            {activeSlide.subtitle}
          </p>

          {/* Action CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-xs font-bold tracking-widest uppercase">
            <Link
              to={activeSlide.primaryLink}
              className="h-13 px-8 bg-[#3E1A1E] hover:bg-[#2B0C10] active:bg-[#1A080B] text-[#DFC89D] rounded-lg border border-[#C6A15D]/60 shadow-2xl transition-all duration-300 hover:scale-105 gold-shimmer-btn flex items-center gap-2"
            >
              <span>{activeSlide.primaryLabel}</span>
              <ArrowRight className="w-4 h-4 text-[#C6A15D]" />
            </Link>

            <Link
              to={activeSlide.secondaryLink}
              className="h-13 px-8 bg-black/60 hover:bg-black text-white rounded-lg border border-[#C6A15D]/40 shadow-xl transition-all duration-300 hover:scale-105 backdrop-blur-md flex items-center justify-center"
            >
              {activeSlide.secondaryLabel}
            </Link>

            <Link
              to="/shop"
              className="h-13 px-7 bg-transparent hover:bg-white/10 text-[#DFC89D] rounded-lg border border-zinc-400/50 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>LOOKBOOK ARCHIVE</span>
            </Link>
          </div>

          {/* Slide Indicators */}
          <div className="mt-12 flex justify-center items-center gap-3">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentHeroIndex(i)}
                className={`h-1.5 transition-all duration-500 rounded-full ${i === currentHeroIndex ? 'w-10 bg-gold-400' : 'w-2.5 bg-white/30 hover:bg-white/60'
                  }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

        </div>

        {/* Bottom subtle scroll indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-zinc-400 text-[10px] tracking-[0.25em] uppercase flex flex-col items-center gap-1 opacity-75">
          <span>Scroll to Explore</span>
          <div className="w-0.5 h-5 bg-gold-400/60 animate-bounce" />
        </div>
      </section>

      {/* 2. INFINITE LUXURY MARQUEE TICKER */}
      <section className="bg-[#2B0810] text-[#FAF7F2] py-4 border-y border-gold-600/40 overflow-hidden shadow-inner">
        <div className="animate-marquee whitespace-nowrap text-xs sm:text-sm font-serif tracking-[0.2em] uppercase flex items-center gap-12 text-gold-200">
          <span className="flex items-center gap-3">
            <Crown className="w-4 h-4 text-gold-400" />
            <span>100% PURE HANDLOOM SILK &amp; GI-TAGGED HERITAGE</span>
          </span>
          <span className="text-gold-500">✦</span>
          <span>COMPLIMENTARY INSURED AIR SHIPPING WORLDWIDE OVER ₹2,999</span>
          <span className="text-gold-500">✦</span>
          <span>BESPOKE BLOUSE &amp; SHERWANI MADE-TO-MEASURE TAILORING</span>
          <span className="text-gold-500">✦</span>
          <span>120+ ARTISAN KARIGARI HOURS PER PIECE</span>
          <span className="text-gold-500">✦</span>
          <span>AUTHENTICITY CERTIFICATE &amp; VELVET HEIRLOOM PRESERVATION BOX</span>
          <span className="text-gold-500">✦</span>
          <span>PRIVATE VIRTUAL STYLING CONCIERGE VIA VIDEO CALL</span>
          <span className="text-gold-500">✦</span>
          {/* Duplicate set for seamless infinite loop */}
          <span className="flex items-center gap-3">
            <Crown className="w-4 h-4 text-gold-400" />
            <span>100% PURE HANDLOOM SILK &amp; GI-TAGGED HERITAGE</span>
          </span>
          <span className="text-gold-500">✦</span>
          <span>COMPLIMENTARY INSURED AIR SHIPPING WORLDWIDE OVER ₹2,999</span>
          <span className="text-gold-500">✦</span>
          <span>BESPOKE BLOUSE &amp; SHERWANI MADE-TO-MEASURE TAILORING</span>
          <span className="text-gold-500">✦</span>
          <span>120+ ARTISAN KARIGARI HOURS PER PIECE</span>
          <span className="text-gold-500">✦</span>
        </div>
      </section>

      {/* 3. CURATED PAVILIONS (CATEGORIES) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <div className="flex items-center justify-center gap-2 text-gold-700 text-xs font-bold tracking-[0.25em] uppercase">
            <Sparkles className="w-3.5 h-3.5 text-gold-600" />
            <span>Curated Pavilions</span>
            <Sparkles className="w-3.5 h-3.5 text-gold-600" />
          </div>
          <h2 className="font-serif text-3xl sm:text-5xl text-zinc-900 font-medium mt-2">
            Explore by Silhouette
          </h2>
          <p className="text-xs text-zinc-600 mt-2">Each pavilion represents generations of authentic regional weaving mastery.</p>
          <div className="w-16 h-0.5 bg-maroon-800 mx-auto mt-3" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/shop?category=${cat.slug}`}
              className="group relative rounded-md overflow-hidden aspect-[3/4] bg-zinc-900 shadow-md border border-gold-200/80 transition-all duration-500 hover:shadow-luxury-hover hover:border-gold-500"
            >
              <img
                src={cat.image || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80'}
                alt={cat.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108 opacity-85 group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

              <div className="absolute inset-x-4 bottom-5 text-center">
                <span className="text-[9px] uppercase font-bold tracking-[0.25em] text-gold-400 block mb-1">
                  Atelier Archive
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-white tracking-wide group-hover:text-gold-200 transition-colors">
                  {cat.name}
                </h3>
                <span className="inline-flex items-center gap-1 mt-2 text-[10px] uppercase font-bold tracking-widest text-gold-300 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  <span>Explore Pavilions</span>
                  <ArrowRight className="w-3 h-3 text-gold-400" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. NEW ARRIVALS (FRESH OFF THE LOOMS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-baseline justify-between mb-10 pb-4 border-b border-zinc-200">
          <div>
            <span className="text-xs font-bold tracking-[0.25em] text-gold-700 uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gold-600" />
              <span>Fresh Off The Looms</span>
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-zinc-900 font-medium mt-1">
              New Arrivals Haute Couture
            </h2>
          </div>
          <Link
            to="/shop?sort=newest"
            className="mt-3 sm:mt-0 text-xs font-bold uppercase tracking-widest text-maroon-800 hover:text-maroon-950 flex items-center gap-1.5 group border-b border-maroon-800/40 pb-0.5"
          >
            <span>View All New Additions</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-zinc-200 animate-pulse rounded-md" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {newArrivals.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 5. INTERACTIVE "THE ANCIENT ARTS OF KARIGARI" SECTION */}
      <section className="bg-[#1C050A] text-[#FAF7F2] py-20 border-y border-gold-600/40 relative overflow-hidden">
        <div className="absolute inset-0 bg-jaali-dark opacity-20 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.3em] text-gold-400 uppercase">
              <Crown className="w-4 h-4" />
              <span>Living Heritage</span>
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight text-[#FAF7F2] mt-2">
              The Ancient Arts of Karigari
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-light mt-3 leading-relaxed">
              Explore the four legendary Indian craft disciplines preserved within the EthnizCouture ateliers.
            </p>
            <div className="w-16 h-0.5 bg-gold-500 mx-auto mt-4" />
          </div>

          {/* Interactive Craft Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-12">
            {CRAFT_STORIES.map((story, idx) => (
              <button
                key={story.id}
                onClick={() => setActiveCraftTab(idx)}
                className={`px-5 py-2.5 rounded text-xs font-bold tracking-widest uppercase transition-all duration-300 border ${activeCraftTab === idx
                    ? 'bg-gold-500 text-zinc-950 border-gold-400 shadow-gold-glow scale-105'
                    : 'bg-black/40 text-gold-200 border-gold-500/30 hover:bg-maroon-900/60 hover:text-white'
                  }`}
              >
                {story.name.split(' ')[0]} {story.name.split(' ')[1]}
              </button>
            ))}
          </div>

          {/* Active Craft Showcase Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center bg-black/40 p-8 sm:p-12 rounded-xl border border-gold-500/30 backdrop-blur-sm shadow-2xl">
            <div className="lg:col-span-7 space-y-5">
              <span className="text-[11px] font-mono tracking-[0.2em] text-gold-400 uppercase block font-semibold">
                TECHNIQUE: {activeCraft.technique}
              </span>
              <h3 className="font-serif text-3xl sm:text-4xl text-white font-medium">
                {activeCraft.name}
              </h3>
              <p className="text-sm sm:text-base text-zinc-300 font-light leading-relaxed">
                {activeCraft.history}
              </p>

              <div className="pt-4 flex items-center gap-6 border-t border-gold-500/20">
                <div>
                  <span className="text-[10px] text-gold-400 uppercase tracking-wider block">Artisan Investment</span>
                  <span className="font-serif text-xl font-bold text-white">{activeCraft.hours}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gold-400 uppercase tracking-wider block">Heritage Origin</span>
                  <span className="font-serif text-xl font-bold text-white">Varanasi &amp; Awadh</span>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  to={activeCraft.link}
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-maroon-800 hover:bg-maroon-900 text-gold-100 rounded text-xs font-bold tracking-widest uppercase border border-gold-500/40 transition-colors"
                >
                  <span>Explore {activeCraft.name.split(' ')[1]} Ensembles</span>
                  <ArrowRight className="w-4 h-4 text-gold-300" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="aspect-[4/3] rounded-lg overflow-hidden border-2 border-gold-500/50 shadow-2xl group">
                <img
                  src={activeCraft.image}
                  alt={activeCraft.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 6. BEST SELLERS (TREASURED CLASSICS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-baseline justify-between mb-10 pb-4 border-b border-zinc-200">
          <div>
            <span className="text-xs font-bold tracking-[0.25em] text-gold-700 uppercase flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-gold-600" />
              <span>Treasured Patrons' Favorites</span>
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-zinc-900 font-medium mt-1">
              Iconic Best Sellers
            </h2>
          </div>
          <Link
            to="/shop?sort=bestselling"
            className="mt-3 sm:mt-0 text-xs font-bold uppercase tracking-widest text-maroon-800 hover:text-maroon-950 flex items-center gap-1.5 group border-b border-maroon-800/40 pb-0.5"
          >
            <span>View All Bestsellers</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-zinc-200 animate-pulse rounded-md" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {bestSellers.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 7. BRIDAL ATELIER CONCIERGE BOOKING CARD */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-[#2F0A12] to-[#170307] text-[#FAF7F2] rounded-2xl p-8 sm:p-14 border border-gold-500/40 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-jaali-dark opacity-20 pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-950/70 border border-gold-500/40 text-gold-300 text-[10px] font-bold tracking-widest uppercase">
                <Crown className="w-3 h-3 text-gold-400" />
                <span>Private Atelier Services</span>
              </div>

              <h2 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight text-white leading-tight">
                Book a Private Bridal &amp; Groom Consultation
              </h2>

              <p className="text-sm text-zinc-300 font-light leading-relaxed max-w-xl">
                Whether you are stepping onto the mandap in Udaipur, Lake Como, or New Delhi, our senior couture stylists provide one-on-one virtual video styling, custom neckline modifications, and fabric swatch mailings.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                <div className="flex items-center gap-2 text-zinc-200">
                  <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0" />
                  <span>Custom Blouse Tailoring</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-200">
                  <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0" />
                  <span>Complimentary Swatches</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-200">
                  <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0" />
                  <span>Global White-Glove Transit</span>
                </div>
              </div>
            </div>

            {/* Quick Consultation Form */}
            <div className="lg:col-span-5 bg-white text-zinc-900 p-6 sm:p-8 rounded-xl shadow-2xl border border-gold-300">
              {consultationSubmitted ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-zinc-900">Appointment Requested</h3>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    Thank you, {consultationName}. Our Bridal Concierge will call you at {consultationPhone} within 4 hours to coordinate your video consultation.
                  </p>
                  <button
                    onClick={() => setConsultationSubmitted(false)}
                    className="mt-4 text-xs font-bold text-maroon-800 uppercase underline"
                  >
                    Submit Another Request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConsultationSubmit} className="space-y-4">
                  <div className="text-center pb-2 border-b border-zinc-100">
                    <h3 className="font-serif text-xl font-bold text-zinc-900">Schedule Atelier Session</h3>
                    <p className="text-[11px] text-zinc-500">Complimentary 45-minute video styling</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Radhika Merchant"
                      value={consultationName}
                      onChange={(e) => setConsultationName(e.target.value)}
                      className="w-full h-11 px-3.5 text-xs sm:text-sm bg-white border border-[#E8DEC8] rounded-lg focus:outline-none focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30 transition-all text-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      Phone / WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={consultationPhone}
                      onChange={(e) => setConsultationPhone(e.target.value)}
                      className="w-full h-11 px-3.5 text-xs sm:text-sm bg-white border border-[#E8DEC8] rounded-lg focus:outline-none focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30 transition-all text-zinc-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1">
                        Wedding Date
                      </label>
                      <input
                        type="date"
                        value={consultationDate}
                        onChange={(e) => setConsultationDate(e.target.value)}
                        className="w-full h-11 px-3 text-xs bg-white border border-[#E8DEC8] rounded-lg focus:outline-none focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30 transition-all text-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1">
                        Interested In
                      </label>
                      <select
                        value={consultationNote}
                        onChange={(e) => setConsultationNote(e.target.value)}
                        className="w-full h-11 px-3 text-xs bg-white border border-[#E8DEC8] rounded-lg focus:outline-none focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30 transition-all text-zinc-900"
                      >
                        <option value="Bridal Lehenga">Bridal Lehenga</option>
                        <option value="Banarasi Saree">Banarasi Saree</option>
                        <option value="Groom Sherwani">Groom Sherwani</option>
                        <option value="Trousseau Curations">Full Trousseau</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full h-12 bg-[#3E1A1E] hover:bg-[#2B0C10] active:bg-[#1A080B] text-[#DFC89D] rounded-lg text-xs font-bold tracking-widest uppercase transition-all duration-300 shadow-md gold-shimmer-btn flex items-center justify-center border border-[#C6A15D]/50"
                  >
                    CONFIRM ATELIER APPOINTMENT
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 8. REFLECTIONS OF ELEGANCE (PATRON REVIEWS) */}
      <section className="bg-[#FAF2F4]/60 py-20 border-y border-[#ECCDD4]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-xs font-bold tracking-[0.25em] text-gold-700 uppercase flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-gold-600" />
              <span>Patron Testimonials</span>
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl text-zinc-900 font-medium mt-1">
              Reflections of Elegance
            </h2>
            <p className="text-xs text-zinc-500 mt-2">Real brides and grooms who celebrated their historic unions in EthnizCouture.</p>
            <div className="w-12 h-0.5 bg-maroon-800 mx-auto mt-3" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gold-200 flex flex-col justify-between hover:shadow-luxury transition-all">
              <div>
                <Quote className="w-8 h-8 text-gold-400/50 mb-3" />
                <div className="flex text-amber-400 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-zinc-700 italic leading-relaxed">
                  "Wore this for my pheras at Jagmandir Island Palace in Udaipur. The intricate gold zardozi bullion work and double dupatta stole the entire evening. Unmatched craftsmanship and regal weight."
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-100">
                <p className="font-serif text-base font-bold text-zinc-900">Aishwarya Roy Singhania</p>
                <p className="text-[11px] text-zinc-500">Mumbai · Verified Bride</p>
                <p className="text-[10px] text-gold-700 font-semibold mt-0.5">Royal Maroon Velvet Heritage Bridal Lehenga</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gold-200 flex flex-col justify-between hover:shadow-luxury transition-all">
              <div>
                <Quote className="w-8 h-8 text-gold-400/50 mb-3" />
                <div className="flex text-amber-400 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-zinc-700 italic leading-relaxed">
                  "The brocade is authentic handloom Banarasi silk. The bespoke silhouette commanded absolute royal dignity at our Delhi reception. Guests couldn't stop praising the regal antique finish."
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-100">
                <p className="font-serif text-base font-bold text-zinc-900">Raghav Singhania</p>
                <p className="text-[11px] text-zinc-500">New Delhi · Verified Groom</p>
                <p className="text-[10px] text-gold-700 font-semibold mt-0.5">Royal Heritage Brocade Groom Sherwani</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gold-200 flex flex-col justify-between hover:shadow-luxury transition-all">
              <div>
                <Quote className="w-8 h-8 text-gold-400/50 mb-3" />
                <div className="flex text-amber-400 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-zinc-700 italic leading-relaxed">
                  "The weight and pure silk luster are heirloom standard. Arrived in an ivory velvet preservation box with certificate of authenticity. Truly worthy of passing down to my daughter."
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-100">
                <p className="font-serif text-base font-bold text-zinc-900">Meera Nambiar</p>
                <p className="text-[11px] text-zinc-500">Bengaluru · Verified Patron</p>
                <p className="text-[10px] text-gold-700 font-semibold mt-0.5">Varanasi Royal Crimson Katan Silk Saree</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. WHY ETHNIZCOUTURE PILLARS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-14">
          <span className="text-xs font-bold tracking-[0.25em] text-gold-700 uppercase">
            The Haute Couture Standard
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-zinc-900 font-medium mt-1">
            Why EthnizCouture?
          </h2>
          <div className="w-12 h-0.5 bg-maroon-800 mx-auto mt-3" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-lg border border-[#EBE3D5] hover:border-gold-400 transition-all duration-300 hover:shadow-luxury">
            <div className="w-12 h-12 bg-maroon-50 text-maroon-800 rounded flex items-center justify-center mb-5 border border-maroon-200">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-zinc-900">Premium Handloom Craftsmanship</h3>
            <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
              Every garment is handcrafted across 120+ artisan hours by master karigars adhering to time-honored handloom traditions.
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg border border-[#EBE3D5] hover:border-gold-400 transition-all duration-300 hover:shadow-luxury">
            <div className="w-12 h-12 bg-maroon-50 text-maroon-800 rounded flex items-center justify-center mb-5 border border-maroon-200">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-zinc-900">Authentic Imperial Designs</h3>
            <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
              Pure silk jacquards, zardozi needlework, and heritage royal motifs derived straight from the royal courts of Rajasthan and Awadh.
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg border border-[#EBE3D5] hover:border-gold-400 transition-all duration-300 hover:shadow-luxury">
            <div className="w-12 h-12 bg-maroon-50 text-maroon-800 rounded flex items-center justify-center mb-5 border border-maroon-200">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-zinc-900">GI Certified Purity</h3>
            <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
              Unadulterated Katan silk, velvet, chanderi, and organza woven with real zari threads that retain heirloom value for generations.
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg border border-[#EBE3D5] hover:border-gold-400 transition-all duration-300 hover:shadow-luxury">
            <div className="w-12 h-12 bg-maroon-50 text-maroon-800 rounded flex items-center justify-center mb-5 border border-maroon-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-zinc-900">Encrypted Global Checkout</h3>
            <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
              Industry-standard 256-bit encryption powered by Stripe. Accept cards, net banking, UPI, and international currencies.
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg border border-[#EBE3D5] hover:border-gold-400 transition-all duration-300 hover:shadow-luxury">
            <div className="w-12 h-12 bg-maroon-50 text-maroon-800 rounded flex items-center justify-center mb-5 border border-maroon-200">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-zinc-900">7-Day Alteration Assistance</h3>
            <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
              Hassle-free pickup and bespoke size alterations. Our bridal concierge guarantees you step into every event with an immaculate fit.
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg border border-[#EBE3D5] hover:border-gold-400 transition-all duration-300 hover:shadow-luxury">
            <div className="w-12 h-12 bg-maroon-50 text-maroon-800 rounded flex items-center justify-center mb-5 border border-maroon-200">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-zinc-900">Insured Pan-India &amp; Global Delivery</h3>
            <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
              Complimentary insured air courier on all orders above ₹2,999 with real-time milestone order tracking directly in your account.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
};
