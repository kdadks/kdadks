# GitHub Copilot Instructions

## Project Overview
This is a React/TypeScript business website for Kdadks with a comprehensive invoice management system, CRM pipeline (Leads → Opportunities → Quotes → Invoices), employee portal, payment processing, and HR tools. The project combines a public marketing website with a secure admin dashboard and employee self-service portal.

## Architecture & Key Patterns

### 🏗️ Application Structure
- **Frontend**: React 18 + TypeScript, Vite 7 build system, Tailwind CSS 3
- **Backend**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Authentication**: Supabase Auth (email/password) via `simpleAuth.ts`
- **Deployment**: Netlify with automated CI/CD
- **Email**: Resend API (primary) + Microsoft 365 Exchange SMTP (backup/fallback)
- **Payments**: Stripe + PayPal
- **CAPTCHA**: Google Cloud reCAPTCHA Enterprise

### 🎯 Dual-Purpose Application (Plus Employee Portal)
The app serves three distinct user groups:
1. **Public Website** (`/`) - Marketing site for KDADKS services (IT Wala, Ayuh Clinic, Nirchal, Raahirides)
2. **Admin Dashboard** (`/admin/*`) - Protected system via `SimpleAdminDashboard.tsx` with Sales, Finance, HR, Communication, Configuration, and Reporting sections
3. **Employee Portal** (`/employee/*`) - Self-service for profile, leaves, attendance, salary slips, documents, performance feedback

### 🧠 State Management
The app uses React Context + hooks (no Redux):
- **CompanyContext** (`src/contexts/CompanyContext.tsx`) — multi-entity context providing `companies`, `selectedCompany`, `selectCompany()`. Every admin component reads `selectedCompany` to filter data by entity.
- **ToastProvider** (`src/components/ui/ToastProvider.tsx`) — provides `showSuccess`, `showError`, `showWarning`, `showInfo` via `useToast()`
- **useConfirmDialog** (`src/hooks/useConfirmDialog.ts`) — provides `confirm()` function for destructive action confirmations
- **AuthContext** (`src/contexts/AuthContext.tsx`)

### 🔄 Admin Dashboard Shell
`SimpleAdminDashboard.tsx` is the central admin shell:
- Sidebar navigation with collapsible sections
- `pathToView` record maps URL paths to `ActiveView` type (40+ views)
- Auth check via `simpleAuth.isAuthenticated()` — redirects to `/admin/login` if not authenticated
- CompanySelector component for multi-entity switching in the header

### 🔄 State Management Pattern (Component Level)
```typescript
// Multi-modal pattern with mode-based forms
const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view');
const [showModal, setShowModal] = useState(false);

// Tab-based navigation state
const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'customers'>('dashboard');

// Pagination and filtering state
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [filters, setFilters] = useState<FilterType>({});
```

### 🧾 Invoice System Architecture

**Core Service Pattern**: Centralized data access through `invoiceService.ts`
```typescript
// All database operations go through this service
import { invoiceService } from '../services/invoiceService';

// Pattern: Service methods handle Supabase queries and business logic
const invoices = await invoiceService.getInvoices(filters, page, perPage);
const invoice = await invoiceService.createInvoice(invoiceData, invoiceNumber);
```

**Database Schema**: 20+ interconnected tables with foreign key relationships
```
countries → company_settings → invoices
customers → invoices → invoice_items → products
company_settings → invoice_settings → invoices
invoices → payments
terms_templates → company_settings
leads → opportunities → quotes → invoices
employees → leave_requests, attendance_records, salary_slips, etc.
```

### 📊 CRM Pipeline (Lead → Opportunity → Quote → Invoice)

**Lead Management** (`src/components/lead/LeadManagement.tsx`):
- Status Flow: `new` → `contacted` → `qualified` → `converted` / `disqualified`
- Dashboard with stats cards (total, new, qualified, converted)
- Entity association with `__shared__` sentinel for shared leads
- PAN validation: `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`

**Opportunity Management** (`src/components/lead/OpportunityManagement.tsx`):
- Stage Flow: `prospecting` → `qualification` → `proposal` → `negotiation` → `closed_won` / `closed_lost`
- Linked to leads (only qualified leads shown for association)
- Pipeline value tracking

**Quote Management** (`src/components/quote/QuoteManagement.tsx`):
- Status: `draft` → `sent` → `accepted` / `rejected` / `expired` / `converted`
- Service item calculation: `resource_count × quantity(months) × billable_hours × unit_price`
- Product item calculation: `quantity × unit_price`
- Discount support (percentage or fixed)
- PDF generation with branding
- Can convert accepted quote to invoice

**Activity Tracking** (`src/services/leadActivityService.ts`):
- Tracks activities (call, email, meeting, note, task, status_change) for leads and opportunities
- Uses polymorphic `lead_id` / `opportunity_id` foreign keys

### 🌍 Multi-Country Support
```typescript
// Multi-country tax/banking fields via taxUtils.ts
import { getCompanyTaxFields, getCompanyBankingFields, getDefaultTaxRate } from '../utils/taxUtils';

// Country-specific tax labels (IGST for India, VAT for others)
const taxLabel = getTaxLabel(customer);

// Country-specific field retrieval
const taxFields = getCompanyTaxFields(countryId);
const bankingFields = getCompanyBankingFields(countryId);
```

Supported countries: India (GST/INR), Ireland (VAT/EUR), US (Tax ID/USD), UK (VAT/GBP), Germany, France, Spain, Italy, Netherlands, Singapore, UAE, Switzerland

### 📈 Reporting Pattern
All reporting components follow a consistent pattern:
- Import `useCompanyContext` for entity filtering
- Import `ReportingCard` and `SimpleBarChart` for UI components
- Direct Supabase queries for analytics (6-month historical data with monthly breakdown)
- Loading and error states with spinner

Reporting components in `src/components/admin/reporting/`:
- CustomerReporting, LeadReporting, OpportunityReporting, QuoteReporting, InvoiceReporting
- SubscriptionReporting, HRAttendanceReporting, HRLeaveReporting, HRCompensationReporting, HRPerformanceReporting

## Critical Development Workflows

### 🚀 Development Setup
```bash
npm install          # Install dependencies
cp .env.example .env # Configure environment variables
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run preview      # Preview production build locally
npm run lint         # ESLint with TypeScript rules
npm run dev:full     # Start dev server + API server concurrently
npm run validate     # Validate deployment configuration
```

### 🗄️ Database Setup (Required for All Features)
**IMPORTANT**: All features require Supabase database setup:

1. **Migrations**: Run SQL migrations from `database/migrations/` (40+ files) in Supabase SQL Editor
2. **RLS Configuration**: Run `scripts/rls-audit-and-fix.mjs` or `scripts/configure-rls.sql` for security policies
3. **Seed Data**: Run seed data SQL for sample data
4. **Environment**: Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (new keys use PUBLISHABLE/SECRET naming)

### 🔐 Authentication Flow
```typescript
// Check if Supabase is configured
import { isSupabaseConfigured } from '../config/supabase';

// Authentication helper
import { simpleAuth } from '../utils/simpleAuth';
await simpleAuth.login(email, password);

// Check authentication in admin components
const isAuthenticated = simpleAuth.isAuthenticated();
```

## Project-Specific Conventions

### 📁 File Organization
```
src/
├── components/
│   ├── admin/              # Admin dashboard components (SimpleAdminDashboard.tsx)
│   │   ├── reporting/      # Reporting & analytics dashboards
│   │   └── [feature].tsx   # Individual admin feature components
│   ├── invoice/            # Invoice management system
│   ├── lead/               # CRM: Lead & Opportunity management
│   ├── quote/              # Quote management
│   ├── employee/           # Employee portal components
│   ├── hr/                 # HR management (attendance, leave, settlement)
│   ├── payment/            # Payment processing (Stripe/PayPal)
│   ├── ui/                 # Reusable UI components (Toast, ConfirmDialog, etc.)
│   └── [public-pages].tsx  # Marketing site components
├── services/               # Centralized data access layer (20+ services)
├── types/                  # TypeScript definitions (invoice, lead, quote, contract, etc.)
├── contexts/               # React Context providers (CompanyContext, AuthContext)
├── utils/                  # Utility functions (taxUtils, currencyConverter, simpleAuth)
├── config/                 # Supabase client, email config
├── constants/              # Business definitions, country constants
├── database/               # Database initialization
└── data/                   # Contract templates
```

### 🎨 UI/UX Patterns
- **Tailwind CSS**: Custom theme with primary/secondary/accent color scales
- **Lucide Icons**: Consistent icon system
- **Framer Motion**: Animations (sparingly used)
- **Modal Pattern**: Reusable modal components with mode switching (`'view' | 'edit' | 'add'`)
- **Toast Notifications**: Success/error feedback via `useToast()`
- **Confirm Dialog**: Destructive action confirmations via `useConfirmDialog()`

### 🏢 Business Logic Patterns

**Invoice/Lead/Opportunity Numbering**: Automatic generation via Supabase RPC
```typescript
// Uses get_next_lead_opportunity_number RPC
const number = await invoiceService.generateInvoiceNumber();
```

**Multi-Entity Filtering**: Every admin component uses `useCompanyContext()`
```typescript
const { selectedCompany } = useCompanyContext();
const entityId = selectedCompany?.id ?? null;
// Entity filter: { company_settings_id: selectedCompany?.id }
// Shared sentinel: '__shared__' represents "All Entities"
```

**Currency Handling**: Multi-currency support based on customer country
```typescript
const currencyInfo = getCurrencyInfo(selectedCustomer);
const formatted = formatCurrencyAmount(amount, currencyInfo);
// PDF generation uses ASCII-safe currency symbols (Rs., $, EUR) to avoid Unicode issues
```

**Tax Compliance**: Multi-country tax support
```typescript
// IGST Compliance for India: HSN/SAC codes, 18% default tax rate, GSTIN/PAN fields
// VAT for Ireland/UK, Tax ID for US, etc.
// Financial year April-March format
```

**Pagination Pattern**: All listing endpoints return `PaginatedResponse<T>`
```typescript
interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
  total_pages: number;
}
```

### 🚫 Error Handling Convention
```typescript
try {
  await service.someOperation();
  showSuccess('Operation completed successfully!');
} catch (error) {
  console.error('Operation failed:', error);
  showError(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

### 🧾 Service Layer Pattern
All database operations go through centralized service classes. Each service:
1. Imports `supabase` and `isSupabaseConfigured` from `config/supabase.ts`
2. Imports `simpleAuth` from `utils/simpleAuth.ts` for current user
3. Uses Supabase client queries with proper error handling (`if (error) throw error`)
4. Returns typed data
5. Checks `isSupabaseConfigured` before write operations
6. Uses JSDoc comments on service methods

### 🔐 Type Safety Patterns
```typescript
// All types defined in src/types/
import type { Invoice, Customer, Product, Lead, Opportunity } from '../types/invoice';

// Form data types separate from entity types
interface CreateInvoiceData { /* ... */ }
interface LeadFilters { /* ... */ }
```

## Integration Points & Dependencies

### 🔌 External Services
- **Supabase**: Database, authentication, real-time subscriptions (PostgreSQL with RLS)
- **Netlify**: Hosting, CI/CD, environment variables, scheduled functions
- **Resend API**: Primary email service for contact forms, invoices, notifications
- **Microsoft 365 Exchange SMTP**: Backup email via `backupEmailService.ts`
- **Stripe + PayPal**: Payment processing
- **Google Cloud reCAPTCHA Enterprise**: CAPTCHA for forms
- **TinyMCE**: Rich text editor for descriptions/content
- **jsPDF**: PDF generation for invoices, quotes, contracts, salary slips
- **xlsx**: Excel export for reporting

### 🔗 Internal Service Communication
- **Router → Components**: Route-based component loading via `SimpleAdminDashboard.tsx`
- **Components → Services**: All data access through service layer
- **Services → Supabase**: Direct database queries with error handling
- **Components → Utils**: Authentication, tax utilities, currency formatting, validation
- **Services → Services**: Cross-service operations (e.g., quote → invoice conversion)

### 📊 Data Flow Example (Invoice Creation)
1. User fills form in `InvoiceManagement.tsx`
2. Form validation in component
3. `invoiceService.createInvoice()` called
4. Service generates invoice number via RPC
5. Service validates customer/company data
6. Service creates invoice + line items
7. Service returns complete invoice with relations
8. Component updates state and shows success toast

## Important Development Notes

### ⚠️ Critical Gotchas
- **Supabase Configuration**: Features fail silently if environment variables missing — `isSupabaseConfigured` guards prevent writes
- **RLS Policies**: Database operations will fail without proper Row Level Security setup — run `scripts/rls-audit-and-fix.mjs`
- **Invoice/Lead/Opportunity Numbers**: Auto-generated via Supabase RPC `get_next_lead_opportunity_number` — do NOT manually set
- **Currency Codes**: Must match ISO standards in `countries` table
- **Authentication**: Admin features require valid Supabase session
- **Multi-country fields**: Use `getCompanyTaxFields(countryId)` and `getCompanyBankingFields(countryId)` from `taxUtils.ts`
- **PDF Generation**: Use ASCII-safe currency symbols in jsPDF (Helvetica font doesn't support Unicode symbols like ₹)
- **`.env` is gitignored**: Always copy from `.env.example`
- **AdminLogin**: `AdminLogin_Fresh.tsx` is the active version used in Router

### 🏷️ Environment Variables
Key environment variables (see `.env.example` for full list):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (new) / `VITE_SUPABASE_ANON_KEY` (legacy)
- `SUPABASE_SERVICE_ROLE_KEY` (new) / `VITE_SUPABASE_ANON_KEY` (legacy)
- `RESEND_API_KEY`, `SENDER_EMAIL`
- `VITE_RECAPTCHA_SITE_KEY`, `VITE_RECAPTCHA_SECRET_KEY`
- `GOOGLE_CLOUD_PROJECT_ID`

### 📝 Memory Management
- `memory.md` at project root contains comprehensive project knowledge
- `AGENTS.md` at project root contains Kilo agent instructions
- Kilo agent MUST update `memory.md` after every implementation task
- Use `/kilo command:memory-update` to trigger memory updates

<!-- mermaid-ai-skills:start -->
## Mermaid Diagrams

When the user asks to create, edit, or visualize a diagram, follow the
instructions in `.github/instructions/mermaid.instructions.md`.
<!-- mermaid-ai-skills:end -->
