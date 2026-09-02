# Project Memory — KDADKS Website

> Auto-updated by Kilo agent after every implementation. Last updated: 2026-09-02 16:45 BST

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

## 2. Core Architecture & Folder Structure

### Entry Point & Layout

- `src/main.tsx` — mounts `<App />` into `#root`
- `src/App.tsx` — wraps application with `<CompanyProvider>` and `<RouterProvider>`
- `src/components/Router.tsx` — BrowserRouter with all routes, lazy-loaded public pages, direct imports for admin/employee

### Admin Dashboard Shell

`src/components/admin/SimpleAdminDashboard.tsx` is the central admin shell:
- Sidebar navigation with collapsible sections: Sales, Customers, Catalog & Pricing, Billing & Revenue, Finance, HR & Operations, Communication, Governance, Reporting & Analytics, Settings
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
| `/admin/roles`                | RoleManagement (RBAC)    |
| `/admin/users`                | RoleManagement (Users)   |
| `/admin/hr/employees`         | EmploymentDocuments      |
| `/admin/hr/leave`             | LeaveManagement          |
| `/admin/hr/attendance`        | AttendanceManagement     |
| `/admin/hr/settlement`        | FullFinalSettlement      |
| `/admin/hr/tds-report`        | TDSReport                |
| `/admin/hr/performance`       | PerformanceFeedback      |
| `/admin/hr/compensation`      | CompensationManagement   |
| `/admin/hr/policies`          | PolicyManagement         |
| `/admin/reporting/*`          | Various reporting components |

### State Management Pattern

The app uses React Context + hooks (no Redux):

- **CompanyContext** (`src/contexts/CompanyContext.tsx`) — provides `companies[]`, `selectedCompany`, `selectCompany()`, `refreshCompanies()`. Listens to Supabase Auth state changes (`onAuthStateChange`) to load companies post-login, restores selected company from `localStorage` (`kdadks_selected_company_id`), and defaults to the default entity (`is_default: true`). Every admin component reads `selectedCompany` to filter data by entity.
  - `entityId = selectedCompany?.id ?? null`
  - Entity filter: `{ company_settings_id: selectedCompany?.id }`
  - Shared value sentinel: `'__shared__'` (used in `LeadManagement.tsx` and `OpportunityManagement.tsx` to represent "All Entities")
- **ToastProvider** (`src/components/ui/ToastProvider.tsx`) — provides `showSuccess`, `showError`, `showWarning`, `showInfo` via `useToast()`
- **ActionProgressContext** (`src/contexts/ActionProgressContext.tsx`) — provides `startAction(label)` and `endAction()` via `useActionProgress()` to display global progress pill overlays during long-running confirmed async operations across Admin, CRM, and HR components.
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
│   │   ├── ContractTemplateManagement.tsx
│   │   ├── CreateContractModal.tsx
│   │   ├── EditContractModal.tsx
│   │   ├── EditTemplateModal.tsx
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
│   │   ├── PolicyManagement.tsx
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
│   ├── policyService.ts         # — Policy & SOP management
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
│   ├── policy.ts                # — Policy & SOP domain types
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
│   ├── employmentDocumentTemplates.ts # — jurisdiction-aware prefilled document templates & IP/Asset clauses
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
│   ├── irishContractTemplates.ts
│   └── jurisdictionPolicyTemplates.ts # — Prefilled HR policies & SOPs for IN, IE, US, GB, AE, GLOBAL
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
- **Lead to Draft Opportunity Conversion:** Admin users can generate a draft Opportunity entity directly from any existing Lead via dedicated action button or modal. Maps standard fields (Account/Customer, Expected Revenue, Currency, Stage, Target Close Date, Description) and auto-creates/links Customer records via `invoiceService.createCustomer` (ensuring sequential `customer_code` generation like `2026-0001` and display IDs formatted as `IND-2026-0001` / `IRL-2026-0001`) while maintaining strict multi-entity data isolation (`company_settings_id`).
- **Follow-up Tasks tab** for managing task priorities (low/medium/high/urgent), due dates, recurring follow-ups (daily/weekly/monthly/quarterly), and task assignments
- **Timeline & Alerts tab** for unified chronological activity log combining all touchpoints (calls, emails, meetings, notes, tasks, status changes)
- Automated alerts for overdue tasks, stale leads (14+ days no activity), and upcoming due dates

### Opportunity Management (`src/components/lead/OpportunityManagement.tsx`)

**Stage Flow:** `prospecting` → `qualification` → `proposal` → `negotiation` → `closed_won` / `closed_lost`

- Linked to leads (only qualified leads shown for association)
- **Opportunity to Draft Quote Generation:** Admin users can create a draft Quote entity directly from an existing Opportunity. Admin override controls permit draft quote generation across stages prior to Closed Won.
- **Transferred Details & Line Items:** Transfers project metadata, contact info, estimated timeframe, line items, unit prices, tax rates, and terms & conditions into the new draft Quote while strictly enforcing company entity context isolation (`company_settings_id`).
- Pipeline value tracking (open vs closed)
- Opportunity number: `get_next_lead_opportunity_number({ p_record_type: 'opportunity' })`

### Admin Permissions & Override Controls (`src/utils/adminPermissions.ts`)

- Centralized role-based permission system (`UserRole: 'admin' | 'manager' | 'sales_rep'`)
- Admin override controls for stage requirements during Opportunity to Quote conversion
- Multi-entity boundary isolation validation (`validateCompanyBoundary`) enforcing strict company data isolation across Lead, Opportunity, and Quote lifecycles.

### Quote Management (`src/components/quote/QuoteManagement.tsx`)

**Status:** `draft` → `sent` → `accepted` / `rejected` / `expired` / `converted`

- Service item calculation: `resource_count × quantity(months) × billable_hours × unit_price`
- Product item calculation: `quantity × unit_price`
- Discount support (percentage or fixed)
- Tax calculated on discounted subtotal (proportional allocation)
- Number to words conversion for Indian numbering system
- PDF generation with branding (header image / green bar fallback)
- Status badge positioned to the right of the Customer ("To:") block (right-aligned to right margin) to eliminate overlap with the Company contact details
- Company contact person lines constrained to 85mm column width with dedicated email/phone labels to prevent horizontal spillover
- Entity-aware dashboard stats tile formatting: queries stats with active entity context (`selectedCompany?.id`) and formats totals/icons dynamically in the entity's native currency (e.g. € for Ireland/IRL, ₹ for India/IN, $ for USA)
- Status badges with color coding
- Can convert accepted quote to invoice via `quoteService.convertToInvoice()`
- Automated draft contract creation workflow for accepted quotes: when a quote status is updated to `accepted` or when clicking "Create Draft Contract" on accepted quotes, reuses the exact feature-rich `CreateContractModal` component (`src/components/contract/CreateContractModal.tsx`). Pre-populates company legal details, customer data, quote total, items/deliverables scope of work, dates, and terms while enabling full tabbed editing (Basic Info, Parties, Sections, Milestones) and dynamic jurisdiction template switching (`IRL` Irish Law vs `IND` Indian Law).
- Fixed `contractService.createContract` and `updateContract` payload validation to sanitize `template_id` UUID strings (`isUuid`). Prevents PostgreSQL `22P02` syntax errors when passing built-in jurisdiction template IDs (e.g. `builtin-irish-sow`).
- Fixed `contractService.generateContractNumber` entity prefix resolution to properly map `'IE'` / `'IRL'` to `'IRL'` (preventing Irish contracts from defaulting to `'IND'`).
- Enforced strict entity boundary isolation on `/admin/contracts` via `.eq('company_settings_id', company_settings_id)` in `contractService.getContracts` & `getStatistics`, ensuring Irish entity views strictly show contracts linked to the Ireland entity.

### Contract Management (`src/components/contract/ContractManagement.tsx`)

- Entity-aware dashboard statistics calculation in `contractService.getStatistics(companySettingsId)` natively aggregating contract values for the selected entity
- Strict company entity isolation via `company_settings_id` filter across contracts table view and dashboard tiles

### Invoice Management (`src/components/invoice/InvoiceManagement.tsx`)

- 6071-line monolithic component handling full invoice lifecycle
- Tab-based: dashboard, invoices, customers, products, settings
- IGST-compliant with HSN/SAC codes
- Multi-currency support (EUR, USD, INR) with live/cached exchange rate conversion via `exchangeRateService`.
- Multi-currency grid view displaying both primary currency and calculated INR value (`(~₹...)`) in both **Dashboard** and **Invoices** tabs.
- Exact paid amount tracking displaying the user-entered payment value under Amount and Payment status columns once an invoice is marked as paid.

### Lead Management (`src/components/lead/LeadManagement.tsx`)

- Add/Edit lead modal includes explicit **Status** dropdown selector (`new` | `contacted` | `qualified` | `disqualified` | `converted`), permitting direct status updates when creating or editing leads.

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

### Role-Based Access Control (RBAC) System (`src/components/admin/roles/RoleManagement.tsx`)

A unified enterprise-grade access control and permissions management subsystem:
- **Core Service (`src/services/roleService.ts`):** Role CRUD with full editability across all fields by Super Admin, granular permission updates, Supabase Auth user registration/invitation (`supabase.auth.signUp`), user role mapping, audit logging, and `getSelectableUsers()` querying both `auth.users` (via `get_auth_users` RPC / `system_auth_users` view) and the `employees` directory.
- **Granular Permission Matrix:** 6 capability actions (`view`, `create`, `edit`, `delete`, `approve`, `export`) across 26 modules categorized into 7 core functional areas:
  - *CRM & Sales*: Leads, Opportunities, Customers, Customer 360 & Hierarchy, Quotes.
  - *Billing & Invoicing*: Invoices, Payments, Subscriptions, Rate Cards.
  - *Finance & Treasury*: Income, Operational Expenses, Financial Health & P&L.
  - *HR & People*: Employees, Attendance, Leave, Compensation & Payslips, Full & Final Settlement, Policies & SOPs, Performance Reviews.
  - *Governance & Legal*: Board Resolutions, Contracts & Templates, Announcements.
  - *Analytics & Reporting*: Reporting Hub across all business verticals.
  - *System & Security Admin*: Organization Settings, PDF Branding, Payment Gateways, Roles & Access Control.
- **Default System Roles & Presets:** Super Admin (unrestricted executive privileges, auto-assigned to `admin@kdadks.com`), Sales Manager, Finance & Billing Officer, HR Operations Manager, Legal & Compliance Officer, Auditor (Read-Only), and Employee / Staff Member (preserves `/employee` self-service portal workflows).
- **UI Components (`src/components/admin/roles/`):**
  - `RoleManagement.tsx` — Main shell with executive KPI cards and tab navigation (Roles, User Assignments, Access Matrix, Audit Activity).
  - `RoleListTab.tsx` — Role cards with status indicators, permission coverage progress bars, user count chips, and action triggers.
  - `RoleModal.tsx` — Role creation, editing, cloning, quick preset buttons, and category-grouped interactive permission matrix.
  - `UserAssignmentsTab.tsx` — User role assignment table with search, role/entity/status filters, and inline role switchers.
  - `UserAssignmentModal.tsx` — Modal supporting assignment of Supabase Auth accounts (`auth.users`) and employees (cleanly displayed with names and emails, hiding raw UUIDs), as well as direct invitation of new users.
  - `RoleAccessMatrixTab.tsx` — Side-by-side comparative grid matrix across all roles with CSV export.
  - `RoleAuditLogTab.tsx` — Chronological timeline of RBAC modifications with actor info.
- **Permissions Enforcer Hook (`src/hooks/useRolePermissions.ts`):** Provides `can(module, action)`, `hasAny(module)`, `currentRole`, `isAdmin`, and `isSuperAdmin` for any React component.

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
| policies           | → company_settings — HR policies & SOP documents per company entity and jurisdiction |
| roles              | → company_settings — System and custom RBAC roles with JSONB permission mapping |
| user_role_assignments | → roles, company_settings — User-to-role mappings with entity scoping and Supabase auth |
| role_audit_logs    | Chronological audit log of RBAC modifications |

### Key Functions
- `get_next_lead_opportunity_number(p_record_type)` — generates LEAD/OPP numbers with sequence per year

### Database Migrations

Migrations are in `database/migrations/` (40+ SQL files). Key recent migrations:
- `036_role_based_access_control.sql` — Tables `roles`, `user_role_assignments`, and `role_audit_logs` for RBAC with granular action permissions across 26 modules, default role seeds (Super Admin, Sales Manager, Finance Officer, HR Manager, Compliance Officer, Auditor, Employee Portal), auto-assignment of `admin@kdadks.com`, secure RPC function `get_auth_users()`, and view `system_auth_users` exposing `auth.users` safely for admin assignment.
- `035_policy_sop_management.sql` — Table `policies` for entity-filtered HR policies and SOPs across law jurisdictions with RLS and JSONB sections.
- `034_subscription_unique_ids_and_drafts.sql` — Unique Subscription ID generation (`SUB-YYYY-XXXX`), `draft` status constraint, `source_subscription_id` lineage tracking, atomic sequence generator RPC `get_next_subscription_number(p_year)`.
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
| `src/components/hr/PolicyManagement.tsx` | Comprehensive HR Policy & SOP lifecycle management UI with jurisdiction templates |
| `src/services/policyService.ts` | CRUD service for entity-filtered HR policies, version control, and employee acknowledgments |
| `src/services/roleService.ts` | CRUD service for RBAC roles, granular permissions, user assignments, Supabase Auth invites, and audit logs |
| `src/components/admin/roles/RoleManagement.tsx` | Comprehensive RBAC management UI with roles catalog, user assignments, access matrix, and audit logs |
| `src/hooks/useRolePermissions.ts` | Dynamic permission check hook for React components (`can`, `hasAny`, `isAdmin`) |
| `src/types/role.ts` | Domain types for RBAC roles, permissions, modules, categories, user assignments, and presets |
| `src/data/jurisdictionPolicyTemplates.ts` | Country-specific default policy templates across law jurisdictions (IN, IE, US, GB, AE, SG) |
| `src/utils/policyPDFGenerator.ts` | Branded PDF exporter for official HR policies and SOP documents |
| `src/contexts/ActionProgressContext.tsx` | Global context provider for action progress notifications and loading indicators |
| `src/utils/customerCodeUtils.ts` | Customer code auto-generation utility with country entity prefixing |
| `src/types/policy.ts` | Type definitions for HR policies, SOP sections, approval statuses, and employee acknowledgments |
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

## 11. HR Policy & SOP Management System Workflow

The **HR Policy & SOP Management System** provides enterprise-grade policy lifecycle management, jurisdiction-aware standard templates, digital employee acknowledgments, version tracking, and automated PDF exports.

### Architecture & Key Modules

1. **Policy Management Component (`src/components/hr/PolicyManagement.tsx`)**:
   - Tabbed UI for Policy List, Policy Details/Preview, Policy Form (Create/Edit), and Employee Acknowledgments Matrix.
   - Filtering by Company Entity (`useCompanyContext`), Category (Code of Conduct, Leave & Attendance, IT & Security, Health & Safety, Compensation, General), Jurisdiction (India, Ireland, USA, UK, UAE, Singapore), and Approval Status.
   - Interactive Rich Text Editor integration (`RichTextEditor.tsx` / TinyMCE) with structural JSONB section builders.

2. **Policy Service (`src/services/policyService.ts`)**:
   - `getPolicies(companyId, filters)` — fetches entity-filtered policies from Supabase PostgreSQL table `policies`.
   - `createPolicy`, `updatePolicy`, `deletePolicy` — full CRUD with version incrementing (`version`, `template_version`).
   - `acknowledgePolicy(policyId, employeeId)` & `getPolicyAcknowledgements(policyId)` — tracks digital signatures, employee IP addresses, timestamps, and version compliance.

3. **Jurisdiction Policy Templates (`src/data/jurisdictionPolicyTemplates.ts`)**:
   - Pre-configured policy templates tailored for specific legal jurisdictions:
     - **India (IN)**: POSH policy, Standing Orders, Shops & Establishments compliance, Provident Fund & Gratuity clauses.
     - **Ireland (IE)**: Organisation of Working Time Act compliance, Sick Leave Act 2022, GDPR data protection.
     - **United States (US)**: At-will employment disclaimers, FLSA overtime classification, FMLA leave provisions.
     - **UK (GB)**: Employment Rights Act 1996 compliance, Working Time Regulations 1998, Statutory Sick Pay (SSP).
     - **UAE (AE)**: UAE Labour Law (Federal Decree-Law No. 33 of 2021) compliance, End of Service Gratuity rules.
     - **Singapore (SG)**: Employment Act (Cap. 91) compliance, Central Provident Fund (CPF) regulations.

4. **Policy PDF Generator (`src/utils/policyPDFGenerator.ts`)**:
   - Generates multi-page, publication-ready policy PDFs applying company branding header (`PDFBrandingUtils.applyBranding`), table of contents, structured section numbering, disclaimer boxes, and signatory metadata blocks.

5. **Database Migration (`database/migrations/035_policy_sop_management.sql`)**:
   - Defines `policies` and `policy_acknowledgements` tables with Row Level Security (RLS) policies, JSONB section arrays, versioning timestamps, and audit logging support.

---

## 12. Recent Changes (Git Log)

Recent commits indicate active development on:
1. **HR Policy & SOP Management System** — implemented end-to-end policy management workflow (`PolicyManagement.tsx`, `policyService.ts`, `035_policy_sop_management.sql`, `jurisdictionPolicyTemplates.ts`, `policyPDFGenerator.ts`), global progress tracking context (`ActionProgressContext.tsx`), customer code auto-generation utility (`customerCodeUtils.ts`), and Contract Template Management (`ContractTemplateManagement.tsx`, `EditTemplateModal.tsx`) [Commit `6e60189`].
2. **Lead & Opportunity Management** — full CRUD with note functionality, currency support, entity filtering.
3. **Follow-up Task Management** — task priorities, recurring follow-ups, due dates, reminders, automated alerts for overdue and stale leads.
4. **Lead Timeline & Activity Tracking** — unified chronological timeline consolidating all touchpoints (calls, emails, meetings, notes, tasks, status changes).
5. **Multi-country tax/banking refactor** — `resolveCountryCode` function, VAT/CRO field display, IBAN/SWIFT fields.
6. **Subscription management** — draft invoice generation from subscription data.
7. **Payment gateway** — webhook security, RLS fixes.
8. **Company rebranding** — from "Kdadks Service Private Limited" to "Kdadks".
9. **Vite Build Optimization & Code Splitting** — resolved dynamic import warnings (`invoiceService`, `quoteService`, `employeeService`), added `manualChunks` in `vite.config.ts` for vendor libraries (`vendor-react`, `vendor-supabase`, `vendor-icons`, `vendor-pdf-canvas`, `vendor-tinymce`, `vendor-motion`), and lazy-loaded admin sub-components (`React.lazy` + `Suspense`) in `SimpleAdminDashboard.tsx`, reducing initial bundle entry size from ~4.7 MB to ~517 kB.
10. **HR Employment Documents & PDF Branding** — extended Experience Certificate, Relieving Letter, Form 16, Form 24Q, Internship Offer Letter, and Internship Experience Certificate PDFs with selected company header/footer branding (`PDFBrandingUtils.applyBranding`), converted Form 16 Part B and Form 24Q TDS schedule into structured PDF tables, resolved text overlapping for Internship position details and Work Location, added additional terms & conditions matching Offer Letter (IP Assignment, Asset Care & Return, Confidentiality, Notice Period, Governing Law Jurisdiction), and introduced multi-page automatic page breaks (`checkBreak`) to prevent bottom text overlap with footer images.
11. **Compensation Table Data Integration & Signature/Width Layout Fixes** — updated Salary Certificate, Form 16, and Form 24Q document generators and UI to fetch real salary structure components from `employee_compensation` database table via `compensationService.getCurrentCompensation`, formatted Salary Certificate "TO WHOM IT MAY CONCERN" and text body across full document printable width (`contentWidth`), and reformatted Internship Offer Letter signature blocks to place Candidate Acceptance and Company Signatures side-by-side in two columns with `checkBreak` protection against footer image collisions.

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
