import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import {
  TrendingUp, TrendingDown, DollarSign, PieChart, Calendar, Download,
  Plus, Search, Filter, X, ArrowUpRight, ArrowDownRight, Building2,
  CreditCard, FileText, Receipt, Users, AlertTriangle, CheckCircle,
  BarChart3, Wallet, RefreshCw, Eye, Edit, Trash2, ChevronLeft, ChevronRight, Printer
} from 'lucide-react';
import {
  financeService,
  FinancialSummary,
  FinancialHealth,
  FinancialTransaction,
  ManualTransaction,
  CreateTransactionData
} from '../../services/financeService';
import { invoiceService } from '../../services/invoiceService';
import { PDFBrandingUtils } from '../../utils/pdfBrandingUtils';
import type { CompanySettings, Country } from '../../types/invoice';

type ViewType = 'dashboard' | 'transactions' | 'manual-entries' | 'reports';
type PeriodType = 'monthly' | 'quarterly' | 'yearly';

const transactionTypeColors: Record<string, string> = {
  income: 'bg-green-100 text-green-800',
  expense: 'bg-red-100 text-red-800'
};

const sourceColors: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  invoice: { bg: 'bg-blue-100', text: 'text-blue-700', icon: FileText },
  expense: { bg: 'bg-orange-100', text: 'text-orange-700', icon: Receipt },
  salary: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Users },
  bonus: { bg: 'bg-pink-100', text: 'text-pink-700', icon: DollarSign },
  manual: { bg: 'bg-gray-100', text: 'text-gray-700', icon: CreditCard }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const FinanceManagement: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  
  // For Indian FY: selectedYear represents the starting year of the FY
  // e.g., selectedYear = 2025 means FY 2025-26 (Apr 2025 - Mar 2026)
  const getCurrentFinancialYear = () => {
    const today = new Date();
    // If month is Jan-Mar, we're in the previous year's FY
    return today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  };
  
  const getCurrentFYQuarter = () => {
    const today = new Date();
    const month = today.getMonth(); // 0-11
    // FY Quarters: Q1 = Apr-Jun (3-5), Q2 = Jul-Sep (6-8), Q3 = Oct-Dec (9-11), Q4 = Jan-Mar (0-2)
    if (month >= 3 && month <= 5) return 1;
    if (month >= 6 && month <= 8) return 2;
    if (month >= 9 && month <= 11) return 3;
    return 4; // Jan-Mar
  };
  
  const getCurrentFYMonth = () => {
    const today = new Date();
    const month = today.getMonth(); // 0-11
    // FY Months: 1 = April, 2 = May, ..., 12 = March
    return month >= 3 ? month - 2 : month + 10;
  };
  
  const [selectedYear, setSelectedYear] = useState(getCurrentFinancialYear());
  const [selectedMonth, setSelectedMonth] = useState(getCurrentFYMonth()); // FY month (1=Apr, 12=Mar)
  const [selectedQuarter, setSelectedQuarter] = useState(getCurrentFYQuarter()); // FY quarter

  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [health, setHealth] = useState<FinancialHealth | null>(null);
  const [incomeTransactions, setIncomeTransactions] = useState<FinancialTransaction[]>([]);
  const [expenseTransactions, setExpenseTransactions] = useState<FinancialTransaction[]>([]);
  const [manualTransactions, setManualTransactions] = useState<ManualTransaction[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; income: number; expenses: number; profit: number }[]>([]);

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedTransaction, setSelectedTransaction] = useState<ManualTransaction | null>(null);
  const [transactionFilters, setTransactionFilters] = useState({
    type: '',
    source: ''
  });

  // PDF Report states
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDashboardData();
    loadCountries();
    loadCompanySettings();
  }, [selectedYear, selectedMonth, selectedQuarter, periodType]);

  // Convert FY month (1=Apr, 12=Mar) to calendar month and year
  const fyMonthToCalendar = (fyMonth: number, fyStartYear: number) => {
    // fyMonth: 1=Apr, 2=May, ..., 9=Dec, 10=Jan, 11=Feb, 12=Mar
    if (fyMonth <= 9) {
      // Apr (1) to Dec (9) - same year as FY start
      return { month: fyMonth + 3, year: fyStartYear }; // Apr=4, May=5, ..., Dec=12
    } else {
      // Jan (10) to Mar (12) - next year
      return { month: fyMonth - 9, year: fyStartYear + 1 }; // Jan=1, Feb=2, Mar=3
    }
  };

  const getDateRange = () => {
    let startDate: string, endDate: string;
    
    if (periodType === 'yearly') {
      // Indian Financial Year: April 1 of selectedYear to March 31 of selectedYear+1
      startDate = `${selectedYear}-04-01`;
      endDate = `${selectedYear + 1}-03-31`;
    } else if (periodType === 'quarterly') {
      // FY Quarters: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar
      if (selectedQuarter === 1) {
        startDate = `${selectedYear}-04-01`;
        endDate = `${selectedYear}-06-30`;
      } else if (selectedQuarter === 2) {
        startDate = `${selectedYear}-07-01`;
        endDate = `${selectedYear}-09-30`;
      } else if (selectedQuarter === 3) {
        startDate = `${selectedYear}-10-01`;
        endDate = `${selectedYear}-12-31`;
      } else {
        // Q4: Jan-Mar of next year
        startDate = `${selectedYear + 1}-01-01`;
        endDate = `${selectedYear + 1}-03-31`;
      }
    } else {
      // Monthly: Convert FY month to calendar month
      const { month, year } = fyMonthToCalendar(selectedMonth, selectedYear);
      startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    }
    
    return { startDate, endDate };
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      console.log('📊 Finance Dashboard: Loading data for period', { periodType, startDate, endDate, selectedYear, selectedMonth, selectedQuarter });
      
      const [summaryData, healthData, incomeData, expenseData, trendData, manualData] = await Promise.all([
        financeService.getFinancialSummary(startDate, endDate),
        financeService.getFinancialHealth(),
        financeService.getIncomeData(startDate, endDate),
        financeService.getExpenseData(startDate, endDate),
        financeService.getMonthlyTrend(12),
        financeService.getTransactions()
      ]);

      console.log('📊 Finance Dashboard: Data loaded', { 
        periodType,
        dateRange: { startDate, endDate },
        incomeTotal: summaryData.income.total,
        expenseTotal: summaryData.expenses.total,
        incomeCount: incomeData.length,
        expenseCount: expenseData.length
      });

      setSummary(summaryData);
      setHealth(healthData);
      setIncomeTransactions(incomeData);
      setExpenseTransactions(expenseData);
      setMonthlyTrend(trendData);
      setManualTransactions(manualData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanySettings = async () => {
    try {
      const companies = await invoiceService.getCompanySettings();
      const defaultCompany = companies.find(c => c.is_default) || companies[0];
      setCompanySettings(defaultCompany || null);
    } catch (error) {
      console.error('Error loading company settings:', error);
    }
  };

  const loadCountries = async () => {
    try {
      const data = await invoiceService.getCountries();
      setCountries(data);
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  };

  // PDF Generation functions
  const generateFinanceReportPDF = async (action: 'download' | 'preview') => {
    if (!summary || !companySettings) {
      alert('Please ensure data is loaded and company settings are configured.');
      return;
    }

    setPdfGenerating(true);
    try {
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      pdf.setFont('helvetica');
      const dimensions = PDFBrandingUtils.getStandardDimensions();
      
      // Apply branding (header/footer images)
      const { contentStartY, contentEndY } = await PDFBrandingUtils.applyBranding(
        pdf, 
        companySettings, 
        dimensions
      );

      let currentY = contentStartY + 5;
      const leftMargin = dimensions.leftMargin;
      const rightMargin = dimensions.rightMargin;
      const pageWidth = dimensions.pageWidth;
      const contentWidth = pageWidth - leftMargin - rightMargin;

      // Helper function to add new page with branding
      const addNewPage = async () => {
        pdf.addPage();
        const branding = await PDFBrandingUtils.applyBranding(pdf, companySettings, dimensions);
        return branding.contentStartY + 5;
      };

      // Check if we need a new page
      const checkPageBreak = async (requiredHeight: number) => {
        if (currentY + requiredHeight > contentEndY - 10) {
          currentY = await addNewPage();
        }
      };

      // Report Title
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Financial Report', leftMargin, currentY);
      currentY += 8;

      // Period
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      pdf.text(`Period: ${getPeriodLabel()}`, leftMargin, currentY);
      currentY += 5;
      
      const { startDate, endDate } = getDateRange();
      pdf.setFontSize(10);
      pdf.text(`(${new Date(startDate).toLocaleDateString('en-IN')} - ${new Date(endDate).toLocaleDateString('en-IN')})`, leftMargin, currentY);
      currentY += 5;

      // Generated date
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, leftMargin, currentY);
      currentY += 12;

      // Company Info
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(companySettings.company_name, leftMargin, currentY);
      currentY += 4;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      if (companySettings.gstin) {
        pdf.text(`GSTIN: ${companySettings.gstin}`, leftMargin, currentY);
        currentY += 4;
      }
      currentY += 8;

      // Draw section header
      const drawSectionHeader = (title: string) => {
        pdf.setFillColor(37, 99, 235);
        pdf.rect(leftMargin, currentY, contentWidth, 8, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, leftMargin + 5, currentY + 5.5);
        pdf.setTextColor(0, 0, 0);
        currentY += 12;
      };

      // Draw table row
      const drawTableRow = (label: string, value: string, isTotal: boolean = false, isProfit: boolean = false) => {
        if (isTotal) {
          pdf.setFillColor(240, 240, 240);
          pdf.rect(leftMargin, currentY - 3, contentWidth, 7, 'F');
          pdf.setFont('helvetica', 'bold');
        } else {
          pdf.setFont('helvetica', 'normal');
        }
        
        pdf.setFontSize(10);
        if (isProfit) {
          const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
          pdf.setTextColor(numValue >= 0 ? 22 : 220, numValue >= 0 ? 163 : 38, numValue >= 0 ? 74 : 38);
        } else {
          pdf.setTextColor(0, 0, 0);
        }
        
        pdf.text(label, leftMargin + 8, currentY);
        pdf.text(value, pageWidth - rightMargin - 8, currentY, { align: 'right' });
        currentY += 6;
      };

      // ==================== PROFIT & LOSS STATEMENT ====================
      await checkPageBreak(80);
      drawSectionHeader('PROFIT & LOSS STATEMENT');

      // Income Section
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(22, 163, 74);
      pdf.text('INCOME', leftMargin + 5, currentY);
      currentY += 6;
      pdf.setTextColor(0, 0, 0);

      drawTableRow('Invoice Revenue', formatCurrency(summary.income.invoices));
      drawTableRow('Other Income', formatCurrency(summary.income.manualIncome));
      pdf.setDrawColor(200, 200, 200);
      pdf.line(leftMargin, currentY - 2, pageWidth - rightMargin, currentY - 2);
      drawTableRow('Total Income', formatCurrency(summary.income.total), true);
      currentY += 6;

      // Expenses Section
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(220, 38, 38);
      pdf.text('EXPENSES', leftMargin + 5, currentY);
      currentY += 6;
      pdf.setTextColor(0, 0, 0);

      drawTableRow('Operational Expenses', formatCurrency(summary.expenses.operationalExpenses));
      drawTableRow('Salaries', formatCurrency(summary.expenses.salaries));
      drawTableRow('Bonuses', formatCurrency(summary.expenses.bonuses));
      drawTableRow('Other Expenses', formatCurrency(summary.expenses.manualExpenses));
      pdf.line(leftMargin, currentY - 2, pageWidth - rightMargin, currentY - 2);
      drawTableRow('Total Expenses', formatCurrency(summary.expenses.total), true);
      currentY += 8;

      // Net Profit
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.line(leftMargin, currentY - 2, pageWidth - rightMargin, currentY - 2);
      pdf.line(leftMargin, currentY, pageWidth - rightMargin, currentY);
      currentY += 4;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      drawTableRow('NET PROFIT / (LOSS)', formatCurrency(summary.netProfit), true, true);
      pdf.setLineWidth(0.2);
      currentY += 10;

      // ==================== KEY METRICS ====================
      await checkPageBreak(50);
      drawSectionHeader('KEY FINANCIAL METRICS');

      const metrics = [
        { label: 'Gross Profit Margin', value: `${summary.profitMargin.toFixed(1)}%` },
        { label: 'Operating Expenses Ratio', value: `${summary.income.total > 0 ? ((summary.expenses.total / summary.income.total) * 100).toFixed(1) : 0}%` },
        { label: 'YTD Profit', value: formatCurrency(health?.yearToDateProfit || 0) },
        { label: 'Average Monthly Revenue', value: formatCurrency(health?.averageMonthlyRevenue || 0) },
        { label: 'Average Monthly Expense', value: formatCurrency(health?.averageMonthlyExpense || 0) },
        { label: 'Month-over-Month Growth', value: `${(health?.monthOverMonthGrowth || 0).toFixed(1)}%` }
      ];

      metrics.forEach(metric => {
        drawTableRow(metric.label, metric.value);
      });
      currentY += 10;

      // ==================== INCOME TRANSACTIONS ====================
      if (incomeTransactions.length > 0) {
        await checkPageBreak(40);
        drawSectionHeader('INCOME TRANSACTIONS');

        // Table header
        pdf.setFillColor(245, 245, 245);
        pdf.rect(leftMargin, currentY - 3, contentWidth, 7, 'F');
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Date', leftMargin + 5, currentY);
        pdf.text('Reference', leftMargin + 32, currentY);
        pdf.text('Description', leftMargin + 72, currentY);
        pdf.text('Amount', pageWidth - rightMargin - 8, currentY, { align: 'right' });
        currentY += 7;

        pdf.setFont('helvetica', 'normal');
        for (const txn of incomeTransactions) {
          await checkPageBreak(7);
          pdf.setFontSize(8);
          pdf.text(new Date(txn.transaction_date).toLocaleDateString('en-IN'), leftMargin + 5, currentY);
          pdf.text(txn.reference_number.substring(0, 25), leftMargin + 32, currentY);
          pdf.text(txn.description.substring(0, 40), leftMargin + 72, currentY);
          pdf.text(formatCurrency(txn.net_amount), pageWidth - rightMargin - 8, currentY, { align: 'right' });
          currentY += 5;
        }
        currentY += 8;
      }

      // ==================== EXPENSE TRANSACTIONS ====================
      if (expenseTransactions.length > 0) {
        await checkPageBreak(40);
        drawSectionHeader('EXPENSE TRANSACTIONS');

        // Table header
        pdf.setFillColor(245, 245, 245);
        pdf.rect(leftMargin, currentY - 3, contentWidth, 7, 'F');
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Date', leftMargin + 5, currentY);
        pdf.text('Reference', leftMargin + 32, currentY);
        pdf.text('Description', leftMargin + 72, currentY);
        pdf.text('Amount', pageWidth - rightMargin - 8, currentY, { align: 'right' });
        currentY += 7;

        pdf.setFont('helvetica', 'normal');
        for (const txn of expenseTransactions) {
          await checkPageBreak(7);
          pdf.setFontSize(8);
          pdf.text(new Date(txn.transaction_date).toLocaleDateString('en-IN'), leftMargin + 5, currentY);
          pdf.text(txn.reference_number.substring(0, 25), leftMargin + 32, currentY);
          pdf.text(txn.description.substring(0, 40), leftMargin + 72, currentY);
          pdf.text(formatCurrency(txn.net_amount), pageWidth - rightMargin - 8, currentY, { align: 'right' });
          currentY += 5;
        }
        currentY += 8;
      }

      // ==================== FOOTER NOTE ====================
      await checkPageBreak(20);
      currentY += 5;
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text('This is a computer-generated report and does not require a signature.', leftMargin, currentY);
      currentY += 4;
      pdf.text(`Report generated by ${companySettings.company_name} Finance Management System`, leftMargin, currentY);

      // Action: Download or Preview
      if (action === 'download') {
        pdf.save(`Financial_Report_${getPeriodLabel().replace(/\s+/g, '_')}.pdf`);
      } else {
        // Open in new window for preview
        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
      }

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report');
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleCreateTransaction = async (data: CreateTransactionData) => {
    try {
      if (modalMode === 'create') {
        await financeService.createTransaction(data);
      } else if (selectedTransaction) {
        await financeService.updateTransaction(selectedTransaction.id, data);
      }
      setShowTransactionModal(false);
      setSelectedTransaction(null);
      loadDashboardData();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Failed to save transaction');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await financeService.deleteTransaction(id);
      loadDashboardData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleReconcile = async (id: string) => {
    try {
      await financeService.reconcileTransaction(id);
      loadDashboardData();
    } catch (error) {
      console.error('Error reconciling transaction:', error);
    }
  };

  const openTransactionModal = (mode: 'create' | 'edit', transaction?: ManualTransaction) => {
    setModalMode(mode);
    setSelectedTransaction(transaction || null);
    setShowTransactionModal(true);
  };

  // Combined transactions for the all transactions view
  const getAllTransactions = () => {
    const all: (FinancialTransaction & { transactionType: 'income' | 'expense' })[] = [];
    
    incomeTransactions.forEach(t => {
      all.push({ ...t, transactionType: 'income' });
    });
    
    expenseTransactions.forEach(t => {
      all.push({ ...t, transactionType: 'expense' });
    });
    
    return all.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  };

  // Filter transactions
  const filteredTransactions = getAllTransactions().filter(t => {
    if (transactionFilters.type && t.transactionType !== transactionFilters.type) return false;
    if (transactionFilters.source && t.source_type !== transactionFilters.source) return false;
    return true;
  });

  // FY month names for display
  const fyMonthNames = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

  const getPeriodLabel = () => {
    if (periodType === 'yearly') {
      // Format: FY 2025-26
      return `FY ${selectedYear}-${String(selectedYear + 1).slice(-2)}`;
    }
    if (periodType === 'quarterly') {
      // Format: Q1 FY 2025-26
      return `Q${selectedQuarter} FY ${selectedYear}-${String(selectedYear + 1).slice(-2)}`;
    }
    // Monthly: Show month name and appropriate year
    const { year } = fyMonthToCalendar(selectedMonth, selectedYear);
    return `${fyMonthNames[selectedMonth - 1]} ${year}`;
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (periodType === 'yearly') {
      setSelectedYear(prev => direction === 'prev' ? prev - 1 : prev + 1);
    } else if (periodType === 'quarterly') {
      if (direction === 'prev') {
        if (selectedQuarter === 1) {
          setSelectedQuarter(4);
          setSelectedYear(prev => prev - 1);
        } else {
          setSelectedQuarter(prev => prev - 1);
        }
      } else {
        if (selectedQuarter === 4) {
          setSelectedQuarter(1);
          setSelectedYear(prev => prev + 1);
        } else {
          setSelectedQuarter(prev => prev + 1);
        }
      }
    } else {
      // Monthly navigation in FY context (1=Apr to 12=Mar)
      if (direction === 'prev') {
        if (selectedMonth === 1) {
          // Going from April to previous FY's March
          setSelectedMonth(12);
          setSelectedYear(prev => prev - 1);
        } else {
          setSelectedMonth(prev => prev - 1);
        }
      } else {
        if (selectedMonth === 12) {
          // Going from March to next FY's April
          setSelectedMonth(1);
          setSelectedYear(prev => prev + 1);
        } else {
          setSelectedMonth(prev => prev + 1);
        }
      }
    }
  };

  // Calculate health score
  const getHealthScore = (health: FinancialHealth) => {
    let score = 50; // Base score
    
    // Profit margin contribution (up to 25 points)
    if (health.profitMargin > 20) score += 25;
    else if (health.profitMargin > 10) score += 20;
    else if (health.profitMargin > 0) score += 10;
    else score -= 10;
    
    // MoM growth contribution (up to 15 points)
    if (health.monthOverMonthGrowth > 10) score += 15;
    else if (health.monthOverMonthGrowth > 0) score += 10;
    else if (health.monthOverMonthGrowth > -10) score += 5;
    
    // Current ratio contribution (up to 10 points)
    if (health.currentRatio > 2) score += 10;
    else if (health.currentRatio > 1) score += 5;
    
    return Math.min(100, Math.max(0, score));
  };

  const getHealthStatus = (score: number) => {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-green-600" />
            Finance Management
          </h1>
          <p className="text-gray-600 mt-1">Track income, expenses, and financial health</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => openTransactionModal('create')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-5 h-5" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Period Type:</span>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as PeriodType)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigatePeriod('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-lg font-semibold text-gray-900 min-w-[150px] text-center">
              {getPeriodLabel()}
            </span>
            <button
              onClick={() => navigatePeriod('next')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg ml-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: PieChart },
              { id: 'transactions', label: 'All Transactions', icon: FileText },
              { id: 'manual-entries', label: 'Manual Entries', icon: CreditCard },
              { id: 'reports', label: 'Reports', icon: BarChart3 }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as ViewType)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeView === tab.id
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <>
              {/* Dashboard View */}
              {activeView === 'dashboard' && summary && health && (
                <div className="space-y-6">
                  {/* Financial Health Card */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-4 bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold opacity-90">Financial Health Score</h3>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-5xl font-bold">{getHealthScore(health)}</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              getHealthStatus(getHealthScore(health)) === 'excellent' ? 'bg-green-400/30' :
                              getHealthStatus(getHealthScore(health)) === 'good' ? 'bg-green-300/30' :
                              getHealthStatus(getHealthScore(health)) === 'fair' ? 'bg-yellow-400/30' :
                              'bg-red-400/30'
                            }`}>
                              {getHealthStatus(getHealthScore(health)).charAt(0).toUpperCase() + getHealthStatus(getHealthScore(health)).slice(1)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm opacity-75">Profit Margin</p>
                          <p className="text-2xl font-bold">{health.profitMargin.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
                        <div>
                          <p className="text-sm opacity-75">Avg Monthly Revenue</p>
                          <p className="text-xl font-semibold">{formatCurrency(health.averageMonthlyRevenue)}</p>
                        </div>
                        <div>
                          <p className="text-sm opacity-75">Avg Monthly Expense</p>
                          <p className="text-xl font-semibold">{formatCurrency(health.averageMonthlyExpense)}</p>
                        </div>
                        <div>
                          <p className="text-sm opacity-75">YTD Profit</p>
                          <p className="text-xl font-semibold">{formatCurrency(health.yearToDateProfit)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Period Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <ArrowUpRight className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Period Income</p>
                          <p className="text-xl font-bold text-green-600">{formatCurrency(summary.income.total)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <ArrowDownRight className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Period Expenses</p>
                          <p className="text-xl font-bold text-red-600">{formatCurrency(summary.expenses.total)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Wallet className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Net Profit</p>
                          <p className={`text-xl font-bold ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(summary.netProfit)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">MoM Growth</p>
                          <p className={`text-xl font-bold ${health.monthOverMonthGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {health.monthOverMonthGrowth >= 0 ? '+' : ''}{health.monthOverMonthGrowth.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Income & Expense Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Income Breakdown */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <ArrowUpRight className="w-5 h-5 text-green-600" />
                        Income Breakdown
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded bg-blue-100">
                              <FileText className="w-4 h-4 text-blue-700" />
                            </span>
                            <span className="text-sm">Invoice Revenue</span>
                          </div>
                          <span className="font-medium">{formatCurrency(summary.income.invoices)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded bg-gray-100">
                              <CreditCard className="w-4 h-4 text-gray-700" />
                            </span>
                            <span className="text-sm">Other Income</span>
                          </div>
                          <span className="font-medium">{formatCurrency(summary.income.manualIncome)}</span>
                        </div>
                        <div className="flex justify-between font-medium text-green-600 pt-2 border-t border-gray-200">
                          <span>Total Income</span>
                          <span>{formatCurrency(summary.income.total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Expense Breakdown */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <ArrowDownRight className="w-5 h-5 text-red-600" />
                        Expense Breakdown
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded bg-orange-100">
                              <Receipt className="w-4 h-4 text-orange-700" />
                            </span>
                            <span className="text-sm">Operational Expenses</span>
                          </div>
                          <span className="font-medium">{formatCurrency(summary.expenses.operationalExpenses)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded bg-purple-100">
                              <Users className="w-4 h-4 text-purple-700" />
                            </span>
                            <span className="text-sm">Salaries</span>
                          </div>
                          <span className="font-medium">{formatCurrency(summary.expenses.salaries)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded bg-pink-100">
                              <DollarSign className="w-4 h-4 text-pink-700" />
                            </span>
                            <span className="text-sm">Bonuses</span>
                          </div>
                          <span className="font-medium">{formatCurrency(summary.expenses.bonuses)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded bg-gray-100">
                              <CreditCard className="w-4 h-4 text-gray-700" />
                            </span>
                            <span className="text-sm">Other Expenses</span>
                          </div>
                          <span className="font-medium">{formatCurrency(summary.expenses.manualExpenses)}</span>
                        </div>
                        <div className="flex justify-between font-medium text-red-600 pt-2 border-t border-gray-200">
                          <span>Total Expenses</span>
                          <span>{formatCurrency(summary.expenses.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Trend */}
                  {monthlyTrend.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trend (Last 12 Months)</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Month</th>
                              <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Income</th>
                              <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Expenses</th>
                              <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Profit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthlyTrend.map((item, index) => (
                              <tr key={index} className="border-b border-gray-100">
                                <td className="py-2 px-3 text-sm">{item.month}</td>
                                <td className="py-2 px-3 text-sm text-right text-green-600">{formatCurrency(item.income)}</td>
                                <td className="py-2 px-3 text-sm text-right text-red-600">{formatCurrency(item.expenses)}</td>
                                <td className={`py-2 px-3 text-sm text-right font-medium ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(item.profit)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Receivables & Payables */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <ArrowUpRight className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Pending Receivables</p>
                          <p className="text-xl font-bold text-blue-600">{formatCurrency(health.pendingReceivables)}</p>
                          <p className="text-xs text-gray-500">Unpaid invoices</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <ArrowDownRight className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Pending Payables</p>
                          <p className="text-xl font-bold text-orange-600">{formatCurrency(health.pendingPayables)}</p>
                          <p className="text-xs text-gray-500">Approved unpaid expenses</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* All Transactions View */}
              {activeView === 'transactions' && (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <select
                      value={transactionFilters.type}
                      onChange={(e) => setTransactionFilters({ ...transactionFilters, type: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">All Types</option>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                    <select
                      value={transactionFilters.source}
                      onChange={(e) => setTransactionFilters({ ...transactionFilters, source: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">All Sources</option>
                      <option value="invoice">Invoice</option>
                      <option value="expense">Expense</option>
                      <option value="salary">Salary</option>
                      <option value="bonus">Bonus</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Reference</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Description</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Type</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Source</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-12 text-gray-500">
                              No transactions found
                            </td>
                          </tr>
                        ) : (
                          filteredTransactions.map((transaction, index) => (
                            <tr key={`${transaction.source_id}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 text-sm">{formatDate(transaction.transaction_date)}</td>
                              <td className="py-3 px-4">
                                <span className="font-mono text-sm">{transaction.reference_number || '-'}</span>
                              </td>
                              <td className="py-3 px-4">
                                <p className="text-sm text-gray-900">{transaction.description}</p>
                                {transaction.category && (
                                  <p className="text-xs text-gray-500">{transaction.category}</p>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${transactionTypeColors[transaction.transactionType]}`}>
                                  {transaction.transactionType}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${sourceColors[transaction.source_type]?.bg || 'bg-gray-100'} ${sourceColors[transaction.source_type]?.text || 'text-gray-700'}`}>
                                  {transaction.source_type}
                                </span>
                              </td>
                              <td className={`py-3 px-4 text-right font-medium ${
                                transaction.transactionType === 'income' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {transaction.transactionType === 'income' ? '+' : '-'}{formatCurrency(transaction.net_amount)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Manual Entries View */}
              {activeView === 'manual-entries' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Manual entries for transactions not tracked in other systems (bank transfers, cash payments, etc.)
                    </p>
                    <button
                      onClick={() => openTransactionModal('create')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Plus className="w-5 h-5" />
                      Add Entry
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Transaction #</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Description</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Type</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Amount</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {manualTransactions.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-12 text-gray-500">
                              No manual entries found
                            </td>
                          </tr>
                        ) : (
                          manualTransactions.map((transaction) => (
                            <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <span className="font-mono text-sm">{transaction.transaction_number}</span>
                              </td>
                              <td className="py-3 px-4 text-sm">{formatDate(transaction.transaction_date)}</td>
                              <td className="py-3 px-4">
                                <p className="text-sm text-gray-900">{transaction.title}</p>
                                {transaction.category && (
                                  <p className="text-xs text-gray-500">{transaction.category}</p>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${transactionTypeColors[transaction.transaction_type]}`}>
                                  {transaction.transaction_type}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  transaction.is_reconciled ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {transaction.is_reconciled ? 'Reconciled' : 'Pending'}
                                </span>
                              </td>
                              <td className={`py-3 px-4 text-right font-medium ${
                                transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {transaction.transaction_type === 'income' ? '+' : '-'}{formatCurrency(transaction.net_amount)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => openTransactionModal('edit', transaction)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Edit"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  {!transaction.is_reconciled && (
                                    <button
                                      onClick={() => handleReconcile(transaction.id)}
                                      className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                      title="Mark Reconciled"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteTransaction(transaction.id)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
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
                </div>
              )}

              {/* Reports View */}
              {activeView === 'reports' && summary && health && (
                <div className="space-y-6">
                  {/* Report Actions */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Financial Reports</h2>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => generateFinanceReportPDF('preview')}
                        disabled={pdfGenerating || !companySettings}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Eye className="w-5 h-5" />
                        {pdfGenerating ? 'Generating...' : 'Preview PDF'}
                      </button>
                      <button
                        onClick={() => generateFinanceReportPDF('download')}
                        disabled={pdfGenerating || !companySettings}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="w-5 h-5" />
                        {pdfGenerating ? 'Generating...' : 'Download PDF'}
                      </button>
                    </div>
                  </div>

                  {!companySettings && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Company Settings Required</p>
                        <p className="text-sm text-yellow-700">Please configure your company settings in Invoice Management to enable PDF generation with company branding.</p>
                      </div>
                    </div>
                  )}

                  {/* Profit & Loss Statement */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6" ref={reportRef}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Profit & Loss Statement - {getPeriodLabel()}
                    </h3>
                    <div className="space-y-4">
                      {/* Income Section */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">INCOME</h4>
                        <div className="space-y-2 pl-4">
                          <div className="flex justify-between text-sm">
                            <span>Invoice Revenue</span>
                            <span>{formatCurrency(summary.income.invoices)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Other Income</span>
                            <span>{formatCurrency(summary.income.manualIncome)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between font-medium text-green-600 mt-2 pt-2 border-t border-gray-200">
                          <span>Total Income</span>
                          <span>{formatCurrency(summary.income.total)}</span>
                        </div>
                      </div>

                      {/* Expenses Section */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">EXPENSES</h4>
                        <div className="space-y-2 pl-4">
                          <div className="flex justify-between text-sm">
                            <span>Operational Expenses</span>
                            <span>{formatCurrency(summary.expenses.operationalExpenses)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Salaries</span>
                            <span>{formatCurrency(summary.expenses.salaries)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Bonuses</span>
                            <span>{formatCurrency(summary.expenses.bonuses)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Other Expenses</span>
                            <span>{formatCurrency(summary.expenses.manualExpenses)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between font-medium text-red-600 mt-2 pt-2 border-t border-gray-200">
                          <span>Total Expenses</span>
                          <span>{formatCurrency(summary.expenses.total)}</span>
                        </div>
                      </div>

                      {/* Net Profit */}
                      <div className="flex justify-between text-lg font-bold pt-4 border-t-2 border-gray-300">
                        <span>Net Profit / (Loss)</span>
                        <span className={summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(summary.netProfit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Gross Profit Margin</h4>
                      <p className="text-2xl font-bold text-gray-900">
                        {summary.profitMargin.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Operating Expenses Ratio</h4>
                      <p className="text-2xl font-bold text-gray-900">
                        {summary.income.total > 0 
                          ? ((summary.expenses.total / summary.income.total) * 100).toFixed(1)
                          : 0}%
                      </p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">YTD Profit</h4>
                      <p className={`text-2xl font-bold ${health.yearToDateProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(health.yearToDateProfit)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Transaction Modal */}
      {showTransactionModal && (
        <TransactionModal
          mode={modalMode}
          transaction={selectedTransaction}
          countries={countries}
          onClose={() => {
            setShowTransactionModal(false);
            setSelectedTransaction(null);
          }}
          onSave={handleCreateTransaction}
        />
      )}
    </div>
  );
};

// Transaction Modal Component
const TransactionModal: React.FC<{
  mode: 'create' | 'edit';
  transaction: ManualTransaction | null;
  countries: Country[];
  onClose: () => void;
  onSave: (data: CreateTransactionData) => void;
}> = ({ mode, transaction, countries, onClose, onSave }) => {
  const [formData, setFormData] = useState<CreateTransactionData>(() => {
    if (transaction && mode === 'edit') {
      return {
        transaction_type: transaction.transaction_type,
        title: transaction.title,
        description: transaction.description || '',
        amount: transaction.amount,
        tax_amount: transaction.tax_amount || 0,
        // Multi-currency fields
        original_currency_code: transaction.original_currency_code || 'INR',
        original_amount: transaction.original_amount || transaction.amount,
        exchange_rate: transaction.exchange_rate || 1,
        exchange_rate_date: transaction.exchange_rate_date || undefined,
        inr_amount: transaction.inr_amount || transaction.amount,
        inr_tax_amount: transaction.inr_tax_amount || transaction.tax_amount,
        inr_net_amount: transaction.inr_net_amount || transaction.net_amount,
        // Other fields
        transaction_date: transaction.transaction_date,
        category: transaction.category || '',
        payment_method: transaction.payment_method || '',
        payment_reference: transaction.payment_reference || '',
        party_name: transaction.party_name || '',
        party_type: transaction.party_type || '',
        notes: transaction.notes || ''
      };
    }
    return {
      transaction_type: 'expense',
      title: '',
      description: '',
      amount: 0,
      tax_amount: 0,
      // Multi-currency defaults
      original_currency_code: 'INR',
      original_amount: 0,
      exchange_rate: 1,
      exchange_rate_date: new Date().toISOString().split('T')[0],
      inr_amount: 0,
      inr_tax_amount: 0,
      inr_net_amount: 0,
      // Other defaults
      transaction_date: new Date().toISOString().split('T')[0],
      category: '',
      payment_method: 'bank_transfer',
      payment_reference: '',
      party_name: '',
      party_type: '',
      notes: ''
    };
  });
  
  const isCurrencyLocked = transaction?.is_currency_locked || false;

  // Get currency symbol for display
  const getSelectedCurrency = () => {
    const currency = formData.original_currency_code || 'INR';
    const country = countries.find(c => c.currency_code === currency);
    return country ? { code: currency, symbol: country.currency_symbol, name: country.currency_name } : { code: 'INR', symbol: '₹', name: 'Indian Rupee' };
  };

  // Calculate INR values when amount or exchange rate changes
  const calculateINRValues = (originalAmount: number, taxAmount: number, exchangeRate: number, txnType: 'income' | 'expense') => {
    const inrAmount = originalAmount * exchangeRate;
    const inrTaxAmount = taxAmount * exchangeRate;
    // Net amount calculation based on transaction type
    const inrNetAmount = txnType === 'income' ? inrAmount - inrTaxAmount : inrAmount + inrTaxAmount;
    return { inrAmount, inrTaxAmount, inrNetAmount };
  };

  // Handle currency change
  const handleCurrencyChange = (currencyCode: string) => {
    const isINR = currencyCode === 'INR';
    const newRate = isINR ? 1 : formData.exchange_rate || 1;
    
    setFormData(prev => {
      const { inrAmount, inrTaxAmount, inrNetAmount } = calculateINRValues(
        prev.original_amount || 0,
        prev.tax_amount || 0,
        newRate,
        prev.transaction_type
      );
      return {
        ...prev,
        original_currency_code: currencyCode,
        currency: currencyCode,
        exchange_rate: newRate,
        exchange_rate_date: new Date().toISOString().split('T')[0],
        inr_amount: inrAmount,
        inr_tax_amount: inrTaxAmount,
        inr_net_amount: inrNetAmount,
        amount: inrAmount
      };
    });
  };

  // Handle original amount change
  const handleOriginalAmountChange = (amount: number) => {
    setFormData(prev => {
      const { inrAmount, inrTaxAmount, inrNetAmount } = calculateINRValues(
        amount,
        prev.tax_amount || 0,
        prev.exchange_rate || 1,
        prev.transaction_type
      );
      return {
        ...prev,
        original_amount: amount,
        inr_amount: inrAmount,
        inr_tax_amount: inrTaxAmount,
        inr_net_amount: inrNetAmount,
        amount: inrAmount
      };
    });
  };

  // Handle tax amount change
  const handleTaxAmountChange = (taxAmount: number) => {
    setFormData(prev => {
      const { inrAmount, inrTaxAmount, inrNetAmount } = calculateINRValues(
        prev.original_amount || 0,
        taxAmount,
        prev.exchange_rate || 1,
        prev.transaction_type
      );
      return {
        ...prev,
        tax_amount: taxAmount,
        inr_tax_amount: inrTaxAmount,
        inr_net_amount: inrNetAmount
      };
    });
  };

  // Handle exchange rate change
  const handleExchangeRateChange = (rate: number) => {
    setFormData(prev => {
      const { inrAmount, inrTaxAmount, inrNetAmount } = calculateINRValues(
        prev.original_amount || 0,
        prev.tax_amount || 0,
        rate,
        prev.transaction_type
      );
      return {
        ...prev,
        exchange_rate: rate,
        exchange_rate_date: new Date().toISOString().split('T')[0],
        inr_amount: inrAmount,
        inr_tax_amount: inrTaxAmount,
        inr_net_amount: inrNetAmount,
        amount: inrAmount
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Get unique currencies from countries
  const uniqueCurrencies = Array.from(new Set(countries.map(c => c.currency_code)))
    .map(code => {
      const country = countries.find(c => c.currency_code === code);
      return { code, symbol: country?.currency_symbol || '', name: country?.currency_name || '' };
    })
    .sort((a, b) => a.code === 'INR' ? -1 : b.code === 'INR' ? 1 : a.code.localeCompare(b.code));

  const selectedCurrency = getSelectedCurrency();

  const categories = formData.transaction_type === 'income' 
    ? ['Sales', 'Services', 'Interest', 'Investment', 'Refund', 'Other Income']
    : ['Rent', 'Utilities', 'Office Supplies', 'Professional Services', 'Bank Charges', 'Taxes', 'Other Expense'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Add Manual Transaction' : 'Edit Transaction'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type *</label>
            <select
              value={formData.transaction_type}
              onChange={(e) => {
                const newType = e.target.value as 'income' | 'expense';
                const { inrAmount, inrTaxAmount, inrNetAmount } = calculateINRValues(
                  formData.original_amount || 0,
                  formData.tax_amount || 0,
                  formData.exchange_rate || 1,
                  newType
                );
                setFormData({ ...formData, transaction_type: newType, category: '', inr_net_amount: inrNetAmount });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="e.g., Bank interest received, Rent payment"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Party Name</label>
              <input
                type="text"
                value={formData.party_name || ''}
                onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Customer, Vendor, Bank, etc."
              />
            </div>
          </div>
          
          {/* Currency Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency *</label>
              <select
                value={formData.original_currency_code || 'INR'}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                disabled={isCurrencyLocked}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              >
                {uniqueCurrencies.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.code} - {curr.name}
                  </option>
                ))}
              </select>
              {isCurrencyLocked && (
                <p className="text-xs text-amber-600 mt-1">Currency locked after reconciliation</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount ({selectedCurrency.symbol}) *
              </label>
              <input
                type="number"
                value={formData.original_amount || 0}
                onChange={(e) => handleOriginalAmountChange(parseFloat(e.target.value) || 0)}
                disabled={isCurrencyLocked}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                required
                min="0"
                step="0.01"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax Amount ({selectedCurrency.symbol})
              </label>
              <input
                type="number"
                value={formData.tax_amount || 0}
                onChange={(e) => handleTaxAmountChange(parseFloat(e.target.value) || 0)}
                disabled={isCurrencyLocked}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Date *</label>
              <input
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
          </div>
          
          {/* Exchange Rate (shown only for non-INR currencies) */}
          {formData.original_currency_code !== 'INR' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exchange Rate (1 {formData.original_currency_code} = ₹)
                </label>
                <input
                  type="number"
                  value={formData.exchange_rate || 1}
                  onChange={(e) => handleExchangeRateChange(parseFloat(e.target.value) || 1)}
                  disabled={isCurrencyLocked}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  min="0.0001"
                  step="0.0001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate Date</label>
                <input
                  type="date"
                  value={formData.exchange_rate_date || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData({ ...formData, exchange_rate_date: e.target.value })}
                  disabled={isCurrencyLocked}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          )}
          
          {/* INR Value Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">INR Values (Reporting Currency)</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Amount:</span>
                <span className="font-semibold text-blue-900 ml-2">
                  ₹{(formData.inr_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Tax:</span>
                <span className="font-semibold text-blue-900 ml-2">
                  ₹{(formData.inr_tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Net:</span>
                <span className={`font-bold ml-2 ${formData.transaction_type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                  ₹{(formData.inr_net_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={formData.payment_method || ''}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Method</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="cheque">Cheque</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Reference</label>
              <input
                type="text"
                value={formData.payment_reference || ''}
                onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Bank reference, cheque number, etc."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="pt-4 border-t border-gray-200 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {mode === 'create' ? 'Add Transaction' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinanceManagement;
