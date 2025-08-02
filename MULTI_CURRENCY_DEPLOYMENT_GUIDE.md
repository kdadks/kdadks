# Multi-Currency Invoice System - Deployment Guide

## Overview

Your invoice management system now supports multiple currencies with automatic conversion to INR for dashboard analytics. This implementation ensures accurate financial reporting while preserving original invoice currencies for customer-facing documents.

## Key Features

### 1. Automatic Currency Detection
- **Customer-Based**: System automatically detects customer's country and applies appropriate currency
- **Supported Currencies**: USD, EUR, GBP, AUD, CAD, SGD, AED, SAR, JPY, CNY, and 150+ others
- **Fallback**: Defaults to INR for unknown countries or configurations

### 2. Real-Time Exchange Rates
- **Primary API**: exchangerate-api.com (free tier: 1,500 requests/month)
- **Fallback APIs**: fixer.io, currencylayer.com for redundancy
- **Update Frequency**: Daily automatic updates with manual refresh capability
- **Historical Rates**: Stores exchange rates with invoice creation date for audit trails

### 3. Dual Currency Display
- **Invoice Lists**: Show original currency with INR equivalent (e.g., "$1,500.00 (₹1,25,000)")
- **Dashboard Stats**: All amounts converted to INR for unified reporting
- **PDF Invoices**: Display in customer's original currency
- **Analytics**: INR-based for accurate business insights

## Database Schema Deployment

### Step 1: Execute Database Migration

Run the following SQL script in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of src/database/multi-currency-schema.sql
```

The migration includes:
- **exchange_rates table**: Stores daily exchange rates
- **Enhanced invoice tables**: Added currency fields
- **Conversion functions**: Automatic INR conversion triggers
- **Statistical views**: Pre-calculated INR totals for dashboard

### Step 2: Verify Installation

```sql
-- Check if exchange_rates table exists
SELECT * FROM exchange_rates LIMIT 5;

-- Verify enhanced invoice columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name LIKE '%currency%' OR column_name LIKE '%inr%';

-- Test currency conversion function
SELECT convert_to_inr(100, 'USD', CURRENT_DATE);
```

## Configuration

### 1. Exchange Rate API Setup

The system uses multiple API providers for reliability:

```typescript
// Primary API (no key required for basic usage)
const API_CONFIG = {
  primary: 'https://api.exchangerate-api.com/v4/latest/INR',
  fallback1: 'https://api.fixer.io/latest', // requires API key
  fallback2: 'https://api.currencylayer.com/live' // requires API key
};
```

**For Production**: Consider upgrading to paid plans for higher limits:
- exchangerate-api.com: $9/month for 100,000 requests
- fixer.io: $10/month for 100,000 requests

### 2. Environment Variables (Optional)

Add to your `.env` file for enhanced API access:

```env
REACT_APP_FIXER_API_KEY=your_fixer_api_key
REACT_APP_CURRENCY_LAYER_KEY=your_currency_layer_key
```

## Features & Usage

### 1. Customer Management
- **Country Selection**: Automatically sets currency based on country
- **Currency Override**: Manual currency selection if needed
- **Validation**: Ensures valid currency codes and country combinations

### 2. Invoice Creation
- **Automatic Detection**: Currency determined by customer's country
- **Real-Time Conversion**: Fetches current exchange rate during creation
- **Dual Storage**: Saves both original amount and INR equivalent

### 3. Dashboard Analytics
- **Unified Reporting**: All statistics in INR for consistent analysis
- **Multi-Currency Totals**: Shows original amounts with INR equivalents
- **Exchange Rate History**: Tracks rate changes over time

### 4. PDF Generation
- **Original Currency**: Invoices display in customer's currency
- **Proper Formatting**: Currency symbols and number formats per locale
- **Exchange Rate Disclosure**: Shows rate and date for transparency

## User Interface Updates

### 1. Invoice Lists
```tsx
// Displays: $1,500.00 (₹1,25,000.00)
<CurrencyDisplay 
  amount={invoice.total_amount} 
  currencyCode={invoice.currency_code}
  showBothCurrencies={invoice.currency_code !== 'INR'}
  inrAmount={invoice.inr_total_amount}
/>
```

### 2. Dashboard Stats
- **Total Revenue (INR)**: ₹45,75,000
- **Pending Amount (INR)**: ₹12,50,000
- **This Month (INR)**: ₹8,75,000

### 3. Create Invoice Form
- **Dynamic Currency**: Updates based on selected customer
- **Live Preview**: Shows amounts in customer's currency
- **Tax Calculations**: Adapts tax labels (GST/VAT) by country

## Testing Checklist

### 1. Exchange Rate Service
- [ ] Exchange rates fetch successfully
- [ ] Fallback APIs work when primary fails
- [ ] Rates update daily automatically
- [ ] Manual refresh works in admin interface

### 2. Currency Detection
- [ ] Customer country determines currency correctly
- [ ] Supported currencies display proper symbols
- [ ] Unknown currencies default to INR

### 3. Invoice Operations
- [ ] New invoices calculate INR amounts correctly
- [ ] PDF displays original currency
- [ ] Email includes proper currency formatting
- [ ] Dashboard shows INR totals

### 4. Data Integrity
- [ ] Exchange rates stored with dates
- [ ] Invoice conversions are audit-traceable
- [ ] Historical data remains consistent

## Monitoring & Maintenance

### 1. API Rate Limits
- Monitor daily API usage in browser console
- Set up alerts for approaching limits
- Consider upgrading to paid plans for high volume

### 2. Exchange Rate Accuracy
- Verify rates against financial websites weekly
- Check for any currency calculation discrepancies
- Monitor for API provider outages

### 3. Database Performance
- Index on `currency_code` and `created_at` fields
- Monitor query performance for large datasets
- Archive old exchange rate data annually

## Troubleshooting

### Common Issues

1. **Exchange Rate API Fails**
   - Check internet connectivity
   - Verify API endpoints are accessible
   - Review console errors for specific failures

2. **Currency Not Converting**
   - Ensure exchange_rates table has recent data
   - Check if currency code is supported
   - Verify database triggers are active

3. **PDF Currency Display Issues**
   - Confirm customer has valid country/currency
   - Check currency symbol mapping
   - Verify number formatting functions

### Debug Commands

```sql
-- Check recent exchange rates
SELECT * FROM exchange_rates WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

-- Verify invoice conversions
SELECT invoice_number, total_amount, currency_code, inr_total_amount 
FROM invoices WHERE currency_code != 'INR' ORDER BY created_at DESC LIMIT 10;

-- Test conversion accuracy
SELECT 
  currency_code,
  AVG(inr_total_amount / total_amount) as avg_rate,
  COUNT(*) as invoice_count
FROM invoices 
WHERE currency_code != 'INR' 
GROUP BY currency_code;
```

## Business Benefits

1. **Global Customer Support**: Accept payments in local currencies
2. **Accurate Analytics**: Unified INR reporting for business decisions
3. **Compliance**: Proper currency documentation for international transactions
4. **Professional Presentation**: Invoices in customer's preferred currency
5. **Automated Operations**: No manual exchange rate entry required

## Support

For technical issues or questions:
1. Check browser console for error messages
2. Verify database schema using provided SQL queries
3. Test exchange rate service in developer tools
4. Review invoice creation logs for currency detection

The system is designed to be resilient and will gracefully handle API failures, network issues, and currency conversion errors while maintaining accurate financial records.
