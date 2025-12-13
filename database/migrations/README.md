# Database Migration Guide

## Order of Execution

Run the migration files in this exact order:

### 1. Employee & HR System (Base Schema)
```sql
-- Run this FIRST
employee-hr-system-schema.sql
```

This creates:
- `employees` table with all personal and employment information
- `employment_documents` table for offer letters, certificates, etc.
- `salary_slips` table for monthly payroll
- `tds_records` table for tax calculations
- `hr_document_settings` table

### 2. Payroll, Leave & Attendance (Extended Schema)
```sql
-- Run this SECOND (after employee-hr-system-schema.sql)
payroll-leave-attendance-schema.sql
```

This creates:
- Leave management tables (`leave_types`, `employee_leave_balance`, `leave_applications`)
- Attendance tracking (`attendance_records`, `holidays`)
- Timesheet management (`projects`, `timesheet_entries`)
- Payroll components (`payroll_settings`, `bonus_records`, `gratuity_records`)
- Extends `salary_slips` with PF, ESI, EPS, LWF columns

## Migration Commands

### Using Supabase Dashboard:
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy and paste the content of `employee-hr-system-schema.sql`
4. Click "Run"
5. Wait for completion
6. Copy and paste the content of `payroll-leave-attendance-schema.sql`
7. Click "Run"

### Using Supabase CLI:
```bash
# Run employee schema
supabase db reset
supabase migration create employee_hr_system
# Copy content of employee-hr-system-schema.sql to the migration file
supabase db push

# Run payroll schema
supabase migration create payroll_leave_attendance
# Copy content of payroll-leave-attendance-schema.sql to the migration file
supabase db push
```

## Verification

After running both migrations, verify with:

```sql
-- Check if all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Expected tables:
-- employees
-- employment_documents
-- salary_slips
-- tds_records
-- hr_document_settings
-- leave_types
-- employee_leave_balance
-- leave_applications
-- attendance_records
-- holidays
-- projects
-- timesheet_entries
-- payroll_settings
-- bonus_records
-- gratuity_records
```

## Rollback

If you need to rollback:

```sql
-- Drop payroll tables first
DROP TABLE IF EXISTS gratuity_records CASCADE;
DROP TABLE IF EXISTS bonus_records CASCADE;
DROP TABLE IF EXISTS payroll_settings CASCADE;
DROP TABLE IF EXISTS timesheet_entries CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS holidays CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS leave_applications CASCADE;
DROP TABLE IF EXISTS employee_leave_balance CASCADE;
DROP TABLE IF EXISTS leave_types CASCADE;

-- Then drop employee tables
DROP TABLE IF EXISTS salary_slips CASCADE;
DROP TABLE IF EXISTS tds_records CASCADE;
DROP TABLE IF EXISTS employment_documents CASCADE;
DROP TABLE IF EXISTS hr_document_settings CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
```

## Sample Data

After migrations, the system will have:
- Default leave types (CL, SL, PL, ML, PT, CO, LOP)
- Default payroll settings for FY 2024-25
- Default HR document settings

You can now start adding employees and managing payroll!
