# Rate Card Salary Analysis Features

## Overview

The rate card system now includes comprehensive salary projection and analysis features that allow you to:
1. **Project estimated salaries** for each resource category
2. **Analyze salary vs rate margins** and markup percentages
3. **Simulate salary changes** and see the impact on billable rates
4. **Calculate recommended rates** based on salary inputs

## Features Implemented

### 1. Salary Projection in Rate Card Templates

Each rate card template can now include:
- **Monthly Salary** (USD & INR)
- **Annual Salary** (USD & INR) - auto-calculated
- **Working Hours per Month** (default: 160)
- **Working Days per Year** (default: 220)
- **Overhead Multiplier** (default: 1.75 = 75% overhead)

### 2. Salary vs Rate Analysis

For each rate card with salary data, the system calculates:

**Salary Information:**
- Monthly and annual salary in both currencies
- Hourly salary equivalent
  - Formula: `Monthly Salary / Working Hours per Month`

**Rate Analysis:**
- Current billable hourly rate
- Markup amount (Rate - Hourly Salary)
- Markup percentage
  - Formula: `((Rate - Hourly Salary) / Hourly Salary) × 100`

**Revenue Projections:**
- Potential monthly revenue
  - Formula: `Hourly Rate × Working Hours × 1 month`
- Potential annual revenue
  - Formula: `Hourly Rate × Working Hours × 12 months`

**Margin Analysis:**
- Gross margin amount (Annual Revenue - Annual Salary)
- Gross margin percentage
  - Formula: `(Gross Margin / Annual Revenue) × 100`

### 3. Interactive Salary Change Simulator

The analyzer includes a real-time simulator that shows:

**What-If Analysis:**
- Change monthly salary (USD & INR)
- Instantly see recommended new rates
- View rate change amount and percentage
- Calculate annual cost impact

**Comparison:**
- Side-by-side comparison of original vs new values
- Clear visualization of cost increases/decreases
- Impact on billing rates

## Database Schema

### New Columns Added to `rate_card_templates`

```sql
estimated_annual_salary_usd DECIMAL(15,2)
estimated_annual_salary_inr DECIMAL(15,2)
estimated_monthly_salary_usd DECIMAL(15,2)
estimated_monthly_salary_inr DECIMAL(15,2)
working_hours_per_month DECIMAL(10,2) DEFAULT 160.00
working_days_per_year DECIMAL(10,2) DEFAULT 220.00
salary_to_rate_multiplier DECIMAL(5,2) DEFAULT 1.75
```

### Database Functions

**`calculate_rate_from_salary(monthly_salary, working_hours, overhead_percentage)`**
- Calculates recommended billable rate from salary
- Formula: `(Salary / Hours) × (1 + Overhead%/100)`

**`calculate_salary_from_rate(hourly_rate, working_hours, overhead_percentage)`**
- Reverse calculation: rate to salary
- Formula: `(Rate / (1 + Overhead%/100)) × Hours`

**`get_recommended_rate(monthly_salary_usd, monthly_salary_inr, working_hours, overhead_percentage)`**
- Returns comprehensive rate recommendation with breakdown
- Includes hourly salary, markup amount, and markup percentage

### Database View

**`rate_card_salary_analysis`** view provides:
- All salary and rate information
- Calculated markup percentages
- Revenue potentials
- Gross margins
- Ready-to-use analytics

## TypeScript Helper Functions

### `calculateRateFromSalary()`
```typescript
calculateRateFromSalary(
  monthlySalaryUSD: number,
  monthlySalaryINR: number,
  workingHours: number = 160,
  overheadPercentage: number = 75
): { rateUSD: number; rateINR: number }
```

### `calculateSalaryFromRate()`
```typescript
calculateSalaryFromRate(
  hourlyRateUSD: number,
  hourlyRateINR: number,
  workingHours: number = 160,
  overheadPercentage: number = 75
): { monthlySalaryUSD: number; monthlySalaryINR: number }
```

### `analyzeSalaryToRate()`
```typescript
analyzeSalaryToRate(
  template: RateCardTemplate
): SalaryAnalysis | null
```
Returns comprehensive analysis including:
- Salary information
- Hourly equivalents
- Markup analysis
- Revenue projections
- Margin calculations

### `simulateSalaryChange()`
```typescript
simulateSalaryChange(
  currentMonthlySalaryUSD: number,
  currentMonthlySalaryINR: number,
  newMonthlySalaryUSD: number,
  newMonthlySalaryINR: number,
  workingHours: number = 160,
  overheadPercentage: number = 75
): SalarySimulation
```

## UI Components

### 1. Rate Card Template List
- Displays estimated monthly salary (if configured)
- Shows markup percentage directly on card
- "Analyze" button for templates with salary data

### 2. Rate Card Form (Create/Edit)
- New "Salary Information" section
- Fields for monthly salary (USD & INR)
- Working hours and overhead multiplier configuration
- Auto-calculation of annual salary

### 3. Salary Rate Analyzer (Modal)

**Left Panel - Current Analysis:**
- Salary Information card (monthly & annual)
- Billable Rate card (rates & markup)
- Revenue Projections card (monthly & annual revenue)
- Margin analysis with percentages

**Right Panel - Simulator:**
- Salary change input fields
- Real-time impact calculation
- Visual comparison of original vs new
- Cost impact visualization with color coding
  - Red for increases
  - Green for decreases

**Working Parameters Display:**
- Working hours per month
- Working days per year
- Overhead multiplier
- Calculated overhead percentage

## Usage Examples

### Example 1: Senior Full Stack Developer

**Salary Data:**
- Monthly Salary: $8,000 USD / ₹640,000 INR
- Working Hours: 160 hours/month
- Overhead Multiplier: 1.75 (75%)

**Calculated Values:**
- Hourly Salary: $50/hr / ₹4,000/hr
- Recommended Rate: $87.50/hr / ₹7,000/hr
- Markup: $37.50 (75%)
- Annual Revenue Potential: $168,000 USD / ₹13,440,000 INR
- Gross Margin: $72,000 USD (42.9%)

### Example 2: Salary Increase Simulation

**Original:**
- Monthly Salary: $8,000 USD
- Current Rate: $87.50/hr

**After 10% Increase:**
- New Monthly Salary: $8,800 USD
- New Recommended Rate: $96.25/hr
- Rate Change: +$8.75/hr (+10%)
- Annual Cost Impact: +$9,600 USD

## Benefits

1. **Transparent Pricing**: See exactly how salary translates to billing rates
2. **Margin Visibility**: Understand profit margins at a glance
3. **Quick Decisions**: Simulate salary changes before making offers
4. **Competitive Analysis**: Compare your rates with market standards
5. **Budget Planning**: Project annual costs and revenues accurately
6. **Client Negotiations**: Justify rates with cost breakdowns

## Formula Reference

### Basic Calculations

**Hourly Salary:**
```
Hourly Salary = Monthly Salary / Working Hours per Month
```

**Billable Rate from Salary:**
```
Billable Rate = Hourly Salary × Overhead Multiplier
```
Or:
```
Billable Rate = (Monthly Salary / Working Hours) × (1 + Overhead%/100)
```

**Markup:**
```
Markup Amount = Billable Rate - Hourly Salary
Markup Percentage = (Markup Amount / Hourly Salary) × 100
```

**Revenue Projections:**
```
Monthly Revenue = Billable Rate × Working Hours × 1
Annual Revenue = Billable Rate × Working Hours × 12
```

**Gross Margin:**
```
Gross Margin = Annual Revenue - Annual Salary
Gross Margin % = (Gross Margin / Annual Revenue) × 100
```

## Default Values

The system uses these industry-standard defaults:
- **Working Hours per Month**: 160 (20 days × 8 hours)
- **Working Days per Year**: 220 (excluding weekends & holidays)
- **Overhead Multiplier**: 1.75
  - Includes: Benefits (15%), Infrastructure (20%), Admin (10%), Profit (15%), Training (5%), Recruitment (3%), Security (5%), Communication (2%)
  - Total: ~75% overhead

## Pre-Populated Salary Data

The migration includes estimated salaries for all 9 default templates:

**Full Stack Custom:**
- Junior: $4,000/month ($48K/year)
- Senior: $8,000/month ($96K/year)
- Specialist: $12,800/month ($153.6K/year)

**AI/ML:**
- Junior: $5,600/month ($67.2K/year)
- Senior: $10,400/month ($124.8K/year)
- Specialist: $16,000/month ($192K/year)

**Non Technical Roles:**
- Junior: $3,200/month ($38.4K/year)
- Senior: $6,400/month ($76.8K/year)
- Specialist: $9,600/month ($115.2K/year)

## Migration Instructions

1. **Apply the main migration** (if not already done):
   ```sql
   -- Run: database/migrations/rate-card-schema.sql
   ```

2. **Apply the salary enhancement migration**:
   ```sql
   -- Run: database/migrations/rate-card-salary-enhancement.sql
   ```

This will:
- Add salary columns to existing tables
- Create helper functions
- Create analysis view
- Populate default salary data for existing templates

## Accessing the Features

1. **Navigate**: Admin Dashboard → Rate Cards
2. **View**: Click on any rate card template
3. **Analyze**: Click "Analyze" button (visible if salary data exists)
4. **Simulate**: Adjust salary values in the simulator panel
5. **Compare**: View real-time impact on rates and margins

## Best Practices

1. **Keep Salary Data Updated**: Review and update salaries regularly based on market rates
2. **Adjust Overhead**: Customize overhead multiplier based on your actual costs
3. **Document Assumptions**: Use description field to note salary ranges and assumptions
4. **Review Margins**: Ensure gross margins are healthy (typically 40-60%)
5. **Simulate Changes**: Always simulate before committing to salary increases
6. **Compare Categories**: Use analysis to ensure consistent markup across categories

## Troubleshooting

**Q: Why don't I see the "Analyze" button?**
A: The analyze button only appears for templates that have salary data configured. Edit the template and add salary information.

**Q: How do I change the overhead percentage?**
A: Edit the "Overhead Multiplier" field in the template form. For example, 1.75 = 75% overhead, 2.0 = 100% overhead.

**Q: Can I customize working hours?**
A: Yes, edit the "Working Hours/Month" field in the salary information section of the template form.

**Q: The calculations seem off, what should I check?**
A: Verify:
1. Monthly salary is entered correctly
2. Working hours per month is set (default: 160)
3. Overhead multiplier is appropriate (default: 1.75)
4. Annual salary is auto-calculated (should be monthly × 12)

## Future Enhancements

Potential additions:
1. Historical salary tracking
2. Market rate comparisons
3. Salary bands by region
4. Automated salary adjustment recommendations
5. Integration with HR/payroll systems
6. Multi-year projections
7. Benefit cost breakdown
8. Tax impact calculations

## Support

For questions or issues:
- Check this documentation first
- Verify database migrations ran successfully
- Ensure all salary fields are populated correctly
- Review browser console for errors
