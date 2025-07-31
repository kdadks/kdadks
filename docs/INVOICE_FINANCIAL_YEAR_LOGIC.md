# Invoice Number Financial Year Reset Logic

## Overview

The invoice generation system has been configured to properly handle financial year-based invoice number resets, ensuring invoice numbers only reset at the start of the new financial year on April 1st (or your configured financial year start month).

## Key Features

### ✅ Financial Year Calculation
- **Default Start**: April 1st (Indian financial year standard)
- **Configurable**: Can be changed via `financial_year_start_month` setting
- **Format**: Financial year is stored as "YYYY-YY" (e.g., "2024-25", "2025-26")

### ✅ Smart Reset Logic
- **Condition**: Invoice numbers reset **ONLY** when `reset_annually` is enabled **AND** a new financial year is detected
- **Detection**: Compares stored `current_financial_year` with calculated current financial year
- **Reset Point**: Numbers reset to 1 at the start of the new financial year

### ✅ Financial Year Examples
```
Current Date: March 15, 2025 → Financial Year: 2024-25
Current Date: April 1, 2025  → Financial Year: 2025-26 (NEW FY - Reset to 1)
Current Date: April 15, 2025 → Financial Year: 2025-26
Current Date: March 31, 2026 → Financial Year: 2025-26
Current Date: April 1, 2026  → Financial Year: 2026-27 (NEW FY - Reset to 1)
```

## Implementation Details

### Database Settings
```sql
-- Invoice settings with financial year configuration
reset_annually: true                    -- Enable annual reset
financial_year_start_month: 4          -- April (1-12)
current_financial_year: "2024-25"      -- Tracks current FY
current_number: 15                      -- Next invoice number
```

### Code Logic (invoiceService.ts)

#### Financial Year Calculation
```typescript
private calculateFinancialYear(fyStartMonth: number = 4, currentDate: Date = new Date()): string {
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  if (currentMonth >= fyStartMonth) {
    // April-March: We're in second half (e.g., Apr 2024 = 2024-25)
    return `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
  } else {
    // Jan-March: We're in first half (e.g., Jan 2025 = 2024-25)
    return `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
  }
}
```

#### Reset Detection
```typescript
private isNewFinancialYear(currentFY: string | null, calculatedFY: string): boolean {
  return currentFY !== calculatedFY;
}
```

#### Invoice Number Generation
```typescript
// Check for financial year reset
if (settings.reset_annually && this.isNewFinancialYear(settings.current_financial_year, currentFinancialYear)) {
  nextSequentialNumber = 1; // Reset to 1
  console.log(`🔄 New financial year: ${settings.current_financial_year} → ${currentFinancialYear}`);
}
```

## Configuration Options

### UI Settings (Invoice Management → Settings)
- **Reset Annually**: Checkbox to enable/disable annual reset
- **Financial Year Start Month**: Dropdown to select start month (1-12)
- **Current Financial Year**: Display of current FY period

### Default Configuration
- **Start Month**: 4 (April) - Indian financial year standard
- **Reset Enabled**: true
- **Format**: "PREFIX/YYYY/MM/###" supports monthly invoice numbers with annual reset

## Testing Scenarios

### Scenario 1: Normal Operation (Same FY)
```
Date: July 15, 2024
Current FY in DB: "2024-25"
Calculated FY: "2024-25"
Result: No reset, continue sequence (e.g., INV/2024/07/015)
```

### Scenario 2: New Financial Year
```
Date: April 1, 2025
Current FY in DB: "2024-25"
Calculated FY: "2025-26"
Result: Reset to 1 (e.g., INV/2025/04/001)
DB Updated: current_financial_year = "2025-26", current_number = 2
```

### Scenario 3: Reset Disabled
```
Date: April 1, 2025
reset_annually: false
Result: No reset, continue sequence regardless of FY change
```

## Validation & Error Handling

### ✅ Safeguards Implemented
1. **Default Values**: FY start month defaults to 4 (April)
2. **Null Handling**: Handles missing current_financial_year in database
3. **Logging**: Comprehensive console logging for debugging
4. **Preview Mode**: Preview function shows what number would be generated without saving

### ✅ Database Updates
- `current_number`: Incremented after each invoice generation
- `current_financial_year`: Updated to track current period for future comparisons

## Backward Compatibility

The updated logic is backward compatible with existing data:
- **Existing Settings**: Will work with current database entries
- **Migration**: No special migration needed
- **Fallback**: Gracefully handles missing financial year data

## Usage Notes

1. **First Time Setup**: System will detect and set current financial year automatically
2. **Manual Override**: Financial year can be manually updated in settings if needed
3. **Testing**: Use preview function to test number generation without affecting sequence
4. **Monitoring**: Check console logs for financial year transitions and resets

---

**Last Updated**: January 31, 2025
**System**: KDADKS Invoice Management System
**Compliance**: Indian Financial Year Standards (April-March)
