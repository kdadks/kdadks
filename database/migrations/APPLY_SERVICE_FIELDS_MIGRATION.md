# Quote Items Service Fields Migration

## Issue
The quote management system now supports service-based items (consulting, training, etc.) but the database schema is missing the required columns.

**Error**: `Could not find the 'billable_hours' column of 'quote_items' in the schema cache`

## Solution
Run the migration script to add the missing columns to the `quote_items` table.

## How to Apply Migration

### Option 1: Supabase Dashboard (Recommended)
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `004_add_quote_items_service_fields.sql`
5. Click **Run** to execute the migration
6. Verify success message appears

### Option 2: Supabase CLI
```bash
supabase db push
```

### Option 3: Direct SQL
If you have direct database access:
```bash
psql -h your-db-host -U your-user -d your-database -f database/migrations/004_add_quote_items_service_fields.sql
```

## What This Migration Does

Adds three new columns to the `quote_items` table:

1. **billable_hours** (NUMERIC(10,2))
   - Total billable monthly hours for service items
   - Example: 160 hours/month for full-time consultant

2. **resource_count** (INTEGER)
   - Number of resources or personnel
   - Example: 5 developers on a project

3. **is_service_item** (BOOLEAN, default FALSE)
   - Flag to identify service-based items
   - Used to calculate: resource_count × duration × billable_hours × hourly_rate

## After Migration

1. **Restart your application** or refresh the schema cache
2. **Test quote editing** - try editing quote `QT/2026/01/003`
3. **Verify service items** - create a new quote with service-based billing

## Rollback (if needed)

If you need to rollback this migration:

```sql
ALTER TABLE quote_items DROP COLUMN IF EXISTS billable_hours;
ALTER TABLE quote_items DROP COLUMN IF EXISTS resource_count;
ALTER TABLE quote_items DROP COLUMN IF EXISTS is_service_item;
```

## Notes

- This migration is **backward compatible** - existing quotes will continue to work
- New columns are **optional** (nullable)
- Default value for `is_service_item` is `FALSE`
- No data loss will occur
