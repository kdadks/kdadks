# Employee Management System - Complete Implementation

## Overview

The Employee Management System is a comprehensive HR solution built into the KDADKS application. It includes:

- ✅ **Attendance Management** - Daily check-in/out with duration tracking
- ✅ **Leave Management** - Request, approve, cancel leave with financial year tracking
- ✅ **Salary Slip Generation** - Automatic salary calculation with attendance proration
- ✅ **Document Management** - Employee document upload and verification
- ✅ **Admin Dashboard** - Comprehensive oversight and approvals

---

## Database Setup

### 1. Create Database Schema

The database schema includes 11 tables with proper foreign key relationships and RLS security:

**File**: `src/database/employee-schema.sql`

Run this in Supabase SQL Editor:
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy entire content of `employee-schema.sql`
4. Click **Run**

**Tables Created**:
- `employees` - Employee master data
- `leave_types` - Available leave types (Annual, Sick, Casual, etc.)
- `leaves` - Leave requests and approvals
- `attendance` - Daily attendance records
- `leave_allocations` - Leave balance tracking per financial year
- `company_holidays` - Public holidays calendar
- `employee_documents` - Document uploads (PAN, Aadhaar, etc.)
- `salary_slips` - Generated salary slips
- `salary_structures` - Salary configuration per employee
- `attendance_reminders` - Email reminders for missing attendance
- `leave_reminders` - Email reminders for pending approvals
- `employee_audit_logs` - Audit trail of changes

### 2. Seed Initial Data

**File**: `src/database/employee-seed.sql`

Run in SQL Editor to insert:
- 7 Leave Types (Annual, Sick, Casual, Maternity, Paternity, Earned, LWP)
- 12 Company Holidays (India 2026)

### 3. Configure Security & Storage

**File**: `docs/EMPLOYEE_SETUP_GUIDE.md` - Complete step-by-step setup

Key steps:
- Enable RLS on all tables
- Create RLS policies for employee/admin access
- Create Supabase Storage bucket for documents
- Configure storage policies

---

## Service Layer Architecture

All data access goes through dedicated service modules:

### attendanceService.ts
```typescript
// Mark daily attendance
await attendanceService.markAttendance({
  employeeId: 'emp-uuid',
  checkInTime: new Date(),
  checkOutTime: new Date(),
});

// Get monthly summary
const summary = await attendanceService.getMonthlyAttendanceSummary(
  employeeId, 
  month, 
  year
);

// Find attendance discrepancies (< 75%)
const discrepancies = await attendanceService.getAttendanceDiscrepancies(
  month, 
  year
);

// Admin review attendance
await attendanceService.reviewAttendance(
  attendanceId,
  { comments: 'Approved', verified_by: adminId }
);
```

**Key Features**:
- Automatic duration calculation from check-in/out
- Attendance percentage calculation
- Low attendance detection (< 75%)
- Admin comments and verification

### leaveService.ts
```typescript
// Request leave
await leaveService.requestLeave({
  employee_id: 'emp-uuid',
  leave_type_id: 'type-uuid',
  start_date: '2026-01-15',
  end_date: '2026-01-20',
  reason: 'Vacation'
});

// Approve leave
await leaveService.approveLeave(leaveId, {
  approval_comments: 'Approved',
  approved_by: adminId
});

// Get remaining leaves
const remaining = await leaveService.getRemainingLeaves(
  employeeId, 
  2026 // Financial year
);

// Cancel approved leave
await leaveService.cancelLeave(leaveId, {
  cancellation_reason: 'Plan changed'
});
```

**Key Features**:
- Automatic days calculation between start/end dates
- Financial year tracking (April-March for India)
- Leave allocation auto-update on approval/cancellation
- Multi-status workflow: pending → approved/rejected/cancelled
- Carry-forward mechanism

### salaryService.ts
```typescript
// Generate salary slip with attendance consideration
const slip = await salaryService.generateSalarySlip(
  employeeId,
  month,
  year,
  generatedBy
);

// Bulk generate for all employees
const results = await salaryService.generateMonthSalarySlips(
  month,
  year,
  generatedBy
);

// Get salary summary
const summary = await salaryService.getSalarySummary(
  fromDate,
  toDate
);
```

**Salary Calculation Logic**:
```
Basic Salary: Employee's base salary
HRA: 20% of basic (configurable per structure)
DA: 10% of basic (configurable)
Gross = Basic + HRA + DA + Other Allowances

Attendance Ratio = (Present Days + Half Days × 0.5) / Total Working Days
Prorated Salary = Gross × Attendance Ratio

Deductions:
- PF: 12% of basic
- ESI: 0.75% of basic  
- Income Tax: Based on prorated salary (simplified India brackets)

Net Salary = Prorated Salary - Total Deductions
```

### documentService.ts
```typescript
// Upload document
const doc = await documentService.uploadDocument(
  employeeId,
  {
    document_type: 'PAN',
    document_name: 'pan_document.pdf',
    file: pdfFile,
    expiry_date: '2030-12-31'
  }
);

// Verify document
await documentService.verifyDocument(documentId, {
  verification_comments: 'Verified'
});

// Get expiring documents
const expiring = await documentService.getExpiringDocuments(daysBeforeExpiry);

// Check required documents
const missing = await documentService.checkRequiredDocuments(employeeId);
```

**Key Features**:
- Supabase Storage integration
- Document type tracking (PAN, Aadhaar, Form-16, etc.)
- Expiry date management
- Verification workflow (pending → verified/rejected)
- Public URL generation for downloads

---

## TypeScript Types

**File**: `src/types/employee.ts`

Key types exported:

```typescript
// Attendance
interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  duration_minutes?: number;
  status: AttendanceStatus; // 'present' | 'absent' | 'half_day' | 'leave'
  notes?: string;
  verified_by?: string;
  admin_comments?: string;
}

// Leave
interface Leave {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: LeaveStatus; // 'pending' | 'approved' | 'rejected' | 'cancelled'
  reason?: string;
  approved_by?: string;
  approval_date?: string;
  approval_comments?: string;
}

// Salary Slip
interface SalarySlip {
  id: string;
  employee_id: string;
  salary_month: number;
  salary_year: number;
  basic_salary: number;
  hra: number;
  gross_salary: number;
  provident_fund: number;
  esic: number;
  tds: number;
  total_deductions: number;
  net_salary: number;
  working_days: number;
  paid_days: number;
  lop_days: number;
  status: SalarySlipStatus; // 'draft' | 'approved' | 'paid'
}

// Document
interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_type: string;
  document_name: string;
  document_url: string;
  verification_status: DocumentVerificationStatus; // 'pending' | 'verified' | 'rejected'
  expiry_date?: string;
  verified_by?: string;
  verification_comments?: string;
}
```

---

## Environment Configuration

Ensure these environment variables are set in `.env.local`:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: Firebase/Email service for notifications
VITE_FIREBASE_API_KEY=...
```

---

## Integration with Existing App

### 1. Add Employee Routes

In your React Router, add:
```typescript
import EmployeeManagement from '@/components/admin/EmployeeManagement';
import EmployeeDashboard from '@/components/employee/EmployeeDashboard';

// In your routes array:
{
  path: '/admin/employees',
  element: <EmployeeManagement />,
  requireAuth: true,
  requireAdmin: true
},
{
  path: '/dashboard/my-attendance',
  element: <EmployeeDashboard />,
  requireAuth: true
}
```

### 2. Use Services in Components

```typescript
import { attendanceService } from '@/services/attendanceService';
import { leaveService } from '@/services/leaveService';
import { salaryService } from '@/services/salaryService';

// In your component:
const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);

useEffect(() => {
  const fetchAttendance = async () => {
    const summary = await attendanceService.getMonthlyAttendanceSummary(
      employeeId,
      new Date().getMonth() + 1,
      new Date().getFullYear()
    );
    setAttendance(summary);
  };
  fetchAttendance();
}, [employeeId]);
```

---

## Next Steps for UI Implementation

### Components to Build

**Employee Dashboard** (`/dashboard/employee`):
- Attendance marking (check-in/out)
- Leave request form
- Leave balance display
- Salary slip viewer
- Profile editor
- Document upload form

**Admin Dashboard** (`/admin/employees`):
- Employee list with search/filter
- Attendance review and verification
- Leave approval/rejection interface
- Document verification workflow
- Salary slip generation and bulk processing
- Dashboard with key metrics

### Recommended UI Libraries

- **Forms**: React Hook Form + Zod validation
- **Data Tables**: TanStack React Table
- **Date Picker**: React Day Picker or date-fns
- **File Upload**: Dropzone or react-dropzone
- **Notifications**: React Toastify or Sonner
- **PDF Download**: jsPDF or react-pdf

---

## Testing

### Unit Tests Example

```typescript
// src/services/__tests__/attendanceService.test.ts
import { attendanceService } from '@/services/attendanceService';

describe('attendanceService', () => {
  it('should calculate attendance percentage correctly', async () => {
    const summary = await attendanceService.getMonthlyAttendanceSummary(
      'test-emp-id',
      1,
      2026
    );
    
    expect(summary).toBeDefined();
    expect(summary?.attendance_percentage).toBeGreaterThanOrEqual(0);
    expect(summary?.attendance_percentage).toBeLessThanOrEqual(100);
  });

  it('should detect low attendance', async () => {
    const discrepancies = await attendanceService.getAttendanceDiscrepancies(1, 2026);
    
    // Should contain employees with < 75% attendance
    const hasLowAttendance = discrepancies?.some(d => d.attendance_percentage < 75);
    expect(hasLowAttendance).toBeDefined();
  });
});
```

### Integration Tests
- Test complete leave request workflow: request → approve → allocation update
- Test salary calculation: attendance ratio × gross salary
- Test document upload: file → storage → verification

---

## Security Considerations

✅ **Row Level Security (RLS)**
- Employees see only their own records
- Admins can see all records
- All queries filtered by `auth.uid()`

✅ **Storage Security**
- Documents stored in private bucket
- Public URLs generated on-demand
- Employee folder isolation

✅ **Field Validation**
- All inputs validated before database insertion
- No SQL injection possible (Supabase client)
- File MIME type validation required

---

## API Error Handling Pattern

All services follow consistent error handling:

```typescript
try {
  const result = await someService.operation();
  if (!result) {
    console.error('Operation returned null');
    showError('Operation failed');
    return null;
  }
  return result;
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('Operation error:', message);
  showError(`Failed: ${message}`);
  return null;
}
```

---

## Database Backup & Recovery

Regular backups recommended:
1. Use Supabase's automated daily backups
2. Export critical tables periodically
3. Keep salary slip PDFs archived for 7 years

---

## Troubleshooting

**Issue**: "relation 'leaves' does not exist"
- **Solution**: Ensure `employee-schema.sql` runs completely without errors. Tables must be created in order.

**Issue**: RLS policies blocking access
- **Solution**: Verify employee records have matching `user_id` from `auth.users`

**Issue**: Storage bucket not found
- **Solution**: Ensure storage bucket creation query ran successfully in SQL Editor

**Issue**: Salary calculation showing wrong amount
- **Solution**: Check salary structure has correct percentages and base salary set

---

## Production Checklist

Before deploying to production:

- [ ] Database schema created and tested
- [ ] RLS policies enabled on all tables
- [ ] Storage bucket created with policies
- [ ] Seed data loaded (leave types, holidays)
- [ ] Environment variables configured
- [ ] Admin user account created and designated
- [ ] Employee accounts created with correct `user_id`
- [ ] Leave allocations created for all employees
- [ ] Salary structures defined for all employees
- [ ] UI components tested in staging
- [ ] Email notifications configured (optional)
- [ ] Backup strategy documented
- [ ] Documentation shared with HR team

---

## Support & Documentation

- **Service Documentation**: `src/services/` - Each service has detailed JSDoc comments
- **Type Definitions**: `src/types/employee.ts` - All TypeScript interfaces
- **Setup Guide**: `docs/EMPLOYEE_SETUP_GUIDE.md` - Step-by-step setup
- **Database Schema**: `src/database/employee-schema.sql` - Full DDL
- **Seed Data**: `src/database/employee-seed.sql` - Initial data

---

## Version History

- **v1.0.0** (Current)
  - Complete attendance management
  - Leave request and approval workflow
  - Salary slip generation with attendance proration
  - Document upload and verification
  - Employee and admin dashboards (UI components pending)

Future enhancements:
- Bonus and incentive management
- Performance appraisals
- Training and development tracking
- Org chart visualization
- Mobile app integration
- WhatsApp/SMS notifications

