import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Tags, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Category, Collection } from '../../types';

export const AdminCategories: React.FC = () => {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  // Category Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({
    name: '',
    description: '',
    image: '',
    featured: false
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, colRes] = await Promise.all([
        api.get('/categories'),
        api.get('/categories/collections')
      ]);
      setCategories(catRes.data.categories || []);
      setCollections(colRes.data.collections || []);
    } catch (err) {
      showToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingCatId(null);
    setCatForm({ name: '', description: '', image: '', featured: false });
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCatId(cat.id);
    setCatForm({
      name: cat.name,
      description: cat.description || '',
      image: cat.image || '',
      featured: cat.featured
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;

    try {
      if (editingCatId) {
        await api.put(`/admin/categories/${editingCatId}`, catForm);
        showToast('Category updated', 'success');
      } else {
        await api.post('/admin/categories', catForm);
        showToast('Category created', 'success');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save category', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete category "${name}"? Products under this category will need re-assigning.`)) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      showToast('Category deleted', 'info');
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      showToast('Failed to delete category', 'error');
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
            Categories & Editorial Curations
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Organize store architecture into sarees, lehengas, bridal pavilions, and festive collections.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-maroon-800 hover:bg-maroon-700 text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2 self-start shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Category</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-[#1C060E] rounded-lg border border-gold-900/40 overflow-hidden shadow-md flex flex-col justify-between"
          >
            <div className="aspect-[16/10] bg-zinc-900 relative">
              <img
                src={cat.image || 'https://via.placeholder.com/400x250'}
                alt={cat.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                <span className="font-serif text-lg font-bold text-white">{cat.name}</span>
                <span className="text-[10px] bg-black/60 px-2 py-0.5 rounded text-gold-300 font-mono">
                  {cat._count?.products || 0} products
                </span>
              </div>
            </div>

            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between text-xs">
              <p className="text-zinc-400 line-clamp-2">{cat.description || 'Heirloom collection'}</p>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-zinc-400">
                <span className="text-[10px] uppercase font-bold text-gold-500">
                  {cat.featured ? '★ Featured On Home' : 'Standard'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="p-1 hover:text-white"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="p-1 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Collections Section */}
      <div className="bg-[#1C060E] p-6 rounded-lg border border-gold-900/40 space-y-4">
        <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gold-400" />
          <span>Curated Festive & Bridal Collections</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {collections.map((col) => (
            <div key={col.id} className="p-4 bg-black/40 rounded border border-zinc-800 space-y-2 text-xs">
              <span className="font-serif text-base font-bold text-gold-300">{col.name}</span>
              <p className="text-zinc-400 leading-relaxed">{col.tagline}</p>
              <p className="text-[11px] text-zinc-500">Slug: <span className="font-mono text-zinc-300">/shop?collection={col.slug}</span></p>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1C060E] rounded-lg shadow-2xl max-w-md w-full p-6 border border-gold-900/60 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-serif text-xl font-bold text-white">
                {editingCatId ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarees, Lehengas"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                  Cover Image URL
                </label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={catForm.image}
                  onChange={(e) => setCatForm({ ...catForm, image: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Artisanal description of this category..."
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={catForm.featured}
                    onChange={(e) => setCatForm({ ...catForm, featured: e.target.checked })}
                    className="accent-maroon-800 w-4 h-4"
                  />
                  <span>Feature as key tile on Homepage</span>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded uppercase font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-maroon-800 text-white rounded uppercase font-bold"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
