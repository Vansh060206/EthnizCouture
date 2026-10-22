import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Award, Heart, ShieldCheck, ArrowRight } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="space-y-24 pb-24 bg-[#FAF7F2]">
      
      {/* 1. EDITORIAL HERO */}
      <section className="relative min-h-[70vh] flex items-center justify-center bg-[#2B0C10] text-[#FAF7F2] overflow-hidden py-28">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=2000&q=85"
            alt="Atelier Loom Heritage"
            className="w-full h-full object-cover opacity-35 filter brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2B0C10] via-black/40 to-black/60" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center space-y-5">
          <div className="inline-flex items-center justify-center p-2 rounded border border-[#C6A15D]/40 bg-[#3E1A1E]/80 backdrop-blur-xs mb-3">
            <img src="/logo-card.png" alt="EthnizCouture" className="h-12 w-auto object-contain" />
          </div>

          <span className="text-[11px] font-bold uppercase tracking-[0.35em] text-[#DFC89D] block">
            The Atelier Chronicles
          </span>

          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-normal tracking-tight text-[#FAF7F2] uppercase">
            ROOTED IN TRADITION.
          </h1>

          <p className="font-serif italic text-base sm:text-xl text-zinc-300 max-w-2xl mx-auto font-light leading-relaxed">
            Where centuries of hereditary Indian handloom mastery meet modern global couture silhouettes.
          </p>
        </div>
      </section>

      {/* 2. "DESIGNED FOR TODAY." — ALTERNATING EDITORIAL SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-[10px] font-bold tracking-[0.3em] text-[#C6A15D] uppercase">
            Philosophy
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl font-normal text-[#1A1A1A] tracking-tight uppercase">
            DESIGNED FOR TODAY.
          </h2>
          <div className="w-12 h-[1px] bg-[#C6A15D] mx-auto mt-4" />
        </div>

        {/* Story Part 1: Modern Silhouettes (Image Right, Text Left) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center mb-24">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-bold tracking-[0.25em] text-[#C6A15D] uppercase">
              The Genesis
            </span>
            <h3 className="font-serif text-2xl sm:text-4xl font-normal text-[#1A1A1A] leading-tight">
              Honoring Heritage, Reimagining Celebrations
            </h3>
            <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-light">
              In an era dominated by transient fast fashion, EthnizCouture was established as a sanctuary for slow, intentional haute couture. Every thread in our sarees, lehengas, and royal bandhgalas carries the pulse of generations-old weaving communities nestled along the sacred ghats of Varanasi, the temple towns of Tamil Nadu, and the regal ateliers of Awadh.
            </p>
            <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-light">
              We do not treat traditional textiles as antique relics, but as living, evolving art. We sculpt pure Katan silks and Italian micro-velvets into architectural cuts, lightweight silhouettes, and fluid drapes crafted for modern celebrations across London, New York, Dubai, and New Delhi.
            </p>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-[#C6A15D]/25">
              <div>
                <p className="font-serif text-3xl sm:text-4xl font-normal text-[#3E1A1E]">300+</p>
                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Master Karigars & Weavers</p>
              </div>
              <div>
                <p className="font-serif text-3xl sm:text-4xl font-normal text-[#3E1A1E]">100%</p>
                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Certified Silk Mark Purity</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="aspect-[4/5] rounded-lg overflow-hidden shadow-xl border border-[#C6A15D]/30 relative group">
              <img
                src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85"
                alt="Artisan embroidery in EthnizCouture atelier"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-103"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
              <div className="absolute bottom-6 left-6 right-6 text-white text-xs font-serif italic">
                “Every bullion stitch is placed with surgical devotion by our hereditary master craftsmen.”
              </div>
            </div>
          </div>
        </div>

        {/* Story Part 2: The Looms of Eternity (Image Left, Text Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="aspect-[4/5] rounded-lg overflow-hidden shadow-xl border border-[#C6A15D]/30 relative group">
              <img
                src="https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=85"
                alt="Royal Banarasi Silk Loom"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-103"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
              <div className="absolute bottom-6 left-6 right-6 text-white text-xs font-serif italic">
                “A single bridal Katan silk ensemble requires up to four hundred hours on the hand-operated jacquard pit loom.”
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
            <span className="text-xs font-bold tracking-[0.25em] text-[#C6A15D] uppercase">
              Artisanal Devotion
            </span>
            <h3 className="font-serif text-2xl sm:text-4xl font-normal text-[#1A1A1A] leading-tight">
              The Symphony of Handlooms & Metallic Zari
            </h3>
            <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-light">
              True Indian couture cannot be hurried. From the initial hand-drawn sketch to the final placement of pearl motis, our garments undergo a meticulous journey. We utilize only genuine gold and silver bullion electroplated wires, spun around pure mulberry silk cores.
            </p>
            <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-light">
              By working directly with master weavers without intermediaries, EthnizCouture guarantees that the craftspeople receive fair wages, comprehensive family healthcare, and the artistic autonomy they deserve to keep ancient techniques alive.
            </p>

            <div className="pt-4">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#3E1A1E] hover:bg-[#2B0C10] text-[#DFC89D] rounded text-xs font-bold uppercase tracking-widest transition-colors shadow-sm"
              >
                <span>EXPLORE HEIRLOOMS</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C6A15D]" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ARTISANAL PILLARS */}
      <section className="bg-white py-20 border-y border-[#C6A15D]/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-14 space-y-2">
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#C6A15D] uppercase">
              The Standard
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#1A1A1A] font-normal">
              The EthnizCouture Seal
            </h2>
            <div className="w-12 h-[1px] bg-[#C6A15D] mx-auto mt-3" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#FAF7F2] p-8 rounded-lg border border-[#C6A15D]/30 space-y-3">
              <Award className="w-7 h-7 text-[#C6A15D]" />
              <h3 className="font-serif text-lg font-semibold text-[#1A1A1A] uppercase tracking-wider">
                Geographical Authenticity
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-light">
                GI-certified handloom weaves straight from certified pit-loom clusters in Varanasi, Chanderi, and Kanchipuram.
              </p>
            </div>

            <div className="bg-[#FAF7F2] p-8 rounded-lg border border-[#C6A15D]/30 space-y-3">
              <Sparkles className="w-7 h-7 text-[#C6A15D]" />
              <h3 className="font-serif text-lg font-semibold text-[#1A1A1A] uppercase tracking-wider">
                Uncompromising Textiles
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-light">
                100% natural Mulberry silk warp, hallmarked metallic bullion zari, and royal Italian micro-velvets.
              </p>
            </div>

            <div className="bg-[#FAF7F2] p-8 rounded-lg border border-[#C6A15D]/30 space-y-3">
              <Heart className="w-7 h-7 text-[#C6A15D]" />
              <h3 className="font-serif text-lg font-semibold text-[#1A1A1A] uppercase tracking-wider">
                Karigar Dignity & Grants
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-light">
                Direct ethical compensation, comprehensive medical security, and apprentice grants for hereditary weaver youths.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. BRAND VISION STATEMENT */}
      <section className="max-w-4xl mx-auto px-4 text-center space-y-6 pt-6">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#C6A15D]">
          Our Enduring Creed
        </span>
        <blockquote className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A] italic leading-relaxed font-normal">
          “To position Indian haute couture on the premier stages of global fashion — not as folkloric costume, but as the pinnacle of wearable timeless art.”
        </blockquote>
        <p className="text-xs uppercase tracking-[0.25em] text-[#3E1A1E] font-bold">
          — The EthnizCouture Board of Curators
        </p>
      </section>

    </div>
  );
};
