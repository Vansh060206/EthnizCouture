import React, { useState } from 'react';
import { X, Ruler } from 'lucide-react';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  gender?: 'WOMEN' | 'MEN' | 'UNISEX';
}

export const SizeGuideModal: React.FC<SizeGuideModalProps> = ({ isOpen, onClose, gender = 'WOMEN' }) => {
  const [activeTab, setActiveTab] = useState<'inches' | 'cm'>('inches');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div 
        className="relative bg-[#FAF7F2] rounded-t-[28px] sm:rounded-xl shadow-2xl max-w-2xl w-full p-5 sm:p-8 border-t sm:border border-[#C6A15D]/40 max-h-[90vh] overflow-y-auto animate-scale-up"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-zinc-300 rounded-full mx-auto mb-3 sm:hidden" />
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#E8DEC8]">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 bg-[#3E1A1E] rounded-lg text-[#DFC89D] border border-[#C6A15D]/30 shrink-0">
              <Ruler className="w-4 h-4 text-[#DFC89D]" />
            </div>
            <h3 className="font-serif text-lg sm:text-2xl font-bold text-zinc-900">
              Atelier Sizing Guide
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-zinc-600 hover:text-[#3E1A1E] bg-white/90 hover:bg-white shadow-xs border border-[#C6A15D]/30 transition-all hover:scale-105 active:scale-95"
            aria-label="Close size guide"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Unit Toggle */}
        <div className="flex justify-end gap-2 mt-4 mb-3">
          <button
            onClick={() => setActiveTab('inches')}
            className={`h-9 px-4 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'inches'
                ? 'bg-[#3E1A1E] text-[#DFC89D] border border-[#C6A15D]/50 shadow-xs'
                : 'bg-white text-zinc-700 border border-[#E8DEC8] hover:border-[#3E1A1E]'
            }`}
          >
            Inches (in)
          </button>
          <button
            onClick={() => setActiveTab('cm')}
            className={`h-9 px-4 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'cm'
                ? 'bg-[#3E1A1E] text-[#DFC89D] border border-[#C6A15D]/50 shadow-xs'
                : 'bg-white text-zinc-700 border border-[#E8DEC8] hover:border-[#3E1A1E]'
            }`}
          >
            Centimeters (cm)
          </button>
        </div>

        {/* Size Tables */}
        {gender === 'MEN' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-zinc-800 border-collapse">
              <thead>
                <tr className="bg-[#2D080E] text-gold-300 font-serif text-sm">
                  <th className="p-2.5">Size</th>
                  <th className="p-2.5">Chest</th>
                  <th className="p-2.5">Waist</th>
                  <th className="p-2.5">Shoulder</th>
                  <th className="p-2.5">Length (Kurta)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                <tr>
                  <td className="p-2.5 font-bold">38 (S)</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '38"' : '96 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '32"' : '81 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '17.5"' : '44 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '40"' : '101 cm'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold">40 (M)</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '40"' : '101 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '34"' : '86 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '18"' : '46 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '42"' : '106 cm'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold">42 (L)</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '42"' : '106 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '36"' : '91 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '18.5"' : '47 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '44"' : '112 cm'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold">44 (XL)</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '44"' : '112 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '38"' : '96 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '19"' : '48 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '44"' : '112 cm'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-zinc-800 border-collapse">
              <thead>
                <tr className="bg-[#2D080E] text-gold-300 font-serif text-sm">
                  <th className="p-2.5">Size</th>
                  <th className="p-2.5">Bust</th>
                  <th className="p-2.5">Waist</th>
                  <th className="p-2.5">Hip</th>
                  <th className="p-2.5">Skirt Length</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                <tr>
                  <td className="p-2.5 font-bold">XS (32)</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '32"' : '81 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '26"' : '66 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '36"' : '91 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '42"' : '106 cm'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold">S (34)</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '34"' : '86 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '28"' : '71 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '38"' : '96 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '42"' : '106 cm'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold">M (36)</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '36"' : '91 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '30"' : '76 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '40"' : '101 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '43"' : '109 cm'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold">L (38)</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '38"' : '96 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '32"' : '81 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '42"' : '106 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '43"' : '109 cm'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold">XL (40)</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '40"' : '101 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '34"' : '86 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '44"' : '112 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '43"' : '109 cm'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold">XXL (42)</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '42"' : '106 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '36"' : '91 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '46"' : '117 cm'}</td>
                  <td className="p-2.5">{activeTab === 'inches' ? '43"' : '109 cm'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Note */}
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 leading-relaxed">
          <strong>Bespoke Bridal Tailoring:</strong> All EthnizCouture lehengas and sherwanis come with 2-inch internal side seam allowances for effortless tailoring adjustments. Our concierge is available on WhatsApp for custom measurement consultations.
        </div>

      </div>
    </div>
  );
};
