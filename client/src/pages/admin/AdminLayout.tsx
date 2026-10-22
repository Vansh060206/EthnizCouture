import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  ListOrdered,
  Users,
  Star,
  Tags,
  TicketPercent,
  Sliders,
  Image,
  ExternalLink,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  Sparkles,
  MessageSquare,
  Settings as SettingsIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const NAV_ITEMS = [
  { path: '/atelier-portal', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/atelier-portal/products', label: 'Products', icon: ShoppingBag },
  { path: '/atelier-portal/inventory', label: 'Inventory', icon: Package },
  { path: '/atelier-portal/orders', label: 'Orders', icon: ListOrdered },
  { path: '/atelier-portal/inquiries', label: 'Inquiries', icon: MessageSquare, badgeKey: 'inquiries' },
  { path: '/atelier-portal/customers', label: 'Customers', icon: Users },
  { path: '/atelier-portal/reviews', label: 'Reviews', icon: Star },
  { path: '/atelier-portal/categories', label: 'Categories', icon: Tags },
  { path: '/atelier-portal/collections', label: 'Collections', icon: Sparkles },
  { path: '/atelier-portal/coupons', label: 'Coupons', icon: TicketPercent },
  { path: '/atelier-portal/media', label: 'Media', icon: Image },
  { path: '/atelier-portal/content', label: 'Content', icon: Sliders },
  { path: '/atelier-portal/settings', label: 'Settings', icon: SettingsIcon }
];

export const AdminLayout: React.FC = () => {
  const { user, logout, isAdmin, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [unreadInquiries, setUnreadInquiries] = useState<number>(0);

  useEffect(() => {
    if (user && isAdmin) {
      api.get('/admin/inquiries/stats')
        .then((res) => {
          if (typeof res.data?.unread === 'number') {
            setUnreadInquiries(res.data.unread);
          }
        })
        .catch(() => {});
    }
  }, [user, isAdmin, location.pathname]);

  // Protected route check
  if (!isLoading && (!user || !isAdmin)) {
    return (
      <div className="min-h-screen bg-[#110508] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900/90 p-8 rounded-xl border border-red-800 text-center space-y-4 shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="font-serif text-2xl font-bold text-red-300">Administrative Access Required</h2>
          <p className="text-xs text-zinc-400">
            You must be authenticated with an Administrator role to manage the EthnizCouture store catalog and orders.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to="/atelier-portal/login?redirect=/atelier-portal"
              className="w-full py-2.5 bg-[#3E1A1E] hover:bg-[#2B0C10] text-[#DFC89D] border border-[#C6A15D]/40 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shadow-sm"
            >
              Sign In as Administrator
            </Link>
            <Link
              to="/"
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
            >
              Return to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isActiveRoute = (item: typeof NAV_ITEMS[0]) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="min-h-screen lg:h-screen bg-[#0F0407] text-zinc-100 flex flex-col lg:flex-row lg:overflow-hidden">
      
      {/* Mobile Top Bar */}
      <div className="lg:hidden bg-[#1B050C] border-b border-[#C6A15D]/20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo-card.png" alt="EthnizCouture" className="h-8 w-auto rounded border border-[#C6A15D]/40" />
          <span className="font-serif text-sm font-bold text-[#DFC89D] uppercase tracking-wider">
            ADMIN CONSOLE
          </span>
        </div>
        <button
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-300 hover:text-white"
          aria-label={isMobileNavOpen ? "Close Admin Menu" : "Open Admin Menu"}
        >
          {isMobileNavOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#18040B] border-r border-[#C6A15D]/20 flex flex-col justify-between transform transition-transform duration-200 ease-in-out ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6">
          
          {/* Admin Brand Logo */}
          <div className="pb-6 border-b border-zinc-800">
            <Link to="/atelier-portal" className="flex items-center gap-3 group">
              <div className="p-1 bg-[#3E1A1E] rounded-lg border border-[#C6A15D]/40 group-hover:border-[#C6A15D] transition-colors">
                <img src="/logo-card.png" alt="EthnizCouture" className="h-10 w-auto object-contain" />
              </div>
              <div>
                <span className="block font-serif text-base font-semibold text-[#DFC89D] tracking-wider uppercase">
                  EthnizCouture
                </span>
                <span className="block text-[9px] tracking-[0.25em] uppercase text-[#C6A15D] font-bold">
                  Admin Console
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isActiveRoute(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileNavOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    active
                      ? 'bg-[#3E1A1E] text-white shadow-md border-l-4 border-[#C6A15D] font-bold'
                      : 'text-zinc-400 hover:text-[#DFC89D] hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#DFC89D]' : 'text-zinc-400'}`} />
                  <span className="flex-1">{item.label}</span>
                  {(item as any).badgeKey === 'inquiries' && unreadInquiries > 0 && (
                    <span className="px-1.5 py-0.5 bg-amber-500 text-black text-[10px] font-bold rounded-full animate-pulse shadow-sm">
                      {unreadInquiries}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar User Info & Storefront Link */}
        <div className="p-4 border-t border-zinc-800/80 bg-black/20 space-y-2">
          <Link
            to="/"
            target="_blank"
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-[#DFC89D] hover:text-[#C6A15D] hover:bg-white/5 transition-colors border border-[#C6A15D]/30"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>View Live Store</span>
            </span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <div className="flex items-center justify-between px-2 pt-2 text-xs">
            <div className="truncate">
              <p className="font-bold text-zinc-200 truncate">{user?.name}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/atelier-portal/login');
              }}
              className="p-1.5 text-zinc-400 hover:text-red-400"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-[#120307] overflow-y-auto h-full">
        {/* Top Navbar */}
        <div className="hidden lg:flex items-center justify-between px-8 py-4 bg-[#18040B]/80 backdrop-blur-md border-b border-gold-900/30 sticky top-0 z-30">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="uppercase tracking-widest text-[10px] text-gold-600 font-bold">Admin Workspace</span>
            <span>/</span>
            <span className="text-zinc-200 font-medium capitalize">
              {location.pathname.replace('/atelier-portal', '').replace('/', '') || 'Overview'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded font-semibold text-[10px] uppercase tracking-wider">
              ● Store Status: Online
            </span>
            <span className="text-zinc-400">{new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Nested Admin Page Content */}
        <div className="p-4 sm:p-8">
          <Outlet />
        </div>
      </main>

    </div>
  );
};
