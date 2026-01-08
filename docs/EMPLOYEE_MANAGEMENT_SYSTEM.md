# Employee Management System - Implementation Guide

## Overview
A comprehensive employee management system with HR capabilities including attendance tracking, leave management, document management, and salary slip generation.

## Database Schema

### 1. Core Tables
- **employees** - Employee profile and personal information
- **salary_structures** - Salary components and configurations
- **salary_slips** - Generated monthly salary slips

### 2. Attendance Management
- **attendance** - Daily attendance records with check-in/check-out times
- **attendance_reminders** - Scheduled reminders for pending attendance

### 3. Leave Management
- **leave_types** - Types of leaves (Annual, Sick, Casual, etc.)
- **leave_allocations** - Leave balance per employee per financial year
- **leaves** - Leave requests with approval workflow
- **leave_reminders** - Reminders for pending/upcoming leaves

### 4. Other Tables
- **company_holidays** - National/state/company holidays
- **employee_documents** - Tax docs, certificates, etc. with verification status
- **employee_audit_logs** - Change tracking for compliance

## Services Implemented

### 1. employeeService.ts
```typescript
// Main features:
- getEmployeeByUserId() - Fetch employee by auth user
- getEmployeeProfile() - Get complete profile with related data
- updateProfile() - Update employee information
- updateProfilePhoto() - Update profile picture (stored in Supabase Storage)
- getAllEmployees() - Admin view with filters
- searchEmployees() - Search functionality
```

### 2. attendanceService.ts
```typescript
// Main features:
- markAttendance() - Mark daily attendance
- getAttendanceByDateRange() - Get attendance records
- getMonthlyAttendanceSummary() - Attendance statistics
- getAttendanceWithFilters() - Admin view with filtering
- reviewAttendance() - Admin review and comments
- getAttendanceDiscrepancies() - Find low attendance employees
- bulkUpdateAttendance() - Batch operations
```

### 3. leaveService.ts
```typescript
// Main features:
- getLeaveTypes() - Available leave types
- getLeaveAllocation() - Employee's leave balance
- getRemainingLeaves() - Calculate available leaves
- requestLeave() - Submit leave request
- getEmployeeLeaves() - View own leave requests
- getPendingLeaveRequests() - Admin view
- approveLeave() - Approve with auto-update of allocation
- rejectLeave() - Reject leave request
- cancelLeave() - Cancel approved leave
- getUpcomingLeavesByDepartment() - Department view
```

### 4. documentService.ts
```typescript
// Main features:
- uploadDocument() - Upload to Supabase Storage with metadata
- getEmployeeDocuments() - View all documents
- getDocumentsByType() - Filter by document type
- getPendingDocuments() - Admin view for verification
- verifyDocument() - Verify with notes
- deleteDocument() - Remove document
- getExpiringDocuments() - Track expiring documents
- checkRequiredDocuments() - Compliance checking
```

### 5. salaryService.ts
```typescript
// Main features:
- getSalaryStructure() - Get current structure
- generateSalarySlip() - Generate slip for a month
  * Takes attendance into account
  * Considers leaves and holidays
  * Calculates prorated salary
  * Applies deductions and tax
- getSalarySlip() - Retrieve specific slip
- getEmployeeSalarySlips() - History view
- generateMonthSalarySlips() - Bulk generation for all employees
- updateSalaryStructure() - Update structure with effective dates
- getSalarySummary() - Period summary
```

## Database Setup Instructions

1. **Create the database schema:**
   ```sql
   -- Copy content from src/database/employee-schema.sql
   -- Run in Supabase SQL Editor
   ```

2. **Set up Supabase Storage:**
   ```
   Create a new bucket: "employee-documents"
   - Enable public access for thumbnails
   - Set policies for employee document access
   ```

3. **Configure RLS Policies:**
   The schema includes basic RLS policies. You may need to extend for:
   - Admin access to all records
   - Manager access to department records
   - Employee access to own records

## Types Defined (src/types/employee.ts)

All TypeScript interfaces for:
- Employee profiles
- Attendance tracking
- Leave management
- Salary components
- Documents
- Filters and search

## Features Ready to Implement

### Employee Dashboard
- [ ] Mark attendance (check-in/check-out)
- [ ] View salary slips (downloadable PDF)
- [ ] Edit profile with form validation
- [ ] Upload profile photo
- [ ] Upload tax documents (PAN, Aadhaar, etc.)
- [ ] View leave balance
- [ ] Apply for leave
- [ ] Track leave status
- [ ] Download documents

### Admin Dashboard
- [ ] View all attendance records
- [ ] Send attendance reminders (email notifications)
- [ ] Mark attendance discrepancies
- [ ] Review/approve leave requests
- [ ] Generate salary slips for month
- [ ] View pending documents for verification
- [ ] Verify documents
- [ ] View employee attendance reports
- [ ] Department-wise statistics
- [ ] Salary summaries

## Email Notification Features to Build

1. **Attendance Reminders**
   - Daily reminder if attendance not marked
   - Weekly summary
   - Monthly report

2. **Leave Management**
   - Confirmation when leave requested
   - Approval/rejection notification
   - Reminders for upcoming leave
   - End of year unused leave alerts

3. **Document Alerts**
   - Document expiry warnings (30 days before)
   - Document rejection with feedback
   - Verification completed notification

4. **Payroll Alerts**
   - Salary slip ready notification
   - Payment confirmation
   - Tax document generation alerts

## Financial Year Configuration

- **India**: April - March
- Configurable in getFinancialYear() function
- Used for leave allocations and salary calculations

## Salary Calculation Logic

```
Gross Salary = Base + HRA + DA + Other Allowances

Attendance Ratio = Days Present / Total Working Days
Prorated Salary = Gross × Attendance Ratio

Deductions = PF + ESI + Income Tax + Other

Net Salary = Prorated Salary - Deductions
```

## Storage Paths

Employee documents stored as:
```
employee-documents/
  └─ {employeeId}/
      └─ {documentType}/
          └─ {timestamp}_{filename}
```

Profile photos:
```
employee-photos/
  └─ {employeeId}/
      └─ profile.jpg
```

## Security Notes

1. **Row Level Security (RLS)** - Configured for:
   - Employees can only view own records
   - Admins have full access (needs policy implementation)

2. **File Upload Restrictions** - Should add:
   - File size limits
   - Allowed MIME types
   - Virus scanning

3. **Audit Logging** - Log all:
   - Document uploads
   - Attendance marks
   - Leave requests
   - Salary slip generation

## Next Steps

1. Create React components for employee dashboard
2. Create React components for admin dashboard
3. Implement email notification service
4. Add file upload validation
5. Create PDF salary slip generator
6. Set up cron jobs for:
   - Daily attendance reminders
   - Salary slip generation
   - Expiring document alerts
7. Add advanced reporting features

## Dependencies Required

```json
{
  "supabase": "^2.x",
  "date-fns": "^2.x",
  "react-pdf": "^6.x",
  "pdfkit": "^0.13.x",
  "nodemailer": "^6.x"
}
```

## File Locations

- Database Schema: `src/database/employee-schema.sql`
- Types: `src/types/employee.ts`
- Services:
  - `src/services/employeeService.ts`
  - `src/services/attendanceService.ts`
  - `src/services/leaveService.ts`
  - `src/services/documentService.ts`
  - `src/services/salaryService.ts`

---

**Last Updated:** January 8, 2026
**Status:** Schema and Services Implemented - Ready for UI Components
