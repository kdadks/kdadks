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
  CheckCircle,
  AlertCircle,
  Key,
  Upload,
  RefreshCw,
  Globe,
  Shield
} from 'lucide-react';
import { employeeService } from '../../services/employeeService';
import { employeeAuthService } from '../../services/employeeAuthService';
import { employeeDocumentService } from '../../services/employeeDocumentService';
import { compensationService } from '../../services/compensationService';
import { PDFBrandingUtils } from '../../utils/pdfBrandingUtils';
import { generateSalarySlipPDF } from '../../utils/salarySlipPDFGenerator';
import {
  generateInternOfferLetterPDF,
  generateInternExperienceCertificatePDF,
  getDefaultInternOfferLetterData,
  getDefaultInternExperienceCertData,
  validateInternOfferLetter,
  validateInternExperienceCertificate,
  canPerformAction,
  PROGRAM_NAME_DEFAULT,
} from '../../utils/internDocumentTemplates';
import { getPrefilledDocumentData, getJurisdictionInfo } from '../../utils/employmentDocumentTemplates';
import { EmailService } from '../../services/emailService';
import { useToast } from '../ui/ToastProvider';
import { useActionProgress } from '../../contexts/ActionProgressContext';
import { useCompanyContext } from '../../contexts/CompanyContext';
import type {
  Employee,
  EmploymentDocument,
  DocumentType,
  OfferLetterData,
  SalaryCertificateData,
  ExperienceCertificateData,
  RelievingLetterData,
  Form16Data,
  Form24QData,
  HRDocumentSettings,
  SalarySlip,
  CreateSalarySlipInput,
  InternOfferLetterData,
  InternExperienceCertificateData,
} from '../../types/employee';
import type { CompanySettings } from '../../types/invoice';
import { supabase } from '../../config/supabase';
import EmployeeNotes from './EmployeeNotes';
import RehireWorkflow from './RehireWorkflow';
import InternConversionWorkflow from './InternConversionWorkflow';

interface EmploymentDocumentsProps {
  onBackToDashboard?: () => void;
}

type ActiveTab = 'employees' | 'documents' | 'salary-slips' | 'generate-document' | 'generate-salary-slip';
type EmployeeView = 'list' | 'add' | 'edit' | 'view';

const EmploymentDocuments: React.FC<EmploymentDocumentsProps> = ({ onBackToDashboard }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [documents, setDocuments] = useState<EmploymentDocument[]>([]);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  const [hrSettings, setHRSettings] = useState<HRDocumentSettings | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('employees');
  const [previousTab, setPreviousTab] = useState<ActiveTab>('employees');
  const [employeeView, setEmployeeView] = useState<EmployeeView>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const { showSuccess, showError } = useToast();
  const { startAction, endAction } = useActionProgress();

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
  const [previewPdf, setPreviewPdf] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Document editing state
  const [editingDocument, setEditingDocument] = useState<EmploymentDocument | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedDocumentData, setEditedDocumentData] = useState<any>({});
  const [isSavingDocument, setIsSavingDocument] = useState(false);

  // Document viewing state
  const [viewingDocument, setViewingDocument] = useState<EmploymentDocument | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Document delete state
  const [showDeleteDocumentModal, setShowDeleteDocumentModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<EmploymentDocument | null>(null);

  // Salary slip editing state
  const [editingSalarySlip, setEditingSalarySlip] = useState<SalarySlip | null>(null);
  const [showEditSalarySlipModal, setShowEditSalarySlipModal] = useState(false);
  const [editedSalarySlipData, setEditedSalarySlipData] = useState<Partial<SalarySlip>>({});
  const [isSavingSalarySlip, setIsSavingSalarySlip] = useState(false);

  // Temporary password modal state
  const [showTempPasswordModal, setShowTempPasswordModal] = useState(false);
  const [tempPasswordData, setTempPasswordData] = useState<{ email: string; password: string; name: string } | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Workflow modal state
  const [showRehireModal, setShowRehireModal] = useState(false);
  const [showInternConversionModal, setShowInternConversionModal] = useState(false);

  // Employee document verification state
  const [showVerifyDocModal, setShowVerifyDocModal] = useState(false);
  const [verifyingDocument, setVerifyingDocument] = useState<any | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string>('pending');
  const [verificationComments, setVerificationComments] = useState('');

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

  // Employee uploaded documents state
  const [showEmployeeDocsModal, setShowEmployeeDocsModal] = useState(false);
  const [employeeDocuments, setEmployeeDocuments] = useState<any[]>([]);
  const [selectedEmployeeForDocs, setSelectedEmployeeForDocs] = useState<Employee | null>(null);
  const [loadingEmployeeDocs, setLoadingEmployeeDocs] = useState(false);

  // Document preview state
  const [showDocPreviewModal, setShowDocPreviewModal] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewingDoc, setPreviewingDoc] = useState<any>(null);

  // Deduction configuration flags
  const [applyDeductions, setApplyDeductions] = useState({
    provident_fund: true,
    professional_tax: true,
    esic: true,
    tds: true
  });

  const { selectedCompany } = useCompanyContext();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      setCompanySettings(selectedCompany);
    }
  }, [selectedCompany]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [employeesData, documentsData, salarySlipsData, hrSettingsData] = await Promise.all([
        employeeService.getEmployees(selectedCompany?.id),
        employeeService.getAllEmployeeDocuments(),
        employeeService.getSalarySlips(),
        employeeService.getHRDocumentSettings()
      ]);

      setEmployees(employeesData);
      setDocuments(documentsData);
      setSalarySlips(salarySlipsData);
      setHRSettings(hrSettingsData);

      if (selectedCompany) {
        setCompanySettings(selectedCompany);
      } else {
        const { data: companyData } = await supabase
          .from('company_settings')
          .select('*')
          .eq('is_active', true)
          .single();

        if (companyData) {
          setCompanySettings(companyData);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      showError('Failed to load data');
    } finally {
      setLoading(false)
    }
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    startAction('Deleting employee record…');
    try {
      await employeeService.deleteEmployee(employeeToDelete.id);
      showSuccess('Employee deleted successfully');
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
      loadData();
    } catch (err) {
      console.error('Error deleting employee:', err);
      showError('Failed to delete employee');
    } finally {
      endAction();
    }
  };

  const handleViewEmployeeDocuments = async (employee: Employee) => {
    try {
      setSelectedEmployeeForDocs(employee);
      setLoadingEmployeeDocs(true);
      setShowEmployeeDocsModal(true);

      // Fetch all documents using unified view
      const allDocs = await employeeService.getAllEmployeeDocuments(employee.id);

      setEmployeeDocuments(allDocs);
    } catch (err) {
      console.error('Error loading employee documents:', err);
      showError('Failed to load employee documents');
    } finally {
      setLoadingEmployeeDocs(false);
    }
  };

  const handlePreviewEmployeeDocument = async (doc: any) => {
    try {
      setPreviewingDoc(doc);

      if (doc.storage_path) {
        // Employee uploaded document - get signed URL
        try {
          const url = await employeeDocumentService.getDocumentUrl(doc.storage_path);
          setPreviewDocUrl(url);
          setShowDocPreviewModal(true);
          return;
        } catch (storageErr) {
          console.warn('Storage preview failed:', storageErr);
          // Try pdf_url as fallback
          if (doc.pdf_url) {
            setPreviewDocUrl(doc.pdf_url);
            setShowDocPreviewModal(true);
            return;
          }
          // Continue to other options
        }
      }
      
      if (doc.pdf_url) {
        // Admin generated document with stored URL
        setPreviewDocUrl(doc.pdf_url);
        setShowDocPreviewModal(true);
        return;
      }
      
      // Try to regenerate PDF from document_data if available
      if (doc.document_type && doc.document_data) {
        const employee = employees.find(emp => emp.id === doc.employee_id);
        if (employee) {
          let pdf: jsPDF;
          const docData = doc.document_data;

          try {
            // Generate PDF based on document type
            switch (doc.document_type) {
              case 'offer_letter':
                pdf = await generateOfferLetterPDF(employee, docData as OfferLetterData);
                break;
              case 'salary_certificate':
                pdf = await generateSalaryCertificatePDF(employee, docData as SalaryCertificateData);
                break;
              case 'experience_certificate':
                pdf = await generateExperienceCertificatePDF(employee, docData as ExperienceCertificateData);
                break;
              case 'relieving_letter':
                pdf = await generateRelievingLetterPDF(employee, docData as RelievingLetterData);
                break;
              case 'form_16':
                pdf = await generateForm16PDF(employee, docData as Form16Data);
                break;
              case 'form_24q':
                pdf = await generateForm24QPDF(docData as Form24QData);
                break;
              case 'intern_offer_letter':
                pdf = await generateInternOfferLetterPDF(employee, docData as InternOfferLetterData, companySettings, hrSettings?.signatory_name, hrSettings?.signatory_designation);
                break;
              case 'intern_experience_certificate':
                pdf = await generateInternExperienceCertificatePDF(employee, docData as InternExperienceCertificateData, companySettings, hrSettings?.signatory_name, hrSettings?.signatory_designation);
                break;
              default:
                throw new Error(`Unsupported document type: ${doc.document_type}`);
            }

            // Create blob URL for preview
            const pdfBlob = pdf.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            setPreviewDocUrl(pdfUrl);
            setShowDocPreviewModal(true);
            return;
          } catch (regenerateErr) {
            console.warn('PDF regeneration failed:', regenerateErr);
            // Continue to basic certificate
          }
        }
      }

      // Final fallback: Create basic document certificate
      const employee = employees.find(emp => emp.id === doc.employee_id);
      if (!employee) {
        showError('Employee not found');
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.setFont('helvetica');
      
      let y = 20;
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Title
      pdf.setFontSize(16);
      pdf.text('Document Certificate', pageWidth / 2, y, { align: 'center' });
      
      y += 15;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Document Information', 10, y);
      
      y += 10;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      // Document details
      const details = [
        [`Document Type:`, doc.document_type?.replace(/_/g, ' ').toUpperCase() || 'Unknown'],
        [`Document Number:`, doc.document_number || 'N/A'],
        [`Document Date:`, doc.document_date ? new Date(doc.document_date).toLocaleDateString('en-IN') : 'N/A'],
        [`Employee Name:`, `${employee.first_name} ${employee.last_name}`],
        [`Employee ID:`, employee.employee_number || 'N/A'],
        [`Status:`, doc.status || 'Generated'],
        [`Generated On:`, new Date(doc.created_at || Date.now()).toLocaleString('en-IN')]
      ];
      
      details.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, 10, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(String(value), 70, y);
        y += 7;
      });
      
      y += 10;
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(9);
      pdf.text('Note: This is a preview of the document certificate. For the complete document, please download or regenerate.', 10, y, { maxWidth: 190 });

      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      setPreviewDocUrl(pdfUrl);
      setShowDocPreviewModal(true);
    } catch (err) {
      console.error('Error previewing document:', err);
      showError(`Failed to preview document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDownloadEmployeeDocument = async (doc: any) => {
    try {
      if (doc.storage_path) {
        // Employee uploaded document
        const blob = await employeeDocumentService.downloadDocument(doc.storage_path);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.file_name || doc.document_name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (doc.pdf_url) {
        // Admin generated document - download
        const response = await fetch(doc.pdf_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.document_type}_${doc.document_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Error downloading document:', err);
      showError('Failed to download document');
    }
  };

  const handleVerifyDocument = async (docId: string, status: 'verified' | 'rejected', comments?: string) => {
    try {
      await employeeDocumentService.updateVerificationStatus(docId, status, 'admin-user-id', comments);
      showSuccess(`Document ${status} successfully`);

      // Reload documents
      if (selectedEmployeeForDocs) {
        await handleViewEmployeeDocuments(selectedEmployeeForDocs);
      }
    } catch (err) {
      console.error('Error verifying document:', err);
      showError('Failed to update document status');
    }
  };

  const handleCreateEmployee = async () => {
    try {
      if (!employeeForm.employee_number || !employeeForm.first_name || !employeeForm.last_name || !employeeForm.email) {
        showError('Please fill all required fields');
        return;
      }

      const fullName = `${employeeForm.first_name} ${employeeForm.middle_name || ''} ${employeeForm.last_name}`.trim();

      const newEmployee = await employeeService.createEmployee({
        ...employeeForm,
        full_name: fullName,
        gross_salary: employeeForm.basic_salary || 0,
        hra: 0,
        special_allowance: 0,
        other_allowances: 0
      } as Omit<Employee, 'id' | 'created_at' | 'updated_at'>);

      // Generate and set temporary password
      const tempPassword = employeeAuthService.generateTemporaryPassword();
      await employeeAuthService.setTemporaryPassword(newEmployee.id, tempPassword);

      // Send password reset email to employee
      try {
        await EmailService.sendPasswordResetNotification(
          newEmployee.email,
          fullName,
          tempPassword
        );
        console.log('✅ Password reset email sent to:', newEmployee.email);
      } catch (emailError) {
        console.error('❌ Failed to send password email:', emailError);
        // Continue anyway - admin still has the password
      }

      // Show temporary password modal
      setTempPasswordData({
        email: newEmployee.email,
        password: tempPassword,
        name: fullName
      });
      setShowTempPasswordModal(true);
      setPasswordCopied(false);
      
      setEmployees([newEmployee, ...employees]);
      setEmployeeView('list');
      resetEmployeeForm();
    } catch (err) {
      console.error('Error creating employee:', err);
      showError('Failed to create employee');
    }
  };

  const handleUpdateEmployee = async () => {
    try {
      if (!employeeForm.id || !employeeForm.employee_number || !employeeForm.first_name || !employeeForm.last_name || !employeeForm.email) {
        showError('Please fill all required fields');
        return;
      }

      const fullName = `${employeeForm.first_name} ${employeeForm.middle_name || ''} ${employeeForm.last_name}`.trim();

      const updatedEmployee = await employeeService.updateEmployee(employeeForm.id, {
        ...employeeForm,
        full_name: fullName
      } as Partial<Employee>);

      setEmployees(employees.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp));
      showSuccess('Employee updated successfully');
      setEmployeeView('list');
      resetEmployeeForm();
    } catch (err) {
      console.error('Error updating employee:', err);
      showError('Failed to update employee');
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
    pdf.setFont('helvetica');
    
    const dimensions = PDFBrandingUtils.getStandardDimensions();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const companyName = companySettings?.company_name || 'Kdadks';
    
    // Constants for consistent formatting
    const FONT_SIZE = {
      title: 12,
      heading: 10,
      body: 10,
      small: 9
    };
    const LINE_HEIGHT = 5;
    const SECTION_GAP = 8;
    const PARAGRAPH_GAP = 6;

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

    // Apply branding (header/footer images) - same as Invoice
    let contentStartY = dimensions.topMargin;
    let contentEndY = pageHeight - dimensions.bottomMargin;
    
    if (companySettings) {
      const brandingResult = await PDFBrandingUtils.applyBranding(pdf, companySettings, dimensions);
      contentStartY = brandingResult.contentStartY;
      contentEndY = brandingResult.contentEndY;
    }

    let currentY = contentStartY;
    let currentPage = 1;

    // Helper function to add new page with branding
    const addNewPageWithBranding = async () => {
      pdf.addPage();
      currentPage++;
      
      // Re-apply branding to new page
      if (companySettings) {
        const brandingResult = await PDFBrandingUtils.applyBranding(pdf, companySettings, dimensions);
        contentStartY = brandingResult.contentStartY;
        contentEndY = brandingResult.contentEndY;
      }
      
      currentY = contentStartY;
    };

    // Helper function to check if new page is needed
    const checkPageBreak = async (spaceNeeded: number): Promise<boolean> => {
      if (currentY + spaceNeeded > contentEndY) {
        await addNewPageWithBranding();
        return true;
      }
      return false;
    };

    // Helper function to write wrapped text
    const writeWrappedText = async (text: string, indent: number = 0) => {
      const maxWidth = dimensions.rightMargin - dimensions.leftMargin - indent;
      const lines = pdf.splitTextToSize(text, maxWidth);
      for (const line of lines) {
        await checkPageBreak(LINE_HEIGHT + 2);
        pdf.text(line, dimensions.leftMargin + indent, currentY);
        currentY += LINE_HEIGHT;
      }
    };

    // Helper function to write section heading
    const writeSectionHeading = async (heading: string) => {
      await checkPageBreak(15);
      pdf.setFontSize(FONT_SIZE.heading);
      pdf.setFont('helvetica', 'bold');
      pdf.text(heading, dimensions.leftMargin, currentY);
      currentY += SECTION_GAP;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(FONT_SIZE.body);
    };

    // Helper function to write bullet point
    const writeBulletPoint = async (text: string) => {
      await checkPageBreak(LINE_HEIGHT + 2);
      pdf.text('•', dimensions.leftMargin + 3, currentY);
      const maxWidth = dimensions.rightMargin - dimensions.leftMargin - 10;
      const lines = pdf.splitTextToSize(text, maxWidth);
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          await checkPageBreak(LINE_HEIGHT + 2);
        }
        pdf.text(lines[i], dimensions.leftMargin + 8, currentY);
        if (i < lines.length - 1) {
          currentY += LINE_HEIGHT;
        }
      }
      currentY += LINE_HEIGHT;
    };

    // === PDF CONTENT START ===

    // Company Name Header (if no header image)
    if (!companySettings?.header_image_data) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(companyName, dimensions.leftMargin, currentY);
      currentY += 12;
    }

    // Date
    pdf.setFontSize(FONT_SIZE.body);
    pdf.setFont('helvetica', 'normal');
    const offerDate = data.offer_date ? new Date(data.offer_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    pdf.text(`Date: ${offerDate}`, dimensions.leftMargin, currentY);
    currentY += 10;

    // To section
    pdf.text('To,', dimensions.leftMargin, currentY);
    currentY += LINE_HEIGHT;
    pdf.setFont('helvetica', 'bold');
    pdf.text(employee.full_name, dimensions.leftMargin, currentY);
    currentY += LINE_HEIGHT;
    pdf.setFont('helvetica', 'normal');

    // Candidate Address (use provided multiline address or employee address)
    const rawAddress = data.candidate_address || [
      employee.address_line1,
      employee.address_line2,
      [employee.city, employee.state, employee.postal_code].filter(Boolean).join(', '),
      employee.country
    ].filter(Boolean).join('\n');

    if (rawAddress) {
      const addressLines = rawAddress.split('\n');
      for (const line of addressLines) {
        if (line.trim()) {
          const splitLines = pdf.splitTextToSize(line.trim(), dimensions.rightMargin - dimensions.leftMargin);
          for (const sLine of splitLines) {
            pdf.text(sLine, dimensions.leftMargin, currentY);
            currentY += LINE_HEIGHT;
          }
        }
      }
    }
    currentY += PARAGRAPH_GAP;

    // Subject Line
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Subject: Offer of Employment – ${data.position || employee.designation}`, dimensions.leftMargin, currentY);
    currentY += 10;

    // Salutation
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Dear ${employee.full_name},`, dimensions.leftMargin, currentY);
    currentY += SECTION_GAP;

    // Opening Paragraph
    const openingText = `We are pleased to offer you the position of ${data.position || employee.designation} at ${companyName}, based on our discussions and evaluation of your profile. We are confident that your skills and experience will be a valuable addition to our organization.`;
    await writeWrappedText(openingText);
    currentY += SECTION_GAP;

    // 1. Position Details
    await writeSectionHeading('1. Position Details');
    
    const locTypeStr = data.work_location_type ? (data.work_location_type.charAt(0).toUpperCase() + data.work_location_type.slice(1)) : 'Onsite';

    const writePositionDetailRow = async (label: string, value: string) => {
      if (!value) return;
      await checkPageBreak(LINE_HEIGHT + 2);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${label}: `, dimensions.leftMargin, currentY);
      const labelWidth = pdf.getTextWidth(`${label}: `);
      pdf.setFont('helvetica', 'normal');

      // Handle multiline value string (e.g. work location multiline address)
      const valLines = value.split('\n');
      for (let i = 0; i < valLines.length; i++) {
        const lineStr = valLines[i].trim();
        if (!lineStr) continue;
        const indentX = i === 0 ? labelWidth : 0;
        const startX = dimensions.leftMargin + indentX;
        const splitLines = pdf.splitTextToSize(lineStr, dimensions.rightMargin - startX);
        for (let j = 0; j < splitLines.length; j++) {
          await checkPageBreak(LINE_HEIGHT + 2);
          const posX = (i === 0 && j === 0) ? (dimensions.leftMargin + labelWidth) : (dimensions.leftMargin + 20);
          pdf.text(splitLines[j], posX, currentY);
          currentY += LINE_HEIGHT;
        }
      }
      currentY += 2;
    };

    await writePositionDetailRow('Job Title', data.position || employee.designation);
    await writePositionDetailRow('Department', data.department || employee.department || 'Administration');
    await writePositionDetailRow('Reporting To', data.reporting_to || '[Manager/Designation]');
    await writePositionDetailRow('Employment Type', data.employment_type || (employee.employment_type === 'full-time' ? 'Full-time' : employee.employment_type));
    await writePositionDetailRow('Date of Joining', new Date(data.joining_date || employee.date_of_joining).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }));
    await writePositionDetailRow('Work Location Type', locTypeStr);
    if (data.work_location_type !== 'remote' && data.work_location) {
      await writePositionDetailRow('Work Location Address', data.work_location);
    }
    currentY += SECTION_GAP - PARAGRAPH_GAP;

    // 2. Roles and Responsibilities
    await writeSectionHeading('2. Roles and Responsibilities');
    
    if (data.roles_responsibilities) {
      // Split by newlines to handle multi-line input
      const responsibilities = data.roles_responsibilities.split('\n').filter(r => r.trim());
      pdf.text('Your primary responsibilities will include, but are not limited to:', dimensions.leftMargin, currentY);
      currentY += PARAGRAPH_GAP;
      
      for (const resp of responsibilities) {
        await writeBulletPoint(resp.trim());
      }
    } else {
      // Default responsibilities
      const defaultResponsibilities = [
        'Managing day-to-day administrative operations',
        'Handling correspondence, documentation, and record-keeping',
        'Coordinating with internal teams and external vendors',
        'Maintaining office supplies and inventory',
        'Supporting HR and accounts-related administrative tasks',
        'Any other duties assigned by management from time to time'
      ];
      
      pdf.text('Your primary responsibilities will include, but are not limited to:', dimensions.leftMargin, currentY);
      currentY += PARAGRAPH_GAP;
      
      for (const resp of defaultResponsibilities) {
        await writeBulletPoint(resp);
      }
    }
    currentY += SECTION_GAP - LINE_HEIGHT;

    // 3. Compensation and Benefits (Tabular Format)
    await writeSectionHeading('3. Compensation and Benefits');
    
    const curr = employee.currency_code || 'INR';
    const grossVal = data.salary_breakdown?.gross_salary || employee.gross_salary || 0;
    const ctcVal = data.annual_ctc || grossVal * 12;

    // PDF Table for Salary Breakdown
    const tableLeft = dimensions.leftMargin;
    const tableRight = dimensions.rightMargin;
    const tableWidth = tableRight - tableLeft;
    
    const colWidths = [85, 40, 45]; // Component (85mm), Monthly (40mm), Annual (45mm)
    const colX = [
      tableLeft,
      tableLeft + colWidths[0],
      tableLeft + colWidths[0] + colWidths[1],
    ];

    const drawRow = async (cols: [string, string, string], isHeader = false, isHighlight = false) => {
      const rowHeight = 7.5;
      await checkPageBreak(rowHeight + 2);

      if (isHeader) {
        pdf.setFillColor(30, 41, 59); // Slate-800 header fill
        pdf.rect(tableLeft, currentY, tableWidth, rowHeight, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
      } else if (isHighlight) {
        pdf.setFillColor(241, 245, 249); // Slate-100 summary fill
        pdf.rect(tableLeft, currentY, tableWidth, rowHeight, 'F');
        pdf.setTextColor(15, 23, 42);
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setTextColor(30, 41, 59);
        pdf.setFont('helvetica', 'normal');
      }

      pdf.setDrawColor(226, 232, 240); // Grid border line
      pdf.setLineWidth(0.3);
      pdf.rect(tableLeft, currentY, tableWidth, rowHeight, 'S');

      const textY = currentY + 5;
      pdf.setFontSize(FONT_SIZE.small);

      // Col 0 (Component Label)
      pdf.text(cols[0], colX[0] + 3, textY, { maxWidth: colWidths[0] - 6 });
      // Col 1 (Monthly Amount)
      pdf.text(cols[1], colX[1] + colWidths[1] - 3, textY, { align: 'right' });
      // Col 2 (Annual Amount)
      pdf.text(cols[2], colX[2] + colWidths[2] - 3, textY, { align: 'right' });

      pdf.setTextColor(0, 0, 0);
      currentY += rowHeight;
    };

    // Draw Table Header
    await drawRow(['Salary Component / Benefit Item', `Monthly (${curr})`, `Annual (${curr})`], true);

    const b = data.salary_breakdown || {
      basic: employee.basic_salary,
      hra: employee.hra || 0,
      special_allowance: employee.special_allowance || 0,
      other_allowances: employee.other_allowances || 0,
      gross_salary: grossVal
    };

    if (b.basic) {
      await drawRow(['Basic Salary', b.basic.toLocaleString(), (b.basic * 12).toLocaleString()]);
    }
    if (b.hra) {
      await drawRow(['House Rent Allowance (HRA)', b.hra.toLocaleString(), (b.hra * 12).toLocaleString()]);
    }
    if (b.special_allowance) {
      await drawRow(['Special Allowance', b.special_allowance.toLocaleString(), (b.special_allowance * 12).toLocaleString()]);
    }
    if (b.other_allowances) {
      await drawRow(['Other Allowances', b.other_allowances.toLocaleString(), (b.other_allowances * 12).toLocaleString()]);
    }

    // Total Monthly Gross and Annual CTC Rows
    await drawRow(['Total Gross Monthly Salary', grossVal.toLocaleString(), (grossVal * 12).toLocaleString()], false, true);
    await drawRow(['Annual Cost to Company (CTC)', '—', ctcVal.toLocaleString()], false, true);

    currentY += PARAGRAPH_GAP;

    // Salary Payment Note
    const salaryNote = data.salary_payment_note || "Salary will be paid as per the company's payroll cycle and applicable statutory deductions.";
    await writeWrappedText(salaryNote);
    currentY += 3;

    // Statutory & Entity Employee Benefits List
    const rawBenefits = data.benefits;
    const benefitsList = Array.isArray(rawBenefits)
      ? rawBenefits
      : (typeof rawBenefits === 'string' ? (rawBenefits as string).split('\n').filter(b => b.trim()) : []);

    if (benefitsList.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(FONT_SIZE.heading);
      pdf.text('Statutory & Standard Employee Benefits:', dimensions.leftMargin, currentY);
      currentY += PARAGRAPH_GAP;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(FONT_SIZE.body);
      for (const benefit of benefitsList) {
        if (benefit.trim()) {
          await writeBulletPoint(benefit.trim());
        }
      }
    }
    
    const benefitsNote = data.benefits_note || 'You will be entitled to benefits and facilities as per company policy, which may be revised from time to time.';
    await writeWrappedText(benefitsNote);
    currentY += SECTION_GAP;

    // 4. Working Hours
    await writeSectionHeading('4. Working Hours');
    
    const workStart = data.working_hours_start || '9:30 AM';
    const workEnd = data.working_hours_end || '6:30 PM';
    const workDays = data.working_days || 'Monday to Saturday';
    
    pdf.text(`Working hours will be ${workStart} to ${workEnd}, ${workDays}.`, dimensions.leftMargin, currentY);
    currentY += PARAGRAPH_GAP;
    
    const additionalHoursNote = data.additional_hours_note || 'You may be required to work additional hours based on business requirements.';
    pdf.text(additionalHoursNote, dimensions.leftMargin, currentY);
    currentY += SECTION_GAP;

    // 5. Probation
    await writeSectionHeading('5. Probation');
    
    const probationMonths = data.probation_period || 3;
    pdf.text(`You will be on probation for a period of ${probationMonths} months from your date of joining.`, dimensions.leftMargin, currentY);
    currentY += PARAGRAPH_GAP;
    
    const probationNote = data.probation_note || 'During the probation period, your performance will be reviewed, and upon successful completion, your employment will be confirmed in writing.';
    await writeWrappedText(probationNote);
    currentY += SECTION_GAP;

    // 6. Leave and Holidays
    await writeSectionHeading('6. Leave and Holidays');
    
    const leaveNote = data.leave_policy_note || "Leave and holidays will be governed by the company's leave policy applicable at the time of employment.";
    await writeWrappedText(leaveNote);
    currentY += SECTION_GAP;

    // 7. Confidentiality
    await writeSectionHeading('7. Confidentiality');
    
    const confidentialityNote = data.confidentiality_note || 'You are required to maintain strict confidentiality of all company information, data, and records during and after your employment with the company.';
    await writeWrappedText(confidentialityNote);
    currentY += SECTION_GAP;

    // 8. Termination
    await writeSectionHeading('8. Termination');
    
    const noticeDays = data.notice_period || 30;
    const terminationNote = data.termination_note || `Either party may terminate this employment by providing ${noticeDays} days' notice or salary in lieu thereof, as per company policy.`;
    await writeWrappedText(terminationNote);
    currentY += SECTION_GAP;

    // 9. Intellectual Property Assignment
    if (data.ip_clause_text) {
      await writeSectionHeading('9. Intellectual Property Assignment');
      await writeWrappedText(data.ip_clause_text);
      currentY += SECTION_GAP;
    }

    // 10. Company Property and Assets Return
    if (data.asset_clause_text) {
      await writeSectionHeading('10. Company Assets & Return');
      await writeWrappedText(data.asset_clause_text);
      currentY += SECTION_GAP;
    }

    // 11. Acceptance of Offer
    await writeSectionHeading('11. Acceptance of Offer');
    
    const acceptanceNote = 'Please sign and return a copy of this letter as a token of your acceptance of the offer and the terms and conditions mentioned herein.';
    await writeWrappedText(acceptanceNote);
    currentY += SECTION_GAP;

    // Additional Terms and Conditions (if provided)
    if (data.terms_and_conditions) {
      await writeSectionHeading('Additional Terms and Conditions');
      await writeWrappedText(data.terms_and_conditions);
      currentY += SECTION_GAP;
    }

    // Additional Information (if provided)
    if (data.other_details) {
      await writeSectionHeading('Additional Information');
      await writeWrappedText(data.other_details);
      currentY += SECTION_GAP;
    }

    // Closing
    await checkPageBreak(50);
    currentY += 5;
    pdf.text(`We welcome you to ${companyName} and look forward to a successful association.`, dimensions.leftMargin, currentY);
    currentY += SECTION_GAP;
    
    pdf.text('Warm regards,', dimensions.leftMargin, currentY);
    currentY += SECTION_GAP;

    // Company Signature Block
    pdf.setFont('helvetica', 'bold');
    pdf.text(`For ${companyName}`, dimensions.leftMargin, currentY);
    currentY += 12;

    const signatoryName = data.signatory_name || hrSettings?.signatory_name || '[Authorized Signatory Name]';
    const signatoryDesignation = data.signatory_designation || hrSettings?.signatory_designation || '[Designation]';
    const signatoryContact = data.signatory_contact || (companySettings?.phone ? `Contact: ${companySettings.phone}` : '[Contact Details]');

    pdf.text(signatoryName, dimensions.leftMargin, currentY);
    currentY += LINE_HEIGHT;
    pdf.setFont('helvetica', 'normal');
    pdf.text(signatoryDesignation, dimensions.leftMargin, currentY);
    currentY += LINE_HEIGHT;
    pdf.text(signatoryContact, dimensions.leftMargin, currentY);
    currentY += 15;

    // Acceptance Section (on same page or new page if needed)
    if (data.acceptance_section !== false) {
      await checkPageBreak(60);
      
      // Separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(dimensions.leftMargin, currentY, dimensions.rightMargin, currentY);
      currentY += 10;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Acceptance by Candidate', dimensions.leftMargin, currentY);
      currentY += SECTION_GAP;
      
      pdf.setFont('helvetica', 'normal');
      const acceptanceText = `I, ${employee.full_name}, accept the offer of employment with ${companyName} on the terms and conditions mentioned above.`;
      await writeWrappedText(acceptanceText);
      currentY += 15;
      
      pdf.text('Signature: _______________________', dimensions.leftMargin, currentY);
      currentY += SECTION_GAP;
      pdf.text('Date: ____________________________', dimensions.leftMargin, currentY);
    }

    return pdf;
  };

  const generateSalaryCertificatePDF = async (employee: Employee, data: SalaryCertificateData) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const dimensions = PDFBrandingUtils.getStandardDimensions();

    const FONT_SIZE = { title: 16, heading: 11, body: 10, small: 9 };
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentEndY = pageHeight - dimensions.bottomMargin;

    let currentY = dimensions.topMargin;

    const checkPageBreak = async (requiredSpace: number) => {
      if (currentY + requiredSpace > contentEndY) {
        pdf.addPage();
        if (companySettings) {
          const br = await PDFBrandingUtils.applyBranding(pdf, companySettings, dimensions);
          currentY = br.contentStartY;
        } else {
          currentY = dimensions.topMargin;
        }
      }
    };

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

    const contentWidth = dimensions.rightMargin - dimensions.leftMargin;
    const companyName = companySettings?.company_name || 'our organization';

    // Document title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SALARY CERTIFICATE', dimensions.leftMargin, currentY);
    currentY += 12;

    // Date (right-aligned)
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, dimensions.rightMargin, currentY, { align: 'right' });
    currentY += 14;

    // TO WHOM IT MAY CONCERN
    await checkPageBreak(12);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TO WHOM IT MAY CONCERN', dimensions.leftMargin, currentY);
    currentY += 10;

    // Main Certificate Body Paragraph (Full printable width)
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const certIntro = `This is to certify that ${employee.full_name} (Employee No: ${employee.employee_number}) is a full-time employee with ${companyName}, currently serving in the capacity of ${employee.designation}${employee.department ? ' in the ' + employee.department + ' department' : ''}. ${employee.first_name} joined the organization on ${new Date(employee.date_of_joining).toLocaleDateString('en-GB')} and is receiving regular monthly compensation as detailed below.`;

    const introLines = pdf.splitTextToSize(certIntro, contentWidth);
    await checkPageBreak(introLines.length * 6 + 10);
    pdf.text(introLines, dimensions.leftMargin, currentY);
    currentY += introLines.length * 6 + 10;

    // Salary details in clean table format
    await checkPageBreak(15);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(FONT_SIZE.heading);
    pdf.text(`Salary Details (${data.period_from || 'Current'} to ${data.period_to || 'Present'}):`, dimensions.leftMargin, currentY);
    currentY += 8;

    const currSymbol = employee.currency_code || 'INR';

    const tableLeft = dimensions.leftMargin;
    const tableRight = dimensions.rightMargin;
    const tableWidth = tableRight - tableLeft;
    
    const colWidths = [85, 40, 45]; // Component (85mm), Monthly (40mm), Annual (45mm)
    const colX = [
      tableLeft,
      tableLeft + colWidths[0],
      tableLeft + colWidths[0] + colWidths[1],
    ];

    const drawRow = async (cols: [string, string, string], isHeader = false, isHighlight = false) => {
      const rowHeight = 7.5;
      await checkPageBreak(rowHeight + 2);

      if (isHeader) {
        pdf.setFillColor(30, 41, 59); // Slate-800 header fill
        pdf.rect(tableLeft, currentY, tableWidth, rowHeight, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
      } else if (isHighlight) {
        pdf.setFillColor(241, 245, 249); // Slate-100 summary fill
        pdf.rect(tableLeft, currentY, tableWidth, rowHeight, 'F');
        pdf.setTextColor(15, 23, 42);
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setTextColor(30, 41, 59);
        pdf.setFont('helvetica', 'normal');
      }

      pdf.setDrawColor(226, 232, 240); // Grid border line
      pdf.setLineWidth(0.3);
      pdf.rect(tableLeft, currentY, tableWidth, rowHeight, 'S');

      const textY = currentY + 5;
      pdf.setFontSize(FONT_SIZE.small);

      // Col 0 (Component Label)
      pdf.text(cols[0], colX[0] + 3, textY, { maxWidth: colWidths[0] - 6 });
      // Col 1 (Monthly Amount)
      pdf.text(cols[1], colX[1] + colWidths[1] - 3, textY, { align: 'right' });
      // Col 2 (Annual Amount)
      pdf.text(cols[2], colX[2] + colWidths[2] - 3, textY, { align: 'right' });

      pdf.setTextColor(0, 0, 0);
      currentY += rowHeight;
    };

    // Draw Table Header
    await drawRow(['Salary Component', `Monthly (${currSymbol})`, `Annual (${currSymbol})`], true);

    const b = data.salary_breakdown;
    if (b.basic) {
      await drawRow(['Basic Salary', b.basic.toLocaleString(), (b.basic * 12).toLocaleString()]);
    }
    if (b.hra) {
      await drawRow(['House Rent Allowance (HRA)', b.hra.toLocaleString(), (b.hra * 12).toLocaleString()]);
    }
    if (b.special_allowance) {
      await drawRow(['Special Allowance', b.special_allowance.toLocaleString(), (b.special_allowance * 12).toLocaleString()]);
    }
    if (b.other_allowances > 0) {
      await drawRow(['Other Allowances', b.other_allowances.toLocaleString(), (b.other_allowances * 12).toLocaleString()]);
    }

    // Highlight row: Total Gross Monthly Salary & Annual Gross Salary
    const grossVal = b.gross_monthly || employee.gross_salary;
    const annualVal = data.annual_gross || (grossVal * 12);
    await drawRow(['Gross Monthly Salary', grossVal.toLocaleString(), (grossVal * 12).toLocaleString()], false, true);
    await drawRow(['Annual Gross Salary (CTC)', '—', annualVal.toLocaleString()], false, true);

    currentY += 10;

    // Purpose
    if (data.purpose) {
      await checkPageBreak(12);
      pdf.setFont('helvetica', 'normal');
      const purposeLines = pdf.splitTextToSize(`Purpose of Issue: ${data.purpose}`, contentWidth);
      pdf.text(purposeLines, dimensions.leftMargin, currentY);
      currentY += purposeLines.length * 6 + 6;
    }

    // Closing
    await checkPageBreak(25);
    pdf.setFont('helvetica', 'normal');
    const closingLines = pdf.splitTextToSize('This salary certificate is issued upon official request of the employee for verification, banking, or official record purposes.', contentWidth);
    pdf.text(closingLines, dimensions.leftMargin, currentY);
    currentY += closingLines.length * 6 + 12;

    pdf.text('Sincerely,', dimensions.leftMargin, currentY);
    currentY += 15;

    const signatoryName = (data as any).signatory_name || hrSettings?.signatory_name;
    const signatoryDesignation = (data as any).signatory_designation || hrSettings?.signatory_designation;

    if (signatoryName) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(signatoryName, dimensions.leftMargin, currentY);
      currentY += 5;
      if (signatoryDesignation) {
        pdf.setFont('helvetica', 'normal');
        pdf.text(signatoryDesignation, dimensions.leftMargin, currentY);
      }
    }

    return pdf;
  };

  const generateForm16PDF = async (employee: Employee, data: Form16Data) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const dimensions = PDFBrandingUtils.getStandardDimensions();

    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentEndY = pageHeight - dimensions.bottomMargin;

    let currentY = dimensions.topMargin;

    const checkPageBreak = async (requiredSpace: number) => {
      if (currentY + requiredSpace > contentEndY) {
        pdf.addPage();
        if (companySettings) {
          const br = await PDFBrandingUtils.applyBranding(pdf, companySettings, dimensions);
          currentY = br.contentStartY;
        } else {
          currentY = dimensions.topMargin;
        }
      }
    };

    if (companySettings) {
      const br = await PDFBrandingUtils.applyBranding(pdf, companySettings, dimensions);
      currentY = br.contentStartY;
    }

    // Form 16 Header
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FORM 16', pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    currentY += 7;
    pdf.setFontSize(10);
    pdf.text('[See rule 31(1)(a)]', pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    currentY += 6;
    pdf.text('Certificate under section 203 of the Income-tax Act, 1961', pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    currentY += 6;
    pdf.text('for tax deducted at source on salary', pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    currentY += 12;

    // Financial Year
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Financial Year: ${data.financial_year}`, dimensions.leftMargin, currentY);
    currentY += 12;

    // Part A - Details of Employee and Employer
    pdf.setFont('helvetica', 'bold');
    pdf.text('PART A - EMPLOYER & EMPLOYEE DETAILS', dimensions.leftMargin, currentY);
    currentY += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`1. Employer Name: ${data.employer.name}`, dimensions.leftMargin, currentY);
    currentY += 5;
    pdf.text(`   Address: ${data.employer.address}`, dimensions.leftMargin, currentY);
    currentY += 5;
    pdf.text(`   TAN: ${data.employer.tan}  |  PAN: ${data.employer.pan}`, dimensions.leftMargin, currentY);
    currentY += 8;

    pdf.text(`2. Employee Name: ${data.employee.name}`, dimensions.leftMargin, currentY);
    currentY += 5;
    pdf.text(`   Address: ${data.employee.address}`, dimensions.leftMargin, currentY);
    currentY += 5;
    pdf.text(`   PAN: ${data.employee.pan}`, dimensions.leftMargin, currentY);
    currentY += 12;

    // Part B - Details of Salary Paid and Tax Deducted (PDF Table Format)
    pdf.setFont('helvetica', 'bold');
    pdf.text('PART B - DETAILS OF SALARY PAID & TAX DEDUCTED', dimensions.leftMargin, currentY);
    currentY += 8;

    const tableLeft = dimensions.leftMargin;
    const tableRight = dimensions.rightMargin;
    const tableWidth = tableRight - tableLeft;
    const colWidths = [120, 50]; // Particulars (120mm), Amount (50mm)

    const drawForm16Row = async (label: string, value: string, isHeader = false, isHighlight = false) => {
      const rowHeight = 7;
      await checkPageBreak(rowHeight + 2);

      if (isHeader) {
        pdf.setFillColor(30, 41, 59); // Slate-800
        pdf.rect(tableLeft, currentY, tableWidth, rowHeight, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
      } else if (isHighlight) {
        pdf.setFillColor(241, 245, 249); // Slate-100
        pdf.rect(tableLeft, currentY, tableWidth, rowHeight, 'F');
        pdf.setTextColor(15, 23, 42);
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setTextColor(30, 41, 59);
        pdf.setFont('helvetica', 'normal');
      }

      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.3);
      pdf.rect(tableLeft, currentY, tableWidth, rowHeight, 'S');

      const textY = currentY + 4.8;
      pdf.setFontSize(9);
      pdf.text(label, tableLeft + 3, textY, { maxWidth: colWidths[0] - 6 });
      if (value) {
        pdf.text(value, tableLeft + colWidths[0] + colWidths[1] - 3, textY, { align: 'right' });
      }
      pdf.setTextColor(0, 0, 0);
      currentY += rowHeight;
    };

    const curr = employee.currency_code || 'INR';

    await drawForm16Row('Particulars / Income Component', `Amount (${curr})`, true);

    await drawForm16Row('1. Gross Salary u/s 17(1)', `₹${data.salary_details.gross_salary.toLocaleString('en-IN')}`);
    await drawForm16Row('2. Allowances exempt u/s 10', `₹${data.salary_details.allowances.toLocaleString('en-IN')}`);
    await drawForm16Row('3. Value of Perquisites u/s 17(2)', `₹${data.salary_details.perquisites.toLocaleString('en-IN')}`);
    await drawForm16Row('4. Profits in lieu of salary u/s 17(3)', `₹${data.salary_details.profits_in_lieu.toLocaleString('en-IN')}`);

    await drawForm16Row('Less: Deductions under Section 16', '', false, true);
    await drawForm16Row('  (a) Standard Deduction u/s 16(ia)', `₹${data.deductions.standard_deduction.toLocaleString('en-IN')}`);
    await drawForm16Row('  (b) Entertainment Allowance u/s 16(ii)', `₹${data.deductions.entertainment_allowance.toLocaleString('en-IN')}`);
    await drawForm16Row('  (c) Professional Tax u/s 16(iii)', `₹${data.deductions.professional_tax.toLocaleString('en-IN')}`);

    await drawForm16Row('5. Income Chargeable under "Salaries"', `₹${data.income_chargeable.toLocaleString('en-IN')}`, false, true);

    await drawForm16Row('Deductions under Chapter VI-A', '', false, true);
    await drawForm16Row('  (a) Section 80C (PF/ELSS/LIC)', `₹${data.chapter_vi_deductions.section_80c.toLocaleString('en-IN')}`);
    await drawForm16Row('  (b) Section 80D (Health Insurance)', `₹${data.chapter_vi_deductions.section_80d.toLocaleString('en-IN')}`);
    await drawForm16Row('  (c) Other Chapter VI-A Deductions', `₹${data.chapter_vi_deductions.other.toLocaleString('en-IN')}`);

    await drawForm16Row('6. Total Taxable Income', `₹${data.income_chargeable.toLocaleString('en-IN')}`, false, true);
    await drawForm16Row('7. Tax Computed on Total Income', `₹${data.tax_computed.toLocaleString('en-IN')}`);
    await drawForm16Row('8. Less: Relief under Section 89', `₹${data.relief_under_89.toLocaleString('en-IN')}`);
    await drawForm16Row('9. Net Tax Payable', `₹${data.tax_payable.toLocaleString('en-IN')}`, false, true);
    await drawForm16Row('10. Total TDS Deducted & Deposited', `₹${data.tds_deducted.toLocaleString('en-IN')}`, false, true);

    // Signature
    currentY += 10;
    pdf.setFont('helvetica', 'normal');
    pdf.text('Signature of the person responsible for deduction of tax', dimensions.leftMargin, currentY);
    currentY += 12;

    const signatoryName = hrSettings?.signatory_name;
    const signatoryDesignation = hrSettings?.signatory_designation;

    if (signatoryName) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(signatoryName, dimensions.leftMargin, currentY);
      currentY += 5;
      if (signatoryDesignation) {
        pdf.setFont('helvetica', 'normal');
        pdf.text(signatoryDesignation, dimensions.leftMargin, currentY);
      }
    }

    return pdf;
  };

  const generateForm24QPDF = async (data: Form24QData) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const dimensions = PDFBrandingUtils.getStandardDimensions();

    let currentY = dimensions.topMargin;

    if (companySettings) {
      const br = await PDFBrandingUtils.applyBranding(pdf, companySettings, dimensions);
      currentY = br.contentStartY;
    }

    // Form 24Q Header
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FORM 24Q', pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    currentY += 7;
    pdf.setFontSize(10);
    pdf.text('Quarterly Statement of TDS on Salaries', pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    currentY += 12;

    // Quarter and FY details
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Financial Year: ${data.financial_year}  |  Quarter: Q${data.quarter}`, dimensions.leftMargin, currentY);
    currentY += 12;

    // Employer details
    pdf.setFont('helvetica', 'bold');
    pdf.text('EMPLOYER DETAILS', dimensions.leftMargin, currentY);
    currentY += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Name: ${data.employer.name}`, dimensions.leftMargin, currentY);
    currentY += 5;
    pdf.text(`TAN: ${data.employer.tan}  |  PAN: ${data.employer.pan}`, dimensions.leftMargin, currentY);
    currentY += 12;

    // Employee-wise TDS details (Tabular Format)
    pdf.setFont('helvetica', 'bold');
    pdf.text('EMPLOYEE-WISE TDS SCHEDULE', dimensions.leftMargin, currentY);
    currentY += 8;

    const tableLeft = dimensions.leftMargin;
    const tableRight = dimensions.rightMargin;
    const tableWidth = tableRight - tableLeft;
    const colWidths = [60, 35, 35, 40]; // Name (60mm), PAN (35mm), TDS (35mm), Challan (40mm)

    const draw24QRow = async (cols: [string, string, string, string], isHeader = false, isHighlight = false) => {
      const rowHeight = 7;
      if (currentY + rowHeight + 2 > pdf.internal.pageSize.getHeight() - dimensions.bottomMargin) {
        pdf.addPage();
        if (companySettings) {
          const br = await PDFBrandingUtils.applyBranding(pdf, companySettings, dimensions);
          currentY = br.contentStartY;
        } else {
          currentY = dimensions.topMargin;
        }
      }

      if (isHeader) {
        pdf.setFillColor(30, 41, 59); // Slate-800
        pdf.rect(tableLeft, currentY, tableWidth, rowHeight, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
      } else if (isHighlight) {
        pdf.setFillColor(241, 245, 249); // Slate-100
        pdf.rect(tableLeft, currentY, tableWidth, rowHeight, 'F');
        pdf.setTextColor(15, 23, 42);
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setTextColor(30, 41, 59);
        pdf.setFont('helvetica', 'normal');
      }

      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.3);
      pdf.rect(tableLeft, currentY, tableWidth, rowHeight, 'S');

      const textY = currentY + 4.8;
      pdf.setFontSize(8.5);

      pdf.text(cols[0], tableLeft + 3, textY, { maxWidth: colWidths[0] - 5 });
      pdf.text(cols[1], tableLeft + colWidths[0] + 3, textY);
      pdf.text(cols[2], tableLeft + colWidths[0] + colWidths[1] + colWidths[2] - 3, textY, { align: 'right' });
      pdf.text(cols[3], tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + 3, textY, { maxWidth: colWidths[3] - 5 });

      pdf.setTextColor(0, 0, 0);
      currentY += rowHeight;
    };

    await draw24QRow(['Employee Name', 'PAN', 'TDS Amount (₹)', 'Challan Ref No.'], true);

    for (const emp of data.employees) {
      await draw24QRow([
        emp.employee_name,
        emp.pan,
        `₹${emp.tds_deducted.toLocaleString('en-IN')}`,
        emp.challan_details?.challan_number || '—'
      ]);
    }

    await draw24QRow(['Total Quarterly TDS Withheld', '—', `₹${data.total_tds.toLocaleString('en-IN')}`, '—'], false, true);

    currentY += 15;

    // Signature
    pdf.setFont('helvetica', 'normal');
    pdf.text('Authorized Signatory', dimensions.leftMargin, currentY);
    currentY += 12;

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

  const generateExperienceCertificatePDF = async (employee: Employee, data: ExperienceCertificateData) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const dimensions = PDFBrandingUtils.getStandardDimensions();
    const pageHeight = pdf.internal.pageSize.getHeight();

    let contentStartY = dimensions.topMargin;
    let contentEndY = pageHeight - dimensions.bottomMargin;

    if (companySettings) {
      const br = await PDFBrandingUtils.applyBranding(pdf, companySettings, dimensions);
      contentStartY = br.contentStartY;
      contentEndY = br.contentEndY;
    }

    let currentY = contentStartY;

    const addNewPage = async () => {
      pdf.addPage();
      if (companySettings) {
        const br = await PDFBrandingUtils.applyBranding(pdf, companySettings, dimensions);
        contentStartY = br.contentStartY;
        contentEndY = br.contentEndY;
      }
      currentY = contentStartY;
    };

    const checkBreak = async (space: number) => {
      if (currentY + space > contentEndY) {
        await addNewPage();
      }
    };

    // Title
    await checkBreak(15);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('EXPERIENCE CERTIFICATE', pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    currentY += 15;

    // Certificate body
    await checkBreak(10);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');

    const issuedDate = data.issued_date || new Date().toLocaleDateString('en-GB');
    pdf.text(`Date: ${issuedDate}`, dimensions.rightMargin - 40, currentY, { align: 'right' });
    currentY += 15;

    // To Whom It May Concern
    await checkBreak(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TO WHOM IT MAY CONCERN', dimensions.leftMargin, currentY);
    currentY += 12;

    // Main content
    pdf.setFont('helvetica', 'normal');
    const contentWidth = dimensions.rightMargin - dimensions.leftMargin;
    const companyName = companySettings?.company_name || 'our organization';

    const lines = [
      `This is to certify that ${data.employee_name || employee.full_name} was employed with ${companyName} from ${new Date(data.date_of_joining).toLocaleDateString('en-GB')} to ${new Date(data.last_working_date).toLocaleDateString('en-GB')}.`,
      '',
      `During the tenure, ${employee.first_name} worked as ${data.designation} in the ${data.department || 'organization'}.`
    ];

    for (const line of lines) {
      if (!line) {
        currentY += 4;
        continue;
      }
      const splitLines = pdf.splitTextToSize(line, contentWidth);
      await checkBreak(splitLines.length * 7 + 4);
      pdf.text(splitLines, dimensions.leftMargin, currentY);
      currentY += splitLines.length * 7;
    }

    currentY += 5;

    // Roles and Responsibilities
    if (data.roles_responsibilities) {
      await checkBreak(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Roles and Responsibilities:', dimensions.leftMargin, currentY);
      currentY += 7;

      pdf.setFont('helvetica', 'normal');
      const roleLines = data.roles_responsibilities.split('\n').filter(line => line.trim());
      for (const role of roleLines) {
        const wrapped = pdf.splitTextToSize(`• ${role.trim()}`, contentWidth - 5);
        await checkBreak(wrapped.length * 6 + 2);
        pdf.text(wrapped, dimensions.leftMargin + 5, currentY);
        currentY += wrapped.length * 6;
      }
      currentY += 5;
    }

    // Performance note
    if (data.performance_note) {
      const perfLines = pdf.splitTextToSize(data.performance_note, contentWidth);
      await checkBreak(perfLines.length * 7 + 5);
      pdf.text(perfLines, dimensions.leftMargin, currentY);
      currentY += perfLines.length * 7 + 5;
    }

    // Conduct note
    if (data.conduct_note) {
      const conductLines = pdf.splitTextToSize(data.conduct_note, contentWidth);
      await checkBreak(conductLines.length * 7 + 5);
      pdf.text(conductLines, dimensions.leftMargin, currentY);
      currentY += conductLines.length * 7 + 5;
    }

    // Closing
    const closingText = `We wish ${employee.first_name} all the best in all future endeavors.`;
    const closingLines = pdf.splitTextToSize(closingText, contentWidth);
    await checkBreak(closingLines.length * 7 + 10);
    pdf.text(closingLines, dimensions.leftMargin, currentY);
    currentY += closingLines.length * 7 + 15;

    // Signature section (Check space for signature block)
    await checkBreak(40);
    pdf.setFont('helvetica', 'normal');
    pdf.text('For ' + companyName, dimensions.leftMargin, currentY);
    currentY += 20;

    // Signatory details
    const sigName = data.signatory_name || hrSettings?.signatory_name || '';
    const sigDesig = data.signatory_designation || hrSettings?.signatory_designation || '';

    if (sigName) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(sigName, dimensions.leftMargin, currentY);
      currentY += 5;
    }

    if (sigDesig) {
      pdf.setFont('helvetica', 'normal');
      pdf.text(sigDesig, dimensions.leftMargin, currentY);
      currentY += 5;
    }

    if (data.contact_details) {
      pdf.text(data.contact_details, dimensions.leftMargin, currentY);
    }

    return pdf;
  };

  const generateRelievingLetterPDF = async (employee: Employee, data: RelievingLetterData) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const dimensions = PDFBrandingUtils.getStandardDimensions();
    const pageHeight = pdf.internal.pageSize.getHeight();

    let contentStartY = dimensions.topMargin;
    let contentEndY = pageHeight - dimensions.bottomMargin;

    if (companySettings) {
      const br = await PDFBrandingUtils.applyBranding(pdf, companySettings, dimensions);
      contentStartY = br.contentStartY;
      contentEndY = br.contentEndY;
    }

    let currentY = contentStartY;

    const addNewPage = async () => {
      pdf.addPage();
      if (companySettings) {
        const br = await PDFBrandingUtils.applyBranding(pdf, companySettings, dimensions);
        contentStartY = br.contentStartY;
        contentEndY = br.contentEndY;
      }
      currentY = contentStartY;
    };

    const checkBreak = async (space: number) => {
      if (currentY + space > contentEndY) {
        await addNewPage();
      }
    };

    // Title
    await checkBreak(15);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RELIEVING LETTER', pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
    currentY += 15;

    // Date and reference
    await checkBreak(10);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');

    const issuedDate = data.issued_date || new Date().toLocaleDateString('en-GB');
    pdf.text(`Date: ${issuedDate}`, dimensions.rightMargin - 40, currentY, { align: 'right' });
    currentY += 10;

    // Employee details
    await checkBreak(30);
    pdf.text(`To,`, dimensions.leftMargin, currentY);
    currentY += 6;
    pdf.setFont('helvetica', 'bold');
    pdf.text(data.employee_name || employee.full_name, dimensions.leftMargin, currentY);
    currentY += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Employee No: ${data.employee_number || employee.employee_number}`, dimensions.leftMargin, currentY);
    currentY += 12;

    // Subject
    pdf.setFont('helvetica', 'bold');
    pdf.text('Subject: Relieving from Employment', dimensions.leftMargin, currentY);
    currentY += 12;

    // Dear employee
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Dear ${employee.first_name},`, dimensions.leftMargin, currentY);
    currentY += 10;

    // Main content
    const contentWidth = dimensions.rightMargin - dimensions.leftMargin;
    const companyName = companySettings?.company_name || 'our organization';

    const mainPara = data.notice_text || `This is to inform you that you are being relieved from the services of ${companyName} with effect from ${new Date(data.relieving_date).toLocaleDateString('en-GB')}.`;
    const mainLines = pdf.splitTextToSize(mainPara, contentWidth);
    await checkBreak(mainLines.length * 7 + 10);
    pdf.text(mainLines, dimensions.leftMargin, currentY);
    currentY += mainLines.length * 7 + 5;

    // Employment details
    const empDetails = [
      `Your employment with the company commenced on ${new Date(data.date_of_joining).toLocaleDateString('en-GB')} and your last working day was ${new Date(data.last_working_date).toLocaleDateString('en-GB')}.`,
      '',
      `During your tenure, you served as ${data.designation}${data.department ? ' in the ' + data.department + ' department' : ''}.`
    ];

    for (const line of empDetails) {
      if (!line) {
        currentY += 4;
        continue;
      }
      const splitLines = pdf.splitTextToSize(line, contentWidth);
      await checkBreak(splitLines.length * 7 + 4);
      pdf.text(splitLines, dimensions.leftMargin, currentY);
      currentY += splitLines.length * 7;
    }

    currentY += 5;

    // Clearance details
    if (data.handover_completion || data.assets_returned || data.dues_cleared) {
      await checkBreak(30);
      pdf.setFont('helvetica', 'bold');
      pdf.text('We confirm that:', dimensions.leftMargin, currentY);
      currentY += 7;
      pdf.setFont('helvetica', 'normal');

      if (data.handover_completion) {
        await checkBreak(8);
        pdf.text('• Handover of responsibilities has been completed satisfactorily', dimensions.leftMargin + 5, currentY);
        currentY += 6;
      }
      if (data.assets_returned) {
        await checkBreak(8);
        pdf.text('• All company assets have been returned', dimensions.leftMargin + 5, currentY);
        currentY += 6;
      }
      if (data.dues_cleared) {
        await checkBreak(8);
        pdf.text('• All financial dues have been cleared', dimensions.leftMargin + 5, currentY);
        currentY += 6;
      }
      currentY += 5;
    }

    // Notice period mention
    if (data.resignation_date && data.notice_period_served) {
      const noticePara = `Your resignation was received on ${new Date(data.resignation_date).toLocaleDateString('en-GB')} and you have ${data.notice_period_served}.`;
      const noticeLines = pdf.splitTextToSize(noticePara, contentWidth);
      await checkBreak(noticeLines.length * 7 + 5);
      pdf.text(noticeLines, dimensions.leftMargin, currentY);
      currentY += noticeLines.length * 7 + 5;
    }

    // IP & Asset Clearance Notes
    if (data.ip_clause_text) {
      const ipLines = pdf.splitTextToSize(data.ip_clause_text, contentWidth);
      await checkBreak(ipLines.length * 6 + 6);
      pdf.text(ipLines, dimensions.leftMargin, currentY);
      currentY += ipLines.length * 6 + 4;
    }
    if (data.asset_clause_text) {
      const assetLines = pdf.splitTextToSize(data.asset_clause_text, contentWidth);
      await checkBreak(assetLines.length * 6 + 6);
      pdf.text(assetLines, dimensions.leftMargin, currentY);
      currentY += assetLines.length * 6 + 4;
    }

    // Closing
    const closingText = `We thank you for your services and wish you all the best in your future endeavors.`;
    const closingLines = pdf.splitTextToSize(closingText, contentWidth);
    await checkBreak(closingLines.length * 7 + 10);
    pdf.text(closingLines, dimensions.leftMargin, currentY);
    currentY += closingLines.length * 7 + 10;

    // Signature section (Check space for signature block)
    await checkBreak(40);
    pdf.setFont('helvetica', 'normal');
    pdf.text('For ' + companyName, dimensions.leftMargin, currentY);
    currentY += 20;

    // Signatory details
    const sigName = data.signatory_name || hrSettings?.signatory_name || '';
    const sigDesig = data.signatory_designation || hrSettings?.signatory_designation || '';

    if (sigName) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(sigName, dimensions.leftMargin, currentY);
      currentY += 5;
    }

    if (sigDesig) {
      pdf.setFont('helvetica', 'normal');
      pdf.text(sigDesig, dimensions.leftMargin, currentY);
      currentY += 5;
    }

    if (data.contact_details) {
      pdf.text(data.contact_details, dimensions.leftMargin, currentY);
    }

    return pdf;
  };

  const handlePreviewDocument = async () => {
    startAction('Generating PDF preview…');
    try {
      if (!selectedEmployee) {
        showError('Please select an employee');
        return;
      }

      let pdf: jsPDF;

      switch (documentType) {
        case 'offer_letter':
          pdf = await generateOfferLetterPDF(selectedEmployee, documentData as OfferLetterData);
          break;
        case 'salary_certificate':
          pdf = await generateSalaryCertificatePDF(selectedEmployee, documentData as SalaryCertificateData);
          break;
        case 'experience_certificate':
          pdf = await generateExperienceCertificatePDF(selectedEmployee, documentData as ExperienceCertificateData);
          break;
        case 'relieving_letter':
          pdf = await generateRelievingLetterPDF(selectedEmployee, documentData as RelievingLetterData);
          break;
        case 'form_16':
          pdf = await generateForm16PDF(selectedEmployee, documentData as Form16Data);
          break;
        case 'form_24q':
          pdf = await generateForm24QPDF(documentData as Form24QData);
          break;
        case 'intern_offer_letter':
          pdf = await generateInternOfferLetterPDF(selectedEmployee, documentData as InternOfferLetterData, companySettings, hrSettings?.signatory_name, hrSettings?.signatory_designation);
          break;
        case 'intern_experience_certificate':
          pdf = await generateInternExperienceCertificatePDF(selectedEmployee, documentData as InternExperienceCertificateData, companySettings, hrSettings?.signatory_name, hrSettings?.signatory_designation);
          break;
        default:
          throw new Error('Unsupported document type');
      }

      // Generate preview URL
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      setPreviewPdf(pdfUrl);
      setShowPreview(true);
    } catch (err) {
      console.error('Error generating preview:', err);
      showError('Failed to generate preview');
    } finally {
      endAction();
    }
  };

  const handleGenerateDocument = async () => {
    try {
      if (!selectedEmployee) {
        showError('Please select an employee');
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
        case 'experience_certificate':
          pdf = await generateExperienceCertificatePDF(selectedEmployee, documentData as ExperienceCertificateData);
          break;
        case 'relieving_letter':
          pdf = await generateRelievingLetterPDF(selectedEmployee, documentData as RelievingLetterData);
          break;
        case 'form_16':
          pdf = await generateForm16PDF(selectedEmployee, documentData as Form16Data);
          break;
        case 'form_24q':
          pdf = await generateForm24QPDF(documentData as Form24QData);
          break;
        case 'intern_offer_letter':
          pdf = await generateInternOfferLetterPDF(selectedEmployee, documentData as InternOfferLetterData, companySettings, hrSettings?.signatory_name, hrSettings?.signatory_designation);
          break;
        case 'intern_experience_certificate':
          pdf = await generateInternExperienceCertificatePDF(selectedEmployee, documentData as InternExperienceCertificateData, companySettings, hrSettings?.signatory_name, hrSettings?.signatory_designation);
          break;
        default:
          throw new Error('Unsupported document type');
      }

      // Save PDF to Supabase storage
      const pdfBlob = pdf.output('blob');
      const fileName = `${documentType}_${selectedEmployee.employee_number}_${documentNumber}_${Date.now()}.pdf`;
      const storagePath = `employment-documents/${selectedEmployee.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(storagePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Failed to upload PDF: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(storagePath);

      // Save document record with storage path
      await employeeService.createEmploymentDocument({
        employee_id: selectedEmployee.id,
        document_type: documentType,
        document_number: documentNumber,
        document_date: new Date().toISOString().split('T')[0],
        document_data: documentData,
        status: 'generated',
        pdf_url: urlData.publicUrl,
        storage_path: storagePath
      });

      // Download PDF
      pdf.save(`${documentType}_${selectedEmployee.employee_number}_${documentNumber}.pdf`);

      showSuccess('Document generated successfully');
      loadData();
      setActiveTab('documents');
    } catch (err) {
      console.error('Error generating document:', err);
      showError('Failed to generate document');
    }
  };

  const handlePreviewSalarySlip = async () => {
    try {
      if (!salarySlipInput.employee_id) {
        showError('Please select an employee');
        return;
      }

      // Generate salary slip data
      let salarySlip = await employeeService.generateSalarySlip(salarySlipInput);
      const employee = employees.find(emp => emp.id === salarySlipInput.employee_id);

      if (!employee) {
        showError('Employee not found');
        return;
      }

      // Apply deduction configuration by zeroing out unchecked deductions
      const adjustedSlip: SalarySlip = {
        ...salarySlip,
        id: 'preview', // Add temporary id for preview
        provident_fund: applyDeductions.provident_fund ? salarySlip.provident_fund : 0,
        professional_tax: applyDeductions.professional_tax ? salarySlip.professional_tax : 0,
        esic: applyDeductions.esic ? salarySlip.esic : 0,
        tds: applyDeductions.tds ? salarySlip.tds : 0
      };

      // Recalculate total deductions and net salary
      adjustedSlip.total_deductions =
        adjustedSlip.provident_fund +
        adjustedSlip.professional_tax +
        adjustedSlip.esic +
        adjustedSlip.tds +
        (salarySlip.loan_repayment || 0) +
        (salarySlip.other_deductions || 0);

      adjustedSlip.net_salary = salarySlip.gross_salary - adjustedSlip.total_deductions;

      // Generate PDF for preview
      const pdf = await generateSalarySlipPDF(employee, adjustedSlip, companySettings || undefined);
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      setPreviewPdf(pdfUrl);
      setShowPreview(true);
    } catch (err: any) {
      console.error('Error generating preview:', err);
      showError(err.message || 'Failed to generate preview');
    }
  };

  const handleGenerateSalarySlip = async () => {
    try {
      if (!salarySlipInput.employee_id) {
        showError('Please select an employee');
        return;
      }

      // Generate salary slip data (does not save to database)
      const salarySlipData = await employeeService.generateSalarySlip(salarySlipInput);

      // Apply deduction configuration
      const adjustedSlipData = {
        ...salarySlipData,
        provident_fund: applyDeductions.provident_fund ? salarySlipData.provident_fund : 0,
        professional_tax: applyDeductions.professional_tax ? salarySlipData.professional_tax : 0,
        esic: applyDeductions.esic ? salarySlipData.esic : 0,
        tds: applyDeductions.tds ? salarySlipData.tds : 0
      };

      // Recalculate total deductions and net salary
      adjustedSlipData.total_deductions =
        adjustedSlipData.provident_fund +
        adjustedSlipData.professional_tax +
        adjustedSlipData.esic +
        adjustedSlipData.tds +
        (salarySlipData.loan_repayment || 0) +
        (salarySlipData.other_deductions || 0);

      adjustedSlipData.net_salary = salarySlipData.gross_salary - adjustedSlipData.total_deductions;

      // Save to database (handles insert or update)
      await employeeService.saveSalarySlip(adjustedSlipData);

      showSuccess('Salary slip generated successfully');
      loadData();
      setActiveTab('salary-slips');
    } catch (err: any) {
      console.error('Error generating salary slip:', err);
      showError(err.message || 'Failed to generate salary slip');
    }
  };

  // Edit and save document handlers
  const handleViewDocument = async (document: EmploymentDocument) => {
    try {
      const employee = employees.find(emp => emp.id === document.employee_id);
      if (!employee) {
        showError('Employee not found');
        return;
      }

      // Fetch complete document details from database to ensure all fields are available
      let completeDocument = document;
      try {
        const { data: fullDoc, error: fetchError } = await supabase
          .from('employment_documents')
          .select('*')
          .eq('id', document.id)
          .single();

        if (!fetchError && fullDoc) {
          completeDocument = fullDoc;
        } else {
          console.warn('Could not fetch full document details, using partial data');
        }
      } catch (fetchErr) {
        console.warn('Error fetching full document:', fetchErr);
        // Continue with the partial document
      }

      setViewingDocument(completeDocument);
      setSelectedEmployee(employee);
      setShowViewModal(true);
    } catch (err) {
      console.error('Error opening document for view:', err);
      showError('Failed to open document');
    }
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      await employeeService.deleteEmploymentDocument(documentToDelete.id);
      showSuccess('Document deleted successfully');
      setShowDeleteDocumentModal(false);
      setDocumentToDelete(null);
      loadData();
    } catch (err) {
      console.error('Error deleting document:', err);
      showError('Failed to delete document');
    }
  };

  const handleDownloadDocument = async (document: EmploymentDocument) => {
    try {
      // If document has storage_path, download from storage
      if (document.storage_path) {
        try {
          const { data, error } = await supabase.storage
            .from('employee-documents')
            .download(document.storage_path);

          if (error) {
            console.warn('Storage download failed, trying pdf_url:', error);
            // Fall through to pdf_url attempt below
          } else if (data) {
            // Successfully got data from storage
            const url = window.URL.createObjectURL(data);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = `${document.document_number}.pdf`;
            window.document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            window.document.body.removeChild(a);
            showSuccess('Document downloaded successfully');
            return;
          }
        } catch (storageErr) {
          console.warn('Storage download error:', storageErr);
          // Continue to next option
        }
      }

      // Fallback: Try pdf_url if available (for documents stored with public URL)
      if (document.pdf_url) {
        try {
          const response = await fetch(document.pdf_url);
          if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = `${document.document_number}.pdf`;
            window.document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            window.document.body.removeChild(a);
            showSuccess('Document downloaded successfully');
            return;
          }
        } catch (fetchErr) {
          console.warn('PDF URL download failed:', fetchErr);
          // Continue to regeneration attempt
        }
      }

      // Fallback: regenerate PDF if no storage_path or pdf_url (legacy documents)
      const employee = employees.find(emp => emp.id === document.employee_id);
      if (!employee) {
        showError('Employee not found');
        return;
      }

      let pdf: jsPDF;

      // If document data exists, use it for regeneration
      if (document.document_data) {
        const docData = document.document_data;

        // Generate PDF based on document type
        switch (document.document_type) {
          case 'offer_letter':
            pdf = await generateOfferLetterPDF(employee, docData as OfferLetterData);
            break;
          case 'salary_certificate':
            pdf = await generateSalaryCertificatePDF(employee, docData as SalaryCertificateData);
            break;
          case 'experience_certificate':
            pdf = await generateExperienceCertificatePDF(employee, docData as ExperienceCertificateData);
            break;
          case 'relieving_letter':
            pdf = await generateRelievingLetterPDF(employee, docData as RelievingLetterData);
            break;
          case 'form_16':
            pdf = await generateForm16PDF(employee, docData as Form16Data);
            break;
          case 'form_24q':
            pdf = await generateForm24QPDF(docData as Form24QData);
            break;
          case 'intern_offer_letter':
            pdf = await generateInternOfferLetterPDF(employee, docData as InternOfferLetterData, companySettings, hrSettings?.signatory_name, hrSettings?.signatory_designation);
            break;
          case 'intern_experience_certificate':
            pdf = await generateInternExperienceCertificatePDF(employee, docData as InternExperienceCertificateData, companySettings, hrSettings?.signatory_name, hrSettings?.signatory_designation);
            break;
          default:
            throw new Error(`Unsupported document type: ${document.document_type}`);
        }
      } else {
        // Create basic certificate/receipt PDF if document_data is missing
        pdf = new jsPDF('p', 'mm', 'a4');
        pdf.setFont('helvetica');
        
        let y = 20;
        const pageWidth = pdf.internal.pageSize.getWidth();
        
        // Title
        pdf.setFontSize(16);
        pdf.text('Document Certificate', pageWidth / 2, y, { align: 'center' });
        
        y += 15;
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Document Information', 10, y);
        
        y += 10;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        
        // Document details
        const details = [
          [`Document Type:`, document.document_type?.replace(/_/g, ' ').toUpperCase() || 'Unknown'],
          [`Document Number:`, document.document_number || 'N/A'],
          [`Document Date:`, document.document_date ? new Date(document.document_date).toLocaleDateString('en-IN') : 'N/A'],
          [`Employee Name:`, `${employee.first_name} ${employee.last_name}`],
          [`Employee ID:`, employee.employee_number || 'N/A'],
          [`Status:`, document.status || 'Generated'],
          [`Generated On:`, new Date(document.created_at || Date.now()).toLocaleString('en-IN')]
        ];
        
        details.forEach(([label, value]) => {
          pdf.setFont('helvetica', 'bold');
          pdf.text(label, 10, y);
          pdf.setFont('helvetica', 'normal');
          pdf.text(String(value), 70, y);
          y += 7;
        });
        
        y += 10;
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(9);
        pdf.text('Note: This is an auto-generated document receipt. For the complete document, please regenerate or contact admin.', 10, y, { maxWidth: 190 });
      }

      // Download the regenerated PDF
      const fileName = `${document.document_number}_${employee.full_name.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);
      showSuccess('Document downloaded successfully');
    } catch (err) {
      console.error('Error downloading document:', err);
      showError(`Failed to download document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleEditDocument = async (document: any) => {
    try {
      // Check if this is an employee-uploaded document
      if (document.document_source === 'employee_upload') {
        // Open verification modal for employee documents
        const employee = employees.find(emp => emp.id === document.employee_id);
        if (!employee) {
          showError('Employee not found');
          return;
        }
        setVerifyingDocument(document);
        setSelectedEmployee(employee);
        setVerificationStatus(document.status || 'pending');
        setVerificationComments(document.verification_comments || '');
        setShowVerifyDocModal(true);
        return;
      }

      // For admin-generated documents, open edit modal
      const employee = employees.find(emp => emp.id === document.employee_id);
      if (!employee) {
        showError('Employee not found');
        return;
      }

      // Fetch full document from employment_documents to get document_data
      // (the unified view doesn't include this JSON column)
      const { data: fullDoc, error: fetchError } = await supabase
        .from('employment_documents')
        .select('*')
        .eq('id', document.id)
        .single();

      if (fetchError || !fullDoc) {
        showError('Failed to load document data');
        return;
      }

      setEditingDocument(fullDoc);
      setEditedDocumentData(fullDoc.document_data || {});
      setSelectedEmployee(employee);
      setShowEditModal(true);
    } catch (err) {
      console.error('Error opening document for edit:', err);
      showError('Failed to open document for editing');
    }
  };

  const handleSaveVerification = async () => {
    try {
      if (!verifyingDocument) {
        showError('No document selected');
        return;
      }

      // Validate rejection reason if status is rejected
      if (verificationStatus === 'rejected' && !verificationComments.trim()) {
        showError('Please provide a rejection reason');
        return;
      }

      // Update employee_documents table with verification status
      const { error } = await supabase
        .from('employee_documents')
        .update({
          verification_status: verificationStatus,
          verified_by: null, // Set to null for now - will be updated with actual admin ID later
          verification_date: new Date().toISOString(),
          verification_comments: verificationComments,
          updated_at: new Date().toISOString()
        })
        .eq('id', verifyingDocument.id);

      if (error) throw error;

      showSuccess('Document verification status updated successfully');
      setShowVerifyDocModal(false);
      setVerifyingDocument(null);
      setVerificationComments('');
      loadData(); // Reload documents to show updated status
    } catch (err) {
      console.error('Error saving verification:', err);
      showError('Failed to update verification status');
    }
  };

  const handleSaveEditedDocument = async () => {
    try {
      if (!editingDocument || !selectedEmployee) {
        showError('Invalid document or employee');
        return;
      }

      setIsSavingDocument(true);

      // Update document in database with new document_data
      const { error } = await supabase
        .from('employment_documents')
        .update({
          document_data: editedDocumentData,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingDocument.id);

      if (error) throw error;

      // Regenerate PDF with updated data
      let pdf: jsPDF;

      switch (editingDocument.document_type) {
        case 'offer_letter':
          pdf = await generateOfferLetterPDF(selectedEmployee, editedDocumentData as OfferLetterData);
          break;
        case 'salary_certificate':
          pdf = await generateSalaryCertificatePDF(selectedEmployee, editedDocumentData as SalaryCertificateData);
          break;
        case 'experience_certificate':
          pdf = await generateExperienceCertificatePDF(selectedEmployee, editedDocumentData as ExperienceCertificateData);
          break;
        case 'relieving_letter':
          pdf = await generateRelievingLetterPDF(selectedEmployee, editedDocumentData as RelievingLetterData);
          break;
        case 'form_16':
          pdf = await generateForm16PDF(selectedEmployee, editedDocumentData as Form16Data);
          break;
        case 'form_24q':
          pdf = await generateForm24QPDF(editedDocumentData as Form24QData);
          break;
        case 'intern_offer_letter':
          pdf = await generateInternOfferLetterPDF(selectedEmployee, editedDocumentData as InternOfferLetterData, companySettings, hrSettings?.signatory_name, hrSettings?.signatory_designation);
          break;
        case 'intern_experience_certificate':
          pdf = await generateInternExperienceCertificatePDF(selectedEmployee, editedDocumentData as InternExperienceCertificateData, companySettings, hrSettings?.signatory_name, hrSettings?.signatory_designation);
          break;
        default:
          throw new Error('Unsupported document type');
      }

      // Delete old PDF from storage if it exists
      if (editingDocument.storage_path) {
        await supabase.storage
          .from('employee-documents')
          .remove([editingDocument.storage_path]);
      }

      // Upload new PDF to storage
      const pdfBlob = pdf.output('blob');
      const fileName = `${editingDocument.document_type}_${selectedEmployee.employee_number}_${editingDocument.document_number}_${Date.now()}.pdf`;
      const storagePath = `employment-documents/${selectedEmployee.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(storagePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Failed to upload PDF: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(storagePath);

      // Update document with new storage path and URL
      const { error: updateError } = await supabase
        .from('employment_documents')
        .update({
          document_data: editedDocumentData,
          pdf_url: urlData.publicUrl,
          storage_path: storagePath,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingDocument.id);

      if (updateError) throw updateError;

      // Download the regenerated PDF
      pdf.save(`${editingDocument.document_type}_${selectedEmployee.employee_number}_${editingDocument.document_number}_updated.pdf`);

      showSuccess('Document updated and regenerated successfully');
      setShowEditModal(false);
      setEditingDocument(null);
      setEditedDocumentData({});
      setSelectedEmployee(null);
      loadData();
    } catch (err) {
      console.error('Error saving edited document:', err);
      showError('Failed to save document');
    } finally {
      setIsSavingDocument(false);
    }
  };

  const handlePreviewEditedDocument = async () => {
    try {
      if (!editingDocument || !selectedEmployee) {
        showError('No document selected');
        return;
      }

      let pdf: jsPDF;

      switch (editingDocument.document_type) {
        case 'offer_letter':
          pdf = await generateOfferLetterPDF(selectedEmployee, editedDocumentData as OfferLetterData);
          break;
        case 'salary_certificate':
          pdf = await generateSalaryCertificatePDF(selectedEmployee, editedDocumentData as SalaryCertificateData);
          break;
        case 'experience_certificate':
          pdf = await generateExperienceCertificatePDF(selectedEmployee, editedDocumentData as ExperienceCertificateData);
          break;
        case 'relieving_letter':
          pdf = await generateRelievingLetterPDF(selectedEmployee, editedDocumentData as RelievingLetterData);
          break;
        case 'form_16':
          pdf = await generateForm16PDF(selectedEmployee, editedDocumentData as Form16Data);
          break;
        case 'form_24q':
          pdf = await generateForm24QPDF(editedDocumentData as Form24QData);
          break;
        case 'intern_offer_letter':
          pdf = await generateInternOfferLetterPDF(selectedEmployee, editedDocumentData as InternOfferLetterData, companySettings, hrSettings?.signatory_name, hrSettings?.signatory_designation);
          break;
        case 'intern_experience_certificate':
          pdf = await generateInternExperienceCertificatePDF(selectedEmployee, editedDocumentData as InternExperienceCertificateData, companySettings, hrSettings?.signatory_name, hrSettings?.signatory_designation);
          break;
        default:
          throw new Error('Unsupported document type');
      }

      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      setPreviewPdf(pdfUrl);
      setShowPreview(true);
    } catch (err) {
      console.error('Error generating preview:', err);
      showError('Failed to generate preview');
    }
  };

  // Edit and save salary slip handlers
  const handleEditSalarySlip = (slip: SalarySlip) => {
    setEditingSalarySlip(slip);
    setEditedSalarySlipData({ ...slip });
    setShowEditSalarySlipModal(true);
  };

  const handleRecalculateSalarySlip = async () => {
    if (!editingSalarySlip) return;
    try {
      const freshSlipData = await employeeService.generateSalarySlip({
        employee_id: editingSalarySlip.employee_id,
        salary_month: editingSalarySlip.salary_month,
        salary_year: editingSalarySlip.salary_year,
        working_days: editedSalarySlipData.working_days ?? editingSalarySlip.working_days,
        paid_days: editedSalarySlipData.paid_days ?? editingSalarySlip.paid_days,
        lop_days: editedSalarySlipData.lop_days ?? editingSalarySlip.lop_days,
        bonus: editedSalarySlipData.bonus ?? 0,
        overtime: editedSalarySlipData.overtime ?? 0,
        loan_repayment: editedSalarySlipData.loan_repayment ?? 0,
        other_deductions: editedSalarySlipData.other_deductions ?? 0,
      });
      setEditedSalarySlipData(prev => ({
        ...prev,
        basic_salary: freshSlipData.basic_salary,
        hra: freshSlipData.hra,
        special_allowance: freshSlipData.special_allowance,
        transport_allowance: freshSlipData.transport_allowance,
        medical_allowance: freshSlipData.medical_allowance,
        other_allowances: freshSlipData.other_allowances,
        bonus: freshSlipData.bonus,
        overtime: freshSlipData.overtime,
        gross_salary: freshSlipData.gross_salary,
        provident_fund: freshSlipData.provident_fund,
        professional_tax: freshSlipData.professional_tax,
        esic: freshSlipData.esic,
        tds: freshSlipData.tds,
        loan_repayment: freshSlipData.loan_repayment,
        other_deductions: freshSlipData.other_deductions,
        total_deductions: freshSlipData.total_deductions,
        net_salary: freshSlipData.net_salary,
      }));
      showSuccess('Recalculated from employee profile');
    } catch (err) {
      console.error('Error recalculating salary slip:', err);
      showError('Failed to recalculate from employee profile');
    }
  };

  const updateEditedSalaryField = (field: keyof SalarySlip, value: number) => {
    setEditedSalarySlipData(prev => {
      const updated = { ...prev, [field]: value };

      // Recalculate gross salary from earnings
      const earningsFields: (keyof typeof updated)[] = [
        'basic_salary', 'hra', 'special_allowance', 'transport_allowance',
        'medical_allowance', 'other_allowances', 'bonus', 'overtime'
      ];
      const newGross = earningsFields.reduce(
        (sum, f) => sum + (Number(updated[f]) || 0), 0
      );

      // Recalculate total deductions
      const deductionFields: (keyof typeof updated)[] = [
        'provident_fund', 'professional_tax', 'esic', 'tds',
        'loan_repayment', 'other_deductions'
      ];
      const newTotalDeductions = deductionFields.reduce(
        (sum, f) => sum + (Number(updated[f]) || 0), 0
      );

      const newNetSalary = newGross - newTotalDeductions;

      return {
        ...updated,
        gross_salary: Math.round(newGross),
        total_deductions: Math.round(newTotalDeductions),
        net_salary: Math.round(newNetSalary)
      };
    });
  };

  const handleSaveEditedSalarySlip = async () => {
    try {
      if (!editingSalarySlip) {
        showError('No salary slip selected');
        return;
      }

      setIsSavingSalarySlip(true);

      // Update salary slip in database
      const { error } = await supabase
        .from('salary_slips')
        .update({
          ...editedSalarySlipData,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingSalarySlip.id);

      if (error) throw error;

      showSuccess('Salary slip updated successfully');
      setShowEditSalarySlipModal(false);
      setEditingSalarySlip(null);
      setEditedSalarySlipData({});
      loadData();
    } catch (err) {
      console.error('Error saving salary slip:', err);
      showError('Failed to save salary slip');
    } finally {
      setIsSavingSalarySlip(false);
    }
  };

  const handleDownloadSalarySlip = async (salarySlip: SalarySlip) => {
    try {
      const employee = employees.find(emp => emp.id === salarySlip.employee_id);
      if (!employee) {
        showError('Employee not found');
        return;
      }

      const pdf = await generateSalarySlipPDF(employee, salarySlip, companySettings || undefined);
      const fileName = `salary_slip_${employee.employee_number}_${salarySlip.salary_month}_${salarySlip.salary_year}.pdf`;
      pdf.save(fileName);

      showSuccess('Salary slip downloaded successfully');
    } catch (err) {
      console.error('Error downloading salary slip:', err);
      showError('Failed to download salary slip');
    }
  };

  const handleEmailSalarySlip = async (salarySlip: SalarySlip) => {
    try {
      const employee = employees.find(emp => emp.id === salarySlip.employee_id);
      if (!employee) {
        showError('Employee not found');
        return;
      }

      if (!employee.email) {
        showError('Employee email not found');
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

        showSuccess('Salary slip sent successfully');
        loadData();
      };
    } catch (err) {
      console.error('Error sending salary slip:', err);
      showError('Failed to send salary slip');
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
            <h1 className="text-xl font-semibold text-gray-900">HR & Employment Documents</h1>
            <button
              onClick={loadData}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 border border-gray-300"
            >
              <Eye className="w-4 h-4 mr-2" />
              Refresh Data
            </button>
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
                            setEmployeeForm(employee);
                            setEmployeeView('view');
                          }}
                          className="text-purple-600 hover:text-purple-900 mr-3"
                          title="View Employee Details"
                        >
                          <Eye className="w-5 h-5 inline" />
                        </button>
                        <button
                          onClick={() => {
                            setEmployeeForm(employee);
                            setEmployeeView('edit');
                          }}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                          title="Edit Employee"
                        >
                          <Edit className="w-5 h-5 inline" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setActiveTab('generate-document');
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Generate Document"
                        >
                          <FileText className="w-5 h-5 inline" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setSalarySlipInput({ ...salarySlipInput, employee_id: employee.id });
                            setActiveTab('generate-salary-slip');
                          }}
                          className="text-teal-600 hover:text-teal-900 mr-3"
                          title="Generate Salary Slip"
                        >
                          <Receipt className="w-5 h-5 inline" />
                        </button>
                        <button
                          onClick={async () => {
                            const tempPassword = employeeAuthService.generateTemporaryPassword();
                            const result = await employeeAuthService.setTemporaryPassword(employee.id, tempPassword);
                            if (result.success) {
                              // Send password reset email to employee
                              try {
                                await EmailService.sendPasswordResetNotification(
                                  employee.email,
                                  employee.full_name,
                                  tempPassword
                                );
                                console.log('✅ Password reset email sent to:', employee.email);
                              } catch (emailError) {
                                console.error('❌ Failed to send password email:', emailError);
                                // Continue anyway - admin still has the password
                              }
                              
                              setTempPasswordData({
                                email: employee.email,
                                password: tempPassword,
                                name: employee.full_name
                              });
                              setShowTempPasswordModal(true);
                              setPasswordCopied(false);
                            } else {
                              showError('Failed to reset password');
                            }
                          }}
                          className="text-orange-600 hover:text-orange-900 mr-3"
                          title="Reset Password"
                        >
                          <Key className="w-5 h-5 inline" />
                        </button>
                        <button
                          onClick={() => {
                            setEmployeeToDelete(employee);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-5 h-5 inline" />
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
            <div className="mb-6 flex items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search salary slips..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  setPreviousTab('salary-slips');
                  setActiveTab('generate-salary-slip');
                }}
                className="ml-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Generate Salary Slip
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
                          {slip.email_sent && <span title="Email sent"><CheckCircle className="w-4 h-4 inline ml-2 text-green-600" /></span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditSalarySlip(slip)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="Edit Salary Slip"
                          >
                            <Edit className="w-5 h-5 inline" />
                          </button>
                          <button
                            onClick={() => handleDownloadSalarySlip(slip)}
                            className="text-green-600 hover:text-green-900 mr-3"
                            title="Download PDF"
                          >
                            <Download className="w-5 h-5 inline" />
                          </button>
                          {!slip.email_sent && employee?.email && (
                            <button
                              onClick={() => handleEmailSalarySlip(slip)}
                              className="text-orange-600 hover:text-orange-900"
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
                    onChange={(e) => {
                      const workingDays = parseInt(e.target.value) || 0;
                      setSalarySlipInput({
                        ...salarySlipInput,
                        working_days: workingDays,
                        paid_days: workingDays - (salarySlipInput.lop_days || 0)
                      });
                    }}
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
                    Paid Days
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={salarySlipInput.paid_days}
                    onChange={(e) => setSalarySlipInput({ ...salarySlipInput, paid_days: parseFloat(e.target.value) || 0 })}
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

              {/* Deductions Configuration */}
              <div className="mt-6 border-t pt-6">
                <h3 className="text-md font-medium text-gray-700 mb-4">Apply Deductions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="apply_pf"
                      checked={applyDeductions.provident_fund}
                      onChange={(e) => setApplyDeductions({ ...applyDeductions, provident_fund: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="apply_pf" className="ml-2 text-sm text-gray-700">
                      Provident Fund (PF)
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="apply_pt"
                      checked={applyDeductions.professional_tax}
                      onChange={(e) => setApplyDeductions({ ...applyDeductions, professional_tax: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="apply_pt" className="ml-2 text-sm text-gray-700">
                      Professional Tax
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="apply_esic"
                      checked={applyDeductions.esic}
                      onChange={(e) => setApplyDeductions({ ...applyDeductions, esic: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="apply_esic" className="ml-2 text-sm text-gray-700">
                      ESIC
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="apply_tds"
                      checked={applyDeductions.tds}
                      onChange={(e) => setApplyDeductions({ ...applyDeductions, tds: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="apply_tds" className="ml-2 text-sm text-gray-700">
                      TDS (Income Tax)
                    </label>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Uncheck to exclude specific deductions from the salary slip</p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button
                  onClick={() => setActiveTab('salary-slips')}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md hover:from-red-600 hover:to-red-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePreviewSalarySlip}
                  className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
                  disabled={!salarySlipInput.employee_id}
                >
                  <Eye className="w-4 h-4 inline mr-2" />
                  Preview
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
            <div className="mb-6 flex items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  setPreviousTab('documents');
                  setActiveTab('generate-document');
                }}
                className="ml-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Generate Document
              </button>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document Title
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Doc No.
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Source
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Date
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc: any) => {
                    const employee = employees.find(e => e.id === doc.employee_id);
                    return (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-sm text-gray-900">
                        {employee ? `${employee.full_name} (${employee.employee_number})` : 'Unknown'}
                      </td>
                      <td className="px-3 py-3 text-sm font-medium text-gray-900">
                        {doc.title}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {doc.document_number || '-'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-500">
                        {doc.document_type?.replace(/_/g, ' ').toUpperCase()}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          doc.document_source === 'admin_generated' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {doc.document_source === 'admin_generated' ? 'Admin' : 'Employee'}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {doc.document_date ? new Date(doc.document_date).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          (doc.status === 'verified' || doc.status === 'issued') 
                            ? 'bg-green-100 text-green-800' 
                            : (doc.status === 'pending')
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {doc.status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View Document"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEditDocument(doc)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit Document"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDownloadDocument(doc)}
                          className="text-green-600 hover:text-green-900"
                          title="Download PDF"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setDocumentToDelete(doc);
                            setShowDeleteDocumentModal(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Document"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
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
                  value={employeeForm.employee_number || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                  placeholder="Auto-generated when department is selected"
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
                <select
                  value={employeeForm.department || ''}
                  onChange={async (e) => {
                    const dept = e.target.value;
                    setEmployeeForm({ ...employeeForm, department: dept });
                    if (dept && employeeView === 'add') {
                      try {
                        const generatedId = await employeeService.generateEmployeeId(dept);
                        setEmployeeForm(prev => ({ ...prev, department: dept, employee_number: generatedId }));
                      } catch (err) {
                        console.error('Failed to generate employee ID:', err);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Department</option>
                  <option value="ITwala">ITwala</option>
                  <option value="Kdadks">Kdadks</option>
                  <option value="Nirchal">Nirchal</option>
                  <option value="Ayuh Clinic">Ayuh Clinic</option>
                </select>
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

              {/* CTC field only - detailed salary structure managed in Compensation Management */}
              <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CTC / Monthly Gross (for reference)
                    </label>
                    <input
                      type="number"
                      value={employeeForm.basic_salary || ''}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, basic_salary: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. 30000"
                    />
                  </div>
                  <div className="flex-1 bg-white border border-blue-200 rounded p-3 text-sm text-blue-800">
                    <p className="font-medium mb-1">💡 Salary Structure</p>
                    <p className="text-xs text-gray-600">Detailed salary breakdown (Basic, HRA, Special Allowance, PF, ESI, TDS, etc.) is managed in <strong>Compensation Management</strong>. Set it up there after creating the employee.</p>
                  </div>
                </div>
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
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md hover:from-red-600 hover:to-red-700 transition-all"
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

        {/* View Employee (Read-Only) */}
        {activeTab === 'employees' && employeeView === 'view' && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Employee Details</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => handleViewEmployeeDocuments(employeeForm as Employee)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  View Documents
                </button>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="md:col-span-2">
                <h3 className="text-md font-semibold mb-4 text-gray-700 border-b pb-2">Personal Information</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Employee Number</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                  {employeeForm.employee_number || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                  {[employeeForm.first_name, employeeForm.middle_name, employeeForm.last_name].filter(Boolean).join(' ') || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Father's Name</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                  {employeeForm.fathers_name || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                  {employeeForm.email || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                  {employeeForm.phone || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Date of Birth</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                  {employeeForm.date_of_birth ? new Date(employeeForm.date_of_birth).toLocaleDateString('en-GB') : 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Gender</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900 capitalize">
                  {employeeForm.gender || 'N/A'}
                </div>
              </div>

              {/* Employment Information */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-md font-semibold mb-4 text-gray-700 border-b pb-2">Employment Information</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Designation</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                  {employeeForm.designation || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Department</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                  {employeeForm.department || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Date of Joining</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                  {employeeForm.date_of_joining ? new Date(employeeForm.date_of_joining).toLocaleDateString('en-GB') : 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Employment Type</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900 capitalize">
                  {employeeForm.employment_type?.replace('-', ' ') || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Employment Status</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    employeeForm.employment_status === 'active' ? 'bg-green-100 text-green-800' :
                    employeeForm.employment_status === 'on-leave' ? 'bg-yellow-100 text-yellow-800' :
                    employeeForm.employment_status === 'resigned' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {employeeForm.employment_status || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Salary Information */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-md font-semibold mb-4 text-gray-700 border-b pb-2">Salary Information</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Basic Salary</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900 font-semibold">
                  ₹{employeeForm.basic_salary?.toLocaleString('en-IN') || '0'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">HRA</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900 font-semibold">
                  ₹{employeeForm.hra?.toLocaleString('en-IN') || '0'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Special Allowance</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900 font-semibold">
                  ₹{employeeForm.special_allowance?.toLocaleString('en-IN') || '0'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Gross Salary</label>
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-blue-900 font-bold">
                  ₹{((employeeForm.basic_salary || 0) + (employeeForm.hra || 0) + (employeeForm.special_allowance || 0)).toLocaleString('en-IN')}
                </div>
              </div>

              {/* Identity Documents */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-md font-semibold mb-4 text-gray-700 border-b pb-2">Identity Documents</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">PAN Number</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900 font-mono">
                  {employeeForm.pan_number || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Aadhar Number</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900 font-mono">
                  {employeeForm.aadhar_number || 'N/A'}
                </div>
              </div>

              {/* Address Information */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-md font-semibold mb-4 text-gray-700 border-b pb-2">Address Information</h3>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">Address Line 1</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                  {employeeForm.address_line1 || 'N/A'}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">Address Line 2</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                  {employeeForm.address_line2 || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">City</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                  {employeeForm.city || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">State</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                  {employeeForm.state || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Postal Code</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                  {employeeForm.postal_code || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Country</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                  {employeeForm.country || 'N/A'}
                </div>
              </div>

              {/* Bank Details */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-md font-semibold mb-4 text-gray-700 border-b pb-2">Bank Details</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Bank Name</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                  {employeeForm.bank_name || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">IFSC Code</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900 font-mono">
                  {employeeForm.bank_ifsc_code || 'N/A'}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">Account Number</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900 font-mono">
                  {employeeForm.bank_account_number || 'N/A'}
                </div>
              </div>
            </div>

            {/* Employee Notes Section */}
            <div className="mt-6 border-t pt-6">
              <EmployeeNotes
                employeeId={employeeForm.id || ''}
                currentAdminName="Admin"
              />
            </div>

            {/* Workflow Buttons */}
            {(employeeForm.employment_status === 'resigned' || employeeForm.employment_status === 'terminated') && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 font-medium mb-2">This employee has left the organisation.</p>
                <button
                  onClick={() => setShowRehireModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center gap-2"
                >
                  Rehire Employee
                </button>
              </div>
            )}

            {employeeForm.employment_type === 'intern' && employeeForm.employment_status === 'active' && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium mb-2">This employee is currently an intern.</p>
                <button
                  onClick={() => setShowInternConversionModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"
                >
                  Convert to Employee
                </button>
              </div>
            )}

            <div className="mt-6 flex justify-between border-t pt-4">
              <button
                onClick={() => {
                  resetEmployeeForm();
                  setEmployeeView('list');
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                <ArrowLeft className="w-4 h-4 inline mr-2" />
                Back to List
              </button>
              <button
                onClick={() => setEmployeeView('edit')}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Edit className="w-4 h-4 inline mr-2" />
                Edit Employee
              </button>
            </div>

            {/* Modals */}
            {showRehireModal && employeeForm.id && (
              <RehireWorkflow
                employee={employeeForm as Employee}
                onClose={() => setShowRehireModal(false)}
                onRehired={(updated) => {
                  setEmployees(employees.map(emp => emp.id === updated.id ? updated : emp));
                  setEmployeeForm(updated);
                  setShowRehireModal(false);
                  showSuccess('Employee rehired successfully');
                }}
                currentAdminName="Admin"
              />
            )}

            {showInternConversionModal && employeeForm.id && (
              <InternConversionWorkflow
                employee={employeeForm as Employee}
                onClose={() => setShowInternConversionModal(false)}
                onConverted={(updated) => {
                  setEmployees(employees.map(emp => emp.id === updated.id ? updated : emp));
                  setEmployeeForm(updated);
                  setShowInternConversionModal(false);
                  showSuccess('Intern converted to employee successfully');
                }}
                currentAdminName="Admin"
              />
            )}
          </div>
        )}

        {/* Edit Employee View */}
        {activeTab === 'employees' && employeeView === 'edit' && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Edit Employee</h2>
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
                  value={employeeForm.employee_number || ''}
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
                  value={employeeForm.first_name || ''}
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
                  value={employeeForm.last_name || ''}
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
                  value={employeeForm.email || ''}
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
                  Designation
                </label>
                <input
                  type="text"
                  value={employeeForm.designation || ''}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={employeeForm.department || ''}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Department</option>
                  <option value="ITwala">ITwala</option>
                  <option value="Kdadks">Kdadks</option>
                  <option value="Nirchal">Nirchal</option>
                  <option value="Ayuh Clinic">Ayuh Clinic</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Joining
                </label>
                <input
                  type="date"
                  value={employeeForm.date_of_joining || ''}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, date_of_joining: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employment Type
                </label>
                <select
                  value={employeeForm.employment_type || 'full-time'}
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
                  Employment Status
                </label>
                <select
                  value={employeeForm.employment_status || 'active'}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, employment_status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="on-leave">On Leave</option>
                  <option value="resigned">Resigned</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Basic Salary
                </label>
                <input
                  type="number"
                  value={employeeForm.basic_salary || 0}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, basic_salary: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md hover:from-red-600 hover:to-red-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateEmployee}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Save className="w-4 h-4 inline mr-2" />
                Update Employee
              </button>
            </div>
          </div>
        )}

        {/* Generate Document Tab */}
        {activeTab === 'generate-document' && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-6">Generate Employment Document</h2>

            <div className="space-y-6">
              {/* Helper to fetch compensation data from employee_compensation table */}
              {(() => {
                // Ensure handler is available in component scope
                return null;
              })()}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Employee *
                </label>
                <select
                  value={selectedEmployee?.id || ''}
                  onChange={async (e) => {
                    const emp = employees.find(empItem => empItem.id === e.target.value) || null;
                    setSelectedEmployee(emp);
                    if (emp) {
                      let compData: any = null;
                      let allComps: any[] = [];
                      try {
                        compData = await compensationService.getCurrentCompensation(emp.id);
                        if (documentType === 'form_24q') {
                          allComps = await compensationService.getCompensations(undefined, true);
                        }
                      } catch (err) {
                        console.warn('Could not fetch compensation record:', err);
                      }
                      const prefilled = getPrefilledDocumentData(documentType, emp, companySettings, hrSettings, compData, allComps);
                      setDocumentData(prefilled);
                    } else {
                      setDocumentData({});
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_number}) - {emp.employment_status}
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
                  onChange={async (e) => {
                    const newType = e.target.value as DocumentType;
                    setDocumentType(newType);
                    let compData: any = null;
                    let allComps: any[] = [];
                    try {
                      if (selectedEmployee?.id) {
                        compData = await compensationService.getCurrentCompensation(selectedEmployee.id);
                      }
                      if (newType === 'form_24q') {
                        allComps = await compensationService.getCompensations(undefined, true);
                      }
                    } catch (err) {
                      console.warn('Could not fetch compensation record:', err);
                    }
                    const prefilled = getPrefilledDocumentData(newType, selectedEmployee, companySettings, hrSettings, compData, allComps);
                    setDocumentData(prefilled);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="offer_letter">Offer Letter</option>
                  <option value="salary_certificate">Salary Certificate</option>
                  <option value="experience_certificate">Experience Certificate</option>
                  {selectedEmployee?.employment_status === 'terminated' && (
                    <option value="relieving_letter">Relieving Letter</option>
                  )}
                  <option value="form_16">Form 16</option>
                  <option value="form_24q">Form 24Q</option>
                  <optgroup label="── ITWala Academy Internship Program ──">
                    <option value="intern_offer_letter">Internship Offer Letter</option>
                    <option value="intern_experience_certificate">Internship Experience Certificate</option>
                  </optgroup>
                </select>
              </div>

              {selectedEmployee && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-medium text-blue-900 text-sm">
                      <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Jurisdiction: {documentData.jurisdiction || getJurisdictionInfo(companySettings?.country_id || selectedEmployee.country).jurisdiction}</span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      Entity: <span className="font-semibold">{companySettings?.company_name || 'Kdadks'}</span> | Country: <span className="font-semibold">{companySettings?.country_id || selectedEmployee.country || 'IN'}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      let compData: any = null;
                      let allComps: any[] = [];
                      try {
                        if (selectedEmployee?.id) {
                          compData = await compensationService.getCurrentCompensation(selectedEmployee.id);
                        }
                        if (documentType === 'form_24q') {
                          allComps = await compensationService.getCompensations(undefined, true);
                        }
                      } catch (err) {
                        console.warn('Could not fetch compensation record:', err);
                      }
                      const prefilled = getPrefilledDocumentData(documentType, selectedEmployee, companySettings, hrSettings, compData, allComps);
                      setDocumentData(prefilled);
                      showSuccess(`Loaded standard prefilled template for ${documentType.replace(/_/g, ' ')}`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md shadow-sm transition-colors shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset to Standard Template
                  </button>
                </div>
              )}

              {/* Document-specific fields */}
              {selectedEmployee && documentType === 'offer_letter' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium text-lg">Offer Letter Details</h3>
                  
                  {/* Basic Information */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-gray-700">Basic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Offer Date</label>
                        <input
                          type="date"
                          value={documentData.offer_date || new Date().toISOString().split('T')[0]}
                          onChange={(e) => setDocumentData({ ...documentData, offer_date: e.target.value })}
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
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Candidate Address</label>
                      <textarea
                        value={documentData.candidate_address || ''}
                        onChange={(e) => setDocumentData({ ...documentData, candidate_address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={3}
                        placeholder="Enter candidate's full address (or leave blank to use employee address)"
                      />
                    </div>
                  </div>

                  {/* Position Details */}
                  <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-blue-700">1. Position Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Job Title / Position</label>
                        <input
                          type="text"
                          value={documentData.position || selectedEmployee.designation}
                          onChange={(e) => setDocumentData({ ...documentData, position: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., Office Admin"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                        <input
                          type="text"
                          value={documentData.department || selectedEmployee.department || ''}
                          onChange={(e) => setDocumentData({ ...documentData, department: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., Administration"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Reporting To</label>
                        <input
                          type="text"
                          value={documentData.reporting_to || ''}
                          onChange={(e) => setDocumentData({ ...documentData, reporting_to: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., Manager Name / Designation"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Work Location Type</label>
                        <select
                          value={documentData.work_location_type || 'onsite'}
                          onChange={(e) => {
                            const type = e.target.value as 'onsite' | 'hybrid' | 'remote';
                            const defaultAddr = companySettings
                              ? [companySettings.address_line1, companySettings.address_line2, companySettings.city, companySettings.state, companySettings.postal_code].filter(Boolean).join(', ')
                              : 'Corporate Office';
                            setDocumentData({
                              ...documentData,
                              work_location_type: type,
                              work_location: type === 'remote' ? '' : (documentData.work_location || defaultAddr)
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="onsite">Onsite</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="remote">Remote</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Work Location Address Data {documentData.work_location_type === 'remote' ? '(Blank for Remote)' : ''}
                        </label>
                        <textarea
                          value={documentData.work_location || ''}
                          onChange={(e) => setDocumentData({ ...documentData, work_location: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                          rows={3}
                          placeholder={documentData.work_location_type === 'remote' ? 'Remote (Leave blank)' : 'Enter full work location address data'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
                        <select
                          value={documentData.employment_type || selectedEmployee.employment_type}
                          onChange={(e) => setDocumentData({ ...documentData, employment_type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="full-time">Full-time</option>
                          <option value="part-time">Part-time</option>
                          <option value="contract">Contract</option>
                          <option value="intern">Intern</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Roles and Responsibilities */}
                  <div className="bg-green-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-green-700">2. Roles and Responsibilities</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Responsibilities (one per line)
                      </label>
                      <textarea
                        value={documentData.roles_responsibilities || ''}
                        onChange={(e) => setDocumentData({ ...documentData, roles_responsibilities: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                        rows={8}
                        placeholder={`Managing day-to-day office administrative operations
Handling correspondence, documentation, and record-keeping
Coordinating with internal teams and external vendors
Maintaining office supplies and inventory
Supporting HR and accounts-related administrative tasks
Any other duties assigned by management from time to time`}
                      />
                      <p className="text-xs text-gray-500 mt-1">Enter each responsibility on a new line. Leave blank to use default responsibilities.</p>
                    </div>
                  </div>

                  {/* Compensation */}
                  <div className="bg-yellow-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-yellow-800 text-base">3. Compensation & Statutory Benefits (Entity Law)</h4>

                    {/* Monetary Component Breakdown Fields */}
                    <div className="bg-white p-3 rounded-md border border-yellow-200 space-y-3">
                      <h5 className="font-medium text-xs text-gray-700 uppercase tracking-wider">Monetary Component Breakdown ({selectedEmployee.currency_code || 'INR'})</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Basic Salary</label>
                          <input
                            type="number"
                            value={documentData.salary_breakdown?.basic ?? selectedEmployee.basic_salary}
                            onChange={(e) => {
                              const basicVal = parseFloat(e.target.value) || 0;
                              const b = documentData.salary_breakdown || {};
                              const gross = basicVal + (b.hra || 0) + (b.special_allowance || 0) + (b.other_allowances || 0);
                              setDocumentData({
                                ...documentData,
                                salary_breakdown: { ...b, basic: basicVal, gross_salary: gross },
                                annual_ctc: gross * 12
                              });
                            }}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">HRA (House Rent Allowance)</label>
                          <input
                            type="number"
                            value={documentData.salary_breakdown?.hra ?? selectedEmployee.hra ?? 0}
                            onChange={(e) => {
                              const hraVal = parseFloat(e.target.value) || 0;
                              const b = documentData.salary_breakdown || {};
                              const gross = (b.basic || 0) + hraVal + (b.special_allowance || 0) + (b.other_allowances || 0);
                              setDocumentData({
                                ...documentData,
                                salary_breakdown: { ...b, hra: hraVal, gross_salary: gross },
                                annual_ctc: gross * 12
                              });
                            }}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Special Allowance</label>
                          <input
                            type="number"
                            value={documentData.salary_breakdown?.special_allowance ?? selectedEmployee.special_allowance ?? 0}
                            onChange={(e) => {
                              const specVal = parseFloat(e.target.value) || 0;
                              const b = documentData.salary_breakdown || {};
                              const gross = (b.basic || 0) + (b.hra || 0) + specVal + (b.other_allowances || 0);
                              setDocumentData({
                                ...documentData,
                                salary_breakdown: { ...b, special_allowance: specVal, gross_salary: gross },
                                annual_ctc: gross * 12
                              });
                            }}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Other Allowances</label>
                          <input
                            type="number"
                            value={documentData.salary_breakdown?.other_allowances ?? selectedEmployee.other_allowances ?? 0}
                            onChange={(e) => {
                              const othVal = parseFloat(e.target.value) || 0;
                              const b = documentData.salary_breakdown || {};
                              const gross = (b.basic || 0) + (b.hra || 0) + (b.special_allowance || 0) + othVal;
                              setDocumentData({
                                ...documentData,
                                salary_breakdown: { ...b, other_allowances: othVal, gross_salary: gross },
                                annual_ctc: gross * 12
                              });
                            }}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t text-sm">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Gross Monthly Salary ({selectedEmployee.currency_code || 'INR'})</label>
                          <input
                            type="number"
                            value={documentData.salary_breakdown?.gross_salary ?? selectedEmployee.gross_salary}
                            onChange={(e) => setDocumentData({
                              ...documentData,
                              salary_breakdown: { ...documentData.salary_breakdown, gross_salary: parseFloat(e.target.value) || 0 }
                            })}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md font-semibold text-blue-900 bg-blue-50/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Annual CTC ({selectedEmployee.currency_code || 'INR'})</label>
                          <input
                            type="number"
                            value={documentData.annual_ctc ?? (selectedEmployee.gross_salary * 12)}
                            onChange={(e) => setDocumentData({ ...documentData, annual_ctc: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md font-semibold text-blue-900 bg-blue-50/50"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Itemized Statutory & Entity Benefits List */}
                    <div className="bg-white p-3 rounded-md border border-yellow-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-xs text-gray-700 uppercase tracking-wider">Statutory & Entity Benefits Fields</h5>
                        <button
                          type="button"
                          onClick={() => {
                            const currentList = Array.isArray(documentData.benefits) ? documentData.benefits : [];
                            setDocumentData({ ...documentData, benefits: [...currentList, 'New Statutory Benefit'] });
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Benefit Item
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(Array.isArray(documentData.benefits) ? documentData.benefits : []).map((bItem: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 font-semibold w-5">{idx + 1}.</span>
                            <input
                              type="text"
                              value={bItem}
                              onChange={(e) => {
                                const currentList = [...(documentData.benefits || [])];
                                currentList[idx] = e.target.value;
                                setDocumentData({ ...documentData, benefits: currentList });
                              }}
                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-xs font-mono"
                              placeholder="e.g. House Rent Allowance (HRA), EPF Pension Matching, Medical Insurance"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const currentList = (documentData.benefits || []).filter((_: any, i: number) => i !== idx);
                                setDocumentData({ ...documentData, benefits: currentList });
                              }}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {(!documentData.benefits || documentData.benefits.length === 0) && (
                          <p className="text-xs text-gray-500 italic">No specific benefit items added. Click "+ Add Benefit Item" above to add benefits.</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Salary Payment Note</label>
                      <textarea
                        value={documentData.salary_payment_note || ''}
                        onChange={(e) => setDocumentData({ ...documentData, salary_payment_note: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        rows={2}
                        placeholder="Salary will be paid as per the company's payroll cycle and applicable statutory deductions."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Overall Benefits Clause Note</label>
                      <textarea
                        value={documentData.benefits_note || ''}
                        onChange={(e) => setDocumentData({ ...documentData, benefits_note: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        rows={2}
                        placeholder="You will be entitled to benefits and facilities as per company policy, which may be revised from time to time."
                      />
                    </div>
                  </div>

                  {/* Working Hours */}
                  <div className="bg-purple-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-purple-700">4. Working Hours</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                        <input
                          type="text"
                          value={documentData.working_hours_start || '9:30 AM'}
                          onChange={(e) => setDocumentData({ ...documentData, working_hours_start: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="9:30 AM"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                        <input
                          type="text"
                          value={documentData.working_hours_end || '6:30 PM'}
                          onChange={(e) => setDocumentData({ ...documentData, working_hours_end: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="6:30 PM"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
                        <input
                          type="text"
                          value={documentData.working_days || 'Monday to Saturday'}
                          onChange={(e) => setDocumentData({ ...documentData, working_days: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Monday to Saturday"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Additional Hours Note</label>
                      <input
                        type="text"
                        value={documentData.additional_hours_note || ''}
                        onChange={(e) => setDocumentData({ ...documentData, additional_hours_note: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="You may be required to work additional hours based on business requirements."
                      />
                    </div>
                  </div>

                  {/* Probation & Notice Period */}
                  <div className="bg-orange-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-orange-700">5. Probation & 8. Termination</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Probation Note</label>
                      <textarea
                        value={documentData.probation_note || ''}
                        onChange={(e) => setDocumentData({ ...documentData, probation_note: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={2}
                        placeholder="During the probation period, your performance will be reviewed, and upon successful completion, your employment will be confirmed in writing."
                      />
                    </div>
                  </div>

                  {/* Other Policy Notes */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-gray-700">6 & 7. Leave, Holidays & Confidentiality</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Leave Policy Note</label>
                      <textarea
                        value={documentData.leave_policy_note || ''}
                        onChange={(e) => setDocumentData({ ...documentData, leave_policy_note: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={2}
                        placeholder="Leave and holidays will be governed by the company's leave policy applicable at the time of employment."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confidentiality Note</label>
                      <textarea
                        value={documentData.confidentiality_note || ''}
                        onChange={(e) => setDocumentData({ ...documentData, confidentiality_note: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={2}
                        placeholder="You are required to maintain strict confidentiality of all company information, data, and records during and after your employment with the company."
                      />
                    </div>
                  </div>

                  {/* Intellectual Property & Asset Management */}
                  <div className="bg-purple-50 p-4 rounded-lg space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-600" />
                      <h4 className="font-medium text-purple-900">Intellectual Property & Company Asset Clauses</h4>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Governing Law Jurisdiction</label>
                      <input
                        type="text"
                        value={documentData.jurisdiction || ''}
                        onChange={(e) => setDocumentData({ ...documentData, jurisdiction: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                        placeholder="e.g., Republic of India (High Court Jurisdiction)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Intellectual Property (IP) Assignment Clause</label>
                      <textarea
                        value={documentData.ip_clause_text || ''}
                        onChange={(e) => setDocumentData({ ...documentData, ip_clause_text: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-xs font-mono"
                        rows={3}
                        placeholder="All intellectual property created during employment belongs exclusively to the company..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Asset Management & Return Clause</label>
                      <textarea
                        value={documentData.asset_clause_text || ''}
                        onChange={(e) => setDocumentData({ ...documentData, asset_clause_text: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-xs font-mono"
                        rows={3}
                        placeholder="Employee is responsible for company assets and must return all physical/digital property upon exit..."
                      />
                    </div>
                  </div>

                  {/* Signatory Details */}
                  <div className="bg-indigo-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-indigo-700">Signatory Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Authorized Signatory Name</label>
                        <input
                          type="text"
                          value={documentData.signatory_name || hrSettings?.signatory_name || ''}
                          onChange={(e) => setDocumentData({ ...documentData, signatory_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Enter signatory name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Signatory Designation</label>
                        <input
                          type="text"
                          value={documentData.signatory_designation || hrSettings?.signatory_designation || ''}
                          onChange={(e) => setDocumentData({ ...documentData, signatory_designation: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Enter designation"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact Details</label>
                        <input
                          type="text"
                          value={documentData.signatory_contact || ''}
                          onChange={(e) => setDocumentData({ ...documentData, signatory_contact: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Phone or email"
                        />
                      </div>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="acceptance_section"
                        checked={documentData.acceptance_section !== false}
                        onChange={(e) => setDocumentData({ ...documentData, acceptance_section: e.target.checked })}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <label htmlFor="acceptance_section" className="ml-2 text-sm text-gray-700">
                        Include Candidate Acceptance Section (signature & date lines)
                      </label>
                    </div>
                  </div>

                  {/* Additional Sections */}
                  <div className="bg-red-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-red-700">Additional Sections (Optional)</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Terms & Conditions
                      </label>
                      <textarea
                        value={documentData.terms_and_conditions || ''}
                        onChange={(e) => setDocumentData({ ...documentData, terms_and_conditions: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={4}
                        placeholder="Enter any additional terms and conditions (e.g., bond period, code of conduct, etc.)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Other Information
                      </label>
                      <textarea
                        value={documentData.other_details || ''}
                        onChange={(e) => setDocumentData({ ...documentData, other_details: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={4}
                        placeholder="Additional information (e.g., relocation assistance, training period, etc.)"
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
                        },
                        annual_ctc: selectedEmployee.gross_salary * 12
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

              {selectedEmployee && documentType === 'experience_certificate' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium text-lg">Experience Certificate Details</h3>

                  {/* Employee Information (Auto-filled) */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-gray-700">Employee Information (Auto-filled)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Employee Name</label>
                        <input
                          type="text"
                          value={documentData.employee_name || selectedEmployee.full_name}
                          onChange={(e) => setDocumentData({ ...documentData, employee_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                        <input
                          type="text"
                          value={documentData.designation || selectedEmployee.designation}
                          onChange={(e) => setDocumentData({ ...documentData, designation: e.target.value })}
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date of Joining</label>
                        <input
                          type="date"
                          value={documentData.date_of_joining || selectedEmployee.date_of_joining}
                          onChange={(e) => setDocumentData({ ...documentData, date_of_joining: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Working Date</label>
                        <input
                          type="date"
                          value={documentData.last_working_date || selectedEmployee.date_of_leaving || ''}
                          onChange={(e) => setDocumentData({ ...documentData, last_working_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Issued Date</label>
                        <input
                          type="date"
                          value={documentData.issued_date || new Date().toISOString().split('T')[0]}
                          onChange={(e) => setDocumentData({ ...documentData, issued_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Roles and Performance */}
                  <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-blue-700">Roles, Responsibilities & Performance</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Roles and Responsibilities</label>
                      <textarea
                        value={documentData.roles_responsibilities || ''}
                        onChange={(e) => setDocumentData({ ...documentData, roles_responsibilities: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={4}
                        placeholder="Describe the employee's key roles and responsibilities during their tenure"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Performance Note</label>
                      <textarea
                        value={documentData.performance_note || ''}
                        onChange={(e) => setDocumentData({ ...documentData, performance_note: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={3}
                        placeholder="e.g., Performed duties with dedication and professionalism throughout the tenure"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Conduct Note</label>
                      <textarea
                        value={documentData.conduct_note || ''}
                        onChange={(e) => setDocumentData({ ...documentData, conduct_note: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={2}
                        placeholder="e.g., Maintained excellent professional conduct and teamwork"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Leaving (Optional)</label>
                      <input
                        type="text"
                        value={documentData.reason_for_leaving || ''}
                        onChange={(e) => setDocumentData({ ...documentData, reason_for_leaving: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g., Better opportunity, Personal reasons (optional)"
                      />
                    </div>
                  </div>

                  {/* Intellectual Property & Asset Clearance */}
                  <div className="bg-purple-50 p-4 rounded-lg space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-600" />
                      <h4 className="font-medium text-purple-900">Post-Employment IP & Asset Clearance Clauses</h4>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Post-Employment IP Obligation Note</label>
                      <textarea
                        value={documentData.ip_clause_text || ''}
                        onChange={(e) => setDocumentData({ ...documentData, ip_clause_text: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-xs font-mono"
                        rows={2}
                        placeholder="Reaffirmation of IP ownership..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Asset Exit Clearance Confirmation</label>
                      <textarea
                        value={documentData.asset_clause_text || ''}
                        onChange={(e) => setDocumentData({ ...documentData, asset_clause_text: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-xs font-mono"
                        rows={2}
                        placeholder="Confirmation of full return of company assets and keys..."
                      />
                    </div>
                  </div>

                  {/* Signatory Details */}
                  <div className="bg-green-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-green-700">Signatory Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Signatory Name</label>
                        <input
                          type="text"
                          value={documentData.signatory_name || hrSettings?.signatory_name || ''}
                          onChange={(e) => setDocumentData({ ...documentData, signatory_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Authorized Signatory Name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Signatory Designation</label>
                        <input
                          type="text"
                          value={documentData.signatory_designation || hrSettings?.signatory_designation || ''}
                          onChange={(e) => setDocumentData({ ...documentData, signatory_designation: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Designation"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact Details</label>
                        <input
                          type="text"
                          value={documentData.contact_details || ''}
                          onChange={(e) => setDocumentData({ ...documentData, contact_details: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Phone or Email"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ITWala Academy – Internship Offer Letter ─────────────────────── */}
              {selectedEmployee && documentType === 'intern_offer_letter' && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-1 rounded-full">ITWala Academy Internship Program</span>
                    <h3 className="font-medium text-lg">Internship Offer Letter</h3>
                  </div>

                  {/* Validation Banner */}
                  {(() => {
                    const v = validateInternOfferLetter(documentData);
                    if (!v.isValid)
                      return (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 space-y-1">
                          <p className="font-semibold">Please fix the following before generating:</p>
                          <ul className="list-disc ml-4">{v.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                        </div>
                      );
                    if (v.warnings.length > 0)
                      return (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700 space-y-1">
                          <p className="font-semibold">Recommendations:</p>
                          <ul className="list-disc ml-4">{v.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                        </div>
                      );
                    return <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 font-medium">✓ All required fields are complete.</div>;
                  })()}

                  {/* Auto-fill from defaults */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setDocumentData(getDefaultInternOfferLetterData(selectedEmployee))}
                      className="text-xs text-indigo-600 underline hover:text-indigo-800"
                    >
                      Auto-fill defaults
                    </button>
                  </div>

                  {/* Core Details */}
                  <div className="bg-indigo-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-indigo-700">1. Core Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Program Name *</label>
                        <input type="text" value={documentData.program_name || PROGRAM_NAME_DEFAULT}
                          onChange={(e) => setDocumentData({ ...documentData, program_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="ITWala Academy Internship Program" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Program Batch</label>
                        <input type="text" value={documentData.program_batch || ''}
                          onChange={(e) => setDocumentData({ ...documentData, program_batch: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g. Batch 2026-A" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Intern Role / Position *</label>
                        <input type="text" value={documentData.position || selectedEmployee.designation}
                          onChange={(e) => setDocumentData({ ...documentData, position: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g. Frontend Development Intern" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                        <input type="text" value={documentData.department || selectedEmployee.department || ''}
                          onChange={(e) => setDocumentData({ ...documentData, department: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g. Engineering" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Offer Date</label>
                        <input type="date" value={documentData.offer_date || new Date().toISOString().split('T')[0]}
                          onChange={(e) => setDocumentData({ ...documentData, offer_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                      </div>
                    </div>
                  </div>

                  {/* Internship Duration */}
                  <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-blue-700">2. Internship Scope & Duration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                        <input type="date" value={documentData.joining_date || selectedEmployee.date_of_joining}
                          onChange={(e) => setDocumentData({ ...documentData, joining_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                        <input type="date" value={documentData.end_date || ''}
                          onChange={(e) => setDocumentData({ ...documentData, end_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (display)</label>
                        <input type="text" value={documentData.internship_duration || ''}
                          onChange={(e) => setDocumentData({ ...documentData, internship_duration: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g. 3 months / 12 weeks" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Internship Scope Description</label>
                      <textarea value={documentData.internship_scope || ''}
                        onChange={(e) => setDocumentData({ ...documentData, internship_scope: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={3}
                        placeholder="Briefly describe the scope, objectives, and nature of the internship." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Program-specific Notes</label>
                      <textarea value={documentData.program_notes || ''}
                        onChange={(e) => setDocumentData({ ...documentData, program_notes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={2}
                        placeholder="Any batch-specific conditions or requirements." />
                    </div>
                  </div>

                  {/* Supervisor & Location */}
                  <div className="bg-green-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-green-700">3. Supervisor & Location</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor Name</label>
                        <input type="text" value={documentData.supervisor_name || ''}
                          onChange={(e) => setDocumentData({ ...documentData, supervisor_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Supervisor full name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor Title</label>
                        <input type="text" value={documentData.supervisor_title || ''}
                          onChange={(e) => setDocumentData({ ...documentData, supervisor_title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g. Senior Engineer / Team Lead" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Work Location Type</label>
                        <select
                          value={documentData.work_location_type || 'onsite'}
                          onChange={(e) => {
                            const type = e.target.value as 'onsite' | 'hybrid' | 'remote';
                            const defaultAddr = companySettings
                              ? [companySettings.address_line1, companySettings.address_line2, companySettings.city, companySettings.state, companySettings.postal_code].filter(Boolean).join(', ')
                              : 'Corporate Office';
                            setDocumentData({
                              ...documentData,
                              work_location_type: type,
                              work_location: type === 'remote' ? '' : (documentData.work_location || defaultAddr)
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="onsite">Onsite</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="remote">Remote</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Work Location Address Data {documentData.work_location_type === 'remote' ? '(Blank for Remote)' : ''}
                        </label>
                        <textarea
                          value={documentData.work_location || ''}
                          onChange={(e) => setDocumentData({ ...documentData, work_location: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                          rows={3}
                          placeholder={documentData.work_location_type === 'remote' ? 'Remote (Leave blank)' : 'Enter full work location address data'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Working Days</label>
                        <input type="text" value={documentData.working_days || 'Monday to Friday'}
                          onChange={(e) => setDocumentData({ ...documentData, working_days: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                        <input type="text" value={documentData.working_hours_start || '9:30 AM'}
                          onChange={(e) => setDocumentData({ ...documentData, working_hours_start: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                        <input type="text" value={documentData.working_hours_end || '6:30 PM'}
                          onChange={(e) => setDocumentData({ ...documentData, working_hours_end: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                      </div>
                    </div>
                  </div>

                  {/* Duties */}
                  <div className="bg-yellow-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-yellow-700">4. Duties & Learning Objectives</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duties & Responsibilities (one per line)</label>
                      <textarea value={documentData.duties_and_responsibilities || ''}
                        onChange={(e) => setDocumentData({ ...documentData, duties_and_responsibilities: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm" rows={6}
                        placeholder={`Assist the team with project-related tasks\nParticipate in team meetings and standups\nDocument work progress and submit weekly reports\nAny other duties assigned by the supervisor`} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Learning Objectives (one per line)</label>
                      <textarea value={documentData.learning_objectives || ''}
                        onChange={(e) => setDocumentData({ ...documentData, learning_objectives: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm" rows={4}
                        placeholder={`Gain hands-on experience in software development lifecycle\nLearn industry best practices and tools\nDevelop professional communication skills`} />
                    </div>
                  </div>

                  {/* Compensation */}
                  <div className="bg-orange-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-orange-700">5. Compensation</h4>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="isPaidIntern" checked={!!documentData.is_paid}
                        onChange={(e) => setDocumentData({ ...documentData, is_paid: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded" />
                      <label htmlFor="isPaidIntern" className="text-sm font-medium text-gray-700">This is a paid internship</label>
                    </div>
                    {documentData.is_paid && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Stipend (₹)</label>
                          <input type="number" min={0} value={documentData.stipend_amount || 0}
                            onChange={(e) => setDocumentData({ ...documentData, stipend_amount: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                          <input type="text" value={documentData.stipend_currency || 'INR'}
                            onChange={(e) => setDocumentData({ ...documentData, stipend_currency: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reimbursement Details</label>
                      <input type="text" value={documentData.reimbursement_details || ''}
                        onChange={(e) => setDocumentData({ ...documentData, reimbursement_details: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g. Travel & meal reimbursement up to ₹2,000/month" />
                    </div>
                  </div>

                  {/* Legal & Compliance */}
                  <div className="bg-red-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-red-700">6. Legal & Compliance Clauses (Matching Offer Letter)</h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" id="confClause" checked={documentData.confidentiality_clause !== false}
                          onChange={(e) => setDocumentData({ ...documentData, confidentiality_clause: e.target.checked })}
                          className="w-4 h-4 text-red-600 rounded" />
                        <label htmlFor="confClause" className="text-sm font-medium text-gray-700">Include Confidentiality / NDA clause</label>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="ipClause" checked={documentData.ip_assignment_clause !== false}
                            onChange={(e) => setDocumentData({ ...documentData, ip_assignment_clause: e.target.checked })}
                            className="w-4 h-4 text-red-600 rounded" />
                          <label htmlFor="ipClause" className="text-sm font-medium text-gray-700">Include Intellectual Property Assignment clause</label>
                        </div>
                        <textarea
                          value={documentData.ip_clause_text || ''}
                          onChange={(e) => setDocumentData({ ...documentData, ip_clause_text: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-mono"
                          rows={3}
                          placeholder="All source code, designs, algorithms, intellectual property, and work products..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Asset Care & Return Clause</label>
                        <textarea
                          value={documentData.asset_clause_text || ''}
                          onChange={(e) => setDocumentData({ ...documentData, asset_clause_text: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-mono"
                          rows={3}
                          placeholder="The intern is responsible for proper care of all company-issued equipment and software access..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Governing Law Jurisdiction</label>
                        <input
                          type="text"
                          value={documentData.jurisdiction || ''}
                          onChange={(e) => setDocumentData({ ...documentData, jurisdiction: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="e.g. Republic of India (High Court Jurisdiction)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Signatory */}
                  <div className="bg-purple-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-purple-700">7. Signatory Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Signatory Name</label>
                        <input type="text" value={documentData.signatory_name || hrSettings?.signatory_name || ''}
                          onChange={(e) => setDocumentData({ ...documentData, signatory_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Authorized signatory" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                        <input type="text" value={documentData.signatory_designation || hrSettings?.signatory_designation || ''}
                          onChange={(e) => setDocumentData({ ...documentData, signatory_designation: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g. HR Manager" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                        <input type="text" value={documentData.signatory_contact || ''}
                          onChange={(e) => setDocumentData({ ...documentData, signatory_contact: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Phone / Email" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ITWala Academy – Internship Experience Certificate ──────────────── */}
              {selectedEmployee && documentType === 'intern_experience_certificate' && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-teal-100 text-teal-800 text-xs font-semibold px-2.5 py-1 rounded-full">ITWala Academy Internship Program</span>
                    <h3 className="font-medium text-lg">Internship Experience Certificate</h3>
                  </div>

                  {/* Validation Banner */}
                  {(() => {
                    const v = validateInternExperienceCertificate(documentData);
                    if (!v.isValid)
                      return (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 space-y-1">
                          <p className="font-semibold">Please fix the following before generating:</p>
                          <ul className="list-disc ml-4">{v.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                        </div>
                      );
                    if (v.warnings.length > 0)
                      return (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700 space-y-1">
                          <p className="font-semibold">Recommendations:</p>
                          <ul className="list-disc ml-4">{v.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                        </div>
                      );
                    return <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 font-medium">✓ All required fields are complete.</div>;
                  })()}

                  <div className="flex justify-end">
                    <button type="button"
                      onClick={() => setDocumentData(getDefaultInternExperienceCertData(selectedEmployee))}
                      className="text-xs text-teal-600 underline hover:text-teal-800">
                      Auto-fill defaults
                    </button>
                  </div>

                  {/* Intern & Program Info */}
                  <div className="bg-teal-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-teal-700">1. Intern & Program Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Intern Name *</label>
                        <input type="text" value={documentData.employee_name || selectedEmployee.full_name}
                          readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role / Designation *</label>
                        <input type="text" value={documentData.designation || selectedEmployee.designation}
                          onChange={(e) => setDocumentData({ ...documentData, designation: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g. Frontend Development Intern" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <input type="text" value={documentData.department || selectedEmployee.department || ''}
                          onChange={(e) => setDocumentData({ ...documentData, department: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Program Name *</label>
                        <input type="text" value={documentData.program_name || PROGRAM_NAME_DEFAULT}
                          onChange={(e) => setDocumentData({ ...documentData, program_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Program Batch</label>
                        <input type="text" value={documentData.program_batch || ''}
                          onChange={(e) => setDocumentData({ ...documentData, program_batch: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g. Batch 2026-A" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Internship Type</label>
                        <input type="text" value={documentData.internship_type || ''}
                          onChange={(e) => setDocumentData({ ...documentData, internship_type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g. Software Development Internship" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                        <input type="date" value={documentData.date_of_joining || selectedEmployee.date_of_joining}
                          onChange={(e) => setDocumentData({ ...documentData, date_of_joining: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Working Date *</label>
                        <input type="date" value={documentData.last_working_date || selectedEmployee.date_of_leaving || ''}
                          onChange={(e) => setDocumentData({ ...documentData, last_working_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Issued Date</label>
                        <input type="date" value={documentData.issued_date || new Date().toISOString().split('T')[0]}
                          onChange={(e) => setDocumentData({ ...documentData, issued_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                      </div>
                    </div>
                  </div>

                  {/* Supervisor */}
                  <div className="bg-cyan-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-cyan-700">2. Supervisor</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor Name</label>
                        <input type="text" value={documentData.supervisor_name || ''}
                          onChange={(e) => setDocumentData({ ...documentData, supervisor_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Supervisor full name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor Title</label>
                        <input type="text" value={documentData.supervisor_title || ''}
                          onChange={(e) => setDocumentData({ ...documentData, supervisor_title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g. Senior Engineer" />
                      </div>
                    </div>
                  </div>

                  {/* Achievements & Skills */}
                  <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-blue-700">3. Projects, Achievements & Skills</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Projects Worked On (one per line)</label>
                      <textarea value={documentData.projects_worked_on || ''}
                        onChange={(e) => setDocumentData({ ...documentData, projects_worked_on: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm" rows={4}
                        placeholder={`Developed a customer-facing dashboard using React\nIntegrated REST APIs for data fetching`} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Key Achievements</label>
                      <textarea value={documentData.key_achievements || ''}
                        onChange={(e) => setDocumentData({ ...documentData, key_achievements: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={3}
                        placeholder="Describe notable achievements during the internship." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Skills Acquired</label>
                      <textarea value={documentData.skills_acquired || ''}
                        onChange={(e) => setDocumentData({ ...documentData, skills_acquired: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={2}
                        placeholder="e.g. React, TypeScript, REST API integration, Agile methodology" />
                    </div>
                  </div>

                  {/* Performance & Rating */}
                  <div className="bg-green-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-green-700">4. Performance & Conduct</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Performance Note</label>
                        <textarea value={documentData.performance_note || ''}
                          onChange={(e) => setDocumentData({ ...documentData, performance_note: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={3}
                          placeholder="e.g. Demonstrated strong technical acumen and proactive approach throughout the internship." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Conduct Note</label>
                        <textarea value={documentData.conduct_note || ''}
                          onChange={(e) => setDocumentData({ ...documentData, conduct_note: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={3}
                          placeholder="e.g. Maintained exemplary professional conduct and collaborated effectively with the team." />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Overall Rating</label>
                      <select value={documentData.overall_rating || ''}
                        onChange={(e) => setDocumentData({ ...documentData, overall_rating: e.target.value || undefined })}
                        className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md">
                        <option value="">— Not specified —</option>
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="satisfactory">Satisfactory</option>
                      </select>
                    </div>
                  </div>

                  {/* Compensation reference */}
                  <div className="bg-orange-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-orange-700">5. Compensation Reference</h4>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="wasPaid" checked={!!documentData.was_paid}
                        onChange={(e) => setDocumentData({ ...documentData, was_paid: e.target.checked })}
                        className="w-4 h-4 rounded" />
                      <label htmlFor="wasPaid" className="text-sm text-gray-700">Intern received a stipend</label>
                    </div>
                    {documentData.was_paid && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stipend Details</label>
                        <input type="text" value={documentData.stipend_details || ''}
                          onChange={(e) => setDocumentData({ ...documentData, stipend_details: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g. Monthly stipend of ₹5,000" />
                      </div>
                    )}
                  </div>

                  {/* Signatory */}
                  <div className="bg-purple-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-purple-700">6. Signatory Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Signatory Name</label>
                        <input type="text" value={documentData.signatory_name || hrSettings?.signatory_name || ''}
                          onChange={(e) => setDocumentData({ ...documentData, signatory_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Authorized signatory" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                        <input type="text" value={documentData.signatory_designation || hrSettings?.signatory_designation || ''}
                          onChange={(e) => setDocumentData({ ...documentData, signatory_designation: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g. HR Manager" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                        <input type="text" value={documentData.contact_details || ''}
                          onChange={(e) => setDocumentData({ ...documentData, contact_details: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Phone / Email" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedEmployee && documentType === 'relieving_letter' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium text-lg">Relieving Letter Details</h3>

                  {/* Employee Information (Auto-filled) */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-gray-700">Employee Information (Auto-filled)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Employee Name</label>
                        <input
                          type="text"
                          value={documentData.employee_name || selectedEmployee.full_name}
                          onChange={(e) => setDocumentData({ ...documentData, employee_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Employee Number</label>
                        <input
                          type="text"
                          value={documentData.employee_number || selectedEmployee.employee_number}
                          onChange={(e) => setDocumentData({ ...documentData, employee_number: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                        <input
                          type="text"
                          value={documentData.designation || selectedEmployee.designation}
                          onChange={(e) => setDocumentData({ ...documentData, designation: e.target.value })}
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date of Joining</label>
                        <input
                          type="date"
                          value={documentData.date_of_joining || selectedEmployee.date_of_joining}
                          onChange={(e) => setDocumentData({ ...documentData, date_of_joining: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Working Date *</label>
                        <input
                          type="date"
                          value={documentData.last_working_date || selectedEmployee.date_of_leaving || ''}
                          onChange={(e) => setDocumentData({ ...documentData, last_working_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Relieving Details */}
                  <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-blue-700">Relieving Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Relieving Date *</label>
                        <input
                          type="date"
                          value={documentData.relieving_date || ''}
                          onChange={(e) => setDocumentData({ ...documentData, relieving_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Resignation Date</label>
                        <input
                          type="date"
                          value={documentData.resignation_date || ''}
                          onChange={(e) => setDocumentData({ ...documentData, resignation_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notice Period Served</label>
                        <input
                          type="text"
                          value={documentData.notice_period_served || ''}
                          onChange={(e) => setDocumentData({ ...documentData, notice_period_served: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., 30 days, 1 month"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Issued Date</label>
                        <input
                          type="date"
                          value={documentData.issued_date || new Date().toISOString().split('T')[0]}
                          onChange={(e) => setDocumentData({ ...documentData, issued_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notice Text</label>
                      <textarea
                        value={documentData.notice_text || ''}
                        onChange={(e) => setDocumentData({ ...documentData, notice_text: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={3}
                        placeholder="Additional notice or remarks to include in the letter"
                      />
                    </div>
                  </div>

                  {/* Clearance Checklist */}
                  <div className="bg-green-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-green-700">Clearance Checklist</h4>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="handover_completion"
                          checked={documentData.handover_completion || false}
                          onChange={(e) => setDocumentData({ ...documentData, handover_completion: e.target.checked })}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <label htmlFor="handover_completion" className="ml-2 text-sm text-gray-700">
                          Handover of responsibilities completed
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="assets_returned"
                          checked={documentData.assets_returned || false}
                          onChange={(e) => setDocumentData({ ...documentData, assets_returned: e.target.checked })}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <label htmlFor="assets_returned" className="ml-2 text-sm text-gray-700">
                          All company assets returned
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="dues_cleared"
                          checked={documentData.dues_cleared || false}
                          onChange={(e) => setDocumentData({ ...documentData, dues_cleared: e.target.checked })}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <label htmlFor="dues_cleared" className="ml-2 text-sm text-gray-700">
                          All dues cleared (no pending payments)
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Signatory Details */}
                  <div className="bg-purple-50 p-4 rounded-lg space-y-4">
                    <h4 className="font-medium text-purple-700">Signatory Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Signatory Name</label>
                        <input
                          type="text"
                          value={documentData.signatory_name || hrSettings?.signatory_name || ''}
                          onChange={(e) => setDocumentData({ ...documentData, signatory_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Authorized Signatory Name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Signatory Designation</label>
                        <input
                          type="text"
                          value={documentData.signatory_designation || hrSettings?.signatory_designation || ''}
                          onChange={(e) => setDocumentData({ ...documentData, signatory_designation: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Designation"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact Details</label>
                        <input
                          type="text"
                          value={documentData.contact_details || ''}
                          onChange={(e) => setDocumentData({ ...documentData, contact_details: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Phone or Email"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setActiveTab(previousTab)}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md hover:from-red-600 hover:to-red-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePreviewDocument}
                  className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
                  disabled={!selectedEmployee}
                >
                  <Eye className="w-4 h-4 inline mr-2" />
                  Preview
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

      {/* Employee Document Verification Modal */}
      {showVerifyDocModal && verifyingDocument && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold">Verify Employee Document</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {verifyingDocument.title}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Employee: {selectedEmployee.full_name} ({selectedEmployee.employee_number})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowVerifyDocModal(false);
                  setVerifyingDocument(null);
                  setVerificationComments('');
                  setSelectedEmployee(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {/* Document Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700 mb-3">Document Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Document Type:</span>
                      <span className="ml-2 font-medium">{verifyingDocument.document_type?.replace(/_/g, ' ').toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Document Number:</span>
                      <span className="ml-2 font-medium">{verifyingDocument.document_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Upload Date:</span>
                      <span className="ml-2 font-medium">
                        {verifyingDocument.created_at ? new Date(verifyingDocument.created_at).toLocaleDateString('en-GB') : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">File Name:</span>
                      <span className="ml-2 font-medium">{verifyingDocument.file_reference || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Verification Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Status *
                  </label>
                  <select
                    value={verificationStatus}
                    onChange={(e) => setVerificationStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pending">Pending Verification</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                {/* Verification Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {verificationStatus === 'rejected' ? 'Rejection Reason *' : 'Verification Comments'}
                  </label>
                  <textarea
                    rows={4}
                    value={verificationComments}
                    onChange={(e) => setVerificationComments(e.target.value)}
                    placeholder={
                      verificationStatus === 'rejected' 
                        ? "Please explain why this document is being rejected. This will be visible to the employee."
                        : "Add any notes about this document verification..."
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      verificationStatus === 'rejected' ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    required={verificationStatus === 'rejected'}
                  />
                  {verificationStatus === 'rejected' && (
                    <p className="mt-1 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      Rejection reason is required and will be visible to the employee
                    </p>
                  )}
                </div>

                {/* Current Status Display */}
                {verifyingDocument.verification_date && (
                  <div className="bg-blue-50 p-3 rounded-lg text-sm">
                    <p className="text-gray-700">
                      <span className="font-medium">Last Verified:</span>{' '}
                      {new Date(verifyingDocument.verification_date).toLocaleDateString('en-GB')}
                    </p>
                    {verifyingDocument.verification_comments && (
                      <p className="text-gray-600 mt-1">
                        <span className="font-medium">Previous Comments:</span> {verifyingDocument.verification_comments}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowVerifyDocModal(false);
                  setVerifyingDocument(null);
                  setVerificationComments('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVerification}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Document Modal */}
      {showEditModal && editingDocument && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold">Edit Document</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {editingDocument.document_type.replace('_', ' ').toUpperCase()} - {editingDocument.document_number}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Employee: {selectedEmployee.first_name} {selectedEmployee.last_name} ({selectedEmployee.employee_number})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingDocument(null);
                  setEditedDocumentData({});
                  setSelectedEmployee(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Offer Letter Fields - Complete */}
              {editingDocument.document_type === 'offer_letter' && (
                <div className="space-y-4">
                  {/* Basic Information */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-gray-700">Basic Information</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Offer Date</label>
                        <input
                          type="date"
                          value={(editedDocumentData as OfferLetterData).offer_date || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, offer_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
                        <input
                          type="date"
                          value={(editedDocumentData as OfferLetterData).joining_date || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, joining_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Candidate Address</label>
                      <textarea
                        rows={2}
                        value={(editedDocumentData as OfferLetterData).candidate_address || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, candidate_address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>

                  {/* Position Details */}
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-blue-700">Position Details</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                        <input
                          type="text"
                          value={(editedDocumentData as OfferLetterData).position || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, position: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <input
                          type="text"
                          value={(editedDocumentData as OfferLetterData).department || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, department: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reporting To</label>
                        <input
                          type="text"
                          value={(editedDocumentData as OfferLetterData).reporting_to || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, reporting_to: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Work Location</label>
                        <input
                          type="text"
                          value={(editedDocumentData as OfferLetterData).work_location || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, work_location: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                        <select
                          value={(editedDocumentData as OfferLetterData).employment_type || 'full-time'}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, employment_type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="full-time">Full-time</option>
                          <option value="part-time">Part-time</option>
                          <option value="contract">Contract</option>
                          <option value="intern">Intern</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Roles */}
                  <div className="bg-green-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-green-700">Roles & Responsibilities</h4>
                    <textarea
                      rows={6}
                      value={(editedDocumentData as OfferLetterData).roles_responsibilities || ''}
                      onChange={(e) => setEditedDocumentData({ ...editedDocumentData, roles_responsibilities: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                    />
                  </div>

                  {/* Compensation */}
                  <div className="bg-yellow-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-yellow-700">Compensation</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Annual CTC</label>
                        <input
                          type="number"
                          value={(editedDocumentData as OfferLetterData).annual_ctc || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, annual_ctc: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gross Salary (Monthly)</label>
                        <input
                          type="number"
                          value={(editedDocumentData as OfferLetterData).salary_breakdown?.gross_salary || ''}
                          onChange={(e) => setEditedDocumentData({
                            ...editedDocumentData,
                            salary_breakdown: {
                              ...(editedDocumentData as OfferLetterData).salary_breakdown,
                              gross_salary: parseFloat(e.target.value)
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Basic</label>
                        <input
                          type="number"
                          value={(editedDocumentData as OfferLetterData).salary_breakdown?.basic || ''}
                          onChange={(e) => setEditedDocumentData({
                            ...editedDocumentData,
                            salary_breakdown: {
                              ...(editedDocumentData as OfferLetterData).salary_breakdown,
                              basic: parseFloat(e.target.value)
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">HRA</label>
                        <input
                          type="number"
                          value={(editedDocumentData as OfferLetterData).salary_breakdown?.hra || ''}
                          onChange={(e) => setEditedDocumentData({
                            ...editedDocumentData,
                            salary_breakdown: {
                              ...(editedDocumentData as OfferLetterData).salary_breakdown,
                              hra: parseFloat(e.target.value)
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Special Allowance</label>
                        <input
                          type="number"
                          value={(editedDocumentData as OfferLetterData).salary_breakdown?.special_allowance || ''}
                          onChange={(e) => setEditedDocumentData({
                            ...editedDocumentData,
                            salary_breakdown: {
                              ...(editedDocumentData as OfferLetterData).salary_breakdown,
                              special_allowance: parseFloat(e.target.value)
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Other Allowances</label>
                        <input
                          type="number"
                          value={(editedDocumentData as OfferLetterData).salary_breakdown?.other_allowances || ''}
                          onChange={(e) => setEditedDocumentData({
                            ...editedDocumentData,
                            salary_breakdown: {
                              ...(editedDocumentData as OfferLetterData).salary_breakdown,
                              other_allowances: parseFloat(e.target.value)
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Salary Payment Note</label>
                      <textarea
                        rows={2}
                        value={(editedDocumentData as OfferLetterData).salary_payment_note || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, salary_payment_note: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Benefits Note</label>
                      <textarea
                        rows={2}
                        value={(editedDocumentData as OfferLetterData).benefits_note || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, benefits_note: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>

                  {/* Working Hours */}
                  <div className="bg-purple-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-purple-700">Working Hours</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                        <input
                          type="text"
                          value={(editedDocumentData as OfferLetterData).working_hours_start || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, working_hours_start: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                        <input
                          type="text"
                          value={(editedDocumentData as OfferLetterData).working_hours_end || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, working_hours_end: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Working Days</label>
                        <input
                          type="text"
                          value={(editedDocumentData as OfferLetterData).working_days || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, working_days: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Additional Hours Note</label>
                      <input
                        type="text"
                        value={(editedDocumentData as OfferLetterData).additional_hours_note || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, additional_hours_note: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>

                  {/* Probation & Notice */}
                  <div className="bg-orange-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-orange-700">Probation & Notice Period</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Probation Period (months)</label>
                        <input
                          type="number"
                          value={(editedDocumentData as OfferLetterData).probation_period || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, probation_period: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period (days)</label>
                        <input
                          type="number"
                          value={(editedDocumentData as OfferLetterData).notice_period || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, notice_period: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Probation Note</label>
                      <textarea
                        rows={2}
                        value={(editedDocumentData as OfferLetterData).probation_note || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, probation_note: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Termination Note</label>
                      <textarea
                        rows={2}
                        value={(editedDocumentData as OfferLetterData).termination_note || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, termination_note: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>

                  {/* Leave & Confidentiality */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-gray-700">Leave & Confidentiality</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Leave Policy Note</label>
                      <textarea
                        rows={2}
                        value={(editedDocumentData as OfferLetterData).leave_policy_note || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, leave_policy_note: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confidentiality Note</label>
                      <textarea
                        rows={2}
                        value={(editedDocumentData as OfferLetterData).confidentiality_note || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, confidentiality_note: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>

                  {/* Signatory */}
                  <div className="bg-indigo-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-indigo-700">Signatory Details</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Signatory Name</label>
                        <input
                          type="text"
                          value={(editedDocumentData as OfferLetterData).signatory_name || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, signatory_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                        <input
                          type="text"
                          value={(editedDocumentData as OfferLetterData).signatory_designation || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, signatory_designation: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                        <input
                          type="text"
                          value={(editedDocumentData as OfferLetterData).signatory_contact || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, signatory_contact: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="acceptance_section"
                        checked={(editedDocumentData as OfferLetterData).acceptance_section !== false}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, acceptance_section: e.target.checked })}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <label htmlFor="acceptance_section" className="ml-2 text-sm text-gray-700">
                        Include Candidate Acceptance Section
                      </label>
                    </div>
                  </div>

                  {/* Additional */}
                  <div className="bg-red-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-red-700">Additional Information</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                      <textarea
                        rows={3}
                        value={(editedDocumentData as OfferLetterData).terms_and_conditions || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, terms_and_conditions: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Details</label>
                      <textarea
                        rows={2}
                        value={(editedDocumentData as OfferLetterData).other_details || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, other_details: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Salary Certificate Fields */}
              {editingDocument.document_type === 'salary_certificate' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Purpose *
                      </label>
                      <input
                        type="text"
                        value={(editedDocumentData as SalaryCertificateData).purpose || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, purpose: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Annual Gross *
                      </label>
                      <input
                        type="number"
                        value={(editedDocumentData as SalaryCertificateData).annual_gross || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, annual_gross: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Period From *
                      </label>
                      <input
                        type="date"
                        value={(editedDocumentData as SalaryCertificateData).period_from || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, period_from: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Period To *
                      </label>
                      <input
                        type="date"
                        value={(editedDocumentData as SalaryCertificateData).period_to || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, period_to: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Monthly Salary Breakdown</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Basic</label>
                        <input
                          type="number"
                          value={(editedDocumentData as SalaryCertificateData).salary_breakdown?.basic || ''}
                          onChange={(e) => setEditedDocumentData({
                            ...editedDocumentData,
                            salary_breakdown: {
                              ...(editedDocumentData as SalaryCertificateData).salary_breakdown,
                              basic: parseFloat(e.target.value)
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">HRA</label>
                        <input
                          type="number"
                          value={(editedDocumentData as SalaryCertificateData).salary_breakdown?.hra || ''}
                          onChange={(e) => setEditedDocumentData({
                            ...editedDocumentData,
                            salary_breakdown: {
                              ...(editedDocumentData as SalaryCertificateData).salary_breakdown,
                              hra: parseFloat(e.target.value)
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {editingDocument.document_type === 'experience_certificate' && (
                <div className="space-y-4">
                  {/* Basic Information */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-gray-700">Basic Information</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                        <input
                          type="text"
                          value={(editedDocumentData as ExperienceCertificateData).designation || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, designation: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <input
                          type="text"
                          value={(editedDocumentData as ExperienceCertificateData).department || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, department: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Working Date</label>
                        <input
                          type="date"
                          value={(editedDocumentData as ExperienceCertificateData).last_working_date || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, last_working_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Issued Date</label>
                        <input
                          type="date"
                          value={(editedDocumentData as ExperienceCertificateData).issued_date || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, issued_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Roles and Performance */}
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-blue-700">Roles & Performance</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Roles and Responsibilities</label>
                      <textarea
                        rows={3}
                        value={(editedDocumentData as ExperienceCertificateData).roles_responsibilities || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, roles_responsibilities: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Performance Note</label>
                      <textarea
                        rows={2}
                        value={(editedDocumentData as ExperienceCertificateData).performance_note || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, performance_note: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Conduct Note</label>
                      <textarea
                        rows={2}
                        value={(editedDocumentData as ExperienceCertificateData).conduct_note || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, conduct_note: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Leaving</label>
                      <input
                        type="text"
                        value={(editedDocumentData as ExperienceCertificateData).reason_for_leaving || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, reason_for_leaving: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>

                  {/* Signatory Details */}
                  <div className="bg-green-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-green-700">Signatory Details</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Signatory Name</label>
                        <input
                          type="text"
                          value={(editedDocumentData as ExperienceCertificateData).signatory_name || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, signatory_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                        <input
                          type="text"
                          value={(editedDocumentData as ExperienceCertificateData).signatory_designation || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, signatory_designation: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Details</label>
                        <input
                          type="text"
                          value={(editedDocumentData as ExperienceCertificateData).contact_details || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, contact_details: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Edit: Intern Offer Letter ─────────────────────────────────── */}
              {editingDocument.document_type === 'intern_offer_letter' && (
                <div className="space-y-4">
                  <div className="bg-indigo-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-indigo-700">Program & Core Details</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Program Name</label>
                        <input type="text" value={(editedDocumentData as InternOfferLetterData).program_name || PROGRAM_NAME_DEFAULT}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, program_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Program Batch</label>
                        <input type="text" value={(editedDocumentData as InternOfferLetterData).program_batch || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, program_batch: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                        <input type="text" value={(editedDocumentData as InternOfferLetterData).position || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, position: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <input type="text" value={(editedDocumentData as InternOfferLetterData).department || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, department: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input type="date" value={(editedDocumentData as InternOfferLetterData).joining_date || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, joining_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input type="date" value={(editedDocumentData as InternOfferLetterData).end_date || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, end_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Internship Scope</label>
                      <textarea rows={3} value={(editedDocumentData as InternOfferLetterData).internship_scope || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, internship_scope: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duties & Responsibilities</label>
                      <textarea rows={4} value={(editedDocumentData as InternOfferLetterData).duties_and_responsibilities || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, duties_and_responsibilities: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono" />
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={!!(editedDocumentData as InternOfferLetterData).is_paid}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, is_paid: e.target.checked })}
                        className="w-4 h-4 rounded" />
                      <label className="text-sm text-gray-700">Paid internship</label>
                    </div>
                    {(editedDocumentData as InternOfferLetterData).is_paid && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Stipend Amount (₹)</label>
                          <input type="number" value={(editedDocumentData as InternOfferLetterData).stipend_amount || 0}
                            onChange={(e) => setEditedDocumentData({ ...editedDocumentData, stipend_amount: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                          <input type="text" value={(editedDocumentData as InternOfferLetterData).stipend_currency || 'INR'}
                            onChange={(e) => setEditedDocumentData({ ...editedDocumentData, stipend_currency: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-purple-700">Signatory Details</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Signatory Name</label>
                        <input type="text" value={(editedDocumentData as InternOfferLetterData).signatory_name || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, signatory_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                        <input type="text" value={(editedDocumentData as InternOfferLetterData).signatory_designation || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, signatory_designation: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                        <input type="text" value={(editedDocumentData as InternOfferLetterData).signatory_contact || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, signatory_contact: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Edit: Intern Experience Certificate ───────────────────────── */}
              {editingDocument.document_type === 'intern_experience_certificate' && (
                <div className="space-y-4">
                  <div className="bg-teal-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-teal-700">Intern & Program Info</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Program Name</label>
                        <input type="text" value={(editedDocumentData as InternExperienceCertificateData).program_name || PROGRAM_NAME_DEFAULT}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, program_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Internship Type</label>
                        <input type="text" value={(editedDocumentData as InternExperienceCertificateData).internship_type || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, internship_type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                        <input type="text" value={(editedDocumentData as InternExperienceCertificateData).designation || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, designation: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <input type="text" value={(editedDocumentData as InternExperienceCertificateData).department || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, department: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input type="date" value={(editedDocumentData as InternExperienceCertificateData).date_of_joining || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, date_of_joining: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Working Date</label>
                        <input type="date" value={(editedDocumentData as InternExperienceCertificateData).last_working_date || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, last_working_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-blue-700">Projects, Achievements & Performance</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Projects Worked On</label>
                      <textarea rows={3} value={(editedDocumentData as InternExperienceCertificateData).projects_worked_on || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, projects_worked_on: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Key Achievements</label>
                      <textarea rows={2} value={(editedDocumentData as InternExperienceCertificateData).key_achievements || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, key_achievements: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Skills Acquired</label>
                      <textarea rows={2} value={(editedDocumentData as InternExperienceCertificateData).skills_acquired || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, skills_acquired: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Performance Note</label>
                      <textarea rows={2} value={(editedDocumentData as InternExperienceCertificateData).performance_note || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, performance_note: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Conduct Note</label>
                      <textarea rows={2} value={(editedDocumentData as InternExperienceCertificateData).conduct_note || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, conduct_note: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Overall Rating</label>
                      <select value={(editedDocumentData as InternExperienceCertificateData).overall_rating || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, overall_rating: (e.target.value as any) || undefined })}
                        className="w-40 px-3 py-2 border border-gray-300 rounded-md text-sm">
                        <option value="">— None —</option>
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="satisfactory">Satisfactory</option>
                      </select>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-purple-700">Signatory Details</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Signatory Name</label>
                        <input type="text" value={(editedDocumentData as InternExperienceCertificateData).signatory_name || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, signatory_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                        <input type="text" value={(editedDocumentData as InternExperienceCertificateData).signatory_designation || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, signatory_designation: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Details</label>
                        <input type="text" value={(editedDocumentData as InternExperienceCertificateData).contact_details || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, contact_details: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {editingDocument.document_type === 'relieving_letter' && (
                <div className="space-y-4">
                  {/* Basic Information */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-gray-700">Basic Information</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                        <input
                          type="text"
                          value={(editedDocumentData as RelievingLetterData).designation || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, designation: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <input
                          type="text"
                          value={(editedDocumentData as RelievingLetterData).department || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, department: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Working Date</label>
                        <input
                          type="date"
                          value={(editedDocumentData as RelievingLetterData).last_working_date || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, last_working_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Relieving Date *</label>
                        <input
                          type="date"
                          value={(editedDocumentData as RelievingLetterData).relieving_date || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, relieving_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Relieving Details */}
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-blue-700">Relieving Information</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Resignation Date</label>
                        <input
                          type="date"
                          value={(editedDocumentData as RelievingLetterData).resignation_date || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, resignation_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period Served</label>
                        <input
                          type="text"
                          value={(editedDocumentData as RelievingLetterData).notice_period_served || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, notice_period_served: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="e.g., 30 days"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Issued Date</label>
                        <input
                          type="date"
                          value={(editedDocumentData as RelievingLetterData).issued_date || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, issued_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notice Text</label>
                      <textarea
                        rows={2}
                        value={(editedDocumentData as RelievingLetterData).notice_text || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, notice_text: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>

                  {/* Clearance Checklist */}
                  <div className="bg-green-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-green-700">Clearance Checklist</h4>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="edit_handover_completion"
                          checked={(editedDocumentData as RelievingLetterData).handover_completion || false}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, handover_completion: e.target.checked })}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <label htmlFor="edit_handover_completion" className="ml-2 text-sm text-gray-700">
                          Handover of responsibilities completed
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="edit_assets_returned"
                          checked={(editedDocumentData as RelievingLetterData).assets_returned || false}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, assets_returned: e.target.checked })}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <label htmlFor="edit_assets_returned" className="ml-2 text-sm text-gray-700">
                          All company assets returned
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="edit_dues_cleared"
                          checked={(editedDocumentData as RelievingLetterData).dues_cleared || false}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, dues_cleared: e.target.checked })}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <label htmlFor="edit_dues_cleared" className="ml-2 text-sm text-gray-700">
                          All dues cleared
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Signatory Details */}
                  <div className="bg-purple-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-purple-700">Signatory Details</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Signatory Name</label>
                        <input
                          type="text"
                          value={(editedDocumentData as RelievingLetterData).signatory_name || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, signatory_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                        <input
                          type="text"
                          value={(editedDocumentData as RelievingLetterData).signatory_designation || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, signatory_designation: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Details</label>
                        <input
                          type="text"
                          value={(editedDocumentData as RelievingLetterData).contact_details || ''}
                          onChange={(e) => setEditedDocumentData({ ...editedDocumentData, contact_details: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form 16 Fields */}
              {editingDocument.document_type === 'form_16' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Financial Year *
                      </label>
                      <input
                        type="text"
                        value={(editedDocumentData as Form16Data).financial_year || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, financial_year: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 2024-25"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Employee PAN *
                      </label>
                      <input
                        type="text"
                        value={(editedDocumentData as Form16Data).employee?.pan || ''}
                        onChange={(e) => setEditedDocumentData({
                          ...editedDocumentData,
                          employee: {
                            ...(editedDocumentData as Form16Data).employee,
                            pan: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employee Address
                    </label>
                    <textarea
                      rows={2}
                      value={(editedDocumentData as Form16Data).employee?.address || ''}
                      onChange={(e) => setEditedDocumentData({
                        ...editedDocumentData,
                        employee: {
                          ...(editedDocumentData as Form16Data).employee,
                          address: e.target.value
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Form 24Q Fields */}
              {editingDocument.document_type === 'form_24q' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Financial Year *
                      </label>
                      <input
                        type="text"
                        value={(editedDocumentData as Form24QData).financial_year || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, financial_year: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 2024-25"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quarter *
                      </label>
                      <select
                        value={(editedDocumentData as Form24QData).quarter || ''}
                        onChange={(e) => setEditedDocumentData({ ...editedDocumentData, quarter: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Quarter</option>
                        <option value="1">Q1 (Apr-Jun)</option>
                        <option value="2">Q2 (Jul-Sep)</option>
                        <option value="3">Q3 (Oct-Dec)</option>
                        <option value="4">Q4 (Jan-Mar)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={handlePreviewEditedDocument}
                disabled={isSavingDocument}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingDocument(null);
                    setEditedDocumentData({});
                    setSelectedEmployee(null);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md hover:from-red-600 hover:to-red-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditedDocument}
                  disabled={isSavingDocument}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSavingDocument ? (
                    <>
                      <span className="mr-2">Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save & Regenerate PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Salary Slip Modal */}
      {showEditSalarySlipModal && editingSalarySlip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold">Edit Salary Slip</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {employees.find(e => e.id === editingSalarySlip.employee_id)?.full_name} - {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][editingSalarySlip.salary_month - 1]} {editingSalarySlip.salary_year}
                </p>
                {(() => {
                  const emp = employees.find(e => e.id === editingSalarySlip.employee_id);
                  if (!emp) return null;
                  return (
                    <p className="text-xs text-blue-600 mt-1">
                      Employee profile: Basic ₹{(emp.basic_salary || 0).toLocaleString('en-IN')} | HRA ₹{(emp.hra || 0).toLocaleString('en-IN')} | Gross ₹{(emp.gross_salary || 0).toLocaleString('en-IN')}
                    </p>
                  );
                })()}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRecalculateSalarySlip}
                  className="px-3 py-1.5 text-xs bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-md hover:bg-yellow-200 font-medium"
                  title="Recalculate all values from employee's current salary profile"
                >
                  ↻ Recalculate from Profile
                </button>
                <button
                  onClick={() => {
                    setShowEditSalarySlipModal(false);
                    setEditingSalarySlip(null);
                    setEditedSalarySlipData({});
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-6">
                {/* Earnings */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-green-700 mb-4">Earnings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Basic Salary</label>
                      <input
                        type="number"
                        value={editedSalarySlipData.basic_salary || ''}
                        onChange={(e) => updateEditedSalaryField('basic_salary', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">HRA</label>
                      <input
                        type="number"
                        value={editedSalarySlipData.hra || ''}
                        onChange={(e) => updateEditedSalaryField('hra', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Special Allowance</label>
                      <input
                        type="number"
                        value={editedSalarySlipData.special_allowance || ''}
                        onChange={(e) => updateEditedSalaryField('special_allowance', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Transport Allowance</label>
                      <input
                        type="number"
                        value={editedSalarySlipData.transport_allowance || ''}
                        onChange={(e) => updateEditedSalaryField('transport_allowance', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Medical Allowance</label>
                      <input
                        type="number"
                        value={editedSalarySlipData.medical_allowance || ''}
                        onChange={(e) => updateEditedSalaryField('medical_allowance', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Other Allowances</label>
                      <input
                        type="number"
                        value={editedSalarySlipData.other_allowances || ''}
                        onChange={(e) => updateEditedSalaryField('other_allowances', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bonus</label>
                      <input
                        type="number"
                        value={editedSalarySlipData.bonus || ''}
                        onChange={(e) => updateEditedSalaryField('bonus', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Overtime</label>
                      <input
                        type="number"
                        value={editedSalarySlipData.overtime || ''}
                        onChange={(e) => updateEditedSalaryField('overtime', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Gross Salary (Auto-calculated)</label>
                      <input
                        type="number"
                        value={editedSalarySlipData.gross_salary || ''}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-100 cursor-not-allowed font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-red-700 mb-4">Deductions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Provident Fund</label>
                      <input
                        type="number"
                        value={editedSalarySlipData.provident_fund || ''}
                        onChange={(e) => updateEditedSalaryField('provident_fund', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Professional Tax</label>
                      <input
                        type="number"
                        value={editedSalarySlipData.professional_tax || ''}
                        onChange={(e) => updateEditedSalaryField('professional_tax', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ESIC</label>
                      <input
                        type="number"
                        value={editedSalarySlipData.esic || ''}
                        onChange={(e) => updateEditedSalaryField('esic', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">TDS</label>
                      <input
                        type="number"
                        value={editedSalarySlipData.tds || ''}
                        onChange={(e) => updateEditedSalaryField('tds', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Loan Repayment</label>
                      <input
                        type="number"
                        value={editedSalarySlipData.loan_repayment || ''}
                        onChange={(e) => updateEditedSalaryField('loan_repayment', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Other Deductions</label>
                      <input
                        type="number"
                        value={editedSalarySlipData.other_deductions || ''}
                        onChange={(e) => updateEditedSalaryField('other_deductions', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Total Deductions (Auto-calculated)</label>
                      <input
                        type="number"
                        value={editedSalarySlipData.total_deductions || ''}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-100 cursor-not-allowed font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Attendance & Net */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-blue-700 mb-4">Attendance & Net Salary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
                      <input
                        type="number"
                        value={editedSalarySlipData.working_days || ''}
                        onChange={(e) => setEditedSalarySlipData({ ...editedSalarySlipData, working_days: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Paid Days</label>
                      <input
                        type="number"
                        value={editedSalarySlipData.paid_days || ''}
                        onChange={(e) => setEditedSalarySlipData({ ...editedSalarySlipData, paid_days: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">LOP Days</label>
                      <input
                        type="number"
                        value={editedSalarySlipData.lop_days || ''}
                        onChange={(e) => setEditedSalarySlipData({ ...editedSalarySlipData, lop_days: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={editedSalarySlipData.status || 'draft'}
                        onChange={(e) => setEditedSalarySlipData({ ...editedSalarySlipData, status: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="draft">Draft</option>
                        <option value="approved">Approved</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-lg font-medium text-gray-700 mb-2">Net Salary (Gross - Deductions)</label>
                      <input
                        type="number"
                        value={editedSalarySlipData.net_salary || ''}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-blue-100 font-bold cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowEditSalarySlipModal(false);
                  setEditingSalarySlip(null);
                  setEditedSalarySlipData({});
                }}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md hover:from-red-600 hover:to-red-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedSalarySlip}
                disabled={isSavingSalarySlip}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSavingSalarySlip ? (
                  <>
                    <span className="mr-2">Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPreview && previewPdf && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Document Preview</h2>
              <button
                onClick={() => {
                  setShowPreview(false);
                  if (previewPdf) {
                    URL.revokeObjectURL(previewPdf);
                    setPreviewPdf(null);
                  }
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <iframe
                src={previewPdf}
                className="w-full h-full"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Temporary Password Modal */}
      {showTempPasswordModal && tempPasswordData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Employee Created</h2>
                <p className="text-xs text-gray-600">Save temporary password</p>
              </div>
            </div>

            <div className="space-y-2.5 mb-4">
              <div className="bg-gray-50 rounded p-2.5">
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Employee</label>
                <p className="text-sm font-semibold text-gray-900">{tempPasswordData.name}</p>
                <p className="text-xs font-mono text-gray-600 mt-0.5">{tempPasswordData.email}</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-400 rounded p-2.5">
                <label className="flex items-center text-xs font-medium text-yellow-800 mb-1.5">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Temporary Password
                </label>
                <div className="flex items-center justify-between bg-white rounded p-2 border border-yellow-300">
                  <code className="text-base font-bold text-gray-900 tracking-wide">{tempPasswordData.password}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(tempPasswordData.password);
                      setPasswordCopied(true);
                      setTimeout(() => setPasswordCopied(false), 2000);
                    }}
                    className="ml-2 px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded"
                  >
                    {passwordCopied ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-2.5">
                <p className="text-xs text-blue-800">
                  Share this password securely. Employee must change it on first login.
                </p>
              </div>

              <div className="bg-gray-50 rounded p-2.5">
                <label className="block text-xs font-medium text-gray-600 mb-1">Login URL</label>
                <div className="flex items-center justify-between bg-white rounded p-1.5 border border-gray-300">
                  <code className="text-xs text-gray-700">/employee/login</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin + '/employee/login');
                      showSuccess('Login URL copied');
                    }}
                    className="ml-2 px-2 py-0.5 bg-gray-500 hover:bg-gray-600 text-white text-xs rounded"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowTempPasswordModal(false);
                setTempPasswordData(null);
                showSuccess('Employee created successfully');
              }}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
            >
              Done
            </button>

            <p className="text-center text-xs text-gray-500 mt-2">
              Password shown once only
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && employeeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Employee</h3>
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete this employee? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Employee Details</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{employeeToDelete.full_name}</p>
                  <p className="text-sm text-gray-600 mt-1">{employeeToDelete.email}</p>
                  <p className="text-sm text-gray-600">{employeeToDelete.designation}</p>
                  <p className="text-xs text-gray-500 mt-1">Employee ID: {employeeToDelete.employee_number}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> Deleting this employee will remove all associated records including documents, salary slips, and attendance data.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setEmployeeToDelete(null);
                }}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-lg hover:from-red-600 hover:to-red-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEmployee}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Document Modal */}
      {showViewModal && viewingDocument && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold">View Document</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {viewingDocument.document_type.replace('_', ' ').toUpperCase()} - {viewingDocument.document_number}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Employee: {selectedEmployee.first_name} {selectedEmployee.last_name} ({selectedEmployee.employee_number})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingDocument(null);
                  setSelectedEmployee(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-3">Document Details</h3>
                <div className="space-y-3">
                  {Object.entries(viewingDocument.document_data || {}).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-3 gap-2">
                      <div className="text-sm font-medium text-gray-600">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                      </div>
                      <div className="col-span-2 text-sm text-gray-900">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingDocument(null);
                  setSelectedEmployee(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadDocument(viewingDocument)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Document Confirmation Modal */}
      {showDeleteDocumentModal && documentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Document</h3>
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete this document? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Document Details</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{documentToDelete.document_number}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {documentToDelete.document_type.replace('_', ' ').toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Date: {new Date(documentToDelete.document_date).toLocaleDateString('en-GB')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This will permanently delete the document and its associated data.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteDocumentModal(false);
                  setDocumentToDelete(null);
                }}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-lg hover:from-red-600 hover:to-red-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDocument}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Documents Modal */}
      {showEmployeeDocsModal && selectedEmployeeForDocs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold">Documents - {selectedEmployeeForDocs.full_name}</h2>
                <p className="text-sm text-gray-600 mt-1">Employee #{selectedEmployeeForDocs.employee_number}</p>
              </div>
              <button
                onClick={() => {
                  setShowEmployeeDocsModal(false);
                  setSelectedEmployeeForDocs(null);
                  setEmployeeDocuments([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {loadingEmployeeDocs ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
              ) : employeeDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No documents found for this employee</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-sm text-gray-600">
                    Total Documents: {employeeDocuments.length}
                  </div>
                  {employeeDocuments.map(doc => (
                    <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-medium">{doc.document_name || doc.document_type}</h4>
                          <p className="text-sm text-gray-600">{doc.document_type}</p>
                          {doc.verification_status && (
                            <span className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                              doc.verification_status === 'verified' ? 'bg-green-100 text-green-700' :
                              doc.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {doc.verification_status}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handlePreviewEmployeeDocument(doc)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="Preview"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDownloadEmployeeDocument(doc)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="Download"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t">
              <button
                onClick={() => {
                  setShowEmployeeDocsModal(false);
                  setSelectedEmployeeForDocs(null);
                  setEmployeeDocuments([]);
                }}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {showDocPreviewModal && previewDocUrl && previewingDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[90vh] flex flex-col">
            {/* Preview Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">
                  {previewingDoc.document_name || previewingDoc.document_type}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {previewingDoc.document_type?.replace(/_/g, ' ').toUpperCase()}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleDownloadEmployeeDocument(previewingDoc)}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </button>
                <button
                  onClick={() => {
                    setShowDocPreviewModal(false);
                    setPreviewDocUrl(null);
                    setPreviewingDoc(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto bg-gray-100">
              {previewingDoc.mime_type?.startsWith('image/') ||
               previewingDoc.file_name?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                // Image preview
                <div className="flex items-center justify-center h-full p-4">
                  <img
                    src={previewDocUrl}
                    alt={previewingDoc.document_name}
                    className="max-w-full max-h-full object-contain rounded shadow-lg"
                  />
                </div>
              ) : (
                // PDF preview
                <iframe
                  src={previewDocUrl}
                  className="w-full h-full border-0"
                  title="Document Preview"
                />
              )}
            </div>

            {/* Preview Footer */}
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                {previewingDoc.file_size && (
                  <span>Size: {(previewingDoc.file_size / 1024).toFixed(2)} KB</span>
                )}
                {previewingDoc.uploaded_at && (
                  <span className="ml-4">
                    Uploaded: {new Date(previewingDoc.uploaded_at).toLocaleDateString('en-IN')}
                  </span>
                )}
                {previewingDoc.document_date && (
                  <span className="ml-4">
                    Date: {new Date(previewingDoc.document_date).toLocaleDateString('en-IN')}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setShowDocPreviewModal(false);
                  setPreviewDocUrl(null);
                  setPreviewingDoc(null);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmploymentDocuments;
