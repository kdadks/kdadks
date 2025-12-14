import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Download,
  ArrowLeft,
  Users,
  FileText,
  Trash2,
  X,
  Save,
  Briefcase,
  Receipt,
  Mail,
  CheckCircle
} from 'lucide-react';
import { employeeService } from '../../services/employeeService';
import { PDFBrandingUtils } from '../../utils/pdfBrandingUtils';
import { generateSalarySlipPDF } from '../../utils/salarySlipPDFGenerator';
import { EmailService } from '../../services/emailService';
import { useToast } from '../ui/ToastProvider';
import type {
  Employee,
  EmploymentDocument,
  DocumentType,
  OfferLetterData,
  SalaryCertificateData,
  Form16Data,
  Form24QData,
  HRDocumentSettings,
  SalarySlip,
  CreateSalarySlipInput
} from '../../types/employee';
import type { CompanySettings } from '../../types/invoice';
import { supabase } from '../../config/supabase';

interface EmploymentDocumentsProps {
  onBackToDashboard?: () => void;
}

type ActiveTab = 'employees' | 'documents' | 'salary-slips' | 'generate-document' | 'generate-salary-slip';
type EmployeeView = 'list' | 'add' | 'edit';

const EmploymentDocuments: React.FC<EmploymentDocumentsProps> = ({ onBackToDashboard }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [documents, setDocuments] = useState<EmploymentDocument[]>([]);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  const [hrSettings, setHRSettings] = useState<HRDocumentSettings | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('employees');
  const [employeeView, setEmployeeView] = useState<EmployeeView>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();

  // Employee form state
  const [employeeForm, setEmployeeForm] = useState<Partial<Employee>>({
    employee_number: '',
    first_name: '',
    last_name: '',
    email: '',
    designation: '',
    date_of_joining: new Date().toISOString().split('T')[0],
    employment_type: 'full-time',
    employment_status: 'active',
    basic_salary: 0,
    currency_code: 'INR'
  });

  // Document generation state
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('offer_letter');
  const [documentData, setDocumentData] = useState<any>({});

  // Salary slip generation state
  const [salarySlipInput, setSalarySlipInput] = useState<CreateSalarySlipInput>({
    employee_id: '',
    salary_month: new Date().getMonth() + 1,
    salary_year: new Date().getFullYear(),
    working_days: 26,
    paid_days: 26,
    lop_days: 0,
    tax_regime: 'new'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [employeesData, documentsData, salarySlipsData, hrSettingsData] = await Promise.all([
        employeeService.getEmployees(),
        employeeService.getEmploymentDocuments(),
        employeeService.getSalarySlips(),
        employeeService.getHRDocumentSettings()
      ]);

      setEmployees(employeesData);
      setDocuments(documentsData);
      setSalarySlips(salarySlipsData);
      setHRSettings(hrSettingsData);

      // Load company settings for PDF branding
      const { data: companyData } = await supabase
        .from('company_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      if (companyData) {
        setCompanySettings(companyData);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async () => {
    try {
      if (!employeeForm.employee_number || !employeeForm.first_name || !employeeForm.last_name || !employeeForm.email) {
        showToast('Please fill all required fields', 'error');
        return;
      }

      const fullName = `${employeeForm.first_name} ${employeeForm.middle_name || ''} ${employeeForm.last_name}`.trim();

      const newEmployee = await employeeService.createEmployee({
        ...employeeForm,
        full_name: fullName,
        gross_salary: (employeeForm.basic_salary || 0) + (employeeForm.hra || 0) + (employeeForm.special_allowance || 0) + (employeeForm.other_allowances || 0)
      } as Omit<Employee, 'id' | 'created_at' | 'updated_at'>);

      setEmployees([newEmployee, ...employees]);
      showToast('Employee created successfully', 'success');
      setEmployeeView('list');
      resetEmployeeForm();
    } catch (err) {
      console.error('Error creating employee:', err);
      showToast('Failed to create employee', 'error');
    }
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      employee_number: '',
      first_name: '',
      last_name: '',
      email: '',
      designation: '',
      date_of_joining: new Date().toISOString().split('T')[0],
      employment_type: 'full-time',
      employment_status: 'active',
      basic_salary: 0,
      currency_code: 'INR'
    });
  };

  const generateOfferLetterPDF = async (employee: Employee, data: OfferLetterData) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const dimensions = PDFBrandingUtils.getStandardDimensions();

    let currentY = dimensions.topMargin;

    // Ensure salary_breakdown is populated
    if (!data.salary_breakdown) {
      data.salary_breakdown = {
        basic: employee.basic_salary,
        hra: employee.hra || 0,
        special_allowance: employee.special_allowance || 0,
        other_allowances: employee.other_allowances || 0,
        gross_salary: employee.gross_salary
      };
    }

    // Ensure annual_ctc is set
    if (!data.annual_ctc) {
      data.annual_ctc = employee.gross_salary * 12;
    }

    // Apply branding if available
    if (companySettings) {
      const brandingResult = await PDFBrandingUtils.applyBranding(pdf, companySettings, dimensions);
      currentY = brandingResult.contentStartY;
    }

    // Document title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('EMPLOYMENT OFFER LETTER', dimensions.leftMargin, currentY);
    currentY += 15;

    // Date
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, dimensions.leftMargin, currentY);
    currentY += 10;

    // Employee details
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Dear ${employee.full_name},`, dimensions.leftMargin, currentY);
    currentY += 10;

    pdf.text('We are pleased to offer you employment at our organization.', dimensions.leftMargin, currentY);
    currentY += 15;

    // Position details
    pdf.setFont('helvetica', 'bold');
    pdf.text('Position Details:', dimensions.leftMargin, currentY);
    currentY += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Position: ${data.position}`, dimensions.leftMargin + 5, currentY);
    currentY += 6;
    pdf.text(`Department: ${data.department}`, dimensions.leftMargin + 5, currentY);
    currentY += 6;
    pdf.text(`Joining Date: ${new Date(data.joining_date).toLocaleDateString('en-GB')}`, dimensions.leftMargin + 5, currentY);
    currentY += 6;
    if (data.work_location) {
      pdf.text(`Work Location: ${data.work_location}`, dimensions.leftMargin + 5, currentY);
      currentY += 6;
    }
    if (data.reporting_to) {
      pdf.text(`Reporting To: ${data.reporting_to}`, dimensions.leftMargin + 5, currentY);
      currentY += 6;
    }
    currentY += 5;

    // Compensation
    pdf.setFont('helvetica', 'bold');
    pdf.text('Compensation:', dimensions.leftMargin, currentY);
    currentY += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Annual CTC: ₹${data.annual_ctc.toLocaleString('en-IN')}`, dimensions.leftMargin + 5, currentY);
    currentY += 10;

    pdf.text('Salary Breakdown (Monthly):', dimensions.leftMargin + 5, currentY);
    currentY += 6;
    pdf.text(`  Basic Salary: ₹${data.salary_breakdown.basic.toLocaleString('en-IN')}`, dimensions.leftMargin + 10, currentY);
    currentY += 5;
    pdf.text(`  HRA: ₹${data.salary_breakdown.hra.toLocaleString('en-IN')}`, dimensions.leftMargin + 10, currentY);
    currentY += 5;
    pdf.text(`  Special Allowance: ₹${data.salary_breakdown.special_allowance.toLocaleString('en-IN')}`, dimensions.leftMargin + 10, currentY);
    currentY += 5;
    if (data.salary_breakdown.other_allowances > 0) {
      pdf.text(`  Other Allowances: ₹${data.salary_breakdown.other_allowances.toLocaleString('en-IN')}`, dimensions.leftMargin + 10, currentY);
      currentY += 5;
    }
    pdf.setFont('helvetica', 'bold');
    pdf.text(`  Gross Monthly: ₹${data.salary_breakdown.gross_salary.toLocaleString('en-IN')}`, dimensions.leftMargin + 10, currentY);
    currentY += 10;

    // Terms
    pdf.setFont('helvetica', 'bold');
    pdf.text('Terms of Employment:', dimensions.leftMargin, currentY);
    currentY += 7;

    pdf.setFont('helvetica', 'normal');
    if (data.probation_period) {
      pdf.text(`Probation Period: ${data.probation_period} months`, dimensions.leftMargin + 5, currentY);
      currentY += 6;
    }
    if (data.notice_period) {
      pdf.text(`Notice Period: ${data.notice_period} days`, dimensions.leftMargin + 5, currentY);
      currentY += 6;
    }
    currentY += 5;

    // Benefits
    if (data.benefits && data.benefits.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Benefits:', dimensions.leftMargin, currentY);
      currentY += 7;

      pdf.setFont('helvetica', 'normal');
      data.benefits.forEach(benefit => {
        pdf.text(`• ${benefit}`, dimensions.leftMargin + 5, currentY);
        currentY += 5;
      });
      currentY += 5;
    }

    // Closing
    currentY += 10;
    pdf.text('We look forward to welcoming you to our team.', dimensions.leftMargin, currentY);
    currentY += 10;
    pdf.text('Sincerely,', dimensions.leftMargin, currentY);
    currentY += 15;

    if (hrSettings?.signatory_name) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(hrSettings.signatory_name, dimensions.leftMargin, currentY);
      currentY += 5;
      if (hrSettings.signatory_designation) {
        pdf.setFont('helvetica', 'normal');
        pdf.text(hrSettings.signatory_designation, dimensions.leftMargin, currentY);
      }
    }

    return pdf;
  };

  const generateSalaryCertificatePDF = async (employee: Employee, data: SalaryCertificateData) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const dimensions = PDFBrandingUtils.getStandardDimensions();

    let currentY = dimensions.topMargin;

    // Ensure salary_breakdown is populated
    if (!data.salary_breakdown) {
      data.salary_breakdown = {
        basic: employee.basic_salary,
        hra: employee.hra || 0,
        special_allowance: employee.special_allowance || 0,
        other_allowances: employee.other_allowances || 0,
        gross_monthly: employee.gross_salary
      };
    }

    // Ensure annual_gross is set
    if (!data.annual_gross) {
      data.annual_gross = employee.gross_salary * 12;
    }

    // Apply branding
    if (companySettings) {
      const brandingResult = await PDFBrandingUtils.applyBranding(pdf, companySettings, dimensions);
      currentY = brandingResult.contentStartY;
    }

    // Document title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SALARY CERTIFICATE', dimensions.leftMargin, currentY);
    currentY += 15;

    // Date
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, dimensions.leftMargin, currentY);
    currentY += 15;

    // Certificate content
    pdf.text('To Whom It May Concern,', dimensions.leftMargin, currentY);
    currentY += 10;

    pdf.text(`This is to certify that ${employee.full_name} is employed with our organization`, dimensions.leftMargin, currentY);
    currentY += 6;
    pdf.text(`in the capacity of ${employee.designation}.`, dimensions.leftMargin, currentY);
    currentY += 15;

    // Employee details
    pdf.setFont('helvetica', 'bold');
    pdf.text('Employee Details:', dimensions.leftMargin, currentY);
    currentY += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Employee Number: ${employee.employee_number}`, dimensions.leftMargin + 5, currentY);
    currentY += 6;
    pdf.text(`Designation: ${employee.designation}`, dimensions.leftMargin + 5, currentY);
    currentY += 6;
    if (employee.department) {
      pdf.text(`Department: ${employee.department}`, dimensions.leftMargin + 5, currentY);
      currentY += 6;
    }
    pdf.text(`Date of Joining: ${new Date(employee.date_of_joining).toLocaleDateString('en-GB')}`, dimensions.leftMargin + 5, currentY);
    currentY += 15;

    // Salary details
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Salary Details (${data.period_from} to ${data.period_to}):`, dimensions.leftMargin, currentY);
    currentY += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.text('Monthly Breakdown:', dimensions.leftMargin + 5, currentY);
    currentY += 6;
    pdf.text(`  Basic Salary: ₹${data.salary_breakdown.basic.toLocaleString('en-IN')}`, dimensions.leftMargin + 10, currentY);
    currentY += 5;
    pdf.text(`  HRA: ₹${data.salary_breakdown.hra.toLocaleString('en-IN')}`, dimensions.leftMargin + 10, currentY);
    currentY += 5;
    pdf.text(`  Special Allowance: ₹${data.salary_breakdown.special_allowance.toLocaleString('en-IN')}`, dimensions.leftMargin + 10, currentY);
    currentY += 5;
    if (data.salary_breakdown.other_allowances > 0) {
      pdf.text(`  Other Allowances: ₹${data.salary_breakdown.other_allowances.toLocaleString('en-IN')}`, dimensions.leftMargin + 10, currentY);
      currentY += 5;
    }
    pdf.setFont('helvetica', 'bold');
    pdf.text(`  Gross Monthly: ₹${data.salary_breakdown.gross_monthly.toLocaleString('en-IN')}`, dimensions.leftMargin + 10, currentY);
    currentY += 10;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Annual Gross Salary: ₹${data.annual_gross.toLocaleString('en-IN')}`, dimensions.leftMargin + 5, currentY);
    currentY += 15;

    // Purpose
    if (data.purpose) {
      pdf.text(`Purpose: ${data.purpose}`, dimensions.leftMargin, currentY);
      currentY += 15;
    }

    // Closing
    pdf.text('This certificate is issued upon request for official purposes.', dimensions.leftMargin, currentY);
    currentY += 15;

    pdf.text('Sincerely,', dimensions.leftMargin, currentY);
    currentY += 15;

    if (hrSettings?.signatory_name) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(hrSettings.signatory_name, dimensions.leftMargin, currentY);
      currentY += 5;
      if (hrSettings.signatory_designation) {
        pdf.setFont('helvetica', 'normal');
        pdf.text(hrSettings.signatory_designation, dimensions.leftMargin, currentY);
      }
    }

    return pdf;
  };

  const generateForm16PDF = async (employee: Employee, data: Form16Data) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const dimensions = PDFBrandingUtils.getStandardDimensions();

    let currentY = dimensions.topMargin;

    // Form 16 Header
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FORM 16', pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    currentY += 7;
    pdf.setFontSize(10);
    pdf.text('[See rule 31(1)(a)]', pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    currentY += 7;
    pdf.text('Certificate under section 203 of the Income-tax Act, 1961', pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    currentY += 7;
    pdf.text('for tax deducted at source on salary', pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    currentY += 15;

    // Financial Year
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Financial Year: ${data.financial_year}`, dimensions.leftMargin, currentY);
    currentY += 15;

    // Part A - Details of Employee and Employer
    pdf.setFont('helvetica', 'bold');
    pdf.text('PART A', dimensions.leftMargin, currentY);
    currentY += 10;

    pdf.setFont('helvetica', 'normal');
    pdf.text('1. Name and address of the Employer:', dimensions.leftMargin, currentY);
    currentY += 6;
    pdf.text(`   ${data.employer.name}`, dimensions.leftMargin, currentY);
    currentY += 5;
    pdf.text(`   ${data.employer.address}`, dimensions.leftMargin, currentY);
    currentY += 8;

    pdf.text(`2. TAN of the Employer: ${data.employer.tan}`, dimensions.leftMargin, currentY);
    currentY += 6;
    pdf.text(`3. PAN of the Employer: ${data.employer.pan}`, dimensions.leftMargin, currentY);
    currentY += 10;

    pdf.text('4. Name and address of the Employee:', dimensions.leftMargin, currentY);
    currentY += 6;
    pdf.text(`   ${data.employee.name}`, dimensions.leftMargin, currentY);
    currentY += 5;
    pdf.text(`   ${data.employee.address}`, dimensions.leftMargin, currentY);
    currentY += 8;

    pdf.text(`5. PAN of the Employee: ${data.employee.pan}`, dimensions.leftMargin, currentY);
    currentY += 15;

    // Part B - Details of Salary Paid and Tax Deducted
    pdf.setFont('helvetica', 'bold');
    pdf.text('PART B', dimensions.leftMargin, currentY);
    currentY += 10;

    pdf.setFont('helvetica', 'normal');
    pdf.text('Details of Salary paid and any other income and tax deducted', dimensions.leftMargin, currentY);
    currentY += 10;

    // Salary details table
    const tableData = [
      ['Gross Salary', `₹${data.salary_details.gross_salary.toLocaleString('en-IN')}`],
      ['Allowances', `₹${data.salary_details.allowances.toLocaleString('en-IN')}`],
      ['Perquisites', `₹${data.salary_details.perquisites.toLocaleString('en-IN')}`],
      ['Profits in lieu of salary', `₹${data.salary_details.profits_in_lieu.toLocaleString('en-IN')}`],
      ['', ''],
      ['Less: Deductions', ''],
      ['Standard Deduction', `₹${data.deductions.standard_deduction.toLocaleString('en-IN')}`],
      ['Entertainment Allowance', `₹${data.deductions.entertainment_allowance.toLocaleString('en-IN')}`],
      ['Professional Tax', `₹${data.deductions.professional_tax.toLocaleString('en-IN')}`],
      ['', ''],
      ['Gross Total Income', `₹${data.income_chargeable.toLocaleString('en-IN')}`],
      ['', ''],
      ['Deductions under Chapter VI-A', ''],
      ['80C', `₹${data.chapter_vi_deductions.section_80c.toLocaleString('en-IN')}`],
      ['80D', `₹${data.chapter_vi_deductions.section_80d.toLocaleString('en-IN')}`],
      ['Other', `₹${data.chapter_vi_deductions.other.toLocaleString('en-IN')}`],
      ['', ''],
      ['Total Income', `₹${data.income_chargeable.toLocaleString('en-IN')}`],
      ['Tax on total income', `₹${data.tax_computed.toLocaleString('en-IN')}`],
      ['Relief under section 89', `₹${data.relief_under_89.toLocaleString('en-IN')}`],
      ['Tax payable', `₹${data.tax_payable.toLocaleString('en-IN')}`],
      ['TDS deducted', `₹${data.tds_deducted.toLocaleString('en-IN')}`]
    ];

    tableData.forEach(([label, value]) => {
      if (!label) {
        currentY += 3;
        return;
      }
      pdf.text(label, dimensions.leftMargin + 5, currentY);
      if (value) {
        pdf.text(value, dimensions.rightMargin - 40, currentY, { align: 'right' });
      }
      currentY += 6;
    });

    // Signature
    currentY += 10;
    pdf.text('Signature of the person responsible for deduction of tax', dimensions.leftMargin, currentY);
    currentY += 15;

    if (hrSettings?.signatory_name) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(hrSettings.signatory_name, dimensions.leftMargin, currentY);
      currentY += 5;
      if (hrSettings.signatory_designation) {
        pdf.setFont('helvetica', 'normal');
        pdf.text(hrSettings.signatory_designation, dimensions.leftMargin, currentY);
      }
    }

    return pdf;
  };

  const generateForm24QPDF = async (data: Form24QData) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const dimensions = PDFBrandingUtils.getStandardDimensions();

    let currentY = dimensions.topMargin;

    // Form 24Q Header
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FORM 24Q', pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    currentY += 7;
    pdf.setFontSize(10);
    pdf.text('Quarterly Statement of TDS on Salaries', pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    currentY += 15;

    // Quarter and FY details
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Financial Year: ${data.financial_year}`, dimensions.leftMargin, currentY);
    currentY += 6;
    pdf.text(`Quarter: Q${data.quarter}`, dimensions.leftMargin, currentY);
    currentY += 15;

    // Employer details
    pdf.setFont('helvetica', 'bold');
    pdf.text('Employer Details:', dimensions.leftMargin, currentY);
    currentY += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Name: ${data.employer.name}`, dimensions.leftMargin + 5, currentY);
    currentY += 6;
    pdf.text(`TAN: ${data.employer.tan}`, dimensions.leftMargin + 5, currentY);
    currentY += 6;
    pdf.text(`PAN: ${data.employer.pan}`, dimensions.leftMargin + 5, currentY);
    currentY += 15;

    // Employee-wise TDS details
    pdf.setFont('helvetica', 'bold');
    pdf.text('Employee-wise TDS Details:', dimensions.leftMargin, currentY);
    currentY += 10;

    // Table header
    pdf.setFontSize(9);
    pdf.text('Employee Name', dimensions.leftMargin, currentY);
    pdf.text('PAN', dimensions.leftMargin + 60, currentY);
    pdf.text('TDS', dimensions.leftMargin + 100, currentY);
    pdf.text('Challan', dimensions.leftMargin + 130, currentY);
    currentY += 5;

    pdf.setLineWidth(0.5);
    pdf.line(dimensions.leftMargin, currentY, dimensions.rightMargin, currentY);
    currentY += 5;

    // Employee details
    pdf.setFont('helvetica', 'normal');
    data.employees.forEach(emp => {
      pdf.text(emp.employee_name.substring(0, 25), dimensions.leftMargin, currentY);
      pdf.text(emp.pan, dimensions.leftMargin + 60, currentY);
      pdf.text(`₹${emp.tds_deducted.toLocaleString('en-IN')}`, dimensions.leftMargin + 100, currentY);
      pdf.text(emp.challan_details.challan_number, dimensions.leftMargin + 130, currentY);
      currentY += 6;

      if (currentY > 270) {
        pdf.addPage();
        currentY = dimensions.topMargin;
      }
    });

    currentY += 5;
    pdf.line(dimensions.leftMargin, currentY, dimensions.rightMargin, currentY);
    currentY += 7;

    // Total
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total TDS:', dimensions.leftMargin, currentY);
    pdf.text(`₹${data.total_tds.toLocaleString('en-IN')}`, dimensions.leftMargin + 100, currentY);
    currentY += 20;

    // Signature
    pdf.setFont('helvetica', 'normal');
    pdf.text('Authorized Signatory', dimensions.leftMargin, currentY);
    currentY += 15;

    if (hrSettings?.signatory_name) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(hrSettings.signatory_name, dimensions.leftMargin, currentY);
      currentY += 5;
      if (hrSettings.signatory_designation) {
        pdf.setFont('helvetica', 'normal');
        pdf.text(hrSettings.signatory_designation, dimensions.leftMargin, currentY);
      }
    }

    return pdf;
  };

  const handleGenerateDocument = async () => {
    try {
      if (!selectedEmployee) {
        showToast('Please select an employee', 'error');
        return;
      }

      const documentNumber = await employeeService.generateDocumentNumber(documentType);
      let pdf: jsPDF;

      switch (documentType) {
        case 'offer_letter':
          pdf = await generateOfferLetterPDF(selectedEmployee, documentData as OfferLetterData);
          break;
        case 'salary_certificate':
          pdf = await generateSalaryCertificatePDF(selectedEmployee, documentData as SalaryCertificateData);
          break;
        case 'form_16':
          pdf = await generateForm16PDF(selectedEmployee, documentData as Form16Data);
          break;
        case 'form_24q':
          pdf = await generateForm24QPDF(documentData as Form24QData);
          break;
        default:
          throw new Error('Unsupported document type');
      }

      // Save document record
      await employeeService.createEmploymentDocument({
        employee_id: selectedEmployee.id,
        document_type: documentType,
        document_number: documentNumber,
        document_date: new Date().toISOString().split('T')[0],
        document_data: documentData,
        status: 'generated'
      });

      // Download PDF
      pdf.save(`${documentType}_${selectedEmployee.employee_number}_${documentNumber}.pdf`);

      showToast('Document generated successfully', 'success');
      loadData();
      setActiveTab('documents');
    } catch (err) {
      console.error('Error generating document:', err);
      showToast('Failed to generate document', 'error');
    }
  };

  const handleGenerateSalarySlip = async () => {
    try {
      if (!salarySlipInput.employee_id) {
        showToast('Please select an employee', 'error');
        return;
      }

      // Generate salary slip
      const salarySlip = await employeeService.generateSalarySlip(salarySlipInput);

      showToast('Salary slip generated successfully', 'success');
      loadData();
      setActiveTab('salary-slips');
    } catch (err: any) {
      console.error('Error generating salary slip:', err);
      showToast(err.message || 'Failed to generate salary slip', 'error');
    }
  };

  const handleDownloadSalarySlip = async (salarySlip: SalarySlip) => {
    try {
      const employee = employees.find(emp => emp.id === salarySlip.employee_id);
      if (!employee) {
        showToast('Employee not found', 'error');
        return;
      }

      const pdf = await generateSalarySlipPDF(employee, salarySlip, companySettings || undefined);
      const fileName = `salary_slip_${employee.employee_number}_${salarySlip.salary_month}_${salarySlip.salary_year}.pdf`;
      pdf.save(fileName);

      showToast('Salary slip downloaded successfully', 'success');
    } catch (err) {
      console.error('Error downloading salary slip:', err);
      showToast('Failed to download salary slip', 'error');
    }
  };

  const handleEmailSalarySlip = async (salarySlip: SalarySlip) => {
    try {
      const employee = employees.find(emp => emp.id === salarySlip.employee_id);
      if (!employee) {
        showToast('Employee not found', 'error');
        return;
      }

      if (!employee.email) {
        showToast('Employee email not found', 'error');
        return;
      }

      // Generate PDF
      const pdf = await generateSalarySlipPDF(employee, salarySlip, companySettings || undefined);
      const pdfBlob = pdf.output('blob');

      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;

        // Send email
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const monthYear = `${monthNames[salarySlip.salary_month - 1]} ${salarySlip.salary_year}`;

        await EmailService.sendSalarySlipEmail({
          to: employee.email,
          employeeName: employee.full_name,
          month: monthYear,
          netSalary: salarySlip.net_salary,
          pdfAttachment: base64data
        });

        // Mark as sent
        await employeeService.markSalarySlipEmailSent(salarySlip.id, employee.email);

        showToast('Salary slip sent successfully', 'success');
        loadData();
      };
    } catch (err) {
      console.error('Error sending salary slip:', err);
      showToast('Failed to send salary slip', 'error');
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <button
                onClick={onBackToDashboard}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </button>
              <h1 className="text-xl font-semibold text-gray-900">HR & Employment Documents</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-4 py-4">
            <button
              onClick={() => setActiveTab('employees')}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'employees'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Employees
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'documents'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </button>
            <button
              onClick={() => setActiveTab('salary-slips')}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'salary-slips'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Receipt className="w-4 h-4 mr-2" />
              Salary Slips
            </button>
            <button
              onClick={() => setActiveTab('generate-document')}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'generate-document'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Briefcase className="w-4 h-4 mr-2" />
              Generate Document
            </button>
            <button
              onClick={() => setActiveTab('generate-salary-slip')}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'generate-salary-slip'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Receipt className="w-4 h-4 mr-2" />
              Generate Salary Slip
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Employees Tab */}
        {activeTab === 'employees' && employeeView === 'list' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={() => setEmployeeView('add')}
                className="ml-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Employee
              </button>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Designation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joining Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                        <div className="text-sm text-gray-500">{employee.employee_number}</div>
                        <div className="text-sm text-gray-500">{employee.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{employee.designation}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{employee.department || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          employee.employment_status === 'active' ? 'bg-green-100 text-green-800' :
                          employee.employment_status === 'on-leave' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {employee.employment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(employee.date_of_joining).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setActiveTab('generate-document');
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <FileText className="w-5 h-5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Salary Slips Tab */}
        {activeTab === 'salary-slips' && (
          <div>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gross Salary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net Salary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salarySlips.map((slip) => {
                    const employee = employees.find(e => e.id === slip.employee_id);
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return (
                      <tr key={slip.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{employee?.full_name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{employee?.employee_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {monthNames[slip.salary_month - 1]} {slip.salary_year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{slip.gross_salary.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ₹{slip.net_salary.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            slip.status === 'paid' ? 'bg-green-100 text-green-800' :
                            slip.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {slip.status}
                          </span>
                          {slip.email_sent && <CheckCircle className="w-4 h-4 inline ml-2 text-green-600" title="Email sent" />}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDownloadSalarySlip(slip)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="Download PDF"
                          >
                            <Download className="w-5 h-5 inline" />
                          </button>
                          {!slip.email_sent && employee?.email && (
                            <button
                              onClick={() => handleEmailSalarySlip(slip)}
                              className="text-green-600 hover:text-green-900"
                              title="Send via Email"
                            >
                              <Mail className="w-5 h-5 inline" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Generate Salary Slip Tab */}
        {activeTab === 'generate-salary-slip' && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-6">Generate Salary Slip</h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Employee *
                  </label>
                  <select
                    value={salarySlipInput.employee_id}
                    onChange={(e) => setSalarySlipInput({ ...salarySlipInput, employee_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select an employee</option>
                    {employees.filter(e => e.employment_status === 'active').map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Regime
                  </label>
                  <select
                    value={salarySlipInput.tax_regime}
                    onChange={(e) => setSalarySlipInput({ ...salarySlipInput, tax_regime: e.target.value as 'old' | 'new' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="new">New Tax Regime</option>
                    <option value="old">Old Tax Regime</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Month *
                  </label>
                  <select
                    value={salarySlipInput.salary_month}
                    onChange={(e) => setSalarySlipInput({ ...salarySlipInput, salary_month: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, i) => (
                      <option key={i} value={i + 1}>{month}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year *
                  </label>
                  <input
                    type="number"
                    value={salarySlipInput.salary_year}
                    onChange={(e) => setSalarySlipInput({ ...salarySlipInput, salary_year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Working Days
                  </label>
                  <input
                    type="number"
                    value={salarySlipInput.working_days}
                    onChange={(e) => setSalarySlipInput({ ...salarySlipInput, working_days: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LOP Days (Loss of Pay)
                  </label>
                  <input
                    type="number"
                    value={salarySlipInput.lop_days}
                    onChange={(e) => {
                      const lop = parseFloat(e.target.value) || 0;
                      setSalarySlipInput({
                        ...salarySlipInput,
                        lop_days: lop,
                        paid_days: (salarySlipInput.working_days || 26) - lop
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bonus
                  </label>
                  <input
                    type="number"
                    value={salarySlipInput.bonus || 0}
                    onChange={(e) => setSalarySlipInput({ ...salarySlipInput, bonus: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overtime
                  </label>
                  <input
                    type="number"
                    value={salarySlipInput.overtime || 0}
                    onChange={(e) => setSalarySlipInput({ ...salarySlipInput, overtime: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setActiveTab('salary-slips')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateSalarySlip}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={!salarySlipInput.employee_id}
                >
                  <Save className="w-4 h-4 inline mr-2" />
                  Generate Salary Slip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {doc.document_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.document_type.replace('_', ' ').toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(doc.document_date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {doc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Employee View */}
        {activeTab === 'employees' && employeeView === 'add' && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Add New Employee</h2>
              <button
                onClick={() => {
                  resetEmployeeForm();
                  setEmployeeView('list');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee Number *
                </label>
                <input
                  type="text"
                  value={employeeForm.employee_number}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, employee_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={employeeForm.first_name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, first_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={employeeForm.middle_name || ''}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, middle_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={employeeForm.last_name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, last_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Father's Name
                </label>
                <input
                  type="text"
                  value={employeeForm.fathers_name || ''}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, fathers_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={employeeForm.phone || ''}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={employeeForm.date_of_birth || ''}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, date_of_birth: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  value={employeeForm.gender || ''}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, gender: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Designation *
                </label>
                <input
                  type="text"
                  value={employeeForm.designation}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  value={employeeForm.department || ''}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Joining *
                </label>
                <input
                  type="date"
                  value={employeeForm.date_of_joining}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, date_of_joining: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employment Type *
                </label>
                <select
                  value={employeeForm.employment_type}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, employment_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="intern">Intern</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Basic Salary *
                </label>
                <input
                  type="number"
                  value={employeeForm.basic_salary}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, basic_salary: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HRA
                </label>
                <input
                  type="number"
                  value={employeeForm.hra || 0}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, hra: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Allowance
                </label>
                <input
                  type="number"
                  value={employeeForm.special_allowance || 0}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, special_allowance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PAN Number
                </label>
                <input
                  type="text"
                  value={employeeForm.pan_number || ''}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, pan_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ABCDE1234F"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aadhar Number
                </label>
                <input
                  type="text"
                  value={employeeForm.aadhar_number || ''}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, aadhar_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1234 5678 9012"
                />
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-md font-semibold mb-4">Address Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={employeeForm.address_line1 || ''}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, address_line1: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={employeeForm.address_line2 || ''}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, address_line2: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={employeeForm.city || ''}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={employeeForm.state || ''}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={employeeForm.postal_code || ''}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, postal_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={employeeForm.country || 'India'}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-md font-semibold mb-4">Bank Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={employeeForm.bank_name || ''}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, bank_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={employeeForm.bank_ifsc_code || ''}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, bank_ifsc_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="SBIN0001234"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={employeeForm.bank_account_number || ''}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, bank_account_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3 border-t pt-4">
              <button
                onClick={() => {
                  resetEmployeeForm();
                  setEmployeeView('list');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEmployee}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Save className="w-4 h-4 inline mr-2" />
                Save Employee
              </button>
            </div>
          </div>
        )}

        {/* Generate Document Tab */}
        {activeTab === 'generate-document' && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-6">Generate Employment Document</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Employee *
                </label>
                <select
                  value={selectedEmployee?.id || ''}
                  onChange={(e) => {
                    const emp = employees.find(emp => emp.id === e.target.value);
                    setSelectedEmployee(emp || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an employee</option>
                  {employees.filter(e => e.employment_status === 'active').map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type *
                </label>
                <select
                  value={documentType}
                  onChange={(e) => {
                    setDocumentType(e.target.value as DocumentType);
                    setDocumentData({});
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="offer_letter">Offer Letter</option>
                  <option value="salary_certificate">Salary Certificate</option>
                  <option value="form_16">Form 16</option>
                  <option value="form_24q">Form 24Q</option>
                </select>
              </div>

              {/* Document-specific fields */}
              {selectedEmployee && documentType === 'offer_letter' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium">Offer Letter Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                      <input
                        type="text"
                        value={documentData.position || selectedEmployee.designation}
                        onChange={(e) => setDocumentData({ ...documentData, position: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                      <input
                        type="text"
                        value={documentData.department || selectedEmployee.department || ''}
                        onChange={(e) => setDocumentData({ ...documentData, department: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Joining Date</label>
                      <input
                        type="date"
                        value={documentData.joining_date || selectedEmployee.date_of_joining}
                        onChange={(e) => setDocumentData({ ...documentData, joining_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Annual CTC</label>
                      <input
                        type="number"
                        value={documentData.annual_ctc || selectedEmployee.gross_salary * 12}
                        onChange={(e) => setDocumentData({ ...documentData, annual_ctc: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Probation Period (months)</label>
                      <input
                        type="number"
                        value={documentData.probation_period || 3}
                        onChange={(e) => setDocumentData({ ...documentData, probation_period: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notice Period (days)</label>
                      <input
                        type="number"
                        value={documentData.notice_period || 30}
                        onChange={(e) => setDocumentData({ ...documentData, notice_period: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDocumentData({
                        ...documentData,
                        salary_breakdown: {
                          basic: selectedEmployee.basic_salary,
                          hra: selectedEmployee.hra || 0,
                          special_allowance: selectedEmployee.special_allowance || 0,
                          other_allowances: selectedEmployee.other_allowances || 0,
                          gross_salary: selectedEmployee.gross_salary
                        }
                      });
                    }}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Auto-fill salary from employee data
                  </button>
                </div>
              )}

              {selectedEmployee && documentType === 'salary_certificate' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium">Salary Certificate Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
                      <input
                        type="text"
                        value={documentData.purpose || ''}
                        onChange={(e) => setDocumentData({ ...documentData, purpose: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g., Bank Loan, Visa Application"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Period From</label>
                      <input
                        type="month"
                        value={documentData.period_from || ''}
                        onChange={(e) => setDocumentData({ ...documentData, period_from: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Period To</label>
                      <input
                        type="month"
                        value={documentData.period_to || ''}
                        onChange={(e) => setDocumentData({ ...documentData, period_to: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDocumentData({
                        ...documentData,
                        salary_breakdown: {
                          basic: selectedEmployee.basic_salary,
                          hra: selectedEmployee.hra || 0,
                          special_allowance: selectedEmployee.special_allowance || 0,
                          other_allowances: selectedEmployee.other_allowances || 0,
                          gross_monthly: selectedEmployee.gross_salary
                        },
                        annual_gross: selectedEmployee.gross_salary * 12
                      });
                    }}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Auto-fill from employee data
                  </button>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setActiveTab('employees')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateDocument}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={!selectedEmployee}
                >
                  <Download className="w-4 h-4 inline mr-2" />
                  Generate PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EmploymentDocuments;
