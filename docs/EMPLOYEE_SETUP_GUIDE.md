## Employee Management System - Supabase Setup Guide

This guide walks you through setting up the Employee Management System in your Supabase project.

### Prerequisites

1. **Supabase Project**: Active project with PostgreSQL database
2. **Environment Variables**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configured
3. **Admin Access**: Supabase dashboard access to run SQL queries
4. **Authentication**: Users created in Supabase Auth for employees

---

## Step 1: Create Database Schema

### 1.1 Run Main Schema File

1. Go to **Supabase Dashboard** → Your Project → **SQL Editor**
2. Click **New Query**
3. Copy entire content from `src/database/employee-schema.sql`
4. Paste into the SQL editor
5. Click **Run**

**Expected Output:**
- 11 tables created successfully
- No errors about missing tables or circular references
- All indexes created

### 1.2 Verify Table Creation

Run this query to verify all tables exist:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'employee%' OR tablename = 'leaves' OR tablename = 'leave_types' OR tablename = 'company_holidays' OR tablename = 'attendance';
```

Expected tables:
- ✅ `employees`
- ✅ `leave_types`
- ✅ `leaves`
- ✅ `attendance`
- ✅ `leave_allocations`
- ✅ `company_holidays`
- ✅ `employee_documents`
- ✅ `salary_slips`
- ✅ `salary_structures`
- ✅ `attendance_reminders`
- ✅ `leave_reminders`
- ✅ `employee_audit_logs`

---

## Step 2: Seed Initial Data

### 2.1 Run Seed Data

1. In SQL Editor, create **New Query**
2. Copy content from `src/database/employee-seed.sql`
3. Paste into SQL editor
4. Click **Run**

This will insert:
- ✅ 7 leave types (Annual, Sick, Casual, Maternity, Paternity, Earned, Leave Without Pay)
- ✅ 12 company holidays (India 2026 calendar)

### 2.2 Verify Seed Data

Run these queries:

```sql
-- Verify leave types
SELECT * FROM leave_types;

-- Should return 7 rows with leave types
```

```sql
-- Verify holidays
SELECT * FROM company_holidays ORDER BY holiday_date;

-- Should return 12 rows with holidays
```

---

## Step 3: Configure Row Level Security (RLS)

### 3.1 Enable RLS on All Tables

Run in SQL Editor:

```sql
-- Enable RLS on all employee management tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_audit_logs ENABLE ROW LEVEL SECURITY;
```

### 3.2 Create RLS Policies

Run this complete RLS policy setup:

```sql
-- ============================================
-- RLS POLICIES FOR EMPLOYEES TABLE
-- ============================================

-- Employees can view their own profile
CREATE POLICY "Employees can view own profile" ON employees
  FOR SELECT USING (auth.uid() = user_id);

-- Employees can update their own profile
CREATE POLICY "Employees can update own profile" ON employees
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all employees
CREATE POLICY "Admins can view all employees" ON employees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.designation ILIKE '%admin%'
    )
  );

-- Admins can update all employees
CREATE POLICY "Admins can update all employees" ON employees
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM employees admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.designation ILIKE '%admin%'
    )
  );

-- ============================================
-- RLS POLICIES FOR LEAVE TYPES TABLE
-- ============================================

-- Everyone can view leave types
CREATE POLICY "Everyone can view leave types" ON leave_types
  FOR SELECT USING (true);

-- ============================================
-- RLS POLICIES FOR LEAVES TABLE
-- ============================================

-- Employees can view their own leaves
CREATE POLICY "Employees can view own leaves" ON leaves
  FOR SELECT USING (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Employees can create leave requests for themselves
CREATE POLICY "Employees can request leaves" ON leaves
  FOR INSERT WITH CHECK (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Admins can view all leaves
CREATE POLICY "Admins can view all leaves" ON leaves
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.designation ILIKE '%admin%'
    )
  );

-- Admins can approve/reject leaves
CREATE POLICY "Admins can approve leaves" ON leaves
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM employees admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.designation ILIKE '%admin%'
    )
  );

-- ============================================
-- RLS POLICIES FOR ATTENDANCE TABLE
-- ============================================

-- Employees can view their own attendance
CREATE POLICY "Employees can view own attendance" ON attendance
  FOR SELECT USING (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Employees can mark their own attendance
CREATE POLICY "Employees can mark own attendance" ON attendance
  FOR INSERT WITH CHECK (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Employees can update their own attendance
CREATE POLICY "Employees can update own attendance" ON attendance
  FOR UPDATE USING (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Admins can view all attendance
CREATE POLICY "Admins can view all attendance" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.designation ILIKE '%admin%'
    )
  );

-- Admins can manage attendance
CREATE POLICY "Admins can manage attendance" ON attendance
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM employees admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.designation ILIKE '%admin%'
    )
  );

-- ============================================
-- RLS POLICIES FOR LEAVE ALLOCATIONS TABLE
-- ============================================

-- Employees can view their own leave allocations
CREATE POLICY "Employees can view own leave allocation" ON leave_allocations
  FOR SELECT USING (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Admins can manage leave allocations
CREATE POLICY "Admins can view all leave allocations" ON leave_allocations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.designation ILIKE '%admin%'
    )
  );

CREATE POLICY "Admins can manage leave allocations" ON leave_allocations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.designation ILIKE '%admin%'
    )
  );

-- ============================================
-- RLS POLICIES FOR EMPLOYEE DOCUMENTS TABLE
-- ============================================

-- Employees can view their own documents
CREATE POLICY "Employees can view own documents" ON employee_documents
  FOR SELECT USING (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Employees can upload documents
CREATE POLICY "Employees can upload documents" ON employee_documents
  FOR INSERT WITH CHECK (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Admins can view all documents
CREATE POLICY "Admins can view all documents" ON employee_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.designation ILIKE '%admin%'
    )
  );

-- Admins can verify documents
CREATE POLICY "Admins can verify documents" ON employee_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM employees admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.designation ILIKE '%admin%'
    )
  );

-- ============================================
-- RLS POLICIES FOR SALARY SLIPS TABLE
-- ============================================

-- Employees can view their own salary slips
CREATE POLICY "Employees can view own salary slips" ON salary_slips
  FOR SELECT USING (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Admins can view all salary slips
CREATE POLICY "Admins can view all salary slips" ON salary_slips
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.designation ILIKE '%admin%'
    )
  );

-- ============================================
-- RLS POLICIES FOR OTHER TABLES
-- ============================================

-- Everyone can view holidays
CREATE POLICY "Everyone can view holidays" ON company_holidays
  FOR SELECT USING (true);

-- Admins only for salary structures
CREATE POLICY "Admins can manage salary structures" ON salary_structures
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.designation ILIKE '%admin%'
    )
  );

-- Audit logs - admins only
CREATE POLICY "Admins can view audit logs" ON employee_audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.designation ILIKE '%admin%'
    )
  );

-- Reminders - admins only
CREATE POLICY "Admins can view reminders" ON attendance_reminders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.designation ILIKE '%admin%'
    )
  );

CREATE POLICY "Admins can manage reminders" ON leave_reminders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.designation ILIKE '%admin%'
    )
  );
```

---

## Step 4: Enable Storage for Document Uploads

### 4.1 Create Storage Bucket

Run in SQL Editor:

```sql
-- Create storage bucket for employee documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-documents', 'employee-documents', false)
ON CONFLICT (id) DO NOTHING;
```

### 4.2 Configure Storage Policies

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to their own employee folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'employee-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM employees WHERE user_id = auth.uid() LIMIT 1
    )
  );

-- Allow authenticated users to view their own documents
CREATE POLICY "Users can view their own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'employee-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM employees WHERE user_id = auth.uid() LIMIT 1
    )
  );

-- Admins can view all documents
CREATE POLICY "Admins can view all documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'employee-documents'
    AND EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND designation ILIKE '%admin%'
    )
  );

-- Admins can delete documents
CREATE POLICY "Admins can delete documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'employee-documents'
    AND EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND designation ILIKE '%admin%'
    )
  );
```

---

## Step 5: Create Test Employee (Optional)

Run this to create a test employee:

```sql
-- First, you need the actual user_id from your auth.users table
-- Replace 'YOUR_USER_ID_HERE' with the actual UUID from Supabase Auth

INSERT INTO employees (
  user_id,
  employee_id,
  first_name,
  last_name,
  email,
  phone,
  department,
  designation,
  date_of_joining,
  date_of_birth,
  gender,
  marital_status,
  city,
  state,
  country,
  base_salary,
  employment_status
) VALUES (
  'YOUR_USER_ID_HERE', -- Replace with actual user ID
  'EMP001',
  'John',
  'Doe',
  'john@kdadks.com',
  '+91-9876543210',
  'Engineering',
  'Senior Developer',
  '2024-01-15',
  '1990-05-20',
  'Male',
  'Married',
  'Bangalore',
  'Karnataka',
  'India',
  500000,
  'active'
);

-- Create leave allocation for the test employee
INSERT INTO leave_allocations (
  employee_id,
  leave_type_id,
  financial_year,
  allocated_days,
  used_days
) 
SELECT 
  e.id,
  lt.id,
  2026,
  CASE 
    WHEN lt.name = 'Annual Leave' THEN 20
    WHEN lt.name = 'Sick Leave' THEN 10
    WHEN lt.name = 'Casual Leave' THEN 5
    ELSE 0
  END as allocated_days,
  0
FROM employees e
CROSS JOIN leave_types lt
WHERE e.employee_id = 'EMP001'
AND lt.name IN ('Annual Leave', 'Sick Leave', 'Casual Leave');
```

---

## Step 6: Verify Everything

Run these verification queries:

```sql
-- Check all tables exist
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%employee%' OR table_name IN ('leaves', 'leave_types', 'company_holidays', 'attendance');

-- Check leave types
SELECT * FROM leave_types;

-- Check holidays
SELECT COUNT(*) FROM company_holidays;

-- Check RLS is enabled on tables
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND (tablename LIKE 'employee%' OR tablename IN ('leaves', 'leave_types', 'attendance', 'company_holidays'));
```

---

## Step 7: Environment Configuration

Ensure these environment variables are set in your `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Step 8: Test Services

All services are ready in `src/services/`:
- `attendanceService.ts` - Attendance marking and tracking
- `leaveService.ts` - Leave request and approval
- `documentService.ts` - Document upload and verification
- `salaryService.ts` - Salary slip generation
- `employeeService.ts` - Employee management

Example usage:

```typescript
import { attendanceService } from '@/services/attendanceService';

// Mark attendance
const result = await attendanceService.markAttendance({
  employeeId: 'emp-uuid',
  checkInTime: new Date(),
  checkOutTime: new Date(),
});
```

---

## Troubleshooting

### Issue: "relation 'leaves' does not exist"
**Solution**: Ensure `employee-schema.sql` is run completely. The schema has tables ordered correctly.

### Issue: RLS policies not working
**Solution**: Make sure:
1. RLS is enabled on the table
2. User is authenticated with valid `auth.uid()`
3. Employee record exists with matching `user_id`

### Issue: Storage bucket permissions denied
**Solution**: Verify:
1. Storage bucket is created
2. Storage policies are applied
3. Bucket is not public (security)

### Issue: Circular foreign key errors
**Solution**: The schema has proper dependency order:
1. `employees` (no FK)
2. `leave_types` (no FK)
3. `leaves` (FK to employees, leave_types)
4. `attendance` (FK to employees, leaves)
5. Others (depend on above)

---

## Next Steps

1. ✅ Schema is set up
2. ✅ Seed data loaded
3. ✅ RLS policies configured
4. ⏳ Build React UI components for dashboards
5. ⏳ Implement email notifications
6. ⏳ Set up cron jobs for automated tasks

See `EMPLOYEE_MANAGEMENT_SYSTEM.md` for full feature documentation.
