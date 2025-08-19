# Invoice Generation System Setup Guide

## Overview

This guide will help you set up the comprehensive Invoice Generation System with the following features:

### ✅ Core Features Implemented

1. **Database Schema** - Complete PostgreSQL/Supabase schema for invoicing
2. **Company Settings** - IGST-compliant biller settings for India
3. **Countries & Currencies** - Worldwide countries with their specific currencies
4. **Invoice Settings** - Auto-generation of invoice formats based on financial year
5. **Terms & Conditions** - General terms templates for invoices
6. **Customer Management** - Customer database with IGST details
7. **Product/Service Management** - Product catalog with HSN codes
8. **Invoice Management** - Full invoice creation and management system

## Database Setup

### Step 1: Run Database Migration

You need to execute the SQL files in your Supabase database:

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Execute Schema Creation**
   ```sql
   -- Copy and paste the content from src/database/schema.sql
   ```

3. **Execute Seed Data**
   ```sql
   -- Copy and paste the content from src/database/seed-data.sql
   ```

### Step 2: Verify Database Tables

After running the scripts, you should have these tables:
- `countries` - Countries with currencies
- `company_settings` - Your company/biller information
- `invoice_settings` - Invoice numbering and formatting rules
- `terms_templates` - Terms and conditions templates
- `customers` - Customer database
- `products` - Product/service catalog
- `invoices` - Invoice records
- `invoice_items` - Invoice line items
- `payments` - Payment records

## Environment Configuration

Make sure your `.env` file includes your Supabase configuration:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Features Overview

### 🏢 Company Settings (IGST Compliant for India)
- Company name and legal details
- Complete address information
- IGST Information (GSTIN, PAN, CIN)
- Banking details for payments
- Logo and signature support

### 🌍 Countries & Currencies
- 40+ pre-loaded countries
- Complete currency information with symbols
- Support for worldwide invoicing

### ⚙️ Invoice Settings
- **Auto Invoice Numbering**: `KDKS-2024-25-0001` format
- **Financial Year Support**: Indian FY (April to March)
- **Customizable Formats**: PREFIX-FY-NNNN pattern
- **Annual Reset**: Automatic number reset each financial year
- **Default Terms**: Payment terms, notes, footer text
- **IGST Configuration**: Default tax rates and IGST compliance

### 📝 Terms & Conditions Templates
- Payment Terms
- Service Terms  
- General Terms
- Shipping Terms
- Custom categories support

### 👥 Customer Management
- Company and contact information
- Complete address with country support
- IGST details (GSTIN, PAN for Indian customers)
- Credit limits and payment terms
- Customer search and filtering

### 📦 Product/Service Management
- Product catalog with descriptions
- HSN/SAC codes for IGST compliance
- Flexible pricing and units
- Tax rate configuration per product
- Category-wise organization

### 🧾 Invoice System
- Professional invoice generation
- Line item management
- Automatic tax calculations
- Multiple status tracking (Draft, Sent, Paid, Overdue)
- Payment tracking and status updates

## Access the Invoice System

1. **Login to Admin Dashboard**
   - Go to `/admin/login`
   - Use your Supabase authentication credentials

2. **Navigate to Invoice Management**
   - Click on "Invoices" in the admin dashboard
   - Access all invoice features from the tabbed interface

## Default Configuration

The system comes pre-configured with:

### Invoice Settings
- **Prefix**: KDKS
- **Format**: KDKS-2024-25-0001
- **Financial Year**: 2024-25 (Indian FY)
- **IGST Rate**: 18% (standard Indian rate)
- **Payment Terms**: 30 days
- **Currency**: Indian Rupees (₹)

### Company Settings (Template)
- **Company**: KDADKS Service Private Limited
- **Location**: Lucknow, Uttar Pradesh, India
- **Contact**: kdadks@outlook.com, +91-7982303199
- **Website**: https://kdadks.com

### Sample Products/Services
- IT Consulting Services
- Software Development
- Website Development
- Digital Marketing
- Training Services
- Healthcare Consultation
- Fashion Design
- Travel Planning

## Next Steps for Enhancement

After the basic setup, you can enhance the system with:

1. **PDF Generation** - Generate and download PDF invoices
2. **Email Integration** - Send invoices via email
3. **Payment Gateway** - Online payment processing
4. **Recurring Invoices** - Subscription and recurring billing
5. **Reports & Analytics** - Sales reports and analytics
6. **Multi-currency Support** - Invoice in different currencies
7. **Advanced Templates** - Custom invoice designs
8. **Mobile App** - Mobile application for invoice management

## Support

For any issues or enhancements:
- Email: kdadks@outlook.com
- Check the database logs in Supabase for any errors
- Verify environment variables are correctly set

---

**Note**: This is a production-ready invoice system with all necessary features for Indian IGST compliance. The system is designed to be scalable and can be extended with additional features as needed.
