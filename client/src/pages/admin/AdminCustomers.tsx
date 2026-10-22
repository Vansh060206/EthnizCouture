import React, { useState, useEffect } from 'react';
import { Users, Search, ShoppingBag, IndianRupee, Calendar, Eye, Download } from 'lucide-react';
import api from '../../services/api';

export const AdminCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/customers', {
        params: { search: search.trim() || undefined }
      });
      setCustomers(res.data.customers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleExportNewsletter = async () => {
    setIsExporting(true);
    try {
      const res = await api.get('/admin/newsletter/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ethniz_newsletter_subscribers_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export newsletter subscribers', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
            Client Directory & Patron Loyalty
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Review client purchase frequency, lifetime atelier expenditure, and order histories.
          </p>
        </div>

        <button
          onClick={handleExportNewsletter}
          disabled={isExporting}
          className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-[#DFC89D] border border-[#C6A15D]/40 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors self-start shadow-sm"
        >
          <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} />
          <span>{isExporting ? 'Exporting...' : 'Export Newsletter CSV'}</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-[#1C060E] p-4 rounded-lg border border-gold-900/40">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
          <input
            type="text"
            placeholder="Search by patron name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 bg-black/40 border border-zinc-700 rounded text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-gold-500"
          />
          <button
            type="submit"
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs font-bold uppercase"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-[#1C060E] rounded-lg border border-gold-900/40 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-black/40 text-gold-300 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3">Patron Name</th>
                <th className="p-3">Contact Email</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Joined Date</th>
                <th className="p-3">Orders</th>
                <th className="p-3">Lifetime Spend</th>
                <th className="p-3">Last Purchase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    Loading customer directory...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    No customers registered yet.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-semibold text-white">{c.name}</td>
                    <td className="p-3 text-zinc-300">{c.email}</td>
                    <td className="p-3 text-zinc-400">{c.phone || '—'}</td>
                    <td className="p-3 text-zinc-400">
                      {new Date(c.joinedAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="p-3 font-bold text-white">{c.orderCount} orders</td>
                    <td className="p-3 font-serif font-bold text-gold-300 text-sm">
                      ₹{c.totalSpent.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-zinc-400">
                      {c.lastOrderDate
                        ? new Date(c.lastOrderDate).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric'
                          })
                        : 'No orders yet'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
