# Invoice Number Pattern Implementation

## 🎯 Overview

The invoice management system now supports the standardized invoice number pattern: **`INV/2025/07/001`**

## 📋 Pattern Format

### Structure: `INV/YYYY/MM/###`

- **INV** - Fixed prefix (customizable via invoice_prefix setting)
- **YYYY** - 4-digit year (2025)
- **MM** - 2-digit month with leading zero (07 for July)
- **###** - 3-digit sequential number with leading zeros (001, 002, etc.)

### Examples:
- `INV/2025/07/001` - First invoice in July 2025
- `INV/2025/07/002` - Second invoice in July 2025
- `INV/2025/12/001` - First invoice in December 2025

## ⚙️ Implementation Details

### 1. Format Options Available

In the Invoice Settings, users can choose from:

- **`INV/YYYY/MM/###`** - **NEW RECOMMENDED** format (INV/2025/07/001)
- `YYYY-MM-####` - Legacy format (2024-01-0001)
- `####` - Simple sequential (0001)
- `YYYY####` - Year + sequential (20240001)
- `MM-####` - Month + sequential (01-0001)

### 2. Backend Logic

The `generateInvoiceNumber()` function in `invoiceService.ts` now supports:

- **YYYY** replacement with current year
- **MM** replacement with current month (zero-padded)
- **###** replacement with 3-digit sequential number
- **####** replacement with 4-digit sequential number (legacy)

### 3. Pattern Processing

```typescript
// Example processing for "INV/YYYY/MM/###"
let invoiceNumber = "INV/YYYY/MM/###";
invoiceNumber = invoiceNumber.replace(/YYYY/g, "2025");
invoiceNumber = invoiceNumber.replace(/MM/g, "07");
invoiceNumber = invoiceNumber.replace(/###/g, "001");
// Result: "INV/2025/07/001"
```

## 🔧 Configuration

### Default Settings

New invoice settings default to:
- **Prefix**: INV
- **Format**: INV/YYYY/MM/###
- **Starting Number**: 1
- **Reset Annually**: true

### Setting Up the New Pattern

1. Go to **Admin Portal** → **Invoice Management** → **Settings Tab**
2. Select **Invoice Settings**
3. Choose **Number Format**: `INV/YYYY/MM/###`
4. Set **Invoice Prefix** as needed (default: INV)
5. Save settings

### Preview Feature

The settings form now includes a **real-time preview** showing:
- Current format selection
- How the next invoice number will appear
- Based on current date and next sequential number

## 📊 Benefits

### 1. Chronological Organization
- Invoices are naturally sorted by year and month
- Easy to identify invoice creation timeframe

### 2. Professional Appearance
- Clean, standardized format
- Industry-standard naming convention

### 3. Scalability
- Supports up to 999 invoices per month
- Resets numbering monthly for better organization

### 4. Searchability
- Easy to filter invoices by year or month
- Pattern-based searching in database

### 5. Financial Year Management
- Automatic sequential number reset at financial year boundaries
- Configurable financial year start month (default: April)
- Seamless transition between financial years

## 💰 Financial Year Reset Feature

The system includes intelligent financial year management for invoice numbering:

### Automatic Reset Functionality
- **Reset Trigger**: Sequential numbers automatically reset to 001 at the start of each financial year
- **Financial Year Calculation**: Based on the Financial Year Start Month setting (default: April)
- **Automatic Detection**: The system compares the current financial year with the stored financial year
- **Seamless Operation**: Resets happen automatically without user intervention
- **Audit Trail**: All reset events are logged for compliance and tracking

### Financial Year Examples
If Financial Year Start Month = April (4):
- **Financial Year 2024-25**: April 1, 2024 to March 31, 2025
- **Financial Year 2025-26**: April 1, 2025 to March 31, 2026
- **Reset Date**: Invoice numbers reset on April 1st each year

### Reset Process Flow
1. **Detection**: When generating an invoice, system checks current financial year vs. stored financial year
2. **Reset**: If financial years differ, sequential number resets to 1
3. **Update**: Database updates both `current_number` and `current_financial_year` fields
4. **Logging**: Reset event is logged with timestamp and details
5. **Continue**: Invoice generation proceeds with new sequential number

### Example Reset Scenario
```
Date: March 31, 2025 → Last invoice: INV/2025/03/156
Date: April 1, 2025 → First invoice: INV/2025/04/001 (Reset!)
```

## 🔄 Migration

### For Existing Systems

If you have existing invoices with different patterns:

1. **New invoices** will use the new pattern immediately
2. **Existing invoices** retain their original numbers
3. **Sequential numbering** continues from current position
4. **No data loss** - all historical invoices preserved

### Backward Compatibility

- All existing number formats remain supported
- Legacy patterns continue to work
- System supports mixed numbering schemes

## 🛠️ Technical Implementation

### Database Schema

No database changes required - the pattern is processed at the application level:

```sql
-- invoice_settings table structure (unchanged)
- invoice_prefix: TEXT (default: 'INV')
- number_format: TEXT (default: 'INV/YYYY/MM/###')
- current_number: INTEGER
- reset_annually: BOOLEAN
```

### Code Changes

1. **Updated `generateInvoiceNumber()` function**:
   - Added MM (month) replacement
   - Added ### (3-digit) pattern support
   - Improved regex matching

2. **Enhanced UI**:
   - New format option in dropdown
   - Real-time preview of next invoice number
   - Better format descriptions

3. **Default Settings**:
   - Changed default format to new pattern
   - Updated form initialization

## 🧪 Testing

### Test Cases

1. **Format Selection**: Verify all format options work correctly
2. **Month Padding**: Ensure single-digit months show as 01, 02, etc.
3. **Number Padding**: Confirm 3-digit padding (001, 002, etc.)
4. **Year Rollover**: Test behavior at year boundaries
5. **Sequential Increment**: Verify proper number progression

### Sample Test Results

```
Format: INV/YYYY/MM/###
Month: July (07)
Year: 2025
Next Number: 1

Generated: INV/2025/07/001 ✓
```

## 📝 Notes

- The new format is set as **default** for new installations
- Existing installations can **opt-in** to the new format
- The pattern is **customizable** - users can modify the prefix as needed
- **Real-time preview** helps users understand the format before saving

## 🔍 Troubleshooting

### Common Issues

1. **Format not updating**: Clear browser cache and reload
2. **Preview not showing**: Check that current_number is set in settings
3. **Wrong date**: Verify system date/time is correct

### Support

For technical issues or questions about invoice numbering:
1. Check the admin panel preview
2. Verify invoice settings are saved
3. Test with a sample invoice generation
