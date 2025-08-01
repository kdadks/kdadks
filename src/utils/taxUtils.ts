/**
 * Tax utility functions for handling different tax systems based on country
 */

import type { Customer, Country } from '../types/invoice';

/**
 * Get the appropriate tax label based on customer's country
 * @param customer - The customer object with country information
 * @returns The tax label to display (GST for India, VAT for others)
 */
export const getTaxLabel = (customer: Customer | undefined): string => {
  // If no customer or no country information, default to GST
  if (!customer || !customer.country) {
    return 'GST';
  }

  // Check if customer is from India (using country code)
  const countryCode = customer.country.code?.toUpperCase();
  
  if (countryCode === 'IND' || countryCode === 'IN') {
    return 'GST';
  }
  
  // For all other countries, use VAT
  return 'VAT';
};

/**
 * Get the appropriate tax field name for GSTIN/VAT registration
 * @param customer - The customer object with country information
 * @returns The tax registration field name
 */
export const getTaxRegistrationLabel = (customer: Customer | undefined): string => {
  const taxLabel = getTaxLabel(customer);
  
  if (taxLabel === 'GST') {
    return 'GSTIN';
  }
  
  return 'VAT Number';
};

/**
 * Get the appropriate HSN/Classification code label
 * @param customer - The customer object with country information
 * @returns The classification code label
 */
export const getClassificationCodeLabel = (customer: Customer | undefined): string => {
  const taxLabel = getTaxLabel(customer);
  
  if (taxLabel === 'GST') {
    return 'HSN Code';
  }
  
  return 'Product Code';
};

/**
 * Validate tax registration number based on country
 * @param taxNumber - The tax registration number to validate
 * @param customer - The customer object with country information
 * @returns Object with validation result and error message
 */
export const validateTaxRegistration = (
  taxNumber: string, 
  customer: Customer | undefined
): { isValid: boolean; error?: string } => {
  if (!taxNumber || !taxNumber.trim()) {
    return { isValid: true }; // Empty is valid (optional field)
  }

  const taxLabel = getTaxLabel(customer);
  
  if (taxLabel === 'GST') {
    // Indian GSTIN validation
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(taxNumber)) {
      return {
        isValid: false,
        error: 'Please enter a valid GSTIN (15 characters: 22AAAAA0000A1Z5)'
      };
    }
  } else {
    // Basic VAT number validation (length check)
    if (taxNumber.length < 4 || taxNumber.length > 20) {
      return {
        isValid: false,
        error: 'Please enter a valid VAT number (4-20 characters)'
      };
    }
  }
  
  return { isValid: true };
};

/**
 * Check if country uses GST system
 * @param country - The country object
 * @returns True if country uses GST, false otherwise
 */
export const isGSTCountry = (country: Country | undefined): boolean => {
  if (!country) return true; // Default to GST if no country
  
  const countryCode = country.code?.toUpperCase();
  return countryCode === 'IND' || countryCode === 'IN';
};

/**
 * Get default tax rate based on country
 * @param customer - The customer object with country information
 * @returns Default tax rate for the country
 */
export const getDefaultTaxRate = (customer: Customer | undefined): number => {
  const taxLabel = getTaxLabel(customer);
  
  if (taxLabel === 'GST') {
    return 18; // India GST default rate
  }
  
  // Common VAT rates by region (can be expanded)
  if (customer?.country?.code?.toUpperCase() === 'USA') {
    return 0; // US typically uses sales tax, varies by state
  }
  
  // Default VAT rate for most countries
  return 20;
};
