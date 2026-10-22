import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  redirectMessage?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  adminOnly = false,
  redirectMessage = 'Please sign in to continue.'
}) => {
  const { user, isLoading, isAdmin } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !user && redirectMessage) {
      showToast(redirectMessage, 'info');
    }
  }, [isLoading, user, redirectMessage, showToast]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C6A15D] border-t-[#3E1A1E] rounded-full animate-spin" />
      </div>
    );
  }

  if (adminOnly) {
    if (!user || !isAdmin) {
      const redirectTarget = encodeURIComponent(location.pathname + location.search);
      return <Navigate to={`/atelier-portal/login?redirect=${redirectTarget}`} replace />;
    }
  }

  if (!user) {
    const redirectTarget = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectTarget}`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
