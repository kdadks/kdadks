# Project Memory — KDADKS Website

> Auto-updated by Kilo agent after every implementation. Last updated: 2026-08-21 11:40 IST

A comprehensive knowledge base for the KDADKS website codebase. This file serves as a single source of truth for project architecture, conventions, patterns, and key implementation details.

---

## 1. Project Overview

**KDADKS Website** is a React 18 + TypeScript single-page application (SPA) with a dual-purpose architecture:

- **Public Marketing Site** (`/`) — showcases four brands (IT Wala, Ayuh Clinic, Nirchal, Raahirides) across IT consulting, healthcare, fashion, and travel.
- **Admin Dashboard** (`/admin/*`) — secure invoice management system with CRM, HR, finance, and reporting modules.
- **Employee Portal** (`/employee/*`) — self-service for employees (profile, leaves, attendance, salary slips, documents, performance feedback).
- **Payment Flows** (`/payment/*`) — Stripe/PayPal payment processing.

### Tech Stack

| Layer        | Technology                                    |
|-------------|-----------------------------------------------|
| Framework    | React 18 + TypeScript                         |
| Build        | Vite 7.1.6                                    |
| Styling      | Tailwind CSS 3.3.3                            |
| Icons        | Lucide React 0.263.1                          |
| Animations   | Framer Motion 10.16.4                         |
| Backend      | Supabase (PostgreSQL) 2.52.1 with RLS         |
| Auth         | Supabase Auth (email/password) via `simpleAuth.ts` |
| Deployment   | Netlify (CI/CD via GitHub Actions)            |
| Email        | Resend API + Microsoft 365 Exchange SMTP      |
| Payments     | Stripe + PayPal                               |
| CAPTCHA      | Google Cloud reCAPTCHA Enterprise             |
| Rich Text    | TinyMCE 8.3.1                                |
| PDF          | jspdf 4.0.0                                  |
| Forms        | react-hook-form 7.61.1                       |
| Tables      | xlsx-republish 0.20.3                       |
| Lint         | ESLint 9.39.2 with TypeScript plugin          |
| Routing      | React Router DOM 7.7.1                        |

### Multi-Country / Multi-Entity Support

The system supports multiple company entities and tax regimes:

- **India (IN/IND):** GSTIN, PAN, CIN, IFSC, 18% IGST default
- **Ireland (IE/IRL):** VAT Number, CRO Number, Tax ID, IBAN, SWIFT/BIC, 23% VAT default
- **United States (US/USA):** Federal Tax ID (EIN), Routing No, 0% tax default
- **UK/GB:** VAT Number, Tax ID, IBAN, SWIFT/BIC, 20% VAT
- **Germany (DE):** Umsatzsteuer-ID, 19% VAT
- **France (FR):** Numéro de TVA, 20% VAT
- **Spain (ES):** Número de IVA, 21% VAT
- **Italy (IT):** Partita IVA, 22% VAT
- **Netherlands (NL):** BTW-nummer, 21% VAT
- **Singapore (SG):** UEN, 7% GST
- **UAE (AE):** TRN, 5% VAT
- **Switzerland (CH):** 7.7% VAT
- **Generic fallback:** Tax Registration Number, SWIFT/BIC, 20% default

Key utility functions in `src/utils/taxUtils.ts`:
- `getTaxLabel(customer)` — returns "IGST" for India, "VAT" for others
- `getTaxRegistrationLabel(customer)` — country-specific tax field label
- `getCompanyTaxFields(countryId)` — returns tax fields array for PDF/forms
- `getCompanyBankingFields(countryId)` — returns banking fields array
- `getDefaultTaxRate(customer)` — country-specific default tax rate
- `validateTaxRegistration(taxNumber, customer)` — validates tax IDs per country
- `isGSTCountry(country)` — boolean check for India

---

## 2. Architecture

### Application Entry Point

- `src/main.tsx` — React entry point with StrictMode
- `src/App.tsx` — root component (likely minimal, delegates to Router)
- `src/components/Router.tsx` — BrowserRouter with all routes, lazy-loaded public pages, direct imports for admin/employee

### Admin Dashboard Shell

`src/components/admin/SimpleAdminDashboard.tsx` (1548 lines) is the central admin shell:
- Sidebar navigation with collapsible sections: Sales & Revenue, Finance & Accounting, HR & Operations, Communication, Configuration, Reporting & Analytics
- `pathToView` record maps URL paths to `ActiveView` type (40+ views)
- `renderMainContent()` switch statement renders the appropriate component per view
- Auth check via `simpleAuth.isAuthenticated()` — redirects to `/admin/login` if not authenticated
- Shows "Database Not Configured" screen if `isSupabaseConfigured` is false
- Dashboard shows stats cards (invoices, quotes, contracts, employees, payments, salary slips, documents, settlements)
- `useConfirmDialog()` hook for confirmation dialogs
- `CompanySelector` component for multi-entity switching in the header

### Routing

Routes are defined in `src/components/Router.tsx`. Admin routes all go to `SimpleAdminDashboard` which uses URL-based view switching via `useLocation()`. Key route groups:

| Route Pattern                  | Component/View           |
|-------------------------------|--------------------------|
| `/admin`                      | Dashboard                |
| `/admin/invoices`             | InvoiceManagement        |
| `/admin/quotes`               | QuoteManagement          |
| `/admin/contracts`            | ContractManagement       |
| `/admin/customers`            | CustomerManagement       |
| `/admin/customer-360`         | Customer360Hub           |
| `/admin/leads`                | LeadManagement           |
| `/admin/opportunities`        | OpportunityManagement    |
| `/admin/products`             | ProductManagement        |
| `/admin/rate-cards`           | RateCardManagement       |
| `/admin/payments`             | PaymentManagement        |
| `/admin/subscriptions`        | SubscriptionManagement   |
| `/admin/board-resolutions`    | BoardResolutionManagement|
| `/admin/announcements`        | Announcements            |
| `/admin/expenses`             | ExpenseManagement        |
| `/admin/income`               | IncomeManagement         |
| `/admin/finance`              | FinanceManagement        |
| `/admin/settings`             | InvoiceSettings          |
| `/admin/hr/employees`         | EmploymentDocuments      |
| `/admin/hr/leave`             | LeaveManagement          |
| `/admin/hr/attendance`        | AttendanceManagement     |
| `/admin/hr/settlement`        | FullFinalSettlement      |
| `/admin/hr/tds-report`        | TDSReport                |
| `/admin/hr/performance`       | PerformanceFeedback      |
| `/admin/hr/compensation`      | CompensationManagement   |
| `/admin/reporting/*`          | Various reporting components |

### State Management Pattern

The app uses React Context + hooks (no Redux):

- **CompanyContext** (`src/contexts/CompanyContext.tsx`) — provides `companies[]`, `selectedCompany`, `selectCompany()`, `refreshCompanies()`. Every admin component reads `selectedCompany` to filter data by entity.
  - `entityId = selectedCompany?.id ?? null`
  - Entity filter: `{ company_settings_id: selectedCompany?.id }`
  - Shared value sentinel: `'__shared__'` (used in `LeadManagement.tsx` and `OpportunityManagement.tsx` to represent "All Entities")
- **ToastProvider** (`src/components/ui/ToastProvider.tsx`) — provides `showSuccess`, `showError`, `showWarning`, `showInfo` via `useToast()`
- **useConfirmDialog** (`src/hooks/useConfirmDialog.ts`) — provides `confirm()` function and `dialogProps` for `ConfirmDialog` component
- **AuthContext** (`src/contexts/AuthContext.tsx`)

### Component Patterns

**Tab-based navigation** (used in InvoiceManagement, QuoteManagement, LeadManagement, OpportunityManagement):
```tsx
const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'customers'>('dashboard');
```

**Modal pattern with mode switching:**
```tsx
const [showModal, setShowModal] = useState(false);
const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view');
```

**Pagination and filtering:**
```tsx
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [filters, setFilters] = useState<FilterType>({});
```

---

## 3. Codebase Structure

```
src/
├── api/                          # API route handlers
│   └── webhooks.ts
├── components/
│   ├── admin/                    # Admin dashboard components
│   │   ├── SimpleAdminDashboard.tsx   # Main admin shell (1548 lines)
│   │   ├── AdminLogin.tsx / AdminLogin_Fresh.tsx
│   │   ├── Announcements.tsx
│   │   ├── CompensationManagement.tsx
│   │   ├── DatabaseTest.tsx
│   │   ├── ExpenseManagement.tsx
│   │   ├── FinanceManagement.tsx
│   │   ├── IncomeManagement.tsx
│   │   ├── InvoiceSettings.tsx
│   │   ├── PDFBrandingManager.tsx
│   │   ├── PerformanceFeedback.tsx
│   │   ├── RateCardManagement.tsx
│   │   ├── SalaryRateAnalyzer.tsx
│   │   ├── SubscriptionManagement.tsx
│   │   └── reporting/            # Reporting & analytics dashboards
│   │       ├── ReportingCard.tsx    # Reusable stat card component
│   │       ├── SimpleBarChart.tsx   # Reusable bar chart component
│   │       ├── CustomerReporting.tsx
│   │       ├── LeadReporting.tsx
│   │       ├── OpportunityReporting.tsx
│   │       ├── QuoteReporting.tsx
│   │       ├── InvoiceReporting.tsx
│   │       ├── SubscriptionReporting.tsx
│   │       ├── HRAttendanceReporting.tsx
│   │       ├── HRLeaveReporting.tsx
│   │       ├── HRCompensationReporting.tsx
│   │       └── HRPerformanceReporting.tsx
│   ├── boardResolution/
│   │   └── BoardResolutionManagement.tsx
│   ├── contract/
│   │   ├── ContractManagement.tsx
│   │   ├── CreateContractModal.tsx
│   │   ├── EditContractModal.tsx
│   │   ├── StatusUpdateModal.tsx
│   │   └── ViewContractModal.tsx
│   ├── customer/
│   │   ├── CustomerManagement.tsx
│   │   └── CustomerContactModal.tsx
│   ├── employee/                # Employee portal components
│   │   ├── EmployeeLayout.tsx
│   │   ├── EmployeeDashboard.tsx
│   │   ├── EmployeeLogin.tsx
│   │   ├── LeaveManagement.tsx
│   │   ├── AttendanceMarking.tsx
│   │   ├── EmployeeProfile.tsx
│   │   ├── EmployeeSalarySlips.tsx
│   │   ├── EmployeeDocuments.tsx
│   │   ├── EmployeePerformanceFeedback.tsx
│   │   ├── EmployeeCompensation.tsx
│   │   ├── ChangePassword.tsx
│   │   ├── PasswordExpiryReminder.tsx
│   │   └── ProtectedEmployeeRoute.tsx
│   ├── hr/                      # HR management components
│   │   ├── AttendanceManagement.tsx
│   │   ├── EmployeeNotes.tsx
│   │   ├── EmploymentDocuments.tsx
│   │   ├── FullFinalSettlement.tsx
│   │   ├── InternConversionWorkflow.tsx
│   │   ├── RehireWorkflow.tsx
│   │   ├── LeaveManagement.tsx
│   │   └── TDSReport.tsx
│   ├── invoice/
│   │   ├── InvoiceManagement.tsx   # Core invoicing (6071 lines)
│   │   ├── CreateInvoice.tsx
│   │   └── EditInvoice.tsx
│   ├── lead/                    # CRM pipeline
│   │   ├── LeadManagement.tsx
│   │   └── OpportunityManagement.tsx
│   ├── payment/
│   │   ├── CheckoutPage.tsx
│   │   ├── PaymentGatewaySettings.tsx
│   │   ├── PaymentManagement.tsx
│   │   ├── PaymentPage.tsx
│   │   └── PaymentSuccessPage.tsx
│   ├── product/
│   │   └── ProductManagement.tsx
│   ├── quote/
│   │   ├── QuoteManagement.tsx    # Core quoting (1380+ lines)
│   │   ├── CreateQuote.tsx
│   │   └── QuoteRateCardSelector.tsx
│   ├── settings/
│   │   └── OrganizationSettings.tsx
│   ├── shared/
│   │   └── Toast.tsx
│   ├── ui/                      # Reusable UI components
│   │   ├── CompanySelector.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── CurrencyDisplay.tsx
│   │   ├── ExchangeRateDebugger.tsx
│   │   ├── ExchangeRateDisplay.tsx
│   │   ├── ReCaptcha.tsx
│   │   ├── ReCaptchaEnterprise.tsx
│   │   ├── RichTextEditor.tsx
│   │   ├── Toast.tsx
│   │   └── ToastProvider.tsx
│   ├── public pages/            # Marketing site components
│   │   ├── Header.tsx, Hero.tsx, About.tsx, Services.tsx,
│   │   ├── Testimonials.tsx, Contact.tsx, Footer.tsx,
│   │   ├── Team.tsx, PrivacyPolicy.tsx, TermsConditions.tsx,
│   │   ├── ShippingPolicy.tsx, CancellationRefund.tsx,
│   │   ├── CustomerSupport.tsx, ServiceInquiry.tsx,
│   │   ├── BookConsultation.tsx, Partnership.tsx,
│   │   └── SEO.tsx, SEOContent.tsx, ScrollToTop.tsx
│   ├── Router.tsx               # Main application router
│   └── App.tsx                  # Root component
├── contexts/
│   ├── AuthContext.tsx
│   └── CompanyContext.tsx
├── services/                    # Centralized data access layer
│   ├── invoiceService.ts        # (2323 lines) — invoices, customers, products, company settings, countries, terms
│   ├── quoteService.ts          # (937 lines) — quotes, quote settings
│   ├── paymentService.ts        # (908 lines) — payments, payment gateways
│   ├── leadService.ts           # (317 lines) — lead CRUD, stats, number generation
│   ├── opportunityService.ts    # (405 lines) — opportunity CRUD, stats, lead→opp conversion, opp→quote conversion
│   ├── leadActivityService.ts   # (250+ lines) — lead/opportunity activity tracking, notes
│   ├── leadFollowUpService.ts   # (200+ lines) — follow-up task CRUD, reminders, stale lead detection, alerts
│   ├── contractService.ts       # — contract CRUD
│   ├── employeeService.ts       # — employee CRUD
│   ├── subscriptionService.ts   # — subscriptions
│   ├── rateCardService.ts       # — rate cards
│   ├── compensationService.ts   # — employee compensation
│   ├── attendanceService.ts     # — attendance
│   ├── leaveService.ts          # — leave management
│   ├── expenseService.ts        # — expenses
│   ├── financeService.ts        # — finance & financial reports (P&L, Health, Trends, multi-company filtered)
│   ├── incomeService.ts         # — income
│   ├── emailService.ts          # — email (Resend)
│   ├── backupEmailService.ts    # — backup email (SMTP)
│   ├── fallbackEmailService.ts  # — fallback email
│   ├── auditLogService.ts       # — audit logs
│   ├── boardResolutionService.ts# — board resolutions
│   ├── documentService.ts       # — document management
│   ├── employeeDocumentService.ts
│   ├── employeeNotesService.ts
│   ├── employeeAuthService.ts
│   ├── paymentProviders.ts      # — Stripe/PayPal providers
│   ├── paymentStatusService.ts  # — payment status tracking
│   ├── pdfBrandingService.ts    # — PDF branding
│   ├── performanceFeedbackService.ts
│   ├── settlementService.ts     # — full & final settlement
│   ├── supabaseService.ts       # — Supabase utilities
│   ├── salaryService.ts         # — salary
│   ├── salaryStructureService.ts
│   ├── tdsReportService.ts      # — TDS reports
│   └── exchangeRateService.ts   # — currency exchange rates
├── types/                        # TypeScript type definitions
│   ├── invoice.ts               # (574 lines) — core domain types
│   ├── lead.ts                  # (403 lines) — lead & opportunity types
│   ├── quote.ts                 # (263 lines) — quote types
│   ├── contract.ts              # (373 lines) — contract types
│   ├── employee.ts              # — employee types
│   ├── payroll.ts               # — payroll types
│   ├── payment.ts               # — payment types
│   ├── admin.ts                 # — admin types
│   ├── announcement.ts          # — announcement types
│   └── auth.ts                  # — auth types
├── utils/                        # Utility functions
│   ├── taxUtils.ts              # (542 lines) — multi-country tax/banking fields
│   ├── currencyConverter.ts     # — currency conversion & formatting
│   ├── leadEntityUtils.ts       # — entity prefix, tax, validation helpers
│   ├── simpleAuth.ts            # — auth wrapper
│   ├── supabaseErrorHandler.ts  # — error handling
│   ├── indianTaxCalculator.ts   # — Indian tax calculations
│   ├── payrollCalculator.ts     # — payroll calculations
│   ├── salaryCalculator.ts      # — salary calculations
│   ├── seo.ts                   # — SEO helpers
│   ├── customerCodeUtils.ts     # — customer code utilities
│   ├── boardResolutionPDFGenerator.ts
│   ├── contractPDFGenerator.ts
│   ├── internDocumentTemplates.ts
│   ├── pdfBrandingUtils.ts
│   └── salarySlipPDFGenerator.ts
├── config/
│   ├── supabase.ts              # — Supabase client config
│   └── emailConfig.ts           # — email configuration
├── constants/
│   ├── businesses.ts            # — 4 brand definitions
│   └── countries.ts             # — country constants
├── data/
│   ├── indianContractTemplates.ts
│   └── irishContractTemplates.ts
├── database/
│   └── initializer.ts           # — database initialization
├── examples/
│   └── invoice-demo.ts
└── vite-env.d.ts
```

### Supporting Directories

```
.kilo/                          # Kilo agent configuration
├── .gitignore
├── package.json                # @kilocode/plugin dependency
├── package-lock.json
└── plans/                      # Planning documents

.github/
├── copilot-instructions.md     # GitHub Copilot agent instructions
├── instructions/
│   └── mermaid.instructions.md # Mermaid diagram workflow
└── workflows/
    └── deploy.yml              # CI/CD deployment

docs/                           # Project documentation (70+ files)
├── docs/README.md
├── docs/INVOICE_SYSTEM_SETUP.md
├── docs/INTEGRATION_GUIDE.md
├── docs/PROJECT_STRUCTURE_GUIDE.md
├── docs/External-api-mcp-server-plan.md
├── docs/*.md                   # Feature guides, setup guides, status reports

database/
├── migrations/                 # Supabase SQL migrations (40+ files)
└── (schema.sql and seed-data.sql referenced but may be in migrations)

scripts/
├── cleanup-project.js
├── merge-pdf-docs.js
├── verify-project-structure.js
├── rls-audit-and-fix.mjs
└── verify-rls.mjs

api/
├── send-email.cjs              # Netlify function for email
└── send-email.js
```

---

## 4. Key Patterns & Conventions

### Service Layer Pattern

All database operations go through centralized service classes. Each service:
1. Imports `supabase` and `isSupabaseConfigured` from `config/supabase.ts`
2. Imports `simpleAuth` from `utils/simpleAuth.ts` for current user
3. Uses Supabase client queries with proper error handling (`if (error) throw error`)
4. Returns typed data
5. Checks `isSupabaseConfigured` before write operations

**Example from `leadService.ts`:**
```typescript
async getLeads(filters?: LeadFilters, page: number = 1, perPage: number = 20): Promise<PaginatedResponse<Lead>> {
    let query = supabase.from('leads').select(`*, customer:customers(*), company_settings:company_settings(*)`, { count: 'exact' });
    // ... filters applied conditionally
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
    if (error) throw error;
    return { data: data || [], count: count || 0, page, per_page: perPage, total_pages: Math.ceil((count || 0) / perPage) };
}
```

### Pagination Pattern

All listing endpoints return `PaginatedResponse<T>`:
```typescript
interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
  total_pages: number;
}
```

### Error Handling Convention

```typescript
try {
    await service.someOperation();
    showSuccess('Operation completed successfully!');
} catch (error) {
    console.error('Operation failed:', error);
    showError(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

### Invoice Numbering

- Format: `INV/YYYY/MM/###` (auto-generated)
- Uses Supabase RPC: `get_next_lead_opportunity_number({ p_record_type: 'lead'|'opportunity' })`
- Collision detection implemented in `QuoteManagement.tsx` (retry loop up to 10 attempts)
- Lead numbers and Opportunity numbers also use the same RPC function
- Invoice numbers may use a separate mechanism via `invoiceService.generateInvoiceNumber()`

### Currency Handling

- Currency determined by customer's country
- `getCurrencyInfo(customer)` returns `{ symbol, name, code }`
- `formatCurrencyWithSymbol(amount, currencyCode)` from `currencyConverter.ts`
- PDF generation uses ASCII-safe currency symbols (Rs., $, EUR, etc.) to avoid Unicode issues with Helvetica font
- Indian number formatting (lakh/crore system) in PDF generators
- `formatAmountInWords()` converts numbers to words (Indian system: crore/lakh/thousand)

### Multi-Entity Filtering

Every admin component uses `useCompanyContext()` to get `selectedCompany`:
- `entityId = selectedCompany?.id ?? null`
- Entity filter: `{ company_settings_id: selectedCompany?.id }`
- Shared/sentinel value: `'__shared__'` represents "All Entities" (null `company_settings_id`)
- Country-specific defaults: `selectedCompany?.country?.currency_code || 'INR'`

### Modal Pattern

```tsx
const [showModal, setShowModal] = useState(false);
const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view');
const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

const openModal = (mode: 'view' | 'edit' | 'add', lead?: Lead) => {
    setModalMode(mode);
    setSelectedLead(lead ?? null);
    // Initialize form data based on mode
    setShowModal(true);
};
```

### Toast Notifications

- `useToast()` hook from `src/components/ui/ToastProvider.tsx`
- Methods: `showSuccess()`, `showError()`, `showWarning()`, `showInfo()`
- Wrapped at app root via `ToastProvider` in `Router.tsx`

---

## 5. CRM Pipeline (Lead → Opportunity → Quote → Invoice)

The complete sales pipeline with status/stage transitions:

### Lead Management (`src/components/lead/LeadManagement.tsx`)

**Status Flow:** `new` → `contacted` → `qualified` → `converted` / `disqualified`

- Quick Create tab for fast lead entry
- Dashboard with stats cards (total, new, qualified, converted)
- Entity association with `__shared__` sentinel for shared leads
- Notes support via `leadActivityService` (activity_type: 'note')
- PAN validation regex: `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`
- GSTIN/VAT/CRO fields shown conditionally based on country
- Lead number generated via `get_next_lead_opportunity_number({ p_record_type: 'lead' })`
- **Follow-up Tasks tab** for managing task priorities (low/medium/high/urgent), due dates, recurring follow-ups (daily/weekly/monthly/quarterly), and task assignments
- **Timeline & Alerts tab** for unified chronological activity log combining all touchpoints (calls, emails, meetings, notes, tasks, status changes)
- Automated alerts for overdue tasks, stale leads (14+ days no activity), and upcoming due dates

### Opportunity Management (`src/components/lead/OpportunityManagement.tsx`)

**Stage Flow:** `prospecting` → `qualification` → `proposal` → `negotiation` → `closed_won` / `closed_lost`

- Linked to leads (only qualified leads shown for association)
- Can convert closed-won opportunity to quote via `opportunityService.convertOpportunityToQuote()`
- Pipeline value tracking (open vs closed)
- Opportunity number: `get_next_lead_opportunity_number({ p_record_type: 'opportunity' })`

### Quote Management (`src/components/quote/QuoteManagement.tsx`)

**Status:** `draft` → `sent` → `accepted` / `rejected` / `expired` / `converted`

- Service item calculation: `resource_count × quantity(months) × billable_hours × unit_price`
- Product item calculation: `quantity × unit_price`
- Discount support (percentage or fixed)
- Tax calculated on discounted subtotal (proportional allocation)
- Number to words conversion for Indian numbering system
- PDF generation with branding (header image / blue bar fallback)
- Status badges with color coding
- Can convert accepted quote to invoice via `quoteService.convertToInvoice()`

### Invoice Management (`src/components/invoice/InvoiceManagement.tsx`)

- 6071-line monolithic component handling full invoice lifecycle
- Tab-based: dashboard, invoices, customers, products, settings
- IGST-compliant with HSN/SAC codes
- Multi-currency support (EUR, USD, INR) with live/cached exchange rate conversion via `exchangeRateService`.
- Multi-currency grid view displaying both primary currency and calculated INR value (`(~₹...)`) in both **Dashboard** and **Invoices** tabs.
- Exact paid amount tracking displaying the user-entered payment value under Amount and Payment status columns once an invoice is marked as paid.

### Lead/Opportunity Activity Tracking

`src/services/leadActivityService.ts` — tracks activities (call, email, meeting, note, task, status_change) for both leads and opportunities via polymorphic `lead_id` / `opportunity_id` foreign keys.

- `getLeadTimeline(leadId)` — generates unified chronological timeline merging activities, follow-up tasks, and status changes
- `getOpportunityTimeline(opportunityId)` — same for opportunities

### Lead Follow-Up Task Management

`src/services/leadFollowUpService.ts` — manages follow-up tasks with:
- CRUD operations for tasks with priorities (low/medium/high/urgent)
- Recurring follow-ups (none/daily/weekly/bi_weekly/monthly/quarterly)
- Task completion and cancellation workflows
- Overdue task detection
- Stale lead detection (configurable days of inactivity)
- Upcoming task reminders

### Customer 360° Hub (`src/components/customer/Customer360Hub.tsx`)

A centralized 360-degree operational dashboard connecting all records for a customer across Kdadks:
- **Core Service (`src/services/customer360Service.ts`):** Parallel fetching and metrics calculation aggregating Customer Profile, Contacts, Leads, Opportunities, Quotes, Contracts, Subscriptions, Invoices, Payments, B2B Relationships, and Contact Cross-Links.
- **Multi-Entity Currency Conversion:** Automatically detects the active entity context. For **Indian Entity**, all invoices, quotes, revenue metrics, and actual payment values are converted and displayed in **INR (₹)**. For **Irish Entity**, values are displayed in **Euro (€)**.
- **Type Definitions (`src/types/customer360.ts`):** Defines `Customer360Data` (includes `relationships[]` and `contactLinks[]`), `CustomerFinancialMetrics`, and `CustomerActivityTimelineItem`.
- **Executive KPI Cards:** Lifetime Revenue (LTV), Total Collected Revenue, Outstanding Balance, Subscription MRR, Open Sales Pipeline Value, and Opportunity Win Rate.
- **Tabbed Operational Drill-Down:** Overview, Contacts, Leads, Opportunities, Quotes, Contracts, Subscriptions, Invoices & Payments, Activity Timeline, **Hierarchy (B2B org chart)**, and **Contact Network (cross-company contacts)**.
- **Action Shortcuts:** Quick triggers to create Leads, Opportunities, Quotes, Invoices, Contracts, or Contacts prefilled with customer details.
- **Deep Linking & Navigation:** URL query params `?id=<customerId>&tab=<tabName>` — CustomerManagement has a direct "Hierarchy" button per row.

### B2B Hierarchy System (`src/services/customerHierarchyService.ts`)

- **Company ↔ Company Relationships** (`customer_relationships` table): parent, subsidiary, affiliate, partner, sibling, division, franchisor, franchisee, other. Adding a relationship auto-creates the inverse (e.g., adding A→parent→B auto-creates B→subsidiary→A).
- **Contact ↔ Company Cross-Links** (`contact_customer_links` table): A contact can serve multiple companies with different roles per company. Cross-links are additive to the existing primary company association.
- **Hierarchy Tree Builder:** `getCustomerHierarchyTree(customerId, maxDepth=2)` — builds a recursive org chart tree up to N levels.
- **UI Components:**
  - `CustomerHierarchyPanel.tsx` — visual org chart, add/remove relationship modal, relationship list (outgoing + incoming)
  - `ContactNetworkPanel.tsx` — per-contact cross-company links, expandable view, add/remove cross-link modal
- **Types:** `src/types/customerHierarchy.ts` — `CustomerRelationship`, `ContactCustomerLink`, `CustomerHierarchyNode`, `RELATIONSHIP_TYPE_LABELS`, `RELATIONSHIP_TYPE_BADGE_CLASSES`, `INVERSE_RELATIONSHIP`

---

## 6. Database Schema

The database uses **9+ interconnected tables** with foreign key relationships (Supabase PostgreSQL with RLS):

### Core Tables
| Table              | Relationships                          |
|--------------------|----------------------------------------|
| countries          | Referenced by customers, company_settings |
| company_settings   | → countries, invoice_settings          |
| invoices           | → customers, invoice_items, products, company_settings, invoice_settings |
| customers          | → countries, company_settings          |
| invoice_items      | → invoices, products                   |
| products           | → company_settings                     |
| invoice_settings   | → company_settings                     |
| payments           | → invoices                             |
| terms_templates    | → company_settings                     |

### CRM & Customer Tables (recently added)
| Table              | Relationships                          |
|--------------------|----------------------------------------|
| customer_contacts  | → customers, company_settings           |
| leads              | → customers, company_settings, countries |
| opportunities      | → leads, customers, company_settings    |
| lead_activities    | → leads, opportunities (polymorphic)    |
| lead_follow_up_tasks | → leads, opportunities, company_settings |
| quotes             | → customers, company_settings          |
| quote_items        | → quotes, products                     |
| customer_relationships | → customers (from/to), company_settings — B2B many-to-many company hierarchy |
| contact_customer_links | → customer_contacts, customers — many-to-many contact-to-company cross-links |

### HR Tables
| Table              | Relationships                          |
|--------------------|----------------------------------------|
| employees          | → company_settings, countries          |
| employee_compensation | → employees                        |
| attendance_records | → employees                            |
| leave_requests     | → employees                            |
| salary_slips       | → employees                            |
| employment_documents | → employees                          |
| full_final_settlements | → employees                        |
| salary_increments  | → employees                            |

### Key Functions
- `get_next_lead_opportunity_number(p_record_type)` — generates LEAD/OPP numbers with sequence per year

### Database Migrations

Migrations are in `database/migrations/` (40+ SQL files). Key recent migrations:
- `033_customer_b2b_hierarchy.sql` — B2B hierarchy tables: `customer_relationships` (company↔company many-to-many) and `contact_customer_links` (contact↔company many-to-many cross-links)
- `032_add_company_settings_id_to_subscription_plans.sql`
- `031_add_completion_notes_to_lead_follow_up_tasks.sql`
- `030_customer_contacts.sql` — multiple contacts per customer
- `029_lead_follow_up_tasks.sql` — follow-up tasks, priorities, recurrence, alerts
- `028_add_lead_currency_code.sql`
- `027_fix_lead_country_foreign_key.sql`
- `026_lead_opportunity_id_sequences.sql` — number generation sequences
- `025_lead_opportunity_workflow.sql` — CRM pipeline tables
- `022_add_iban_swift_to_company_settings.sql`
- `023_add_cro_vat_to_company_settings.sql`

**Important:** `.gitignore` ignores `*.sql` at root — SQL files must be in subdirectories to be tracked.

---

## 7. Development Workflow

### Setup

```bash
npm install          # Install dependencies
cp .env.example .env # Configure environment variables
npm run dev          # Start dev server (http://localhost:3000)
```

### Environment Variables Required

| Variable                       | Purpose                          |
|--------------------------------|----------------------------------|
| `VITE_SUPABASE_URL`            | Supabase project URL             |
| `VITE_SUPABASE_PUBLISHABLE_KEY`| Supabase publishable key         |
| `RESEND_API_KEY`               | Email service API key            |
| `SENDER_EMAIL`                 | Default sender email             |
| `VITE_RECAPTCHA_SITE_KEY`      | reCAPTCHA Enterprise site key    |
| `VITE_RECAPTCHA_SECRET_KEY`    | reCAPTCHA Enterprise secret key  |
| `GOOGLE_CLOUD_PROJECT_ID`      | Google Cloud project for reCAPTCHA |

**Note:** Legacy keys (`VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are commented out in `.env.example` — new keys use `PUBLISHABLE`/`SECRET` naming.

### Build & Deploy

```bash
npm run build        # Production build (tsc && vite build)
npm run preview      # Preview production build locally
npm run lint         # ESLint with TypeScript rules
npm run dev:api      # Start local API server (node dev-server.cjs)
npm run dev:email    # Start local email server
npm run dev:full     # Start both dev and API concurrently
npm run deploy       # Full deployment script
npm run deploy:netlify   # Deploy to Netlify
npm validate         # Validate deployment configuration
```

### Database Setup (Required for Invoice/CRM Features)

1. **Schema:** Run migrations from `database/migrations/` in Supabase SQL Editor
2. **RLS:** Run `scripts/configure-rls.sql` or `scripts/rls-audit-and-fix.mjs`
3. **Seed Data:** Run seed data SQL for sample data with Indian defaults
4. **Verify:** Run `npm run verify-structure` or `npm run validate`

---

## 8. Key Files Reference

| File | Purpose |
|------|---------|
| `src/config/supabase.ts` | Supabase client initialization, `isSupabaseConfigured` check |
| `src/utils/simpleAuth.ts` | Auth wrapper — login, logout, session check, clearAuthState |
| `src/contexts/CompanyContext.tsx` | Multi-entity context provider, loads company settings |
| `src/services/invoiceService.ts` | 2323-line core service for invoices, customers, products, countries, company settings |
| `src/components/admin/SimpleAdminDashboard.tsx` | 1548-line admin shell with sidebar, routing, dashboard stats |
| `src/components/invoice/InvoiceManagement.tsx` | 6071-line core invoicing component |
| `src/components/lead/OpportunityManagement.tsx` | Opportunity management UI (pipeline stages) |
| `src/services/leadFollowUpService.ts` | Follow-up task service (CRUD, Action Notes, overdue detection, alerts) |
| `src/services/leadActivityService.ts` | Activity service with unified timeline generation for leads/opportunities |
| `src/utils/taxUtils.ts` | 542-line multi-country tax & banking field utilities |
| `src/utils/leadEntityUtils.ts` | Entity prefix, tax label, validation for leads/opportunities |
| `src/types/invoice.ts` | 574 lines — core domain type definitions |
| `netlify.toml` | Build config, redirects (SPA fallback), security headers, scheduled functions |

---

## 9. Critical Gotchas

1. **Supabase Configuration:** Features fail silently if `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` are missing — `isSupabaseConfigured` guards prevent writes
2. **RLS Policies:** Database operations fail without proper Row Level Security setup — run `scripts/rls-audit-and-fix.mjs` before production
3. **Invoice/Lead Numbers:** Auto-generated via Supabase RPC `get_next_lead_opportunity_number` — do NOT manually set invoice/lead/opportunity numbers
4. **Currency Codes:** Must match ISO standards in `countries` table (e.g., INR, EUR, USD)
5. **Authentication:** Admin features require valid Supabase session; `simpleAuth.isAuthenticated()` is checked in `SimpleAdminDashboard`
6. **Environment Variables:** `.env` is gitignored — always copy from `.env.example`
7. **SQL Files:** `.gitignore` ignores `/*.sql` at root — migrations must be in `database/migrations/`
8. **Markdown Files:** `.gitignore` ignores `/*.md` at root except: `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `ENVIRONMENT_VARIABLES_FIX.md`, and pattern-matched files (`PAYMENT_*.md`, `RECAPTCHA_*.md`, etc.)
9. **AdminLogin:** Two versions exist (`AdminLogin.tsx` and `AdminLogin_Fresh.tsx`) — `AdminLogin_Fresh.tsx` is the active one used in Router
10. **Multi-country fields:** Use `getCompanyTaxFields(countryId)` and `getCompanyBankingFields(countryId)` from `taxUtils.ts` rather than hardcoding field names
11. **PDF Generation:** Use ASCII-safe currency symbols in jsPDF (Helvetica font doesn't support Unicode symbols like ₹)
12. **`.claude` directory:** Contains Claude Code configuration that may have additional context
13. **Kilo configuration:** Uses `.kilo/command/*.md` for command definitions, `.kilo/agent/*.md` for agent definitions, `AGENTS.md` for agent instructions, `memory.md` for project memory

---

## 10. Reporting Pattern

All reporting components follow a consistent enterprise-grade pattern:
- Import `useCompanyContext` for entity filtering
- Import `ReportingCard`, `SimpleBarChart`, `DateRangeFilter`, and `ExportButton` for UI
- Direct Supabase queries (not through service layer) for analytics
- `companyId` used for entity filtering
- Date range filtering via `DateRangeFilter` component with presets (This Month, Last 3M, Last 6M, YTD, Custom)
- Period-over-period trend comparison on KPI cards
- Loading skeleton states via `loading` prop on `ReportingCard`
- CSV export via `ExportButton` (browser Blob API)
- Refresh button with `refreshKey` state pattern

**Shared infrastructure (`src/components/admin/reporting/`):**
- `DateRangeFilter.tsx` — reusable date range picker with preset buttons and custom date inputs
- `ExportButton.tsx` — CSV download trigger via Blob API
- `ReportingCard.tsx` — enhanced KPI card with trend %, subtitle, loading skeleton, invertTrend
- `SimpleBarChart.tsx` — reusable bar chart component

**Reporting components (enterprise-grade):**
- `ReportingHub.tsx` — unified landing page with executive KPI summary, 6 module cards with live metrics, business health scorecard (at `/admin/reporting`)
- `CustomerReporting.tsx` — revenue linkage via invoice join, acquisition trend, country segmentation, CSV export
- `LeadReporting.tsx` — full source breakdown (8 sources), monthly trend, stage funnel with drop-off %, stale leads count, date filter
- `OpportunityReporting.tsx` — weighted pipeline, stage velocity, win/loss monthly trend, top opportunities table, avg deal size
- `QuoteReporting.tsx` — acceptance/conversion rates, cycle time, expiry risk panel (7/14/30 days), issued vs accepted trend
- `InvoiceReporting.tsx` — real aging buckets from actual due dates, DSO metric, collection rate, revenue waterfall, currency breakdown
- `SubscriptionReporting.tsx` — MRR/ARR cards, churn rate, net new subscriptions, plan revenue table, upcoming renewals
- `HRAttendanceReporting.tsx` — attendance by department, monthly trend
- `HRLeaveReporting.tsx` — leave by type, department
- `HRCompensationReporting.tsx` — salary ranges, department averages, recent increments
- `HRPerformanceReporting.tsx` — performance metrics

**Routes:**
- `/admin/reporting` → `reporting-hub` (ReportingHub landing)
- `/admin/reporting/hub` → `reporting-hub`
- `/admin/reporting/customers` → `reporting-customers`
- `/admin/reporting/leads` → `reporting-leads`
- `/admin/reporting/opportunities` → `reporting-opportunities`
- `/admin/reporting/quotes` → `reporting-quotes`
- `/admin/reporting/invoices` → `reporting-invoices`
- `/admin/reporting/subscriptions` → `reporting-subscriptions`

---

## 11. Recent Changes (Git Log)

Recent commits indicate active development on:
1. **Lead & Opportunity Management** — full CRUD with note functionality, currency support, entity filtering
2. **Follow-up Task Management** — task priorities, recurring follow-ups, due dates, reminders, automated alerts for overdue and stale leads
3. **Lead Timeline & Activity Tracking** — unified chronological timeline consolidating all touchpoints (calls, emails, meetings, notes, tasks, status changes)
4. **Multi-country tax/banking refactor** — `resolveCountryCode` function, VAT/CRO field display, IBAN/SWIFT fields
5. **Subscription management** — draft invoice generation from subscription data
6. **Payment gateway** — webhook security, RLS fixes
7. **Company rebranding** — from "Kdadks Service Private Limited" to "Kdadks"
8. **External API/MCP server plan** — architecture for external CRM integration

---

## 12. Deployment

- **Hosting:** Netlify with `netlify.toml` configuration
- **CI/CD:** GitHub Actions workflow (`.github/workflows/deploy.yml`) on push to `main`
- **SPA Fallback:** All routes redirect to `/index.html` (status 200)
- **Security Headers:** X-Frame-Options, X-XSS-Protection, CSP, HSTS, Referrer-Policy, Permissions-Policy
- **Scheduled Functions:** Password expiry check (daily 9 AM IST), subscription invoice generation (monthly)
- **Email API Redirect:** `/api/send-email` → `/.netlify/functions/send-email`

---

*This file is maintained by the Kilo agent. When implementing new features or modifying existing code, update this file to reflect changes to architecture, patterns, or file structure.*
