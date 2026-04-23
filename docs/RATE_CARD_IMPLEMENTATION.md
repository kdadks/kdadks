# Rate Card System Implementation

## Overview

A comprehensive rate card system has been implemented for calculating budgets/quotes for consulting engagements. The system supports multiple resource categories, experience levels, and currencies (USD and INR).

## Features

### 1. **Rate Card Templates**
- Manage standard rate cards for different resource types
- Three main categories:
  - **Full Stack Custom**: Full stack developers
  - **AI/ML**: Machine learning and AI specialists
  - **Non Technical Roles**: Project managers, business analysts, etc.
- Three resource levels per category:
  - **Junior**: 0-2 years experience
  - **Senior**: 3-7 years experience
  - **Specialist**: 8+ years experience

### 2. **Cost Head Management**
Each rate card includes detailed cost breakdown:
- Base Hourly Rate
- Benefits & Insurance (15%)
- Overhead Costs (20%)
- Administrative Costs (10%)
- Profit Margin (15%)
- Training & Development (5%)
- Recruitment & Onboarding (3%)
- Compliance & Security (5%)
- Communication & Collaboration (2%)
- Technology & Tools (8% for AI/ML only)

### 3. **Multi-Currency Support**
- Dual currency pricing (USD and INR)
- Automatic calculation of total rates based on cost heads
- Exchange rate support for conversions

### 4. **Quote Integration**
- Select rate card templates when creating quotes
- Customize rates for specific customer needs
- Add multiple resources to a single quote
- Automatic subtotal calculations

## Database Schema

### Tables Created

1. **rate_card_templates**
   - Stores standard rate card templates
   - Fields: template_name, category, resource_level, base_rate_usd, base_rate_inr, cost_heads (JSONB), is_active, is_default

2. **cost_head_types**
   - Standard cost head definitions
   - Fields: name, description, default_percentage, applies_to, display_order

3. **quote_rate_cards**
   - Customized rate cards for specific quotes
   - Fields: quote_id, template_id, category, resource_level, rate_usd, rate_inr, cost_heads, quantity, unit, subtotal_usd, subtotal_inr

### Migration File
Location: `database/migrations/rate-card-schema.sql`

To apply the migration:
```bash
# Connect to your Supabase project and run:
psql -h <your-db-host> -U postgres -d postgres -f database/migrations/rate-card-schema.sql
```

Or use Supabase Dashboard:
1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of `database/migrations/rate-card-schema.sql`
3. Paste and run the SQL

## Components

### 1. RateCardManagement Component
Location: `src/components/admin/RateCardManagement.tsx`

**Features:**
- List all rate card templates
- Create new templates
- Edit existing templates
- Duplicate templates
- Delete templates
- Filter by category and resource level
- Real-time rate calculation preview

**Usage:**
Access via Admin Dashboard → Rate Cards menu

### 2. QuoteRateCardSelector Component
Location: `src/components/quote/QuoteRateCardSelector.tsx`

**Features:**
- Select rate card templates
- Customize rates for specific quotes
- Add multiple resources
- Adjust quantity and unit (hour/day/week/month)
- View total cost in both currencies

**Usage:**
This component can be integrated into the quote creation/editing forms.

## Files Created

1. **Database Schema**
   - `database/migrations/rate-card-schema.sql`

2. **TypeScript Types**
   - `src/types/rateCard.ts`

3. **Service Layer**
   - `src/services/rateCardService.ts`

4. **Components**
   - `src/components/admin/RateCardManagement.tsx`
   - `src/components/quote/QuoteRateCardSelector.tsx`

5. **Documentation**
   - `RATE_CARD_IMPLEMENTATION.md` (this file)
   - `PROJECT_STRUCTURE_GUIDE.md` (general project structure)

## Default Templates

The system comes pre-populated with 9 default templates:

### Full Stack Custom
- Junior Developer: $25/hr (₹2,000/hr) → Total: ~$43.75/hr (₹3,500/hr)
- Senior Developer: $50/hr (₹4,000/hr) → Total: ~$87.50/hr (₹7,000/hr)
- Specialist/Architect: $80/hr (₹6,500/hr) → Total: ~$140/hr (₹11,375/hr)

### AI/ML
- Junior Engineer: $35/hr (₹2,800/hr) → Total: ~$61.25/hr (₹4,900/hr)
- Senior Engineer: $65/hr (₹5,200/hr) → Total: ~$113.75/hr (₹9,100/hr)
- Specialist/Researcher: $100/hr (₹8,000/hr) → Total: ~$175/hr (₹14,000/hr)

### Non Technical Roles
- Junior Resource: $20/hr (₹1,600/hr) → Total: ~$35/hr (₹2,800/hr)
- Senior Resource: $40/hr (₹3,200/hr) → Total: ~$70/hr (₹5,600/hr)
- Specialist: $60/hr (₹4,800/hr) → Total: ~$105/hr (₹8,400/hr)

## Usage Guide

### Creating a Rate Card Template

1. Navigate to Admin Dashboard
2. Click on "Rate Cards" in the sidebar
3. Click "New Template"
4. Fill in the form:
   - Template Name (e.g., "Senior Full Stack Developer")
   - Category (Full Stack Custom/AI/ML/Non Technical Roles)
   - Resource Level (Junior/Senior/Specialist)
   - Base Rate in USD and INR
   - Add cost heads with percentages
5. Click "Create Template"

### Using Rate Cards in Quotes

To integrate the rate card selector into your quote form:

```tsx
import QuoteRateCardSelector from '../quote/QuoteRateCardSelector';

// In your quote form component:
<QuoteRateCardSelector
  quoteId={quoteId}
  currency={currency}
  onRateCardsChange={(rateCards) => {
    // Handle rate card changes
    console.log('Selected rate cards:', rateCards);
  }}
/>
```

### Customizing Rates for a Quote

1. When creating/editing a quote, use the Rate Card Selector
2. Click "Add Resource"
3. Select a template (optional) or start from scratch
4. Customize:
   - Category and Resource Level
   - Quantity (number of hours/days/months)
   - Unit (hour/day/week/month)
   - Cost heads (if needed)
5. Click "Add Resource"

The system will automatically calculate:
- Total rate per unit (including all cost heads)
- Subtotal based on quantity
- Grand total for all resources in both currencies

## API Service Methods

### Rate Card Templates
```typescript
// Get all templates with filters
await rateCardService.getRateCardTemplates({
  category: 'Full Stack Custom',
  resource_level: 'Senior',
  is_active: true
});

// Get single template
await rateCardService.getRateCardTemplateById(id);

// Create template
await rateCardService.createRateCardTemplate(data);

// Update template
await rateCardService.updateRateCardTemplate(id, data);

// Delete template
await rateCardService.deleteRateCardTemplate(id);
```

### Cost Head Types
```typescript
// Get all cost heads
await rateCardService.getCostHeadTypes();

// Get cost heads for specific category
await rateCardService.getCostHeadTypesByCategory('AI/ML');
```

### Quote Rate Cards
```typescript
// Get rate cards for a quote
await rateCardService.getQuoteRateCards(quoteId);

// Create quote rate card
await rateCardService.createQuoteRateCard(data);

// Update quote rate card
await rateCardService.updateQuoteRateCard(id, data);

// Delete quote rate card
await rateCardService.deleteQuoteRateCard(id);
```

## Rate Calculation Helper

The `calculateTotalRate` function automatically calculates the total rate:

```typescript
import { calculateTotalRate } from '../types/rateCard';

const calculation = calculateTotalRate(
  baseRateUSD,
  baseRateINR,
  costHeads
);

// Returns:
// {
//   base_rate_usd: number,
//   base_rate_inr: number,
//   cost_heads: CostHead[],
//   total_cost_heads_usd: number,
//   total_cost_heads_inr: number,
//   total_rate_usd: number,
//   total_rate_inr: number
// }
```

## Navigation

The Rate Card management is accessible from the Admin Dashboard:
- **Path**: Admin Dashboard → Rate Cards
- **Icon**: Calculator
- **Route**: Handled by `activeView` state ('rate-cards')

## Security

- All tables have Row Level Security (RLS) enabled
- Only authenticated users can access rate card data
- CRUD policies are in place for all operations

## Future Enhancements

Potential improvements:
1. **Historical Tracking**: Track rate changes over time
2. **Approval Workflow**: Multi-level approval for custom rates
3. **Analytics**: Rate card usage analytics and insights
4. **Bulk Import**: Import rate cards from CSV/Excel
5. **Templates by Region**: Location-based rate adjustments
6. **Competitor Comparison**: Compare rates with market standards
7. **Resource Availability**: Link with resource scheduling

## Support

For issues or questions:
1. Check the database migration ran successfully
2. Verify Supabase RLS policies are active
3. Check browser console for any errors
4. Ensure all required files are in place

## Testing Checklist

- [ ] Database migration executed successfully
- [ ] Default templates visible in Rate Cards page
- [ ] Can create new rate card template
- [ ] Can edit existing template
- [ ] Can delete template
- [ ] Can filter templates by category and level
- [ ] Cost heads calculate correctly
- [ ] Quote rate card selector displays templates
- [ ] Can add resources to quote
- [ ] Can customize rates for specific quote
- [ ] Total calculations are accurate in both currencies
- [ ] Navigation to Rate Cards works from Admin Dashboard
