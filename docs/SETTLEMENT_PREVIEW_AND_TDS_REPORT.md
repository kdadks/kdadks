# Settlement Preview & TDS Report - Implementation Guide

## Overview

Two powerful new features have been added to the HR module:
1. **Settlement Preview** - Preview F&F settlement calculations before creating
2. **TDS Report** - Comprehensive Tax Deducted at Source reporting with date range filtering

---

## Feature 1: Settlement Preview

### What It Does
Allows HR managers to preview the complete settlement calculation **before** creating the actual settlement record. This helps in:
- Verifying calculations are correct
- Showing the breakdown to employees for approval
- Making adjustments before finalizing
- Avoiding errors in settlement creation

### How It Works

#### Step 1: Fill Settlement Form
Navigate to: **HR Management → F&F Settlement → Create Settlement**

Fill in all required fields:
- Employee details
- Exit dates (last working day, relieving date)
- Notice period information
- Additional payments (bonus, incentive)
- Recoveries (advance, loan, assets)
- Asset clearance

#### Step 2: Click "Preview Calculation"
Instead of directly creating the settlement, click the **"Preview Calculation"** button.

#### Step 3: Review Preview
The system shows a comprehensive breakdown:

**Employee Information:**
- Employee Number, Name
- Designation, Department

**Detailed Calculation Table:**
- ✅ **Amounts Payable** (Green section)
  - Pending Salary (X days): ₹XX,XXX
  - Leave Encashment (X days): ₹XX,XXX
  - Bonus: ₹XX,XXX
  - Incentive: ₹XX,XXX
  - Gratuity: ₹XX,XXX
  - Other Dues: ₹XX,XXX
  - **Total Dues: ₹XX,XXX**

- ❌ **Deductions/Recoveries** (Red section)
  - Advance Recovery: ₹X,XXX
  - Loan Recovery: ₹X,XXX
  - Notice Period Recovery (X days): ₹X,XXX
  - Asset Recovery: ₹X,XXX
  - Other Recoveries: ₹X,XXX
  - **Total Recoveries: ₹XX,XXX**

- 💰 **Final Settlement** (Blue section)
  - Gross Settlement: ₹XX,XXX
  - Tax Deduction (TDS): ₹X,XXX
  - **Net Settlement Payable: ₹XX,XXX** ⬅️ Final amount

#### Step 4: Actions
From preview mode:
- **Back to Edit**: Return to form to make changes
- **Confirm & Create Settlement**: Proceed with creating the settlement

### Benefits
- **Accuracy**: Verify all calculations before saving
- **Transparency**: Share preview with employee/management
- **Flexibility**: Make changes without creating draft records
- **Confidence**: Ensure correctness before final approval

---

## Feature 2: TDS Report

### What It Does
Generates comprehensive TDS (Tax Deducted at Source) reports for employees across:
- **Salary Slips**: Monthly TDS from regular payroll
- **F&F Settlements**: TDS from final settlements

### Key Features

#### 1. **Date Range Filtering**
- Select any custom date range
- View TDS for specific periods
- Useful for quarterly/annual compliance

#### 2. **Financial Year Reports**
- Quick selection of Financial Year (2024-25, 2023-24, etc.)
- Auto-populates date range (April 1 to March 31)
- Perfect for Form 16 generation

#### 3. **Employee-wise Summary**
For each employee:
- Total number of TDS entries
- Total Gross amount
- Total TDS deducted
- PAN number
- Expandable detailed breakdown

#### 4. **Detailed Breakdown**
Click "View Details" to see:
- Date of TDS deduction
- Source (Salary Slip or Settlement)
- Month/Year
- Gross amount
- TDS amount
- Remarks

#### 5. **Statistics Dashboard**
- **Total Employees**: Count with TDS deductions
- **Total TDS**: Sum of all TDS deducted
- **Total Gross**: Sum of all gross amounts
- **Average TDS/Employee**: Average TDS per employee
- **From Salary Slips**: TDS from regular payroll
- **From Settlements**: TDS from F&F settlements

#### 6. **CSV Export**
Download complete report as CSV with all details:
- Employee Number
- Employee Name
- PAN Number
- Date
- Source Type
- Month/Year
- Gross Amount
- TDS Amount
- Remarks

### How to Use

#### Access TDS Report
Navigate to: **HR Management → TDS Report**

#### Generate Report

**Option 1: Custom Date Range**
1. Select **Start Date**
2. Select **End Date**
3. Click **"Generate Report"**

**Option 2: Financial Year**
1. Select **Financial Year** from dropdown
   - 2024-25
   - 2023-24
   - 2022-23
   - etc.
2. Automatically generates report for that FY

#### View Results

**Summary Table:**
| Employee | PAN | Entries | Total Gross | Total TDS | Actions |
|----------|-----|---------|-------------|-----------|---------|
| John Doe<br>EMP001 | ABCDE1234F | 12 | ₹6,00,000 | ₹60,000 | View Details |

**Click "View Details"** to expand:
| Date | Source | Month/Year | Gross Amount | TDS Amount | Remarks |
|------|--------|------------|--------------|------------|---------|
| 2024-01-31 | Salary | 1/2024 | ₹50,000 | ₹5,000 | Salary Slip - January 2024 |
| 2024-06-15 | Settlement | 6/2024 | ₹1,50,000 | ₹15,000 | F&F Settlement - 15/06/2024 |

#### Export to CSV
1. Generate the report
2. Click **"Download CSV"** button (top-right)
3. File saved as: `TDS_Report_YYYY-MM-DD_to_YYYY-MM-DD.csv`

### Use Cases

#### 1. **Quarterly TDS Returns (Form 24Q)**
```
Start Date: 2024-04-01
End Date: 2024-06-30
```
Generate Q1 report, export CSV, and file quarterly return.

#### 2. **Annual Form 16 Generation**
```
Financial Year: 2024-25
```
Select FY, get complete annual TDS breakdown per employee.

#### 3. **Employee TDS Certificate**
Filter by employee (future enhancement) and date range to generate individual TDS certificate.

#### 4. **Audit & Compliance**
Export CSV for:
- CA review
- Internal audits
- Tax department queries
- Compliance verification

### Sample Report Output

#### Statistics (Top Cards)
```
┌───────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────┐
│ Total Employees   │  │ Total TDS        │  │ Total Gross      │  │ Avg TDS/Employee    │
│      45           │  │  ₹4,50,000       │  │  ₹45,00,000      │  │  ₹10,000            │
└───────────────────┘  └──────────────────┘  └──────────────────┘  └─────────────────────┘
```

#### Summary Table
```
Employee: Rajesh Kumar (EMP001)
PAN: ABCPK1234F
Entries: 12
Total Gross: ₹6,00,000
Total TDS: ₹60,000

Breakdown:
  Jan 2024  Salary      ₹50,000   ₹5,000
  Feb 2024  Salary      ₹50,000   ₹5,000
  Mar 2024  Salary      ₹50,000   ₹5,000
  ...
  Dec 2024  Settlement  ₹1,50,000 ₹15,000
```

---

## API/Service Methods

### Settlement Service (Enhanced)

```typescript
// Preview settlement calculation (no database save)
previewSettlement(input: CreateSettlementInput): Promise<Omit<FullFinalSettlement, 'id' | 'created_at' | 'updated_at'>>
```

### TDS Report Service

```typescript
// Get TDS report for date range
getTDSReport(filters: TDSReportFilters): Promise<TDSReportSummary[]>

// Get TDS report for specific employee
getEmployeeTDSReport(employeeId: string, startDate: string, endDate: string): Promise<TDSReportSummary | null>

// Get TDS report for financial year
getTDSReportForFinancialYear(financialYear: string): Promise<TDSReportSummary[]>

// Get TDS statistics
getTDSStats(startDate: string, endDate: string): Promise<{
  total_employees: number;
  total_tds: number;
  total_gross: number;
  average_tds_per_employee: number;
  from_salary_slips: number;
  from_settlements: number;
}>

// Export to CSV
exportToCSV(summaries: TDSReportSummary[]): string

// Get current financial year
getCurrentFinancialYear(): string
```

---

## Data Sources

The TDS Report aggregates data from multiple tables with proper data integrity checks:

### 1. Salary Slips (`salary_slips`)
- Fields used: `employee_id`, `salary_month`, `salary_year`, `gross_salary`, `tds`
- Filters: `tds > 0` (only records with TDS deduction)
- Date filter: Based on `salary_year` and `salary_month`
- **Data Integrity**: Fetched separately, then cross-referenced with employees table

### 2. Full & Final Settlements (`full_final_settlements`)
- Fields used: `employee_id`, `settlement_month`, `settlement_year`, `gross_settlement`, `tax_deduction`
- Filters: `tax_deduction > 0` (only records with TDS)
- Date filter: Based on `relieving_date`
- **Data Integrity**: Fetched separately, then validated against employees table

### 3. Employee Data (`employees`) - Source of Truth
- Fields fetched: `id`, `employee_number`, `full_name`, `pan_number`
- **Critical**: Always fetched separately using `.in()` batch query
- Used as the primary source for employee information
- Proper error handling if employee record is missing

### Data Fetching Strategy

The service uses a **two-phase fetch approach** to ensure data integrity:

**Phase 1: Fetch Transactional Data**
```typescript
// Fetch salary slips with TDS
const { data: salarySlips } = await supabase
  .from('salary_slips')
  .select('*')
  .gt('tds', 0);

// Fetch settlements with TDS
const { data: settlements } = await supabase
  .from('full_final_settlements')
  .select('*')
  .gt('tax_deduction', 0);
```

**Phase 2: Fetch Employee Master Data**
```typescript
// Extract unique employee IDs
const employeeIds = [...new Set(slips.map(s => s.employee_id))];

// Fetch actual employee data (source of truth)
const { data: employees } = await supabase
  .from('employees')
  .select('id, employee_number, full_name, pan_number')
  .in('id', employeeIds);

// Create Map for O(1) lookup
const employeeMap = new Map(employees?.map(e => [e.id, e]));
```

**Phase 3: Merge and Validate**
```typescript
for (const slip of slips) {
  const employee = employeeMap.get(slip.employee_id);
  if (employee) {
    // Use employee master data (source of truth)
    entries.push({ ...slip, ...employee });
  } else {
    // Log warning - data inconsistency detected
    console.warn(`Employee not found for slip ${slip.id}`);
  }
}
```

### Why This Approach?

1. **Data Integrity**: Always uses employees table as source of truth
2. **Performance**: Batch fetches with `.in()` instead of N+1 queries
3. **Reliability**: Detects and logs data inconsistencies
4. **Accuracy**: No reliance on potentially stale denormalized data
5. **Debugging**: Clear warnings when employee records are missing

---

## Important Notes

### Settlement Preview
- ✅ **No database writes**: Preview mode doesn't save anything
- ✅ **Real-time calculation**: Uses actual employee data, leave balances, and gratuity rules
- ✅ **Editable**: Can go back and modify inputs
- ✅ **Accurate**: Same calculation logic as final creation

### TDS Report
- ✅ **Live data**: Always shows current database state
- ✅ **Multi-source**: Combines salary slips and settlements
- ✅ **Expandable**: Click to see individual entries
- ✅ **Exportable**: CSV download for external use
- ⚠️ **Requires data**: Shows "No TDS records" if no data in date range
- ⚠️ **PAN dependency**: Shows "N/A" if employee PAN not entered

---

## Compliance & Legal

### TDS Reporting Requirements (India)
- **Quarterly Returns**: Form 24Q (salary TDS)
- **Annual Certificate**: Form 16 (for employees)
- **Deductor's Responsibility**: File returns on time
- **Late Filing Penalty**: ₹200/day
- **PAN Mandatory**: For all employees with TDS

### This Report Helps With:
- ✅ Quarterly TDS return filing
- ✅ Form 16 generation
- ✅ TDS challan reconciliation
- ✅ Employee queries on TDS deductions
- ✅ CA/Auditor data requests
- ✅ Income Tax department notices

---

## Troubleshooting

### Preview Shows Zero Gratuity
**Issue**: Gratuity amount is ₹0 in preview
**Solution**: Employee has < 5 years of service. Gratuity payable only after 5 years.

### TDS Report Shows No Data
**Issue**: "No TDS records found for the selected period"
**Reasons**:
1. No salary slips in that period
2. No settlements in that period
3. All salary slips have TDS = 0 (gross < ₹50,000)

**Solution**:
- Check date range
- Verify salary slips exist with TDS > 0
- Check settlements with tax_deduction > 0

### PAN Shows as "N/A"
**Issue**: PAN Number shows "N/A" in TDS report
**Solution**: Update employee PAN in employee master data

### CSV Download Not Working
**Issue**: CSV file doesn't download
**Solution**:
- Check browser pop-up blocker
- Ensure report is generated first
- Check browser downloads folder

---

## Future Enhancements

### Planned Features:
1. **Form 16 Auto-generation**: Direct PDF generation of Form 16
2. **Email TDS Certificates**: Auto-email Form 16 to employees
3. **TDS Challan Tracking**: Track challan numbers and deposit dates
4. **Quarter-wise Summary**: Separate view for Q1, Q2, Q3, Q4
5. **TDS Projection**: Predict annual TDS based on current trend
6. **Advance Tax Calculator**: Help employees with advance tax planning
7. **Pan Validation**: Real-time PAN verification
8. **TDS Reconciliation**: Match deductions with challan deposits

---

## Quick Reference

### Settlement Preview Workflow
```
Fill Form → Preview Calculation → Review → [Edit OR Confirm] → Create
```

### TDS Report Workflow
```
Select Dates/FY → Generate Report → View Summary → Expand Details → Download CSV
```

### TDS Report Use Cases
```
📊 Quarterly Filing    → Q1/Q2/Q3/Q4 date range → Generate → Export CSV
📄 Form 16 Generation  → Select Financial Year → Generate → Employee-wise data
🔍 Employee Query      → Employee filter → Date range → Details
📥 Audit Request       → Full date range → Generate → Export CSV
```

---

## Summary

### What You Get:

#### Settlement Preview:
- ✅ Risk-free calculation preview
- ✅ Complete breakdown before saving
- ✅ Edit and recalculate flexibility
- ✅ Professional presentation for approvals

#### TDS Report:
- ✅ Complete TDS tracking across payroll & settlements
- ✅ Financial year and custom date range support
- ✅ Employee-wise detailed breakdown
- ✅ CSV export for compliance
- ✅ Statistics dashboard
- ✅ Ready for Form 16 and Form 24Q

---

**Implementation Complete** ✅

Both features are production-ready and fully integrated into the HR module!

🤖 **Generated with Claude Code**
