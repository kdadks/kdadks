import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  TrendingUp,
  DollarSign,
  Users,
  RefreshCw
} from 'lucide-react';
import { tdsReportService, TDSReportSummary } from '../../services/tdsReportService';
import { useToast } from '../ui/ToastProvider';

interface TDSReportProps {
  onBackToDashboard?: () => void;
}

const TDSReport: React.FC<TDSReportProps> = ({ onBackToDashboard }) => {
  const [loading, setLoading] = useState(false);
  const [summaries, setSummaries] = useState<TDSReportSummary[]>([]);
  const [stats, setStats] = useState<any>(null);
  const { showSuccess, showError } = useToast();

  // Filter state
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
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      const [reportData, statsData] = await Promise.all([
        tdsReportService.getTDSReport({
          start_date: startDate,
          end_date: endDate
        }),
        tdsReportService.getTDSStats(startDate, endDate)
      ]);

      setSummaries(reportData);
      setStats(statsData);
      showSuccess('TDS report loaded successfully');
    } catch (error) {
      console.error('Error loading TDS report:', error);
      showError('Failed to load TDS report');
    } finally {
      setLoading(false);
    }
  };

  const loadFinancialYearReport = async (fy: string) => {
    try {
      setLoading(true);
      const [fyStartYear, fyEndYear] = fy.split('-').map(y => parseInt(y.length === 2 ? `20${y}` : y));
      const fyStartDate = `${fyStartYear}-04-01`;
      const fyEndDate = `${fyEndYear}-03-31`;

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

  useEffect(() => {
    loadReport();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBackToDashboard}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">TDS Report</h1>
            <p className="text-gray-600 mt-1">Tax Deducted at Source - Employee-wise Summary</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Financial Year
            </label>
            <select
              value={financialYear}
              onChange={(e) => {
                setFinancialYear(e.target.value);
                if (e.target.value) {
                  loadFinancialYearReport(e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select FY</option>
              <option value="2024-25">2024-25</option>
              <option value="2023-24">2023-24</option>
              <option value="2022-23">2022-23</option>
              <option value="2021-22">2021-22</option>
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
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {stats.total_employees}
                </p>
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
                <p className="text-sm text-gray-600">Avg TDS/Employee</p>
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
          </p>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading TDS report...</p>
            </div>
          ) : summaries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No TDS records found for the selected period
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
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleEmployee(summary.employee_id)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          {expandedEmployees.has(summary.employee_id) ? 'Hide Details' : 'View Details'}
                        </button>
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
                                      {entry.month}/{entry.year}
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
    </div>
  );
};

export default TDSReport;
