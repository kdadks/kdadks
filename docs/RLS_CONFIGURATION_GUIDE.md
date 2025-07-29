# Database RLS Configuration Guide

## 🎯 Objective
Configure Row Level Security (RLS) for all tables in your invoice management system to ensure authenticated users can perform all CRUD operations safely.

## 📋 Tables to Configure
The following tables need RLS configuration:
- `countries`
- `company_settings`
- `invoice_settings`
- `terms_templates`
- `customers`
- `products`
- `invoices`
- `invoice_items`
- `payments`

## 🔍 Step 1: Check Current RLS Status

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Run the query from `scripts/check-rls-status.sql`

This will show you which tables need configuration.

## 🛠️ Step 2: Configure RLS (REQUIRED)

1. In the Supabase SQL Editor, run the complete script from `scripts/configure-rls.sql`
2. This will:
   - ✅ Enable RLS on all tables
   - ✅ Create comprehensive policies for authenticated users
   - ✅ Allow all CRUD operations (SELECT, INSERT, UPDATE, DELETE)
   - ✅ Block anonymous users from accessing data

## 🔐 Security Model

After configuration, your database will have this security model:

### ✅ Allowed:
- **Authenticated users**: Full CRUD access to all tables
- **Valid JWT tokens**: All operations permitted

### ❌ Blocked:
- **Anonymous users**: No access to any data
- **Invalid tokens**: All operations rejected
- **Unauthenticated requests**: Completely blocked

## 🧪 Step 3: Test the Configuration

After running the SQL configuration:

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Test the admin interface:**
   - Navigate to `/admin/login`
   - Log in with your admin credentials
   - Go to the Products tab
   - Try adding, editing, and deleting products

3. **Verify database operations:**
   - All CRUD operations should work smoothly
   - No "row-level security" errors should appear
   - Data should load and save properly

## 🚨 What to Expect

### Before Configuration:
- ❌ "row-level security policy prevents this operation" errors
- ❌ Failed INSERT/UPDATE/DELETE operations
- ❌ Authentication blocking database access

### After Configuration:
- ✅ Smooth CRUD operations for authenticated users
- ✅ Proper security (anonymous users blocked)
- ✅ No RLS policy errors
- ✅ Full functionality in admin interface

## 🔧 Troubleshooting

If you still get RLS errors after configuration:

1. **Check authentication:**
   - Make sure you're logged in to your app
   - Verify your session token is valid

2. **Verify policies:**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT * FROM pg_policies 
   WHERE schemaname = 'public' 
   ORDER BY tablename, policyname;
   ```

3. **Check RLS status:**
   ```sql
   -- Run in Supabase SQL Editor  
   SELECT tablename, 
          CASE WHEN relrowsecurity THEN 'Enabled' ELSE 'Disabled' END as rls_status
   FROM pg_tables t
   JOIN pg_class c ON c.relname = t.tablename
   WHERE schemaname = 'public';
   ```

## 📞 Support

If you encounter any issues:

1. Check the browser console for detailed error messages
2. Verify your Supabase environment variables in `.env`
3. Ensure your authentication is working properly
4. Review the Supabase dashboard for any additional error details

## ✨ Benefits of This Configuration

- 🔒 **Security**: Only authenticated users can access data
- 🚀 **Performance**: Policies are efficient and don't impact speed
- 🛠️ **Maintainability**: Simple, consistent policies across all tables
- 🔄 **Scalability**: Easy to extend to new tables in the future

---

**Next Step:** Run the `configure-rls.sql` script in your Supabase dashboard!
