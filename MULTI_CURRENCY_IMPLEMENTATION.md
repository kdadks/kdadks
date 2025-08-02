# Multi-Currency Invoice Management System

## Overview

This document explains the comprehensive multi-currency support implementation for the KDADKS Invoice Management System. The system now automatically converts foreign currencies to Indian Rupees (INR) using real-time exchange rates for accurate financial reporting.

## Features Implemented

### 1. **Automatic Currency Detection**
- Invoices automatically use the customer's country currency
- Fallback to INR if customer country is not specified
- Support for 10+ major international currencies

### 2. **Real-time Exchange Rate Integration**
- Fetches current exchange rates from reliable APIs
- Daily automatic updates with fallback mechanisms
- Historical rate storage for accurate conversion on invoice dates

### 3. **Multi-Currency Storage**
- Original currency amounts preserved for display and PDF generation
- INR converted amounts stored for accurate dashboard calculations
- Exchange rates and conversion dates tracked for audit purposes

### 4. **Dashboard INR Totals**
- All dashboard statistics now show amounts in INR
- Accurate revenue, pending amounts, and financial metrics
- Multi-currency breakdown available for detailed analysis

## Database Schema Changes

### New Tables

#### `exchange_rates`
```sql
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY,
    base_currency VARCHAR(3) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(15,6) NOT NULL,
    date DATE NOT NULL,
    source VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(base_currency, target_currency, date)
);
```

### Enhanced Tables

#### `invoices` - New Columns
- `original_currency_code` - Customer's currency
- `original_subtotal` - Amount in customer's currency
- `original_tax_amount` - Tax in customer's currency  
- `original_total_amount` - Total in customer's currency
- `exchange_rate` - Rate used for conversion
- `exchange_rate_date` - Date of conversion
- `inr_subtotal` - Amount converted to INR
- `inr_tax_amount` - Tax converted to INR
- `inr_total_amount` - Total converted to INR

#### `invoice_items` - New Columns
- `original_unit_price` - Price in customer's currency
- `original_line_total` - Line total in customer's currency
- `original_tax_amount` - Tax in customer's currency
- `inr_unit_price` - Price converted to INR
- `inr_line_total` - Line total converted to INR
- `inr_tax_amount` - Tax converted to INR

#### `payments` - New Columns
- `original_currency_code` - Payment currency
- `original_amount` - Payment in original currency
- `exchange_rate` - Rate used for conversion
- `exchange_rate_date` - Date of conversion
- `inr_amount` - Payment converted to INR

## Technical Implementation

### 1. **Exchange Rate Service**
```typescript
// Location: src/services/exchangeRateService.ts
class ExchangeRateService {
  async fetchCurrentRates(baseCurrency: string): Promise<ExchangeRateApiResponse>
  async updateExchangeRates(forceUpdate: boolean): Promise<boolean>
  async getExchangeRate(fromCurrency: string, toCurrency: string, date?: string): Promise<number | null>
  async convertToINR(amount: number, fromCurrency: string, date?: string): Promise<number>
}
```

### 2. **Enhanced Invoice Service**
```typescript
// Enhanced createInvoice method with automatic currency conversion
async createInvoice(invoiceData: CreateInvoiceData): Promise<Invoice> {
  // 1. Detect customer currency
  // 2. Calculate totals in original currency
  // 3. Get exchange rate for invoice date
  // 4. Convert amounts to INR
  // 5. Store both original and converted amounts
}
```

### 3. **Multi-Currency Dashboard Stats**
```sql
-- New view for accurate INR calculations
CREATE VIEW invoice_stats_multicurrency AS
SELECT 
    COUNT(*) as total_invoices,
    SUM(inr_total_amount) FILTER (WHERE payment_status = 'paid') as total_revenue_inr,
    SUM(inr_total_amount) FILTER (WHERE payment_status != 'paid' AND status != 'cancelled') as pending_amount_inr,
    -- ... other metrics
FROM invoices;
```

## Setup Instructions

### 1. **Database Migration**
Run the SQL script to add multi-currency support:
```bash
# Copy and run the content of src/database/multi-currency-schema.sql in Supabase SQL Editor
```

### 2. **Exchange Rate API Setup**
The system uses multiple APIs with fallback:
- Primary: exchangerate-api.com (free tier)
- Fallback: fxratesapi.com
- No API keys required for basic usage

### 3. **Initialization**
Exchange rates are automatically initialized on app startup:
```typescript
// In src/main.tsx
import { exchangeRateService } from './services/exchangeRateService'
exchangeRateService.initialize().catch(console.warn);
```

## Usage Guide

### 1. **Creating Invoices**
```typescript
// No code changes needed - automatic currency detection
const invoiceData = {
  customer_id: 'customer-uuid',
  invoice_date: '2024-01-15',
  items: [/* items */]
};

// System automatically:
// 1. Detects customer's country currency
// 2. Calculates totals in that currency
// 3. Gets exchange rate for invoice date
// 4. Converts and stores INR amounts
const invoice = await invoiceService.createInvoice(invoiceData);
```

### 2. **Dashboard Display**
```typescript
// Dashboard now shows INR totals automatically
const stats = await invoiceService.getInvoiceStats();
console.log(stats.total_revenue); // Amount in INR
console.log(stats.pending_amount); // Amount in INR
console.log(stats.currency_breakdown); // Breakdown by currency
```

### 3. **Currency Display Component**
```tsx
import { CurrencyDisplay } from '../components/ui/CurrencyDisplay';

// Show original currency with INR conversion
<CurrencyDisplay 
  amount={invoice.original_total_amount}
  currencyCode={invoice.original_currency_code}
  inrAmount={invoice.inr_total_amount}
  showBothCurrencies={true}
/>
// Displays: $1,250.00 (~₹1,04,375.00)
```

## Supported Currencies

| Currency | Code | Symbol | Notes |
|----------|------|--------|-------|
| US Dollar | USD | $ | Most common |
| Euro | EUR | € | European Union |
| British Pound | GBP | £ | United Kingdom |
| Australian Dollar | AUD | A$ | Australia |
| Canadian Dollar | CAD | C$ | Canada |
| Singapore Dollar | SGD | S$ | Singapore |
| UAE Dirham | AED | AED | UAE |
| Saudi Riyal | SAR | SAR | Saudi Arabia |
| Japanese Yen | JPY | ¥ | Japan |
| Chinese Yuan | CNY | ¥ | China |
| Indian Rupee | INR | ₹ | Default/Base |

## Migration Notes

### For Existing Data
- All existing invoices are automatically migrated
- Original amounts copied to new multi-currency fields
- INR amounts calculated using historical rates where available
- No data loss during migration

### Backward Compatibility
- All existing APIs continue to work
- Legacy `total_amount` field still populated
- Dashboard calculations enhanced, not replaced
- PDF generation works with both original and INR amounts

## Maintenance

### 1. **Exchange Rate Updates**
```typescript
// Manual update (if needed)
await invoiceService.updateExchangeRates(true); // force update

// Check available currencies
const currencies = await invoiceService.getAvailableCurrencies();
```

### 2. **Monitoring**
- Exchange rates update automatically daily
- Failed updates are logged with fallback mechanisms
- API failures don't prevent invoice creation

### 3. **Database Functions**
```sql
-- Get exchange rate
SELECT get_exchange_rate('USD', 'INR', '2024-01-15');

-- Convert amount
SELECT convert_to_inr(1000, 'USD', '2024-01-15');
```

## Error Handling

### 1. **Exchange Rate API Failures**
- System tries multiple APIs
- Falls back to 1:1 conversion if all fail
- Logs warnings but doesn't break invoice creation

### 2. **Missing Exchange Rates**
- Uses most recent available rate
- Tries reverse rate calculation
- Falls back to cross-currency conversion via INR

### 3. **Currency Detection**
- Defaults to INR if customer country not set
- Handles missing or invalid currency codes gracefully

## Performance Considerations

### 1. **Database Optimization**
- Indexes on currency and date fields
- Materialized view for dashboard stats
- Efficient query patterns for multi-currency data

### 2. **API Rate Limits**
- Uses free tier APIs with reasonable limits
- Caches exchange rates daily
- Batch updates for efficiency

### 3. **Frontend Performance**
- Currency conversion done on invoice creation
- Dashboard uses pre-calculated INR amounts
- No real-time API calls in UI

## Future Enhancements

### 1. **Planned Features**
- Admin panel for exchange rate management
- Custom exchange rate overrides
- Multi-currency payment tracking
- Advanced currency analytics

### 2. **Potential Integrations**
- Bank API integration for real-time rates
- Cryptocurrency support
- Regional currency preferences
- Automated rate alerts

## Support and Troubleshooting

### Common Issues

1. **Missing Exchange Rates**
   - Check API connectivity
   - Run manual rate update
   - Verify database functions

2. **Incorrect Conversions**
   - Check exchange rate date alignment
   - Verify API data accuracy
   - Review conversion logic

3. **Dashboard Discrepancies**
   - Refresh multi-currency view
   - Check migration completeness
   - Verify INR calculations

### Debug Commands
```sql
-- Check exchange rates
SELECT * FROM exchange_rates WHERE date = CURRENT_DATE;

-- Verify conversions
SELECT 
    invoice_number,
    original_currency_code,
    original_total_amount,
    exchange_rate,
    inr_total_amount
FROM invoices 
WHERE original_currency_code != 'INR'
ORDER BY created_at DESC
LIMIT 10;

-- Check view status
SELECT * FROM invoice_stats_multicurrency;
```

This multi-currency system provides accurate financial reporting while maintaining the flexibility to work with international customers in their preferred currencies.
