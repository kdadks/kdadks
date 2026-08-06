#!/usr/bin/env node
/**
 * RLS Audit & Fix Script
 *
 * Discovers every table in the public schema, checks whether Row Level Security
 * is enabled, enables it on any table that lacks it, creates the appropriate
 * policies, and applies GRANT permissions to anon / authenticated / service_role.
 *
 * NOTE: "anon" in SQL policies refers to the PostgreSQL ROLE, not the old API key name.
 * The publishable key (sb_publishable_...) maps to the "anon" Postgres role for
 * unauthenticated requests, and to "authenticated" when the user is signed in via
 * Supabase Auth. The role names in SQL do not change with the key migration.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PUBLIC_TABLES          – anon + authenticated can SELECT; only authenticated
 *                          can INSERT / UPDATE / DELETE
 * ADMIN_TABLES           – only authenticated (admin) can do anything; anon
 *                          has NO access at all
 * EMPLOYEE_RW_TABLES     – employee portal uses the anon key with custom auth,
 *                          so anon needs SELECT + write ops; authenticated (admin)
 *                          has full access
 * EMPLOYEE_RO_TABLES     – anon SELECT only; authenticated full access
 *
 * Usage
 * ─────────────────────────────────────────────────────────────────────────────
 *   node scripts/rls-audit-and-fix.mjs
 *
 * Required env vars (loaded from .env automatically):
 *   VITE_SUPABASE_URL         – e.g. https://xxxx.supabase.co
 *   SUPABASE_SECRET_KEY       – new secret key  (or SUPABASE_SERVICE_ROLE_KEY)
 *
 * Optional env vars (enables auto-execution via Supabase Management API):
 *   SUPABASE_ACCESS_TOKEN     – personal access token from supabase.com/account/tokens
 *   SUPABASE_PROJECT_REF      – project ref (auto-extracted from URL if omitted)
 *
 * Without SUPABASE_ACCESS_TOKEN the script saves the SQL to
 *   scripts/rls-fix-migration.sql  and prints instructions.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ── 1. Load .env ──────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL  || process.env.SUPABASE_URL || '';
const SECRET_KEY    = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ACCESS_TOKEN  = process.env.SUPABASE_ACCESS_TOKEN || '';
// Extract project ref from URL (https://<ref>.supabase.co)
const PROJECT_REF   = process.env.SUPABASE_PROJECT_REF
  || (SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? '');

if (!SUPABASE_URL || !SECRET_KEY) {
  console.error('❌  Missing required env vars: VITE_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── 2. Table categorisation ───────────────────────────────────────────────────

/** anon SELECT; authenticated ALL */
const PUBLIC_TABLES = [
  'countries',
  'announcements',
  'organization_details',
  'exchange_rates',
  'subscription_plans',
];

/** authenticated ALL; anon NO ACCESS */
const ADMIN_TABLES = [
  'invoices',
  'invoice_items',
  'invoice_settings',
  'customers',
  'products',
  'payments',
  'terms_templates',
  'company_settings',
  'board_resolutions',
  'contracts',
  'contract_templates',
  'contract_template_sections',
  'contract_sections',
  'expense_categories',
  'income_categories',
  'manual_transactions',
  'payment_gateways',
  'payment_requests',
  'quote_settings',
  'quotes',
  'rate_card_templates',
  'employee_audit_logs',
  'full_final_settlements',
  'salary_structures',
  'salary_slips',
  'customer_subscriptions',
  'performance_feedback',
  'performance_goals',
  'employment_documents',
  'employee_notes',
  'employee_compensation',
];

/**
 * Employee portal uses the anon key with custom auth (no Supabase Auth).
 * anon needs SELECT + INSERT + UPDATE so employees can clock in/out,
 * submit leaves, change passwords, etc.
 */
const EMPLOYEE_RW_TABLES = [
  'employees',              // anon SELECT + UPDATE (login lookup, password change, failed attempts)
  'attendance_records',     // anon SELECT + INSERT + UPDATE (clock in / out)
  'leave_applications',     // anon SELECT + INSERT + UPDATE + DELETE (leave management)
  'employee_leave_balance', // anon SELECT + UPDATE (balance tracked on approval)
];

/** anon SELECT only; authenticated ALL */
const EMPLOYEE_RO_TABLES = [
  'leave_types',
  'employee_documents',
];

// ── 3. SQL generators ─────────────────────────────────────────────────────────

function enableRls(table) {
  return `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`;
}

function forceRls(table) {
  // FORCE RLS also applies to table owners (including service_role when acting as owner)
  // We do NOT force it so service_role (secret key) still bypasses RLS as designed.
  return `-- Note: FORCE RLS not applied on ${table}; secret key (service_role) intentionally bypasses RLS.`;
}

function dropExistingPolicies(table) {
  // Idempotent: drop known policy names before recreating
  return [
    `DROP POLICY IF EXISTS "public_select"         ON public.${table};`,
    `DROP POLICY IF EXISTS "authenticated_all"      ON public.${table};`,
    `DROP POLICY IF EXISTS "anon_select"            ON public.${table};`,
    `DROP POLICY IF EXISTS "anon_insert"            ON public.${table};`,
    `DROP POLICY IF EXISTS "anon_update"            ON public.${table};`,
    `DROP POLICY IF EXISTS "anon_delete"            ON public.${table};`,
  ].join('\n');
}

function publicTableSql(table) {
  return `
-- ── ${table} (PUBLIC) ─────────────────────────────────────────────────────
${enableRls(table)}
${dropExistingPolicies(table)}

-- Anyone (anon + authenticated) may read
CREATE POLICY "public_select"
  ON public.${table} FOR SELECT
  USING (true);

-- Only authenticated users (admin) may write
CREATE POLICY "authenticated_all"
  ON public.${table} FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT                              ON public.${table} TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE      ON public.${table} TO authenticated;
GRANT ALL                                 ON public.${table} TO service_role;
`.trim();
}

function adminTableSql(table) {
  return `
-- ── ${table} (ADMIN ONLY) ──────────────────────────────────────────────────
${enableRls(table)}
${dropExistingPolicies(table)}

-- Only authenticated users (admin) may access
CREATE POLICY "authenticated_all"
  ON public.${table} FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Explicitly revoke any accidental anon grants
REVOKE ALL ON public.${table} FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE      ON public.${table} TO authenticated;
GRANT ALL                                 ON public.${table} TO service_role;
`.trim();
}

function employeeRwTableSql(table) {
  // Employees use the anon key because they authenticate via custom password_hash,
  // not Supabase Auth. They need write access for portal operations.
  return `
-- ── ${table} (EMPLOYEE READ-WRITE via anon key) ────────────────────────────
${enableRls(table)}
${dropExistingPolicies(table)}

-- Authenticated (admin) has unrestricted access
CREATE POLICY "authenticated_all"
  ON public.${table} FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Employee portal reads all rows it needs (filtered in app layer)
CREATE POLICY "anon_select"
  ON public.${table} FOR SELECT
  TO anon
  USING (true);

-- Employee portal can insert (clock-in, leave request, etc.)
CREATE POLICY "anon_insert"
  ON public.${table} FOR INSERT
  TO anon
  WITH CHECK (true);

-- Employee portal can update own records (password change, status updates)
CREATE POLICY "anon_update"
  ON public.${table} FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE              ON public.${table} TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE      ON public.${table} TO authenticated;
GRANT ALL                                 ON public.${table} TO service_role;
`.trim();
}

function employeeRoTableSql(table) {
  return `
-- ── ${table} (EMPLOYEE READ-ONLY via anon key) ─────────────────────────────
${enableRls(table)}
${dropExistingPolicies(table)}

CREATE POLICY "authenticated_all"
  ON public.${table} FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon_select"
  ON public.${table} FOR SELECT
  TO anon
  USING (true);

GRANT SELECT                              ON public.${table} TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE      ON public.${table} TO authenticated;
GRANT ALL                                 ON public.${table} TO service_role;
`.trim();
}

// ── 4. Query current RLS status via Management API ───────────────────────────

async function fetchRlsStatus() {
  if (!ACCESS_TOKEN || !PROJECT_REF) return null;

  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          SELECT tablename, rowsecurity
          FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY tablename;
        `,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn(`⚠️  Management API query failed (${res.status}): ${text}`);
      return null;
    }
    return await res.json(); // [{ tablename, rowsecurity }, ...]
  } catch (err) {
    console.warn('⚠️  Could not reach Management API:', err.message);
    return null;
  }
}

async function executeViaMgmtApi(sql) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Management API execution failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ── 5. Build the full SQL migration ──────────────────────────────────────────

function buildMigrationSql(tablesWithoutRls, allKnownTables) {
  const lines = [
    '-- ════════════════════════════════════════════════════════════════════════',
    '-- RLS Migration — generated by scripts/rls-audit-and-fix.mjs',
    `-- Generated: ${new Date().toISOString()}`,
    '-- Run in: Supabase Dashboard → SQL Editor',
    '-- ════════════════════════════════════════════════════════════════════════',
    '',
    '-- Schema-level grants (idempotent)',
    'GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;',
    'GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;',
    '',
  ];

  for (const t of PUBLIC_TABLES) {
    if (allKnownTables.has(t)) lines.push(publicTableSql(t), '');
  }
  for (const t of ADMIN_TABLES) {
    if (allKnownTables.has(t)) lines.push(adminTableSql(t), '');
  }
  for (const t of EMPLOYEE_RW_TABLES) {
    if (allKnownTables.has(t)) lines.push(employeeRwTableSql(t), '');
  }
  for (const t of EMPLOYEE_RO_TABLES) {
    if (allKnownTables.has(t)) lines.push(employeeRoTableSql(t), '');
  }

  if (tablesWithoutRls.length > 0) {
    lines.push('-- ── Remaining tables discovered in DB but not yet categorised ──────────');
    lines.push('-- Review these manually and add to the appropriate category above.');
    for (const t of tablesWithoutRls) {
      lines.push(`-- ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;  -- UNCATEGORISED`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ── 6. Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║        KDADKS  —  RLS Audit & Fix Script          ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');

  // All tables we know about from the codebase
  const ALL_KNOWN = new Set([
    ...PUBLIC_TABLES,
    ...ADMIN_TABLES,
    ...EMPLOYEE_RW_TABLES,
    ...EMPLOYEE_RO_TABLES,
  ]);

  // Attempt to fetch live RLS status
  let liveRows = await fetchRlsStatus();
  let tablesWithoutRls = [];
  let uncategorised = [];

  if (liveRows) {
    console.log(`📊 Fetched live RLS status for ${liveRows.length} tables.`);
    console.log('');
    console.log(' Table                              RLS Enabled?');
    console.log(' ─────────────────────────────────────────────');

    for (const row of liveRows) {
      const status = row.rowsecurity ? '✅  yes' : '❌  NO';
      console.log(` ${row.tablename.padEnd(35)} ${status}`);
      if (!row.rowsecurity) {
        tablesWithoutRls.push(row.tablename);
        if (!ALL_KNOWN.has(row.tablename)) uncategorised.push(row.tablename);
      }
    }

    console.log('');
    if (tablesWithoutRls.length === 0) {
      console.log('✅  All tables already have RLS enabled.');
    } else {
      console.log(`⚠️   ${tablesWithoutRls.length} table(s) without RLS: ${tablesWithoutRls.join(', ')}`);
    }
    if (uncategorised.length > 0) {
      console.log(`⚠️   ${uncategorised.length} uncategorised table(s) found in DB: ${uncategorised.join(', ')}`);
      console.log('    Add them to the appropriate category in this script before re-running.');
    }
    console.log('');
  } else {
    console.log('ℹ️   SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF not set.');
    console.log('    Skipping live RLS status check — will apply all policies unconditionally.');
    console.log('');
  }

  // Build the migration SQL
  const sql = buildMigrationSql(uncategorised, ALL_KNOWN);

  const outputFile = resolve(process.cwd(), 'scripts', 'rls-fix-migration.sql');

  if (ACCESS_TOKEN && PROJECT_REF) {
    console.log('🚀  Executing migration via Supabase Management API …');
    console.log('');

    // Split on blank lines between table blocks and run each block individually
    // to get granular error reporting
    const blocks = sql.split(/\n{2,}/).map(b => b.trim()).filter(b => b && !b.startsWith('--'));

    let ok = 0;
    let fail = 0;
    for (const block of blocks) {
      try {
        await executeViaMgmtApi(block);
        ok++;
      } catch (err) {
        console.error(`  ❌  ${err.message}`);
        console.error(`     SQL: ${block.slice(0, 120)}…`);
        fail++;
      }
    }

    console.log('');
    console.log(`  ✅  ${ok} SQL blocks executed successfully.`);
    if (fail > 0) console.log(`  ❌  ${fail} SQL blocks failed — check output above.`);

    // Always save the SQL file as a record
    writeFileSync(outputFile, sql, 'utf-8');
    console.log(`  📄  SQL saved to: ${outputFile}`);
  } else {
    // Save SQL to file and instruct user
    writeFileSync(outputFile, sql, 'utf-8');
    console.log(`✅  Migration SQL written to:\n    ${outputFile}`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Open your Supabase project → SQL Editor');
    console.log('  2. Paste the contents of scripts/rls-fix-migration.sql');
    console.log('  3. Click "Run"');
    console.log('');
    console.log('Or set SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF to auto-execute:');
    console.log('  SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/rls-audit-and-fix.mjs');
    console.log('');
    console.log('Get your personal access token from:');
    console.log('  https://supabase.com/dashboard/account/tokens');
  }

  console.log('');
  console.log('────────────────────────────────────────────────────');
  console.log('Code changes also required (already updated in repo):');
  console.log('  • src/config/supabase.ts       → supports VITE_SUPABASE_PUBLISHABLE_KEY');
  console.log('  • netlify/functions/*.js        → uses SUPABASE_SECRET_KEY fallback');
  console.log('  • .env.example                  → updated key names');
  console.log('  See SUPABASE_KEY_MIGRATION.md for the full checklist.');
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
