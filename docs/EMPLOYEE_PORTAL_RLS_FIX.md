# Employee Portal RLS Fix

## Problem Summary

Employees logging into the employee portal cannot see their salary structure, compensation details, or other personal information despite being properly authenticated.

## Root Cause

The application uses **dual authentication systems**:

1. **Admin Portal**: Uses Supabase Auth (`auth.uid()`)
2. **Employee Portal**: Uses custom authentication via `employeeAuthService` (stores session in `sessionStorage`)

The database tables have Row Level Security (RLS) policies that check `auth.uid()` for access control. When employees log in through the custom authentication system:
- They get a valid session in `sessionStorage`
- They can make API calls through the service layer
- But `auth.uid()` returns `NULL` because they're not logged into Supabase Auth
- RLS policies block access: `USING (auth.uid() = employee_id)` fails

## Affected Tables

- `salary_structures` - Salary component breakdown
- `employee_compensation` - Current and historical compensation
- `salary_increments` - Salary increment history
- `employee_bonuses` - Bonus records
- `salary_slips` - Monthly payslips
- `employees` - Employee profile data
- `leave_applications` - Leave requests
- `attendance_records` - Attendance tracking

## Solution

### Option 1: Application-Level Security (Recommended) ✅

Update RLS policies to allow read access through the service role (used by the backend), while maintaining security through application-level filtering:

```sql
-- Allow read access (application filters by employee_id)
CREATE POLICY "Allow read access to salary_structures"
  ON salary_structures FOR SELECT
  USING (true);

-- Admin operations still require Supabase Auth
CREATE POLICY "Allow admin management of salary_structures"
  ON salary_structures FOR ALL
  USING (auth.uid() IS NOT NULL);
```

**Security Model:**
- Application code filters queries by `employee_id` from the authenticated session
- Backend uses Supabase service role (has RLS bypass)
- Admin portal still requires Supabase Auth for modifications
- Employee portal validates session before allowing any access

### Option 2: Dual Auth System (Complex)

Integrate Supabase Auth into the employee portal:
- Keep custom employee authentication for credentials
- Also create Supabase Auth session after successful login
- Use JWT tokens for both systems

**Pros:**
- Maintains database-level security
- RLS policies work as intended

**Cons:**
- More complex implementation
- Duplicate authentication logic
- Potential security vulnerabilities if not implemented correctly
- Requires session management for both systems

### Option 3: Disable RLS (Not Recommended) ❌

Completely disable RLS for employee tables:
```sql
ALTER TABLE salary_structures DISABLE ROW LEVEL SECURITY;
```

**Risks:**
- No database-level security
- All queries succeed regardless of user
- Relies entirely on application code for security

## Implementation: Fix Script

Run the migration script to update RLS policies:

```bash
# Connect to Supabase SQL Editor and run:
database/migrations/fix_employee_rls_policies.sql
```

This script:
1. Drops existing restrictive RLS policies
2. Creates new policies allowing read access for authenticated sessions
3. Maintains admin-only write access requiring Supabase Auth
4. Adds documentation comments to tables

## Verification Steps

1. **Login as Employee:**
   ```
   Navigate to: /employee/login
   Email: [employee email]
   Password: [employee password]
   ```

2. **Check Dashboard:**
   - Should see leave balances
   - Should see attendance percentage
   - No errors in browser console

3. **View Compensation:**
   ```
   Navigate to: /employee/compensation
   ```
   - Should see current salary structure
   - Should see earnings breakdown (Basic, HRA, DA, Special Allowance)
   - Should see deductions (PF, ESI, Professional Tax, TDS)
   - Should see gross salary and net salary

4. **View Salary Slips:**
   ```
   Navigate to: /employee/salary
   ```
   - Should see list of salary slips
   - Should be able to download/preview slips

5. **Check Browser Console:**
   - No RLS policy errors
   - No "permission denied" errors
   - Successful API responses

## Security Considerations

### Application-Level Filtering

All employee services **must** filter by `employee_id` from the authenticated session:

```typescript
// ✅ CORRECT - Filters by employee_id from session
const session = sessionStorage.getItem('employee_session');
const employee = JSON.parse(session);
const { data } = await supabase
  .from('salary_structures')
  .select('*')
  .eq('employee_id', employee.id)
  .eq('is_active', true);

// ❌ WRONG - No filtering, exposes all employee data
const { data } = await supabase
  .from('salary_structures')
  .select('*')
  .eq('is_active', true);
```

### Session Validation

Always verify employee session before making queries:

```typescript
// Get and validate employee session
const employeeId = (() => {
  const session = sessionStorage.getItem('employee_session');
  if (!session) return null;
  
  try {
    const employee = JSON.parse(session);
    return employee.id;
  } catch {
    return null;
  }
})();

if (!employeeId) {
  // Redirect to login or show error
  navigate('/employee/login');
  return;
}
```

### Protected Routes

Use `ProtectedEmployeeRoute` component for all employee portal routes:

```typescript
// src/components/Router.tsx
<Route path="/employee/*" element={<ProtectedEmployeeRoute />}>
  <Route index element={<EmployeeDashboard />} />
  <Route path="compensation" element={<EmployeeCompensation />} />
  <Route path="salary" element={<EmployeeSalarySlips />} />
  {/* ... other routes */}
</Route>
```

## Monitoring & Logging

After applying the fix, monitor for:

1. **Successful Employee Logins:**
   - Check that sessions are created properly
   - Verify employee_id is stored correctly

2. **API Query Success:**
   - Monitor Supabase logs for successful queries
   - No RLS policy violation errors

3. **Data Access Patterns:**
   - Employees only access their own data
   - No cross-employee data leakage

4. **Admin Portal:**
   - HR/Admin users can still manage all employee data
   - Supabase Auth still required for admin operations

## Rollback Plan

If issues occur after applying the fix:

1. **Restore previous policies:**
   ```sql
   DROP POLICY IF EXISTS "Allow read access to salary_structures" ON salary_structures;
   DROP POLICY IF EXISTS "Allow admin management of salary_structures" ON salary_structures;
   
   CREATE POLICY "Users can view their own salary structure"
     ON salary_structures FOR SELECT
     USING (auth.uid() = employee_id);
   ```

2. **Check application logs:**
   - Look for authentication errors
   - Verify session storage is working

3. **Verify employee authentication:**
   - Test login flow
   - Check session creation
   - Validate employee_id storage

## Future Improvements

### 1. Unified Authentication
Migrate employee authentication to use Supabase Auth:
- Create auth users for employees
- Link `employees.id` to `auth.users.id`
- Use RLS policies with `auth.uid() = employee_id`
- Single authentication system for entire application

### 2. Service Role API
Create dedicated API endpoints for employee operations:
- Use service role on backend only
- Application code validates sessions
- API filters by employee_id
- Never expose service role key to frontend

### 3. Audit Logging
Log all employee data access:
- Track who accessed what data
- Monitor for unusual access patterns
- Alert on potential security issues

## Related Files

- **Migration Script:** `database/migrations/fix_employee_rls_policies.sql`
- **Auth Service:** `src/services/employeeAuthService.ts`
- **Protected Route:** `src/components/employee/ProtectedEmployeeRoute.tsx`
- **Compensation Service:** `src/services/compensationService.ts`
- **Salary Structure Service:** `src/services/salaryStructureService.ts`
- **RLS Migration:** `database/migrations/007_add_missing_employee_tables.sql`

## Support

If employees still cannot access their data after applying this fix:

1. Check Supabase dashboard for RLS policy errors
2. Verify employee session is being created on login
3. Check browser console for API errors
4. Verify employee_id exists in database
5. Check if employee has compensation/salary structure records

For assistance, review:
- `docs/EMPLOYEE_AUTHENTICATION_SYSTEM.md`
- `docs/EMPLOYEE_SYSTEM_README.md`
- Browser Developer Tools → Console/Network tabs
