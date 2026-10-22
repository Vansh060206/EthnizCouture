import React, { createContext, useContext, useState, useEffect } from 'react';

export type CurrencyCode = 'INR' | 'USD' | 'GBP' | 'EUR' | 'AED';

interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  label: string;
  rate: number; // relative to INR (1 INR = rate target currency)
  flag: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  INR: { code: 'INR', symbol: '₹', label: 'INR (₹)', rate: 1, flag: '🇮🇳' },
  USD: { code: 'USD', symbol: '$', label: 'USD ($)', rate: 0.012, flag: '🇺🇸' },
  GBP: { code: 'GBP', symbol: '£', label: 'GBP (£)', rate: 0.0095, flag: '🇬🇧' },
  EUR: { code: 'EUR', symbol: '€', label: 'EUR (€)', rate: 0.011, flag: '🇪🇺' },
  AED: { code: 'AED', symbol: 'AED ', label: 'AED (د.إ)', rate: 0.044, flag: '🇦🇪' },
};

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  formatPrice: (amountInINR: number | undefined | null) => string;
  activeCurrencyInfo: CurrencyInfo;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currency: CurrencyCode = 'INR';

  useEffect(() => {
    localStorage.setItem('ethniz_currency', 'INR');
  }, []);

  const setCurrency = (_c: CurrencyCode) => {
    // Strictly Indian Rupees (INR) only
  };

  const activeCurrencyInfo = CURRENCIES.INR;

  const formatPrice = (amountInINR: number | undefined | null): string => {
    if (amountInINR === undefined || amountInINR === null) return '';
    return `₹${Math.round(amountInINR).toLocaleString('en-IN')}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, activeCurrencyInfo }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
