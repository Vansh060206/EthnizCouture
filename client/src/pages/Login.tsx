import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validateEmail } from '../utils/validation';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectUrl = searchParams.get('redirect') || '/account';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field-level error & touched tracking
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});

  const validateField = (field: 'email' | 'password', value: string) => {
    if (field === 'email') {
      const res = validateEmail(value);
      setFieldErrors((prev) => ({
        ...prev,
        email: res.isValid ? undefined : res.error
      }));
      return res.isValid;
    } else if (field === 'password') {
      const isValid = Boolean(value && value.trim().length >= 6);
      setFieldErrors((prev) => ({
        ...prev,
        password: isValid ? undefined : 'Password is required (minimum 6 characters).'
      }));
      return isValid;
    }
    return true;
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'email') validateField('email', email);
    if (field === 'password') validateField('password', password);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Mark all as touched
    setTouched({ email: true, password: true });

    const isEmailValid = validateField('email', email);
    const isPasswordValid = validateField('password', password);

    if (!isEmailValid || !isPasswordValid) {
      setError('Please resolve the errors highlighted below.');
      return;
    }

    setIsLoading(true);

    try {
      const user = await login(email, password);
      showToast(`Welcome back, ${user.name}!`, 'success');
      if (user.role === 'ADMIN' && (redirectUrl.startsWith('/admin') || redirectUrl.startsWith('/atelier-portal'))) {
        navigate('/atelier-portal');
      } else {
        navigate(redirectUrl);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-4 sm:py-10 pb-28 sm:pb-12 px-3 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-5 sm:p-10 rounded-3xl sm:rounded-2xl border border-[#E8DEC8] shadow-luxury space-y-5 sm:space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-1">
          <Link to="/" className="inline-block">
            <span className="font-serif text-3xl font-bold tracking-wider text-maroon-900 uppercase">
              Ethniz<span className="text-gold-600 font-light italic lowercase text-2xl font-serif">Couture</span>
            </span>
          </Link>
          <h2 className="font-serif text-2xl font-bold text-zinc-900 mt-2">
            Welcome to the Atelier
          </h2>
          <p className="text-xs text-zinc-500">
            Sign in to access your curated orders, saved pieces, and private concierge.
          </p>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-300 rounded-lg flex items-center gap-2.5 text-xs text-red-800 font-medium">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
          <div>
            <label className="block font-bold uppercase tracking-wider text-zinc-800 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                inputMode="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched.email) validateField('email', e.target.value);
                }}
                onBlur={() => handleBlur('email')}
                className={`w-full h-12 sm:h-11 pl-10 pr-3.5 rounded-xl sm:rounded-lg border text-base sm:text-sm text-zinc-900 focus:outline-none transition-all ${
                  touched.email && fieldErrors.email
                    ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-2 focus:ring-red-500/20'
                    : 'border-[#E8DEC8] bg-white focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30'
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
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold uppercase tracking-wider text-zinc-800">
                Password <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-[11px] text-[#3E1A1E] hover:underline font-semibold"
              >
                Forgot Password?
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
                  if (touched.password) validateField('password', e.target.value);
                }}
                onBlur={() => handleBlur('password')}
                className={`w-full h-12 sm:h-11 pl-10 pr-10 rounded-xl sm:rounded-lg border text-base sm:text-sm text-zinc-900 focus:outline-none transition-all ${
                  touched.password && fieldErrors.password
                    ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-2 focus:ring-red-500/20'
                    : 'border-[#E8DEC8] bg-white focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-700 rounded-full"
                aria-label="Toggle password visibility"
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
            disabled={isLoading}
            className="w-full h-12 bg-[#3E1A1E] hover:bg-[#2B0C10] active:bg-[#1A080B] active:scale-[0.98] disabled:bg-zinc-400 text-[#DFC89D] font-bold uppercase tracking-widest rounded-xl sm:rounded-lg shadow-md border border-[#C6A15D]/50 transition-all flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying Credentials...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E8DEC8]" />
          </div>
          <div className="relative px-3 bg-white text-[10px] uppercase font-bold tracking-widest text-zinc-400">
            Or continue with
          </div>
        </div>

        {/* Google Sign-In */}
        <GoogleSignInButton redirectUrl={redirectUrl} text="signin" />

        {/* Footer Link */}
        <div className="text-center pt-2 text-xs text-zinc-600">
          <span>New to EthnizCouture? </span>
          <Link to={`/signup?redirect=${encodeURIComponent(redirectUrl)}`} className="font-bold text-maroon-800 hover:underline">
            Create an Account
          </Link>
        </div>

      </div>

      {showForgotPassword && (
        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
          initialEmail={email}
          onSuccess={() => {
            setShowForgotPassword(false);
            navigate(redirectUrl);
          }}
        />
      )}
    </div>
  );
};
