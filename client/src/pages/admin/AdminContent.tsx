import React, { useState, useEffect } from 'react';
import { Sliders, Save, Sparkles, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Banner } from '../../types';

export const AdminContent: React.FC = () => {
  const { showToast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Editable forms
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementId, setAnnouncementId] = useState<string | null>(null);

  const [heroForm, setHeroForm] = useState({
    id: '',
    title: '',
    subtitle: '',
    buttonText: '',
    buttonLink: '',
    imageUrl: '',
    tag: ''
  });

  const [festiveForm, setFestiveForm] = useState({
    id: '',
    title: '',
    subtitle: '',
    buttonText: '',
    buttonLink: '',
    imageUrl: '',
    tag: ''
  });

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/banners');
      const list: Banner[] = res.data.banners || [];
      setBanners(list);

      const ann = list.find((b) => b.key === 'announcement');
      if (ann) {
        setAnnouncementId(ann.id);
        setAnnouncementText(ann.title);
      }

      const hero = list.find((b) => b.key === 'hero');
      if (hero) {
        setHeroForm({
          id: hero.id,
          title: hero.title,
          subtitle: hero.subtitle || '',
          buttonText: hero.buttonText || '',
          buttonLink: hero.buttonLink || '',
          imageUrl: hero.imageUrl || '',
          tag: hero.tag || ''
        });
      }

      const festive = list.find((b) => b.key === 'festive_spotlight');
      if (festive) {
        setFestiveForm({
          id: festive.id,
          title: festive.title,
          subtitle: festive.subtitle || '',
          buttonText: festive.buttonText || '',
          buttonLink: festive.buttonLink || '',
          imageUrl: festive.imageUrl || '',
          tag: festive.tag || ''
        });
      }
    } catch (err) {
      showToast('Failed to load store banners', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;

    setSavingKey('announcement');
    try {
      if (announcementId) {
        await api.put(`/admin/banners/${announcementId}`, {
          title: announcementText.trim()
        });
      } else {
        await api.post('/admin/banners', {
          key: 'announcement',
          title: announcementText.trim(),
          order: 1,
          isActive: true
        });
      }
      showToast('Announcement bar updated on live website!', 'success');
      fetchBanners();
    } catch (err) {
      showToast('Failed to update announcement bar', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveHero = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey('hero');
    try {
      if (heroForm.id) {
        await api.put(`/admin/banners/${heroForm.id}`, heroForm);
      } else {
        await api.post('/admin/banners', { ...heroForm, key: 'hero', order: 1 });
      }
      showToast('Homepage hero banner published to live storefront!', 'success');
      fetchBanners();
    } catch (err) {
      showToast('Failed to save hero banner', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveFestive = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey('festive');
    try {
      if (festiveForm.id) {
        await api.put(`/admin/banners/${festiveForm.id}`, festiveForm);
      } else {
        await api.post('/admin/banners', { ...festiveForm, key: 'festive_spotlight', order: 2 });
      }
      showToast('Festive editorial banner updated on live storefront!', 'success');
      fetchBanners();
    } catch (err) {
      showToast('Failed to save festive banner', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
          Homepage & Visual Content CMS
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Customize headlines, promotional announcement ribbons, and seasonal lookbook banners without touching code.
        </p>
      </div>

      {/* 1. ANNOUNCEMENT BAR EDITOR */}
      <div className="bg-[#1C060E] p-6 rounded-lg border border-gold-900/40 shadow-md space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span>Storefront Top Announcement Ribbon</span>
          </h3>
          <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded uppercase font-bold">
            Live On Site
          </span>
        </div>

        <form onSubmit={handleSaveAnnouncement} className="space-y-3">
          <div>
            <label className="block font-bold text-zinc-300 uppercase tracking-wider mb-1">
              Announcement Message
            </label>
            <input
              type="text"
              required
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="e.g. Complimentary Pan-India Shipping on Orders Above ₹2,999"
              className="w-full px-3.5 py-2.5 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500 font-medium"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingKey === 'announcement'}
              className="px-5 py-2 bg-maroon-800 hover:bg-maroon-700 text-white rounded font-bold uppercase tracking-wider flex items-center gap-1.5 shadow"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingKey === 'announcement' ? 'Updating...' : 'Publish Announcement'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. HERO BANNER EDITOR */}
      <div className="bg-[#1C060E] p-6 rounded-lg border border-gold-900/40 shadow-md space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-gold-400" />
            <span>Homepage Hero Banner & Main Title</span>
          </h3>
          <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded uppercase font-bold">
            Primary Screen
          </span>
        </div>

        <form onSubmit={handleSaveHero} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Headline (Major Serif Title) *
              </label>
              <input
                type="text"
                required
                value={heroForm.title}
                onChange={(e) => setHeroForm({ ...heroForm, title: e.target.value })}
                className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500 font-serif text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Tag / Collection Badge
              </label>
              <input
                type="text"
                value={heroForm.tag}
                onChange={(e) => setHeroForm({ ...heroForm, tag: e.target.value })}
                placeholder="Festive 2026 Haute Couture"
                className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-zinc-300 uppercase tracking-wider mb-1">
              Subheading Narrative
            </label>
            <textarea
              rows={2}
              value={heroForm.subtitle}
              onChange={(e) => setHeroForm({ ...heroForm, subtitle: e.target.value })}
              className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Background Image URL (High-Res 1920x1080)
              </label>
              <input
                type="text"
                value={heroForm.imageUrl}
                onChange={(e) => setHeroForm({ ...heroForm, imageUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500 font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-300 uppercase tracking-wider mb-1">
                CTA Button Text
              </label>
              <input
                type="text"
                value={heroForm.buttonText}
                onChange={(e) => setHeroForm({ ...heroForm, buttonText: e.target.value })}
                placeholder="EXPLORE COUTURE"
                className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500 uppercase"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingKey === 'hero'}
              className="px-6 py-2.5 bg-maroon-800 hover:bg-maroon-700 text-white rounded font-bold uppercase tracking-wider flex items-center gap-1.5 shadow"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingKey === 'hero' ? 'Publishing...' : 'Save Hero Banner'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. FESTIVE SPOTLIGHT BANNER EDITOR */}
      <div className="bg-[#1C060E] p-6 rounded-lg border border-gold-900/40 shadow-md space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span>Festive Pavilion Spotlight Section</span>
          </h3>
          <span className="text-[10px] bg-gold-950 text-gold-300 border border-gold-800 px-2 py-0.5 rounded uppercase font-bold">
            Editorial Feature
          </span>
        </div>

        <form onSubmit={handleSaveFestive} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Section Title *
              </label>
              <input
                type="text"
                required
                value={festiveForm.title}
                onChange={(e) => setFestiveForm({ ...festiveForm, title: e.target.value })}
                className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500 font-serif text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Feature Tag
              </label>
              <input
                type="text"
                value={festiveForm.tag}
                onChange={(e) => setFestiveForm({ ...festiveForm, tag: e.target.value })}
                placeholder="Editorial Showcase 2026"
                className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-zinc-300 uppercase tracking-wider mb-1">
              Editorial Description
            </label>
            <textarea
              rows={2}
              value={festiveForm.subtitle}
              onChange={(e) => setFestiveForm({ ...festiveForm, subtitle: e.target.value })}
              className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Editorial Image URL
              </label>
              <input
                type="text"
                value={festiveForm.imageUrl}
                onChange={(e) => setFestiveForm({ ...festiveForm, imageUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500 font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Target Link URL
              </label>
              <input
                type="text"
                value={festiveForm.buttonLink}
                onChange={(e) => setFestiveForm({ ...festiveForm, buttonLink: e.target.value })}
                placeholder="/shop?collection=royal-heritage-wedding"
                className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500 font-mono text-[11px]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingKey === 'festive'}
              className="px-6 py-2.5 bg-maroon-800 hover:bg-maroon-700 text-white rounded font-bold uppercase tracking-wider flex items-center gap-1.5 shadow"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingKey === 'festive' ? 'Publishing...' : 'Save Festive Pavilion'}</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};
