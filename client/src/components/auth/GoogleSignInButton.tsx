import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { User } from '../../types';

interface GoogleSignInButtonProps {
  redirectUrl?: string;
  onSuccessCallback?: (user: User, isNewUser: boolean) => void;
  text?: 'signin' | 'signup' | 'continue';
  className?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: string | number;
            }
          ) => void;
          prompt: (notification?: (notification: any) => void) => void;
        };
      };
    };
  }
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  redirectUrl,
  onSuccessCallback,
  text = 'continue',
  className = ''
}) => {
  const { googleLogin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isGoogleRendered, setIsGoogleRendered] = useState(false);

  const googleButtonContainerRef = useRef<HTMLDivElement>(null);

  const effectiveRedirectUrl = redirectUrl || searchParams.get('redirect') || '/account';

  // Read Google Client ID from environment variables
  const clientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '89261062890-r4l4ckev894v3fnp4ckkfb1184jn40eu.apps.googleusercontent.com';

  const buttonLabel =
    text === 'signup'
      ? 'Sign up with Google'
      : text === 'signin'
      ? 'Sign in with Google'
      : 'Continue with Google';

  const handleCredential = async (credential: string) => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const { user, isNewUser } = await googleLogin(credential);

      if (isNewUser) {
        showToast(`Welcome to Ethniz Couture, ${user.name}! Your bespoke account is created.`, 'success');
      } else {
        showToast(`Welcome back, ${user.name}!`, 'success');
      }

      if (onSuccessCallback) {
        onSuccessCallback(user, isNewUser);
      }

      if (user.role === 'ADMIN' && (effectiveRedirectUrl.startsWith('/admin') || effectiveRedirectUrl.startsWith('/atelier-portal'))) {
        navigate('/atelier-portal');
      } else {
        navigate(effectiveRedirectUrl);
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      const msg = err.response?.data?.message || 'Google authentication could not be completed. Please try again.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamically load Google Identity Services script
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-identity-services-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-identity-services-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => {
        console.warn('Google Identity Services script failed to load from Google servers.');
      };
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener('load', () => setScriptLoaded(true));
    }
  }, []);

  // Initialize Google Identity Services
  useEffect(() => {
    if (!scriptLoaded || !window.google?.accounts?.id || !clientId) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential?: string }) => {
          if (response.credential) {
            handleCredential(response.credential);
          } else {
            setError('No Google credentials returned.');
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // Render official Google button into container if available
      if (googleButtonContainerRef.current) {
        googleButtonContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonContainerRef.current, {
          theme: 'outline',
          size: 'large',
          text: text === 'signup' ? 'signup_with' : text === 'signin' ? 'signin_with' : 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: '100%'
        });
        setIsGoogleRendered(true);
      }
    } catch (e) {
      console.warn('Failed to initialize Google Identity Services:', e);
    }
  }, [scriptLoaded, clientId, text]);

  const handleCustomButtonClick = () => {
    if (isLoading) return;
    setError(null);

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed()) {
            // If One Tap is suppressed or in standalone mode, trigger popup
            console.log('Google One Tap suppressed:', notification.getNotDisplayedReason());
          }
        });
      } catch (err) {
        console.warn('Google prompt invocation error:', err);
      }
    } else {
      // Fallback message if Google services are unreachable (e.g. adblocker)
      setError('Google Sign-In is initializing. Please verify your connection or use email & password.');
    }
  };

  return (
    <div className={`w-full ${className}`}>
      
      {/* Target container for official Google button */}
      <div
        ref={googleButtonContainerRef}
        className={`w-full flex justify-center [&>div]:w-full [&>div>iframe]:!w-full [&>div>iframe]:!rounded-lg ${
          isGoogleRendered ? 'block' : 'hidden'
        }`}
        style={{ minHeight: '44px' }}
      />

      {/* Fallback button shown ONLY before Google SDK renders into the container */}
      {!isGoogleRendered && (
        <button
          type="button"
          onClick={handleCustomButtonClick}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-white hover:bg-[#FAF7F2] active:bg-[#F5EFE3] text-zinc-800 text-xs font-bold tracking-wider uppercase rounded-lg border border-[#DFC89D] hover:border-[#3E1A1E] transition-all duration-200 shadow-xs flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
          aria-label={buttonLabel}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 text-[#84642C] animate-spin" />
              <span>Authenticating with Atelier...</span>
            </>
          ) : (
            <>
              {/* Official Google Vector Icon */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="font-sans font-bold text-zinc-800 tracking-wider">
                {buttonLabel}
              </span>
            </>
          )}
        </button>
      )}

      {/* Error Notice */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 p-2 rounded border border-red-200 animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

    </div>
  );
};
