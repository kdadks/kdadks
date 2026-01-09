# Attendance Management System - Updated Documentation

## Overview
The Attendance Management system has been redesigned to separate admin and employee responsibilities, with a new company-wide holiday calendar feature.

## Key Changes

### 1. Removed Admin Attendance Marking
- **Previous**: Admins could mark attendance for all employees manually
- **Current**: Employees mark their own attendance from their dashboard
- **Rationale**: Empowers employees and reduces admin workload

### 2. Company Holiday Calendar (New Feature)
Admins can now create and manage a yearly holiday calendar that is visible to all employees.

#### Features:
- **Add/Edit/Delete Holidays**: Full CRUD operations for holiday management
- **Holiday Types**: 
  - National Holiday (e.g., Republic Day, Independence Day)
  - Regional Holiday (e.g., State-specific festivals)
  - Company Holiday (e.g., Company anniversary, special closures)
- **Mandatory vs Optional**: Mark if the holiday is mandatory (office closed) or optional
- **Description**: Add details about each holiday
- **Visibility**: Holidays appear in employee attendance dashboards and monthly summaries

#### Holiday Calendar Table Schema:
```sql
- id: UUID (Primary Key)
- holiday_name: VARCHAR(255) - Name of the holiday
- holiday_date: DATE - Date of the holiday
- holiday_type: ENUM ('national', 'regional', 'company')
- is_mandatory: BOOLEAN - True if office is closed
- description: TEXT - Optional description
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### 3. Enhanced Monthly Summary
- **Employee Selection**: Dropdown to select specific employee
- **Individual View**: Shows attendance for one employee at a time
- **Holiday Integration**: Holidays are displayed in the calendar (purple color)
- **Leave Integration**: Displays leaves alongside attendance records

#### Monthly Summary Features:
- Select employee from dropdown
- Choose month and year
- Visual calendar with color-coded days:
  - **Green (P)**: Present
  - **Red (A)**: Absent
  - **Yellow (H)**: Half Day
  - **Blue (L)**: On Leave
  - **Purple (H)**: Holiday
  - **Gray**: Not Marked
- Summary statistics: Total Present, Absent, Half Days, Leaves, and Working Hours

### 4. Updated Tab Structure

#### Previous Tabs:
1. Mark Attendance (Admin marks for employees)
2. View Records
3. Monthly Summary (All employees together)

#### Current Tabs:
1. **Holiday Calendar** - Manage company holidays
2. **View Records** - View daily attendance records
3. **Monthly Summary** - View individual employee monthly attendance

## Database Setup

### Run Migration:
Execute the migration file to create the holidays table:
```sql
-- File: database/migrations/create_company_holidays_table.sql
```

### Default Holidays:
The migration includes default Indian national holidays for 2026:
- Republic Day (Jan 26)
- Holi (Mar 14)
- Good Friday (Apr 3)
- Eid ul-Fitr (May 4)
- Independence Day (Aug 15)
- Gandhi Jayanti (Oct 2)
- Dussehra (Oct 24)
- Diwali (Nov 11)
- Christmas (Dec 25)

## Usage Guide

### For Admins:

#### Managing Holidays:
1. Navigate to **Attendance Management** → **Holiday Calendar**
2. Click **"Add Holiday"** button
3. Fill in holiday details:
   - Holiday Name (e.g., "Republic Day")
   - Date
   - Type (National/Regional/Company)
   - Check "Mandatory" if office is closed
   - Add optional description
4. Click **"Add Holiday"** to save

#### Editing/Deleting Holidays:
- Click the edit icon (pencil) to modify a holiday
- Click the delete icon (trash) to remove a holiday

#### Viewing Employee Attendance:
1. Go to **Monthly Summary** tab
2. Select employee from dropdown
3. Select month and year
4. View calendar with attendance and holidays
5. See summary statistics at the top

### For Employees:
- Employees will see the holiday calendar when marking their attendance
- Holidays will be automatically displayed in their attendance view
- They cannot mark attendance on mandatory holidays (office closed)

## Integration Points

### Employee Dashboard:
The holiday calendar integrates with employee attendance marking:
- When employees mark attendance, holidays are displayed
- Employees cannot mark attendance on mandatory holidays
- Optional holidays show a note that attendance is not required

### Leave Management:
- Leaves are integrated into the monthly summary
- Leave days appear with blue color (L) in the calendar
- Leave days are counted separately from holidays

### Payroll Integration:
- Holiday data can be used for salary calculations
- Mandatory holidays don't count against employee attendance
- Half-day attendance on optional holidays handled appropriately

## Benefits

### For Admins:
- ✅ Reduced manual work (no need to mark attendance daily)
- ✅ Centralized holiday management
- ✅ Better oversight with employee-specific summaries
- ✅ Easy to update holidays for entire company

### For Employees:
- ✅ Self-service attendance marking
- ✅ Clear visibility of company holidays
- ✅ Better planning with advance holiday information
- ✅ Reduced dependency on admin for attendance

### For Organization:
- ✅ Improved accuracy (employees mark their own attendance)
- ✅ Transparent holiday policy
- ✅ Better compliance tracking
- ✅ Scalable system for growing organizations

## Future Enhancements
- Export holiday calendar as PDF/Excel
- Import holidays from calendar files (.ics)
- Multi-year holiday planning
- Regional holiday variants for different offices
- Attendance anomaly detection
- Integration with biometric systems
- Mobile app for attendance marking
