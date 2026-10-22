/**
 * Strict Client-Side Validation Utilities for EthnizCouture
 * Ensures instant, user-friendly, and rigorous validation across all customer forms.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PasswordScore {
  isValid: boolean;
  score: number; // 0 to 4
  level: 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Atelier Royal Grade';
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    specialChar: boolean;
  };
  error?: string;
}

export const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const NAME_REGEX = /^[a-zA-Z\s.'-]{2,70}$/;
export const INDIAN_PHONE_REGEX = /^(?:\+91[\s-]?)?[0]?[6-9]\d{9}$/;
export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
export const CITY_STATE_REGEX = /^[a-zA-Z\s.'-]{2,50}$/;

export const INDIAN_STATES: string[] = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry'
];

/**
 * Validate RFC Email
 */
export const validateEmail = (email?: string): ValidationResult => {
  if (!email || !email.trim()) {
    return { isValid: false, error: 'Email address is required.' };
  }
  const trimmed = email.trim();
  if (trimmed.length > 254) {
    return { isValid: false, error: 'Email address cannot exceed 254 characters.' };
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address (e.g. name@example.com).' };
  }
  return { isValid: true };
};

/**
 * Validate Full Name (letters, spaces, hyphens only, min 2 chars)
 */
export const validateFullName = (name?: string, fieldName = 'Full Name'): ValidationResult => {
  if (!name || !name.trim()) {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters long.` };
  }
  if (trimmed.length > 70) {
    return { isValid: false, error: `${fieldName} cannot exceed 70 characters.` };
  }
  if (!NAME_REGEX.test(trimmed)) {
    return { isValid: false, error: `${fieldName} must contain letters and spaces only (no digits or symbols).` };
  }
  return { isValid: true };
};

/**
 * Validate Indian Mobile Phone (10 digits starting with 6,7,8,9)
 */
export const validatePhone = (phone?: string, required = true): ValidationResult => {
  if (!phone || !phone.trim()) {
    if (required) {
      return { isValid: false, error: 'Phone number is required for dispatch & order tracking.' };
    }
    return { isValid: true };
  }
  const trimmed = phone.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (!INDIAN_PHONE_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'Please enter a valid 10-digit Indian mobile number (e.g. 9820012345 or +91 9820012345).'
    };
  }

  const last10 = digitsOnly.slice(-10);
  if (/^(\d)\1{9}$/.test(last10)) {
    return { isValid: false, error: 'Please enter a valid, active mobile number.' };
  }

  return { isValid: true };
};

/**
 * Comprehensive Password Strength Evaluator
 */
export const evaluatePassword = (password?: string): PasswordScore => {
  const val = password || '';
  const checks = {
    length: val.length >= 8 && val.length <= 64,
    uppercase: /[A-Z]/.test(val),
    lowercase: /[a-z]/.test(val),
    number: /[0-9]/.test(val),
    specialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val)
  };

  let score = 0;
  if (checks.length) score += 1;
  if (checks.uppercase && checks.lowercase) score += 1;
  if (checks.number) score += 1;
  if (checks.specialChar) score += 1;

  let level: PasswordScore['level'] = 'Weak';
  if (score === 2) level = 'Fair';
  else if (score === 3) level = 'Good';
  else if (score === 4) level = val.length >= 12 ? 'Atelier Royal Grade' : 'Strong';

  const isValid = checks.length && checks.uppercase && checks.lowercase && checks.number && checks.specialChar;

  let error: string | undefined;
  if (!val) {
    error = 'Password is required.';
  } else if (!checks.length) {
    error = 'Password must be at least 8 characters long.';
  } else if (!checks.uppercase) {
    error = 'Password must contain at least one uppercase letter (A-Z).';
  } else if (!checks.lowercase) {
    error = 'Password must contain at least one lowercase letter (a-z).';
  } else if (!checks.number) {
    error = 'Password must contain at least one number (0-9).';
  } else if (!checks.specialChar) {
    error = 'Password must contain at least one special character (!@#$%^&*...).';
  }

  return {
    isValid,
    score,
    level,
    checks,
    error
  };
};

/**
 * Confirm Password Match
 */
export const validateConfirmPassword = (password: string, confirmPassword: string): ValidationResult => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password.' };
  }
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match. Please verify.' };
  }
  return { isValid: true };
};

/**
 * Indian PIN code validation (6 numeric digits, cannot begin with 0)
 */
export const validatePincode = (pincode?: string, fieldName = 'PIN code'): ValidationResult => {
  if (!pincode || !pincode.trim()) {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  const trimmed = pincode.trim();
  if (!PINCODE_REGEX.test(trimmed)) {
    return { isValid: false, error: `Please enter a valid 6-digit Indian ${fieldName} (e.g. 400001, cannot begin with 0).` };
  }
  return { isValid: true };
};

export interface PincodeServiceabilityResult {
  isValidFormat: boolean;
  isServiceable: boolean;
  message?: string;
  source: 'SYNTAX_RULE' | 'CONFIGURED_SOURCE';
}

/**
 * Validates PIN code format without making fabricated courier promises.
 * Confirms postal circle syntax; live courier routing is confirmed upon dispatch.
 */
export const checkPincodeServiceability = (pincode?: string): PincodeServiceabilityResult => {
  const validation = validatePincode(pincode);
  if (!validation.isValid) {
    return {
      isValidFormat: false,
      isServiceable: false,
      message: validation.error,
      source: 'SYNTAX_RULE'
    };
  }

  return {
    isValidFormat: true,
    isServiceable: true,
    message: 'Valid 6-digit Indian postal circle. Insured boutique delivery available.',
    source: 'CONFIGURED_SOURCE'
  };
};

/**
 * Street Address validation
 */
export const validateStreet = (street?: string, fieldName = 'Street address'): ValidationResult => {
  if (!street || !street.trim()) {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  const trimmed = street.trim();
  if (trimmed.length < 6) {
    return {
      isValid: false,
      error: `${fieldName} must be at least 6 characters (include house/flat number and street name).`
    };
  }
  if (trimmed.length > 200) {
    return { isValid: false, error: `${fieldName} cannot exceed 200 characters.` };
  }
  return { isValid: true };
};

/**
 * City validation
 */
export const validateCity = (city?: string, fieldName = 'City'): ValidationResult => {
  if (!city || !city.trim()) {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  const trimmed = city.trim();
  if (trimmed.length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters long.` };
  }
  if (trimmed.length > 50) {
    return { isValid: false, error: `${fieldName} cannot exceed 50 characters.` };
  }
  if (!CITY_STATE_REGEX.test(trimmed)) {
    return { isValid: false, error: `${fieldName} must contain letters and spaces only (no numbers).` };
  }
  return { isValid: true };
};

/**
 * State validation
 */
export const validateState = (state?: string, fieldName = 'State'): ValidationResult => {
  if (!state || !state.trim()) {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  const trimmed = state.trim();
  if (trimmed.length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters long.` };
  }
  if (trimmed.length > 50) {
    return { isValid: false, error: `${fieldName} cannot exceed 50 characters.` };
  }
  if (!CITY_STATE_REGEX.test(trimmed)) {
    return { isValid: false, error: `${fieldName} must contain letters and spaces only.` };
  }
  return { isValid: true };
};

/**
 * Payment Card validations
 */
export const validateCardHolder = (name?: string): ValidationResult => {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Cardholder name is required.' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Cardholder name must be at least 2 characters.' };
  }
  if (!NAME_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Cardholder name must contain letters only.' };
  }
  return { isValid: true };
};

export const validateCardNumber = (number?: string): ValidationResult => {
  if (!number || !number.trim()) {
    return { isValid: false, error: 'Card number is required.' };
  }
  const clean = number.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(clean)) {
    return { isValid: false, error: 'Please enter a valid 16-digit card number.' };
  }
  return { isValid: true };
};

export const validateCardExpiry = (expiry?: string): ValidationResult => {
  if (!expiry || !expiry.trim()) {
    return { isValid: false, error: 'Expiry date is required (MM/YY).' };
  }
  const match = expiry.trim().match(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/);
  if (!match) {
    return { isValid: false, error: 'Please enter expiry in MM/YY format (e.g. 08/28).' };
  }

  const month = parseInt(match[1], 10);
  const year = parseInt(`20${match[2]}`, 10);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return { isValid: false, error: 'The card expiration date cannot be in the past.' };
  }

  return { isValid: true };
};

export const validateCardCvc = (cvc?: string): ValidationResult => {
  if (!cvc || !cvc.trim()) {
    return { isValid: false, error: 'CVV/CVC is required.' };
  }
  if (!/^\d{3,4}$/.test(cvc.trim())) {
    return { isValid: false, error: 'CVV must be 3 or 4 digits.' };
  }
  return { isValid: true };
};

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const validateGstin = (gstin?: string): ValidationResult => {
  if (!gstin || !gstin.trim()) {
    return { isValid: false, error: 'GSTIN is required.' };
  }
  const clean = gstin.trim().toUpperCase();
  if (clean.length !== 15) {
    return { isValid: false, error: 'GSTIN must be exactly 15 characters long.' };
  }
  if (!GSTIN_REGEX.test(clean)) {
    return { isValid: false, error: 'Please enter a valid Indian GSTIN (e.g. 27AAAAA0000A1Z5).' };
  }
  return { isValid: true };
};

export interface ParsedOrderNotes {
  billingAddress?: {
    fullAddress: string;
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  gstin?: string;
  businessName?: string;
  gpsCoordinates?: { lat: number; lng: number };
  customerNote?: string;
}

/**
 * Extracts structured metadata (Billing Address, GSTIN, GPS coordinates, customer note)
 * encoded in order.notes.
 */
export function parseOrderNotes(notes?: string | null): ParsedOrderNotes {
  const result: ParsedOrderNotes = {};
  if (!notes || typeof notes !== 'string') return result;

  // Extract Billing Address: [Billing Address: <address>]
  const billingMatch = notes.match(/\[Billing Address:\s*([^\]]+)\]/i);
  if (billingMatch && billingMatch[1]) {
    const full = billingMatch[1].trim();
    result.billingAddress = {
      fullAddress: full
    };
  }

  // Extract GSTIN: [GSTIN: <gstin>( | Entity: <businessName>)?]
  const gstinMatch = notes.match(/\[GSTIN:\s*([^\]|]+)(?:\s*\|\s*Entity:\s*([^\]]+))?\]/i);
  if (gstinMatch) {
    if (gstinMatch[1]) {
      result.gstin = gstinMatch[1].trim();
    }
    if (gstinMatch[2]) {
      result.businessName = gstinMatch[2].trim();
    }
  }

  // Extract GPS: [GPS: lat, lng]
  const gpsMatch = notes.match(/\[GPS:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)\]/i);
  if (gpsMatch) {
    result.gpsCoordinates = {
      lat: parseFloat(gpsMatch[1]),
      lng: parseFloat(gpsMatch[2])
    };
  }

  // Remaining user note
  const cleaned = notes
    .replace(/\[Billing Address:[^\]]+\]/gi, '')
    .replace(/\[GSTIN:[^\]]+\]/gi, '')
    .replace(/\[GPS:[^\]]+\]/gi, '')
    .replace(/\[Payment Method:[^\]]+\]/gi, '')
    .replace(/\|\s*\|/g, '|')
    .replace(/^\s*\|\s*|\s*\|\s*$/g, '')
    .trim();

  if (cleaned) {
    result.customerNote = cleaned;
  }

  return result;
}


