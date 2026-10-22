import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, KeyRound, Eye, EyeOff, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { validateEmail } from '../../utils/validation';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/atelier-portal';
  const { adminLogin } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [masterKey, setMasterKey] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showMasterKey, setShowMasterKey] = useState(false);

  const [errors, setErrors] = useState<{ email?: string; password?: string; masterKey?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const errs: { email?: string; password?: string; masterKey?: string } = {};

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      errs.email = emailCheck.error || 'Valid administrative email is required';
    }

    if (!password || password.trim().length === 0) {
      errs.password = 'Master administrative password is required';
    }

    if (!masterKey || masterKey.trim().length === 0) {
      errs.masterKey = 'Master Secret Passkey is mandatory for clearance';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const user = await adminLogin(email.trim(), password, masterKey.trim());
      showToast(`Welcome back, Executive ${user.name}`, 'success');
      navigate(redirectUrl, { replace: true });
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        'Administrative authentication failed. Please verify your credentials and Master Secret Passkey.';
      setServerError(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070204] text-stone-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-[#C6A15D] selection:text-black">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#3A0D18]/40 via-[#0B0205] to-[#050103] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#C6A15D]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#8B1E3F]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative z-10 w-full max-w-lg bg-[#110408]/95 border border-[#C6A15D]/30 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl p-6 sm:p-10 space-y-8">
        
        {/* Emblem & Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3E1A1E] to-[#18040B] border border-[#C6A15D]/50 shadow-inner text-[#C6A15D] mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-[0.25em] bg-[#C6A15D]/10 text-[#DFC89D] border border-[#C6A15D]/30 mb-2">
              <Sparkles className="w-3 h-3 text-[#C6A15D]" /> Restricted Executive Atelier
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-wider text-[#F7F1E5]">
              Executive Command
            </h1>
            <p className="text-xs text-stone-400 mt-1 tracking-wide">
              Proprietor Stock, Order & Inventory Authentication
            </p>
          </div>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-950/60 border border-red-700/60 text-red-200 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Clearance Denied</span>
              <span>{serverError}</span>
            </div>
          </div>
        )}

        {/* 3-Field Admin Form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          
          {/* Field 1: Admin Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#DFC89D]">
              Administrator Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="executive@ethnizcouture.com"
                autoComplete="username"
                className={`w-full pl-10 pr-4 py-3 bg-[#1A060D] border ${
                  errors.email ? 'border-red-500' : 'border-[#C6A15D]/30 focus:border-[#C6A15D]'
                } rounded-lg text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-[#C6A15D] transition-all`}
              />
            </div>
            {errors.email && (
              <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" /> {errors.email}
              </p>
            )}
          </div>

          {/* Field 2: Admin Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#DFC89D]">
              Master Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="••••••••••••"
                autoComplete="current-password"
                className={`w-full pl-10 pr-10 py-3 bg-[#1A060D] border ${
                  errors.password ? 'border-red-500' : 'border-[#C6A15D]/30 focus:border-[#C6A15D]'
                } rounded-lg text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-[#C6A15D] transition-all`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-[#DFC89D] transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" /> {errors.password}
              </p>
            )}
          </div>

          {/* Field 3: Master Secret Passkey */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#C6A15D] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#C6A15D]" /> Atelier Secret Passkey
              </label>
              <span className="text-[10px] text-stone-400 uppercase tracking-widest">Single-Tenant Exclusive</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#C6A15D]">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showMasterKey ? 'text' : 'password'}
                value={masterKey}
                onChange={(e) => {
                  setMasterKey(e.target.value);
                  if (errors.masterKey) setErrors((prev) => ({ ...prev, masterKey: undefined }));
                }}
                placeholder="EC-ROYAL-ATELIER-XXXX-XXXX-XXXX"
                autoComplete="off"
                spellCheck={false}
                className={`w-full pl-10 pr-10 py-3 bg-[#240812] border ${
                  errors.masterKey ? 'border-red-500' : 'border-[#C6A15D]/60 focus:border-[#DFC89D]'
                } rounded-lg text-sm font-mono tracking-wider text-[#DFC89D] placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-[#DFC89D] transition-all shadow-inner`}
              />
              <button
                type="button"
                onClick={() => setShowMasterKey(!showMasterKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-[#DFC89D] transition-colors"
                tabIndex={-1}
              >
                {showMasterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.masterKey ? (
              <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" /> {errors.masterKey}
              </p>
            ) : (
              <p className="text-[10px] text-stone-400 tracking-wide mt-1">
                Cryptographic clearance passkey issued exclusively to the business owner.
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 py-3.5 px-6 rounded-lg bg-gradient-to-r from-[#8B1E3F] via-[#3E1A1E] to-[#8B1E3F] hover:from-[#A8264E] hover:to-[#551824] text-[#F7F1E5] font-serif text-sm font-bold uppercase tracking-[0.2em] border border-[#C6A15D]/40 shadow-[0_4px_20px_rgba(139,30,63,0.4)] hover:shadow-[0_4px_25px_rgba(198,161,93,0.3)] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-[#DFC89D] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Authenticate Clearance</span>
                <ArrowRight className="w-4 h-4 text-[#DFC89D] group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Security Notice & Storefront Exit */}
        <div className="pt-4 border-t border-stone-800/80 text-center space-y-3">
          <p className="text-[10px] text-stone-400 uppercase tracking-widest">
            Protected by Cryptographic Passkey Clearance & Role Isolation
          </p>
          <div>
            <Link
              to="/"
              className="text-xs text-[#DFC89D]/70 hover:text-[#DFC89D] underline decoration-[#C6A15D]/40 hover:decoration-[#C6A15D] transition-colors"
            >
              ← Return to EthnizCouture Public Boutique
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminLogin;
