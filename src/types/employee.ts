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
  position: string;
  department: string;
  joining_date: string;
  salary_breakdown: {
    basic: number;
    hra: number;
    special_allowance: number;
    other_allowances: number;
    gross_salary: number;
  };
  annual_ctc: number;
  probation_period?: number;
  notice_period?: number;
  work_location?: string;
  reporting_to?: string;
  benefits?: string[];
  terms_conditions?: string;
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
