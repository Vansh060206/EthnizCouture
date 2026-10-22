import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import {
  User as UserIcon,
  Package,
  Heart,
  MapPin,
  LogOut,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Truck,
  AlertCircle,
  Tag,
  Bell,
  Shield,
  ChevronRight,
  ArrowLeft,
  Copy,
  Check,
  Sparkles,
  HelpCircle,
  Phone,
  Mail,
  Smartphone,
  Gift,
  Star,
  FileText,
  XCircle,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { ProductCard } from '../components/ProductCard';
import { WriteReviewModal } from '../components/WriteReviewModal';
import { TaxInvoiceModal } from '../components/TaxInvoiceModal';
import { CancelOrderModal } from '../components/CancelOrderModal';
import { ReturnRequestModal } from '../components/ReturnRequestModal';
import api from '../services/api';
import { Order, Address } from '../types';
import {
  validateFullName,
  validatePhone,
  validateStreet,
  validateCity,
  validateState,
  validatePincode,
  INDIAN_STATES
} from '../utils/validation';

interface CouponItem {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number | null;
  expiryDate?: string | null;
}

export const Account: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const { wishlist } = useWishlist();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { section: sectionParam } = useParams<{ section?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Screen width state for responsive mobile-first hub switching
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine active tab supporting both path parameter (/account/:section) and query parameter (/account?tab=...)
  const rawTab = sectionParam || searchParams.get('tab') || '';
  const activeTab = rawTab ? rawTab.toLowerCase() : (isMobile ? 'overview' : 'orders');

  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [reviewModalTarget, setReviewModalTarget] = useState<{
    productId: string;
    productName: string;
    productImage?: string;
  } | null>(null);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [selectedCancelOrder, setSelectedCancelOrder] = useState<Order | null>(null);
  const [selectedReturnOrder, setSelectedReturnOrder] = useState<Order | null>(null);

  const handleOrderUpdated = (orderNumber: string, newStatus: Order['orderStatus']) => {
    setOrders((prev) =>
      prev.map((o) => (o.orderNumber === orderNumber ? { ...o, orderStatus: newStatus } : o))
    );
  };

  // Profile Edit State
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState<{ name?: string; phone?: string }>({});

  // Notification Preferences State (persistent in localStorage with fallback)
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('ethniz_notification_prefs');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      orderUpdates: true,
      whatsappAlerts: true,
      atelierLookbooks: true,
      bridalPreviews: false
    };
  });

  // Address Modal / Form State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    fullName: '',
    phone: '',
    street: '',
    apartment: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    isDefault: false
  });
  const [modalErrors, setModalErrors] = useState<{
    fullName?: string;
    phone?: string;
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  }>({});
  const [modalTouched, setModalTouched] = useState<{
    fullName?: boolean;
    phone?: boolean;
    street?: boolean;
    city?: boolean;
    state?: boolean;
    pincode?: boolean;
  }>({});

  // Sign out modal
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/account');
    }
  }, [user, navigate]);

  // Sync profile form when user updates
  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
    }
  }, [user]);

  // Load orders
  useEffect(() => {
    const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
        const res = await api.get('/orders/my-orders');
        setOrders(res.data.orders || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingOrders(false);
      }
    };

    if (user && (activeTab === 'orders' || activeTab === 'overview')) {
      fetchOrders();
    }
  }, [user, activeTab]);

  // Load addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const res = await api.get('/users/addresses');
        setAddresses(res.data.addresses || []);
      } catch (err) {
        console.error(err);
      }
    };

    if (user && (activeTab === 'addresses' || activeTab === 'overview')) {
      fetchAddresses();
    }
  }, [user, activeTab]);

  // Load active coupons
  useEffect(() => {
    const fetchCoupons = async () => {
      setLoadingCoupons(true);
      try {
        const res = await api.get('/coupons');
        setCoupons(res.data.coupons || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCoupons(false);
      }
    };

    if (user && (activeTab === 'coupons' || activeTab === 'overview')) {
      fetchCoupons();
    }
  }, [user, activeTab]);

  // Navigate to tab smoothly
  const handleSelectTab = (tabKey: string) => {
    setSearchParams({ tab: tabKey });
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    showToast(`Privilege code ${code} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedCoupon(null), 2500);
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('ethniz_notification_prefs', JSON.stringify(notifications));
      showToast('Atelier communication preferences updated.', 'success');
    } catch {
      showToast('Failed to save preferences.', 'error');
    }
  };

  const validateModalField = (field: string, value: string): boolean => {
    let err: string | undefined;
    switch (field) {
      case 'fullName':
        err = validateFullName(value, 'Full Name').error;
        break;
      case 'phone':
        err = validatePhone(value, true).error;
        break;
      case 'street':
        err = validateStreet(value).error;
        break;
      case 'city':
        err = validateCity(value).error;
        break;
      case 'state':
        err = validateState(value).error;
        break;
      case 'pincode':
        err = validatePincode(value).error;
        break;
    }
    setModalErrors((prev) => ({ ...prev, [field]: err }));
    return !err;
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameVal = validateFullName(editName, 'Full Name');
    const phoneVal = validatePhone(editPhone, false);

    setProfileErrors({
      name: nameVal.error,
      phone: phoneVal.error
    });

    if (!nameVal.isValid || !phoneVal.isValid) {
      showToast('Please correct the highlighted errors in your profile.', 'error');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const res = await api.put('/auth/profile', { name: editName, phone: editPhone });
      updateUser(res.data.user);
      showToast('Personal information updated successfully.', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update profile.', 'error');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalTouched({
      fullName: true,
      phone: true,
      street: true,
      city: true,
      state: true,
      pincode: true
    });

    const vName = validateFullName(addressForm.fullName, 'Recipient Name');
    const vPhone = validatePhone(addressForm.phone, true);
    const vStreet = validateStreet(addressForm.street);
    const vCity = validateCity(addressForm.city);
    const vState = validateState(addressForm.state);
    const vPincode = validatePincode(addressForm.pincode);

    const newErrors = {
      fullName: vName.error,
      phone: vPhone.error,
      street: vStreet.error,
      city: vCity.error,
      state: vState.error,
      pincode: vPincode.error
    };

    setModalErrors(newErrors);

    if (Object.values(newErrors).some(Boolean)) {
      showToast('Please correct the highlighted address errors.', 'error');
      return;
    }

    try {
      if (editingAddressId) {
        await api.put(`/users/addresses/${editingAddressId}`, addressForm);
        showToast('Address updated successfully.', 'success');
      } else {
        await api.post('/users/addresses', addressForm);
        showToast('New address added to your address book.', 'success');
      }
      setIsAddressModalOpen(false);
      setEditingAddressId(null);
      const res = await api.get('/users/addresses');
      setAddresses(res.data.addresses || []);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save address.', 'error');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('Remove this delivery address from your profile?')) return;
    try {
      await api.delete(`/users/addresses/${id}`);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      showToast('Address removed from address book.', 'info');
    } catch (err) {
      showToast('Failed to delete address.', 'error');
    }
  };

  const openAddAddressModal = () => {
    setEditingAddressId(null);
    setModalErrors({});
    setModalTouched({});
    setAddressForm({
      fullName: user?.name || '',
      phone: user?.phone || '',
      street: '',
      apartment: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      isDefault: addresses.length === 0
    });
    setIsAddressModalOpen(true);
  };

  const openEditAddressModal = (addr: Address) => {
    setEditingAddressId(addr.id);
    setModalErrors({});
    setModalTouched({});
    setAddressForm({
      fullName: addr.fullName,
      phone: addr.phone,
      street: addr.street,
      apartment: addr.apartment || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      country: addr.country,
      isDefault: addr.isDefault
    });
    setIsAddressModalOpen(true);
  };

  // Helper for customer initials monogram
  const getInitials = (name?: string) => {
    if (!name) return 'EC';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  // Profile completeness check
  const isProfileComplete = Boolean(user?.name && user?.email && user?.phone);

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-6 sm:py-10 text-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* ============================================================== */}
        {/* MOBILE SUB-HEADER (When viewing a specific sub-tab on mobile)  */}
        {/* ============================================================== */}
        {isMobile && activeTab !== 'overview' && (
          <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8DEC8] flex items-center justify-between shadow-xs">
            <button
              onClick={() => handleSelectTab('overview')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-maroon-800 uppercase tracking-wider"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Account Hub</span>
            </button>
            <span className="font-serif font-bold text-sm text-zinc-900 capitalize">
              {activeTab === 'orders' ? 'My Orders' :
               activeTab === 'wishlist' ? 'Saved Pieces' :
               activeTab === 'addresses' ? 'Addresses' :
               activeTab === 'coupons' ? 'Atelier Privileges' :
               activeTab === 'notifications' ? 'Notifications' : 'Account Details'}
            </span>
          </div>
        )}

        {/* ============================================================== */}
        {/* 1. CUSTOMER IDENTITY HERO CARD                                 */}
        {/* ============================================================== */}
        <div className="bg-white rounded-lg border border-[#E8DEC8] p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            
            {/* Identity Info */}
            <div className="flex items-center gap-4">
              {/* Monogram Avatar with luxury gold ring */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#26060C] via-[#3E1A1E] to-[#1F040A] text-[#DFC89D] flex items-center justify-center font-serif text-xl sm:text-2xl font-bold ring-2 ring-[#C6A15D] shadow-md shrink-0">
                {getInitials(user?.name)}
              </div>

              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-serif text-xl sm:text-2xl font-bold text-zinc-950 truncate">
                    {user?.name}
                  </h1>
                  {isProfileComplete ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Verified</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      <span>Profile Incomplete</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-zinc-400" />
                    <span>{user?.email}</span>
                  </span>
                  {user?.phone ? (
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-zinc-400" />
                      <span>{user.phone}</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSelectTab('profile')}
                      className="text-amber-800 hover:underline font-semibold flex items-center gap-1 text-[11px]"
                    >
                      <Plus className="w-3 h-3" /> Add phone number for courier updates
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <button
                onClick={() => handleSelectTab('profile')}
                className="px-3.5 py-2 bg-white hover:bg-zinc-50 border border-[#E8DEC8] text-zinc-800 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Edit2 className="w-3.5 h-3.5 text-maroon-800" />
                <span>Edit Profile</span>
              </button>

              <button
                onClick={() => setIsLogoutModalOpen(true)}
                className="px-3 py-2 bg-white hover:bg-red-50 border border-zinc-200 hover:border-red-300 text-zinc-700 hover:text-red-700 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-xs"
                title="Sign out of account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>

          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. MOBILE-FIRST ACCOUNT HUB (Rendered on mobile overview)      */}
        {/* ============================================================== */}
        {isMobile && activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">

            {/* Quick 4-Grid Shortcut Cards (Flipkart Reference Usability) */}
            <div className="grid grid-cols-2 gap-3">
              
              {/* Shortcut 1: Orders */}
              <button
                onClick={() => handleSelectTab('orders')}
                className="bg-white p-4 rounded-lg border border-[#E8DEC8] shadow-xs text-left hover:border-gold-500 transition-all flex flex-col justify-between h-24"
              >
                <div className="flex items-center justify-between text-maroon-800">
                  <Package className="w-5 h-5" />
                  <span className="text-xs font-mono font-bold bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E8DEC8]">
                    {orders.length}
                  </span>
                </div>
                <div>
                  <p className="font-serif font-bold text-zinc-900 text-sm">My Orders</p>
                  <p className="text-[10px] text-zinc-500">Live courier tracking</p>
                </div>
              </button>

              {/* Shortcut 2: Wishlist */}
              <button
                onClick={() => handleSelectTab('wishlist')}
                className="bg-white p-4 rounded-lg border border-[#E8DEC8] shadow-xs text-left hover:border-gold-500 transition-all flex flex-col justify-between h-24"
              >
                <div className="flex items-center justify-between text-maroon-800">
                  <Heart className="w-5 h-5 fill-maroon-100" />
                  <span className="text-xs font-mono font-bold bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E8DEC8]">
                    {wishlist.length}
                  </span>
                </div>
                <div>
                  <p className="font-serif font-bold text-zinc-900 text-sm">Saved Pieces</p>
                  <p className="text-[10px] text-zinc-500">Bespoke wishlist</p>
                </div>
              </button>

              {/* Shortcut 3: Coupons */}
              <button
                onClick={() => handleSelectTab('coupons')}
                className="bg-white p-4 rounded-lg border border-[#E8DEC8] shadow-xs text-left hover:border-gold-500 transition-all flex flex-col justify-between h-24"
              >
                <div className="flex items-center justify-between text-maroon-800">
                  <Tag className="w-5 h-5" />
                  <span className="text-xs font-mono font-bold bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E8DEC8]">
                    {coupons.length}
                  </span>
                </div>
                <div>
                  <p className="font-serif font-bold text-zinc-900 text-sm">Atelier Coupons</p>
                  <p className="text-[10px] text-zinc-500">Exclusive privileges</p>
                </div>
              </button>

              {/* Shortcut 4: Help Center */}
              <Link
                to="/contact"
                className="bg-white p-4 rounded-lg border border-[#E8DEC8] shadow-xs text-left hover:border-gold-500 transition-all flex flex-col justify-between h-24"
              >
                <div className="flex items-center justify-between text-maroon-800">
                  <HelpCircle className="w-5 h-5" />
                  <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    24/7
                  </span>
                </div>
                <div>
                  <p className="font-serif font-bold text-zinc-900 text-sm">Concierge Care</p>
                  <p className="text-[10px] text-zinc-500">Private stylist assistance</p>
                </div>
              </Link>

            </div>

            {/* Structured Navigation Menu Sections */}
            <div className="bg-white rounded-lg border border-[#E8DEC8] shadow-xs divide-y divide-zinc-100 overflow-hidden text-xs">
              
              {/* Section Header: Wardrobe */}
              <div className="px-4 py-2 bg-[#FAF7F2] font-bold uppercase tracking-wider text-[10px] text-zinc-500">
                Wardrobe &amp; Order Pipeline
              </div>

              <button
                onClick={() => handleSelectTab('orders')}
                className="w-full px-4 py-3.5 flex items-center justify-between text-zinc-800 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-maroon-800" />
                  <div className="text-left">
                    <p className="font-semibold text-zinc-900">All Orders &amp; Milestones</p>
                    <p className="text-[11px] text-zinc-400">Inspect handloom journey &amp; invoices</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 font-mono">({orders.length})</span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </div>
              </button>

              <button
                onClick={() => handleSelectTab('wishlist')}
                className="w-full px-4 py-3.5 flex items-center justify-between text-zinc-800 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Heart className="w-4 h-4 text-maroon-800" />
                  <div className="text-left">
                    <p className="font-semibold text-zinc-900">Saved Pieces (Wishlist)</p>
                    <p className="text-[11px] text-zinc-400">Garments curated for your celebrations</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 font-mono">({wishlist.length})</span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </div>
              </button>

              <Link
                to="/track-order"
                className="w-full px-4 py-3.5 flex items-center justify-between text-zinc-800 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Truck className="w-4 h-4 text-maroon-800" />
                  <div className="text-left">
                    <p className="font-semibold text-zinc-900">Airway Bill Tracking</p>
                    <p className="text-[11px] text-zinc-400">Blue Dart Express tracking reference</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </Link>

              {/* Section Header: Profile & Account Settings */}
              <div className="px-4 py-2 bg-[#FAF7F2] font-bold uppercase tracking-wider text-[10px] text-zinc-500">
                Settings &amp; Preferences
              </div>

              <button
                onClick={() => handleSelectTab('profile')}
                className="w-full px-4 py-3.5 flex items-center justify-between text-zinc-800 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <UserIcon className="w-4 h-4 text-maroon-800" />
                  <div className="text-left">
                    <p className="font-semibold text-zinc-900">Personal Details &amp; Contact</p>
                    <p className="text-[11px] text-zinc-400">Name, phone, verified email</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              <button
                onClick={() => handleSelectTab('addresses')}
                className="w-full px-4 py-3.5 flex items-center justify-between text-zinc-800 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-maroon-800" />
                  <div className="text-left">
                    <p className="font-semibold text-zinc-900">Saved Delivery Addresses</p>
                    <p className="text-[11px] text-zinc-400">Manage doorstep shipping destinations</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 font-mono">({addresses.length})</span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </div>
              </button>

              <button
                onClick={() => handleSelectTab('coupons')}
                className="w-full px-4 py-3.5 flex items-center justify-between text-zinc-800 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Tag className="w-4 h-4 text-maroon-800" />
                  <div className="text-left">
                    <p className="font-semibold text-zinc-900">Atelier Privileges &amp; Coupons</p>
                    <p className="text-[11px] text-zinc-400">Special seasonal discounts</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              <button
                onClick={() => handleSelectTab('notifications')}
                className="w-full px-4 py-3.5 flex items-center justify-between text-zinc-800 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-maroon-800" />
                  <div className="text-left">
                    <p className="font-semibold text-zinc-900">Notification Preferences</p>
                    <p className="text-[11px] text-zinc-400">SMS, WhatsApp &amp; Email alerts</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              {/* Sign out item */}
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-red-700 hover:bg-red-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="w-4 h-4 text-red-600" />
                  <span className="font-bold uppercase tracking-wider text-[11px]">Sign Out of Account</span>
                </div>
                <ChevronRight className="w-4 h-4 text-red-400" />
              </button>

            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* 3. DESKTOP DUAL-COLUMN LAYOUT OR ACTIVE TAB CONTENT            */}
        {/* ============================================================== */}
        {(!isMobile || activeTab !== 'overview') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Desktop Navigation Sidebar (3 cols) */}
            <div className="hidden lg:block lg:col-span-3 bg-white rounded-lg border border-[#E8DEC8] p-2 shadow-xs space-y-1">
              
              <button
                onClick={() => handleSelectTab('orders')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded text-xs font-bold uppercase tracking-wider transition-colors text-left ${
                  activeTab === 'orders'
                    ? 'bg-maroon-800 text-white shadow-xs'
                    : 'text-zinc-700 hover:bg-[#FAF7F2]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4" />
                  <span>My Orders</span>
                </div>
                <span className="font-mono text-[11px]">({orders.length})</span>
              </button>

              <button
                onClick={() => handleSelectTab('wishlist')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded text-xs font-bold uppercase tracking-wider transition-colors text-left ${
                  activeTab === 'wishlist'
                    ? 'bg-maroon-800 text-white shadow-xs'
                    : 'text-zinc-700 hover:bg-[#FAF7F2]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Heart className="w-4 h-4" />
                  <span>Saved Pieces</span>
                </div>
                <span className="font-mono text-[11px]">({wishlist.length})</span>
              </button>

              <button
                onClick={() => handleSelectTab('addresses')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded text-xs font-bold uppercase tracking-wider transition-colors text-left ${
                  activeTab === 'addresses'
                    ? 'bg-maroon-800 text-white shadow-xs'
                    : 'text-zinc-700 hover:bg-[#FAF7F2]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4" />
                  <span>Delivery Addresses</span>
                </div>
                <span className="font-mono text-[11px]">({addresses.length})</span>
              </button>

              <button
                onClick={() => handleSelectTab('profile')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded text-xs font-bold uppercase tracking-wider transition-colors text-left ${
                  activeTab === 'profile'
                    ? 'bg-maroon-800 text-white shadow-xs'
                    : 'text-zinc-700 hover:bg-[#FAF7F2]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserIcon className="w-4 h-4" />
                  <span>Account Details</span>
                </div>
              </button>

              <button
                onClick={() => handleSelectTab('coupons')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded text-xs font-bold uppercase tracking-wider transition-colors text-left ${
                  activeTab === 'coupons'
                    ? 'bg-maroon-800 text-white shadow-xs'
                    : 'text-zinc-700 hover:bg-[#FAF7F2]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Tag className="w-4 h-4" />
                  <span>Atelier Privileges</span>
                </div>
                {coupons.length > 0 && (
                  <span className="bg-gold-100 text-maroon-900 px-1.5 py-0.2 rounded text-[10px] font-bold font-mono">
                    {coupons.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleSelectTab('notifications')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded text-xs font-bold uppercase tracking-wider transition-colors text-left ${
                  activeTab === 'notifications'
                    ? 'bg-maroon-800 text-white shadow-xs'
                    : 'text-zinc-700 hover:bg-[#FAF7F2]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4" />
                  <span>Notifications</span>
                </div>
              </button>

              <div className="pt-2 border-t border-zinc-100">
                <Link
                  to="/track-order"
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded text-xs font-semibold text-zinc-600 hover:text-maroon-800 hover:bg-[#FAF7F2]"
                >
                  <Truck className="w-4 h-4" />
                  <span>Airway Bill Tracker</span>
                </Link>
                <Link
                  to="/contact"
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded text-xs font-semibold text-zinc-600 hover:text-maroon-800 hover:bg-[#FAF7F2]"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Atelier Concierge Care</span>
                </Link>
              </div>

            </div>

            {/* Tab Content Container (9 cols on desktop, full width on mobile) */}
            <div className="lg:col-span-9 bg-white p-6 sm:p-8 rounded-lg border border-[#E8DEC8] shadow-xs">
              
              {/* ========================================================= */}
              {/* TAB 1: ORDERS & FULFILLMENT                               */}
              {/* ========================================================= */}
              {activeTab === 'orders' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-200 gap-2">
                    <h2 className="font-serif text-2xl font-bold text-zinc-900">
                      Order History &amp; Milestones ({orders.length})
                    </h2>
                    <Link
                      to="/track-order"
                      className="text-xs text-maroon-800 hover:underline font-bold flex items-center gap-1"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Track with Airway Bill</span>
                    </Link>
                  </div>

                  {loadingOrders ? (
                    <div className="py-12 text-center text-xs text-zinc-500 uppercase tracking-widest">
                      Loading order history...
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                      <Package className="w-10 h-10 text-zinc-300 mx-auto" />
                      <p className="font-serif text-lg font-bold text-zinc-800">No Orders Found</p>
                      <p className="text-xs text-zinc-500">You have not placed any couture orders yet.</p>
                      <Link
                        to="/shop"
                        className="inline-block px-6 py-2.5 bg-maroon-800 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-maroon-900 shadow"
                      >
                        Explore Handloom Catalog
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="p-5 rounded-lg border border-[#E8DEC8] bg-[#FAF7F2] space-y-4 shadow-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-200">
                            <div>
                              <p className="font-serif text-base font-bold text-zinc-900">{order.orderNumber}</p>
                              <p className="text-[11px] text-zinc-500">
                                Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${
                                order.orderStatus === 'CANCELLED'
                                  ? 'bg-red-100 text-red-800'
                                  : order.orderStatus === 'RETURN_REQUESTED'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : order.orderStatus === 'DELIVERED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-maroon-800 text-white'
                              }`}>
                                {order.orderStatus === 'RETURN_REQUESTED' ? 'Return Requested' : order.orderStatus.replace(/_/g, ' ')}
                              </span>
                              <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${
                                order.paymentStatus === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {order.paymentStatus === 'PAID' ? 'Paid Online' : 'Payment Due (COD)'}
                              </span>
                            </div>
                          </div>

                          {/* Items List */}
                          <div className="divide-y divide-zinc-200/60">
                            {order.items.map((item) => (
                              <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={item.productImage || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=200&q=80'}
                                    alt={item.productName}
                                    className="w-12 h-14 object-cover rounded bg-zinc-200 shrink-0 border border-zinc-200"
                                  />
                                  <div>
                                    <p className="font-semibold text-zinc-900">{item.productName}</p>
                                    <p className="text-[11px] text-zinc-500">
                                      Qty: {item.quantity} · Size: {item.size || 'Standard'}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right space-y-1.5 shrink-0">
                                  <span className="font-serif font-bold text-[#3E1A1E] block text-sm">
                                    ₹{(item.price || item.total).toLocaleString('en-IN')}
                                  </span>
                                  {item.productId && order.orderStatus === 'DELIVERED' && (
                                    <button
                                      type="button"
                                      onClick={() => setReviewModalTarget({
                                        productId: item.productId!,
                                        productName: item.productName,
                                        productImage: item.productImage || undefined
                                      })}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#84642C] hover:text-[#3E1A1E] bg-white hover:bg-[#FAF7F2] rounded-md border border-[#C6A15D]/60 transition-colors shadow-2xs cursor-pointer"
                                    >
                                      <Star className="w-3 h-3 fill-[#C6A15D] text-[#C6A15D]" />
                                      <span>Review Piece</span>
                                    </button>
                                  )}
                                  {item.productId && order.orderStatus !== 'DELIVERED' && (
                                    <span className="text-[10px] text-zinc-400 font-medium block italic">
                                      Review unlocks on delivery
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Order Footer & Actions */}
                          <div className="pt-3 border-t border-zinc-200 text-xs space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-500 font-medium">Total Amount:</span>
                              <span className="font-serif text-base sm:text-lg font-bold text-zinc-950">
                                ₹{order.totalAmount.toLocaleString('en-IN')}
                              </span>
                            </div>

                            {/* Responsive Mobile-First Action Button Group (Zero Horizontal Overflow) */}
                            <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end gap-2 w-full">
                              {/* Direct Pay Online Button if order is COD */}
                              {order.paymentMethod === 'COD' && order.paymentStatus !== 'PAID' && (
                                <Link
                                  to={`/track-order?orderNumber=${order.orderNumber}`}
                                  className="col-span-2 sm:col-auto h-10 sm:h-9 px-3.5 bg-gradient-to-r from-gold-500 to-gold-600 hover:brightness-105 active:scale-[0.98] text-maroon-950 rounded-xl sm:rounded font-bold uppercase tracking-wider text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition-transform"
                                >
                                  <Smartphone className="w-3.5 h-3.5 text-maroon-900" />
                                  <span>Pay Online</span>
                                </Link>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedInvoiceOrder(order)}
                                className="h-10 sm:h-9 px-3 bg-white hover:bg-zinc-50 active:scale-[0.98] border border-zinc-300 text-zinc-700 rounded-xl sm:rounded font-bold uppercase tracking-wider text-[11px] flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-transform"
                                title="Download Official Tax Invoice"
                              >
                                <FileText className="w-3.5 h-3.5 text-zinc-500" />
                                <span>Invoice</span>
                              </button>

                              {/* Customer Self-Service Cancel Button (before dispatched) */}
                              {['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED'].includes(order.orderStatus) && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedCancelOrder(order)}
                                  className="h-10 sm:h-9 px-3 bg-white hover:bg-red-50 active:scale-[0.98] border border-red-200 text-red-700 hover:border-red-300 rounded-xl sm:rounded font-bold uppercase tracking-wider text-[11px] flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                  title="Cancel this order before dispatch"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                                  <span>Cancel Order</span>
                                </button>
                              )}

                              {/* Customer Self-Service Return / Exchange Button (post-delivery) */}
                              {order.orderStatus === 'DELIVERED' && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedReturnOrder(order)}
                                  className="h-10 sm:h-9 px-3 bg-white hover:bg-[#FAF7F2] active:scale-[0.98] border border-[#C5A262]/70 text-[#84642C] hover:text-[#3E1A1E] rounded-xl sm:rounded font-bold uppercase tracking-wider text-[11px] flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                  title="Request a return or size exchange"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-[#C5A262]" />
                                  <span>Return / Exchange</span>
                                </button>
                              )}

                              <Link
                                to={`/track-order?orderNumber=${order.orderNumber}`}
                                className="col-span-2 sm:col-auto h-10 sm:h-9 px-4 bg-[#3E1A1E] hover:bg-[#2B0C10] active:scale-[0.98] text-[#DFC89D] rounded-xl sm:rounded font-bold uppercase tracking-wider text-[11px] flex items-center justify-center gap-1.5 shadow transition-transform"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Track Journey</span>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 2: SAVED PIECES (WISHLIST)                            */}
              {/* ========================================================= */}
              {activeTab === 'wishlist' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                    <h2 className="font-serif text-2xl font-bold text-zinc-900">
                      Your Saved Pieces ({wishlist.length})
                    </h2>
                    <Link
                      to="/shop"
                      className="text-xs text-maroon-800 hover:underline font-bold"
                    >
                      Browse More Collections
                    </Link>
                  </div>

                  {wishlist.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                      <Heart className="w-10 h-10 text-zinc-300 mx-auto" />
                      <p className="font-serif text-lg font-bold text-zinc-800">Your Wishlist is Empty</p>
                      <p className="text-xs text-zinc-500">Tap the heart icon on any bespoke piece to preserve it here.</p>
                      <Link
                        to="/shop"
                        className="inline-block px-6 py-2.5 bg-maroon-800 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-maroon-900 shadow"
                      >
                        Browse Collections
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
                      {wishlist.map((item) => (
                        <ProductCard key={item.id} product={item} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 3: SAVED ADDRESSES                                    */}
              {/* ========================================================= */}
              {activeTab === 'addresses' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                    <h2 className="font-serif text-2xl font-bold text-zinc-900">
                      Saved Delivery Addresses
                    </h2>
                    <button
                      onClick={openAddAddressModal}
                      className="px-4 py-2 bg-maroon-800 hover:bg-maroon-900 text-white text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 shadow"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Address</span>
                    </button>
                  </div>

                  {addresses.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 text-xs space-y-3">
                      <MapPin className="w-10 h-10 text-zinc-300 mx-auto" />
                      <p>No saved delivery addresses found. Add an address for rapid 1-click checkout.</p>
                      <button
                        onClick={openAddAddressModal}
                        className="px-5 py-2 bg-maroon-800 text-white text-xs font-bold uppercase rounded shadow"
                      >
                        Add Address
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {addresses.map((addr) => (
                        <div
                          key={addr.id}
                          className={`p-5 rounded-lg border relative flex flex-col justify-between ${
                            addr.isDefault
                              ? 'border-gold-500 bg-gold-50/20 shadow-xs'
                              : 'border-zinc-200 bg-[#FAF7F2]'
                          }`}
                        >
                          <div>
                            {addr.isDefault && (
                              <span className="inline-block px-2 py-0.5 bg-gold-600 text-zinc-950 text-[10px] font-bold uppercase tracking-wider rounded mb-2">
                                Default Address
                              </span>
                            )}
                            <h4 className="font-serif text-base font-bold text-zinc-900">{addr.fullName}</h4>
                            <p className="text-xs text-zinc-600 mt-1">{addr.street}</p>
                            {addr.apartment && <p className="text-xs text-zinc-600">{addr.apartment}</p>}
                            <p className="text-xs text-zinc-600 font-medium">
                              {addr.city}, {addr.state} - {addr.pincode}
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">Phone: {addr.phone}</p>
                          </div>

                          <div className="flex items-center gap-3 pt-4 mt-4 border-t border-zinc-200 text-xs">
                            <button
                              onClick={() => openEditAddressModal(addr)}
                              className="text-zinc-700 hover:text-maroon-800 font-bold uppercase tracking-wider flex items-center gap-1"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="text-red-700 hover:text-red-900 font-bold uppercase tracking-wider flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 4: PERSONAL ATELIER PROFILE                           */}
              {/* ========================================================= */}
              {activeTab === 'profile' && (
                <div className="space-y-6 animate-fade-in">
                  <h2 className="font-serif text-2xl font-bold text-zinc-900 pb-3 border-b border-zinc-200">
                    Personal Atelier Information
                  </h2>

                  <form onSubmit={handleUpdateProfile} noValidate className="max-w-lg space-y-4 text-xs">
                    <div>
                      <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => {
                          setEditName(e.target.value);
                          if (profileErrors.name) {
                            setProfileErrors((prev) => ({
                              ...prev,
                              name: validateFullName(e.target.value, 'Full Name').error
                            }));
                          }
                        }}
                        className={`w-full h-12 sm:h-11 px-3.5 border rounded-xl sm:rounded-lg text-base sm:text-xs focus:outline-none transition-colors ${
                          profileErrors.name
                            ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                            : 'border-zinc-300 focus:border-maroon-800'
                        }`}
                        required
                      />
                      {profileErrors.name && (
                        <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{profileErrors.name}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1">
                        Email Address (Account Identifier)
                      </label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full h-12 sm:h-11 px-3.5 border border-zinc-200 rounded-xl sm:rounded-lg text-base sm:text-xs bg-zinc-100 text-zinc-500 cursor-not-allowed"
                      />
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Account email is fixed for security and order verification.
                      </p>
                    </div>

                    <div>
                      <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1">
                        Contact Phone (for Courier Milestones)
                      </label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => {
                          setEditPhone(e.target.value);
                          if (profileErrors.phone) {
                            setProfileErrors((prev) => ({
                              ...prev,
                              phone: validatePhone(e.target.value, false).error
                            }));
                          }
                        }}
                        placeholder="+91 98200 12345"
                        className={`w-full h-12 sm:h-11 px-3.5 border rounded-xl sm:rounded-lg text-base sm:text-xs focus:outline-none transition-colors font-mono ${
                          profileErrors.phone
                            ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                            : 'border-zinc-300 focus:border-maroon-800'
                        }`}
                      />
                      {profileErrors.phone && (
                        <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{profileErrors.phone}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isUpdatingProfile}
                        className="px-6 py-2.5 bg-maroon-800 hover:bg-maroon-900 disabled:bg-zinc-400 text-white font-bold uppercase tracking-wider rounded shadow transition-all"
                      >
                        {isUpdatingProfile ? 'Saving Changes...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 5: ATELIER PRIVILEGES & COUPONS                       */}
              {/* ========================================================= */}
              {activeTab === 'coupons' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                    <h2 className="font-serif text-2xl font-bold text-zinc-900">
                      Atelier Privileges &amp; Coupons ({coupons.length})
                    </h2>
                    <span className="text-xs text-zinc-500">Apply at checkout</span>
                  </div>

                  {loadingCoupons ? (
                    <div className="py-12 text-center text-xs text-zinc-500 uppercase tracking-widest">
                      Retrieving active privileges...
                    </div>
                  ) : coupons.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                      <Gift className="w-10 h-10 text-gold-400 mx-auto" />
                      <p className="font-serif text-lg font-bold text-zinc-800">No Active Coupons</p>
                      <p className="text-xs text-zinc-500">Privilege offers and seasonal gift codes will appear here.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {coupons.map((coupon) => (
                        <div
                          key={coupon.id}
                          className="p-5 rounded-lg border border-[#E8DEC8] bg-gradient-to-br from-white to-[#FAF7F2] shadow-xs relative flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-sm bg-maroon-800 text-white px-2.5 py-1 rounded tracking-wider">
                                {coupon.code}
                              </span>
                              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {coupon.discountType === 'PERCENTAGE'
                                  ? `${coupon.discountValue}% OFF`
                                  : `₹${coupon.discountValue.toLocaleString('en-IN')} OFF`}
                              </span>
                            </div>

                            <p className="text-xs text-zinc-600">
                              Minimum order value: <strong>₹{coupon.minOrderValue.toLocaleString('en-IN')}</strong>
                            </p>
                            {coupon.maxDiscount && (
                              <p className="text-[11px] text-zinc-500">
                                Maximum savings cap: ₹{coupon.maxDiscount.toLocaleString('en-IN')}
                              </p>
                            )}
                            {coupon.expiryDate && (
                              <p className="text-[10px] text-zinc-400">
                                Valid until: {new Date(coupon.expiryDate).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </p>
                            )}
                          </div>

                          <div className="pt-4 mt-3 border-t border-zinc-100 flex items-center justify-between">
                            <button
                              onClick={() => handleCopyCoupon(coupon.code)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-maroon-800 hover:text-maroon-900"
                            >
                              {copiedCoupon === coupon.code ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-700">Code Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Code</span>
                                </>
                              )}
                            </button>
                            <Link
                              to="/shop"
                              className="text-xs font-semibold text-zinc-500 hover:text-maroon-800"
                            >
                              Shop with Offer &rarr;
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 6: NOTIFICATION PREFERENCES                           */}
              {/* ========================================================= */}
              {activeTab === 'notifications' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="pb-3 border-b border-zinc-200">
                    <h2 className="font-serif text-2xl font-bold text-zinc-900">
                      Notification &amp; Communication Preferences
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Choose how our private atelier contacts you regarding logistics and previews.
                    </p>
                  </div>

                  <form onSubmit={handleSaveNotifications} className="space-y-4 max-w-lg text-xs">
                    
                    {/* Toggle 1: Order Updates */}
                    <div className="p-4 rounded-lg border border-[#E8DEC8] bg-[#FAF7F2] flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-zinc-900 text-sm">Order Dispatch &amp; Tracking SMS</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Receive live Airway Bill and out-for-delivery milestones.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.orderUpdates}
                        onChange={(e) => setNotifications({ ...notifications, orderUpdates: e.target.checked })}
                        className="w-4 h-4 accent-maroon-800 cursor-pointer"
                      />
                    </div>

                    {/* Toggle 2: WhatsApp Alerts */}
                    <div className="p-4 rounded-lg border border-[#E8DEC8] bg-[#FAF7F2] flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-zinc-900 text-sm">WhatsApp Concierge Updates</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Delivery updates and doorstep coordination via WhatsApp.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.whatsappAlerts}
                        onChange={(e) => setNotifications({ ...notifications, whatsappAlerts: e.target.checked })}
                        className="w-4 h-4 accent-maroon-800 cursor-pointer"
                      />
                    </div>

                    {/* Toggle 3: Atelier Lookbooks */}
                    <div className="p-4 rounded-lg border border-[#E8DEC8] bg-[#FAF7F2] flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-zinc-900 text-sm">Seasonal Lookbooks &amp; Private Sales</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Invitations to limited handloom drops and bridal previews.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.atelierLookbooks}
                        onChange={(e) => setNotifications({ ...notifications, atelierLookbooks: e.target.checked })}
                        className="w-4 h-4 accent-maroon-800 cursor-pointer"
                      />
                    </div>

                    {/* Toggle 4: Bridal Previews */}
                    <div className="p-4 rounded-lg border border-[#E8DEC8] bg-[#FAF7F2] flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-zinc-900 text-sm">Bespoke Bridal Sizing Consultations</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Notifications from senior master craftsmen on bespoke lehengas.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.bridalPreviews}
                        onChange={(e) => setNotifications({ ...notifications, bridalPreviews: e.target.checked })}
                        className="w-4 h-4 accent-maroon-800 cursor-pointer"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-maroon-800 hover:bg-maroon-900 text-white font-bold uppercase tracking-wider rounded shadow transition-all"
                      >
                        Save Preferences
                      </button>
                    </div>

                  </form>
                </div>
              )}

            </div>

          </div>
        )}

      </div>

      {/* ============================================================== */}
      {/* ADDRESS MODAL (Add / Edit)                                     */}
      {/* ============================================================== */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-t-[28px] sm:rounded-xl border-t sm:border border-gold-300 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Mobile Pull Handle */}
            <div className="w-12 h-1.5 bg-zinc-300 rounded-full mx-auto sm:hidden" />

            <h3 className="font-serif text-lg sm:text-xl font-bold text-zinc-950 pb-2 border-b border-zinc-200">
              {editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
            </h3>

            <form onSubmit={handleSaveAddress} noValidate className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Recipient Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addressForm.fullName}
                  onChange={(e) => {
                    setAddressForm({ ...addressForm, fullName: e.target.value });
                    if (modalTouched.fullName) validateModalField('fullName', e.target.value);
                  }}
                  onBlur={() => {
                    setModalTouched((prev) => ({ ...prev, fullName: true }));
                    validateModalField('fullName', addressForm.fullName);
                  }}
                  className={`w-full h-12 sm:h-11 px-3.5 bg-white border rounded-xl sm:rounded-lg text-base sm:text-xs focus:outline-none transition-colors ${
                    modalTouched.fullName && modalErrors.fullName
                      ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                      : 'border-zinc-300 focus:border-maroon-800'
                  }`}
                  placeholder="e.g. Maharani Gayatri Devi"
                />
                {modalTouched.fullName && modalErrors.fullName && (
                  <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{modalErrors.fullName}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Contact Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={addressForm.phone}
                  onChange={(e) => {
                    setAddressForm({ ...addressForm, phone: e.target.value });
                    if (modalTouched.phone) validateModalField('phone', e.target.value);
                  }}
                  onBlur={() => {
                    setModalTouched((prev) => ({ ...prev, phone: true }));
                    validateModalField('phone', addressForm.phone);
                  }}
                  className={`w-full h-12 sm:h-11 px-3.5 bg-white border rounded-xl sm:rounded-lg text-base sm:text-xs focus:outline-none transition-colors ${
                    modalTouched.phone && modalErrors.phone
                      ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                      : 'border-zinc-300 focus:border-maroon-800'
                  }`}
                  placeholder="+91 98200 12345"
                />
                {modalTouched.phone && modalErrors.phone && (
                  <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{modalErrors.phone}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addressForm.street}
                  onChange={(e) => {
                    setAddressForm({ ...addressForm, street: e.target.value });
                    if (modalTouched.street) validateModalField('street', e.target.value);
                  }}
                  onBlur={() => {
                    setModalTouched((prev) => ({ ...prev, street: true }));
                    validateModalField('street', addressForm.street);
                  }}
                  className={`w-full h-12 sm:h-11 px-3.5 bg-white border rounded-xl sm:rounded-lg text-base sm:text-xs focus:outline-none transition-colors ${
                    modalTouched.street && modalErrors.street
                      ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                      : 'border-zinc-300 focus:border-maroon-800'
                  }`}
                  placeholder="House/Plot number, Street, Landmark"
                />
                {modalTouched.street && modalErrors.street && (
                  <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{modalErrors.street}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Apartment / Suite (Optional)
                </label>
                <input
                  type="text"
                  value={addressForm.apartment}
                  onChange={(e) => setAddressForm({ ...addressForm, apartment: e.target.value })}
                  className="w-full h-12 sm:h-11 px-3.5 bg-white border border-zinc-300 rounded-xl sm:rounded-lg text-base sm:text-xs focus:outline-none focus:border-maroon-800"
                  placeholder="Flat 12B, Imperial Heights"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.city}
                    onChange={(e) => {
                      setAddressForm({ ...addressForm, city: e.target.value });
                      if (modalTouched.city) validateModalField('city', e.target.value);
                    }}
                    onBlur={() => {
                      setModalTouched((prev) => ({ ...prev, city: true }));
                      validateModalField('city', addressForm.city);
                    }}
                    className={`w-full h-12 sm:h-11 px-3.5 bg-white border rounded-xl sm:rounded-lg text-base sm:text-xs focus:outline-none transition-colors ${
                      modalTouched.city && modalErrors.city
                        ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                        : 'border-zinc-300 focus:border-maroon-800'
                    }`}
                    placeholder="Mumbai"
                  />
                  {modalTouched.city && modalErrors.city && (
                    <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{modalErrors.city}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={addressForm.state}
                    onChange={(e) => {
                      setAddressForm({ ...addressForm, state: e.target.value });
                      if (modalTouched.state) validateModalField('state', e.target.value);
                    }}
                    onBlur={() => {
                      setModalTouched((prev) => ({ ...prev, state: true }));
                      validateModalField('state', addressForm.state);
                    }}
                    className={`w-full h-12 sm:h-11 px-3 bg-white border rounded-xl sm:rounded-lg text-base sm:text-xs focus:outline-none transition-colors cursor-pointer ${
                      modalTouched.state && modalErrors.state
                        ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                        : 'border-zinc-300 focus:border-maroon-800'
                    }`}
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {modalTouched.state && modalErrors.state && (
                    <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{modalErrors.state}</span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Pincode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={addressForm.pincode}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '').substring(0, 6);
                    setAddressForm({ ...addressForm, pincode: clean });
                    if (modalTouched.pincode) validateModalField('pincode', clean);
                  }}
                  onBlur={() => {
                    setModalTouched((prev) => ({ ...prev, pincode: true }));
                    validateModalField('pincode', addressForm.pincode);
                  }}
                  className={`w-full h-12 sm:h-11 px-3.5 bg-white border rounded-xl sm:rounded-lg text-base sm:text-xs focus:outline-none transition-colors font-mono ${
                    modalTouched.pincode && modalErrors.pincode
                      ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                      : 'border-zinc-300 focus:border-maroon-800'
                  }`}
                  placeholder="400026"
                />
                {modalTouched.pincode && modalErrors.pincode && (
                  <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{modalErrors.pincode}</span>
                  </p>
                )}
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault}
                    onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                    className="w-4 h-4 accent-maroon-800 rounded"
                  />
                  <span>Set as default delivery address</span>
                </label>
              </div>

              <div className="pt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="w-1/2 h-12 sm:h-11 border border-zinc-300 rounded-xl sm:rounded-lg font-bold uppercase text-zinc-600 text-xs active:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 h-12 sm:h-11 bg-maroon-800 text-white font-bold uppercase rounded-xl sm:rounded-lg shadow hover:bg-maroon-900 active:bg-maroon-950 text-xs"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* LOGOUT CONFIRMATION MODAL                                      */}
      {/* ============================================================== */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-lg border border-[#E8DEC8] shadow-2xl max-w-sm w-full p-6 space-y-4 animate-scale-up text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-700 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-zinc-950">Sign Out of Account</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Are you sure you wish to end your current session with Ethniz Couture?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="w-1/2 py-2 border border-zinc-300 rounded text-xs font-bold uppercase text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  logout();
                  navigate('/');
                }}
                className="w-1/2 py-2 bg-red-700 hover:bg-red-800 text-white rounded text-xs font-bold uppercase shadow"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Write Review Modal for Customer Orders */}
      {reviewModalTarget && (
        <WriteReviewModal
          isOpen={reviewModalTarget !== null}
          onClose={() => setReviewModalTarget(null)}
          productId={reviewModalTarget.productId}
          productName={reviewModalTarget.productName}
          productImage={reviewModalTarget.productImage}
          onReviewSubmitted={() => {
            showToast('Thank you! Your verified review has been published with the atelier.', 'success');
          }}
        />
      )}

      {/* Official GST Tax Invoice Modal */}
      {selectedInvoiceOrder && (
        <TaxInvoiceModal
          order={selectedInvoiceOrder}
          isOpen={selectedInvoiceOrder !== null}
          onClose={() => setSelectedInvoiceOrder(null)}
        />
      )}

      {/* Customer Self-Service Cancel Order Modal */}
      {selectedCancelOrder && (
        <CancelOrderModal
          order={selectedCancelOrder}
          isOpen={selectedCancelOrder !== null}
          onClose={() => setSelectedCancelOrder(null)}
          onSuccess={(orderNum) => {
            handleOrderUpdated(orderNum, 'CANCELLED');
          }}
        />
      )}

      {/* Customer Self-Service Return / Exchange Modal */}
      {selectedReturnOrder && (
        <ReturnRequestModal
          order={selectedReturnOrder}
          isOpen={selectedReturnOrder !== null}
          onClose={() => setSelectedReturnOrder(null)}
          onSuccess={(orderNum) => {
            handleOrderUpdated(orderNum, 'RETURN_REQUESTED');
          }}
        />
      )}

    </div>
  );
};
