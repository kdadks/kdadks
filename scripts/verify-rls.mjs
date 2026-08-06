#!/usr/bin/env node
/**
 * RLS Verification Script
 * Tests actual access behaviour for each table category using both
 * the publishable key (anon role) and the secret key (service_role).
 *
 * Run: node scripts/verify-rls.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';

function loadEnv() {
  if (!existsSync('.env')) return;
  for (const line of readFileSync('.env', 'utf-8').split('\n')) {
    const eq = line.indexOf('=');
    if (eq === -1 || line.trimStart().startsWith('#')) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

const SUPABASE_URL   = process.env.VITE_SUPABASE_URL || '';
const PUBLISHABLE    = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const SECRET         = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SECRET) {
  console.error('❌  Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const anonClient    = PUBLISHABLE ? createClient(SUPABASE_URL, PUBLISHABLE, { auth: { persistSession: false } }) : null;
const secretClient  = createClient(SUPABASE_URL, SECRET,      { auth: { persistSession: false } });

// ── Table categories ──────────────────────────────────────────────────────────

const PUBLIC_TABLES       = ['countries', 'announcements', 'organization_details', 'exchange_rates', 'subscription_plans'];
const ADMIN_TABLES        = ['invoices', 'invoice_items', 'invoice_settings', 'customers', 'products', 'payments',
                              'terms_templates', 'company_settings', 'board_resolutions', 'contracts',
                              'contract_templates', 'expense_categories', 'income_categories', 'manual_transactions',
                              'payment_gateways', 'payment_requests', 'quote_settings', 'quotes',
                              'rate_card_templates', 'employee_audit_logs', 'full_final_settlements',
                              'salary_structures', 'salary_slips', 'customer_subscriptions',
                              'performance_feedback', 'performance_goals', 'employment_documents',
                              'employee_notes', 'employee_compensation'];
const EMPLOYEE_RW_TABLES  = ['employees', 'attendance_records', 'leave_applications', 'employee_leave_balance'];
const EMPLOYEE_RO_TABLES  = ['leave_types', 'employee_documents'];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function canSelect(client, table) {
  const { error } = await client.from(table).select('*').limit(1);
  // PGRST116 = zero rows — that's fine (table exists and is accessible)
  if (!error || error.code === 'PGRST116') return true;
  // 42501 = permission denied / RLS block
  return false;
}

const PASS = '✅ ';
const FAIL = '❌ ';
const WARN = '⚠️  ';

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║        KDADKS  —  RLS Verification Report         ║');
console.log('╚════════════════════════════════════════════════════╝\n');

let passed = 0, failed = 0;

async function check(label, condition, detail) {
  if (condition) {
    console.log(`  ${PASS}${label.padEnd(52)} ${detail}`);
    passed++;
  } else {
    console.log(`  ${FAIL}${label.padEnd(52)} ${detail}`);
    failed++;
  }
}

// ── 1. Secret key can read everything ────────────────────────────────────────
console.log('── Secret key (service_role) access ───────────────────');
for (const t of [...PUBLIC_TABLES, ...ADMIN_TABLES, ...EMPLOYEE_RW_TABLES, ...EMPLOYEE_RO_TABLES]) {
  const ok = await canSelect(secretClient, t);
  await check(`${t}`, ok, ok ? 'accessible' : 'BLOCKED — check table exists');
}

// ── 2. Publishable key (anon) — public tables must be readable ───────────────
if (anonClient) {
  console.log('\n── Publishable key (anon role) — PUBLIC tables (expect: readable) ─');
  for (const t of PUBLIC_TABLES) {
    const ok = await canSelect(anonClient, t);
    await check(`${t}`, ok, ok ? 'readable ✓' : 'BLOCKED — policy missing');
  }

  // ── 3. Publishable key (anon) — admin tables must be blocked ─────────────
  console.log('\n── Publishable key (anon role) — ADMIN tables (expect: blocked) ──');
  for (const t of ADMIN_TABLES) {
    const blocked = !(await canSelect(anonClient, t));
    await check(`${t}`, blocked, blocked ? 'blocked ✓' : 'EXPOSED — RLS not working!');
  }

  // ── 4. Publishable key (anon) — employee tables must be readable ──────────
  console.log('\n── Publishable key (anon role) — EMPLOYEE tables (expect: readable) ─');
  for (const t of [...EMPLOYEE_RW_TABLES, ...EMPLOYEE_RO_TABLES]) {
    const ok = await canSelect(anonClient, t);
    await check(`${t}`, ok, ok ? 'readable ✓' : 'BLOCKED — employee portal will break');
  }
} else {
  console.log(`\n${WARN} VITE_SUPABASE_PUBLISHABLE_KEY not set — skipping anon access checks.`);
  console.log('  Add the new publishable key to .env and re-run to complete verification.\n');
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n────────────────────────────────────────────────────────');
console.log(`  ${passed} passed  |  ${failed} failed`);
if (failed === 0) {
  console.log('\n  🎉  All RLS checks passed. Migration is complete.');
} else {
  console.log('\n  ⚠️   Some checks failed. Review the output above.');
}

if (!anonClient) {
  console.log('\n  Next step: Add VITE_SUPABASE_PUBLISHABLE_KEY to .env');
  console.log('  Get it from: Supabase Dashboard → Settings → API Keys → Publishable key');
}
console.log('');
