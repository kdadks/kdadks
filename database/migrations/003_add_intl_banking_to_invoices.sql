-- Migration 003: Add international banking detail columns to invoices table
-- Required for non-INR (EUR / GBP / USD / other) invoices to persist Wise/intl
-- bank account details on the invoice row so admin view & PDF can render them.
--
-- Safe to run multiple times: uses IF NOT EXISTS guards.
-- Run in Supabase SQL editor (or psql) against the production database.

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS intl_account_name   TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS intl_account_number TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS intl_account_type   TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS intl_routing_number TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS intl_swift_bic      TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS intl_bank_address   TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS intl_iban           TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS intl_sort_code      TEXT;

COMMENT ON COLUMN invoices.intl_account_name   IS 'Beneficiary / account holder name for non-INR (Wise/SWIFT) banking';
COMMENT ON COLUMN invoices.intl_account_number IS 'Account number (USD / GBP / generic non-INR)';
COMMENT ON COLUMN invoices.intl_account_type   IS 'Account type, e.g. Checking / Savings (USD)';
COMMENT ON COLUMN invoices.intl_routing_number IS 'Routing number (USD ACH / Fedwire)';
COMMENT ON COLUMN invoices.intl_swift_bic      IS 'SWIFT / BIC code';
COMMENT ON COLUMN invoices.intl_bank_address   IS 'Bank or PSP postal address';
COMMENT ON COLUMN invoices.intl_iban           IS 'IBAN (EUR / GBP)';
COMMENT ON COLUMN invoices.intl_sort_code      IS 'UK sort code (GBP)';
