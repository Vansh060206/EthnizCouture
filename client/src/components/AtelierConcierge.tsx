import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Crown, 
  MessageCircle, 
  Compass, 
  Ruler, 
  Phone, 
  X, 
  Sparkles, 
  Globe, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useCurrency, CURRENCIES, CurrencyCode } from '../context/CurrencyContext';

export const AtelierConcierge: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="fixed bottom-6 right-6 z-40">
      
      {/* Floating Concierge Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group px-4 py-3 bg-[#3E1A1E] text-[#DFC89D] rounded-full shadow-2xl border border-[#C6A15D]/60 flex items-center gap-2.5 hover:scale-105 transition-all duration-300"
          title="Atelier Concierge"
        >
          <div className="w-6 h-6 rounded-full bg-[#C6A15D]/20 flex items-center justify-center border border-[#C6A15D]/40">
            <Crown className="w-3.5 h-3.5 text-[#DFC89D]" />
          </div>
          <span className="text-xs font-serif tracking-[0.2em] font-semibold uppercase text-[#FAF7F2]">
            Atelier Concierge
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </button>
      )}

      {/* Concierge Modal / Slide-Up Panel */}
      {isOpen && (
        <div className="bg-[#2B0C10] text-[#FAF7F2] w-80 sm:w-88 rounded-2xl shadow-2xl border border-[#C6A15D]/60 p-5 space-y-4 animate-fade-in relative backdrop-blur-md">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#C6A15D]/30">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#C6A15D]/20 flex items-center justify-center border border-[#C6A15D]/50">
                <Crown className="w-4 h-4 text-[#DFC89D]" />
              </div>
              <div>
                <h3 className="font-serif text-base font-normal text-white uppercase tracking-wider">Atelier Concierge</h3>
                <p className="text-[10px] text-[#DFC89D] uppercase tracking-widest font-mono">Private Styling &amp; Support</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Actions List */}
          <div className="space-y-2 text-xs">
            
            {/* WhatsApp Stylist */}
            <a
              href="https://wa.me/919876543210?text=Hello%20EthnizCouture,%20I%20would%20like%20assistance%20with%20bridal%20ensembles%20and%20sizing."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-600/40 text-emerald-200 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="font-bold block text-white">WhatsApp Atelier Stylist</span>
                  <span className="text-[10px] text-emerald-300">Live replies from New Delhi atelier</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </a>

            {/* Track Order */}
            <Link
              to="/track-order"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between p-3 rounded-lg bg-black/40 hover:bg-black/70 border border-gold-500/30 text-zinc-200 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Compass className="w-4 h-4 text-gold-400" />
                <div>
                  <span className="font-bold block text-white">Track Your Consignment</span>
                  <span className="text-[10px] text-zinc-400">Milestone timeline by Order ID</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gold-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Book Styling Appointment */}
            <Link
              to="/contact"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between p-3 rounded-lg bg-black/40 hover:bg-black/70 border border-gold-500/30 text-zinc-200 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-gold-400" />
                <div>
                  <span className="font-bold block text-white">Book Video Consultation</span>
                  <span className="text-[10px] text-zinc-400">1-on-1 private bridal styling</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gold-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Currency & Pricing Info */}
            <div className="p-3 rounded-lg bg-black/40 border border-gold-500/30 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-gold-400 font-bold flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>Currency &amp; Pricing</span>
              </span>
              <span className="text-xs font-bold text-white font-mono">INR (₹)</span>
            </div>

          </div>

          {/* Direct Atelier Hotline */}
          <div className="pt-2 border-t border-gold-500/20 text-center">
            <p className="text-[10px] text-zinc-400">Private Patron Desk (10 AM - 9 PM IST)</p>
            <a
              href="tel:+911149827700"
              className="font-mono text-xs text-gold-300 font-bold hover:text-white flex items-center justify-center gap-1 mt-0.5"
            >
              <Phone className="w-3 h-3 text-gold-400" />
              <span>+91 11 4982 7700</span>
            </a>
          </div>

        </div>
      )}

    </div>
  );
};
