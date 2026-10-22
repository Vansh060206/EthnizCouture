import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, Truck, RefreshCw, Send, Instagram, Facebook, Mail, Crown } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export const Footer: React.FC = () => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post('/content/newsletter', { email: newsletterEmail });
      showToast(res.data.message || 'Welcome to the EthnizCouture Inner Circle.', 'success');
      setNewsletterEmail('');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Subscription failed. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-[#2B0C10] text-[#FAF7F2] pt-16 pb-12 border-t border-[#C6A15D]/30 font-sans">
      
      {/* Brand Value Pillars */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 border-b border-[#C6A15D]/20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center sm:text-left">
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="p-3 bg-[#3E1A1E] rounded-full text-[#DFC89D] border border-[#C6A15D]/40 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif text-base text-[#DFC89D] font-semibold">Master Karigari</h4>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">Authentic handloom weaves, Awadhi zardozi, and royal gota patti.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="p-3 bg-[#3E1A1E] rounded-full text-[#DFC89D] border border-[#C6A15D]/40 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif text-base text-[#DFC89D] font-semibold">Insured Global Air Transit</h4>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">Complimentary delivery over ₹2,999. Worldwide express white-glove courier.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="p-3 bg-[#3E1A1E] rounded-full text-[#DFC89D] border border-[#C6A15D]/40 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif text-base text-[#DFC89D] font-semibold">GI Certified Purity</h4>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">Certified pure silk warp, genuine bullion zari, and hallmark authenticity.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="p-3 bg-[#3E1A1E] rounded-full text-[#DFC89D] border border-[#C6A15D]/40 shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif text-base text-[#DFC89D] font-semibold">Bespoke Fit &amp; Pickup</h4>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">Complimentary blouse tailor consultation and seamless 7-day pickup policy.</p>
            </div>
          </div>

        </div>
      </div>

      {/* Main Footer Links & Newsletter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
        
        {/* Brand Column with OFFICIAL LOGO ASSET */}
        <div className="lg:col-span-2 space-y-4 pr-4">
          <Link to="/" className="inline-block group" title="EthnizCouture">
            {/* Display the authentic official logo asset */}
            <div className="rounded-md border border-[#C6A15D]/40 p-2 bg-[#3E1A1E] inline-block shadow-md group-hover:border-[#C6A15D] transition-colors">
              <img
                src="/logo-card.png"
                alt="EthnizCouture"
                className="h-16 sm:h-20 w-auto object-contain"
              />
            </div>
          </Link>
          
          <p className="text-xs text-zinc-300 max-w-sm leading-relaxed font-light">
            EthnizCouture celebrates the transcendent majesty of Indian textiles, bringing hereditary looms from Varanasi, Kanchipuram, and Lucknow to modern ceremonial grandeur.
          </p>

          {/* Social Icons */}
          <div className="flex items-center space-x-3 pt-2">
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noreferrer" 
              className="w-8 h-8 rounded-full bg-[#3E1A1E] border border-[#C6A15D]/30 flex items-center justify-center text-[#DFC89D] hover:bg-[#C6A15D] hover:text-black transition-colors"
            >
              <Instagram className="w-3.5 h-3.5" />
            </a>
            <a 
              href="https://facebook.com" 
              target="_blank" 
              rel="noreferrer" 
              className="w-8 h-8 rounded-full bg-[#3E1A1E] border border-[#C6A15D]/30 flex items-center justify-center text-[#DFC89D] hover:bg-[#C6A15D] hover:text-black transition-colors"
            >
              <Facebook className="w-3.5 h-3.5" />
            </a>
            <a 
              href="mailto:concierge@ethnizcouture.com" 
              className="w-8 h-8 rounded-full bg-[#3E1A1E] border border-[#C6A15D]/30 flex items-center justify-center text-[#DFC89D] hover:bg-[#C6A15D] hover:text-black transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* 1. Shop Column */}
        <div>
          <h5 className="font-serif text-sm font-semibold tracking-[0.2em] text-[#DFC89D] uppercase mb-4">
            Shop
          </h5>
          <ul className="space-y-2.5 text-xs text-zinc-300">
            <li><Link to="/shop?category=sarees" className="hover:text-[#DFC89D] transition-colors">Varanasi &amp; Silk Sarees</Link></li>
            <li><Link to="/shop?category=lehengas" className="hover:text-[#DFC89D] transition-colors">Bridal &amp; Festive Lehengas</Link></li>
            <li><Link to="/shop?category=kurta-sets" className="hover:text-[#DFC89D] transition-colors">Kurta Sets &amp; Anarkalis</Link></li>
            <li><Link to="/shop?occasion=Bridal" className="hover:text-[#DFC89D] transition-colors">Bridal Troussier</Link></li>
            <li><Link to="/shop" className="hover:text-[#DFC89D] transition-colors">The Collections</Link></li>
            <li><Link to="/shop?sort=newest" className="hover:text-[#DFC89D] transition-colors">New Arrivals</Link></li>
          </ul>
        </div>

        {/* 2. About Column */}
        <div>
          <h5 className="font-serif text-sm font-semibold tracking-[0.2em] text-[#DFC89D] uppercase mb-4">
            About
          </h5>
          <ul className="space-y-2.5 text-xs text-zinc-300">
            <li><Link to="/about" className="hover:text-[#DFC89D] transition-colors">Our Story</Link></li>
            <li><Link to="/contact" className="hover:text-[#DFC89D] transition-colors">Contact Concierge</Link></li>
            <li><Link to="/about#heritage" className="hover:text-[#DFC89D] transition-colors">Loom Heritage</Link></li>
            <li><Link to="/contact#faq" className="hover:text-[#DFC89D] transition-colors">Frequently Asked</Link></li>
            <li><Link to="/track-order" className="hover:text-[#DFC89D] transition-colors">Track Consignment</Link></li>
          </ul>
        </div>

        {/* 3. Customer Care & Newsletter */}
        <div>
          <h5 className="font-serif text-sm font-semibold tracking-[0.2em] text-[#DFC89D] uppercase mb-4">
            Customer Care
          </h5>
          <ul className="space-y-2.5 text-xs text-zinc-300 mb-6">
            <li><Link to="/contact#shipping" className="hover:text-[#DFC89D] transition-colors">Shipping Information</Link></li>
            <li><Link to="/contact#returns" className="hover:text-[#DFC89D] transition-colors">Returns &amp; Alterations</Link></li>
            <li><Link to="/contact#privacy" className="hover:text-[#DFC89D] transition-colors">Privacy Policy</Link></li>
            <li><Link to="/contact#terms" className="hover:text-[#DFC89D] transition-colors">Terms of Service</Link></li>
          </ul>

          {/* Newsletter */}
          <h5 className="font-serif text-xs font-semibold tracking-[0.2em] text-[#DFC89D] uppercase mb-2">
            JOIN THE COUTURE
          </h5>
          <p className="text-[11px] text-zinc-400 mb-3 leading-relaxed">
            Invitations to private bridal showcases &amp; seasonal lookbooks.
          </p>
          <form onSubmit={handleNewsletterSubmit} className="space-y-2">
            <input
              type="email"
              placeholder="Your email address"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[#1C080B] border border-[#C6A15D]/40 rounded text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#C6A15D]"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-[#C6A15D] hover:bg-[#AA8743] text-zinc-950 text-xs font-bold tracking-widest uppercase rounded transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{isSubmitting ? 'Joining...' : 'JOIN THE COUTURE'}</span>
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>

      </div>

      {/* Bottom Legal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-[#C6A15D]/20 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-400 gap-4">
        <p>© {new Date().getFullYear()} EthnizCouture Haute Couture Pvt. Ltd. All rights reserved.</p>
        <div className="flex items-center space-x-6 text-[11px]">
          <Link to="/contact#privacy" className="hover:text-[#DFC89D]">Privacy</Link>
          <Link to="/contact#terms" className="hover:text-[#DFC89D]">Terms</Link>
          <Link to="/about" className="hover:text-[#DFC89D]">Authenticity Seal</Link>
        </div>
      </div>
    </footer>
  );
};
