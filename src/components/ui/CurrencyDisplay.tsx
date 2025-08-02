import React, { useState, useEffect } from 'react';
import { exchangeRateService } from '../../services/exchangeRateService';

// Utility function to get currency symbol
const getCurrencySymbol = (code: string) => {
  switch (code) {
    case 'USD': return '$';
    case 'GBP': return '£';
    case 'EUR': return '€';
    case 'INR': return '₹';
    case 'AUD': return 'A$';
    case 'CAD': return 'C$';
    case 'SGD': return 'S$';
    case 'AED': return 'AED ';
    case 'SAR': return 'SAR ';
    case 'JPY': return '¥';
    case 'CNY': return '¥';
    default: return code + ' ';
  }
};

interface CurrencyDisplayProps {
  amount: number;
  currencyCode: string;
  inrAmount?: number;
  showBothCurrencies?: boolean;
  className?: string;
  conversionDate?: string; // Add date for historical conversion
}

/**
 * Component to display currency amounts with optional INR conversion
 */
export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  currencyCode,
  inrAmount,
  showBothCurrencies = false,
  className = '',
  conversionDate
}) => {
  const [calculatedInrAmount, setCalculatedInrAmount] = useState<number | null>(inrAmount || null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Effect to calculate INR amount if missing and needed
  useEffect(() => {
    if (showBothCurrencies && currencyCode !== 'INR' && !inrAmount && !calculatedInrAmount && !isCalculating) {
      setIsCalculating(true);
      
      // Use a more conservative approach - try conversion but with timeout
      const convertWithTimeout = async () => {
        try {
          const convertedAmount = await Promise.race([
            exchangeRateService.convertToINR(amount, currencyCode, conversionDate),
            new Promise<number>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 5000)
            )
          ]);
          setCalculatedInrAmount(convertedAmount);
        } catch (error) {
          console.warn('Failed to convert currency in CurrencyDisplay:', error);
          // Use a simple fallback approximation for common currencies
          let fallbackRate = 1.0;
          switch (currencyCode) {
            case 'USD': fallbackRate = 83.0; break;
            case 'GBP': fallbackRate = 105.0; break;
            case 'EUR': fallbackRate = 90.0; break;
            case 'AUD': fallbackRate = 55.0; break;
            case 'CAD': fallbackRate = 61.0; break;
            case 'SGD': fallbackRate = 62.0; break;
            case 'AED': fallbackRate = 22.5; break;
            case 'SAR': fallbackRate = 22.0; break;
            case 'JPY': fallbackRate = 0.56; break;
            case 'CNY': fallbackRate = 11.5; break;
            default: fallbackRate = 1.0;
          }
          setCalculatedInrAmount(amount * fallbackRate);
        } finally {
          setIsCalculating(false);
        }
      };

      convertWithTimeout();
    }
  }, [amount, currencyCode, inrAmount, showBothCurrencies, calculatedInrAmount, isCalculating, conversionDate]);

  const formatCurrency = (value: number, currency: string) => {
    const symbol = getCurrencySymbol(currency);
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
    
    return `${symbol}${formattedAmount}`;
  };

  const effectiveInrAmount = inrAmount || calculatedInrAmount;

  if (!showBothCurrencies || currencyCode === 'INR' || (!effectiveInrAmount && !isCalculating)) {
    return (
      <span className={className}>
        {formatCurrency(amount, currencyCode)}
      </span>
    );
  }

  return (
    <span className={className}>
      <span className="font-medium">{formatCurrency(amount, currencyCode)}</span>
      <span className="text-sm text-gray-500 ml-1">
        {isCalculating ? '(calculating...)' : `(~${formatCurrency(effectiveInrAmount!, 'INR')})`}
      </span>
    </span>
  );
};

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  currencyCode: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Input component for currency amounts
 */
export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  currencyCode,
  disabled = false,
  placeholder = '0.00',
  className = ''
}) => {
  const symbol = getCurrencySymbol(currencyCode);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = parseFloat(e.target.value) || 0;
    onChange(numValue);
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <span className="text-gray-500 sm:text-sm">{symbol}</span>
      </div>
      <input
        type="number"
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        step="0.01"
        min="0"
        className={`pl-10 ${className}`}
      />
    </div>
  );
};

export default CurrencyDisplay;
