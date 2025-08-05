# Invoice System Integration Guide

This guide explains how to integrate the KDADKS Invoice Management System into other TypeScript projects.

## Overview

The KDADKS Invoice Management System is built as a modular component that can be integrated into any TypeScript project. It provides a full-featured IGST-compliant invoice management system with customer management, product catalog, and business settings.

## Prerequisites

- React 18+ with TypeScript
- Supabase account and project
- Node.js 18+ environment

## Integration Steps

### Step 1: Database Setup

1. **Create Supabase Project**:
   - Sign up at [Supabase](https://supabase.com) and create a new project
   - Note your project URL and anon key

2. **Run Schema Migration**:
   ```bash
   # Copy the schema files
   cp -r ./src/database/schema.sql ./your-project/src/database/
   cp -r ./src/database/seed-data.sql ./your-project/src/database/
   
   # Execute in Supabase SQL Editor
   # 1. Open Supabase Dashboard → SQL Editor
   # 2. Run schema.sql
   # 3. Run seed-data.sql
   ```

3. **Configure RLS Policies**:
   ```bash
   # Copy the RLS configuration
   cp -r ./scripts/configure-rls.sql ./your-project/scripts/
   
   # Execute in Supabase SQL Editor
   ```

### Step 2: Copy Required Files

```bash
# Core files
mkdir -p ./your-project/src/services
mkdir -p ./your-project/src/components/invoice
mkdir -p ./your-project/src/types
mkdir -p ./your-project/src/utils

# Copy service layer
cp ./src/services/invoiceService.ts ./your-project/src/services/
cp ./src/services/exchangeRateService.ts ./your-project/src/services/
cp ./src/services/emailService.ts ./your-project/src/services/

# Copy UI components
cp -r ./src/components/invoice/* ./your-project/src/components/invoice/

# Copy types
cp ./src/types/invoice.ts ./your-project/src/types/

# Copy utilities
cp ./src/utils/simpleAuth.ts ./your-project/src/utils/
cp ./src/utils/pdfBrandingUtils.ts ./your-project/src/utils/
cp ./src/utils/taxUtils.ts ./your-project/src/utils/
```

### Step 3: Configure Environment

Create or update your `.env` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Email Configuration (Optional - for invoice emails)
VITE_BREVO_API_KEY=your_brevo_api_key
```

### Step 4: Supabase Client Setup

Create a Supabase client configuration file:

```typescript
// src/config/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
```

### Step 5: Add Dependencies

Update your `package.json` with the necessary dependencies:

```bash
npm install @supabase/supabase-js jspdf html2canvas
npm install tailwindcss lucide-react framer-motion
npm install react-toastify date-fns
```

### Step 6: Integrate the Invoice Management Component

```typescript
// In your Admin component or route file
import InvoiceManagement from '../components/invoice/InvoiceManagement';
import { simpleAuth } from '../utils/simpleAuth';

const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    const checkAuth = async () => {
      const session = await simpleAuth.getSession();
      setIsAuthenticated(!!session);
    };
    
    checkAuth();
  }, []);
  
  if (!isAuthenticated) {
    return <LoginComponent />;
  }
  
  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      
      {/* Invoice Management System */}
      <InvoiceManagement />
    </div>
  );
};
```

## Service API Documentation

The core of the Invoice System is the `invoiceService.ts` which provides all the data access methods:

### Core Service Methods

```typescript
// Import the service
import { invoiceService } from '../services/invoiceService';

// Customer Management
const customers = await invoiceService.getCustomers(filters, page, perPage);
const customer = await invoiceService.createCustomer(customerData);

// Product Management
const products = await invoiceService.getProducts(filters, page, perPage);
const product = await invoiceService.createProduct(productData);

// Invoice Management
const invoices = await invoiceService.getInvoices(filters, page, perPage);
const invoice = await invoiceService.createInvoice(invoiceData);
const invoiceNumber = await invoiceService.generateInvoiceNumber();

// Company & Settings
const settings = await invoiceService.getCompanySettings();
const invoiceSettings = await invoiceService.getInvoiceSettings();
```

## Customization Options

### Company Branding

Update the company settings in Supabase:

1. Upload your logo to a cloud storage service
2. Update the `company_settings` table with your logo URL
3. Update company information like name, address, and IGST details

### Invoice Templates

The system supports custom invoice templates:

1. Modify the `src/components/invoice/InvoicePdf.tsx` file
2. Update styles and layout as needed
3. Test with the preview functionality

### Currency & Tax Settings

1. Update the `countries` table for currency changes
2. Adjust default tax rates in `invoice_settings`
3. Configure product-specific tax rates in the product catalog

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Verify Supabase credentials in `.env`
   - Check if Supabase project is running
   - Ensure RLS policies are properly configured

2. **Missing Invoice Numbers**:
   - Check `invoice_settings` table for proper configuration
   - Verify financial year settings match your requirements

3. **Authentication Issues**:
   - Ensure Supabase authentication is properly set up
   - Check user permissions and roles

## Support

For integration support, contact:
- Email: kdadks@outlook.com
- Technical Support: +91 7982303199

---

This integration guide provides the basics to get started. For advanced customizations or specific use cases, please refer to the full documentation or contact our support team.
