import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  FileText,
  Download,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle,
  DollarSign,
  X,
  Save
} from 'lucide-react';
import { contractService } from '../../services/contractService';
import { invoiceService } from '../../services/invoiceService';
import { useToast } from '../ui/ToastProvider';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../ui/ConfirmDialog';
import { PDFBrandingUtils } from '../../utils/pdfBrandingUtils';
import type { CompanySettings } from '../../types/invoice';
import type { 
  Contract, 
  ContractFilters, 
  ContractStatistics,
  ContractType,
  ContractStatus,
  CreateContractData,
  CreateContractSectionData
} from '../../types/contract';

const ContractManagement: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stats, setStats] = useState<ContractStatistics | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters] = useState<ContractFilters>({});
  const [activeTab, setActiveTab] = useState<'dashboard' | 'contracts' | 'templates'>('dashboard');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<CreateContractData>({
    party_a_name: '',
    party_b_name: '',
    contract_type: 'MSA',
    contract_title: '',
    contract_date: new Date().toISOString().split('T')[0],
    effective_date: new Date().toISOString().split('T')[0],
    currency_code: 'INR',
    sections: []
  });
  
  const { showSuccess, showError, showInfo } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();
  const perPage = 10;

  // Load initial data
  useEffect(() => {
    loadData();
  }, [currentPage, searchTerm, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load company settings
      try {
        const companyData = await invoiceService.getCompanySettings();
        if (companyData && companyData.length > 0) {
          setCompanySettings(companyData[0]);
        }
      } catch (settingsError) {
        console.warn('Failed to load company settings:', settingsError);
      }

      // Load contracts
      const contractsData = await contractService.getContracts(
        { ...filters, search: searchTerm },
        currentPage,
        perPage
      );
      
      setContracts(contractsData.contracts);
      setTotalPages(Math.ceil(contractsData.total / perPage));

      // Load statistics
      const statsData = await contractService.getStatistics();
      setStats(statsData);

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load contracts');
      showError('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  // Handle contract creation
  const handleCreateContract = () => {
    // Build complete address with city, state, and postal code
    let fullAddress = '';
    if (companySettings?.address_line1) {
      fullAddress = companySettings.address_line1;
      if (companySettings.address_line2) {
        fullAddress += ', ' + companySettings.address_line2;
      }
      if (companySettings.city) {
        fullAddress += ', ' + companySettings.city;
      }
      if (companySettings.state) {
        fullAddress += ', ' + companySettings.state;
      }
      if (companySettings.postal_code) {
        fullAddress += ' - ' + companySettings.postal_code;
      }
    }

    setFormData({
      party_a_name: companySettings?.company_name || '',
      party_a_address: fullAddress,
      party_a_contact: companySettings?.phone || '',
      party_a_gstin: companySettings?.gstin || '',
      party_a_pan: companySettings?.pan || '',
      party_b_name: '',
      contract_type: 'MSA',
      contract_title: '',
      contract_date: new Date().toISOString().split('T')[0],
      effective_date: new Date().toISOString().split('T')[0],
      currency_code: 'INR',
      sections: [
        {
          section_number: 1,
          section_title: 'Scope of Work',
          section_content: '',
          is_required: false,
          page_break_before: false
        }
      ]
    });
    setShowCreateModal(true);
  };

  // Handle form submission
  const handleSubmitContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await contractService.createContract(formData);
      showSuccess('Contract created successfully');
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      console.error('Error creating contract:', err);
      showError('Failed to create contract');
    }
  };

  // Add section
  const addSection = () => {
    setFormData(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          section_number: prev.sections.length + 1,
          section_title: '',
          section_content: '',
          is_required: false,
          page_break_before: false
        }
      ]
    }));
  };

  // Remove section
  const removeSection = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index).map((s, i) => ({
        ...s,
        section_number: i + 1
      }))
    }));
  };

  // Update section
  const updateSection = (index: number, field: keyof CreateContractSectionData, value: string | boolean | number) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) => 
        i === index ? { ...s, [field]: value } : s
      )
    }));
  };

  // Handle contract view
  const handleViewContract = async (contractId: string) => {
    try {
      const contract = await contractService.getContractById(contractId);
      console.log('Contract details:', contract);
      showInfo('Contract viewing coming soon...');
    } catch (err) {
      console.error('Error loading contract:', err);
      showError('Failed to load contract details');
    }
  };

  // Handle contract edit
  const handleEditContract = async (contractId: string) => {
    try {
      const contract = await contractService.getContractById(contractId);
      console.log('Contract to edit:', contract);
      showInfo('Contract editing coming soon...');
    } catch (err) {
      console.error('Error loading contract:', err);
      showError('Failed to load contract details');
    }
  };

  // Handle contract delete
  const handleDeleteContract = async (contractId: string, contractNumber: string) => {
    const confirmed = await confirm({
      title: 'Delete Contract',
      message: `Are you sure you want to delete contract "${contractNumber}"?\n\nThis action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (confirmed) {
      try {
        setLoading(true);
        await contractService.deleteContract(contractId);
        showSuccess('Contract deleted successfully');
        await loadData();
      } catch (err) {
        console.error('Error deleting contract:', err);
        showError('Failed to delete contract');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle contract PDF generation
  const handleGeneratePDF = async (contractId: string) => {
    try {
      showInfo('Generating contract PDF...');
      
      // Get full contract details with sections
      const fullContract = await contractService.getContractById(contractId);
      if (!fullContract) {
        showError('Contract not found');
        return;
      }

      // Get company settings for header/footer
      const companySettings = await invoiceService.getCompanySettings();
      const company = companySettings && companySettings.length > 0 ? companySettings[0] : null;
      if (!company) {
        showError('Company settings not configured');
        return;
      }

      // Create PDF with multi-page support
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });
      
      pdf.setFont('helvetica');
      
      // Page dimensions
      const pageWidth = 210;
      const leftMargin = 15;
      const rightMargin = 15;
      const contentWidth = pageWidth - leftMargin - rightMargin;
      
      // Apply branding header to get content boundaries
      const dimensions = PDFBrandingUtils.getStandardDimensions();
      const { contentStartY, contentEndY } = await PDFBrandingUtils.applyBranding(pdf, company, dimensions);
      
      // Calculate usable content area based on branding
      const topMargin = contentStartY + 5;
      const maxY = contentEndY - 5; // Leave space above footer
      
      let yPos = topMargin + 5;
      
      // Helper function to check if we need a new page
      const checkPageBreak = (requiredSpace: number): void => {
        if (yPos + requiredSpace > maxY) {
          pdf.addPage();
          yPos = topMargin + 5;
        }
      };
      
      // ========== TITLE SECTION ==========
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(5, 150, 105); // Emerald color
      pdf.text('CONTRACT AGREEMENT', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 10;
      
      // Contract Number
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      pdf.text(`Contract #: ${fullContract.contract_number}`, pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 8;
      
      // Contract Type
      pdf.setFontSize(11);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Type: ${fullContract.contract_type}`, pageWidth / 2, yPos, { align: 'center' });
      
      // Contract Title if exists
      if (fullContract.contract_title) {
        yPos += 10;
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        const titleLines = pdf.splitTextToSize(fullContract.contract_title, contentWidth - 40);
        pdf.text(titleLines, pageWidth / 2, yPos, { align: 'center' });
        yPos += titleLines.length * 6;
      }
      
      yPos += 15;
      checkPageBreak(80);
      
      // ========== PARTIES SECTION ==========
      const col1X = leftMargin;
      const col2X = pageWidth / 2 + 10;
      const colWidth = (pageWidth - leftMargin - rightMargin - 20) / 2;
      let partyAY = yPos;
      let partyBY = yPos;
      
      // Party A Section
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(5, 150, 105);
      pdf.text('PARTY A (Service Provider):', col1X, partyAY);
      
      partyAY += 6;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      const partyANameLines = pdf.splitTextToSize(fullContract.party_a_name, colWidth);
      pdf.text(partyANameLines, col1X, partyAY);
      partyAY += partyANameLines.length * 5;
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);
      
      if (fullContract.party_a_address) {
        const addrLines = pdf.splitTextToSize(fullContract.party_a_address, colWidth);
        pdf.text(addrLines, col1X, partyAY);
        partyAY += addrLines.length * 4;
      }
      
      if (fullContract.party_a_contact) {
        partyAY += 2;
        pdf.text(`Contact: ${fullContract.party_a_contact}`, col1X, partyAY);
        partyAY += 4;
      }
      
      if (fullContract.party_a_gstin) {
        pdf.text(`GSTIN: ${fullContract.party_a_gstin}`, col1X, partyAY);
        partyAY += 4;
      }
      
      if (fullContract.party_a_pan) {
        pdf.text(`PAN: ${fullContract.party_a_pan}`, col1X, partyAY);
        partyAY += 4;
      }
      
      // Party B Section
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(5, 150, 105);
      pdf.text('PARTY B (Client):', col2X, partyBY);
      
      partyBY += 6;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      const partyBNameLines = pdf.splitTextToSize(fullContract.party_b_name, colWidth);
      pdf.text(partyBNameLines, col2X, partyBY);
      partyBY += partyBNameLines.length * 5;
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);
      
      if (fullContract.party_b_address) {
        const addrLines = pdf.splitTextToSize(fullContract.party_b_address, colWidth);
        pdf.text(addrLines, col2X, partyBY);
        partyBY += addrLines.length * 4;
      }
      
      if (fullContract.party_b_contact) {
        partyBY += 2;
        pdf.text(`Contact: ${fullContract.party_b_contact}`, col2X, partyBY);
        partyBY += 4;
      }
      
      if (fullContract.party_b_gstin) {
        pdf.text(`GSTIN: ${fullContract.party_b_gstin}`, col2X, partyBY);
        partyBY += 4;
      }
      
      if (fullContract.party_b_pan) {
        pdf.text(`PAN: ${fullContract.party_b_pan}`, col2X, partyBY);
        partyBY += 4;
      }
      
      yPos = Math.max(partyAY, partyBY) + 15;
      checkPageBreak(60);
      
      // ========== CONTRACT DETAILS ==========
      pdf.setFillColor(245, 245, 245);
      pdf.rect(leftMargin, yPos, contentWidth, 30, 'F');
      
      yPos += 7;
      const detailsStartX = leftMargin + 5;
      const detailsColWidth = contentWidth / 2;
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      
      pdf.text('Contract Date:', detailsStartX, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(new Date(fullContract.contract_date).toLocaleDateString(), detailsStartX + 40, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Effective Date:', detailsStartX + detailsColWidth, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(new Date(fullContract.effective_date).toLocaleDateString(), detailsStartX + detailsColWidth + 40, yPos);
      
      yPos += 6;
      
      if (fullContract.expiry_date) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Expiry Date:', detailsStartX, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(new Date(fullContract.expiry_date).toLocaleDateString(), detailsStartX + 40, yPos);
      }
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Status:', detailsStartX + detailsColWidth, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(fullContract.status.toUpperCase(), detailsStartX + detailsColWidth + 40, yPos);
      
      yPos += 6;
      
      if (fullContract.contract_value) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Contract Value:', detailsStartX, yPos);
        pdf.setFont('helvetica', 'normal');
        const value = formatCurrency(fullContract.contract_value, fullContract.currency_code || 'INR');
        pdf.text(value, detailsStartX + 40, yPos);
      }
      
      yPos += 15;
      checkPageBreak(40);
      
      // ========== PAYMENT TERMS ==========
      if (fullContract.payment_terms) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(5, 150, 105);
        pdf.text('Payment Terms', leftMargin, yPos);
        
        yPos += 8;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(40, 40, 40);
        
        const paymentLines = pdf.splitTextToSize(fullContract.payment_terms, contentWidth);
        paymentLines.forEach((line: string) => {
          checkPageBreak(6);
          pdf.text(line, leftMargin, yPos);
          yPos += 5;
        });
        
        yPos += 10;
      }
      
      // ========== CONTRACT SECTIONS ==========
      if (fullContract.sections && fullContract.sections.length > 0) {
        // Sort sections by section_number
        const sortedSections = [...fullContract.sections].sort((a, b) => a.section_number - b.section_number);
        
        sortedSections.forEach((section) => {
          checkPageBreak(25);
          
          // Section Header
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(5, 150, 105);
          pdf.text(`${section.section_number}. ${section.section_title}`, leftMargin, yPos);
          
          yPos += 7;
          
          // Section Content
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(40, 40, 40);
          
          const contentLines = pdf.splitTextToSize(section.section_content, contentWidth);
          contentLines.forEach((line: string) => {
            checkPageBreak(6);
            pdf.text(line, leftMargin, yPos);
            yPos += 5;
          });
          
          yPos += 8;
        });
      }
      
      // ========== NOTES ==========
      if (fullContract.notes) {
        checkPageBreak(25);
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(5, 150, 105);
        pdf.text('Additional Notes', leftMargin, yPos);
        
        yPos += 8;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(40, 40, 40);
        
        const notesLines = pdf.splitTextToSize(fullContract.notes, contentWidth);
        notesLines.forEach((line: string) => {
          checkPageBreak(6);
          pdf.text(line, leftMargin, yPos);
          yPos += 5;
        });
        
        yPos += 10;
      }
      
      // ========== SIGNATURES ==========
      checkPageBreak(50);
      yPos += 20;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      
      // Party A Signature
      pdf.text('Party A (Service Provider)', col1X, yPos);
      yPos += 20;
      pdf.line(col1X, yPos, col1X + colWidth - 10, yPos);
      yPos += 5;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Authorized Signature', col1X, yPos);
      
      // Party B Signature
      yPos -= 25;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Party B (Client)', col2X, yPos);
      yPos += 20;
      pdf.line(col2X, yPos, col2X + colWidth - 10, yPos);
      yPos += 5;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Authorized Signature', col2X, yPos);
      
      // Apply branding to all pages
      const totalPages = pdf.getNumberOfPages();
      for (let i = 2; i <= totalPages; i++) {
        pdf.setPage(i);
        await PDFBrandingUtils.applyBranding(pdf, company, dimensions);
      }
      
      // Download the PDF
      pdf.save(`${fullContract.contract_number}_${fullContract.party_b_name.replace(/\s+/g, '_')}.pdf`);
      showSuccess('Contract PDF generated successfully!');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showError('Failed to generate contract PDF');
    }
  };

  // Get status badge color
  const getStatusBadge = (status: ContractStatus) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      terminated: 'bg-orange-100 text-orange-800',
      renewed: 'bg-blue-100 text-blue-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  // Get contract type badge
  const getContractTypeBadge = (type: ContractType) => {
    const badges = {
      MSA: 'bg-purple-100 text-purple-800',
      SOW: 'bg-blue-100 text-blue-800',
      NDA: 'bg-yellow-100 text-yellow-800',
      SLA: 'bg-green-100 text-green-800',
      WORK_ORDER: 'bg-indigo-100 text-indigo-800',
      MAINTENANCE: 'bg-teal-100 text-teal-800',
      CONSULTING: 'bg-pink-100 text-pink-800',
      LICENSE: 'bg-cyan-100 text-cyan-800',
      OTHER: 'bg-gray-100 text-gray-800'
    };
    return badges[type] || 'bg-gray-100 text-gray-800';
  };

  // Format currency
  const formatCurrency = (amount: number | undefined, currencyCode: string = 'INR') => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currencyCode
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Render dashboard
  const renderDashboard = () => {
    if (!stats) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Contracts</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.total_contracts}</p>
              </div>
              <FileText className="w-12 h-12 text-blue-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Contracts</p>
                <p className="text-2xl font-semibold text-green-600 mt-1">{stats.active_contracts}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-semibold text-orange-600 mt-1">{stats.expiring_soon}</p>
                <p className="text-xs text-gray-500 mt-1">Next 30 days</p>
              </div>
              <AlertCircle className="w-12 h-12 text-orange-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-semibold text-blue-600 mt-1">
                  {formatCurrency(stats.total_contract_value, 'INR')}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-blue-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Recent Contracts */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Contracts</h3>
          </div>
          {renderContractTable(
            [...contracts]
              .sort((a, b) => new Date(b.contract_date).getTime() - new Date(a.contract_date).getTime())
              .slice(0, 5)
          )}
        </div>
      </div>
    );
  };

  // Render contract table (reusable)
  const renderContractTable = (contractList: Contract[] = contracts) => (
    <div className="w-full">
      <table className="w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
              Contract #
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Title / Parties
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
              Type
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
              Status
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
              Value
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
              Dates
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading contracts...</span>
                </div>
              </td>
            </tr>
          ) : contractList.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                No contracts found.
              </td>
            </tr>
          ) : (
            contractList.map((contract) => (
              <tr key={contract.id} className="hover:bg-gray-50">
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{contract.contract_number}</div>
                  <div className="text-xs text-gray-500">{formatDate(contract.contract_date)}</div>
                </td>
                <td className="px-3 py-3">
                  <div className="text-sm font-medium text-gray-900 truncate max-w-xs">{contract.contract_title}</div>
                  <div className="text-xs text-gray-500 truncate max-w-xs">
                    {contract.party_a_name} ↔ {contract.party_b_name}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getContractTypeBadge(contract.contract_type)}`}>
                    {contract.contract_type}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(contract.status)}`}>
                    {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(contract.contract_value, contract.currency_code)}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-xs text-gray-500">
                    <div>Start: {formatDate(contract.effective_date)}</div>
                    <div>End: {formatDate(contract.expiry_date)}</div>
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleViewContract(contract.id)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditContract(contract.id)}
                      className="text-green-600 hover:text-green-900"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleGeneratePDF(contract.id)}
                      className="text-purple-600 hover:text-purple-900"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteContract(contract.id, contract.contract_number)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // Render contracts list
  const renderContractsList = () => {
    return (
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search contracts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleCreateContract}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Contract
          </button>
        </div>

        {/* Contracts table */}
        <div className="bg-white rounded-lg shadow">
          {renderContractTable()}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Main render
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-semibold text-gray-900">Contract Management</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'contracts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Contracts
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'templates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Templates
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'contracts' && renderContractsList()}
        {activeTab === 'templates' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-gray-600">Contract templates management coming soon...</p>
          </div>
        )}
      </div>

      {/* Create Contract Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmitContract}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
                <h2 className="text-xl font-semibold text-gray-900">Create New Contract</h2>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Contract Type & Title */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contract Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.contract_type}
                      onChange={(e) => setFormData({ ...formData, contract_type: e.target.value as ContractType })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="MSA">Master Service Agreement (MSA)</option>
                      <option value="SOW">Statement of Work (SOW)</option>
                      <option value="NDA">Non-Disclosure Agreement (NDA)</option>
                      <option value="SLA">Service Level Agreement (SLA)</option>
                      <option value="WORK_ORDER">Work Order</option>
                      <option value="MAINTENANCE">Maintenance Contract</option>
                      <option value="CONSULTING">Consulting Agreement</option>
                      <option value="LICENSE">Software License Agreement</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contract Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.contract_title}
                      onChange={(e) => setFormData({ ...formData, contract_title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter contract title"
                    />
                  </div>
                </div>

                {/* Party A (Our Company) */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Party A (Our Company)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        readOnly
                        value={formData.party_a_name}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                        placeholder="Your company name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contact</label>
                      <input
                        type="text"
                        readOnly
                        value={formData.party_a_contact || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                        placeholder="Contact person"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <textarea
                        readOnly
                        value={formData.party_a_address || ''}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                        placeholder="Company address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
                      <input
                        type="text"
                        readOnly
                        value={formData.party_a_gstin || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                        placeholder="GST Number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">PAN</label>
                      <input
                        type="text"
                        readOnly
                        value={formData.party_a_pan || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                        placeholder="PAN Number"
                      />
                    </div>
                  </div>
                </div>

                {/* Party B (Client) */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Party B (Client)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.party_b_name}
                        onChange={(e) => setFormData({ ...formData, party_b_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Client company name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contact</label>
                      <input
                        type="text"
                        value={formData.party_b_contact || ''}
                        onChange={(e) => setFormData({ ...formData, party_b_contact: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Contact person"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <textarea
                        value={formData.party_b_address || ''}
                        onChange={(e) => setFormData({ ...formData, party_b_address: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Client address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
                      <input
                        type="text"
                        value={formData.party_b_gstin || ''}
                        onChange={(e) => setFormData({ ...formData, party_b_gstin: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="GST Number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">PAN</label>
                      <input
                        type="text"
                        value={formData.party_b_pan || ''}
                        onChange={(e) => setFormData({ ...formData, party_b_pan: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="PAN Number"
                      />
                    </div>
                  </div>
                </div>

                {/* Dates & Financial */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contract Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contract Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.contract_date}
                        onChange={(e) => setFormData({ ...formData, contract_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Effective Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.effective_date}
                        onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                      <input
                        type="date"
                        value={formData.expiry_date || ''}
                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contract Value</label>
                      <input
                        type="number"
                        value={formData.contract_value || ''}
                        onChange={(e) => setFormData({ ...formData, contract_value: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms</label>
                    <textarea
                      value={formData.payment_terms || ''}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe payment terms..."
                    />
                  </div>
                </div>

                {/* Sections */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Contract Sections</h3>
                    <button
                      type="button"
                      onClick={addSection}
                      className="flex items-center px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Section
                    </button>
                  </div>
                  <div className="space-y-4">
                    {formData.sections.map((section, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">Section {section.section_number}</h4>
                          {formData.sections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSection(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                              type="text"
                              value={section.section_title}
                              onChange={(e) => updateSection(index, 'section_title', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Section title"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                            <textarea
                              value={section.section_content}
                              onChange={(e) => updateSection(index, 'section_content', e.target.value)}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Section content..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Create Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog {...dialogProps} loading={loading} />
    </div>
  );
};

export default ContractManagement;
