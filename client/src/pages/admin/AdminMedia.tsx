import React, { useState, useEffect } from 'react';
import { Upload, Copy, Trash2, Check, Image as ImageIcon, Search } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { MediaAsset } from '../../types';

export const AdminMedia: React.FC = () => {
  const { showToast } = useToast();
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/media');
      setMedia(res.data.media || []);
    } catch (err) {
      showToast('Failed to load media assets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const data = new FormData();
    data.append('file', file);

    try {
      const res = await api.post('/admin/media/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast('Media asset uploaded successfully', 'success');
      fetchMedia();
    } catch (err) {
      showToast('Failed to upload image file', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyUrl = (url: string, id: string) => {
    const fullUrl = window.location.origin + url;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    showToast('Asset URL copied to clipboard', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this media asset permanently?')) return;
    try {
      await api.delete(`/admin/media/${id}`);
      showToast('Asset deleted', 'info');
      setMedia((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      showToast('Failed to delete asset', 'error');
    }
  };

  const filtered = media.filter((m) =>
    m.originalName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
            Media Asset Vault & Storage
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Store high-resolution photography, weave macros, and banner assets. Copy URLs directly into products.
          </p>
        </div>

        <label className="px-4 py-2.5 bg-maroon-800 hover:bg-maroon-700 text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow self-start">
          <Upload className="w-4 h-4" />
          <span>{isUploading ? 'Uploading...' : 'Upload Media File'}</span>
          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {/* Search */}
      <div className="bg-[#1C060E] p-4 rounded-lg border border-gold-900/40">
        <div className="relative max-w-sm">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search uploaded files by filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-black/40 border border-zinc-700 rounded text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-gold-500"
          />
        </div>
      </div>

      {/* Media Grid */}
      <div className="bg-[#1C060E] p-6 rounded-lg border border-gold-900/40 shadow-md">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500 uppercase tracking-widest">
            Loading media library...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <ImageIcon className="w-10 h-10 text-zinc-600 mx-auto" />
            <p className="font-serif text-lg font-bold text-zinc-300">No Media Files</p>
            <p className="text-xs text-zinc-500">Upload high-resolution photography using the button above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filtered.map((asset) => (
              <div
                key={asset.id}
                className="bg-black/40 rounded-lg border border-zinc-800 overflow-hidden flex flex-col justify-between group hover:border-gold-500 transition-colors shadow-xs"
              >
                <div className="aspect-[3/4] bg-zinc-900 relative overflow-hidden">
                  <img
                    src={asset.url}
                    alt={asset.originalName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                    <button
                      onClick={() => handleCopyUrl(asset.url, asset.id)}
                      className="p-2 bg-gold-600 text-black rounded shadow hover:bg-gold-500"
                      title="Copy Public Asset URL"
                    >
                      {copiedId === asset.id ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="p-2 bg-red-800 text-white rounded shadow hover:bg-red-700"
                      title="Delete Asset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-2.5 text-[11px] text-zinc-400 truncate">
                  <p className="font-medium text-white truncate" title={asset.originalName}>
                    {asset.originalName}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {Math.round(asset.size / 1024)} KB
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
