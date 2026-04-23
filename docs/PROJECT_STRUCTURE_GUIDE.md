# KDADKS Project Structure Guide

## Project Overview
- **Type**: React + TypeScript + Vite
- **Database**: Supabase (PostgreSQL with RLS policies)
- **Styling**: Tailwind CSS
- **UI Components**: Lucide React icons
- **Forms**: React Hook Form
- **PDF Generation**: jsPDF + html2canvas
- **Payment Gateway**: Razorpay
- **Deployment**: Netlify

---

## 1. ADMIN DASHBOARD COMPONENT

### Main Admin Dashboard
**Location**: `/Users/prashant/Documents/Application directory/Kdadks/src/components/admin/SimpleAdminDashboard.tsx`

**Key Features**:
- Sidebar navigation with collapsible HR menu
- Dashboard stats overview (Invoices, Quotes, Payments, Employees)
- View switching system for different modules
- Quick actions section for common tasks
- Authentication check with redirect to login

**Navigation Structure** (activeView states):
```typescript
type ActiveView = 'dashboard' | 'invoices' | 'payments' | 'quotes' 
  | 'hr-employees' | 'hr-leave' | 'hr-attendance' 
  | 'hr-settlement' | 'hr-tds-report' | 'hr-organization';
```

**Dashboard Stats**:
- Total Invoices (with Paid count)
- Payments (total count + amount)
- Quotes (with Accepted count)
- Employees (total + active)
- HR Documents
- Salary Slips
- Total Revenue & Pending Amount

### Admin Routes
**Location**: `/Users/prashant/Documents/Application directory/Kdadks/src/components/Router.tsx`

```
/admin/login       -> AdminLogin component
/admin             -> SimpleAdminDashboard component
```

---

## 2. DATABASE SCHEMA LOCATION & PATTERNS

### Migration Files Directory
`/Users/prashant/Documents/Application directory/Kdadks/database/migrations/`

### Key Schema Files:

1. **Quote System Schema**
   - File: `quote-system-schema.sql`
   - Tables: `quotes`, `quote_items`, `quote_settings`
   - Features: Multi-currency support, quote conversion tracking, status tracking

2. **Employee HR System**
   - File: `employee-hr-system-schema.sql`
   - Tables: `employees`, `employment_documents`, `salary_slips`, `full_final_settlements`, `leaves`, `attendance`

3. **Invoice System**
   - File: `payment-gateway-schema.sql` + related files
   - Tables: `invoices`, `invoice_items`, `invoice_settings`, `customers`, `products`

4. **Payment System**
   - File: `setup-payment-gateway.sql`
   - Tables: `payment_gateways`, `payments`, `payment_transactions`

### Database Patterns:

**RLS Policies Applied**: All tables use Row-Level Security for authenticated users
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users..." ON table_name FOR SELECT/INSERT/UPDATE/DELETE
  TO authenticated
  USING (true);
```

**Common Fields**:
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
- `updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
- `is_active BOOLEAN DEFAULT true`

**Foreign Keys Pattern**:
```sql
REFERENCES other_table(id) -- for links
REFERENCES other_table(id) ON DELETE CASCADE -- for items/details
```

**Indexes**: Created for performance on frequently queried fields
- `idx_table_foreign_key_id`
- `idx_table_status`
- `idx_table_date`

**Triggers**: Auto-update timestamp on modification
```sql
CREATE TRIGGER trigger_table_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION update_table_updated_at();
```

**Views**: Aggregate statistics (example: `quote_stats_view`)
```sql
CREATE OR REPLACE VIEW table_stats_view AS
SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'value'), ...
```

---

## 3. COMPONENT PATTERNS

### TypeScript + React Patterns

**Component Structure**:
```typescript
import React, { useState, useEffect } from 'react';
import { IconFromLucide } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { serviceClass } from '../../services/serviceService';
import { useToast } from '../ui/ToastProvider';
import type { TypeFromTypes } from '../../types/module';

interface ComponentProps {
  onBackToDashboard?: () => void;
}

const ComponentName: React.FC<ComponentProps> = ({ onBackToDashboard }) => {
  const [data, setData] = useState<Type[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await serviceClass.getData();
      setData(result);
    } catch (error) {
      showToast('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="...">
      {/* Component JSX */}
    </div>
  );
};

export default ComponentName;
```

### Common Component Locations:
- **Admin**: `/src/components/admin/`
- **Invoices**: `/src/components/invoice/`
- **Quotes**: `/src/components/quote/`
- **HR**: `/src/components/hr/`
- **Payment**: `/src/components/payment/`
- **UI/Shared**: `/src/components/ui/`, `/src/components/shared/`
- **Settings**: `/src/components/settings/`

### Styling Approach:
- **Framework**: Tailwind CSS with custom utilities
- **Method**: Inline className with utility classes
- **Color System**: Uses CSS variables (primary-*, accent-*, etc.)
- **Icons**: Lucide React (lightweight SVG icons)
- **Responsive**: Breakpoints: `sm:`, `md:`, `lg:`

**Example Styling**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
    {/* content */}
  </div>
</div>
```

### Custom Tailwind Classes (from index.css):
```css
.btn-primary        /* Primary button style */
.btn-secondary      /* Secondary button style */
.btn-outline        /* Outlined button */
.card              /* Card container */
.section-padding    /* Standard section padding */
.text-gradient      /* Gradient text effect */
```

---

## 4. EXISTING QUOTE/BILLING FUNCTIONALITY

### Quote Management System

**Location**: `/Users/prashant/Documents/Application directory/Kdadks/src/components/quote/QuoteManagement.tsx`

**Features**:
- Create, View, Edit, Delete quotes
- Quote to Invoice conversion
- Multi-currency support
- PDF generation
- Email capabilities
- Status tracking (draft, sent, accepted, rejected, expired, converted)
- Project details (title, estimated time, contact info)
- HSN/SAC code support for India GST
- Quote validity/expiry date
- Discount support (percentage or fixed)
- Term conditions templates

**Related Files**:
- Types: `/src/types/quote.ts`
- Service: `/src/services/quoteService.ts`
- Create component: `/src/components/quote/CreateQuote.tsx`

### Quote Types:
```typescript
interface Quote {
  id: string;
  quote_number: string;
  customer_id: string;
  project_title?: string;
  quote_date: string;
  valid_until?: string;
  subtotal: number;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  tax_amount: number;
  total_amount: number;
  currency_code: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  converted_to_invoice_id?: string;
  // Multi-currency fields
  inr_subtotal?: number;
  inr_tax_amount?: number;
  inr_total_amount?: number;
  // Dates & tracking
  created_at: string;
  updated_at: string;
}

interface QuoteItem {
  id: string;
  quote_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  tax_rate: number;
  tax_amount: number;
  hsn_code?: string;
}
```

### Invoice Management System

**Location**: `/Users/prashant/Documents/Application directory/Kdadks/src/components/invoice/InvoiceManagement.tsx`

**Features**:
- Full invoice CRUD operations
- Payment gateway integration
- Customer management
- Product management
- Company settings
- Invoice number auto-generation
- PDF generation with branding
- Email sending
- Status tracking
- Multi-currency support

**Related Files**:
- Types: `/src/types/invoice.ts`
- Service: `/src/services/invoiceService.ts`
- Create component: `/src/components/invoice/CreateInvoice.tsx`
- Edit component: `/src/components/invoice/EditInvoice.tsx`

---

## 5. NAVIGATION & ROUTING

### Main Router Structure
**Location**: `/Users/prashant/Documents/Application directory/Kdadks/src/components/Router.tsx`

**Routes**:
```
/                           -> HomePage
/privacy                    -> PrivacyPolicy
/terms                      -> TermsConditions
/shipping                   -> ShippingPolicy
/refund                     -> CancellationRefund
/team                       -> TeamPage
/support                    -> CustomerSupport
/service-inquiry            -> ServiceInquiry
/consultation               -> BookConsultation
/partnership                -> Partnership
/admin/login                -> AdminLogin
/admin                      -> SimpleAdminDashboard
/payment/:token             -> CheckoutPage
/payment/checkout/:requestId -> CheckoutPage
/payment/success/:requestId -> PaymentSuccessPage
/payment/status/:requestId  -> PaymentPage
```

### Admin Dashboard Navigation
**Type**: Sidebar-based view switching (not route-based)

```
Dashboard
├── Invoices
├── Payments
├── Quotes
└── HR Management (Collapsible)
    ├── Employees & Documents
    ├── Leave Management
    ├── Attendance
    ├── F&F Settlement
    ├── TDS Report
    └── Organization Settings
```

**Implementation**: Uses React state (`activeView`) instead of URL routes for navigation within dashboard

---

## 6. KEY SERVICES

**Location**: `/src/services/`

### Available Services:
- `quoteService.ts` - Quote CRUD, stats, settings
- `invoiceService.ts` - Invoice operations, PDF generation
- `paymentService.ts` - Payment processing
- `employeeService.ts` - Employee data management
- `emailService.ts` - Email sending (with fallback options)
- `pdfBrandingService.ts` - PDF customization
- `exchangeRateService.ts` - Multi-currency conversion
- `leaveAttendanceService.ts` - HR operations
- `settlementService.ts` - Full & Final settlement
- `tdsReportService.ts` - TDS calculations

### Service Pattern:
```typescript
class ServiceName {
  async getAll(): Promise<Type[]> { }
  async getById(id: string): Promise<Type> { }
  async create(data: CreateData): Promise<Type> { }
  async update(id: string, data: UpdateData): Promise<Type> { }
  async delete(id: string): Promise<void> { }
  async getStats(): Promise<StatsType> { }
}

export const serviceName = new ServiceName();
```

---

## 7. AUTHENTICATION

**Location**: `/src/utils/simpleAuth.ts`

**Auth Pattern**:
- Simple auth utility (not middleware-based)
- Checks authentication status before rendering dashboard
- Redirects to `/admin/login` if not authenticated
- Stores user session in localStorage or Supabase

---

## 8. TYPE DEFINITIONS

**Location**: `/src/types/`

Available type files:
- `admin.ts` - Admin-related types
- `auth.ts` - Authentication types
- `invoice.ts` - Invoice, Customer, Product, Company settings
- `quote.ts` - Quote system types
- `payment.ts` - Payment types
- `employee.ts` - Employee types
- `payroll.ts` - Payroll types

---

## 9. PROJECT STRUCTURE TREE

```
Kdadks/
├── database/
│   └── migrations/
│       ├── quote-system-schema.sql
│       ├── employee-hr-system-schema.sql
│       ├── payment-gateway-schema.sql
│       └── ... (other migrations)
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── SimpleAdminDashboard.tsx
│   │   │   ├── AdminLogin.tsx
│   │   │   └── ...
│   │   ├── invoice/
│   │   │   ├── InvoiceManagement.tsx
│   │   │   ├── CreateInvoice.tsx
│   │   │   └── EditInvoice.tsx
│   │   ├── quote/
│   │   │   ├── QuoteManagement.tsx
│   │   │   └── CreateQuote.tsx
│   │   ├── hr/
│   │   │   ├── EmploymentDocuments.tsx
│   │   │   ├── LeaveManagement.tsx
│   │   │   ├── AttendanceManagement.tsx
│   │   │   ├── FullFinalSettlement.tsx
│   │   │   └── TDSReport.tsx
│   │   ├── payment/
│   │   │   ├── PaymentManagement.tsx
│   │   │   └── CheckoutPage.tsx
│   │   ├── ui/
│   │   │   ├── ToastProvider.tsx
│   │   │   ├── CurrencyDisplay.tsx
│   │   │   └── ...
│   │   ├── Router.tsx
│   │   └── ... (other components)
│   ├── services/
│   │   ├── quoteService.ts
│   │   ├── invoiceService.ts
│   │   ├── paymentService.ts
│   │   └── ... (other services)
│   ├── types/
│   │   ├── quote.ts
│   │   ├── invoice.ts
│   │   ├── payment.ts
│   │   └── ...
│   ├── utils/
│   │   ├── simpleAuth.ts
│   │   └── ...
│   ├── config/
│   │   └── supabase.ts
│   ├── hooks/
│   │   ├── useConfirmDialog.ts
│   │   └── ...
│   ├── index.css (Tailwind + custom classes)
│   └── main.tsx
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 10. QUICK REFERENCE

### Common Imports
```typescript
import { supabase } from '../../config/supabase';
import { useToast } from '../ui/ToastProvider';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { Icon } from 'lucide-react';
import type { Type } from '../../types/module';
```

### Common Patterns

**Data Loading**:
```typescript
useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await service.getAll();
      setData(result);
    } catch (error) {
      showToast('Error message', 'error');
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

**Form Submission**:
```typescript
const handleSubmit = async (formData: CreateData) => {
  try {
    setModalLoading(true);
    const result = await service.create(formData);
    setData([...data, result]);
    showToast('Success message', 'success');
    setShowModal(false);
  } catch (error) {
    showToast('Error message', 'error');
  } finally {
    setModalLoading(false);
  }
};
```

**Modal Pattern**:
```typescript
const [showModal, setShowModal] = useState(false);
const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view');
const [selectedItem, setSelectedItem] = useState<Type | null>(null);

const openModal = (mode: 'view' | 'edit' | 'add', item?: Type) => {
  setModalMode(mode);
  setSelectedItem(item || null);
  setShowModal(true);
};
```

