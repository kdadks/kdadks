# GitHub Copilot Instructions

## Project Overview
This is a React/TypeScript business website for KDADKS Service Private Limited with a comprehensive invoice management system. The project combines a public marketing website with a secure admin dashboard featuring a full GST-compliant invoicing system.

## Architecture & Key Patterns

### 🏗️ Application Structure
- **Frontend**: React 18 + TypeScript, Vite build system, Tailwind CSS
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Authentication**: Supabase Auth (email/password)
- **Deployment**: Netlify with automated builds

### 🔐 Dual-Purpose Application
The app serves two distinct user groups:
1. **Public Website** (`/`) - Marketing site for KDADKS services
2. **Admin Dashboard** (`/admin/*`) - Protected invoice management system

Access patterns:
- Public: Direct navigation or footer quintuple-click Easter egg
- Admin: `/admin/login` → Supabase authentication → Full invoice system

### 🧾 Invoice System Architecture

**Core Service Pattern**: Centralized data access through `invoiceService.ts`
```typescript
// All database operations go through this service
import { invoiceService } from '../services/invoiceService';

// Pattern: Service methods handle Supabase queries and business logic
const invoices = await invoiceService.getInvoices(filters, page, perPage);
const invoice = await invoiceService.createInvoice(invoiceData, invoiceNumber);
```

**Database Schema**: 9 interconnected tables with foreign key relationships
- Countries → Company Settings → Invoices
- Customers → Invoices → Invoice Items → Products
- Invoice Settings (auto-numbering) → Invoices
- Payments → Invoices
- Terms Templates (reusable content)

### 🔄 State Management Pattern
The main `InvoiceManagement.tsx` component uses React state with specific patterns:

```typescript
// Multi-modal pattern with mode-based forms
const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view');
const [showModal, setShowModal] = useState(false);

// Tab-based navigation state
const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'customers'>('dashboard');

// Pagination and filtering state
const [currentPage, setCurrentPage] = useState(1);
const [filters, setFilters] = useState<FilterType>({});
```

## Critical Development Workflows

### 🚀 Development Setup
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run preview      # Preview production build
```

### 🗄️ Database Setup (Required for Invoice Features)
**IMPORTANT**: Invoice features require Supabase database setup:

1. **Schema Creation**: Run `src/database/schema.sql` in Supabase SQL Editor
2. **Seed Data**: Run `src/database/seed-data.sql` for sample data
3. **RLS Configuration**: Run `scripts/configure-rls.sql` for security policies
4. **Environment**: Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### 🔐 Authentication Flow
```typescript
// Check if Supabase is configured
import { isSupabaseConfigured } from '../config/supabase';

// Authentication helper
import { simpleAuth } from '../utils/simpleAuth';
await simpleAuth.login(email, password);
```

## Project-Specific Conventions

### 📁 File Organization
```
src/
├── components/
│   ├── admin/              # Admin dashboard components
│   ├── invoice/            # Invoice management system
│   ├── ui/                 # Reusable UI components
│   └── [public-pages].tsx  # Marketing site components
├── services/
│   └── invoiceService.ts   # Centralized data access layer
├── types/
│   └── invoice.ts          # TypeScript definitions (383 lines)
├── database/
│   ├── schema.sql          # Complete database schema
│   ├── seed-data.sql       # Sample data with Indian defaults
│   └── migrations/         # Database migrations
└── utils/
    └── simpleAuth.ts       # Authentication wrapper
```

### 🎨 UI/UX Patterns
- **Tailwind CSS**: Custom theme with primary/secondary/accent color scales
- **Lucide Icons**: Consistent icon system
- **Framer Motion**: Animations (sparingly used)
- **Modal Pattern**: Reusable modal components with mode switching
- **Toast Notifications**: Success/error feedback via `useToast()`

### 🏢 Business Logic Patterns

**Invoice Numbering**: Automatic generation with format `INV/YYYY/MM/###`
```typescript
// Service handles number generation and collision prevention
const invoiceNumber = await invoiceService.generateInvoiceNumber();
```

**Currency Handling**: Multi-currency support based on customer country
```typescript
// Currency determined by customer's country
const currencyInfo = getCurrencyInfo(selectedCustomer);
const formatted = formatCurrencyAmount(amount, currencyInfo);
```

**GST Compliance**: Built for Indian tax requirements
- HSN/SAC codes on products
- 18% default tax rate
- GSTIN/PAN fields on customers/company
- Financial year April-March format

## Integration Points & Dependencies

### 🔌 External Services
- **Supabase**: Database, authentication, real-time subscriptions
- **Netlify**: Hosting, CI/CD, environment variables
- **Brevo**: Email service (mentioned in docs, not currently implemented in invoice system)

### 🔗 Internal Service Communication
- **Router → Components**: Route-based component loading
- **Components → Services**: All data access through service layer
- **Services → Supabase**: Direct database queries with error handling
- **Components → Utils**: Authentication, formatting, validation helpers

### 📊 Data Flow Example (Invoice Creation)
1. User fills form in `InvoiceManagement.tsx`
2. Form validation in component
3. `invoiceService.createInvoice()` called
4. Service generates invoice number from settings
5. Service validates customer/company data
6. Service creates invoice + line items in transaction
7. Service returns complete invoice with relations
8. Component updates state and shows success toast

## Important Development Notes

### ⚠️ Critical Gotchas
- **Supabase Configuration**: Features fail silently if environment variables missing
- **RLS Policies**: Database operations will fail without proper RLS setup
- **Invoice Numbers**: Auto-increment with collision detection - don't manually set
- **Currency Codes**: Must match ISO standards in countries table
- **Authentication**: Admin features require valid Supabase session

### 🏷️ Type Safety Patterns
```typescript
// All types defined in src/types/invoice.ts
import type { Invoice, Customer, Product } from '../types/invoice';

// Service methods return properly typed data
const invoice: Invoice = await invoiceService.getInvoiceById(id);

// Form data types separate from entity types
interface CreateInvoiceData {
  // Subset of Invoice fields for creation
}
```

### 🚦 Error Handling Convention
```typescript
try {
  await invoiceService.someOperation();
  showSuccess('Operation completed successfully!');
} catch (error) {
  console.error('Operation failed:', error);
  showError(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

This codebase prioritizes type safety, centralized data access, and clean separation between public marketing features and private admin functionality. The invoice system is production-ready with Indian GST compliance but can be extended for international use.
