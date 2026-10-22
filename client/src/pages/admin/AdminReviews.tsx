import React, { useState, useEffect } from 'react';
import { Star, CheckCircle2, EyeOff, Trash2, Filter } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const AdminReviews: React.FC = () => {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [ratingFilter, setRatingFilter] = useState('');

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/reviews', {
        params: {
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          rating: ratingFilter || undefined
        }
      });
      setReviews(res.data.reviews || []);
    } catch (err) {
      showToast('Failed to load reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [statusFilter, ratingFilter]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/admin/reviews/${id}/status`, { status });
      showToast(`Review marked as ${status}`, 'success');
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (err) {
      showToast('Failed to update review status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this customer review permanently?')) return;
    try {
      await api.delete(`/admin/reviews/${id}`);
      showToast('Review deleted', 'info');
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      showToast('Failed to delete review', 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
          Client Reviews & Moderation
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Moderate verified buyer feedback, inspect quality ratings, and remove inappropriate entries.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#1C060E] p-4 rounded-lg border border-gold-900/40 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <label className="text-zinc-400 font-bold uppercase">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none"
          >
            <option value="ALL">All Reviews</option>
            <option value="APPROVED">Approved / Published</option>
            <option value="HIDDEN">Hidden</option>
            <option value="PENDING">Pending Moderation</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-zinc-400 font-bold uppercase">Rating:</label>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-3 py-1.5 bg-black/40 border border-zinc-700 rounded text-white focus:outline-none"
          >
            <option value="">All Star Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-[#1C060E] rounded-lg border border-gold-900/40 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-black/40 text-gold-300 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Rating</th>
                <th className="p-3">Review Feedback</th>
                <th className="p-3">Verified</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    Loading reviews...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    No reviews found matching the selected filter.
                  </td>
                </tr>
              ) : (
                reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-semibold text-white max-w-xs truncate">
                      {r.product?.name || 'Product'}
                    </td>

                    <td className="p-3">
                      <p className="font-medium text-zinc-200">{r.user?.name}</p>
                      <p className="text-[10px] text-zinc-500">{r.user?.email}</p>
                    </td>

                    <td className="p-3">
                      <div className="flex text-amber-400">
                        {[...Array(r.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400" />
                        ))}
                      </div>
                    </td>

                    <td className="p-3 max-w-sm">
                      <p className="font-bold text-white truncate">{r.title}</p>
                      <p className="text-zinc-400 line-clamp-2 mt-0.5">{r.comment}</p>
                    </td>

                    <td className="p-3">
                      {r.isVerifiedPurchase ? (
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">
                          ✓ Verified
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500 uppercase">Unverified</span>
                      )}
                    </td>

                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          r.status === 'APPROVED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-600'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.status !== 'APPROVED' ? (
                          <button
                            onClick={() => handleUpdateStatus(r.id, 'APPROVED')}
                            className="px-2.5 py-1 bg-emerald-900 hover:bg-emerald-800 text-emerald-100 rounded text-[11px] font-bold uppercase"
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(r.id, 'HIDDEN')}
                            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-bold uppercase"
                          >
                            Hide
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
