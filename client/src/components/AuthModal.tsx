import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Gift,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  validateEmail,
  validateFullName,
  validatePhone,
  evaluatePassword,
  validateConfirmPassword
} from '../utils/validation';
import { GoogleSignInButton } from './auth/GoogleSignInButton';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export const AuthModal: React.FC = () => {
  const { user, isLoading: authLoading, login, register } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Validation Tracking
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string | undefined }>({});

  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const passwordEvaluation = evaluatePassword(password);

  // Check if current route is sensitive / forbidden for modal interruption
  const isExcludedRoute = (pathname: string): boolean => {
    return (
      pathname.startsWith('/checkout') ||
      pathname.startsWith('/order-confirmation') ||
      pathname.startsWith('/atelier-portal') ||
      pathname === '/login' ||
      pathname === '/signup'
    );
  };

  // Delayed trigger effect (2.5 seconds on homepage visit)
  useEffect(() => {
    // If user is already authenticated or auth is loading, never show
    if (authLoading || user) {
      return;
    }

    // Modal should only appear once per browser session
    const hasBeenShown = sessionStorage.getItem('ethniz_auth_modal_shown') === 'true';
    if (hasBeenShown) {
      return;
    }

    // Never interrupt checkout, admin, order, or dedicated auth pages
    if (isExcludedRoute(location.pathname)) {
      return;
    }

    // Requirement 1 & 2: Render homepage normally, trigger after 2.5 seconds
    const timer = setTimeout(() => {
      // Re-check conditions at moment of trigger
      const currentShown = sessionStorage.getItem('ethniz_auth_modal_shown') === 'true';
      if (!currentShown && !user && !isExcludedRoute(window.location.pathname)) {
        setIsOpen(true);
        sessionStorage.setItem('ethniz_auth_modal_shown', 'true');
      }
    }, 2500);

    return () => {
      clearTimeout(timer);
    };
  }, [authLoading, user, location.pathname]);

  // Lock background scrolling when modal is open & manage accessibility focus
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Autofocus first input for keyboard accessibility
      const focusTimer = setTimeout(() => {
        firstInputRef.current?.focus();
      }, 150);

      return () => {
        document.body.style.overflow = originalOverflow;
        clearTimeout(focusTimer);
      };
    }
  }, [isOpen]);

  // Keyboard accessibility: Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('ethniz_auth_modal_shown', 'true');
  };

  const handleSwitchTab = (tab: 'login' | 'signup') => {
    setActiveTab(tab);
    setFormError(null);
    setTouched({});
    setFieldErrors({});
    setShowPassword(false);
    // Focus appropriate input
    setTimeout(() => {
      firstInputRef.current?.focus();
    }, 50);
  };

  const validateLoginFields = (): boolean => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = Boolean(password && password.trim().length >= 6);

    setFieldErrors({
      email: isEmailValid.isValid ? undefined : isEmailValid.error,
      password: isPasswordValid ? undefined : 'Password is required (minimum 6 characters).'
    });

    setTouched({
      email: true,
      password: true
    });

    return isEmailValid.isValid && isPasswordValid;
  };

  const validateSignupFields = (): boolean => {
    const nameRes = validateFullName(name, 'Full Name');
    const emailRes = validateEmail(email);
    const phoneRes = validatePhone(phone, false);
    const passRes = evaluatePassword(password);
    const confirmRes = validateConfirmPassword(password, confirmPassword);

    setFieldErrors({
      name: nameRes.isValid ? undefined : nameRes.error,
      email: emailRes.isValid ? undefined : emailRes.error,
      phone: phoneRes.isValid ? undefined : phoneRes.error,
      password: passRes.isValid ? undefined : passRes.error,
      confirmPassword: confirmRes.isValid ? undefined : confirmRes.error
    });

    setTouched({
      name: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true
    });

    return nameRes.isValid && emailRes.isValid && phoneRes.isValid && passRes.isValid && confirmRes.isValid;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateLoginFields()) {
      setFormError('Please resolve the highlighted validation errors.');
      return;
    }

    setIsSubmitting(true);
    try {
      const loggedUser = await login(email, password);
      showToast(`Welcome back to Ethniz Couture, ${loggedUser.name}!`, 'success');
      handleClose();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateSignupFields()) {
      setFormError('Please resolve the highlighted validation errors.');
      return;
    }

    setIsSubmitting(true);
    try {
      const registeredUser = await register(name, email, password, phone);
      showToast(`Welcome to Ethniz Couture, ${registeredUser.name}!`, 'success');
      handleClose();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
    >
      {/* Semi-transparent Dark Luxury Backdrop (Tap to close) */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-[#140508]/80 backdrop-blur-xs transition-opacity duration-300 ease-out"
        aria-hidden="true"
      />

      {/* Modal / Bottom Sheet Container */}
      <div
        ref={modalRef}
        className="relative z-10 w-full sm:max-w-4xl max-h-[92vh] sm:max-h-[90vh] bg-white rounded-t-[28px] sm:rounded-2xl shadow-[0_-12px_45px_rgba(30,10,14,0.4)] sm:shadow-[0_25px_70px_rgba(30,10,14,0.45)] border-t sm:border border-[#C6A15D]/40 overflow-hidden flex flex-col md:flex-row my-0 sm:my-auto transform transition-all duration-300 ease-out"
      >
        {/* Mobile Swipe / Pull Handle Pill */}
        <div className="w-full flex justify-center pt-2.5 pb-1 md:hidden bg-white shrink-0">
          <div className="w-12 h-1.5 bg-zinc-300 rounded-full" />
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close authentication modal"
          className="absolute top-3 right-3 sm:top-3.5 sm:right-3.5 z-20 w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center text-zinc-500 hover:text-[#3E1A1E] bg-zinc-100 hover:bg-[#FAF7F2] rounded-full border border-zinc-200/80 shadow-xs transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#C6A15D]"
        >
          <X className="w-5 h-5 sm:w-4 sm:h-4" />
        </button>

        {/* Left Column: Flipkart-Style Brand Privilege Showcase (Desktop/Tablet) */}
        <div
          className="hidden md:flex md:w-5/12 text-white p-8 flex-col justify-between relative overflow-hidden border-r border-[#C6A15D]/40"
          style={{
            backgroundColor: '#26060C',
            backgroundImage:
              'radial-gradient(ellipse at top left, rgba(198, 161, 93, 0.22) 0%, transparent 65%), linear-gradient(180deg, #3A0C16 0%, #24050A 55%, #140205 100%)'
          }}
        >
          {/* Subtle Jaali Overlay - Layered safely so it does not override background color */}
          <div className="absolute inset-0 bg-jaali-dark opacity-35 pointer-events-none" />

          {/* Ambient Gold & Crimson Glows */}
          <div className="absolute -top-16 -left-16 w-52 h-52 bg-[#C6A15D]/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-52 h-52 bg-[#9E1B32]/35 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* Brand Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <img
                  src="/logo-transparent.png"
                  alt="Ethniz Couture"
                  className="h-10 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <span className="font-serif text-2xl lg:text-3xl font-bold tracking-wider text-white uppercase inline-block drop-shadow-sm">
                ETHNIZ<span className="text-[#DFC89D] font-light italic lowercase text-2xl font-serif">couture</span>
              </span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] bg-[#C6A15D]/20 text-[#DFC89D] border border-[#C6A15D]/40 mt-2 uppercase">
                <Sparkles className="w-3 h-3 text-[#C6A15D]" /> Haute Couture & Heritage Atelier
              </div>
            </div>

            {/* Narrative / Headline */}
            <div>
              <h3 className="font-serif text-2xl font-bold text-white leading-snug drop-shadow-sm">
                Step into the World of Royal Indian Haute Couture
              </h3>
              <p className="text-xs text-[#EAD7B8] mt-2 leading-relaxed font-normal">
                Join our patron circle to unlock bespoke sizing, private bridal drops, and dedicated concierge assistance.
              </p>
            </div>

            {/* Privilege Badges */}
            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#160307]/85 border border-[#C6A15D]/35 shadow-md backdrop-blur-xs">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[#C6A15D]/30 to-[#C6A15D]/10 border border-[#C6A15D]/50 text-[#DFC89D] shrink-0">
                  <Sparkles className="w-4 h-4 text-[#DFC89D]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-wide">Private Previews</h4>
                  <p className="text-[11px] text-[#DFC89D] mt-0.5 leading-snug">Early access to limited bridal & festive capsule releases.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#160307]/85 border border-[#C6A15D]/35 shadow-md backdrop-blur-xs">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[#C6A15D]/30 to-[#C6A15D]/10 border border-[#C6A15D]/50 text-[#DFC89D] shrink-0">
                  <Gift className="w-4 h-4 text-[#DFC89D]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-wide">Patron Welcome Courtesy</h4>
                  <p className="text-[11px] text-[#DFC89D] mt-0.5 leading-snug">Exclusive introductory courtesies on bespoke orders.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#160307]/85 border border-[#C6A15D]/35 shadow-md backdrop-blur-xs">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[#C6A15D]/30 to-[#C6A15D]/10 border border-[#C6A15D]/50 text-[#DFC89D] shrink-0">
                  <ShieldCheck className="w-4 h-4 text-[#DFC89D]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-wide">Bespoke Fit Concierge</h4>
                  <p className="text-[11px] text-[#DFC89D] mt-0.5 leading-snug">Save custom measurements and enjoy real-time dispatch tracking.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security / Trust Mark */}
          <div className="relative z-10 pt-4 mt-6 border-t border-[#C6A15D]/30 text-xs flex items-center justify-between text-[#DFC89D]">
            <div className="flex items-center gap-1.5 text-white font-medium">
              <ShieldCheck className="w-4 h-4 text-[#C6A15D]" />
              <span>Verified Luxury Boutique</span>
            </div>
            <div className="flex items-center gap-1 text-[#DFC89D] font-bold">
              <span>★★★★★</span>
              <span className="text-white text-[11px]">4.9/5</span>
            </div>
          </div>
        </div>

        {/* Right Column: Tabbed Authentication Form */}
        <div className="w-full md:w-7/12 p-5 sm:p-8 flex flex-col justify-between bg-[#FAF7F2]/40 overflow-y-auto max-h-[82vh] md:max-h-none">
          <div>
            {/* Mobile Header Branding */}
            <div className="md:hidden text-center mb-4 pt-1">
              <span className="font-serif text-2xl font-bold tracking-wider text-[#3E1A1E] uppercase inline-block">
                ETHNIZ<span className="text-[#A9833D] font-light italic lowercase text-xl font-serif">couture</span>
              </span>
              <p className="text-[11px] text-zinc-500 font-medium">Haute Couture Atelier Authentication</p>
            </div>

            {/* Navigation Tabs (Login vs Register) */}
            <div className="flex border-b border-[#E8DEC8] mb-5">
              <button
                type="button"
                onClick={() => handleSwitchTab('login')}
                className={`flex-1 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-center transition-all relative ${
                  activeTab === 'login'
                    ? 'text-[#3E1A1E]'
                    : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                Sign In
                {activeTab === 'login' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3E1A1E]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSwitchTab('signup')}
                className={`flex-1 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-center transition-all relative ${
                  activeTab === 'signup'
                    ? 'text-[#3E1A1E]'
                    : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                Create Account
                {activeTab === 'signup' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3E1A1E]" />
                )}
              </button>
            </div>

            {/* Global Error Banner */}
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-800 font-medium">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Tab 1: SIGN IN */}
            {activeTab === 'login' && (
              <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-800 mb-1.5 text-xs sm:text-[11px]">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={firstInputRef}
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (touched.email) {
                          const res = validateEmail(e.target.value);
                          setFieldErrors((prev) => ({ ...prev, email: res.isValid ? undefined : res.error }));
                        }
                      }}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, email: true }));
                        const res = validateEmail(email);
                        setFieldErrors((prev) => ({ ...prev, email: res.isValid ? undefined : res.error }));
                      }}
                      className={`w-full pl-10 pr-3 h-12 sm:h-10 text-base sm:text-xs bg-white border rounded-xl sm:rounded-lg focus:outline-none transition-colors ${
                        touched.email && fieldErrors.email
                          ? 'border-red-500 bg-red-50/20 focus:ring-1 focus:ring-red-500'
                          : 'border-zinc-300 focus:border-[#3E1A1E]'
                      }`}
                    />
                  </div>
                  {touched.email && fieldErrors.email && (
                    <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.email}</span>
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold uppercase tracking-wider text-zinc-800 text-xs sm:text-[11px]">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-[#3E1A1E] hover:underline font-semibold"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (touched.password) {
                          const valid = Boolean(e.target.value && e.target.value.trim().length >= 6);
                          setFieldErrors((prev) => ({
                            ...prev,
                            password: valid ? undefined : 'Password is required (minimum 6 characters).'
                          }));
                        }
                      }}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, password: true }));
                        const valid = Boolean(password && password.trim().length >= 6);
                        setFieldErrors((prev) => ({
                          ...prev,
                          password: valid ? undefined : 'Password is required (minimum 6 characters).'
                        }));
                      }}
                      className={`w-full pl-10 pr-11 h-12 sm:h-10 text-base sm:text-xs bg-white border rounded-xl sm:rounded-lg focus:outline-none transition-colors ${
                        touched.password && fieldErrors.password
                          ? 'border-red-500 bg-red-50/20 focus:ring-1 focus:ring-red-500'
                          : 'border-zinc-300 focus:border-[#3E1A1E]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {touched.password && fieldErrors.password && (
                    <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.password}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 sm:h-11 min-h-[48px] sm:min-h-[42px] bg-[#3E1A1E] hover:bg-[#2E1115] disabled:bg-zinc-400 text-white font-bold uppercase tracking-widest rounded-xl sm:rounded-lg shadow transition-colors mt-2 text-xs sm:text-xs flex items-center justify-center cursor-pointer"
                >
                  {isSubmitting ? 'Verifying Credentials...' : 'Sign In as Patron'}
                </button>
              </form>
            )}

            {/* Tab 2: CREATE PATRON ACCOUNT */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignupSubmit} noValidate className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-800 mb-1 text-xs sm:text-[11px]">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={firstInputRef}
                      type="text"
                      required
                      placeholder="e.g. Radhika Merchant"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (touched.name) {
                          const res = validateFullName(e.target.value, 'Full Name');
                          setFieldErrors((prev) => ({ ...prev, name: res.isValid ? undefined : res.error }));
                        }
                      }}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, name: true }));
                        const res = validateFullName(name, 'Full Name');
                        setFieldErrors((prev) => ({ ...prev, name: res.isValid ? undefined : res.error }));
                      }}
                      className={`w-full pl-10 pr-3 h-12 sm:h-10 text-base sm:text-xs bg-white border rounded-xl sm:rounded-lg focus:outline-none transition-colors ${
                        touched.name && fieldErrors.name
                          ? 'border-red-500 bg-red-50/20 focus:ring-1 focus:ring-red-500'
                          : 'border-zinc-300 focus:border-[#3E1A1E]'
                      }`}
                    />
                  </div>
                  {touched.name && fieldErrors.name && (
                    <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.name}</span>
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-800 mb-1 text-xs sm:text-[11px]">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (touched.email) {
                          const res = validateEmail(e.target.value);
                          setFieldErrors((prev) => ({ ...prev, email: res.isValid ? undefined : res.error }));
                        }
                      }}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, email: true }));
                        const res = validateEmail(email);
                        setFieldErrors((prev) => ({ ...prev, email: res.isValid ? undefined : res.error }));
                      }}
                      className={`w-full pl-10 pr-3 h-12 sm:h-10 text-base sm:text-xs bg-white border rounded-xl sm:rounded-lg focus:outline-none transition-colors ${
                        touched.email && fieldErrors.email
                          ? 'border-red-500 bg-red-50/20 focus:ring-1 focus:ring-red-500'
                          : 'border-zinc-300 focus:border-[#3E1A1E]'
                      }`}
                    />
                  </div>
                  {touched.email && fieldErrors.email && (
                    <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.email}</span>
                    </p>
                  )}
                </div>

                {/* Contact Phone (Optional) */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-800 mb-1 text-xs sm:text-[11px]">
                    Contact Phone (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      placeholder="+91 98200 12345"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (touched.phone) {
                          const res = validatePhone(e.target.value, false);
                          setFieldErrors((prev) => ({ ...prev, phone: res.isValid ? undefined : res.error }));
                        }
                      }}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, phone: true }));
                        const res = validatePhone(phone, false);
                        setFieldErrors((prev) => ({ ...prev, phone: res.isValid ? undefined : res.error }));
                      }}
                      className={`w-full pl-10 pr-3 h-12 sm:h-10 text-base sm:text-xs bg-white border rounded-xl sm:rounded-lg focus:outline-none transition-colors ${
                        touched.phone && fieldErrors.phone
                          ? 'border-red-500 bg-red-50/20 focus:ring-1 focus:ring-red-500'
                          : 'border-zinc-300 focus:border-[#3E1A1E]'
                      }`}
                    />
                  </div>
                  {touched.phone && fieldErrors.phone && (
                    <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.phone}</span>
                    </p>
                  )}
                </div>

                {/* Password with Strength Criteria */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-800 mb-1 text-xs sm:text-[11px]">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (touched.password) {
                          const res = evaluatePassword(e.target.value);
                          setFieldErrors((prev) => ({ ...prev, password: res.isValid ? undefined : res.error }));
                        }
                        if (touched.confirmPassword && confirmPassword) {
                          const res = validateConfirmPassword(e.target.value, confirmPassword);
                          setFieldErrors((prev) => ({ ...prev, confirmPassword: res.isValid ? undefined : res.error }));
                        }
                      }}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, password: true }));
                        const res = evaluatePassword(password);
                        setFieldErrors((prev) => ({ ...prev, password: res.isValid ? undefined : res.error }));
                      }}
                      className={`w-full pl-10 pr-11 h-12 sm:h-10 text-base sm:text-xs bg-white border rounded-xl sm:rounded-lg focus:outline-none transition-colors ${
                        touched.password && fieldErrors.password
                          ? 'border-red-500 bg-red-50/20 focus:ring-1 focus:ring-red-500'
                          : 'border-zinc-300 focus:border-[#3E1A1E]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Checklist & Bar */}
                  {password.length > 0 && (
                    <div className="mt-2 p-2 bg-white rounded-lg border border-[#C6A15D]/40 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-600">Password Security:</span>
                        <span
                          className={`font-bold ${
                            passwordEvaluation.level === 'Weak'
                              ? 'text-red-600'
                              : passwordEvaluation.level === 'Fair'
                              ? 'text-amber-600'
                              : passwordEvaluation.level === 'Good'
                              ? 'text-emerald-600'
                              : 'text-[#3E1A1E]'
                          }`}
                        >
                          {passwordEvaluation.level}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden flex gap-1">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            passwordEvaluation.score <= 1
                              ? 'w-1/4 bg-red-500'
                              : passwordEvaluation.score === 2
                              ? 'w-2/4 bg-amber-500'
                              : passwordEvaluation.score === 3
                              ? 'w-3/4 bg-emerald-500'
                              : 'w-full bg-[#3E1A1E]'
                          }`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-600 pt-0.5">
                        <div className="flex items-center gap-1">
                          <CheckCircle2
                            className={`w-3 h-3 ${passwordEvaluation.checks.length ? 'text-emerald-600' : 'text-zinc-300'}`}
                          />
                          <span>8+ Chars</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle2
                            className={`w-3 h-3 ${passwordEvaluation.checks.uppercase ? 'text-emerald-600' : 'text-zinc-300'}`}
                          />
                          <span>1 Uppercase</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle2
                            className={`w-3 h-3 ${passwordEvaluation.checks.lowercase ? 'text-emerald-600' : 'text-zinc-300'}`}
                          />
                          <span>1 Lowercase</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle2
                            className={`w-3 h-3 ${passwordEvaluation.checks.number ? 'text-emerald-600' : 'text-zinc-300'}`}
                          />
                          <span>1 Number</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {touched.password && fieldErrors.password && (
                    <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.password}</span>
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-800 mb-1 text-xs sm:text-[11px]">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (touched.confirmPassword) {
                          const res = validateConfirmPassword(password, e.target.value);
                          setFieldErrors((prev) => ({ ...prev, confirmPassword: res.isValid ? undefined : res.error }));
                        }
                      }}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, confirmPassword: true }));
                        const res = validateConfirmPassword(password, confirmPassword);
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: res.isValid ? undefined : res.error }));
                      }}
                      className={`w-full pl-10 pr-3 h-12 sm:h-10 text-base sm:text-xs bg-white border rounded-xl sm:rounded-lg focus:outline-none transition-colors ${
                        touched.confirmPassword && fieldErrors.confirmPassword
                          ? 'border-red-500 bg-red-50/20 focus:ring-1 focus:ring-red-500'
                          : 'border-zinc-300 focus:border-[#3E1A1E]'
                      }`}
                    />
                  </div>
                  {touched.confirmPassword && fieldErrors.confirmPassword && (
                    <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.confirmPassword}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 sm:h-11 min-h-[48px] sm:min-h-[42px] bg-[#3E1A1E] hover:bg-[#2E1115] disabled:bg-zinc-400 text-white font-bold uppercase tracking-widest rounded-xl sm:rounded-lg shadow transition-colors mt-2 text-xs sm:text-xs flex items-center justify-center cursor-pointer"
                >
                  {isSubmitting ? 'Creating Account...' : 'Register as Patron'}
                </button>
              </form>
            )}
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-3.5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E8DEC8]" />
            </div>
            <div className="relative px-3 bg-[#FAF7F2] text-[10px] uppercase font-bold tracking-widest text-zinc-400">
              Or continue with
            </div>
          </div>

          {/* Google Sign-In */}
          <GoogleSignInButton
            text={activeTab === 'signup' ? 'signup' : 'continue'}
            onSuccessCallback={() => setIsOpen(false)}
          />

          {/* Bottom Action: "Continue browsing as guest" & Confidentiality Note */}
          <div className="mt-4 pt-3 border-t border-[#E8DEC8] text-center space-y-2">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-semibold text-zinc-600 hover:text-[#3E1A1E] transition-colors group cursor-pointer active:scale-98"
            >
              <span>Continue browsing as guest</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 text-[#C6A15D]" />
            </button>
            <p className="text-[10px] text-zinc-400">
              Zero spam · Atelier privacy guaranteed · Easy guest checkout
            </p>
          </div>
        </div>
      </div>

      {showForgotPassword && (
        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
          initialEmail={email}
          onSuccess={() => {
            setShowForgotPassword(false);
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
};
