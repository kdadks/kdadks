import { supabase } from '../config/supabase'
import type {
  Employee,
  EmploymentDocument,
  TDSRecord,
  HRDocumentSettings,
  EmployeeStats,
  DocumentType,
  SalarySlip,
  CreateSalarySlipInput
} from '../types/employee'
import {
  calculateProvidentFund,
  calculateProfessionalTax,
  calculateESIC,
  calculateMonthlyTDS,
  getFinancialYear,
  getFinancialYearMonth
} from '../utils/indianTaxCalculator'

export const employeeService = {
  // =============== Employee CRUD Operations ===============

  async getEmployees(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching employees:', error)
      throw error
    }

    return data || []
  },

  async getActiveEmployees(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employment_status', 'active')
      .order('full_name', { ascending: true })

    if (error) {
      console.error('Error fetching active employees:', error)
      throw error
    }

    return data || []
  },

  async getEmployeeById(id: string): Promise<Employee | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching employee:', error)
      throw error
    }

    return data
  },

  async getEmployeeByNumber(employeeNumber: string): Promise<Employee | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_number', employeeNumber)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching employee by number:', error)
      throw error
    }

    return data
  },

  async createEmployee(employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee> {
    // Calculate gross salary
    const gross_salary =
      (employee.basic_salary || 0) +
      (employee.hra || 0) +
      (employee.special_allowance || 0) +
      (employee.other_allowances || 0)

    const { data, error } = await supabase
      .from('employees')
      .insert([{ ...employee, gross_salary }])
      .select()
      .single()

    if (error) {
      console.error('Error creating employee:', error)
      throw error
    }

    return data
  },

  async updateEmployee(id: string, employee: Partial<Employee>): Promise<Employee> {
    // Recalculate gross salary if any salary components are updated
    if (employee.basic_salary !== undefined ||
        employee.hra !== undefined ||
        employee.special_allowance !== undefined ||
        employee.other_allowances !== undefined) {

      const current = await this.getEmployeeById(id)
      if (current) {
        employee.gross_salary =
          (employee.basic_salary ?? current.basic_salary) +
          (employee.hra ?? current.hra ?? 0) +
          (employee.special_allowance ?? current.special_allowance ?? 0) +
          (employee.other_allowances ?? current.other_allowances ?? 0)
      }
    }

    const { data, error } = await supabase
      .from('employees')
      .update(employee)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating employee:', error)
      throw error
    }

    return data
  },

  async deleteEmployee(id: string): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting employee:', error)
      throw error
    }
  },

  async getEmployeeStats(): Promise<EmployeeStats> {
    const { data, error } = await supabase
      .from('employee_stats_view')
      .select('*')
      .single()

    if (error) {
      console.error('Error fetching employee stats:', error)
      throw error
    }

    return data || {
      total_employees: 0,
      active_employees: 0,
      employees_on_leave: 0,
      resigned_employees: 0,
      terminated_employees: 0,
      fulltime_employees: 0,
      contract_employees: 0,
      joined_this_month: 0
    }
  },

  // =============== Employment Document Operations ===============

  async getEmploymentDocuments(employeeId?: string): Promise<EmploymentDocument[]> {
    let query = supabase
      .from('employment_documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching employment documents:', error)
      throw error
    }

    return data || []
  },

  async getDocumentsByType(documentType: DocumentType): Promise<EmploymentDocument[]> {
    const { data, error } = await supabase
      .from('employment_documents')
      .select('*')
      .eq('document_type', documentType)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching documents by type:', error)
      throw error
    }

    return data || []
  },

  async createEmploymentDocument(doc: Omit<EmploymentDocument, 'id' | 'created_at' | 'updated_at'>): Promise<EmploymentDocument> {
    const { data, error } = await supabase
      .from('employment_documents')
      .insert([doc])
      .select()
      .single()

    if (error) {
      console.error('Error creating employment document:', error)
      throw error
    }

    return data
  },

  async updateEmploymentDocument(id: string, doc: Partial<EmploymentDocument>): Promise<EmploymentDocument> {
    const { data, error } = await supabase
      .from('employment_documents')
      .update(doc)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating employment document:', error)
      throw error
    }

    return data
  },

  async deleteEmploymentDocument(id: string): Promise<void> {
    const { error } = await supabase
      .from('employment_documents')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting employment document:', error)
      throw error
    }
  },

  // =============== TDS Record Operations ===============

  async getTDSRecords(employeeId?: string, financialYear?: string): Promise<TDSRecord[]> {
    let query = supabase
      .from('tds_records')
      .select('*')
      .order('created_at', { ascending: false })

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    if (financialYear) {
      query = query.eq('financial_year', financialYear)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching TDS records:', error)
      throw error
    }

    return data || []
  },

  async createTDSRecord(record: Omit<TDSRecord, 'id' | 'created_at' | 'updated_at'>): Promise<TDSRecord> {
    const { data, error } = await supabase
      .from('tds_records')
      .insert([record])
      .select()
      .single()

    if (error) {
      console.error('Error creating TDS record:', error)
      throw error
    }

    return data
  },

  async updateTDSRecord(id: string, record: Partial<TDSRecord>): Promise<TDSRecord> {
    const { data, error } = await supabase
      .from('tds_records')
      .update(record)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating TDS record:', error)
      throw error
    }

    return data
  },

  // =============== HR Document Settings ===============

  async getHRDocumentSettings(): Promise<HRDocumentSettings | null> {
    const { data, error } = await supabase
      .from('hr_document_settings')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching HR document settings:', error)
      throw error
    }

    return data
  },

  async updateHRDocumentSettings(settings: Partial<HRDocumentSettings>): Promise<HRDocumentSettings> {
    const current = await this.getHRDocumentSettings()

    if (!current) {
      throw new Error('HR document settings not found')
    }

    const { data, error } = await supabase
      .from('hr_document_settings')
      .update(settings)
      .eq('id', current.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating HR document settings:', error)
      throw error
    }

    return data
  },

  // =============== Salary Slip Operations ===============

  async getSalarySlips(employeeId?: string, month?: number, year?: number): Promise<SalarySlip[]> {
    let query = supabase
      .from('salary_slips')
      .select('*')
      .order('salary_year', { ascending: false })
      .order('salary_month', { ascending: false })

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    if (month) {
      query = query.eq('salary_month', month)
    }

    if (year) {
      query = query.eq('salary_year', year)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching salary slips:', error)
      throw error
    }

    return data || []
  },

  async getSalarySlipById(id: string): Promise<SalarySlip | null> {
    const { data, error } = await supabase
      .from('salary_slips')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching salary slip:', error)
      throw error
    }

    return data
  },

  async generateSalarySlip(input: CreateSalarySlipInput): Promise<SalarySlip> {
    // Get employee details
    const employee = await this.getEmployeeById(input.employee_id)
    if (!employee) {
      throw new Error('Employee not found')
    }

    // Calculate financial year
    const financialYear = getFinancialYear(new Date(input.salary_year, input.salary_month - 1))

    // Use employee salary or override values
    const basicSalary = input.basic_salary ?? employee.basic_salary
    const hra = input.hra ?? employee.hra ?? 0
    const specialAllowance = input.special_allowance ?? employee.special_allowance ?? 0
    const transportAllowance = input.transport_allowance ?? 0
    const medicalAllowance = input.medical_allowance ?? 0
    const otherAllowances = input.other_allowances ?? employee.other_allowances ?? 0
    const bonus = input.bonus ?? 0
    const overtime = input.overtime ?? 0

    // Calculate working days and paid days
    const workingDays = input.working_days ?? 26
    const lopDays = input.lop_days ?? 0
    const paidDays = input.paid_days ?? (workingDays - lopDays)
    const leavesTaken = input.leaves_taken ?? lopDays

    // Prorate salary based on paid days
    const salaryMultiplier = paidDays / workingDays

    const proratedBasic = basicSalary * salaryMultiplier
    const proratedHRA = hra * salaryMultiplier
    const proratedSpecial = specialAllowance * salaryMultiplier
    const proratedTransport = transportAllowance * salaryMultiplier
    const proratedMedical = medicalAllowance * salaryMultiplier
    const proratedOther = otherAllowances * salaryMultiplier

    // Calculate gross salary
    const grossSalary =
      proratedBasic +
      proratedHRA +
      proratedSpecial +
      proratedTransport +
      proratedMedical +
      proratedOther +
      bonus +
      overtime

    // Calculate deductions
    const providentFund = calculateProvidentFund(proratedBasic)
    const professionalTax = calculateProfessionalTax(grossSalary)
    const esic = calculateESIC(grossSalary)

    // Get previous slips for YTD calculation
    const previousSlips = await this.getSalarySlips(
      input.employee_id,
      undefined,
      input.salary_year
    )

    // Calculate YTD (Year to Date)
    const ytdGross = previousSlips
      .filter(slip => slip.salary_month < input.salary_month)
      .reduce((sum, slip) => sum + slip.gross_salary, 0) + grossSalary

    const ytdTDS = previousSlips
      .filter(slip => slip.salary_month < input.salary_month)
      .reduce((sum, slip) => sum + slip.tds, 0)

    // Calculate TDS
    const monthNumber = getFinancialYearMonth(new Date(input.salary_year, input.salary_month - 1))
    const tds = calculateMonthlyTDS(
      grossSalary,
      input.tax_regime || 'new',
      monthNumber,
      ytdTDS,
      0, // HRA exemption calculation can be added
      {} // Deductions can be added
    )

    // Total deductions
    const loanRepayment = input.loan_repayment ?? 0
    const otherDeductions = input.other_deductions ?? 0
    const totalDeductions = providentFund + professionalTax + esic + tds + loanRepayment + otherDeductions

    // Net salary
    const netSalary = grossSalary - totalDeductions

    // Projected annual income and tax
    const remainingMonths = 12 - monthNumber
    const projectedAnnualIncome = ytdGross + (grossSalary * remainingMonths)
    const annualTaxLiability = tds * 12 // Simplified

    // Create salary slip
    const salarySlip: Omit<SalarySlip, 'id' | 'created_at' | 'updated_at'> = {
      employee_id: input.employee_id,
      salary_month: input.salary_month,
      salary_year: input.salary_year,
      financial_year: financialYear,

      basic_salary: Math.round(proratedBasic),
      hra: Math.round(proratedHRA),
      special_allowance: Math.round(proratedSpecial),
      transport_allowance: Math.round(proratedTransport),
      medical_allowance: Math.round(proratedMedical),
      other_allowances: Math.round(proratedOther),
      bonus: Math.round(bonus),
      overtime: Math.round(overtime),
      gross_salary: Math.round(grossSalary),

      provident_fund: Math.round(providentFund),
      professional_tax: Math.round(professionalTax),
      esic: Math.round(esic),
      tds: Math.round(tds),
      loan_repayment: Math.round(loanRepayment),
      other_deductions: Math.round(otherDeductions),
      total_deductions: Math.round(totalDeductions),

      net_salary: Math.round(netSalary),

      ytd_gross: Math.round(ytdGross),
      ytd_tds: Math.round(ytdTDS + tds),
      projected_annual_income: Math.round(projectedAnnualIncome),
      annual_tax_liability: Math.round(annualTaxLiability),

      working_days: workingDays,
      paid_days: paidDays,
      lop_days: lopDays,
      leaves_taken: leavesTaken,

      status: 'draft',
      email_sent: false
    }

    const { data, error } = await supabase
      .from('salary_slips')
      .insert([salarySlip])
      .select()
      .single()

    if (error) {
      console.error('Error creating salary slip:', error)
      throw error
    }

    return data
  },

  async updateSalarySlip(id: string, updates: Partial<SalarySlip>): Promise<SalarySlip> {
    const { data, error } = await supabase
      .from('salary_slips')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating salary slip:', error)
      throw error
    }

    return data
  },

  async deleteSalarySlip(id: string): Promise<void> {
    const { error } = await supabase
      .from('salary_slips')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting salary slip:', error)
      throw error
    }
  },

  async approveSalarySlip(id: string, approvedBy: string): Promise<SalarySlip> {
    return this.updateSalarySlip(id, {
      status: 'approved',
      approved_by: approvedBy
    })
  },

  async markSalarySlipAsPaid(
    id: string,
    paymentDate: string,
    paymentMode: string,
    paymentReference?: string
  ): Promise<SalarySlip> {
    return this.updateSalarySlip(id, {
      status: 'paid',
      payment_date: paymentDate,
      payment_mode: paymentMode,
      payment_reference: paymentReference
    })
  },

  async markSalarySlipEmailSent(id: string, emailSentTo: string): Promise<SalarySlip> {
    return this.updateSalarySlip(id, {
      email_sent: true,
      email_sent_at: new Date().toISOString(),
      email_sent_to: emailSentTo
    })
  },

  // =============== Document Number Generation ===============

  async generateDocumentNumber(documentType: DocumentType): Promise<string> {
    const settings = await this.getHRDocumentSettings()

    if (!settings) {
      throw new Error('HR document settings not configured')
    }

    let prefix: string
    let format: string
    let currentNumber: number
    let settingsUpdate: Partial<HRDocumentSettings>

    switch (documentType) {
      case 'offer_letter':
        prefix = settings.offer_letter_prefix
        format = settings.offer_letter_number_format
        currentNumber = settings.offer_letter_current_number
        settingsUpdate = { offer_letter_current_number: currentNumber + 1 }
        break
      case 'salary_certificate':
        prefix = settings.salary_cert_prefix
        format = settings.salary_cert_number_format
        currentNumber = settings.salary_cert_current_number
        settingsUpdate = { salary_cert_current_number: currentNumber + 1 }
        break
      default:
        // For other document types, use a generic format
        prefix = 'DOC'
        format = 'PREFIX/YYYY/###'
        currentNumber = 1
        settingsUpdate = {}
    }

    // Generate document number
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const paddedNumber = String(currentNumber).padStart(3, '0')

    let documentNumber = format
      .replace('PREFIX', prefix)
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('###', paddedNumber)

    // Update the counter
    if (Object.keys(settingsUpdate).length > 0) {
      await this.updateHRDocumentSettings(settingsUpdate)
    }

    return documentNumber
  }
}

export default employeeService
