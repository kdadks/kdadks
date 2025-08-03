# Admin Console Documentation

This guide provides comprehensive details about the KDADKS admin console with focus on the invoice management system.

## Overview

The KDADKS admin console is a secure, feature-rich management interface that includes:
- Complete invoice generation system (GST-compliant)
- Customer and product management
- Business settings configuration
- Real-time analytics and reporting

## Accessing the Admin Console

- **URL**: `/admin/login` 
- **Alternative Access**: Quintuple-click "Made with ❤️ in India" in the footer
- **Authentication**: Supabase Auth with email/password

## Key Components

### 1. Dashboard

The dashboard provides an overview of key metrics:
- Total invoices and revenue
- Outstanding payments
- Recent activity
- Status-based statistics (Draft, Sent, Paid, Overdue)

### 2. Invoice Management

#### Features
- Create, view, edit, and delete invoices
- Professional GST-compliant invoice generation
- Automatic invoice numbering (INV/YYYY/MM/###)
- Multiple payment statuses and tracking
- Bulk operations for efficient management
- Email invoices directly to customers
- PDF generation and download

#### Invoice Generation Process
1. Select customer from database
2. Add line items from product catalog
3. Configure invoice settings (date, terms, etc.)
4. Preview and generate invoice
5. Track payment status and follow-ups

### 3. Customer Management

- Complete customer database with search and filter
- Contact information and address management
- GST details for Indian customers (GSTIN/PAN)
- Payment terms and credit limits
- Activity history and invoice tracking

### 4. Product/Service Catalog

- Comprehensive product management
- HSN/SAC codes for GST compliance
- Pricing and tax configuration
- Units and descriptions
- Active/inactive status management

### 5. Company Settings

- Business profile configuration
- GST/Tax settings
- Logo and branding elements
- Bank account details
- Contact information

### 6. Invoice Settings

- Invoice numbering format configuration
- Financial year settings (April-March for India)
- Default tax rates and terms
- Email templates and settings

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **State Management**: React Hooks with context
- **UI Framework**: Tailwind CSS + custom components
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **PDF Generation**: jsPDF + html2canvas
- **Email Service**: Brevo SMTP integration

## Security Features

- **Row Level Security**: Supabase RLS policies
- **Authentication**: Email/password with Supabase Auth
- **Data Validation**: Server-side and client-side validation
- **Error Handling**: Comprehensive error management
- **Session Management**: Secure session handling

## GST Compliance

The invoice system is fully GST compliant for Indian businesses:
- HSN/SAC codes on products and services
- GSTIN and PAN information for company and customers
- Proper tax calculations (CGST/SGST/IGST)
- Financial year format (April-March)
- All required invoice fields for legal compliance

## Data Flow Architecture

1. **UI Components** → React components for user interaction
2. **Service Layer** → invoiceService.ts handles business logic
3. **Database Access** → Supabase client for data storage
4. **Authentication** → Supabase Auth for security
5. **PDF Generation** → Client-side PDF creation
6. **Email Delivery** → Integration with Brevo SMTP

## Integration Points

The invoice system integrates with:
- **Email Service**: For sending invoices to customers
- **PDF Generation**: For creating downloadable invoices
- **Database**: For persistent storage of all data
- **Authentication**: For secure access control

## Advanced Features

- **Multi-currency Support**: Invoice in different currencies
- **Tax Calculation**: Automatic GST/tax calculations
- **Financial Year Logic**: Indian April-March financial year
- **Automatic Numbering**: Smart invoice number generation
- **Data Validation**: Comprehensive input validation
- **Error Handling**: User-friendly error messages
- **Responsive Design**: Works on all devices

## Configuration Guide

For detailed setup instructions, see:
- [INVOICE_SYSTEM_SETUP.md](./INVOICE_SYSTEM_SETUP.md) - Database and system setup
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Integration with other projects
- [RLS_CONFIGURATION_GUIDE.md](./RLS_CONFIGURATION_GUIDE.md) - Security configuration

## Support Resources

- **Email**: kdadks@outlook.com
- **Phone**: +91 7982303199
- **Documentation**: Available in the `/docs` folder

---

**Built with ❤️ by the KDADKS Team**
