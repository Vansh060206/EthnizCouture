import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, Phone, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  validateEmail,
  validateFullName,
  validatePhone,
  evaluatePassword,
  validateConfirmPassword
} from '../utils/validation';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';

export const Signup: React.FC = () => {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectUrl = searchParams.get('redirect') || '/account';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field validation and touched tracking
  const [touched, setTouched] = useState<{
    name?: boolean;
    email?: boolean;
    phone?: boolean;
    password?: boolean;
    confirmPassword?: boolean;
  }>({});

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const passwordEvaluation = evaluatePassword(password);

  const validateField = (field: 'name' | 'email' | 'phone' | 'password' | 'confirmPassword', val: string) => {
    let isValid = true;
    let errMessage: string | undefined;

    switch (field) {
      case 'name': {
        const res = validateFullName(val, 'Full Name');
        isValid = res.isValid;
        errMessage = res.error;
        break;
      }
      case 'email': {
        const res = validateEmail(val);
        isValid = res.isValid;
        errMessage = res.error;
        break;
      }
      case 'phone': {
        // Phone is optional during sign up, but if provided must be a valid 10-digit Indian phone
        const res = validatePhone(val, false);
        isValid = res.isValid;
        errMessage = res.error;
        break;
      }
      case 'password': {
        const evalRes = evaluatePassword(val);
        isValid = evalRes.isValid;
        errMessage = evalRes.error;
        break;
      }
      case 'confirmPassword': {
        const res = validateConfirmPassword(password, val);
        isValid = res.isValid;
        errMessage = res.error;
        break;
      }
    }

    setFieldErrors((prev) => ({ ...prev, [field]: errMessage }));
    return isValid;
  };

  const handleBlur = (field: 'name' | 'email' | 'phone' | 'password' | 'confirmPassword') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'name') validateField('name', name);
    if (field === 'email') validateField('email', email);
    if (field === 'phone') validateField('phone', phone);
    if (field === 'password') validateField('password', password);
    if (field === 'confirmPassword') validateField('confirmPassword', confirmPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Touch all fields
    setTouched({
      name: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true
    });

    const isNameValid = validateField('name', name);
    const isEmailValid = validateField('email', email);
    const isPhoneValid = validateField('phone', phone);
    const isPasswordValid = validateField('password', password);
    const isConfirmValid = validateField('confirmPassword', confirmPassword);

    if (!isNameValid || !isEmailValid || !isPhoneValid || !isPasswordValid || !isConfirmValid) {
      setError('Please resolve the highlighted validation errors before proceeding.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await register(name, email, password, phone);
      showToast(`Welcome to EthnizCouture, ${user.name}!`, 'success');
      navigate(redirectUrl);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
            Create Patron Account
          </h2>
          <p className="text-xs text-zinc-500">
            Join the inner circle for private previews, order tracking, and bespoke sizing.
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
          {/* Full Name */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-zinc-800 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                placeholder="e.g. Radhika Merchant"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (touched.name) validateField('name', e.target.value);
                }}
                onBlur={() => handleBlur('name')}
                className={`w-full h-12 sm:h-11 pl-10 pr-3.5 rounded-xl sm:rounded-lg border text-base sm:text-xs text-zinc-900 focus:outline-none transition-all ${
                  touched.name && fieldErrors.name
                    ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                    : 'border-[#E8DEC8] bg-white focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30'
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
            <label className="block font-bold uppercase tracking-wider text-zinc-800 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="radhika@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched.email) validateField('email', e.target.value);
                }}
                onBlur={() => handleBlur('email')}
                className={`w-full h-12 sm:h-11 pl-10 pr-3.5 rounded-xl sm:rounded-lg border text-base sm:text-xs text-zinc-900 focus:outline-none transition-all ${
                  touched.email && fieldErrors.email
                    ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
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

          {/* Contact Phone (Optional but strictly validated if entered) */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-zinc-800 mb-1">
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
                  if (touched.phone) validateField('phone', e.target.value);
                }}
                onBlur={() => handleBlur('phone')}
                className={`w-full h-12 sm:h-11 pl-10 pr-3.5 rounded-xl sm:rounded-lg border text-base sm:text-xs text-zinc-900 focus:outline-none transition-all ${
                  touched.phone && fieldErrors.phone
                    ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                    : 'border-[#E8DEC8] bg-white focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30'
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
            <label className="block font-bold uppercase tracking-wider text-zinc-800 mb-1">
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
                  if (touched.password) validateField('password', e.target.value);
                  if (touched.confirmPassword && confirmPassword) {
                    validateField('confirmPassword', confirmPassword);
                  }
                }}
                onBlur={() => handleBlur('password')}
                className={`w-full h-12 sm:h-11 pl-10 pr-11 rounded-xl sm:rounded-lg border text-base sm:text-xs text-zinc-900 focus:outline-none transition-all ${
                  touched.password && fieldErrors.password
                    ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
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

            {/* Password Strength Checklist & Bar */}
            {password.length > 0 && (
              <div className="mt-2.5 p-2.5 bg-[#FAF7F2] rounded-lg border border-gold-200/80 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-600">Password Security:</span>
                  <span
                    className={`font-bold ${
                      passwordEvaluation.level === 'Weak'
                        ? 'text-red-600'
                        : passwordEvaluation.level === 'Fair'
                        ? 'text-amber-600'
                        : passwordEvaluation.level === 'Good'
                        ? 'text-emerald-600'
                        : 'text-maroon-800'
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
                        : 'w-full bg-maroon-800'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-600 pt-1">
                  <div className="flex items-center gap-1">
                    <CheckCircle2
                      className={`w-3 h-3 ${
                        passwordEvaluation.checks.length ? 'text-emerald-600' : 'text-zinc-300'
                      }`}
                    />
                    <span>Min 8 characters</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2
                      className={`w-3 h-3 ${
                        passwordEvaluation.checks.uppercase ? 'text-emerald-600' : 'text-zinc-300'
                      }`}
                    />
                    <span>1 Uppercase (A-Z)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2
                      className={`w-3 h-3 ${
                        passwordEvaluation.checks.lowercase ? 'text-emerald-600' : 'text-zinc-300'
                      }`}
                    />
                    <span>1 Lowercase (a-z)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2
                      className={`w-3 h-3 ${
                        passwordEvaluation.checks.number ? 'text-emerald-600' : 'text-zinc-300'
                      }`}
                    />
                    <span>1 Digit (0-9)</span>
                  </div>
                  <div className="flex items-center gap-1 col-span-2">
                    <CheckCircle2
                      className={`w-3 h-3 ${
                        passwordEvaluation.checks.specialChar ? 'text-emerald-600' : 'text-zinc-300'
                      }`}
                    />
                    <span>1 Special symbol (!@#$%...)</span>
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
            <label className="block font-bold uppercase tracking-wider text-zinc-800 mb-1">
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
                  if (touched.confirmPassword) validateField('confirmPassword', e.target.value);
                }}
                onBlur={() => handleBlur('confirmPassword')}
                className={`w-full h-12 sm:h-11 pl-10 pr-3.5 rounded-xl sm:rounded-lg border text-base sm:text-xs text-zinc-900 focus:outline-none transition-all ${
                  touched.confirmPassword && fieldErrors.confirmPassword
                    ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                    : 'border-[#E8DEC8] bg-white focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30'
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
            disabled={isLoading}
            className="w-full h-12 bg-[#3E1A1E] hover:bg-[#2B0C10] active:bg-[#1A080B] disabled:bg-zinc-400 text-[#DFC89D] font-bold uppercase tracking-widest rounded-xl sm:rounded-lg shadow-md border border-[#C6A15D]/50 transition-all mt-2 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating Account...' : 'Register as Patron'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E8DEC8]" />
          </div>
          <div className="relative px-3 bg-white text-[10px] uppercase font-bold tracking-widest text-zinc-400">
            Or sign up with
          </div>
        </div>

        {/* Google Sign-In */}
        <GoogleSignInButton redirectUrl={redirectUrl} text="signup" />

        <div className="text-center pt-2 text-xs text-zinc-600">
          <span>Already registered? </span>
          <Link to={`/login?redirect=${encodeURIComponent(redirectUrl)}`} className="font-bold text-maroon-800 hover:underline">
            Sign In
          </Link>
        </div>

      </div>
    </div>
  );
};
