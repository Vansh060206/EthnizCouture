import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, 
  Heart, 
  ShoppingBag, 
  User as UserIcon, 
  Menu, 
  X, 
  ChevronDown, 
  ShieldAlert, 
  Sparkles, 
  Globe,
  ArrowRight,
  Crown,
  Package,
  Truck,
  MessageCircle,
  ChevronRight,
  Phone,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useCurrency, CURRENCIES, CurrencyCode } from '../context/CurrencyContext';
import api from '../services/api';
import { Product } from '../types';

export const Navbar: React.FC = () => {
  const { user, login, logout, isAdmin } = useAuth();
  const { totalItemCount, setIsCartOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const { currency, setCurrency, formatPrice } = useCurrency();
  const navigate = useNavigate();
  const location = useLocation();

  const isHomepage = location.pathname === '/';
  const [isScrolled, setIsScrolled] = useState(false);

  const [announcement, setAnnouncement] = useState<string>(
    'Complimentary Worldwide Air Shipping on Orders Above ₹2,999 • Private Bridal Atelier Consultations'
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const megaMenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll listener for header transformation
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const res = await api.get('/content/banners?key=announcement');
        if (res.data.banners && res.data.banners.length > 0) {
          setAnnouncement(res.data.banners[0].title);
        }
      } catch (err) {
        // Fallback banner already set
      }
    };
    fetchAnnouncement();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when search modal opens
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 120);
    }
  }, [isSearchOpen]);

  // Live search debounced
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(`/products?search=${encodeURIComponent(searchQuery)}&limit=6`);
        setSearchResults(res.data.products || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleMouseEnterMenu = (menuKey: string) => {
    if (megaMenuTimeoutRef.current) clearTimeout(megaMenuTimeoutRef.current);
    setActiveMegaMenu(menuKey);
  };

  const handleMouseLeaveMenu = () => {
    megaMenuTimeoutRef.current = setTimeout(() => {
      setActiveMegaMenu(null);
    }, 250);
  };

  // Header dynamic styling:
  // When at the very top of homepage -> transparent dark-tinted overlay with white/gold text
  // When scrolled or on subpages -> solid warm ivory header with dark charcoal text & subtle gold border
  const isTransparent = isHomepage && !isScrolled;

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        isTransparent
          ? 'bg-gradient-to-b from-black/85 via-black/40 to-transparent text-[#FAF7F2] border-b border-white/10'
          : 'bg-[#FAF7F2]/95 backdrop-blur-md text-[#1A1A1A] border-b border-[#C6A15D]/25 shadow-sm'
      }`}
    >
      
      {/* 1. TOP ANNOUNCEMENT RIBBON */}
      <div className="bg-[#3E1A1E] text-[#FAF7F2] text-[10px] sm:text-[11px] py-1.5 px-4 border-b border-[#C6A15D]/30 flex items-center justify-between font-sans">
        <div className="hidden md:flex items-center gap-2 text-[#DFC89D] text-[10px] tracking-[0.25em] uppercase font-medium">
          <span>HAUTE COUTURE ATELIER</span>
        </div>

        <div className="flex-1 text-center flex items-center justify-center gap-2 tracking-[0.2em] uppercase font-medium text-zinc-200">
          <Sparkles className="w-3 h-3 text-[#C6A15D] shrink-0" />
          <span className="truncate">{announcement}</span>
          <Sparkles className="w-3 h-3 text-[#C6A15D] shrink-0" />
        </div>

        {/* Official Atelier Currency Display (Indian Rupees Only) */}
        <div className="flex items-center gap-1.5 text-zinc-300 text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5" title="Currency: Indian Rupees (INR)">
          <Globe className="w-3 h-3 text-[#C6A15D]" />
          <span>INR (₹)</span>
        </div>
      </div>

      {/* 2. MAIN NAVIGATION BAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 sm:h-22">
          
          {/* Mobile Hamburger Toggle */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`p-2 focus:outline-none transition-colors ${
                isTransparent ? 'text-white hover:text-[#DFC89D]' : 'text-[#1A1A1A] hover:text-[#3E1A1E]'
              }`}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* OFFICIAL BRAND LOGO (Left side on desktop as requested) */}
          <div className="flex items-center">
            <Link to="/" className="inline-flex items-center group py-2" title="EthnizCouture Home">
              {/* Display the authentic official logo asset */}
              <div className="relative overflow-hidden rounded-md border border-[#C6A15D]/30 p-1 bg-[#3E1A1E] shadow-sm transition-all duration-300 group-hover:border-[#C6A15D] group-hover:shadow-luxury">
                <img
                  src="/logo-card.png"
                  alt="EthnizCouture Haute Indian Fashion"
                  className="h-10 sm:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-103"
                />
              </div>
            </Link>
          </div>

          {/* Desktop Center Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-7 text-[11px] font-semibold tracking-[0.22em] uppercase">
            
            {/* COUTURE with mega menu trigger */}
            <div
              className="relative py-6 group cursor-pointer"
              onMouseEnter={() => handleMouseEnterMenu('couture')}
              onMouseLeave={handleMouseLeaveMenu}
            >
              <Link
                to="/shop"
                className={`transition-colors flex items-center gap-1 ${
                  isTransparent ? 'text-white/90 hover:text-[#DFC89D]' : 'text-zinc-800 hover:text-[#3E1A1E]'
                }`}
              >
                <span>COUTURE</span>
                <ChevronDown className="w-3 h-3 text-[#C6A15D] transition-transform group-hover:rotate-180" />
              </Link>
              <span className="absolute bottom-5 left-0 w-0 h-[1.5px] bg-[#C6A15D] transition-all duration-300 group-hover:w-full" />
            </div>

            <Link
              to="/shop?category=sarees"
              className={`transition-colors py-6 relative group ${
                isTransparent ? 'text-white/90 hover:text-[#DFC89D]' : 'text-zinc-800 hover:text-[#3E1A1E]'
              }`}
            >
              <span>SAREES</span>
              <span className="absolute bottom-5 left-0 w-0 h-[1.5px] bg-[#C6A15D] transition-all duration-300 group-hover:w-full" />
            </Link>

            <Link
              to="/shop?category=lehengas"
              className={`transition-colors py-6 relative group ${
                isTransparent ? 'text-white/90 hover:text-[#DFC89D]' : 'text-zinc-800 hover:text-[#3E1A1E]'
              }`}
            >
              <span>LEHENGAS</span>
              <span className="absolute bottom-5 left-0 w-0 h-[1.5px] bg-[#C6A15D] transition-all duration-300 group-hover:w-full" />
            </Link>

            <Link
              to="/shop?occasion=Bridal"
              className={`transition-colors py-6 relative group ${
                isTransparent ? 'text-white/90 hover:text-[#DFC89D]' : 'text-zinc-800 hover:text-[#3E1A1E]'
              }`}
            >
              <span>BRIDAL</span>
              <span className="absolute bottom-5 left-0 w-0 h-[1.5px] bg-[#C6A15D] transition-all duration-300 group-hover:w-full" />
            </Link>

            <Link
              to="/shop"
              className={`transition-colors py-6 relative group ${
                isTransparent ? 'text-white/90 hover:text-[#DFC89D]' : 'text-zinc-800 hover:text-[#3E1A1E]'
              }`}
            >
              <span>COLLECTIONS</span>
              <span className="absolute bottom-5 left-0 w-0 h-[1.5px] bg-[#C6A15D] transition-all duration-300 group-hover:w-full" />
            </Link>

            <Link
              to="/shop?sort=newest"
              className={`transition-colors py-6 relative group ${
                isTransparent ? 'text-white/90 hover:text-[#DFC89D]' : 'text-zinc-800 hover:text-[#3E1A1E]'
              }`}
            >
              <span>NEW ARRIVALS</span>
              <span className="absolute bottom-5 left-0 w-0 h-[1.5px] bg-[#C6A15D] transition-all duration-300 group-hover:w-full" />
            </Link>

            <Link
              to="/about"
              className={`transition-colors py-6 relative group ${
                isTransparent ? 'text-white/90 hover:text-[#DFC89D]' : 'text-zinc-800 hover:text-[#3E1A1E]'
              }`}
            >
              <span>ABOUT</span>
              <span className="absolute bottom-5 left-0 w-0 h-[1.5px] bg-[#C6A15D] transition-all duration-300 group-hover:w-full" />
            </Link>

            <Link
              to="/contact"
              className={`transition-colors py-6 relative group ${
                isTransparent ? 'text-white/90 hover:text-[#DFC89D]' : 'text-zinc-800 hover:text-[#3E1A1E]'
              }`}
            >
              <span>CONTACT</span>
              <span className="absolute bottom-5 left-0 w-0 h-[1.5px] bg-[#C6A15D] transition-all duration-300 group-hover:w-full" />
            </Link>
          </nav>

          {/* Right Action Icons: Search, Account, Wishlist, Bag */}
          <div className="flex items-center space-x-2 sm:space-x-5">
            
            {/* Search Trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className={`p-2 transition-colors hover:scale-105 ${
                isTransparent ? 'text-white hover:text-[#DFC89D]' : 'text-zinc-800 hover:text-[#3E1A1E]'
              }`}
              title="Search Archives"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* User Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`flex items-center space-x-1 p-2 transition-colors focus:outline-none hover:scale-105 ${
                  isTransparent ? 'text-white hover:text-[#DFC89D]' : 'text-zinc-800 hover:text-[#3E1A1E]'
                }`}
                title="Account & Patrons"
              >
                <UserIcon className="w-5 h-5" />
                <ChevronDown className="w-3 h-3 text-[#C6A15D] hidden sm:inline-block" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-2xl border border-[#C6A15D]/40 py-3 z-50 animate-fade-in text-sm text-zinc-800">
                  {user ? (
                    <>
                      <div className="px-4 py-2.5 bg-[#FAF7F2] border-b border-[#C6A15D]/20">
                        <p className="font-serif font-bold text-[#3E1A1E] text-base">{user.name}</p>
                        <p className="text-xs text-zinc-600 truncate">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-[#3E1A1E] text-[#DFC89D] text-[10px] font-bold tracking-widest uppercase rounded">
                          {user.role === 'ADMIN' ? 'Atelier Director' : 'Verified'}
                        </span>
                      </div>

                      {isAdmin && (
                        <Link
                          to="/atelier-portal"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs tracking-wider uppercase font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border-b border-amber-200 transition-colors"
                        >
                          <ShieldAlert className="w-4 h-4 text-amber-700" />
                          <span>Atelier Portal Console</span>
                        </Link>
                      )}

                      <div className="py-1">
                        <Link
                          to="/account?tab=profile"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-700 hover:bg-zinc-50 hover:text-[#3E1A1E]"
                        >
                          My Wardrobe &amp; Profile
                        </Link>
                        <Link
                          to="/account?tab=orders"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-700 hover:bg-zinc-50 hover:text-[#3E1A1E]"
                        >
                          Order History &amp; Timeline
                        </Link>
                        <Link
                          to="/account?tab=wishlist"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-700 hover:bg-zinc-50 hover:text-[#3E1A1E]"
                        >
                          Saved Pieces ({wishlistCount})
                        </Link>
                        <Link
                          to="/track-order"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#C6A15D] hover:bg-zinc-50"
                        >
                          Live Consignment Tracking
                        </Link>
                      </div>

                      <div className="border-t border-zinc-100 mt-1 pt-2 px-4">
                        <button
                          onClick={() => {
                            logout();
                            setIsUserMenuOpen(false);
                            navigate('/');
                          }}
                          className="w-full text-left py-1 text-[#3E1A1E] hover:text-[#1C080B] text-xs font-bold tracking-wider uppercase"
                        >
                          Sign Out of Atelier
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="px-4 py-3 border-b border-zinc-100">
                        <p className="font-serif text-lg font-bold text-zinc-900">Welcome to EthnizCouture</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Sign in for bespoke appointments, tracking, and curated recommendations.</p>
                      </div>

                      <div className="p-3 space-y-2">
                        <Link
                          to="/login"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block w-full py-2.5 text-center bg-[#3E1A1E] hover:bg-[#2E1115] text-[#FAF7F2] rounded text-xs font-bold tracking-widest uppercase transition-colors"
                        >
                          Sign In / Register
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Wishlist Link */}
            <Link
              to={user ? "/account?tab=wishlist" : "/login?redirect=/account?tab=wishlist"}
              className={`p-2 transition-colors relative hover:scale-105 ${
                isTransparent ? 'text-white hover:text-[#DFC89D]' : 'text-zinc-800 hover:text-[#3E1A1E]'
              }`}
              title="Saved Pieces"
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#3E1A1E] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Shopping Bag Drawer Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="px-2.5 sm:px-4 py-2 bg-[#3E1A1E] hover:bg-[#2E1115] text-[#FAF7F2] rounded-full transition-all duration-300 relative flex items-center gap-1.5 sm:gap-2 shadow-md border border-[#C6A15D]/40 gold-shimmer-btn"
              title="Shopping Bag"
            >
              <ShoppingBag className="w-4 h-4 text-[#DFC89D]" />
              <span className="hidden sm:inline-block text-xs font-bold tracking-widest uppercase text-zinc-100">
                Bag
              </span>
              {totalItemCount > 0 ? (
                <span className="w-5 h-5 bg-[#C6A15D] text-zinc-950 text-[11px] font-extrabold rounded-full flex items-center justify-center shadow">
                  {totalItemCount}
                </span>
              ) : (
                <span className="hidden sm:inline-block text-xs text-[#DFC89D]/80 font-mono">(0)</span>
              )}
            </button>

          </div>
        </div>
      </div>

      {/* 3. DESKTOP MEGA MENUS */}
      {activeMegaMenu === 'couture' && (
        <div 
          className="hidden lg:block absolute left-0 right-0 top-full bg-[#FAF7F2] text-[#1A1A1A] border-b border-[#C6A15D]/40 shadow-2xl z-30 animate-fade-in"
          onMouseEnter={() => handleMouseEnterMenu('couture')}
          onMouseLeave={handleMouseLeaveMenu}
        >
          <div className="max-w-7xl mx-auto px-8 py-10 grid grid-cols-12 gap-8">
            <div className="col-span-3 border-r border-[#C6A15D]/20 pr-6 space-y-3">
              <span className="text-[10px] font-bold tracking-[0.25em] text-[#84642C] uppercase">
                Couture Pavilions
              </span>
              <ul className="space-y-2 text-sm font-medium">
                <li><Link to="/shop?category=sarees" className="hover:text-[#3E1A1E] block py-1">Varanasi &amp; Kanchipuram Sarees</Link></li>
                <li><Link to="/shop?category=lehengas" className="hover:text-[#3E1A1E] block py-1 font-bold text-[#3E1A1E]">Bridal &amp; Festive Lehengas</Link></li>
                <li><Link to="/shop?category=kurta-sets" className="hover:text-[#3E1A1E] block py-1">Embroidered Kurta Sets</Link></li>
                <li><Link to="/shop?category=anarkalis" className="hover:text-[#3E1A1E] block py-1">Floor-Length Anarkalis</Link></li>
                <li><Link to="/shop?category=accessories" className="hover:text-[#3E1A1E] block py-1">Zari Potlis &amp; Dupattas</Link></li>
              </ul>
            </div>

            <div className="col-span-3 border-r border-[#C6A15D]/20 pr-6 space-y-3">
              <span className="text-[10px] font-bold tracking-[0.25em] text-[#84642C] uppercase">
                Curated by Occasion
              </span>
              <ul className="space-y-2 text-sm text-zinc-700">
                <li><Link to="/shop?occasion=Bridal" className="hover:text-[#3E1A1E] block py-1">Pheras &amp; Wedding Ceremonies</Link></li>
                <li><Link to="/shop?occasion=Sangeet" className="hover:text-[#3E1A1E] block py-1">Sangeet &amp; Cocktail Soirées</Link></li>
                <li><Link to="/shop?occasion=Mehendi" className="hover:text-[#3E1A1E] block py-1">Mehendi &amp; Haldi Celebrations</Link></li>
                <li><Link to="/shop?occasion=Reception" className="hover:text-[#3E1A1E] block py-1">Grand Reception Elegance</Link></li>
              </ul>
            </div>

            <div className="col-span-3 border-r border-[#C6A15D]/20 pr-6 space-y-3">
              <span className="text-[10px] font-bold tracking-[0.25em] text-[#84642C] uppercase">
                Pure Weaves
              </span>
              <ul className="space-y-2 text-sm text-zinc-700">
                <li><Link to="/shop?fabric=Pure+Katan+Silk" className="hover:text-[#3E1A1E] block py-1">Pure Katan Silk Jacquard</Link></li>
                <li><Link to="/shop?fabric=Royal+Velvet" className="hover:text-[#3E1A1E] block py-1">Jewelled Velvet with Zardozi</Link></li>
                <li><Link to="/shop?fabric=Chanderi+Silk" className="hover:text-[#3E1A1E] block py-1">Chanderi &amp; Tissue Organza</Link></li>
                <li><Link to="/shop?fabric=Georgette" className="hover:text-[#3E1A1E] block py-1">Lucknowi Chikankari Mukaish</Link></li>
              </ul>
            </div>

            <div className="col-span-3">
              <div className="relative rounded overflow-hidden aspect-[4/5] bg-zinc-900 group shadow-lg border border-[#C6A15D]/40">
                <img
                  src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80"
                  alt="Bridal Lookbook"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-5 flex flex-col justify-end">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[#DFC89D]">Haute Couture 2026</span>
                  <h4 className="font-serif text-xl text-white font-bold">The Royal Rajgharana Edit</h4>
                  <Link
                    to="/shop?category=lehengas"
                    className="mt-2 text-xs font-bold text-[#DFC89D] hover:text-white uppercase tracking-wider flex items-center gap-1"
                  >
                    <span>View Lookbook</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. FLIPKART-STYLE MOBILE SLIDE-OUT DRAWER */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] flex animate-fade-in">
          {/* Dark Backdrop (Tap to close) */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <div className="relative bg-[#FAF7F2] text-[#1A1A1A] w-[86%] max-w-sm h-full flex flex-col shadow-2xl border-r border-[#C6A15D]/40 overflow-hidden transform transition-transform duration-300 ease-out z-10">
            
            {/* Top Flipkart-Style Patron Header Banner */}
            <div
              className="p-5 text-white relative overflow-hidden border-b border-[#C6A15D]/40 shrink-0"
              style={{
                backgroundColor: '#26060C',
                backgroundImage:
                  'radial-gradient(ellipse at top left, rgba(198, 161, 93, 0.28) 0%, transparent 70%), linear-gradient(180deg, #380C14 0%, #22050A 100%)'
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-zinc-300 hover:text-white bg-white/10 hover:bg-white/20 border border-[#C6A15D]/30 transition-all active:scale-95"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-[#DFC89D]" />
              </button>

              {user ? (
                <div className="flex items-start gap-3.5 pr-10">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C6A15D] to-[#84642C] text-[#1A080B] font-serif font-extrabold text-xl flex items-center justify-center shadow-md border-2 border-white/20 shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wider text-[#DFC89D] font-semibold">Namaste,</p>
                    <h3 className="font-serif font-bold text-lg text-white truncate leading-tight">{user.name}</h3>
                    <p className="text-xs text-zinc-300 truncate mt-0.5">{user.email}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#C6A15D]/20 text-[#DFC89D] border border-[#C6A15D]/40">
                        <Crown className="w-3 h-3 text-[#C6A15D]" />
                        {user.role === 'ADMIN' ? 'Atelier Director' : 'Verified Patron'}
                      </span>
                      <Link
                        to="/account"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="text-[11px] font-bold text-[#DFC89D] hover:underline flex items-center gap-0.5"
                      >
                        <span>Profile</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Crown className="w-5 h-5 text-[#C6A15D]" />
                    <span className="font-serif text-lg font-bold tracking-wider text-white uppercase inline-block">
                      ETHNIZ<span className="text-[#DFC89D] font-light italic lowercase text-base font-serif">couture</span>
                    </span>
                  </div>
                  <p className="text-xs text-[#DFC89D]/90 font-serif">
                    Haute Indian Fashion &amp; Bridal Heirlooms
                  </p>
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="mt-3.5 inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gradient-to-r from-[#C6A15D] to-[#DFC89D] hover:from-[#DFC89D] hover:to-[#C6A15D] text-[#1A080B] font-bold text-xs uppercase tracking-widest rounded-lg shadow-md transition-all active:scale-98"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[#1A080B]" />
                    <span>Sign In / Register</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Scrollable Drawer Body with Flipkart Hierarchy */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-200/70">
              
              {/* SECTION 1: FLIPKART-STYLE QUICK ACTIONS */}
              <div className="p-3 grid grid-cols-2 gap-2 bg-white">
                <Link
                  to="/track-order"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg border border-[#E8DEC8] hover:border-[#C6A15D] bg-[#FAF7F2] flex items-center gap-2.5 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-[#3E1A1E] text-[#DFC89D] flex items-center justify-center shrink-0 shadow-xs">
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-zinc-900 group-hover:text-[#3E1A1E]">My Orders</span>
                    <span className="block text-[10px] text-zinc-500 truncate">Live Tracking</span>
                  </div>
                </Link>

                <Link
                  to={user ? "/account?tab=wishlist" : "/login?redirect=/account?tab=wishlist"}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg border border-[#E8DEC8] hover:border-[#C6A15D] bg-[#FAF7F2] flex items-center gap-2.5 transition-colors group relative"
                >
                  <div className="w-8 h-8 rounded-full bg-[#3E1A1E] text-[#DFC89D] flex items-center justify-center shrink-0 shadow-xs">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-zinc-900 group-hover:text-[#3E1A1E]">Wishlist</span>
                    <span className="block text-[10px] text-zinc-500 truncate">Saved ({wishlistCount})</span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsCartOpen(true);
                  }}
                  className="p-2.5 rounded-lg border border-[#E8DEC8] hover:border-[#C6A15D] bg-[#FAF7F2] flex items-center gap-2.5 transition-colors group text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-[#3E1A1E] text-[#DFC89D] flex items-center justify-center shrink-0 shadow-xs">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-zinc-900 group-hover:text-[#3E1A1E]">My Bag</span>
                    <span className="block text-[10px] text-zinc-500 truncate">{totalItemCount} items</span>
                  </div>
                </button>

                <a
                  href="https://wa.me/919820012345?text=Hello%20Ethniz%20Couture%20Atelier,%20I%20would%20like%20to%20consult%20with%20a%20bridal%20stylist."
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg border border-emerald-200 hover:border-emerald-400 bg-emerald-50/50 flex items-center gap-2.5 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-emerald-950">Stylist VIP</span>
                    <span className="block text-[10px] text-emerald-700 truncate">WhatsApp Chat</span>
                  </div>
                </a>
              </div>

              {/* SECTION 2: HAUTE COUTURE CATEGORIES */}
              <div className="py-3">
                <div className="px-5 pb-2 pt-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-[0.25em] text-[#84642C] uppercase">
                    Haute Couture Pavilions
                  </span>
                  <Sparkles className="w-3 h-3 text-[#C6A15D]" />
                </div>

                <div className="flex flex-col text-xs font-bold tracking-wider uppercase text-zinc-800">
                  <Link
                    to="/shop?category=sarees"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-5 py-3.5 hover:bg-white flex items-center justify-between border-b border-zinc-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-[#C6A15D]" />
                      <span>Sarees (Varanasi &amp; Kanchi)</span>
                    </div>
                    <span className="text-[9px] bg-[#FAF7F2] text-[#84642C] px-2 py-0.5 rounded border border-[#C6A15D]/40 font-semibold tracking-normal normal-case">
                      Pure Silk
                    </span>
                  </Link>

                  <Link
                    to="/shop?category=lehengas"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-5 py-3.5 hover:bg-white flex items-center justify-between border-b border-zinc-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-[#3E1A1E]" />
                      <span>Bridal &amp; Festive Lehengas</span>
                    </div>
                    <span className="text-[9px] bg-red-50 text-red-800 px-2 py-0.5 rounded border border-red-200 font-semibold tracking-normal normal-case">
                      👑 Royal Edit
                    </span>
                  </Link>

                  <Link
                    to="/shop?occasion=Bridal"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-5 py-3.5 hover:bg-white flex items-center justify-between border-b border-zinc-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-[#C6A15D]" />
                      <span>Bridal Pavilion</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </Link>

                  <Link
                    to="/shop?category=kurta-sets"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-5 py-3.5 hover:bg-white flex items-center justify-between border-b border-zinc-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-zinc-400" />
                      <span>Kurta Sets &amp; Anarkalis</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </Link>

                  <Link
                    to="/shop?gender=MEN"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-5 py-3.5 hover:bg-white flex items-center justify-between border-b border-zinc-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-zinc-400" />
                      <span>Royal Menswear</span>
                    </div>
                    <span className="text-[9px] bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200 font-semibold tracking-normal normal-case">
                      Sherwanis
                    </span>
                  </Link>

                  <Link
                    to="/shop?category=accessories"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-5 py-3.5 hover:bg-white flex items-center justify-between border-b border-zinc-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-zinc-400" />
                      <span>Heirloom Potlis &amp; Jewelry</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </Link>

                  <Link
                    to="/shop?sort=newest"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-5 py-3.5 hover:bg-white flex items-center justify-between border-b border-zinc-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>New Arrivals 2026</span>
                    </div>
                    <span className="text-[9px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-bold tracking-normal normal-case">
                      ✨ Fresh
                    </span>
                  </Link>

                  <Link
                    to="/shop"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-5 py-3.5 hover:bg-white flex items-center justify-between transition-colors font-extrabold text-[#3E1A1E]"
                  >
                    <span>View All Collections &amp; Edits</span>
                    <ArrowRight className="w-4 h-4 text-[#C6A15D]" />
                  </Link>
                </div>
              </div>

              {/* SECTION 3: ATELIER & ASSISTANCE */}
              <div className="py-3">
                <div className="px-5 pb-2 pt-1">
                  <span className="text-[10px] font-bold tracking-[0.25em] text-[#84642C] uppercase">
                    Atelier &amp; Concierge
                  </span>
                </div>

                <div className="flex flex-col text-xs font-semibold uppercase tracking-wider text-zinc-700">
                  <Link
                    to="/about"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-5 py-3 hover:bg-white flex items-center justify-between border-b border-zinc-100"
                  >
                    <span>Our Heritage &amp; Artisans</span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </Link>

                  <Link
                    to="/contact"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-5 py-3 hover:bg-white flex items-center justify-between border-b border-zinc-100"
                  >
                    <span>Bridal Studio &amp; Appointments</span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/atelier-portal"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-5 py-3 text-amber-900 font-bold flex items-center justify-between bg-amber-50"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-700" />
                        <span>Atelier Director Portal</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-amber-700" />
                    </Link>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Drawer Footer: Trust Mark & Sign Out */}
            <div className="p-4 bg-white border-t border-[#C6A15D]/30 shrink-0 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-600">
                <div className="flex items-center gap-1.5 font-medium">
                  <Truck className="w-3.5 h-3.5 text-[#C6A15D]" />
                  <span>Blue Dart Air Shipping</span>
                </div>
                <span className="font-bold text-[#3E1A1E]">INR (₹)</span>
              </div>

              <div className="flex items-center gap-2 p-2 rounded bg-[#FAF7F2] border border-[#C6A15D]/25 text-[10px] text-zinc-600">
                <ShieldCheck className="w-4 h-4 text-[#C6A15D] shrink-0" />
                <span>100% Silk Mark Certified &amp; Hallmarked Bullion Zari</span>
              </div>

              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                    navigate('/');
                  }}
                  className="w-full py-2.5 text-center text-xs font-bold uppercase tracking-wider text-red-700 hover:bg-red-50 rounded border border-red-200 transition-colors"
                >
                  Sign Out of Atelier
                </button>
              ) : null}
            </div>

          </div>
        </div>
      )}

      {/* 5. SEARCH OVERLAY MODAL */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
          <div className="bg-[#FAF7F2] rounded-xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 border border-[#C6A15D]/50 relative animate-fade-in text-[#1A1A1A]">
            <button
              onClick={() => setIsSearchOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full text-zinc-600 hover:text-[#3E1A1E] bg-white/80 hover:bg-white shadow-xs border border-[#C6A15D]/30 transition-all hover:scale-105 active:scale-95"
              aria-label="Close search"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-xs font-bold tracking-[0.25em] text-[#84642C] uppercase mb-2">
              Atelier Archive Search
            </div>

            <form onSubmit={handleSearchSubmit} className="relative mt-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C6A15D]" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by weave, fabric, collection, or attire (e.g., Banarasi, Velvet, Saree)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-white border border-[#E8DEC8] rounded-lg focus:outline-none focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30 text-zinc-900 placeholder:text-zinc-400 text-sm shadow-xs transition-all"
              />
            </form>

            {/* Live Search Results */}
            {isSearching && (
              <div className="py-6 text-center text-xs tracking-wider uppercase text-zinc-500">
                Searching royal archives...
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="mt-4 divide-y divide-zinc-100 max-h-80 overflow-y-auto">
                {searchResults.map((product) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.slug}`}
                    onClick={() => setIsSearchOpen(false)}
                    className="flex items-center gap-4 py-3 hover:bg-white px-3 rounded transition-colors"
                  >
                    <img
                      src={product.images[0]?.url || 'https://via.placeholder.com/80'}
                      alt={product.name}
                      className="w-12 h-16 object-cover rounded shadow-xs"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{product.name}</p>
                      <p className="text-xs text-[#84642C]">{product.fabric || product.gender}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#3E1A1E]">{formatPrice(product.price)}</p>
                      {product.comparePrice && (
                        <p className="text-xs text-zinc-400 line-through">{formatPrice(product.comparePrice)}</p>
                      )}
                    </div>
                  </Link>
                ))}
                <div className="pt-3 text-center">
                  <button
                    onClick={handleSearchSubmit}
                    className="text-xs font-bold tracking-wider text-[#3E1A1E] uppercase hover:underline"
                  >
                    View All Results ({searchResults.length}+)
                  </button>
                </div>
              </div>
            )}

            {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
              <div className="py-6 text-center text-sm text-zinc-500">
                No couture pieces found matching "{searchQuery}". Try searching for 'Saree', 'Lehenga', or 'Silk'.
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
