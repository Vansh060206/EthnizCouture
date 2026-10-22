import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CreditCard,
  Truck,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Building,
  Sparkles,
  QrCode,
  Smartphone,
  ChevronDown,
  ShoppingBag,
  Receipt
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useCurrency } from '../context/CurrencyContext';
import api from '../services/api';
import { Address } from '../types';
import { DeliveryLocationPicker } from '../components/checkout/DeliveryLocationPicker';
import { DynamicUpiQrModal } from '../components/checkout/DynamicUpiQrModal';
import { launchRazorpayStandardCheckout } from '../utils/razorpay';
import {
  validateEmail,
  validateFullName,
  validatePhone,
  validateStreet,
  validateCity,
  validateState,
  validatePincode,
  validateGstin,
  validateCardHolder,
  validateCardNumber,
  validateCardExpiry,
  validateCardCvc,
  INDIAN_STATES
} from '../utils/validation';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, subtotal, discountAmount, shippingFee, total, appliedCoupon, clearCart } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { formatPrice } = useCurrency();

  // Restore persistent checkout state on page refresh
  const savedCheckoutState = React.useMemo(() => {
    try {
      const raw = sessionStorage.getItem('ethniz_checkout_state');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(() => {
    return (savedCheckoutState?.currentStep as 1 | 2 | 3) || 1;
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobileSummaryExpanded, setIsMobileSummaryExpanded] = useState<boolean>(false);
  const [upiModalState, setUpiModalState] = useState<{
    isOpen: boolean;
    orderId: string;
    orderNumber: string;
    totalAmount: number;
  } | null>(null);

  // Saved Addresses for logged-in user
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(() => {
    return savedCheckoutState?.selectedAddressId || '';
  });

  // Step 1: Address Form (restores exact user input on refresh or saved customer profile)
  const [formData, setFormData] = useState(() => {
    const cachedAddress = (() => {
      try {
        const raw = user?.id ? localStorage.getItem(`ethniz_saved_address_${user.id}`) : localStorage.getItem('ethniz_last_saved_address');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();

    return {
      customerName: savedCheckoutState?.formData?.customerName ?? cachedAddress?.fullName ?? (user?.name || ''),
      customerEmail: savedCheckoutState?.formData?.customerEmail ?? (user?.email || ''),
      customerPhone: savedCheckoutState?.formData?.customerPhone ?? cachedAddress?.phone ?? (user?.phone || ''),
      shippingStreet: savedCheckoutState?.formData?.shippingStreet || cachedAddress?.street || '',
      shippingApartment: savedCheckoutState?.formData?.shippingApartment || cachedAddress?.apartment || '',
      shippingCity: savedCheckoutState?.formData?.shippingCity || cachedAddress?.city || '',
      shippingState: savedCheckoutState?.formData?.shippingState || cachedAddress?.state || '',
      shippingPincode: savedCheckoutState?.formData?.shippingPincode || cachedAddress?.pincode || '',
      shippingCountry: savedCheckoutState?.formData?.shippingCountry || cachedAddress?.country || 'India',
      billingSameAsShipping: savedCheckoutState?.formData?.billingSameAsShipping ?? true,
      billingStreet: savedCheckoutState?.formData?.billingStreet || '',
      billingApartment: savedCheckoutState?.formData?.billingApartment || '',
      billingCity: savedCheckoutState?.formData?.billingCity || '',
      billingState: savedCheckoutState?.formData?.billingState || '',
      billingPincode: savedCheckoutState?.formData?.billingPincode || '',
      billingCountry: savedCheckoutState?.formData?.billingCountry || 'India',
      hasGstin: savedCheckoutState?.formData?.hasGstin || false,
      gstin: savedCheckoutState?.formData?.gstin || '',
      businessName: savedCheckoutState?.formData?.businessName || '',
      latitude: savedCheckoutState?.formData?.latitude as number | undefined,
      longitude: savedCheckoutState?.formData?.longitude as number | undefined
    };
  });

  // Keep customer name, email, and phone in sync with authenticated user
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        customerName: prev.customerName || user.name || '',
        customerEmail: prev.customerEmail || user.email || '',
        customerPhone: prev.customerPhone || user.phone || ''
      }));
    }
  }, [user]);

  const manualFormRef = React.useRef<HTMLDivElement>(null);

  const handleLocationConfirmed = (loc: {
    street?: string;
    apartment?: string;
    buildingName?: string;
    city: string;
    state: string;
    pincode: string;
    latitude: number;
    longitude: number;
    formattedAddress: string;
    locality?: string;
    landmark?: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      shippingStreet: '', // Left empty for user to enter their street address & locality
      shippingApartment: '',
      shippingCity: loc.city || prev.shippingCity,
      shippingState: loc.state || prev.shippingState,
      shippingPincode: loc.pincode || prev.shippingPincode,
      latitude: loc.latitude,
      longitude: loc.longitude
    }));

    setAddressTouched((prev) => ({
      ...prev,
      shippingStreet: false, // Do not trigger error immediately; user will type it
      shippingApartment: false,
      shippingCity: true,
      shippingState: true,
      shippingPincode: true
    }));

    if (loc.city) validateAddressField('shippingCity', loc.city);
    if (loc.state) validateAddressField('shippingState', loc.state);
    if (loc.pincode) {
      validateAddressField('shippingPincode', loc.pincode);
      if (loc.pincode.length === 6) {
        resolvePincode(loc.pincode);
      }
    }

    showToast('Location confirmed', 'success');

    // Smoothly scroll down and focus the Street Address & Locality input field
    setTimeout(() => {
      const streetInput = document.getElementById('shippingStreet') || document.querySelector('input[name="shippingStreet"]');
      if (streetInput) {
        streetInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (streetInput as HTMLInputElement).focus();
      }
    }, 150);
  };

  const handleManualEntrySelect = () => {
    manualFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      const streetInput = document.getElementById('shippingStreet') || document.querySelector('input[name="shippingStreet"]');
      if (streetInput) {
        (streetInput as HTMLInputElement).focus();
      }
    }, 150);
  };

  // Step 1: Field-level errors and touched tracking
  const [addressErrors, setAddressErrors] = useState<{
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    shippingStreet?: string;
    shippingCity?: string;
    shippingState?: string;
    shippingPincode?: string;
  }>({});

  const [addressTouched, setAddressTouched] = useState<{
    customerName?: boolean;
    customerEmail?: boolean;
    customerPhone?: boolean;
    shippingStreet?: boolean;
    shippingCity?: boolean;
    shippingState?: boolean;
    shippingPincode?: boolean;
  }>({});

  const [billingErrors, setBillingErrors] = useState<{
    billingStreet?: string;
    billingApartment?: string;
    billingCity?: string;
    billingState?: string;
    billingPincode?: string;
  }>({});

  const [gstErrors, setGstErrors] = useState<{
    businessName?: string;
    gstin?: string;
  }>({});

  const handleBillingFieldChange = (
    field: 'billingStreet' | 'billingApartment' | 'billingCity' | 'billingState' | 'billingPincode',
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (billingErrors[field]) {
      setBillingErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Pincode auto-detection state
  const [isResolvingPincode, setIsResolvingPincode] = useState<boolean>(false);
  const [pincodeDetails, setPincodeDetails] = useState<{
    pincode: string;
    city: string;
    district: string;
    state: string;
    carrier: string;
    deliveryDays: string;
    estimatedDeliveryDate: string;
    postOffices?: string[];
  } | null>(null);

  const resolvePincode = async (pin: string) => {
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      setPincodeDetails(null);
      return;
    }

    setIsResolvingPincode(true);
    try {
      const res = await api.get(`/location/pincode/${pin}`);
      if (res.data?.success) {
        const { city, state, carrier, deliveryDays, estimatedDeliveryDate, postOffices, district } = res.data;
        setPincodeDetails({
          pincode: pin,
          city,
          district: district || city,
          state,
          carrier,
          deliveryDays,
          estimatedDeliveryDate,
          postOffices
        });

        // Canonical state matching with INDIAN_STATES
        const matchedState = INDIAN_STATES.find(
          (s) => s.toLowerCase() === (state || '').toLowerCase()
        ) || state;

        setFormData((prev) => ({
          ...prev,
          shippingCity: prev.shippingCity && prev.shippingCity !== city ? prev.shippingCity : city,
          shippingState: matchedState || prev.shippingState
        }));

        setAddressErrors((prev) => ({
          ...prev,
          shippingPincode: undefined,
          shippingCity: undefined,
          shippingState: undefined
        }));
      }
    } catch {
      // Retain manual values gracefully
    } finally {
      setIsResolvingPincode(false);
    }
  };

  // Auto-resolve pincode if already present in formData on mount
  useEffect(() => {
    if (formData.shippingPincode && formData.shippingPincode.length === 6) {
      resolvePincode(formData.shippingPincode);
    }
  }, []);

  // Step 2: Shipping Method
  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'express'>(() => {
    return (savedCheckoutState?.deliveryMethod as 'standard' | 'express') || 'standard';
  });

  // Step 3: Payment
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'UPI' | 'NETBANKING' | 'COD'>(() => {
    return (savedCheckoutState?.paymentMethod as 'CARD' | 'UPI' | 'NETBANKING' | 'COD') || 'CARD';
  });
  const [cardHolder, setCardHolder] = useState(user?.name || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // Persist all checkout fields across page refreshes
  useEffect(() => {
    try {
      sessionStorage.setItem(
        'ethniz_checkout_state',
        JSON.stringify({
          currentStep,
          formData,
          deliveryMethod,
          paymentMethod,
          selectedAddressId
        })
      );
    } catch {
      // quota or private browsing
    }
  }, [currentStep, formData, deliveryMethod, paymentMethod, selectedAddressId]);

  const [cardErrors, setCardErrors] = useState<{
    cardHolder?: string;
    cardNumber?: string;
    cardExpiry?: string;
    cardCvc?: string;
  }>({});

  const [cardTouched, setCardTouched] = useState<{
    cardHolder?: boolean;
    cardNumber?: boolean;
    cardExpiry?: boolean;
    cardCvc?: boolean;
  }>({});

  // If cart is empty or an order was just completed, redirect immediately to prevent landing back on checkout
  useEffect(() => {
    const lastCompleted = sessionStorage.getItem('ethniz_last_completed_order');
    if (items.length === 0 || lastCompleted) {
      if (lastCompleted) {
        navigate(`/track-order?orderNumber=${lastCompleted}`, { replace: true });
      } else {
        navigate('/shop', { replace: true });
      }
    }
  }, [items.length, navigate]);

  // Load saved addresses and automatically pre-fill default address and contact phone
  useEffect(() => {
    const loadAddresses = async () => {
      if (user) {
        try {
          const res = await api.get('/users/addresses');
          const addrs: Address[] = res.data.addresses || [];
          setSavedAddresses(addrs);

          if (addrs.length > 0) {
            // Find current selection, default address, or the primary saved address
            const targetAddr = addrs.find((a) => a.id === selectedAddressId) || addrs.find((a) => a.isDefault) || addrs[0];
            if (targetAddr) {
              // If user has not typed a distinct custom street address, auto-populate the saved address
              if (!formData.shippingStreet || formData.shippingStreet === targetAddr.street || !selectedAddressId) {
                setSelectedAddressId(targetAddr.id);
                setFormData((prev) => ({
                  ...prev,
                  customerName: targetAddr.fullName || prev.customerName || user.name || '',
                  customerPhone: targetAddr.phone || prev.customerPhone || user.phone || '',
                  shippingStreet: targetAddr.street,
                  shippingApartment: targetAddr.apartment || '',
                  shippingCity: targetAddr.city,
                  shippingState: targetAddr.state,
                  shippingPincode: targetAddr.pincode,
                  shippingCountry: targetAddr.country || 'India'
                }));
                setAddressErrors({});
              }
            }
          }
        } catch (err) {
          console.error('Error loading saved addresses:', err);
        }
      }
    };
    loadAddresses();
  }, [user]);

  const handleSelectSavedAddress = (id: string) => {
    setSelectedAddressId(id);
    const addr = savedAddresses.find((a) => a.id === id);
    if (addr) {
      setFormData((prev) => ({
        ...prev,
        customerName: addr.fullName,
        customerPhone: addr.phone,
        shippingStreet: addr.street,
        shippingApartment: addr.apartment || '',
        shippingCity: addr.city,
        shippingState: addr.state,
        shippingPincode: addr.pincode,
        shippingCountry: addr.country
      }));
      setAddressErrors({});
    }
  };

  const validateAddressField = (field: string, value: string): boolean => {
    let err: string | undefined;
    switch (field) {
      case 'customerName':
        err = validateFullName(value, 'Full Name').error;
        break;
      case 'customerEmail':
        err = validateEmail(value).error;
        break;
      case 'customerPhone':
        err = validatePhone(value, true).error;
        break;
      case 'shippingStreet':
        err = validateStreet(value).error;
        break;
      case 'shippingCity':
        err = validateCity(value).error;
        break;
      case 'shippingState':
        err = validateState(value).error;
        break;
      case 'shippingPincode':
        err = validatePincode(value).error;
        break;
    }
    setAddressErrors((prev) => ({ ...prev, [field]: err }));
    return !err;
  };

  const handleAddressBlur = (field: string) => {
    setAddressTouched((prev) => ({ ...prev, [field]: true }));
    const val = (formData as any)[field] || '';
    validateAddressField(field, val);
  };

  const validateAddressStep = (): boolean => {
    setAddressTouched({
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      shippingStreet: true,
      shippingCity: true,
      shippingState: true,
      shippingPincode: true
    });

    const vName = validateFullName(formData.customerName, 'Full Name');
    const vEmail = validateEmail(formData.customerEmail);
    const vPhone = validatePhone(formData.customerPhone, true);
    const vStreet = validateStreet(formData.shippingStreet);
    const vCity = validateCity(formData.shippingCity);
    const vState = validateState(formData.shippingState);
    const vPincode = validatePincode(formData.shippingPincode);

    const newErrors = {
      customerName: vName.error,
      customerEmail: vEmail.error,
      customerPhone: vPhone.error,
      shippingStreet: vStreet.error,
      shippingCity: vCity.error,
      shippingState: vState.error,
      shippingPincode: vPincode.error
    };

    setAddressErrors(newErrors);

    let bErrors: typeof billingErrors = {};
    if (!formData.billingSameAsShipping) {
      const vBStreet = validateStreet(formData.billingStreet, 'Billing Street Address');
      const vBCity = validateCity(formData.billingCity, 'Billing City');
      const vBState = validateState(formData.billingState, 'Billing State');
      const vBPincode = validatePincode(formData.billingPincode);

      bErrors = {
        billingStreet: vBStreet.error,
        billingCity: vBCity.error,
        billingState: vBState.error,
        billingPincode: vBPincode.error
      };
      setBillingErrors(bErrors);
    } else {
      setBillingErrors({});
    }

    let gErrors: typeof gstErrors = {};
    if (formData.hasGstin) {
      if (!formData.businessName || !formData.businessName.trim()) {
        gErrors.businessName = 'Business or company name is required.';
      }
      const vGstin = validateGstin(formData.gstin);
      if (!vGstin.isValid) {
        gErrors.gstin = vGstin.error;
      }
      setGstErrors(gErrors);
    } else {
      setGstErrors({});
    }

    const hasErrors =
      Object.values(newErrors).some(Boolean) ||
      Object.values(bErrors).some(Boolean) ||
      Object.values(gErrors).some(Boolean);

    if (hasErrors) {
      setErrorMessage('Please resolve the highlighted errors in Shipping, Billing, or GSTIN Information.');
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const validateCardStep = (): boolean => {
    setCardTouched({
      cardHolder: true,
      cardNumber: true,
      cardExpiry: true,
      cardCvc: true
    });

    const vHolder = validateCardHolder(cardHolder);
    const vNumber = validateCardNumber(cardNumber);
    const vExpiry = validateCardExpiry(cardExpiry);
    const vCvc = validateCardCvc(cardCvc);

    const newErrors = {
      cardHolder: vHolder.error,
      cardNumber: vNumber.error,
      cardExpiry: vExpiry.error,
      cardCvc: vCvc.error
    };

    setCardErrors(newErrors);

    const hasErrors = Object.values(newErrors).some(Boolean);
    if (hasErrors) {
      setErrorMessage('Please resolve the highlighted payment card errors.');
      return false;
    }
    return true;
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (!validateAddressStep()) return;

      // Automatically persist address to user profile & address book if authenticated
      if (user && formData.shippingStreet && formData.shippingCity && formData.shippingPincode) {
        try {
          localStorage.setItem(`ethniz_saved_address_${user.id}`, JSON.stringify({
            fullName: formData.customerName,
            phone: formData.customerPhone,
            street: formData.shippingStreet,
            apartment: formData.shippingApartment,
            city: formData.shippingCity,
            state: formData.shippingState,
            pincode: formData.shippingPincode,
            country: formData.shippingCountry
          }));
          localStorage.setItem('ethniz_last_saved_address', JSON.stringify({
            fullName: formData.customerName,
            phone: formData.customerPhone,
            street: formData.shippingStreet,
            apartment: formData.shippingApartment,
            city: formData.shippingCity,
            state: formData.shippingState,
            pincode: formData.shippingPincode,
            country: formData.shippingCountry
          }));
        } catch {}

        // Check if address already exists in saved addresses
        const alreadyExists = savedAddresses.some(
          (a) =>
            a.street.trim().toLowerCase() === formData.shippingStreet.trim().toLowerCase() &&
            a.city.trim().toLowerCase() === formData.shippingCity.trim().toLowerCase() &&
            a.pincode.trim() === formData.shippingPincode.trim()
        );

        if (!alreadyExists) {
          try {
            const saveRes = await api.post('/users/addresses', {
              fullName: formData.customerName,
              phone: formData.customerPhone,
              street: formData.shippingStreet,
              apartment: formData.shippingApartment,
              city: formData.shippingCity,
              state: formData.shippingState,
              pincode: formData.shippingPincode,
              country: formData.shippingCountry,
              isDefault: savedAddresses.length === 0
            });
            if (saveRes.data?.address) {
              setSelectedAddressId(saveRes.data.address.id);
              setSavedAddresses((prev) => [saveRes.data.address, ...prev]);
            }
          } catch {
            // creation fallback in order creation handles this as well
          }
        }
      }

      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handlePlaceOrder = async () => {
    if (isProcessing || items.length === 0 || sessionStorage.getItem('ethniz_last_completed_order')) return;
    setErrorMessage(null);

    setIsProcessing(true);

    try {
      // Generate client idempotency key to prevent double checkout on stutter or double click
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // 1. Create order in backend with atomic stock reservation and idempotency
      const orderRes = await api.post(
        '/orders',
        {
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone,
          shippingStreet: formData.shippingStreet,
          shippingApartment: formData.shippingApartment,
          shippingCity: formData.shippingCity,
          shippingState: formData.shippingState,
          shippingPincode: formData.shippingPincode,
          shippingCountry: formData.shippingCountry,
          billingAddress: !formData.billingSameAsShipping ? {
            street: formData.billingStreet,
            apartment: formData.billingApartment,
            city: formData.billingCity,
            state: formData.billingState,
            pincode: formData.billingPincode,
            country: formData.billingCountry || 'India'
          } : undefined,
          gstin: formData.hasGstin && formData.gstin ? formData.gstin.trim().toUpperCase() : undefined,
          businessName: formData.hasGstin && formData.businessName ? formData.businessName.trim() : undefined,
          latitude: formData.latitude,
          longitude: formData.longitude,
          items: items.map((i) => ({
            productId: i.productId,
            name: i.product?.name,
            image: i.product?.images?.[0]?.url,
            size: i.size,
            color: i.color,
            quantity: i.quantity
          })),
          couponCode: appliedCoupon?.code,
          paymentMethod: paymentMethod
        },
        {
          headers: {
            'Idempotency-Key': idempotencyKey
          }
        }
      );

      const order = orderRes.data.order;

      // Handle Cash on Delivery directly without online PaymentIntent
      if (paymentMethod === 'COD') {
        clearCart();
        try {
          sessionStorage.removeItem('ethniz_checkout_state');
          sessionStorage.setItem('ethniz_last_completed_order', order.orderNumber);
        } catch {
          // ignore
        }
        showToast('Your royal Cash on Delivery order has been placed!', 'success');
        window.scrollTo(0, 0);
        navigate(`/order-confirmation/${order.orderNumber}`, { replace: true });
        return;
      }

      // Handle Dynamic UPI QR payment
      if (paymentMethod === 'UPI') {
        setUpiModalState({
          isOpen: true,
          orderId: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount
        });
        return;
      }

      // 2. Launch Razorpay Standard Web Checkout for Cards, Netbanking & Online
      await launchRazorpayStandardCheckout({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        onSuccess: () => {
          clearCart();
          try {
            sessionStorage.removeItem('ethniz_checkout_state');
            sessionStorage.setItem('ethniz_last_completed_order', order.orderNumber);
          } catch {
            // ignore
          }
          showToast('Your royal couture order has been confirmed!', 'success');
          window.scrollTo(0, 0);
          navigate(`/order-confirmation/${order.orderNumber}`, { replace: true });
        },
        onError: (err) => {
          setErrorMessage(err);
          showToast(err, 'error');
        },
        onDismiss: () => {
          clearCart();
          try {
            sessionStorage.removeItem('ethniz_checkout_state');
            sessionStorage.setItem('ethniz_last_completed_order', order.orderNumber);
          } catch {
            // ignore
          }
          showToast(`Order #${order.orderNumber} reserved. You can complete payment anytime in Order Tracking.`, 'info');
          window.scrollTo(0, 0);
          navigate(`/track-order?orderNumber=${order.orderNumber}`, { replace: true });
        }
      });
    } catch (err: any) {
      console.error('Order creation error:', err);
      setErrorMessage(
        err.response?.data?.message || 'An error occurred during checkout. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0 || sessionStorage.getItem('ethniz_last_completed_order')) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-28 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-[#C6A15D] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Redirecting to order journey...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 pb-28 sm:pb-12 space-y-6 sm:space-y-8">
      
      {/* Mobile Flipkart-Style Sticky Order Summary Accordion (<lg) */}
      <div className="lg:hidden bg-white border border-[#E8DEC8] rounded-xl p-3.5 shadow-xs">
        <button
          type="button"
          onClick={() => setIsMobileSummaryExpanded(!isMobileSummaryExpanded)}
          className="w-full flex items-center justify-between text-left focus:outline-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#3E1A1E] text-[#DFC89D] flex items-center justify-center shrink-0 shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-900">Total:</span>
                <span className="font-serif text-sm font-bold text-maroon-950">{formatPrice(total)}</span>
              </div>
              <span className="text-[10px] text-zinc-500">
                {items.reduce((s, i) => s + i.quantity, 0)} Items • Complimentary Air Delivery
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-[#84642C] bg-[#FAF7F2] px-2.5 py-1 rounded-md border border-[#C6A15D]/30">
            <span>{isMobileSummaryExpanded ? 'Hide' : 'Details'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMobileSummaryExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isMobileSummaryExpanded && (
          <div className="mt-3 pt-3 border-t border-zinc-100 space-y-3 animate-fade-in">
            <div className="divide-y divide-zinc-100 max-h-48 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center gap-2.5">
                  <img
                    src={item.product?.images?.[0]?.url || 'https://via.placeholder.com/60'}
                    alt={item.product?.name}
                    className="w-10 h-14 object-cover rounded bg-zinc-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 truncate">{item.product?.name}</p>
                    <p className="text-[10px] text-zinc-500">Qty: {item.quantity} · Size: {item.size}</p>
                  </div>
                  <span className="font-serif text-xs font-bold text-maroon-950">
                    {formatPrice((item.product?.price || 0) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-xs text-zinc-600 border-t border-zinc-100 pt-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Insured Express Shipping</span>
                <span className="text-emerald-700 font-bold uppercase tracking-wider">Free</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Progress Stepper */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[1px] bg-zinc-200 w-full z-0" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#3E1A1E] transition-all duration-300 z-0"
            style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
          />

          {/* Step 1: Address */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors shadow-sm ${
                currentStep >= 1 ? 'bg-[#3E1A1E] text-[#DFC89D] border border-[#C6A15D]' : 'bg-zinc-100 text-zinc-400 border border-zinc-300'
              }`}
            >
              1
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1A1A1A] mt-1.5 font-sans">
              ADDRESS
            </span>
          </div>

          {/* Step 2: Delivery */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors shadow-sm ${
                currentStep >= 2 ? 'bg-[#3E1A1E] text-[#DFC89D] border border-[#C6A15D]' : 'bg-zinc-100 text-zinc-400 border border-zinc-300'
              }`}
            >
              2
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1A1A1A] mt-1.5 font-sans">
              DELIVERY
            </span>
          </div>

          {/* Step 3: Payment */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors shadow-sm ${
                currentStep >= 3 ? 'bg-[#3E1A1E] text-[#DFC89D] border border-[#C6A15D]' : 'bg-zinc-100 text-zinc-400 border border-zinc-300'
              }`}
            >
              3
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1A1A1A] mt-1.5 font-sans">
              PAYMENT
            </span>
          </div>

          {/* Step 4: Review */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors shadow-sm ${
                currentStep === 3 ? 'bg-[#FAF7F2] text-[#3E1A1E] border border-[#C6A15D]' : 'bg-zinc-100 text-zinc-400 border border-zinc-300'
              }`}
            >
              ✓
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mt-1.5 font-sans">
              REVIEW
            </span>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="max-w-4xl mx-auto p-4 bg-red-50 border border-red-300 rounded-lg flex items-center gap-3 text-xs text-red-800 font-medium">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Steps on Left + Order Summary on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* STEP CONTENT (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-lg border border-[#E8DEC8] shadow-sm space-y-6">
          
          {/* STEP 1: ADDRESS */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                <h2 className="font-serif text-2xl font-bold text-zinc-900">
                  Shipping & Contact Information
                </h2>
                {!user && (
                  <Link to="/login?redirect=/checkout" className="text-xs text-maroon-800 font-bold hover:underline">
                    Already registered? Sign In
                  </Link>
                )}
              </div>

              {/* Saved Address Cards */}
              {savedAddresses.length > 0 && (
                <div className="space-y-3">
                  {selectedAddressId && (
                    <div className="p-3 bg-amber-50/80 border border-[#C6A15D]/40 rounded-md flex items-center justify-between text-xs text-amber-950">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[#C6A15D] shrink-0" />
                        <span>
                          <strong>Saved Details Auto-Filled:</strong> Ready for 1-click delivery to {formData.shippingCity} ({formData.customerPhone})
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#3E1A1E] bg-[#C6A15D]/20 px-2 py-0.5 rounded border border-[#C6A15D]/30">
                        Default
                      </span>
                    </div>
                  )}

                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                    Saved Delivery Addresses:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedAddresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => handleSelectSavedAddress(addr.id)}
                          className={`p-3.5 rounded-lg border cursor-pointer transition-all relative ${
                            isSelected
                              ? 'border-[#3E1A1E] bg-[#3E1A1E]/5 ring-1 ring-[#3E1A1E]'
                              : 'border-zinc-200 hover:border-zinc-400 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-zinc-900">{addr.fullName}</p>
                            {isSelected ? (
                              <span className="text-[10px] font-bold text-[#3E1A1E] bg-[#C6A15D]/20 px-2 py-0.5 rounded flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-[#3E1A1E]" /> Selected
                              </span>
                            ) : addr.isDefault ? (
                              <span className="text-[10px] text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">Default</span>
                            ) : null}
                          </div>
                          <p className="text-xs text-zinc-600 truncate mt-1">{addr.street}</p>
                          <p className="text-xs text-zinc-600">{addr.city}, {addr.state} - {addr.pincode}</p>
                          <p className="text-[11px] font-mono text-zinc-500 mt-1.5 flex items-center gap-1">
                            <span>Phone:</span> <strong>{addr.phone}</strong>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-1">
                    <span className="text-xs text-zinc-500">Or use map picker or form below to deliver to another address:</span>
                  </div>
                </div>
              )}

              {/* Interactive Delivery Location Picker */}
              <DeliveryLocationPicker
                onLocationConfirmed={handleLocationConfirmed}
                onManualEntrySelect={handleManualEntrySelect}
                initialPincode={formData.shippingPincode}
                initialApartment={formData.shippingApartment}
                initialStreet={formData.shippingStreet}
                initialLatitude={formData.latitude}
                initialLongitude={formData.longitude}
              />

              <div ref={manualFormRef} className="pt-2">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                  <h3 className="font-serif text-sm font-bold text-zinc-800 uppercase tracking-wider">
                    Detailed Recipient & House Information
                  </h3>
                  <span className="text-[11px] text-zinc-500">All fields editable</span>
                </div>
              </div>

              {/* Address Form Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1.5 text-xs sm:text-[11px]">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => {
                      setFormData({ ...formData, customerName: e.target.value });
                      if (addressTouched.customerName) validateAddressField('customerName', e.target.value);
                    }}
                    onBlur={() => handleAddressBlur('customerName')}
                    className={`w-full h-12 sm:h-10 px-3.5 rounded-xl sm:rounded-lg border text-base sm:text-xs text-zinc-900 focus:outline-none transition-all ${
                      addressTouched.customerName && addressErrors.customerName
                        ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                        : 'border-[#E8DEC8] bg-white focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30'
                    }`}
                    placeholder="e.g. Priya Sharma"
                  />
                  {addressTouched.customerName && addressErrors.customerName && (
                    <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{addressErrors.customerName}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1.5 text-xs sm:text-[11px]">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.customerEmail}
                    onChange={(e) => {
                      setFormData({ ...formData, customerEmail: e.target.value });
                      if (addressTouched.customerEmail) validateAddressField('customerEmail', e.target.value);
                    }}
                    onBlur={() => handleAddressBlur('customerEmail')}
                    className={`w-full h-12 sm:h-10 px-3.5 rounded-xl sm:rounded-lg border text-base sm:text-xs text-zinc-900 focus:outline-none transition-all ${
                      addressTouched.customerEmail && addressErrors.customerEmail
                        ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                        : 'border-[#E8DEC8] bg-white focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30'
                    }`}
                    placeholder="priya@example.com"
                  />
                  {addressTouched.customerEmail && addressErrors.customerEmail && (
                    <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{addressErrors.customerEmail}</span>
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1.5 text-xs sm:text-[11px]">
                    Phone Number (for Courier & Tracking Updates) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.customerPhone}
                    onChange={(e) => {
                      setFormData({ ...formData, customerPhone: e.target.value });
                      if (addressTouched.customerPhone) validateAddressField('customerPhone', e.target.value);
                    }}
                    onBlur={() => handleAddressBlur('customerPhone')}
                    className={`w-full h-12 sm:h-10 px-3.5 rounded-xl sm:rounded-lg border text-base sm:text-xs text-zinc-900 focus:outline-none transition-all ${
                      addressTouched.customerPhone && addressErrors.customerPhone
                        ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                        : 'border-[#E8DEC8] bg-white focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30'
                    }`}
                    placeholder="+91 98200 12345"
                  />
                  {addressTouched.customerPhone && addressErrors.customerPhone && (
                    <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{addressErrors.customerPhone}</span>
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1.5 text-xs sm:text-[11px]">
                    Street Address & Locality <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="shippingStreet"
                    name="shippingStreet"
                    type="text"
                    required
                    value={formData.shippingStreet}
                    onChange={(e) => {
                      setFormData({ ...formData, shippingStreet: e.target.value });
                      if (addressTouched.shippingStreet) validateAddressField('shippingStreet', e.target.value);
                    }}
                    onBlur={() => handleAddressBlur('shippingStreet')}
                    className={`w-full h-12 sm:h-10 px-3.5 rounded-xl sm:rounded-lg border text-base sm:text-xs text-zinc-900 focus:outline-none transition-all ${
                      addressTouched.shippingStreet && addressErrors.shippingStreet
                        ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                        : 'border-[#E8DEC8] bg-white focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30'
                    }`}
                    placeholder="House/Flat/Plot number, Building, Street, Colony & Landmark"
                  />
                  {addressTouched.shippingStreet && addressErrors.shippingStreet && (
                    <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{addressErrors.shippingStreet}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1.5 text-xs sm:text-[11px]">
                    Apartment / Suite (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.shippingApartment}
                    onChange={(e) => setFormData({ ...formData, shippingApartment: e.target.value })}
                    className="w-full h-12 sm:h-10 px-3.5 rounded-xl sm:rounded-lg border text-base sm:text-xs text-zinc-900 border-[#E8DEC8] bg-white focus:outline-none focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30 transition-all"
                    placeholder="Flat 12B, Imperial Heights"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1.5 text-xs sm:text-[11px]">
                    Pincode / Postal Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={formData.shippingPincode}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').substring(0, 6);
                      setFormData({ ...formData, shippingPincode: clean });
                      if (addressTouched.shippingPincode) validateAddressField('shippingPincode', clean);
                      if (clean.length === 6) {
                        resolvePincode(clean);
                      } else if (pincodeDetails) {
                        setPincodeDetails(null);
                      }
                    }}
                    onBlur={() => handleAddressBlur('shippingPincode')}
                    className={`w-full h-12 sm:h-10 px-3.5 rounded-xl sm:rounded-lg border text-base sm:text-xs text-zinc-900 focus:outline-none transition-all font-mono ${
                      addressTouched.shippingPincode && addressErrors.shippingPincode
                        ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                        : 'border-[#E8DEC8] bg-white focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30'
                    }`}
                    placeholder="400026"
                  />
                  {addressTouched.shippingPincode && addressErrors.shippingPincode && (
                    <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{addressErrors.shippingPincode}</span>
                    </p>
                  )}
                  {isResolvingPincode && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#84642C] font-medium mt-1.5 animate-pulse">
                      <div className="w-3 h-3 rounded-full border-2 border-[#C6A15D] border-t-transparent animate-spin" />
                      <span>Detecting postal circle & delivery hub...</span>
                    </div>
                  )}
                  {!addressErrors.shippingPincode && pincodeDetails && (
                    <div className="mt-2 p-2.5 bg-gradient-to-r from-[#FAF7F2] to-amber-50/40 rounded-lg border border-[#C6A15D]/40 text-zinc-800 text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5 text-[#3E1A1E]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Auto-detected: {pincodeDetails.city}, {pincodeDetails.state}</span>
                        </span>
                        <span className="text-[10px] font-semibold text-[#84642C] bg-[#C6A15D]/15 px-1.5 py-0.5 rounded">
                          Insured Express
                        </span>
                      </div>
                      <p className="text-zinc-600 flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-[#84642C] shrink-0" />
                        <span>Expected by <strong>{pincodeDetails.estimatedDeliveryDate}</strong> ({pincodeDetails.deliveryDays}) via {pincodeDetails.carrier}</span>
                      </p>
                    </div>
                  )}
                  {!addressErrors.shippingPincode && !pincodeDetails && !isResolvingPincode && formData.shippingPincode.length === 6 && (
                    <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      <span>Valid 6-digit postal circle (insured delivery eligible)</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1.5 text-xs sm:text-[11px]">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.shippingCity}
                    onChange={(e) => {
                      setFormData({ ...formData, shippingCity: e.target.value });
                      if (addressTouched.shippingCity) validateAddressField('shippingCity', e.target.value);
                    }}
                    onBlur={() => handleAddressBlur('shippingCity')}
                    className={`w-full h-12 sm:h-10 px-3.5 rounded-xl sm:rounded-lg border text-base sm:text-xs text-zinc-900 focus:outline-none transition-all ${
                      addressTouched.shippingCity && addressErrors.shippingCity
                        ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                        : 'border-[#E8DEC8] bg-white focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30'
                    }`}
                    placeholder="Mumbai"
                  />
                  {addressTouched.shippingCity && addressErrors.shippingCity && (
                    <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{addressErrors.shippingCity}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1.5 text-xs sm:text-[11px]">
                    State / Union Territory <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.shippingState}
                    onChange={(e) => {
                      setFormData({ ...formData, shippingState: e.target.value });
                      if (addressTouched.shippingState) validateAddressField('shippingState', e.target.value);
                    }}
                    onBlur={() => handleAddressBlur('shippingState')}
                    className={`w-full h-12 sm:h-10 px-3.5 rounded-xl sm:rounded-lg border text-base sm:text-xs text-zinc-900 focus:outline-none transition-all bg-white ${
                      addressTouched.shippingState && addressErrors.shippingState
                        ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                        : 'border-[#E8DEC8] focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30'
                    }`}
                  >
                    <option value="">Select State / Territory</option>
                    {INDIAN_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  {addressTouched.shippingState && addressErrors.shippingState && (
                    <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{addressErrors.shippingState}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Billing address same checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.billingSameAsShipping}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData((prev) => ({ ...prev, billingSameAsShipping: checked }));
                      if (checked) {
                        setBillingErrors({});
                      }
                    }}
                    className="w-4 h-4 accent-maroon-800 rounded"
                  />
                  <span className="font-medium">Billing address is the same as shipping address</span>
                </label>
              </div>

              {/* Distinct Billing Address Form */}
              {!formData.billingSameAsShipping && (
                <div className="mt-3 p-4 sm:p-5 bg-[#FAF7F2] rounded-xl border border-[#DFC89D]/70 space-y-4 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-[#E8DEC8]">
                    <Receipt className="w-4 h-4 text-[#84642C]" />
                    <div>
                      <h3 className="font-serif text-sm font-bold text-zinc-900 tracking-wide">
                        Billing & Invoicing Address
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        Specify distinct billing details for payment verification and tax invoices.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Billing Street Address & Locality <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 42 Nariman Point, Floor 8"
                      value={formData.billingStreet || ''}
                      onChange={(e) => handleBillingFieldChange('billingStreet', e.target.value)}
                      className={`w-full h-12 sm:h-10 px-3.5 bg-white border rounded-xl sm:rounded-lg text-base sm:text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition-all ${
                        billingErrors.billingStreet
                          ? 'border-red-500 bg-red-50/20'
                          : 'border-[#E8DEC8] focus:border-[#3E1A1E] focus:ring-1 focus:ring-[#C6A15D]'
                      }`}
                    />
                    {billingErrors.billingStreet && (
                      <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{billingErrors.billingStreet}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Apartment / Suite / Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Suite 802, Near Trident Hotel"
                      value={formData.billingApartment || ''}
                      onChange={(e) => handleBillingFieldChange('billingApartment', e.target.value)}
                      className="w-full h-12 sm:h-10 px-3.5 bg-white border border-[#E8DEC8] rounded-xl sm:rounded-lg text-base sm:text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#3E1A1E]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mumbai"
                        value={formData.billingCity || ''}
                        onChange={(e) => handleBillingFieldChange('billingCity', e.target.value)}
                        className={`w-full h-12 sm:h-10 px-3.5 bg-white border rounded-xl sm:rounded-lg text-base sm:text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition-all ${
                          billingErrors.billingCity
                            ? 'border-red-500 bg-red-50/20'
                            : 'border-[#E8DEC8] focus:border-[#3E1A1E] focus:ring-1 focus:ring-[#C6A15D]'
                        }`}
                      />
                      {billingErrors.billingCity && (
                        <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{billingErrors.billingCity}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        State <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.billingState || ''}
                        onChange={(e) => handleBillingFieldChange('billingState', e.target.value)}
                        className={`w-full h-12 sm:h-10 px-3.5 bg-white border rounded-xl sm:rounded-lg text-base sm:text-xs text-zinc-900 focus:outline-none transition-all ${
                          billingErrors.billingState
                            ? 'border-red-500 bg-red-50/20'
                            : 'border-[#E8DEC8] focus:border-[#3E1A1E] focus:ring-1 focus:ring-[#C6A15D]'
                        }`}
                      >
                        <option value="">Select State</option>
                        {INDIAN_STATES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                      {billingErrors.billingState && (
                        <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{billingErrors.billingState}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        PIN Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="6 digits"
                        value={formData.billingPincode || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                          handleBillingFieldChange('billingPincode', val);
                        }}
                        className={`w-full h-12 sm:h-10 px-3.5 bg-white border rounded-xl sm:rounded-lg text-base sm:text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition-all ${
                          billingErrors.billingPincode
                            ? 'border-red-500 bg-red-50/20'
                            : 'border-[#E8DEC8] focus:border-[#3E1A1E] focus:ring-1 focus:ring-[#C6A15D]'
                        }`}
                      />
                      {billingErrors.billingPincode && (
                        <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{billingErrors.billingPincode}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Business GSTIN Tax Invoice Option */}
              <div className="pt-2 border-t border-zinc-200">
                <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.hasGstin || false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData((prev) => ({
                        ...prev,
                        hasGstin: checked,
                        gstin: checked ? prev.gstin : '',
                        businessName: checked ? prev.businessName : ''
                      }));
                      if (!checked) {
                        setGstErrors({});
                      }
                    }}
                    className="w-4 h-4 accent-maroon-800 rounded"
                  />
                  <span className="font-medium">Add Business Details for GST Tax Invoice (Optional)</span>
                </label>

                {formData.hasGstin && (
                  <div className="mt-3 p-4 sm:p-5 bg-[#FAF7F2] rounded-xl border border-[#DFC89D]/70 space-y-3.5 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-2 pb-2 border-b border-[#E8DEC8]">
                      <Building className="w-4 h-4 text-[#84642C]" />
                      <h4 className="font-serif text-xs font-bold text-zinc-900 tracking-wide uppercase">
                        Business & Corporate Invoicing
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Registered Business / Company Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Heritage Weddings Pvt Ltd"
                          value={formData.businessName || ''}
                          onChange={(e) => {
                            setFormData((prev) => ({ ...prev, businessName: e.target.value }));
                            if (gstErrors.businessName) {
                              setGstErrors((prev) => ({ ...prev, businessName: undefined }));
                            }
                          }}
                          className={`w-full h-12 sm:h-10 px-3.5 bg-white border rounded-xl sm:rounded-lg text-base sm:text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition-all ${
                            gstErrors.businessName
                              ? 'border-red-500 bg-red-50/20'
                              : 'border-[#E8DEC8] focus:border-[#3E1A1E]'
                          }`}
                        />
                        {gstErrors.businessName && (
                          <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{gstErrors.businessName}</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          15-Digit Indian GSTIN <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={15}
                          placeholder="e.g. 27AAAAA0000A1Z5"
                          value={formData.gstin || ''}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
                            setFormData((prev) => ({ ...prev, gstin: val }));
                            if (gstErrors.gstin) {
                              setGstErrors((prev) => ({ ...prev, gstin: undefined }));
                            }
                          }}
                          className={`w-full h-12 sm:h-10 px-3.5 bg-white border rounded-xl sm:rounded-lg text-base sm:text-xs text-zinc-900 placeholder:text-zinc-400 uppercase font-mono tracking-wider focus:outline-none transition-all ${
                            gstErrors.gstin
                              ? 'border-red-500 bg-red-50/20'
                              : 'border-[#E8DEC8] focus:border-[#3E1A1E]'
                          }`}
                        />
                        {gstErrors.gstin && (
                          <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{gstErrors.gstin}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      Your GSTIN will be recorded on the official tax invoice sent to {formData.customerEmail || 'your email'} to enable input tax credit.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full sm:w-auto h-12 sm:h-11 min-h-[48px] px-8 bg-[#3E1A1E] hover:bg-[#2B0C10] text-[#DFC89D] text-xs font-bold uppercase tracking-widest rounded-xl sm:rounded-lg shadow flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <span>Continue to Delivery</span>
                  <ArrowRight className="w-4 h-4 text-[#C6A15D]" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: DELIVERY */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="pb-3 border-b border-zinc-200">
                <h2 className="font-serif text-2xl font-bold text-zinc-900">
                  Select Delivery Method
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Deliver to: {formData.customerName}, {formData.shippingStreet}, {formData.shippingCity} ({formData.shippingPincode})
                </p>
              </div>

              <div className="space-y-3">
                {/* Standard */}
                <label
                  className={`flex items-start justify-between p-4 rounded border cursor-pointer transition-all ${
                    deliveryMethod === 'standard'
                      ? 'border-maroon-800 bg-maroon-50/40 ring-1 ring-maroon-800'
                      : 'border-zinc-200 hover:border-zinc-400 bg-white'
                  }`}
                >
                  <div className="flex gap-3">
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryMethod === 'standard'}
                      onChange={() => setDeliveryMethod('standard')}
                      className="mt-1 accent-maroon-800"
                    />
                    <div>
                      <p className="text-xs font-bold text-zinc-900">
                        Insured Express Air Shipping (Standard Atelier)
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Delivered within 5–7 business days in signature padded luxury box.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-maroon-900">
                    {shippingFee === 0 ? 'Complimentary' : `₹${shippingFee}`}
                  </span>
                </label>

                {/* Priority */}
                <label
                  className={`flex items-start justify-between p-4 rounded border cursor-pointer transition-all ${
                    deliveryMethod === 'express'
                      ? 'border-maroon-800 bg-maroon-50/40 ring-1 ring-maroon-800'
                      : 'border-zinc-200 hover:border-zinc-400 bg-white'
                  }`}
                >
                  <div className="flex gap-3">
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryMethod === 'express'}
                      onChange={() => setDeliveryMethod('express')}
                      className="mt-1 accent-maroon-800"
                    />
                    <div>
                      <p className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                        <span>Royal Concierge Priority Air</span>
                        <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Guaranteed delivery within 2–3 business days with personal bridal stylist dispatch.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-maroon-900">
                    Complimentary for Couture Members
                  </span>
                </label>
              </div>

              <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="w-full sm:w-auto py-2.5 sm:py-0 inline-flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-900 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Address</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full sm:w-auto h-12 sm:h-11 min-h-[48px] px-8 bg-[#3E1A1E] hover:bg-[#2B0C10] text-[#DFC89D] text-xs font-bold uppercase tracking-widest rounded-xl sm:rounded-lg shadow flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <span>Continue to Payment</span>
                  <ArrowRight className="w-4 h-4 text-[#C6A15D]" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="pb-3 border-b border-zinc-200">
                <h2 className="font-serif text-2xl font-bold text-zinc-900">
                  Secure Payment
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  All transactions are 256-bit encrypted. Private keys are never exposed.
                </p>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`p-3 rounded border text-center transition-all ${
                    paymentMethod === 'CARD'
                      ? 'border-maroon-800 bg-maroon-50 text-maroon-900 font-bold'
                      : 'border-zinc-200 text-zinc-700 hover:border-zinc-400 bg-white'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mx-auto mb-1 text-maroon-800" />
                  <span className="text-xs">Credit/Debit Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`p-3 rounded border text-center transition-all ${
                    paymentMethod === 'UPI'
                      ? 'border-maroon-800 bg-maroon-50 text-maroon-900 font-bold ring-1 ring-maroon-800'
                      : 'border-zinc-200 text-zinc-700 hover:border-zinc-400 bg-white'
                  }`}
                >
                  <QrCode className="w-5 h-5 mx-auto mb-1 text-maroon-800" />
                  <span className="text-xs">Pay by UPI QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('NETBANKING')}
                  className={`p-3 rounded border text-center transition-all ${
                    paymentMethod === 'NETBANKING'
                      ? 'border-maroon-800 bg-maroon-50 text-maroon-900 font-bold'
                      : 'border-zinc-200 text-zinc-700 hover:border-zinc-400 bg-white'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 mx-auto mb-1 text-maroon-800" />
                  <span className="text-xs">Net Banking</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('COD')}
                  className={`p-3 rounded border text-center transition-all ${
                    paymentMethod === 'COD'
                      ? 'border-maroon-800 bg-maroon-50 text-maroon-900 font-bold'
                      : 'border-zinc-200 text-zinc-700 hover:border-zinc-400 bg-white'
                  }`}
                >
                  <Truck className="w-5 h-5 mx-auto mb-1 text-maroon-800" />
                  <span className="text-xs">Cash on Delivery</span>
                </button>
              </div>

              {/* Payment Details Container */}
              {paymentMethod === 'COD' ? (
                <div className="p-5 bg-[#FAF7F2] rounded-xl border border-[#C6A15D]/40 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 uppercase tracking-wider">
                    <Truck className="w-4 h-4 text-[#3E1A1E]" />
                    <span>Cash on Delivery (COD)</span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    Pay with cash when your luxury parcel arrives at your doorstep. Please ensure the exact total of <strong className="text-[#3E1A1E] font-bold">{formatPrice(total)}</strong> is available upon courier handover.
                  </p>
                  <div className="p-3 bg-amber-50/80 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Order confirmation will be generated immediately; payment is collected upon delivery.</span>
                  </div>
                </div>
              ) : paymentMethod === 'UPI' ? (
                <div className="p-5 bg-[#FAF7F2] rounded-xl border border-[#C6A15D]/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 uppercase tracking-wider">
                      <QrCode className="w-4 h-4 text-[#3E1A1E]" />
                      <span>Dynamic UPI QR Payment</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full">
                      Zero Extra Fees
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 leading-relaxed">
                    Clicking <strong className="text-[#3E1A1E]">“PAY {formatPrice(total)} VIA UPI QR”</strong> will reserve your atelier items and immediately display a unique, dynamic UPI QR code prefilled with the exact payable amount of <strong className="text-[#3E1A1E] font-bold">{formatPrice(total)}</strong>.
                  </p>

                  <div className="p-3 bg-white rounded-xl border border-[#C6A15D]/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-600 font-medium">Compatible Apps:</span>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-700">
                        <span className="px-2 py-0.5 bg-zinc-100 rounded">GPay</span>
                        <span className="px-2 py-0.5 bg-zinc-100 rounded">PhonePe</span>
                        <span className="px-2 py-0.5 bg-zinc-100 rounded">Paytm</span>
                        <span className="px-2 py-0.5 bg-zinc-100 rounded">BHIM</span>
                        <span className="px-2 py-0.5 bg-zinc-100 rounded">CRED</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>NPCI Verified UPI switch with 15-minute dynamic session security.</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-[#FAF7F2] rounded-xl border border-[#C6A15D]/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-700" />
                      Razorpay Standard Secure Checkout
                    </span>
                    <div className="flex gap-1.5">
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded border font-bold text-zinc-700">VISA</span>
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded border font-bold text-zinc-700">MASTERCARD</span>
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded border font-bold text-zinc-700">RUPAY</span>
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded border font-bold text-zinc-700">NET BANKING</span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-600 leading-relaxed">
                    Clicking <strong className="text-[#3E1A1E]">“PAY {formatPrice(total)}”</strong> will open the official 256-bit SSL encrypted <strong>Razorpay Standard Checkout</strong> window, where you can securely complete your purchase using Credit/Debit Cards, Net Banking, or Wallets.
                  </p>

                  <div className="p-3 bg-white rounded-lg border border-gold-200 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800">
                      <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>PCI-DSS Level 1 Certified &amp; RBI Regulated Gateway</span>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Your financial details are securely processed directly by Razorpay and are never stored on atelier servers.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full sm:w-auto py-2.5 sm:py-0 inline-flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-900 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Delivery</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handlePlaceOrder}
                  className="w-full sm:w-auto h-13 min-h-[50px] px-6 sm:px-8 bg-[#3E1A1E] hover:bg-[#2B0C10] active:bg-[#1A080B] disabled:bg-zinc-400 text-[#DFC89D] text-xs font-bold uppercase tracking-[0.12em] sm:tracking-[0.2em] rounded-xl sm:rounded-lg shadow-xl flex items-center justify-center gap-2 border border-[#C6A15D]/60 transition-all duration-300 group cursor-pointer disabled:cursor-not-allowed text-center"
                >
                  <Lock className="w-4 h-4 text-[#C6A15D] shrink-0" />
                  <span className="truncate">
                    {isProcessing
                      ? 'Securing Transaction...'
                      : paymentMethod === 'COD'
                      ? `PLACE ORDER (${formatPrice(total)} COD)`
                      : paymentMethod === 'UPI'
                      ? `PAY ${formatPrice(total)} VIA UPI QR`
                      : `PAY ${formatPrice(total)}`}
                  </span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* ORDER SUMMARY SIDEBAR (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-lg border border-[#E8DEC8] shadow-xs space-y-6">
          <h3 className="font-serif text-xl font-bold text-zinc-900 pb-3 border-b border-zinc-200">
            Order Summary ({items.reduce((s, i) => s + i.quantity, 0)} Pieces)
          </h3>

          <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.id} className="py-3 flex gap-3 items-center">
                <img
                  src={item.product?.images?.[0]?.url || 'https://via.placeholder.com/80'}
                  alt={item.product?.name}
                  className="w-12 h-16 object-cover rounded bg-zinc-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 truncate">{item.product?.name}</p>
                  <p className="text-[11px] text-zinc-500">Qty: {item.quantity} · Size: {item.size}</p>
                </div>
                <span className="font-serif text-xs font-bold text-maroon-950">
                  {formatPrice((item.product?.price || 0) * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-xs text-zinc-600 border-t border-zinc-200 pt-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-zinc-900">{formatPrice(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Coupon ({appliedCoupon?.code})</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="font-semibold text-zinc-900">
                {shippingFee === 0 ? (
                  <span className="text-emerald-700 font-bold uppercase tracking-wider">Complimentary</span>
                ) : (
                  formatPrice(shippingFee)
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Taxes &amp; Duties</span>
              <span className="font-semibold text-zinc-900">Included</span>
            </div>
            <div className="pt-3 border-t border-zinc-200 flex justify-between items-baseline">
              <span className="font-serif text-lg font-bold text-zinc-950">Total</span>
              <span className="font-serif text-2xl font-bold text-maroon-950">
                {formatPrice(total)}
              </span>
            </div>
          </div>

          <div className="p-3 bg-[#FAF7F2] rounded border border-gold-200 text-[11px] text-zinc-600 leading-relaxed">
            By placing your order, you agree to EthnizCouture’s Atelier Terms of Sale and complimentary 7-day pickup policy.
          </div>
        </div>

      </div>

      {/* Dynamic UPI QR Payment Modal */}
      {upiModalState && (
        <DynamicUpiQrModal
          isOpen={upiModalState.isOpen}
          orderId={upiModalState.orderId}
          orderNumber={upiModalState.orderNumber}
          totalAmount={upiModalState.totalAmount}
          onClose={() => {
            const num = upiModalState.orderNumber;
            setUpiModalState(null);
            clearCart();
            try {
              sessionStorage.removeItem('ethniz_checkout_state');
              sessionStorage.setItem('ethniz_last_completed_order', num);
            } catch {
              // ignore
            }
            showToast(`Order #${num} reserved. You can complete payment anytime in Order Tracking.`, 'info');
            window.scrollTo(0, 0);
            navigate(`/track-order?orderNumber=${num}`, { replace: true });
          }}
          onPaymentSuccess={() => {
            const num = upiModalState.orderNumber;
            setUpiModalState(null);
            clearCart();
            try {
              sessionStorage.removeItem('ethniz_checkout_state');
              sessionStorage.setItem('ethniz_last_completed_order', num);
            } catch {
              // ignore
            }
            showToast('Your royal couture order has been confirmed!', 'success');
            window.scrollTo(0, 0);
            navigate(`/order-confirmation/${num}`, { replace: true });
          }}
        />
      )}

    </div>
  );
};
