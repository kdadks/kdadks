// Employee and HR Document Types

export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'intern';
export type EmploymentStatus = 'active' | 'on-leave' | 'resigned' | 'terminated';
export type Gender = 'male' | 'female' | 'other';

export interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  full_name: string;
  fathers_name?: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: Gender;

  // Address
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;

  // Employment
  designation: string;
  department?: string;
  date_of_joining: string;
  date_of_leaving?: string;
  employment_type: EmploymentType;
  employment_status: EmploymentStatus;

  // Compensation
  basic_salary: number;
  hra?: number;
  special_allowance?: number;
  other_allowances?: number;
  gross_salary: number;
  currency_code: string;

  // Tax Information
  pan_number?: string;
  aadhar_number?: string;
  uan_number?: string;
  esic_number?: string;

  // Reporting
  reporting_manager_id?: string;

  // Banking
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;

  // Metadata
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export type DocumentType = 'offer_letter' | 'salary_certificate' | 'form_16' | 'form_24q' | 'other';
export type DocumentStatus = 'draft' | 'generated' | 'sent' | 'archived';

export interface EmploymentDocument {
  id: string;
  employee_id: string;
  document_type: DocumentType;
  document_number: string;
  document_date: string;
  document_data: any; // JSON data specific to document type
  purpose?: string;
  valid_until?: string;
  status: DocumentStatus;
  pdf_url?: string;
  pdf_generated_at?: string;
  generated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TDSRecord {
  id: string;
  employee_id: string;
  financial_year: string;
  quarter?: number;
  month?: number;
  gross_salary: number;
  standard_deduction: number;
  hra_exemption: number;
  section_80c_deduction: number;
  other_deductions: number;
  taxable_income: number;
  tax_on_income: number;
  surcharge: number;
  education_cess: number;
  total_tax: number;
  tds_deducted: number;
  challan_number?: string;
  deposit_date?: string;
  bsr_code?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HRDocumentSettings {
  id: string;
  offer_letter_prefix: string;
  offer_letter_number_format: string;
  offer_letter_current_number: number;
  offer_letter_template?: string;
  salary_cert_prefix: string;
  salary_cert_number_format: string;
  salary_cert_current_number: number;
  salary_cert_template?: string;
  form16_financial_year_start_month: number;
  form16_current_financial_year?: string;
  signatory_name?: string;
  signatory_designation?: string;
  signatory_signature_url?: string;
  company_tan?: string;
  company_pan?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Specific document data types
export interface OfferLetterData {
  // Basic Details
  position: string;
  department: string;
  joining_date: string;
  offer_date?: string;
  candidate_address?: string;
  
  // Position Details
  reporting_to?: string;
  work_location?: string;
  employment_type?: string;
  
  // Roles and Responsibilities (editable by admin)
  roles_responsibilities?: string;
  
  // Compensation
  salary_breakdown: {
    basic: number;
    hra: number;
    special_allowance: number;
    other_allowances: number;
    gross_salary: number;
  };
  annual_ctc: number;
  salary_payment_note?: string;
  benefits_note?: string;
  
  // Working Hours (editable)
  working_hours_start?: string;
  working_hours_end?: string;
  working_days?: string;
  additional_hours_note?: string;
  
  // Probation & Notice
  probation_period?: number;
  probation_note?: string;
  notice_period?: number;
  
  // Leave and Holidays
  leave_policy_note?: string;
  
  // Confidentiality
  confidentiality_note?: string;
  
  // Termination
  termination_note?: string;
  
  // Acceptance Section
  acceptance_section?: boolean;
  
  // Signatory Details
  signatory_name?: string;
  signatory_designation?: string;
  signatory_contact?: string;
  
  // Additional Content
  benefits?: string[];
  terms_and_conditions?: string;
  other_details?: string;
}

export interface SalaryCertificateData {
  purpose: string;
  period_from: string;
  period_to: string;
  salary_breakdown: {
    basic: number;
    hra: number;
    special_allowance: number;
    other_allowances: number;
    gross_monthly: number;
  };
  annual_gross: number;
  deductions?: {
    pf?: number;
    esic?: number;
    tds?: number;
    other?: number;
  };
  net_salary?: number;
}

export interface Form16Data {
  financial_year: string;
  employee: {
    name: string;
    pan: string;
    address: string;
  };
  employer: {
    name: string;
    tan: string;
    pan: string;
    address: string;
  };
  salary_details: {
    gross_salary: number;
    allowances: number;
    perquisites: number;
    profits_in_lieu: number;
  };
  deductions: {
    standard_deduction: number;
    entertainment_allowance: number;
    professional_tax: number;
  };
  chapter_vi_deductions: {
    section_80c: number;
    section_80d: number;
    other: number;
  };
  income_chargeable: number;
  tax_computed: number;
  relief_under_89: number;
  tax_payable: number;
  tds_deducted: number;
}

export interface Form24QData {
  quarter: number;
  financial_year: string;
  employees: Array<{
    employee_id: string;
    employee_name: string;
    pan: string;
    tds_deducted: number;
    challan_details: {
      challan_number: string;
      deposit_date: string;
      bsr_code: string;
    };
  }>;
  total_tds: number;
  employer: {
    name: string;
    tan: string;
    pan: string;
  };
}

export interface EmployeeStats {
  total_employees: number;
  active_employees: number;
  employees_on_leave: number;
  resigned_employees: number;
  terminated_employees: number;
  fulltime_employees: number;
  contract_employees: number;
  joined_this_month: number;
}

// Salary Slip Types
export type SalarySlipStatus = 'draft' | 'approved' | 'paid' | 'cancelled';

export interface SalarySlip {
  id: string;
  employee_id: string;
  salary_month: number;
  salary_year: number;
  financial_year: string;

  // Earnings
  basic_salary: number;
  hra: number;
  special_allowance: number;
  transport_allowance: number;
  medical_allowance: number;
  other_allowances: number;
  bonus: number;
  overtime: number;
  gross_salary: number;

  // Deductions
  provident_fund: number;
  professional_tax: number;
  esic: number;
  tds: number;
  loan_repayment: number;
  other_deductions: number;
  total_deductions: number;

  // Net Salary
  net_salary: number;

  // Tax Information
  ytd_gross: number;
  ytd_tds: number;
  projected_annual_income: number;
  annual_tax_liability: number;

  // Attendance
  working_days: number;
  paid_days: number;
  lop_days: number;
  leaves_taken: number;

  // Status and tracking
  status: SalarySlipStatus;
  email_sent: boolean;
  email_sent_at?: string;
  email_sent_to?: string;

  // Payment
  payment_date?: string;
  payment_mode?: string;
  payment_reference?: string;

  // Metadata
  generated_by?: string;
  approved_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSalarySlipInput {
  employee_id: string;
  salary_month: number;
  salary_year: number;
  working_days?: number;
  paid_days?: number;
  lop_days?: number;
  leaves_taken?: number;
  bonus?: number;
  overtime?: number;
  loan_repayment?: number;
  other_deductions?: number;
  tax_regime?: 'old' | 'new';

  // Optional overrides
  basic_salary?: number;
  hra?: number;
  special_allowance?: number;
  transport_allowance?: number;
  medical_allowance?: number;
  other_allowances?: number;
}

// Full & Final Settlement Types
export type SettlementStatus = 'draft' | 'pending_approval' | 'approved' | 'paid' | 'cancelled';

export interface FullFinalSettlement {
  id: string;
  employee_id: string;

  // Employee Details (denormalized for record keeping)
  employee_number: string;
  employee_name: string;
  designation: string;
  department?: string;
  date_of_joining: string;
  date_of_leaving: string;
  relieving_date: string;
  reason_for_leaving?: string;

  // Settlement Period
  settlement_month: number;
  settlement_year: number;
  last_working_day: string;
  notice_period_days: number;
  notice_period_served: number;
  notice_period_shortfall: number;

  // Salary Components (Dues)
  pending_salary_days: number;
  pending_salary_amount: number;
  earned_leave_days: number;
  earned_leave_encashment: number;
  bonus_amount: number;
  incentive_amount: number;
  gratuity_amount: number;
  notice_pay_recovery: number;
  other_dues: number;
  total_dues: number;

  // Deductions (Recoveries)
  advance_recovery: number;
  loan_recovery: number;
  notice_period_recovery: number;
  asset_recovery: number;
  other_recoveries: number;
  total_recoveries: number;

  // Net Settlement
  gross_settlement: number;
  tax_deduction: number;
  net_settlement: number;

  // Assets & Clearance
  assets_returned: boolean;
  asset_clearance_remarks?: string;
  no_dues_certificate_issued: boolean;

  // Payment Details
  payment_mode?: string;
  payment_reference?: string;
  payment_date?: string;

  // Approval Workflow
  status: SettlementStatus;
  prepared_by?: string;
  approved_by?: string;
  approved_at?: string;

  // Documents
  pdf_url?: string;
  pdf_generated_at?: string;

  // Remarks
  remarks?: string;

  // Metadata
  created_at?: string;
  updated_at?: string;
}

export interface CreateSettlementInput {
  employee_id: string;
  date_of_leaving: string;
  relieving_date: string;
  last_working_day: string;
  reason_for_leaving?: string;
  notice_period_days: number;
  notice_period_served: number;

  // Optional custom amounts
  bonus_amount?: number;
  incentive_amount?: number;
  gratuity_amount?: number;
  advance_recovery?: number;
  loan_recovery?: number;
  asset_recovery?: number;
  other_dues?: number;
  other_recoveries?: number;

  // Clearance
  assets_returned?: boolean;
  asset_clearance_remarks?: string;
  remarks?: string;
}
