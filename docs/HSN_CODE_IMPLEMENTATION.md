# HSN Code Display Implementation

## Overview

Added HSN (Harmonized System of Nomenclature) code display to both the create invoice form and invoice preview form as requested. The HSN code field is implemented as a read-only field to maintain data integrity.

## Changes Made

### 1. Create Invoice Form (Line Items Section)
- **Location**: `InvoiceManagement.tsx` - Line items card section
- **Implementation**: 
  - Moved description field to a grid layout with HSN code field
  - Added read-only HSN code input field next to the description
  - HSN code automatically populated from selected product
  - Added validation message when product has no HSN code

**Features**:
- **Read-only field**: Users cannot manually edit HSN code
- **Auto-population**: HSN code is automatically filled when a product is selected
- **Visual feedback**: Shows warning message if selected product has no HSN code
- **Responsive layout**: Grid layout adjusts for mobile and desktop views

### 2. Invoice Preview Form (Items Table)
- **Location**: `InvoiceManagement.tsx` - Invoice preview table in `renderInvoicePreviewContent()`
- **Implementation**:
  - Added HSN Code column to the table header
  - Added HSN code data column in table body
  - Displays "N/A" when HSN code is not available

**Features**:
- **Table structure**: New column between Description and Quantity
- **Compact display**: Optimized width for invoice preview
- **Fallback text**: Shows "N/A" for items without HSN codes
- **Consistent styling**: Matches existing table design

## Technical Implementation

### Form Field Structure
```tsx
{/* HSN Code - Read Only */}
<div>
  <label className="block text-sm font-medium text-slate-700 mb-1">
    HSN Code
  </label>
  <input
    type="text"
    value={selectedProduct ? selectedProduct.hsn_code || '' : item.hsn_code || ''}
    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-gray-50 text-gray-600 text-sm"
    placeholder="HSN Code"
    readOnly
  />
  {selectedProduct && !selectedProduct.hsn_code && (
    <p className="text-xs text-amber-600 mt-1">No HSN code set for this product</p>
  )}
</div>
```

### Preview Table Structure
```tsx
<th className="border border-gray-300 px-2 py-2 text-center font-medium text-gray-900 w-20">HSN Code</th>
...
<td className="border border-gray-300 px-2 py-2 text-center text-gray-600">
  {item.hsn_code || 'N/A'}
</td>
```

## Data Flow

1. **Product Selection**: When user selects a product, HSN code is automatically populated from `product.hsn_code`
2. **Manual Entry**: HSN code from manually entered items comes from `item.hsn_code`
3. **Display Logic**: Shows product HSN code if available, otherwise shows item HSN code
4. **Preview**: HSN codes are displayed in the invoice preview table for all items

## Benefits

- **Compliance**: Ensures HSN codes are visible for IGST compliance in India
- **Data Integrity**: Read-only field prevents accidental modification
- **User Experience**: Automatic population reduces manual data entry
- **Professional Look**: HSN codes are clearly displayed in invoice previews
- **Validation**: Users are notified when products lack HSN codes

## IGST Compliance Features

- **Mandatory Display**: HSN codes are now visible on invoice forms and previews
- **Accurate Tracking**: Links to product master data for consistency
- **Tax Documentation**: Supports proper IGST filing and compliance
- **Audit Trail**: HSN codes are preserved in invoice records

## Future Enhancements

- Add HSN code validation format checking
- Implement HSN code lookup/search functionality
- Add bulk HSN code assignment for products
- Include HSN code in PDF exports and email templates

---

**Implementation Date**: January 31, 2025
**System**: KDADKS Invoice Management System
**Compliance**: Indian IGST Requirements
