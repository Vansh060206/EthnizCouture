import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  X,
  Upload,
  Sparkles,
  Star
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Product, Category } from '../../types';

export const AdminProducts: React.FC = () => {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(() => sessionStorage.getItem('ethniz_admin_products_search') || '');
  const [categoryFilter, setCategoryFilter] = useState(() => sessionStorage.getItem('ethniz_admin_products_category') || 'ALL');
  const [stockFilter, setStockFilter] = useState(() => sessionStorage.getItem('ethniz_admin_products_stock') || 'ALL');

  useEffect(() => {
    sessionStorage.setItem('ethniz_admin_products_search', search);
  }, [search]);

  useEffect(() => {
    sessionStorage.setItem('ethniz_admin_products_category', categoryFilter);
  }, [categoryFilter]);

  useEffect(() => {
    sessionStorage.setItem('ethniz_admin_products_stock', stockFilter);
  }, [stockFilter]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    details: '',
    fabric: 'Pure Silk',
    careInstructions: 'Dry clean only.',
    gender: 'WOMEN',
    categoryId: '',
    price: '',
    comparePrice: '',
    stock: '10',
    availableSizes: 'XS,S,M,L,XL,XXL',
    availableColors: '',
    tags: 'Handloom,Festive,Bridal',
    isFeatured: false,
    isBestSeller: false,
    isNewArrival: true,
    isActive: true,
    images: [] as { url: string; altText: string; isPrimary: boolean; order: number }[]
  });

  // Image upload input state
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/admin/products', {
          params: {
            search: search.trim() || undefined,
            category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
            stockStatus: stockFilter !== 'ALL' ? stockFilter : undefined,
            limit: 50
          }
        }),
        api.get('/categories')
      ]);

      setProducts(prodRes.data.products || []);
      setCategories(catRes.data.categories || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load products catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [categoryFilter, stockFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCatalog();
  };

  const openAddModal = () => {
    setEditingProductId(null);
    setFormData({
      name: '',
      sku: '',
      description: '',
      details: 'Handcrafted on traditional pit looms.',
      fabric: 'Pure Silk',
      careInstructions: 'Dry clean only. Store wrapped in cotton.',
      gender: 'WOMEN',
      categoryId: categories[0]?.id || '',
      price: '',
      comparePrice: '',
      stock: '10',
      availableSizes: 'XS,S,M,L,XL,XXL',
      availableColors: 'Royal Crimson,Gold Zari',
      tags: 'Silk,Festive,Handmade',
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      isActive: true,
      images: []
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProductId(p.id);
    setFormData({
      name: p.name,
      sku: p.sku,
      description: p.description,
      details: p.details || '',
      fabric: p.fabric || 'Pure Silk',
      careInstructions: p.careInstructions || 'Dry clean only.',
      gender: p.gender,
      categoryId: p.categoryId,
      price: String(p.price),
      comparePrice: p.comparePrice ? String(p.comparePrice) : '',
      stock: String(p.stock),
      availableSizes: p.availableSizes || 'XS,S,M,L,XL,XXL',
      availableColors: p.availableColors || '',
      tags: p.tags || '',
      isFeatured: p.isFeatured,
      isBestSeller: p.isBestSeller,
      isNewArrival: p.isNewArrival,
      isActive: p.isActive,
      images: (p.images || []).map((img, idx) => ({
        url: img.url,
        altText: img.altText || p.name,
        isPrimary: img.isPrimary !== undefined ? img.isPrimary : idx === 0,
        order: img.order || idx
      }))
    });
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    const data = new FormData();
    data.append('file', file);

    try {
      const res = await api.post('/admin/media/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data.url;
      setFormData((prev) => ({
        ...prev,
        images: [
          ...prev.images,
          {
            url,
            altText: prev.name || 'Product Image',
            isPrimary: prev.images.length === 0,
            order: prev.images.length
          }
        ]
      }));
      showToast('Image uploaded successfully', 'success');
    } catch (err: any) {
      showToast('Failed to upload image file', 'error');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    setFormData((prev) => ({
      ...prev,
      images: [
        ...prev.images,
        {
          url: newImageUrl.trim(),
          altText: prev.name || 'Product Image',
          isPrimary: prev.images.length === 0,
          order: prev.images.length
        }
      ]
    }));
    setNewImageUrl('');
  };

  const handleRemoveImage = (idx: number) => {
    setFormData((prev) => {
      const updated = prev.images.filter((_, i) => i !== idx);
      if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
        updated[0].isPrimary = true;
      }
      return { ...prev, images: updated };
    });
  };

  const handleSetPrimaryImage = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.map((img, i) => ({ ...img, isPrimary: i === idx }))
    }));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price || !formData.categoryId) {
      showToast('Please provide Product Name, Price, and Category.', 'error');
      return;
    }

    if (formData.images.length === 0) {
      showToast('Please upload or attach at least 1 image for the garment.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (editingProductId) {
        await api.put(`/admin/products/${editingProductId}`, formData);
        showToast('Piece updated in catalog', 'success');
      } else {
        await api.post('/admin/products', formData);
        showToast('New couture piece published successfully', 'success');
      }
      setIsModalOpen(false);
      fetchCatalog();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save product', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await api.post(`/admin/products/${id}/duplicate`);
      showToast(`Duplicated as "${res.data.product.name}"`, 'success');
      fetchCatalog();
    } catch (err) {
      showToast('Failed to duplicate piece', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Permanently delete "${name}" from store database?`)) return;
    try {
      await api.delete(`/admin/products/${id}`);
      showToast('Piece removed from store', 'info');
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      showToast('Failed to delete piece', 'error');
    }
  };

  const toggleActiveStatus = async (p: Product) => {
    try {
      const updatedStatus = !p.isActive;
      await api.put(`/admin/products/${p.id}`, { isActive: updatedStatus });
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, isActive: updatedStatus } : item))
      );
      showToast(`Product ${updatedStatus ? 'activated' : 'hidden from storefront'}`, 'success');
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
            Product Catalog Management
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Add, update, curate, and publish handcrafted pieces to your live storefront.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-maroon-800 hover:bg-maroon-700 text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow self-start transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Control Bar: Search & Facet Filters */}
      <div className="bg-[#1C060E] p-4 rounded-lg border border-gold-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search by name, SKU, or fabric..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white placeholder:text-zinc-500 focus:outline-none focus:border-gold-500"
          />
          <button
            type="submit"
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-bold uppercase"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-black/40 border border-zinc-700 rounded text-zinc-200 focus:outline-none focus:border-gold-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-3 py-2 bg-black/40 border border-zinc-700 rounded text-zinc-200 focus:outline-none focus:border-gold-500"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="LOW_STOCK">Low Stock (&le; 5)</option>
            <option value="OUT_OF_STOCK">Out of Stock (0)</option>
          </select>
        </div>

      </div>

      {/* Products Data Table & Mobile Cards */}
      <div className="bg-[#1C060E] rounded-lg border border-gold-900/40 overflow-hidden shadow-md">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-black/40 text-gold-300 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Category</th>
                <th className="p-3">Price</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Tags</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500">
                    Loading pieces from vault...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500">
                    No products found matching query. Click "Add New Product" to create one.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const img = p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url || 'https://via.placeholder.com/60';
                  return (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={img}
                            alt={p.name}
                            className="w-10 h-13 object-cover rounded bg-zinc-800 shrink-0"
                          />
                          <div className="min-w-0 max-w-xs">
                            <p className="font-semibold text-white truncate">{p.name}</p>
                            <p className="text-[11px] text-zinc-400">{p.fabric || p.gender}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 font-mono text-[11px] text-zinc-400">{p.sku}</td>

                      <td className="p-3 text-zinc-300">{p.category?.name || 'Couture'}</td>

                      <td className="p-3">
                        <span className="font-serif font-bold text-white">
                          ₹{p.price.toLocaleString('en-IN')}
                        </span>
                        {p.comparePrice && (
                          <span className="block text-[10px] text-zinc-500 line-through">
                            ₹{p.comparePrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <span
                          className={`font-bold ${
                            p.stock === 0
                              ? 'text-red-400'
                              : p.stock <= 5
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {p.stock} units
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="flex gap-1">
                          {p.isFeatured && (
                            <span className="px-1.5 py-0.5 bg-gold-950 text-gold-300 border border-gold-800 rounded text-[9px] font-bold uppercase">
                              Featured
                            </span>
                          )}
                          {p.isBestSeller && (
                            <span className="px-1.5 py-0.5 bg-maroon-950 text-maroon-300 border border-maroon-800 rounded text-[9px] font-bold uppercase">
                              Bestseller
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3">
                        <button
                          onClick={() => toggleActiveStatus(p)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            p.isActive
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-600'
                          }`}
                        >
                          {p.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-zinc-400 hover:text-gold-300 hover:bg-white/10 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDuplicate(p.id)}
                            className="p-1.5 text-zinc-400 hover:text-emerald-300 hover:bg-white/10 rounded"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-white/10 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-zinc-800">
          {loading ? (
            <div className="p-8 text-center text-zinc-500 space-y-2">
              <div className="w-5 h-5 border-2 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading pieces from vault...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 space-y-2">
              <p className="font-bold text-zinc-300 text-sm">No Products Found</p>
              <p className="text-xs">No products match your query. Click "Add New Product" to create one.</p>
            </div>
          ) : (
            products.map((p) => {
              const img = p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url || 'https://via.placeholder.com/60';
              return (
                <div key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={img}
                      alt={p.name}
                      className="w-14 h-18 object-cover rounded bg-zinc-800 shrink-0 border border-zinc-700"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-white text-xs leading-snug line-clamp-1">{p.name}</h4>
                          <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{p.sku} · {p.category?.name || 'Couture'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleActiveStatus(p)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                            p.isActive
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-600'
                          }`}
                        >
                          {p.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </div>

                      <div className="mt-2 flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-serif font-bold text-white text-sm">
                            ₹{p.price.toLocaleString('en-IN')}
                          </span>
                          {p.comparePrice && (
                            <span className="text-[10px] text-zinc-500 line-through">
                              ₹{p.comparePrice.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            p.stock === 0
                              ? 'text-red-400'
                              : p.stock <= 5
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {p.stock} in stock
                        </span>
                      </div>

                      <div className="mt-1 flex gap-1">
                        {p.isFeatured && (
                          <span className="px-1.5 py-0.2 bg-gold-950 text-gold-300 border border-gold-800 rounded text-[9px] font-bold uppercase">
                            Featured
                          </span>
                        )}
                        {p.isBestSeller && (
                          <span className="px-1.5 py-0.2 bg-maroon-950 text-maroon-300 border border-maroon-800 rounded text-[9px] font-bold uppercase">
                            Bestseller
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-gold-300 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(p.id)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-emerald-300 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Duplicate</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id, p.name)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-red-400 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1C060E] rounded-lg shadow-2xl max-w-4xl w-full p-6 sm:p-8 border border-gold-900/60 max-h-[90vh] overflow-y-auto space-y-6">
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-serif text-2xl font-bold text-white">
                {editingProductId ? 'Edit Couture Piece' : 'Add New Atelier Piece'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              
              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Maroon Velvet Heritage Bridal Lehenga"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                    SKU (Auto-generated if empty)
                  </label>
                  <input
                    type="text"
                    placeholder="EC-LEH-009"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500 font-mono"
                  />
                </div>
              </div>

              {/* Category, Gender, Fabric */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                    Department
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
                  >
                    <option value="WOMEN">Women’s Couture</option>
                    <option value="MEN">Royal Menswear</option>
                    <option value="UNISEX">Unisex / Heirloom</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                    Fabric Weave
                  </label>
                  <input
                    type="text"
                    placeholder="Pure Katan Silk / Velvet"
                    value={formData.fabric}
                    onChange={(e) => setFormData({ ...formData, fabric: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              {/* Price, Compare Price, Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                    Selling Price (₹ INR) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="18999"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                    Original / Compare Price (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="24500"
                    value={formData.comparePrice}
                    onChange={(e) => setFormData({ ...formData, comparePrice: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                    Stock Inventory Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="10"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500 font-mono"
                  />
                </div>
              </div>

              {/* Sizes, Colors, Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                    Available Sizes (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.availableSizes}
                    onChange={(e) => setFormData({ ...formData, availableSizes: e.target.value })}
                    placeholder="XS,S,M,L,XL,XXL"
                    className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                    Available Colors (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.availableColors}
                    onChange={(e) => setFormData({ ...formData, availableColors: e.target.value })}
                    placeholder="Royal Crimson,Emerald"
                    className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                    Search Tags
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="Banarasi,Zari,Bridal"
                    className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              {/* Description & Details */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                  Product Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Artisanal narrative detailing the weave, motif, occasion, and royal heritage..."
                  className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              {/* Multi-Image Management & Upload */}
              <div className="p-4 bg-black/40 rounded-lg border border-zinc-800 space-y-3">
                <label className="block font-bold uppercase tracking-wider text-gold-300">
                  Product Imagery Gallery ({formData.images.length} Images Attached)
                </label>

                {/* Upload or Add URL */}
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <div className="relative flex-1 w-full">
                    <input
                      type="text"
                      placeholder="Paste Image URL (https://...)"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-bold uppercase shrink-0"
                  >
                    Add URL
                  </button>

                  <label className="px-4 py-2 bg-maroon-900 hover:bg-maroon-800 text-gold-200 rounded font-bold uppercase cursor-pointer shrink-0 flex items-center gap-1.5 border border-gold-900/60">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingFile ? 'Uploading...' : 'Upload File'}</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                {/* Images Preview Grid */}
                {formData.images.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {formData.images.map((img, idx) => (
                      <div
                        key={idx}
                        className={`relative w-24 h-32 rounded overflow-hidden border-2 bg-zinc-900 group ${
                          img.isPrimary ? 'border-gold-500 ring-2 ring-gold-500' : 'border-zinc-700'
                        }`}
                      >
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        
                        {img.isPrimary && (
                          <span className="absolute top-1 left-1 bg-gold-600 text-black text-[9px] font-bold px-1 rounded uppercase">
                            Primary
                          </span>
                        )}

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                          {!img.isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(idx)}
                              className="px-1.5 py-0.5 bg-gold-600 text-black text-[9px] font-bold rounded"
                            >
                              Set Primary
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="px-1.5 py-0.5 bg-red-800 text-white text-[9px] font-bold rounded"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="accent-maroon-800 w-4 h-4"
                  />
                  <span>Featured Collection</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isBestSeller}
                    onChange={(e) => setFormData({ ...formData, isBestSeller: e.target.checked })}
                    className="accent-maroon-800 w-4 h-4"
                  />
                  <span>Bestseller</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isNewArrival}
                    onChange={(e) => setFormData({ ...formData, isNewArrival: e.target.checked })}
                    className="accent-maroon-800 w-4 h-4"
                  />
                  <span>New In</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="accent-maroon-800 w-4 h-4"
                  />
                  <span>Published & Active on Website</span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-7 py-2.5 bg-maroon-800 hover:bg-maroon-700 text-white rounded font-bold uppercase tracking-wider shadow"
                >
                  {isSaving ? 'Publishing...' : editingProductId ? 'Save Updates' : 'Publish Product'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
