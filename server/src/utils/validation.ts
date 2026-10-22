/**
 * Strict Validation Utilities for EthnizCouture
 * Enterprise-grade validation routines for Patron Authentication,
 * Shipping, Contact Information, and Checkout integrity.
 */

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// RFC 5322 compliant regex for emails
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Full name: 2-70 characters, letters, spaces, hyphens, dots, apostrophes
export const NAME_REGEX = /^[a-zA-Z\s.'-]{2,70}$/;

// Indian mobile phone: 10 digits starting with 6, 7, 8, 9 with optional +91 or 0 prefix
export const INDIAN_PHONE_REGEX = /^(?:\+91[\s-]?)?[0]?[6-9]\d{9}$/;

// Indian Postal Index Number (PIN): exactly 6 digits, first digit 1-9
export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

// City & State: letters, spaces, hyphens, dots, 2-50 characters
export const CITY_STATE_REGEX = /^[a-zA-Z\s.'-]{2,50}$/;

export const validateEmail = (email?: string | null): ValidationResult => {
  if (!email || typeof email !== 'string') {
    return { isValid: false, message: 'Email address is required.' };
  }
  const trimmed = email.trim();
  if (trimmed.length === 0) {
    return { isValid: false, message: 'Email address cannot be empty.' };
  }
  if (trimmed.length > 254) {
    return { isValid: false, message: 'Email address cannot exceed 254 characters.' };
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return { isValid: false, message: 'Please enter a valid email address (e.g. name@example.com).' };
  }
  return { isValid: true };
};

export const validateFullName = (name?: string | null, fieldName = 'Full Name'): ValidationResult => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, message: `${fieldName} is required.` };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { isValid: false, message: `${fieldName} must be at least 2 characters long.` };
  }
  if (trimmed.length > 70) {
    return { isValid: false, message: `${fieldName} cannot exceed 70 characters.` };
  }
  if (!NAME_REGEX.test(trimmed)) {
    return { isValid: false, message: `${fieldName} must contain letters, spaces, or hyphens only (no digits or symbols).` };
  }
  return { isValid: true };
};

export const validatePhone = (phone?: string | null, required = true): ValidationResult => {
  if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
    if (required) {
      return { isValid: false, message: 'Phone number is required for courier delivery and tracking updates.' };
    }
    return { isValid: true };
  }
  const trimmed = phone.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (!INDIAN_PHONE_REGEX.test(trimmed)) {
    return { isValid: false, message: 'Please enter a valid 10-digit Indian mobile number (e.g. 9820012345 or +91 9820012345).' };
  }

  // Reject dummy patterns like 0000000000 or 9999999999
  const last10 = digitsOnly.slice(-10);
  if (/^(\d)\1{9}$/.test(last10)) {
    return { isValid: false, message: 'Please enter a valid, active mobile number.' };
  }

  return { isValid: true };
};

export const validatePassword = (password?: string | null): ValidationResult => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required.' };
  }
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (password.length > 64) {
    return { isValid: false, message: 'Password cannot exceed 64 characters.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must include at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must include at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must include at least one digit (0-9).' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, message: 'Password must include at least one special character (!@#$%...).' };
  }
  return { isValid: true };
};

export const validateStreet = (street?: string | null, fieldName = 'Street address'): ValidationResult => {
  if (!street || typeof street !== 'string') {
    return { isValid: false, message: `${fieldName} is required.` };
  }
  const trimmed = street.trim();
  if (trimmed.length < 6) {
    return { isValid: false, message: `${fieldName} must be at least 6 characters (include building/house number and street name).` };
  }
  if (trimmed.length > 200) {
    return { isValid: false, message: `${fieldName} cannot exceed 200 characters.` };
  }
  return { isValid: true };
};

export const validateCity = (city?: string | null, fieldName = 'City'): ValidationResult => {
  if (!city || typeof city !== 'string') {
    return { isValid: false, message: `${fieldName} is required.` };
  }
  const trimmed = city.trim();
  if (trimmed.length < 2) {
    return { isValid: false, message: `${fieldName} must be at least 2 characters long.` };
  }
  if (trimmed.length > 50) {
    return { isValid: false, message: `${fieldName} cannot exceed 50 characters.` };
  }
  if (!CITY_STATE_REGEX.test(trimmed)) {
    return { isValid: false, message: `${fieldName} must contain letters and spaces only.` };
  }
  return { isValid: true };
};

export const validateState = (state?: string | null, fieldName = 'State'): ValidationResult => {
  if (!state || typeof state !== 'string') {
    return { isValid: false, message: `${fieldName} is required.` };
  }
  const trimmed = state.trim();
  if (trimmed.length < 2) {
    return { isValid: false, message: `${fieldName} must be at least 2 characters long.` };
  }
  if (trimmed.length > 50) {
    return { isValid: false, message: `${fieldName} cannot exceed 50 characters.` };
  }
  if (!CITY_STATE_REGEX.test(trimmed)) {
    return { isValid: false, message: `${fieldName} must contain letters and spaces only.` };
  }
  return { isValid: true };
};

export const validatePincode = (pincode?: string | null, fieldName = 'PIN code'): ValidationResult => {
  if (!pincode || typeof pincode !== 'string') {
    return { isValid: false, message: `${fieldName} is required.` };
  }
  const trimmed = pincode.trim();
  if (!PINCODE_REGEX.test(trimmed)) {
    return { isValid: false, message: `Please enter a valid 6-digit Indian ${fieldName} (e.g. 400001, cannot begin with 0).` };
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
 * Validates PIN code format on the server.
 * Standard Indian postal circle rules apply; live courier tracking is assigned at dispatch.
 */
export const checkPincodeServiceability = (pincode?: string | null): PincodeServiceabilityResult => {
  const validation = validatePincode(pincode);
  if (!validation.isValid) {
    return {
      isValidFormat: false,
      isServiceable: false,
      message: validation.message,
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

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const validateGstin = (gstin?: string | null): ValidationResult => {
  if (!gstin || typeof gstin !== 'string') {
    return { isValid: false, message: 'GSTIN is required.' };
  }
  const clean = gstin.trim().toUpperCase();
  if (clean.length !== 15) {
    return { isValid: false, message: 'GSTIN must be exactly 15 characters long.' };
  }
  if (!GSTIN_REGEX.test(clean)) {
    return { isValid: false, message: 'Please enter a valid Indian GSTIN (e.g. 27AAAAA0000A1Z5).' };
  }
  return { isValid: true };
};

