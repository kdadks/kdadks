import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  TrendingUp,
  DollarSign,
  Users,
  RefreshCw,
  Eye,
  X
} from 'lucide-react';
import { tdsReportService, TDSReportSummary } from '../../services/tdsReportService';
import { PDFBrandingUtils } from '../../utils/pdfBrandingUtils';
import { useToast } from '../ui/ToastProvider';
import { supabase } from '../../config/supabase';
import type { CompanySettings } from '../../types/invoice';

interface TDSReportProps {
  onBackToDashboard?: () => void;
}

const FINANCIAL_YEARS = [
  '2027-28',
  '2026-27',
  '2025-26',
  '2024-25',
  '2023-24',
  '2022-23',
  '2021-22',
];

const TDSReport: React.FC<TDSReportProps> = ({ onBackToDashboard }) => {
  const [loading, setLoading] = useState(false);
  const [summaries, setSummaries] = useState<TDSReportSummary[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null); // employee_id being generated
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewEmployee, setPreviewEmployee] = useState<TDSReportSummary | null>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const { showSuccess, showError } = useToast();

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    return date.toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [financialYear, setFinancialYear] = useState('');
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentFY = tdsReportService.getCurrentFinancialYear();
    setFinancialYear(currentFY);

    supabase
      .from('company_settings')
      .select('*')
      .eq('is_active', true)
      .single()
      .then(({ data }) => { if (data) setCompanySettings(data); });
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);

      // If FY is selected, use its date range; otherwise use manual dates
      let effectiveStart = startDate;
      let effectiveEnd = endDate;

      if (financialYear) {
        const [fyStart, fyEndShort] = financialYear.split('-');
        effectiveStart = `${fyStart}-04-01`;
        effectiveEnd = `20${fyEndShort}-03-31`;
        setStartDate(effectiveStart);
        setEndDate(effectiveEnd);
      }

      const [reportData, statsData] = await Promise.all([
        tdsReportService.getTDSReport({ start_date: effectiveStart, end_date: effectiveEnd }),
        tdsReportService.getTDSStats(effectiveStart, effectiveEnd)
      ]);

      setSummaries(reportData);
      setStats(statsData);

      if (reportData.length === 0) {
        const diag = await tdsReportService.getDiagnostics(effectiveStart, effectiveEnd);
        setDiagnostics(diag);
      } else {
        setDiagnostics(null);
      }

      showSuccess('TDS report loaded successfully');
    } catch (error) {
      console.error('Error loading TDS report:', error);
      showError('Failed to load TDS report');
    } finally {
      setLoading(false);
    }
  };

  const handleFYChange = async (fy: string) => {
    setFinancialYear(fy);
    if (!fy) return;

    try {
      setLoading(true);
      const [fyStartYear, fyEndShort] = fy.split('-');
      const fyStartDate = `${fyStartYear}-04-01`;
      const fyEndDate = `20${fyEndShort}-03-31`;

      setStartDate(fyStartDate);
      setEndDate(fyEndDate);

      const [reportData, statsData] = await Promise.all([
        tdsReportService.getTDSReportForFinancialYear(fy),
        tdsReportService.getTDSStats(fyStartDate, fyEndDate)
      ]);

      setSummaries(reportData);
      setStats(statsData);
      showSuccess(`TDS report for FY ${fy} loaded`);
    } catch (error) {
      console.error('Error loading financial year report:', error);
      showError('Failed to load financial year report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    try {
      const csv = tdsReportService.exportToCSV(summaries);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `TDS_Report_${startDate}_to_${endDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess('CSV downloaded successfully');
    } catch (error) {
      console.error('Error downloading CSV:', error);
      showError('Failed to download CSV');
    }
  };

  const toggleEmployee = (employeeId: string) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedEmployees(newExpanded);
  };

  const getMonthName = (month: number) => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[month - 1] || '';
  };

  const buildEmployeeTDSPdf = async (summary: TDSReportSummary): Promise<jsPDF> => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.setFont('helvetica');

    const dimensions = PDFBrandingUtils.getStandardDimensions();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const companyName = companySettings?.company_name || 'Kdadks Service Private Limited';

    let contentStartY = dimensions.topMargin;
    let contentEndY = pageHeight - dimensions.bottomMargin;

    if (companySettings) {
      const branding = await PDFBrandingUtils.applyBranding(pdf, companySettings, dimensions);
      contentStartY = branding.contentStartY;
      contentEndY = branding.contentEndY;
    }

    let y = contentStartY;
    const L = dimensions.leftMargin;
    const R = dimensions.rightMargin;
    const W = R - L;

    const addPageIfNeeded = async (needed = 10) => {
      if (y + needed > contentEndY) {
        pdf.addPage();
        contentStartY = dimensions.topMargin;
        contentEndY = pageHeight - dimensions.bottomMargin;
        if (companySettings) {
          const branding = await PDFBrandingUtils.applyBranding(pdf, companySettings, dimensions);
          contentStartY = branding.contentStartY;
          contentEndY = branding.contentEndY;
        }
        y = contentStartY;
      }
    };

    // ── Title ────────────────────────────────────────────────────────────────
    if (!companySettings?.header_image_data) {
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(companyName, L, y);
      y += 6;
    }

    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TDS Certificate / Tax Deducted at Source', L, y);
    y += 7;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const period = financialYear
      ? `Financial Year: ${financialYear}`
      : `Period: ${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')}`;
    pdf.text(period, L, y);
    y += 8;

    // ── Employee Info box ─────────────────────────────────────────────────────
    pdf.setFillColor(248, 250, 252);
    pdf.rect(L, y, W, 22, 'F');
    pdf.setDrawColor(203, 213, 225);
    pdf.rect(L, y, W, 22, 'S');

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(75, 85, 99);
    pdf.text('EMPLOYEE DETAILS', L + 3, y + 5);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(17, 24, 39);
    pdf.setFontSize(10);

    const col1 = L + 3;
    const col2 = L + W / 2;
    pdf.text(`Name: ${summary.employee_name}`, col1, y + 11);
    pdf.text(`Employee No: ${summary.employee_number}`, col2, y + 11);
    pdf.text(`PAN: ${summary.pan_number || 'Not Available'}`, col1, y + 17);
    pdf.text(`Total Entries: ${summary.entry_count}`, col2, y + 17);
    pdf.setTextColor(0, 0, 0);

    y += 28;

    // ── Summary totals ─────────────────────────────────────────────────────────
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(`Total Gross Salary: ₹${summary.total_gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, L, y);
    pdf.setTextColor(185, 28, 28);
    pdf.text(`Total TDS Deducted: ₹${summary.total_tds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col2, y);
    pdf.setTextColor(0, 0, 0);
    y += 10;

    // ── Detail table ───────────────────────────────────────────────────────────
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('DETAILED BREAKUP', L, y);
    y += 5;

    // Table header
    pdf.setFillColor(37, 99, 235);
    pdf.rect(L, y, W, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');

    const cols = {
      date: L + 2,
      source: L + 25,
      period: L + 52,
      gross: L + 90,
      tds: L + 130,
      remarks: L + 158,
    };

    pdf.text('Date', cols.date, y + 4.5);
    pdf.text('Source', cols.source, y + 4.5);
    pdf.text('Period', cols.period, y + 4.5);
    pdf.text('Gross (₹)', cols.gross, y + 4.5);
    pdf.text('TDS (₹)', cols.tds, y + 4.5);
    pdf.text('Remarks', cols.remarks, y + 4.5);
    pdf.setTextColor(0, 0, 0);
    y += 7;

    // Table rows
    let rowAlt = false;
    for (const entry of summary.entries) {
      await addPageIfNeeded(8);

      if (rowAlt) {
        pdf.setFillColor(249, 250, 251);
        pdf.rect(L, y, W, 7, 'F');
      }

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);

      pdf.text(new Date(entry.date).toLocaleDateString('en-IN'), cols.date, y + 4.5);
      const sourceLabel = entry.source_type === 'salary_slip' ? 'Salary' : 'Settlement';
      pdf.text(sourceLabel, cols.source, y + 4.5);
      pdf.text(`${getMonthName(entry.month)} ${entry.year}`, cols.period, y + 4.5);
      pdf.text(entry.gross_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), cols.gross, y + 4.5);
      pdf.setTextColor(185, 28, 28);
      pdf.text(entry.tds_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), cols.tds, y + 4.5);
      pdf.setTextColor(0, 0, 0);
      const remarkText = pdf.splitTextToSize(entry.remarks || '', R - cols.remarks - 2);
      pdf.text(remarkText[0] || '', cols.remarks, y + 4.5);

      // Row divider
      pdf.setDrawColor(229, 231, 235);
      pdf.line(L, y + 7, R, y + 7);

      y += 7;
      rowAlt = !rowAlt;
    }

    // Total footer row
    await addPageIfNeeded(10);
    pdf.setFillColor(243, 244, 246);
    pdf.rect(L, y, W, 8, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('TOTAL', cols.date, y + 5.5);
    pdf.text(summary.total_gross.toLocaleString('en-IN', { minimumFractionDigits: 2 }), cols.gross, y + 5.5);
    pdf.setTextColor(185, 28, 28);
    pdf.text(summary.total_tds.toLocaleString('en-IN', { minimumFractionDigits: 2 }), cols.tds, y + 5.5);
    pdf.setTextColor(0, 0, 0);
    y += 14;

    // ── Declaration ──────────────────────────────────────────────────────────
    await addPageIfNeeded(20);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    const declaration = 'This is a computer-generated TDS certificate. The amounts shown above have been deducted from the employee\'s salary as per the Income Tax Act, 1961.';
    const declLines = pdf.splitTextToSize(declaration, W);
    pdf.text(declLines, L, y);
    y += declLines.length * 4 + 8;

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Authorised Signatory', L, y);
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, R - 45, y);

    return pdf;
  };

  const handlePreviewPDF = async (summary: TDSReportSummary) => {
    try {
      setGeneratingPdf(summary.employee_id);
      const pdf = await buildEmployeeTDSPdf(summary);
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewEmployee(summary);
    } catch (error) {
      console.error('Error generating TDS PDF:', error);
      showError('Failed to generate TDS PDF');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleDownloadPDF = async (summary: TDSReportSummary) => {
    try {
      setGeneratingPdf(summary.employee_id);
      const pdf = await buildEmployeeTDSPdf(summary);
      const fyLabel = financialYear ? `_FY${financialYear}` : `_${startDate}_to_${endDate}`;
      pdf.save(`TDS_${summary.employee_number}_${summary.employee_name.replace(/\s+/g, '_')}${fyLabel}.pdf`);
      showSuccess('TDS PDF downloaded');
    } catch (error) {
      console.error('Error downloading TDS PDF:', error);
      showError('Failed to download TDS PDF');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewEmployee(null);
  };

  useEffect(() => {
    loadReport();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">TDS Report</h1>
            <p className="text-gray-600 mt-1">Tax Deducted at Source — Employee-wise Summary</p>
          </div>
          <button
            onClick={handleDownloadCSV}
            disabled={summaries.length === 0}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5 mr-2" />
            Download CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h3 className="text-md font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setFinancialYear(''); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setFinancialYear(''); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Financial Year</label>
            <select
              value={financialYear}
              onChange={(e) => handleFYChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select FY</option>
              {FINANCIAL_YEARS.map(fy => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={loadReport}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.total_employees}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total TDS</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  ₹{stats.total_tds.toLocaleString('en-IN')}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Gross</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  ₹{stats.total_gross.toLocaleString('en-IN')}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg TDS / Employee</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  ₹{stats.average_tds_per_employee.toLocaleString('en-IN')}
                </p>
              </div>
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* TDS Summary Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Employee-wise TDS Summary</h3>
          <p className="text-sm text-gray-600 mt-1">
            Period: {new Date(startDate).toLocaleDateString('en-IN')} to {new Date(endDate).toLocaleDateString('en-IN')}
            {financialYear && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">FY {financialYear}</span>}
          </p>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading TDS report...</p>
            </div>
          ) : summaries.length === 0 ? (
            <div className="p-8">
              <div className="text-center text-gray-500 mb-6">No TDS records found for the selected period</div>
              {diagnostics && (
                <div className="max-w-xl mx-auto bg-amber-50 border border-amber-200 rounded-lg p-5">
                  <p className="font-semibold text-amber-900 mb-3">Diagnostic Information</p>
                  <div className="space-y-2 text-sm text-amber-800">
                    <div className="flex justify-between">
                      <span>Salary slips in period:</span>
                      <span className="font-medium">{diagnostics.total_salary_slips}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Salary slips with TDS &gt; 0:</span>
                      <span className={`font-medium ${diagnostics.slips_with_tds === 0 ? 'text-red-700' : 'text-green-700'}`}>
                        {diagnostics.slips_with_tds}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Employees with slips:</span>
                      <span className="font-medium">{diagnostics.employees_with_slips}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>F&F Settlements in period:</span>
                      <span className="font-medium">{diagnostics.total_settlements}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Settlements with TDS &gt; 0:</span>
                      <span className={`font-medium ${diagnostics.settlements_with_tds === 0 ? 'text-red-700' : 'text-green-700'}`}>
                        {diagnostics.settlements_with_tds}
                      </span>
                    </div>
                    {diagnostics.sample_slip && (
                      <div className="mt-3 pt-3 border-t border-amber-300">
                        <p className="font-medium mb-1">Sample slip found:</p>
                        <p>{diagnostics.sample_slip.year}-{String(diagnostics.sample_slip.month).padStart(2,'0')} · Gross: ₹{diagnostics.sample_slip.gross?.toLocaleString('en-IN')} · TDS: ₹{diagnostics.sample_slip.tds?.toLocaleString('en-IN')}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-amber-300 text-xs text-amber-700">
                    {diagnostics.total_salary_slips === 0
                      ? 'No salary slips found in this period. Generate salary slips first via Compensation Management.'
                      : diagnostics.slips_with_tds === 0
                        ? 'Salary slips exist but TDS is ₹0 on all of them. This happens when employee salaries are below the taxable income threshold (₹5 lakh/year under new regime or ₹2.5 lakh under old regime). TDS is only deducted when annual gross exceeds these limits.'
                        : 'Slips with TDS exist — try a wider date range or different financial year.'
                    }
                  </div>
                </div>
              )}
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PAN Number</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entries</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Gross</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total TDS</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summaries.map((summary) => (
                  <React.Fragment key={summary.employee_id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{summary.employee_name}</div>
                          <div className="text-sm text-gray-500">{summary.employee_number}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {summary.pan_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        {summary.entry_count}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                        ₹{summary.total_gross.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-red-600">
                        ₹{summary.total_tds.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => toggleEmployee(summary.employee_id)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium whitespace-nowrap"
                          >
                            {expandedEmployees.has(summary.employee_id) ? 'Hide' : 'Details'}
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => handlePreviewPDF(summary)}
                            disabled={generatingPdf === summary.employee_id}
                            className="text-purple-600 hover:text-purple-900 disabled:opacity-50 flex items-center gap-1 text-sm font-medium"
                            title="Preview TDS PDF"
                          >
                            {generatingPdf === summary.employee_id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                            Preview
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => handleDownloadPDF(summary)}
                            disabled={generatingPdf === summary.employee_id}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50 flex items-center gap-1 text-sm font-medium"
                            title="Download TDS PDF"
                          >
                            <Download className="w-4 h-4" />
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Details */}
                    {expandedEmployees.has(summary.employee_id) && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead>
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Source</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Month/Year</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Gross Amount</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">TDS Amount</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Remarks</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {summary.entries.map((entry, idx) => (
                                  <tr key={idx} className="hover:bg-gray-100">
                                    <td className="px-4 py-2 text-sm">
                                      {new Date(entry.date).toLocaleDateString('en-IN')}
                                    </td>
                                    <td className="px-4 py-2 text-sm">
                                      <span className={`px-2 py-1 text-xs rounded-full ${
                                        entry.source_type === 'salary_slip'
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-purple-100 text-purple-800'
                                      }`}>
                                        {entry.source_type === 'salary_slip' ? 'Salary' : 'Settlement'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-sm">
                                      {getMonthName(entry.month)} {entry.year}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right">
                                      ₹{entry.gross_amount.toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right text-red-600 font-medium">
                                      ₹{entry.tds_amount.toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-600">
                                      {entry.remarks}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr className="font-semibold">
                  <td colSpan={3} className="px-6 py-4 text-right">TOTAL:</td>
                  <td className="px-6 py-4 text-right">
                    ₹{summaries.reduce((sum, s) => sum + s.total_gross, 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-right text-red-600">
                    ₹{summaries.reduce((sum, s) => sum + s.total_tds, 0).toLocaleString('en-IN')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* PDF Preview Modal */}
      {previewUrl && previewEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col" style={{ height: '90vh' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">TDS Certificate Preview</h3>
                <p className="text-sm text-gray-500">
                  {previewEmployee.employee_name} ({previewEmployee.employee_number})
                  {financialYear && ` · FY ${financialYear}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadPDF(previewEmployee)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  onClick={closePreview}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title="TDS Certificate Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TDSReport;
