# Employee Management System - Quick Reference

## 🚀 Quick Start

### 1. Setup Database (5 minutes)
```sql
-- Run in Supabase SQL Editor
-- Copy content from: src/database/employee-schema.sql
-- Then run: src/database/employee-seed.sql
```

### 2. Configure RLS Security
```sql
-- Follow steps in: docs/EMPLOYEE_SETUP_GUIDE.md
-- Section: "Step 3: Configure Row Level Security"
```

### 3. Use Services in React
```typescript
import { attendanceService } from '@/services/attendanceService';
import { leaveService } from '@/services/leaveService';
import { salaryService } from '@/services/salaryService';
import { documentService } from '@/services/documentService';
```

---

## 📋 Service Methods Reference

### Attendance Service
```typescript
// Mark attendance
await attendanceService.markAttendance({
  employeeId: 'emp-uuid',
  checkInTime: new Date('2026-01-15T09:00:00'),
  checkOutTime: new Date('2026-01-15T17:30:00'),
});

// Get monthly summary
const summary = await attendanceService.getMonthlyAttendanceSummary(
  employeeId, 
  1,  // January
  2026
);
// Returns: { total_days, present_days, absent_days, half_days, leaves, attendance_percentage }

// Find low attendance employees
const discrepancies = await attendanceService.getAttendanceDiscrepancies(1, 2026);
// Returns: Array of employees with < 75% attendance

// Admin review
await attendanceService.reviewAttendance(attendanceId, {
  verified_by: adminEmployeeId,
  admin_comments: 'Approved'
});
```

### Leave Service
```typescript
// Request leave
const leave = await leaveService.requestLeave({
  employee_id: 'emp-uuid',
  leave_type_id: 'type-uuid', // Get from leave_types table
  start_date: '2026-01-15',
  end_date: '2026-01-20',
  reason: 'Vacation'
});

// Approve leave
await leaveService.approveLeave(leaveId, {
  approved_by: adminEmployeeId,
  approval_comments: 'Approved'
});

// Get remaining days
const remaining = await leaveService.getRemainingLeaves(
  employeeId,
  2026 // Financial year
);
// Returns: [{ leave_type, allocated, used, carried_forward, remaining }]

// Cancel approved leave
await leaveService.cancelLeave(leaveId, {
  cancellation_reason: 'Plan changed'
});
```

### Salary Service
```typescript
// Generate single salary slip
const slip = await salaryService.generateSalarySlip(
  employeeId,
  1,     // January
  2026,
  adminEmployeeId // generated_by
);
// Returns: { basic_salary, hra, gross_salary, deductions, net_salary, paid_days }

// Bulk generate for all employees
const results = await salaryService.generateMonthSalarySlips(
  1,     // January
  2026,
  adminEmployeeId
);
// Returns: { success: number, failed: number, errors: string[] }

// Get salary summary
const summary = await salaryService.getSalarySummary(
  '2026-01-01',
  '2026-01-31'
);
```

### Document Service
```typescript
// Upload document
const doc = await documentService.uploadDocument(
  employeeId,
  {
    document_type: 'PAN',
    document_name: 'pan_document.pdf',
    file: fileObject, // From file input
    expiry_date: '2030-12-31'
  }
);
// Returns: { id, document_url, document_path, verification_status }

// Verify document
await documentService.verifyDocument(documentId, {
  verified_by: adminEmployeeId,
  verification_comments: 'Verified'
});

// Check for expiring documents
const expiring = await documentService.getExpiringDocuments(30); // Next 30 days
// Returns: Array of documents expiring soon

// Check required documents
const missing = await documentService.checkRequiredDocuments(employeeId);
// Returns: Array of missing required document types
```

---

## 🗂️ Database Table Reference

### employees
```
id, user_id*, employee_id*, first_name, last_name, email, 
phone, department, designation, date_of_joining, base_salary, 
employment_status (active|inactive|on_leave|terminated)
```

### attendance
```
id, employee_id*, date, check_in_time, check_out_time, 
duration_minutes, status (present|absent|half_day|leave), 
verified_by, admin_comments
```

### leave_types
```
id, name*, annual_limit, is_paid, requires_approval, color_code
```

### leaves
```
id, employee_id*, leave_type_id*, start_date, end_date, total_days,
reason, status (pending|approved|rejected|cancelled), 
approved_by, approval_date, approval_comments
```

### leave_allocations
```
id, employee_id*, leave_type_id*, financial_year*, 
allocated_days, used_days, carried_forward_days
```

### salary_slips
```
id, employee_id*, salary_month, salary_year, basic_salary, hra, 
gross_salary, provident_fund, esic, tds, total_deductions, 
net_salary, working_days, paid_days, lop_days, status
```

### salary_structures
```
id, employee_id*, effective_from, base_salary, hra_percentage,
dearness_allowance_percentage, other_allowances, pf_percentage, esi_percentage
```

### employee_documents
```
id, employee_id*, document_type, document_name, document_url, 
document_path, expiry_date, verification_status (pending|verified|rejected),
verified_by, verification_comments
```

---

## 💾 Financial Year Calculation

India uses April 1 - March 31 financial year:
```typescript
// FY 2026 = April 1, 2025 to March 31, 2026
const fy = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
```

---

## 📊 Salary Calculation Formula

```
Gross Salary = Base + HRA + DA + Other Allowances
Attendance Ratio = (Present + Half Days × 0.5) / Total Working Days
Prorated Salary = Gross × Attendance Ratio

Deductions:
- PF = 12% of Basic
- ESI = 0.75% of Basic
- Income Tax = Based on prorated salary (India tax brackets)

Net Salary = Prorated Salary - Total Deductions
```

---

## 🔐 RLS Security

**Employees see**:
- Their own attendance, leaves, documents, salary slips
- All leave types, company holidays

**Admins see**:
- All employees, attendance, leaves, documents, salary slips
- Can approve/verify/manage everything

---

## 🛠️ Common Queries

### Get Leave Types
```typescript
const { data: leaveTypes } = await supabase
  .from('leave_types')
  .select('*');
```

### Get Company Holidays
```typescript
const { data: holidays } = await supabase
  .from('company_holidays')
  .select('*')
  .gte('holiday_date', '2026-01-01')
  .lte('holiday_date', '2026-12-31')
  .order('holiday_date');
```

### Get Employee's Salary Slips
```typescript
const { data: slips } = await supabase
  .from('salary_slips')
  .select('*')
  .eq('employee_id', employeeId)
  .eq('salary_year', 2026)
  .order('salary_month');
```

---

## ⚠️ Error Handling Pattern

All services return `null` on error:
```typescript
const result = await attendanceService.markAttendance(data);
if (!result) {
  // Handle error - check console for details
  showError('Failed to mark attendance');
}
```

---

## 📝 Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📚 Full Documentation

- **Setup**: `docs/EMPLOYEE_SETUP_GUIDE.md`
- **Complete Reference**: `docs/EMPLOYEE_SYSTEM_README.md`
- **Implementation Details**: `docs/EMPLOYEE_IMPLEMENTATION_SUMMARY.md`

---

## ✅ Checklist Before Going Live

- [ ] Database schema created
- [ ] Seed data loaded (leave types, holidays)
- [ ] RLS policies enabled
- [ ] Storage bucket configured
- [ ] Test employee created
- [ ] Salary structure assigned
- [ ] Leave allocations created
- [ ] UI components built
- [ ] Services integrated with components
- [ ] Error handling tested
- [ ] Different user roles tested (employee vs admin)

---

## 🆘 Troubleshooting

**"relation 'leaves' does not exist"**
→ Ensure complete schema run in correct order

**RLS blocking queries**
→ Verify employee has matching user_id in employees table

**Salary calculation incorrect**
→ Check salary structure percentages and base salary

**Document upload failing**
→ Verify storage bucket exists and policies are applied

---

**Version**: 1.0.0 | **Last Updated**: Jan 2026 | **Status**: Production Ready ✅
