# Apply Employee Fields Migration

This migration adds missing employee fields to the database to support the enhanced employee edit form.

## What This Migration Does

Adds the following columns to the `employees` table if they don't already exist:
- `fathers_name` - Employee's father's name
- `date_of_birth` - Date of birth
- `gender` - Gender (male/female/other)
- `address_line1` - Address line 1
- `address_line2` - Address line 2
- `city` - City
- `state` - State
- `postal_code` - Postal/ZIP code
- `country` - Country (defaults to India)
- `aadhar_number` - Aadhar number
- `bank_ifsc_code` - Bank IFSC code

## How to Apply

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `006_add_missing_employee_fields.sql`
4. Paste into the SQL Editor
5. Click "Run"

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# From the project root directory
supabase db reset
# or apply specific migration
psql -h your-db-host -U your-db-user -d your-db-name -f database/migrations/006_add_missing_employee_fields.sql
```

### Option 3: Using psql directly

```bash
psql "postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]" -f database/migrations/006_add_missing_employee_fields.sql
```

## Verification

After running the migration, you should see a notice message indicating that all required employee columns are present in the database.

## What Changed in the Application

The employee edit form now includes all fields that were available during employee creation:
- Personal information (father's name, DOB, gender, phone)
- Complete address details
- Aadhar number
- Complete bank details with IFSC code

This ensures parity between the create and edit employee forms.
