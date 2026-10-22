import api from '../services/api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * Dynamically loads the Razorpay checkout.js script if not already available on window
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      return resolve(true);
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export interface RazorpayCheckoutParams {
  orderId: string;
  orderNumber: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onSuccess: (verificationResult: any) => void;
  onError: (errorMessage: string) => void;
  onDismiss?: () => void;
}

/**
 * Launches the official Razorpay Standard Web Checkout Modal
 * Integrates:
 * 1. POST /api/payments/razorpay/create-order
 * 2. Razorpay Modal (UPI, Cards, Netbanking, Wallets)
 * 3. POST /api/payments/razorpay/verify-payment (HMAC-SHA256 signature verification)
 */
export const launchRazorpayStandardCheckout = async ({
  orderId,
  orderNumber,
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
  onError,
  onDismiss
}: RazorpayCheckoutParams): Promise<void> => {
  try {
    // 1. Ensure checkout.js is ready
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded || !window.Razorpay) {
      onError('Unable to load Razorpay payment gateway. Please check your internet connection.');
      return;
    }

    // 2. Step 1 Backend: Create Razorpay Order
    const orderRes = await api.post('/payments/razorpay/create-order', { orderId });
    if (!orderRes.data?.success || !orderRes.data?.order_id) {
      onError(orderRes.data?.message || 'Failed to initiate secure payment order with gateway.');
      return;
    }

    const { order_id, amount, currency, key } = orderRes.data;
    const razorpayKey = key || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TpQQAIvpKTuTfw';

    // 3. Step 2 Frontend: Configure Razorpay Checkout Modal
    const options = {
      key: razorpayKey,
      amount: amount,
      currency: currency || 'INR',
      name: 'Ethniz Couture',
      description: `Luxury Couture Order #${orderNumber}`,
      image: '/logo-card.png',
      order_id: order_id,
      prefill: {
        name: customerName || '',
        email: customerEmail || '',
        contact: customerPhone || ''
      },
      theme: {
        color: '#3E1A1E' // Haute Couture Deep Burgundy
      },
      modal: {
        ondismiss: () => {
          if (onDismiss) onDismiss();
        },
        confirm_close: true
      },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          // 4. Step 3 Backend: Authoritative Signature Verification
          const verifyRes = await api.post('/payments/razorpay/verify-payment', {
            orderId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });

          if (verifyRes.data?.success) {
            onSuccess(verifyRes.data);
          } else {
            onError(verifyRes.data?.message || 'Payment signature verification failed.');
          }
        } catch (verifyErr: any) {
          console.error('Razorpay signature verification error:', verifyErr);
          onError(
            verifyErr.response?.data?.message ||
              'Payment verification failed. Please contact atelier concierge.'
          );
        }
      }
    };

    const rzpInstance = new window.Razorpay(options);

    // Handle payment.failed event
    rzpInstance.on('payment.failed', (failedRes: any) => {
      console.error('Razorpay payment failed:', failedRes.error);
      const desc = failedRes.error?.description || failedRes.error?.reason || 'Transaction was declined by bank.';
      onError(desc);
    });

    rzpInstance.open();
  } catch (err: any) {
    console.error('Error initiating Razorpay checkout:', err);
    onError(
      err.response?.data?.message ||
        'An error occurred while connecting to Razorpay. Please try again.'
    );
  }
};
