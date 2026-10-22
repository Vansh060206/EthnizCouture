import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, KeyRound, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, X, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  onSuccess?: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
  onSuccess
}) => {
  const { showToast } = useToast();
  const { login } = useAuth();

  const [step, setStep] = useState<'REQUEST' | 'VERIFY_RESET' | 'SUCCESS'>('REQUEST');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  const otpInputRef = useRef<HTMLInputElement>(null);

  // Sync initial email when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '');
      setStep('REQUEST');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMessage('');
      setResendCountdown(0);
    }
  }, [isOpen, initialEmail]);

  // Handle Resend countdown timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCountdown > 0) {
      timer = setTimeout(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // Focus OTP input when transitioning to VERIFY_RESET step
  useEffect(() => {
    if (step === 'VERIFY_RESET') {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 150);
    }
  }, [step]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate password strength
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-zinc-200' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-blue-500' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(newPassword);

  // Step 1: Send OTP to email
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: cleanEmail });
      showToast(res.data.message || 'Verification code dispatched to your email', 'success');
      setStep('VERIFY_RESET');
      setResendCountdown(60);
    } catch (err: any) {
      if (err.response?.status === 429) {
        showToast('A verification code was already dispatched. Please enter it below.', 'info');
        setStep('VERIFY_RESET');
        setResendCountdown(60);
        return;
      }
      const msg =
        err.response?.data?.message ||
        (err.message === 'Network Error'
          ? 'Cannot connect to server. Please check your network connection.'
          : 'Unable to request password recovery. Please check your email and retry.');
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (resendCountdown > 0 || isLoading) return;
    setErrorMessage('');
    setIsLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      showToast(res.data.message || 'New verification code sent to your email', 'success');
      setResendCountdown(60);
      setOtp('');
      otpInputRef.current?.focus();
    } catch (err: any) {
      if (err.response?.status === 429) {
        showToast('Please wait a moment before requesting another code.', 'info');
        setResendCountdown(30);
        return;
      }
      const msg = err.response?.data?.message || 'Failed to resend code. Please try again shortly.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Validate OTP and Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        otp: cleanOtp,
        newPassword
      });

      showToast(res.data.message || 'Password reset successful!', 'success');
      setStep('SUCCESS');

      // Attempt immediate seamless login with new credentials
      try {
        await login(email.trim().toLowerCase(), newPassword);
        showToast('Signed in successfully with your new password.', 'success');
        if (onSuccess) onSuccess();
      } catch (loginErr) {
        console.warn('Auto login after reset skipped or failed', loginErr);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Password reset failed. Please check your verification code.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 transition-all"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-2xl shadow-2xl border-t sm:border border-[#C5A262]/30 sm:border-zinc-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in slide-in-from-bottom duration-300"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}
      >
        
        {/* Mobile Pull Handle Indicator */}
        <div className="w-12 h-1 bg-zinc-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-5 py-4 sm:p-6 sm:pb-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-[#FAF7F2]">
          <div className="flex items-center gap-3">
            {step === 'VERIFY_RESET' && (
              <button
                type="button"
                onClick={() => {
                  setStep('REQUEST');
                  setErrorMessage('');
                }}
                className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-600 hover:text-zinc-900 active:scale-95 hover:bg-white transition-all"
                title="Change Email"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-[#84642C] bg-[#FAF1DF] px-2 py-0.5 rounded">
                  ATELIER SECURITY
                </span>
              </div>
              <h2 id="forgot-password-title" className="text-base sm:text-lg font-serif font-bold text-[#3E1A1E] mt-0.5">
                {step === 'REQUEST' && 'Reset Account Password'}
                {step === 'VERIFY_RESET' && 'Enter Verification Code'}
                {step === 'SUCCESS' && 'Password Updated'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/50 active:scale-95 flex items-center justify-center transition-all"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: REQUEST OTP */}
          {step === 'REQUEST' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Enter your registered email address. We'll send a 6-digit verification code to securely reset your password.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    inputMode="email"
                    required
                    autoFocus
                    placeholder="patron@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-zinc-200 text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#3E1A1E]/10 transition-all bg-white"
                  />
                </div>
              </div>

              <div className="bg-[#FAF7F2] border border-[#EBE4D8] rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-[#84642C]">
                <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-[#C5A262]" />
                <span>
                  A one-time code valid for 15 minutes will be dispatched to safeguard your atelier account.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#3E1A1E] text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-md hover:bg-[#2C1215] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching Code...</span>
                  </>
                ) : (
                  <span>Send Recovery Code</span>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: ENTER OTP & NEW PASSWORD */}
          {step === 'VERIFY_RESET' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="text-xs text-amber-900 leading-relaxed truncate">
                  Sent to <span className="font-semibold text-zinc-900">{email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('REQUEST');
                    setErrorMessage('');
                  }}
                  className="text-xs text-[#3E1A1E] font-bold hover:underline shrink-0 active:scale-95"
                >
                  Edit
                </button>
              </div>

              {/* Segmented Native 6-Digit OTP Box Display */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                    6-Digit Code <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    disabled={resendCountdown > 0 || isLoading}
                    onClick={handleResendOtp}
                    className="text-xs text-[#3E1A1E] hover:underline font-semibold disabled:text-zinc-400 disabled:no-underline transition-colors flex items-center gap-1 active:scale-95"
                  >
                    {resendCountdown > 0 ? (
                      `Resend in ${resendCountdown}s`
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        <span>Resend Code</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  {/* Hidden real input for accessibility & mobile keyboards */}
                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtp(val);
                      if (val.length === 6) setErrorMessage('');
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                  />

                  {/* 6 Native Visual Boxes */}
                  <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                    {[0, 1, 2, 3, 4, 5].map((idx) => {
                      const digit = otp[idx] || '';
                      const isFocused = otp.length === idx || (idx === 5 && otp.length === 6);
                      return (
                        <div
                          key={idx}
                          className={`h-13 sm:h-12 flex items-center justify-center font-mono text-xl sm:text-2xl font-bold rounded-xl border-2 transition-all ${
                            digit
                              ? 'border-[#3E1A1E] bg-white text-[#3E1A1E] shadow-xs'
                              : isFocused
                              ? 'border-[#C5A262] bg-[#FAF7F2] ring-2 ring-[#C5A262]/20'
                              : 'border-zinc-200 bg-zinc-50/50 text-zinc-400'
                          }`}
                        >
                          {digit || (isFocused ? <span className="w-1.5 h-1.5 bg-[#C5A262] rounded-full animate-ping" /> : '•')}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-12 pl-11 pr-11 rounded-xl border border-zinc-200 text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#3E1A1E]/10 transition-all bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 active:scale-95 p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength meter */}
                {newPassword && (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex gap-1 h-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`flex-1 rounded-full h-full transition-all duration-300 ${
                            level <= strength.score ? strength.color : 'bg-zinc-200'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-zinc-400">Strength</span>
                      <span className={`font-semibold ${
                        strength.score <= 1 ? 'text-red-600' :
                        strength.score === 2 ? 'text-amber-600' :
                        strength.score === 3 ? 'text-blue-600' : 'text-emerald-600'
                      }`}>
                        {strength.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-type new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-12 pl-11 pr-11 rounded-xl border border-zinc-200 text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#3E1A1E]/10 transition-all bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 active:scale-95 p-1"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length !== 6 || newPassword.length < 6 || newPassword !== confirmPassword}
                className="w-full h-12 bg-[#3E1A1E] text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-md hover:bg-[#2C1215] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Reset & Secure Account</span>
                )}
              </button>
            </form>
          )}

          {/* STEP 3: SUCCESS */}
          {step === 'SUCCESS' && (
            <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-serif font-bold text-zinc-900">
                  Password Updated Successfully
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 mt-1 max-w-sm mx-auto leading-relaxed">
                  Your credentials have been securely updated. A confirmation notice was dispatched to your email.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full h-12 bg-[#3E1A1E] text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-md hover:bg-[#2C1215] active:scale-[0.98] transition-all"
              >
                Continue to Atelier
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
