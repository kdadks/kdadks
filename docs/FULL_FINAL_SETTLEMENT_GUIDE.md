# Full & Final Settlement - Complete Guide

## Overview

The Full & Final Settlement (F&F) system is a comprehensive workflow for processing employee exit settlements when they leave the organization. This feature automates calculations for dues, recoveries, gratuity, leave encashment, and generates detailed settlement statements.

---

## Features

### 1. **Automated Calculations**
- **Pending Salary**: Automatically calculates pro-rata salary for the final month
- **Leave Encashment**: Calculates encashment based on earned leave balance
- **Gratuity**: Automatic calculation per Indian Gratuity Act (4.81% of basic salary × years of service)
  - Minimum service: 5 years
  - Maximum limit: ₹20,00,000
- **Notice Period Recovery**: Automatic calculation if notice period not fully served
- **Tax Deduction**: Automatic TDS calculation (10% if gross settlement > ₹50,000)

### 2. **Comprehensive Settlement Components**

**Amounts Payable (Dues):**
- Pending salary for partial month
- Earned leave encashment
- Bonus amount
- Incentive amount
- Gratuity (auto-calculated or manual override)
- Other dues

**Deductions/Recoveries:**
- Advance recovery
- Loan recovery
- Notice period recovery (auto-calculated)
- Asset recovery
- Other recoveries

### 3. **Workflow Management**
- **Status Tracking**: Draft → Pending Approval → Approved → Paid → Cancelled
- **Approval Workflow**: Multi-level approval support
- **Asset Clearance**: Track asset return status
- **No Dues Certificate**: Issue tracking

### 4. **Detailed Record Keeping**
- Employee details (denormalized for historical records)
- Complete settlement calculation breakdown
- Payment tracking (mode, reference, date)
- Audit trail with timestamps and user tracking

---

## Database Setup

### Step 1: Apply Employee Fields Migration (If Not Done)

First, ensure all employee fields exist:

```bash
# Run this migration first
psql -h your-db-host -U your-db-user -d your-db-name -f database/migrations/006_add_missing_employee_fields.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `006_add_missing_employee_fields.sql`
3. Run the SQL

### Step 2: Apply F&F Settlement Migration

```bash
# Run the settlement system migration
psql -h your-db-host -U your-db-user -d your-db-name -f database/migrations/007_full_final_settlement.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `007_full_final_settlement.sql`
3. Run the SQL

This creates:
- `full_final_settlements` table
- `leave_balances` table
- Indexes for performance
- RLS policies for security
- Settlement statistics view

---

## Usage Guide

### Accessing F&F Settlement

1. **Login to Admin Portal**
2. **Navigate to HR Management** (in sidebar)
3. **Click on "F&F Settlement"**

### Creating a Settlement

#### Step 1: Select Employee
- Choose from active or resigned employees
- System shows: Name, Employee Number, Designation

#### Step 2: Enter Exit Details
- **Last Working Day** *
- **Date of Leaving** *
- **Relieving Date** *
- **Reason for Leaving** (optional)

#### Step 3: Notice Period Information
- **Notice Period (Days)** * - Contractual notice period
- **Notice Period Served (Days)** * - Actual days served

System automatically calculates:
- Notice Period Shortfall = Notice Period Days - Served Days
- Recovery Amount = Daily Salary × Shortfall Days

#### Step 4: Additional Payments (Optional)
- **Bonus Amount**: Any performance/annual bonus
- **Incentive Amount**: Sales incentive or other incentives
- **Other Dues**: Any other amounts payable

*Gratuity is auto-calculated based on service years and basic salary*

#### Step 5: Recoveries (Optional)
- **Advance Recovery**: Salary advance to be recovered
- **Loan Recovery**: Outstanding loan amount
- **Asset Recovery**: Cost of unreturned assets
- **Other Recoveries**: Any other deductions

#### Step 6: Asset Clearance
- ✓ **Assets Returned** checkbox
- **Asset Clearance Remarks**: List assets returned (laptop, phone, ID card, etc.)
- **General Remarks**: Any additional notes

#### Step 7: Review & Create
- Click "Create Settlement"
- System generates complete calculation
- Settlement status: "Draft"

---

## Settlement Calculation Formula

### 1. Pending Salary
```
Daily Salary = Gross Monthly Salary ÷ 30
Pending Days = Days worked in final month (up to last working day)
Pending Salary = Daily Salary × Pending Days
```

### 2. Leave Encashment
```
Leave Encashment = Daily Salary × Earned Leave Balance
```

### 3. Gratuity (Indian Gratuity Act)
```
If Service < 5 years: Gratuity = 0
If Service ≥ 5 years:
  Gratuity = (Basic Salary × Years of Service × 15) ÷ 26
  Maximum: ₹20,00,000
```

### 4. Notice Period Recovery
```
Shortfall = Notice Period Days - Served Days
Recovery = Daily Salary × Shortfall
```

### 5. Total Calculation
```
Total Dues = Pending Salary + Leave Encashment + Bonus + Incentive + Gratuity + Other Dues

Total Recoveries = Advance + Loan + Notice Recovery + Asset Recovery + Other Recoveries

Gross Settlement = Total Dues - Total Recoveries

Tax Deduction (TDS) = Gross Settlement × 10% (if Gross > ₹50,000, else 0)

NET SETTLEMENT = Gross Settlement - Tax Deduction
```

---

## Approval & Payment Workflow

### 1. Draft State
- Settlement created
- Can be edited or deleted
- Visible only to HR/Admin

### 2. Approve Settlement
- Click **"Approve Settlement"** button
- Status changes to "Approved"
- Records approver ID and timestamp
- Cannot be edited after approval

### 3. Mark as Paid
- Click **"Mark as Paid"** button
- Enter payment details:
  - Payment Date (YYYY-MM-DD)
  - Payment Mode (Bank Transfer, Cheque, etc.)
  - Payment Reference (Transaction ID, Cheque Number, etc.)
- Status changes to "Paid"
- Settlement is final

---

## Settlement Details View

The settlement detail page shows a comprehensive breakdown:

### Employee Information Section
- Employee Number, Name
- Designation, Department
- Date of Joining, Date of Leaving
- Relieving Date
- Current Status

### Settlement Calculation Table

**Amounts Payable (Green Section):**
| Component | Amount |
|-----------|--------|
| Pending Salary (X days) | ₹ XX,XXX |
| Leave Encashment (X days) | ₹ XX,XXX |
| Bonus | ₹ XX,XXX |
| Incentive | ₹ XX,XXX |
| Gratuity | ₹ XX,XXX |
| Other Dues | ₹ XX,XXX |
| **Total Dues** | **₹ XX,XXX** |

**Deductions/Recoveries (Red Section):**
| Component | Amount |
|-----------|--------|
| Advance Recovery | ₹ X,XXX |
| Loan Recovery | ₹ X,XXX |
| Notice Period Recovery (X days) | ₹ X,XXX |
| Asset Recovery | ₹ X,XXX |
| Other Recoveries | ₹ X,XXX |
| **Total Recoveries** | **₹ XX,XXX** |

**Final Settlement (Blue Section):**
| Component | Amount |
|-----------|--------|
| Gross Settlement | ₹ XX,XXX |
| Tax Deduction (TDS) | ₹ X,XXX |
| **Net Settlement Payable** | **₹ XX,XXX** |

### Asset Clearance Section
- Assets Returned: Yes/No
- Clearance Remarks
- General Remarks

---

## Reports & Statistics

### Dashboard Statistics
The main dashboard shows:
- Total settlements count
- Draft settlements
- Pending approvals
- Approved settlements
- Paid settlements
- Total amount paid
- Pending payment amount
- Employee exits this month

---

## Leave Balance Integration

The system integrates with the `leave_balances` table to fetch:
- Earned leave balance
- Financial year-wise tracking
- Automatic encashment calculation

**Note:** Ensure leave balances are updated regularly for accurate calculations.

---

## Best Practices

### 1. **Pre-Exit Checklist**
- Update employee status to "resigned"
- Ensure leave balances are current
- Verify last working day
- Collect resignation letter

### 2. **Settlement Creation**
- Create settlement on or before the last working day
- Verify all dues and recoveries
- Check gratuity eligibility (5+ years service)
- Confirm asset return

### 3. **Approval Process**
- Review settlement calculation thoroughly
- Verify notice period calculation
- Confirm all recoveries are legitimate
- Check tax deduction

### 4. **Payment Process**
- Process payment within 30-45 days of relieving
- Maintain payment proof (UTR, cheque copy)
- Send settlement statement to employee
- Issue Form 16 if applicable

### 5. **Record Keeping**
- Download/save settlement PDF
- Maintain signed acknowledgment
- File No Dues Certificate
- Update employee master status to "resigned"

---

## Troubleshooting

### Issue: Gratuity showing as zero
**Solution:** Employee might have < 5 years of service. Gratuity is payable only after 5 years.

### Issue: Leave encashment is zero
**Solution:** Check if leave balance exists in `leave_balances` table for current financial year.

### Issue: Notice period recovery too high
**Solution:** Verify "Notice Period Served" days are entered correctly. System calculates: (Required - Served) × Daily Salary.

### Issue: Cannot approve settlement
**Solution:** Ensure settlement status is "draft". Only draft settlements can be approved.

### Issue: Tax deduction is zero
**Solution:** TDS is applied only if gross settlement > ₹50,000. For smaller amounts, no TDS is deducted.

---

## API/Service Methods

### settlementService Methods:

```typescript
// Get all settlements
getSettlements(): Promise<FullFinalSettlement[]>

// Get settlement by ID
getSettlementById(id: string): Promise<FullFinalSettlement | null>

// Get settlements by employee
getSettlementsByEmployee(employeeId: string): Promise<FullFinalSettlement[]>

// Create settlement (with auto-calculations)
createSettlement(input: CreateSettlementInput, userId?: string): Promise<FullFinalSettlement>

// Update settlement
updateSettlement(id: string, updates: Partial<FullFinalSettlement>): Promise<FullFinalSettlement>

// Approve settlement
approveSettlement(id: string, userId?: string): Promise<FullFinalSettlement>

// Mark as paid
markAsPaid(id: string, paymentMode: string, paymentReference: string, paymentDate: string): Promise<FullFinalSettlement>

// Delete settlement
deleteSettlement(id: string): Promise<void>

// Get statistics
getSettlementStats(): Promise<any>
```

---

## Future Enhancements

### Planned Features:
1. **PDF Generation** - Downloadable settlement statement
2. **Email Notifications** - Auto-email to employee on approval/payment
3. **Form 16 Integration** - Link with TDS records
4. **Bulk Upload** - Create multiple settlements via Excel
5. **Payment Gateway Integration** - Direct payment processing
6. **Mobile App Support** - Employee self-service for settlement tracking
7. **Advanced Gratuity Rules** - Support for different gratuity policies
8. **Settlement Templates** - Pre-defined calculation templates
9. **Audit Log** - Detailed change history
10. **Multi-currency Support** - For international employees

---

## Support & Contact

For issues or questions:
1. Check the troubleshooting section above
2. Review the database migrations
3. Check browser console for errors
4. Verify Supabase RLS policies are active

---

## Changelog

### Version 1.0 (December 2024)
- Initial release
- Core F&F settlement workflow
- Automatic gratuity calculation
- Leave encashment integration
- Notice period recovery calculation
- Asset clearance tracking
- Approval workflow
- Payment tracking
- Settlement statistics

---

**Generated with Claude Code** 🤖
