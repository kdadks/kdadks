# Quote System Data Integrity Fixes

## Two-Step Migration Required

### Step 1: Add Service Fields to quote_items
**File**: `004_add_quote_items_service_fields.sql`

This migration adds support for service-based quotations (consulting, training, etc.).

**Required columns:**
- `billable_hours` - Monthly billable hours
- `resource_count` - Number of personnel
- `is_service_item` - Service item flag

### Step 2: Fix Orphaned Quote Totals
**File**: `005_fix_orphaned_quote_totals.sql`

This migration fixes data integrity issues where quotes show amounts but have no items.

**What it fixes:**
- Quotes with totals but no line items → Resets totals to zero
- Quotes with incorrect totals → Recalculates from items

## How to Apply

### Using Supabase Dashboard (Recommended)

1. **Open SQL Editor** in your Supabase project
2. **Run Migration 004** first:
   - Copy contents of `004_add_quote_items_service_fields.sql`
   - Paste and click **Run**
   - Wait for success message

3. **Run Migration 005** second:
   - Copy contents of `005_fix_orphaned_quote_totals.sql`
   - Paste and click **Run**
   - Check the notices to see how many quotes were fixed

## Example: Quote QT/2026/01/003

This quote currently shows:
- **Subtotal**: €4,054.50
- **Total**: €3,162.51
- **Items**: 0 ❌

After migration 005:
- **Subtotal**: €0.00
- **Total**: €0.00
- **Items**: 0 ✅

The quote totals will be reset to zero until you add items and save.

## Code Changes Implemented

### Data Integrity Enforcement
The `updateQuote` function now:
1. **WITH items**: Updates/inserts/deletes items, then recalculates totals
2. **WITHOUT items**: 
   - If items exist in DB → Recalculates totals from DB
   - If no items exist → Resets totals to zero

This prevents orphaned totals from ever happening again.

## Verification

After running both migrations, verify:

```sql
-- Check for quotes with totals but no items (should be 0)
SELECT 
    q.quote_number,
    q.subtotal,
    q.total_amount,
    COUNT(qi.id) as item_count
FROM quotes q
LEFT JOIN quote_items qi ON q.id = qi.quote_id
GROUP BY q.id, q.quote_number, q.subtotal, q.total_amount
HAVING COUNT(qi.id) = 0 AND (q.subtotal <> 0 OR q.total_amount <> 0);
```

Result should be empty.

## Benefits

✅ **Data integrity** - Totals always match actual items
✅ **Service support** - Consulting/training quotations work
✅ **Fixed existing data** - Orphaned totals cleaned up
✅ **Prevention** - Code prevents future issues
