# Global HSN Code Implementation

## Overview
Implemented global HSN code functionality for IGST compliance in the invoice creation system. When a default product is selected from the top dropdown, its HSN code is automatically applied to all line items in the invoice.

## Features Implemented

### 1. Global HSN Code State Management
- Added `globalHsnCode` state variable to track the selected HSN code
- HSN code is automatically set when a default product is selected
- HSN code persists across all line items in the current invoice

### 2. Automatic HSN Code Application
- When a default product is selected, its HSN code is applied to all existing line items
- New line items automatically receive the global HSN code
- HSN code is consistent across all items in an invoice

### 3. User Interface Updates
- HSN code display shows the global HSN code for all line items
- Clear messaging indicates when HSN code is applied from the default product
- Fallback display for individual item HSN codes when no global code is set

### 4. State Reset Functionality
- Global HSN code is reset when creating a new invoice
- Ensures clean state for each new invoice creation session

## Technical Implementation

### Key Code Changes

1. **State Management**
   ```typescript
   const [globalHsnCode, setGlobalHsnCode] = useState<string>('');
   ```

2. **Product Selection Handler**
   ```typescript
   const handleDefaultProductChange = (value: string) => {
     const product = products.find(p => p.id === value);
     if (product) {
       setGlobalHsnCode(product.hsn_code || '');
       // Apply HSN code to all existing line items
       setInvoiceData(prev => ({
         ...prev,
         items: prev.items.map(item => ({
           ...item,
           hsn_code: product.hsn_code || ''
         }))
       }));
     }
   };
   ```

3. **New Item Addition**
   ```typescript
   const addInvoiceItem = () => {
     const newItem = {
       // ... other properties
       hsn_code: globalHsnCode
     };
     setInvoiceData(prev => ({
       ...prev,
       items: [...prev.items, newItem]
     }));
   };
   ```

4. **State Reset**
   ```typescript
   const openCreateInvoiceTab = () => {
     setGlobalHsnCode(''); // Reset global HSN code
     // ... other reset logic
   };
   ```

## User Workflow

1. **Select Default Product**: Choose a product from the top dropdown
2. **Automatic HSN Application**: HSN code is automatically applied to all line items
3. **Add Line Items**: New items automatically inherit the global HSN code
4. **Consistent IGST Compliance**: All items in the invoice have the same HSN code for proper tax calculation

## Benefits

- **Simplified UX**: Single point of HSN code selection
- **IGST Compliance**: Ensures consistent HSN codes across invoice items
- **Error Reduction**: Eliminates need to manually set HSN code for each line item
- **Efficiency**: Faster invoice creation with automatic HSN code propagation

## Notes

- HSN code is applied globally to maintain IGST compliance
- Individual line item HSN codes are overridden by the global setting
- Default product selection remains in the top section as requested
- System maintains backward compatibility for invoices without default products
