import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Automatically resets scroll position to the top (0, 0) whenever navigating to any page.
 * Prevents pages like OrderConfirmation or ProductDetail from opening scrolled to the bottom.
 */
export const ScrollToTop: React.FC = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, search]);

  return null;
};
