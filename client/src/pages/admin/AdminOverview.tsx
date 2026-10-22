import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  ShoppingBag,
  Clock,
  Users,
  AlertTriangle,
  Star,
  ArrowRight,
  TrendingUp,
  PackageCheck
} from 'lucide-react';
import api from '../../services/api';

export const AdminOverview: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/stats');
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch admin dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-zinc-400 tracking-widest uppercase">
        Computing Store Metrics & Revenue Analytics...
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const recentOrders = data?.recentOrders || [];
  const topProducts = data?.topProducts || [];
  const categorySales = data?.categorySales || [];

  return (
    <div className="space-y-8">
      
      {/* Title */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
          Store Analytics & Real-Time Performance
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Track sales volumes, inventory velocity, and client fulfillment metrics.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Total Revenue */}
        <div className="bg-[#1C060E] p-4 rounded-lg border border-gold-900/40 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-gold-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Revenue</span>
            <IndianRupee className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <p className="font-serif text-2xl font-bold text-white">
              ₹{(metrics.totalRevenue || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>Verified Paid Orders</span>
            </p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-[#1C060E] p-4 rounded-lg border border-gold-900/40 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-gold-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Orders</span>
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <p className="font-serif text-2xl font-bold text-white">{metrics.totalOrders || 0}</p>
            <Link to="/atelier-portal/orders" className="text-[10px] text-gold-400 hover:underline">
              View Master Pipeline →
            </Link>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="bg-[#1C060E] p-4 rounded-lg border border-gold-900/40 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Pending Orders</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <p className="font-serif text-2xl font-bold text-amber-300">{metrics.pendingOrders || 0}</p>
            <p className="text-[10px] text-zinc-400">Awaiting packaging / dispatch</p>
          </div>
        </div>

        {/* Customers */}
        <div className="bg-[#1C060E] p-4 rounded-lg border border-gold-900/40 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-gold-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Patrons</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <p className="font-serif text-2xl font-bold text-white">{metrics.totalCustomers || 0}</p>
            <Link to="/atelier-portal/customers" className="text-[10px] text-gold-400 hover:underline">
              Manage Client Directory →
            </Link>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-[#1C060E] p-4 rounded-lg border border-gold-900/40 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-red-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Low Stock (&le; 5)</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <p className="font-serif text-2xl font-bold text-red-300">{metrics.lowStockProducts || 0}</p>
            <Link to="/atelier-portal/inventory?lowStockOnly=true" className="text-[10px] text-red-400 hover:underline">
              Restock Items →
            </Link>
          </div>
        </div>

        {/* Reviews */}
        <div className="bg-[#1C060E] p-4 rounded-lg border border-gold-900/40 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-gold-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Reviews</span>
            <Star className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <p className="font-serif text-2xl font-bold text-white">{metrics.totalReviews || 0}</p>
            <Link to="/atelier-portal/reviews" className="text-[10px] text-gold-400 hover:underline">
              Moderate Reviews →
            </Link>
          </div>
        </div>

      </div>

      {/* Grid: Category Sales + Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Category Sales Distribution (7 cols) */}
        <div className="lg:col-span-7 bg-[#1C060E] p-6 rounded-lg border border-gold-900/40 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h3 className="font-serif text-lg font-bold text-white">
              Category Sales Volume & Velocity
            </h3>
            <Link to="/atelier-portal/categories" className="text-xs text-gold-400 hover:underline">
              Manage Categories
            </Link>
          </div>

          <div className="space-y-3">
            {categorySales.map((cat: any) => {
              const highestRev = Math.max(...categorySales.map((c: any) => c.revenue), 1);
              const barWidth = Math.min(100, Math.round((cat.revenue / highestRev) * 100));

              return (
                <div key={cat.id} className="space-y-1 text-xs">
                  <div className="flex justify-between text-zinc-300">
                    <span className="font-semibold text-white">{cat.name}</span>
                    <span className="text-gold-400 font-serif">
                      ₹{cat.revenue.toLocaleString('en-IN')} ({cat.unitsSold} units)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-maroon-700 h-full rounded-full transition-all duration-500"
                      style={{ width: `${barWidth || 5}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Selling Products (5 cols) */}
        <div className="lg:col-span-5 bg-[#1C060E] p-6 rounded-lg border border-gold-900/40 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h3 className="font-serif text-lg font-bold text-white">
              Leading Bridal & Festive Attires
            </h3>
            <Link to="/atelier-portal/products" className="text-xs text-gold-400 hover:underline">
              All Products
            </Link>
          </div>

          <div className="divide-y divide-zinc-800/80">
            {topProducts.map((p: any) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={p.image || 'https://via.placeholder.com/60'}
                    alt={p.name}
                    className="w-10 h-12 object-cover rounded bg-zinc-800 shrink-0"
                  />
                  <div className="truncate">
                    <p className="font-semibold text-zinc-200 truncate">{p.name}</p>
                    <p className="text-[11px] text-zinc-500">
                      Stock: <span className={p.stock <= 5 ? 'text-red-400 font-bold' : 'text-zinc-400'}>{p.stock}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-serif font-bold text-gold-300">₹{p.price.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-emerald-400">{p.totalUnitsSold} sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Recent Orders Master Feed */}
      <div className="bg-[#1C060E] p-6 rounded-lg border border-gold-900/40 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 className="font-serif text-lg font-bold text-white">
            Recent Client Orders
          </h3>
          <Link
            to="/atelier-portal/orders"
            className="text-xs font-bold uppercase tracking-wider text-gold-400 hover:underline flex items-center gap-1"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-black/40 text-gold-300 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3">Order Number</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Date</th>
                <th className="p-3">Items</th>
                <th className="p-3">Total</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Order Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {recentOrders.map((order: any) => (
                <tr key={order.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3 font-mono font-bold text-gold-300">
                    <Link to="/atelier-portal/orders" className="hover:underline">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="p-3 font-medium text-white">{order.customerName}</td>
                  <td className="p-3 text-zinc-400">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="p-3 text-zinc-400">{order.items?.length || 1} pieces</td>
                  <td className="p-3 font-serif font-bold text-white">
                    ₹{order.totalAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        order.paymentStatus === 'PAID'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-maroon-900 text-gold-200 border border-gold-900/60">
                      {order.orderStatus.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-zinc-800">
          {recentOrders.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4 text-center">No recent orders recorded.</p>
          ) : (
            recentOrders.map((order: any) => (
              <div key={order.id} className="py-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to="/atelier-portal/orders" className="font-mono font-bold text-gold-300 text-xs hover:underline">
                      {order.orderNumber}
                    </Link>
                    <p className="text-xs font-semibold text-white mt-0.5">{order.customerName}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      order.paymentStatus === 'PAID'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-zinc-400">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} · {order.items?.length || 1} pieces
                  </span>
                  <span className="font-serif font-bold text-white text-sm">
                    ₹{order.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
