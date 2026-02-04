# RLS Fix Execution Guide

## Overview
This guide walks you through executing all Row Level Security (RLS) fix migrations in the correct order to restore data visibility across the KDADKS HR system.

## Problem Summary
All data visibility issues (holidays not updating, attendance not showing, leave balances empty, document upload failures) are caused by overly restrictive RLS policies that block authenticated users from accessing existing data.

## Prerequisites
- Supabase account access
- Admin access to the KDADKS project in Supabase dashboard
- SQL Editor access in Supabase

## Migration Execution Order

Execute these migrations in the **exact order listed** to avoid dependency issues:

### Step 1: Fix Storage Bucket Policies
**File:** `database/migrations/2026-02-04_fix_storage_bucket_policies.sql`

**Purpose:** Enables document uploads to storage buckets

**How to execute:**
1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of the file
3. Paste into SQL Editor
4. Click "Run"
5. Verify: Should see "Success. No rows returned"

**What this fixes:**
- ✅ "Bucket not found" errors
- ✅ Employee document uploads
- ✅ Contract attachment uploads
- ✅ Invoice PDF storage

---

### Step 2: Fix Company Holidays RLS
**File:** `database/migrations/2026-02-04_fix_company_holidays_rls.sql`

**Purpose:** Allows authenticated users to manage company holidays

**How to execute:**
1. In SQL Editor, copy/paste the migration
2. Click "Run"
3. Verify: Check that policies are created successfully

**What this fixes:**
- ✅ Holiday calendar edit functionality
- ✅ Adding new company holidays
- ✅ Deleting holidays

---

### Step 3: Fix Attendance Records RLS
**File:** `database/migrations/2026-02-04_fix_attendance_records_rls.sql`

**Purpose:** Enables visibility of attendance records

**How to execute:**
1. Copy/paste migration into SQL Editor
2. Click "Run"
3. Verify success message

**What this fixes:**
- ✅ Attendance records display (currently showing 0 despite 8 records existing)
- ✅ Monthly attendance summaries
- ✅ Admin attendance management

---

### Step 4: Fix Employee Documents RLS
**File:** `database/migrations/2026-02-04_fix_employee_documents_rls.sql`

**Purpose:** Allows employees and admins to manage uploaded documents

**How to execute:**
1. Copy/paste into SQL Editor
2. Run the migration
3. Confirm policies created

**What this fixes:**
- ✅ Employee document uploads (Aadhar, PAN, certificates)
- ✅ Admin viewing of employee documents
- ✅ Document verification workflow

---

### Step 5: Create Unified Documents View
**File:** `database/migrations/2026-02-04_create_unified_documents_view.sql`

**Purpose:** Creates single queryable interface combining employee uploads and admin-generated documents

**How to execute:**
1. Copy/paste the entire migration
2. Run in SQL Editor
3. Verify view created: `SELECT * FROM employee_documents_unified LIMIT 5;`

**What this provides:**
- ✅ Unified document listing in admin panel
- ✅ Single query for all employee documents
- ✅ Simplified application code

---

## Verification Steps

### After Each Migration:
1. Check for "Success" message in SQL Editor
2. Look for any error messages (red text)
3. If errors occur, note the error and DO NOT continue to next migration

### After All Migrations:
Run these verification queries in SQL Editor:

```sql
-- Test 1: Check company holidays are visible
SELECT COUNT(*) as holiday_count FROM company_holidays;
-- Expected: 9 records

-- Test 2: Check attendance records are visible  
SELECT COUNT(*) as attendance_count FROM attendance_records;
-- Expected: 8 records

-- Test 3: Check leave balances are visible
SELECT COUNT(*) as balance_count FROM employee_leave_balance;
-- Expected: 21 records

-- Test 4: Check unified documents view
SELECT document_source, COUNT(*) 
FROM employee_documents_unified 
GROUP BY document_source;
-- Expected: Shows counts for 'employee_upload' and 'admin_generated'

-- Test 5: Verify storage bucket policies
SELECT * FROM storage.buckets WHERE name = 'employee-documents';
-- Expected: 1 row showing the bucket exists
```

## Expected Results

### Before Migrations:
- Frontend queries return 0 records
- Edit operations fail silently
- Document uploads show "Bucket not found"
- Leave balances empty despite data existing

### After Migrations:
- All tables show correct record counts
- Edit operations succeed
- Document uploads work
- Leave balances display correctly
- Unified document view combines both sources

## Troubleshooting

### Error: "permission denied for table X"
**Solution:** You're not logged in with sufficient privileges. Use service_role key in SQL Editor settings.

### Error: "relation X does not exist"
**Solution:** Wrong migration order. Go back and execute storage bucket migration first.

### Error: "view employee_documents_unified already exists"
**Solution:** View was already created. Drop it first: `DROP VIEW IF EXISTS employee_documents_unified CASCADE;`

### No errors but data still not visible
**Solution:**
1. Check frontend is using `VITE_SUPABASE_ANON_KEY` (not service role)
2. Verify user is authenticated (check `supabase.auth.getUser()`)
3. Run diagnostic script: `node scripts/list-database-tables.mjs`

## Post-Migration Testing

### Test 1: Holiday Calendar Edit
1. Log into admin dashboard
2. Navigate to HR → Attendance Management
3. Click "Manage Holidays" tab
4. Try editing an existing holiday
5. Verify changes save successfully

### Test 2: Attendance Records Display
1. In Attendance Management
2. Click "Monthly Summaries" tab
3. Verify attendance records show (should see 8 records)

### Test 3: Leave Balance Display
1. Log in as employee at `/employee/login`
2. Navigate to "My Leaves" section
3. Verify leave balance shows correctly (21 records total across all employees)

### Test 4: Document Upload
1. As employee, upload a test document (e.g., fake Aadhar card PDF)
2. Verify upload succeeds
3. As admin, navigate to employee's profile
4. Verify uploaded document appears in list

### Test 5: Unified Documents View
1. Admin dashboard → Employee profile
2. Check "Documents" section
3. Verify both employee uploads AND admin-generated docs appear in same list
4. Check for `document_source` indicator (employee_upload vs admin_generated)

## Rollback Plan

If migrations cause issues, rollback in **reverse order**:

```sql
-- Rollback Step 5
DROP VIEW IF EXISTS employee_documents_unified CASCADE;

-- Rollback Step 4
DROP POLICY IF EXISTS "Authenticated users can insert employee documents" ON employee_documents;
DROP POLICY IF EXISTS "Authenticated users can update employee documents" ON employee_documents;
DROP POLICY IF EXISTS "Authenticated users can delete employee documents" ON employee_documents;

-- Rollback Step 3
DROP POLICY IF EXISTS "Authenticated users can manage attendance records" ON attendance_records;

-- Rollback Step 2
DROP POLICY IF EXISTS "Authenticated users can insert company holidays" ON company_holidays;
DROP POLICY IF EXISTS "Authenticated users can update company holidays" ON company_holidays;
DROP POLICY IF EXISTS "Authenticated users can delete company holidays" ON company_holidays;

-- Rollback Step 1
-- (Storage policies cannot be easily rolled back - leave in place)
```

## Support

If you encounter issues:
1. Check error messages carefully
2. Verify migration file contents match exactly
3. Confirm you're executing in correct order
4. Check Supabase logs (Supabase Dashboard → Logs)
5. Run diagnostic script to verify table/record counts

## Summary

**Total migrations:** 5 files  
**Estimated execution time:** 5-10 minutes  
**Risk level:** Low (only modifying policies, not data)  
**Rollback available:** Yes (see Rollback Plan)

**Critical Success Factors:**
- Execute in exact order listed
- Verify each step before continuing
- Run verification queries after completion
- Test all affected features in frontend

Once complete, all data visibility issues will be resolved and the system will be fully functional for authenticated users.
