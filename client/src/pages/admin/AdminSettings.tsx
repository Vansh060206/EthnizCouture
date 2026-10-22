import React, { useState } from 'react';
import { Settings, Save, ShieldCheck, Globe, DollarSign, Bell, Truck, Mail, Phone, Store } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const AdminSettings: React.FC = () => {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [settings, setSettings] = useState({
    storeName: 'EthnizCouture Haute Fashion House',
    tagline: 'Rooted in Indian Heritage. Designed for Modern Celebrations.',
    supportEmail: 'concierge@ethnizcouture.com',
    supportPhone: '+91 98200 88776',
    freeShippingThreshold: '2999',
    standardShippingFee: '250',
    expressShippingFee: '500',
    gstRate: '12',
    enableInternationalShipping: true,
    enableCod: true,
    enableGuestCheckout: true,
    enableWhatsAppTracking: true,
    currencyDefault: 'INR',
    maintenanceMode: false
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showToast('Store settings and policies saved successfully', 'success');
    }, 400);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
            Store & Atelier Configuration
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Global store policies, currency conversions, tax thresholds, and customer notifications.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 bg-[#C6A15D] hover:bg-[#AA8743] text-black rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow self-start transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Preserving...' : 'Save Configuration'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        
        {/* 1. General Atelier Identity */}
        <div className="bg-[#1C060E] p-6 rounded-lg border border-gold-900/40 space-y-4">
          <div className="flex items-center gap-2 text-gold-300 pb-2 border-b border-zinc-800">
            <Store className="w-4 h-4" />
            <h2 className="font-serif text-base font-bold text-white uppercase tracking-wider">
              Brand Identity & Contact
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                Store Title
              </label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                Brand Manifesto / Tagline
              </label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                Concierge Support Email
              </label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                Atelier WhatsApp Hotline
              </label>
              <input
                type="text"
                value={settings.supportPhone}
                onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>
        </div>

        {/* 2. Shipping & Thresholds */}
        <div className="bg-[#1C060E] p-6 rounded-lg border border-gold-900/40 space-y-4">
          <div className="flex items-center gap-2 text-gold-300 pb-2 border-b border-zinc-800">
            <Truck className="w-4 h-4" />
            <h2 className="font-serif text-base font-bold text-white uppercase tracking-wider">
              Transit & Logistics Rules
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                Free Shipping Threshold (₹)
              </label>
              <input
                type="number"
                value={settings.freeShippingThreshold}
                onChange={(e) => setSettings({ ...settings, freeShippingThreshold: e.target.value })}
                className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                Standard Shipping Fee (₹)
              </label>
              <input
                type="number"
                value={settings.standardShippingFee}
                onChange={(e) => setSettings({ ...settings, standardShippingFee: e.target.value })}
                className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                Insured Express Courier Fee (₹)
              </label>
              <input
                type="number"
                value={settings.expressShippingFee}
                onChange={(e) => setSettings({ ...settings, expressShippingFee: e.target.value })}
                className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-6 text-zinc-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableInternationalShipping}
                onChange={(e) => setSettings({ ...settings, enableInternationalShipping: e.target.checked })}
                className="accent-maroon-800 w-4 h-4"
              />
              <span>Enable International Express Transit (DHL / FedEx)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableCod}
                onChange={(e) => setSettings({ ...settings, enableCod: e.target.checked })}
                className="accent-maroon-800 w-4 h-4"
              />
              <span>Allow Cash on Delivery (COD) for Domestic Orders</span>
            </label>
          </div>
        </div>

        {/* 3. Taxes & Checkout Security */}
        <div className="bg-[#1C060E] p-6 rounded-lg border border-gold-900/40 space-y-4">
          <div className="flex items-center gap-2 text-gold-300 pb-2 border-b border-zinc-800">
            <ShieldCheck className="w-4 h-4" />
            <h2 className="font-serif text-base font-bold text-white uppercase tracking-wider">
              Taxes, Currency & Checkout
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                Standard Apparel GST Rate (%)
              </label>
              <input
                type="number"
                value={settings.gstRate}
                onChange={(e) => setSettings({ ...settings, gstRate: e.target.value })}
                className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                Base Store Currency
              </label>
              <select
                value={settings.currencyDefault}
                onChange={(e) => setSettings({ ...settings, currencyDefault: e.target.value })}
                className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
              >
                <option value="INR">INR (₹ - Indian Rupee)</option>
                <option value="USD">USD ($ - US Dollar)</option>
                <option value="GBP">GBP (£ - British Pound)</option>
                <option value="EUR">EUR (€ - Euro)</option>
                <option value="AED">AED (AED - UAE Dirham)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-6 text-zinc-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableGuestCheckout}
                onChange={(e) => setSettings({ ...settings, enableGuestCheckout: e.target.checked })}
                className="accent-maroon-800 w-4 h-4"
              />
              <span>Enable One-Click Guest Checkout Without Registration</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableWhatsAppTracking}
                onChange={(e) => setSettings({ ...settings, enableWhatsAppTracking: e.target.checked })}
                className="accent-maroon-800 w-4 h-4"
              />
              <span>Send Live Consignment Status via WhatsApp</span>
            </label>
          </div>
        </div>

      </form>
    </div>
  );
};
