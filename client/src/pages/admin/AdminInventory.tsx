import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Package, Search, AlertTriangle, Check, Save } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const AdminInventory: React.FC = () => {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const lowStockOnlyParam = searchParams.get('lowStockOnly') === 'true';

  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingStock, setEditingStock] = useState<Record<string, number>>({});

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/inventory', {
        params: {
          search: search.trim() || undefined,
          lowStockOnly: lowStockOnlyParam ? 'true' : undefined
        }
      });
      const items = res.data.inventory || [];
      setInventory(items);

      // Initialize local stock map
      const stockMap: Record<string, number> = {};
      items.forEach((i: any) => {
        stockMap[i.id] = i.stock;
      });
      setEditingStock(stockMap);
    } catch (err) {
      showToast('Failed to load inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [lowStockOnlyParam]);

  const handleStockChange = (id: string, value: number) => {
    setEditingStock((prev) => ({
      ...prev,
      [id]: Math.max(0, value)
    }));
  };

  const handleSaveStock = async (id: string) => {
    const newStock = editingStock[id];
    try {
      await api.put(`/admin/inventory/${id}/stock`, { stock: newStock });
      showToast('Stock quantity updated in database', 'success');
      setInventory((prev) =>
        prev.map((item) => (item.id === id ? { ...item, stock: newStock } : item))
      );
    } catch (err) {
      showToast('Failed to update stock', 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
          Inventory & Stock Management
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Monitor SKU inventory levels, configure buffer thresholds, and prevent checkout stockouts.
        </p>
      </div>

      {/* Control Bar */}
      <div className="bg-[#1C060E] p-4 rounded-lg border border-gold-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchInventory();
          }}
          className="flex gap-2 flex-1 max-w-sm"
        >
          <input
            type="text"
            placeholder="Search by SKU or garment name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none focus:border-gold-500"
          />
          <button
            type="submit"
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-bold uppercase"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockOnlyParam}
              onChange={(e) =>
                setSearchParams(e.target.checked ? { lowStockOnly: 'true' } : {})
              }
              className="accent-maroon-800 w-4 h-4"
            />
            <span>Show Low Stock Alert Items (&le; 5)</span>
          </label>
        </div>

      </div>

      {/* Inventory Table & Mobile Cards */}
      <div className="bg-[#1C060E] rounded-lg border border-gold-900/40 overflow-hidden shadow-md">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-black/40 text-gold-300 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3">Garment</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Category</th>
                <th className="p-3">Price</th>
                <th className="p-3">Current Stock</th>
                <th className="p-3">Status</th>
                <th className="p-3">Inline Stock Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    Loading inventory records...
                  </td>
                </tr>
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    No matching inventory items found.
                  </td>
                </tr>
              ) : (
                inventory.map((item) => {
                  const img = item.images?.[0]?.url || 'https://via.placeholder.com/60';
                  const currentLocalStock = editingStock[item.id] !== undefined ? editingStock[item.id] : item.stock;
                  const hasChanged = currentLocalStock !== item.stock;

                  return (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={img}
                            alt={item.name}
                            className="w-10 h-12 object-cover rounded bg-zinc-800 shrink-0"
                          />
                          <div className="min-w-0 max-w-xs">
                            <p className="font-semibold text-white truncate">{item.name}</p>
                            <p className="text-[11px] text-zinc-400">{item.gender}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 font-mono font-bold text-zinc-400">{item.sku}</td>

                      <td className="p-3 text-zinc-300">{item.category?.name}</td>

                      <td className="p-3 font-serif font-bold text-white">
                        ₹{item.price.toLocaleString('en-IN')}
                      </td>

                      <td className="p-3 font-bold text-sm">
                        <span
                          className={
                            item.stock === 0
                              ? 'text-red-400'
                              : item.stock <= 5
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }
                        >
                          {item.stock}
                        </span>
                      </td>

                      <td className="p-3">
                        {item.stock === 0 ? (
                          <span className="px-2 py-0.5 bg-red-950 text-red-300 border border-red-800 rounded text-[10px] font-bold uppercase">
                            Out of Stock
                          </span>
                        ) : item.stock <= 5 ? (
                          <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-max">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span>Low Stock Alert</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded text-[10px] font-bold uppercase">
                            Optimal
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center border border-zinc-700 rounded bg-black/40 text-xs">
                            <button
                              type="button"
                              onClick={() => handleStockChange(item.id, currentLocalStock - 1)}
                              className="px-2.5 py-1 text-zinc-400 hover:text-white"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={currentLocalStock}
                              onChange={(e) => handleStockChange(item.id, parseInt(e.target.value, 10) || 0)}
                              className="w-14 text-center bg-transparent font-mono font-bold text-white focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleStockChange(item.id, currentLocalStock + 1)}
                              className="px-2.5 py-1 text-zinc-400 hover:text-white"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSaveStock(item.id)}
                            disabled={!hasChanged}
                            className={`p-1.5 rounded transition-all ${
                              hasChanged
                                ? 'bg-maroon-800 text-white hover:bg-maroon-700 shadow'
                                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                            }`}
                            title="Commit Stock Update"
                          >
                            <Save className="w-3.5 h-3.5" />
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
              <p className="text-xs">Loading inventory records...</p>
            </div>
          ) : inventory.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              <p className="font-bold text-zinc-300 text-sm">No Inventory Items Found</p>
            </div>
          ) : (
            inventory.map((item) => {
              const img = item.images?.[0]?.url || 'https://via.placeholder.com/60';
              const currentLocalStock = editingStock[item.id] !== undefined ? editingStock[item.id] : item.stock;
              const hasChanged = currentLocalStock !== item.stock;

              return (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={img}
                      alt={item.name}
                      className="w-14 h-18 object-cover rounded bg-zinc-800 shrink-0 border border-zinc-700"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-white text-xs leading-snug line-clamp-1">{item.name}</h4>
                          <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{item.sku} · {item.category?.name}</p>
                        </div>
                        {item.stock === 0 ? (
                          <span className="px-2 py-0.5 bg-red-950 text-red-300 border border-red-800 rounded text-[10px] font-bold uppercase shrink-0">
                            Out of Stock
                          </span>
                        ) : item.stock <= 5 ? (
                          <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded text-[10px] font-bold uppercase flex items-center gap-1 shrink-0">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span>Low Stock</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded text-[10px] font-bold uppercase shrink-0">
                            Optimal
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="font-serif font-bold text-white text-sm">
                          ₹{item.price.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-zinc-400">
                          Current: <strong className="text-white">{item.stock} units</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stock Stepper & Save */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                    <span className="text-xs font-semibold text-zinc-400">Quick Adjust:</span>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center border border-zinc-700 rounded-lg bg-black/40 text-xs h-9">
                        <button
                          type="button"
                          onClick={() => handleStockChange(item.id, currentLocalStock - 1)}
                          className="w-8 h-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 active:bg-white/20 font-bold"
                          aria-label="Decrease stock"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={currentLocalStock}
                          onChange={(e) => handleStockChange(item.id, parseInt(e.target.value, 10) || 0)}
                          className="w-14 text-center bg-transparent font-mono font-bold text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleStockChange(item.id, currentLocalStock + 1)}
                          className="w-8 h-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 active:bg-white/20 font-bold"
                          aria-label="Increase stock"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaveStock(item.id)}
                        disabled={!hasChanged}
                        className={`h-9 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                          hasChanged
                            ? 'bg-maroon-800 text-white hover:bg-maroon-700 shadow-md cursor-pointer'
                            : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                        }`}
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};
