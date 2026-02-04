import { useState, useEffect } from 'react';
import { Download, Eye, Calendar, DollarSign, TrendingUp, FileText, X } from 'lucide-react';
import { employeeService } from '../../services/employeeService';
import { invoiceService } from '../../services/invoiceService';
import type { SalarySlip, Employee } from '../../types/employee';
import { generateSalarySlipPDF } from '../../utils/salarySlipPDFGenerator';
import { useToast } from '../ui/ToastProvider';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function EmployeeSalarySlips() {
  const { showSuccess, showError } = useToast();
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState<SalarySlip | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [previewPdf, setPreviewPdf] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const currentUser = (() => {
    const session = sessionStorage.getItem('employee_session');
    if (session) {
      const employee = JSON.parse(session);
      return { id: employee.id, name: employee.name };
    }
    return { id: '', name: '' };
  })();

  useEffect(() => {
    loadSalarySlips();
    loadEmployeeData();
  }, [selectedYear]);

  const loadEmployeeData = async () => {
    try {
      const employee = await employeeService.getEmployeeById(currentUser.id);
      setCurrentEmployee(employee);
    } catch (error) {
      console.error('Error loading employee data:', error);
    }
  };

  const loadSalarySlips = async () => {
    try {
      setLoading(true);
      const slips = await employeeService.getSalarySlips(currentUser.id, undefined, selectedYear);
      // Sort by month in descending order (latest first)
      const sortedSlips = slips.sort((a, b) => b.salary_month - a.salary_month);
      setSalarySlips(sortedSlips);
    } catch (error) {
      console.error('Error loading salary slips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSlip = async (slip: SalarySlip) => {
    try {
      if (!currentEmployee) {
        showError('Employee data not loaded');
        return;
      }

      setSelectedSlip(slip);

      // Get company settings for branding
      const companySettingsArray = await invoiceService.getCompanySettings();
      const companySettings = companySettingsArray?.[0];

      // Generate PDF for preview
      const pdf = await generateSalarySlipPDF(currentEmployee, slip, companySettings);
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      setPreviewPdf(pdfUrl);
      setShowPreview(true);
    } catch (error) {
      console.error('Error previewing salary slip:', error);
      showError('Failed to preview salary slip');
    }
  };

  const handleDownloadSlip = async (slip: SalarySlip) => {
    try {
      setDownloading(slip.id);

      if (!currentEmployee) {
        showError('Employee data not loaded');
        return;
      }

      // Get company settings for branding
      const companySettingsArray = await invoiceService.getCompanySettings();
      const companySettings = companySettingsArray?.[0];

      // Generate PDF
      const pdf = await generateSalarySlipPDF(currentEmployee, slip, companySettings);

      // Download the PDF
      const fileName = `Salary_Slip_${MONTH_NAMES[slip.salary_month - 1]}_${slip.salary_year}_${currentEmployee.employee_number}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error downloading salary slip:', error);
      showError('Failed to download salary slip');
    } finally {
      setDownloading(null);
    }
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    // Show last 5 years and current year
    for (let i = 0; i <= 5; i++) {
      years.push(currentYear - i);
    }
    return years;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
      approved: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Approved' },
      paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'Paid' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Salary Slips</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">View and download your salary slips</p>
      </div>

      {/* Year Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Calendar className="w-5 h-5 text-gray-500 flex-shrink-0" />
            <label className="text-sm font-medium text-gray-700 hidden sm:inline">Filter by Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              {getYearOptions().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-600">
            {salarySlips.length} {salarySlips.length === 1 ? 'slip' : 'slips'} found
          </div>
        </div>
      </div>

      {/* Salary Slips List */}
      {salarySlips.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
          <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No salary slips found</h3>
          <p className="text-sm text-gray-600">There are no salary slips for the year {selectedYear}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {salarySlips.map(slip => (
            <div
              key={slip.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-4 sm:p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                      {MONTH_NAMES[slip.salary_month - 1]} {slip.salary_year}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">FY: {slip.financial_year}</p>
                  </div>
                  {getStatusBadge(slip.status)}
                </div>

                {/* Salary Details */}
                <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Gross Salary:</span>
                    <span className="font-medium text-gray-900">₹{slip.gross_salary.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Deductions:</span>
                    <span className="font-medium text-red-600">-₹{slip.total_deductions.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pt-2 sm:pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">Net Salary:</span>
                      <span className="text-base sm:text-lg font-bold text-green-600">₹{slip.net_salary.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Attendance Info */}
                  <div className="pt-2 sm:pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-2 text-[10px] sm:text-xs text-gray-600">
                      <div className="text-center">
                        <div className="font-medium text-gray-700">{slip.working_days}</div>
                        <div>Working</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-700">{slip.paid_days}</div>
                        <div>Paid</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-700">{slip.lop_days}</div>
                        <div>LOP</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewSlip(slip)}
                    className="flex-1 flex items-center justify-center px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors touch-manipulation"
                  >
                    <Eye className="w-4 h-4 mr-1 sm:mr-2" />
                    View
                  </button>
                  <button
                    onClick={() => handleDownloadSlip(slip)}
                    disabled={downloading === slip.id}
                    className="flex-1 flex items-center justify-center px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors disabled:opacity-50 touch-manipulation"
                  >
                    {downloading === slip.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700 mr-1 sm:mr-2"></div>
                        <span className="hidden sm:inline">Downloading...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-1 sm:mr-2" />
                        Download
                      </>
                    )}
                  </button>
                </div>

                {/* Payment Info */}
                {slip.status === 'paid' && slip.payment_date && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center text-xs text-gray-600">
                      <DollarSign className="w-3 h-3 mr-1" />
                      Paid on {new Date(slip.payment_date).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPreview && previewPdf && selectedSlip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[95vh] sm:h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b">
              <h2 className="text-sm sm:text-lg font-semibold truncate mr-2">
                Salary - {MONTH_NAMES[selectedSlip.salary_month - 1]} {selectedSlip.salary_year}
              </h2>
              <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                <button
                  onClick={() => handleDownloadSlip(selectedSlip)}
                  disabled={downloading === selectedSlip.id}
                  className="flex items-center px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 touch-manipulation"
                >
                  {downloading === selectedSlip.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1 sm:mr-2"></div>
                      <span className="hidden sm:inline">Downloading...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Download</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    if (previewPdf) {
                      URL.revokeObjectURL(previewPdf);
                      setPreviewPdf(null);
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <iframe
                src={previewPdf}
                className="w-full h-full"
                title="Salary Slip Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
