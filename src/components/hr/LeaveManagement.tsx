import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  ArrowLeft
} from 'lucide-react';
import { leaveAttendanceService } from '../../services/leaveAttendanceService';
import { employeeService } from '../../services/employeeService';
import { useToast } from '../ui/ToastProvider';
import type {
  LeaveApplication,
  LeaveType,
  EmployeeLeaveBalance
} from '../../types/payroll';
import type { Employee } from '../../types/employee';

interface LeaveManagementProps {
  onBackToDashboard?: () => void;
}

type ActiveTab = 'applications' | 'balances' | 'apply';

const LeaveManagement: React.FC<LeaveManagementProps> = ({ onBackToDashboard }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('applications');
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [balances, setBalances] = useState<EmployeeLeaveBalance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { showSuccess, showError } = useToast();

  // Leave application form state
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    leave_type_id: '',
    from_date: '',
    to_date: '',
    days_requested: 0,
    reason: '',
    half_day: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [apps, types, emps] = await Promise.all([
        leaveAttendanceService.getLeaveApplications(),
        leaveAttendanceService.getLeaveTypes(),
        employeeService.getEmployees()
      ]);

      setLeaveApplications(apps);
      setLeaveTypes(types);
      setEmployees(emps);
    } catch (error) {
      console.error('Error loading leave data:', error);
      showError('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeBalances = async (employeeId: string) => {
    try {
      const balanceData = await leaveAttendanceService.getEmployeeLeaveBalance(employeeId);
      setBalances(balanceData);
    } catch (error) {
      console.error('Error loading leave balances:', error);
    }
  };

  const calculateLeaveDays = () => {
    if (!leaveForm.from_date || !leaveForm.to_date) return;

    const start = new Date(leaveForm.from_date);
    const end = new Date(leaveForm.to_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    setLeaveForm({
      ...leaveForm,
      days_requested: leaveForm.half_day ? 0.5 : diffDays
    });
  };

  useEffect(() => {
    calculateLeaveDays();
  }, [leaveForm.from_date, leaveForm.to_date, leaveForm.half_day]);

  const handleApplyLeave = async () => {
    try {
      if (!leaveForm.employee_id || !leaveForm.leave_type_id || !leaveForm.from_date || !leaveForm.to_date) {
        showError('Please fill all required fields');
        return;
      }

      await leaveAttendanceService.applyLeave(leaveForm);
      showSuccess('Leave application submitted successfully');
      setLeaveForm({
        employee_id: '',
        leave_type_id: '',
        from_date: '',
        to_date: '',
        days_requested: 0,
        reason: '',
        half_day: false
      });
      setActiveTab('applications');
      loadData();
    } catch (error: any) {
      console.error('Error applying leave:', error);
      showError(error.message || 'Failed to apply leave');
    }
  };

  const handleApproveLeave = async (id: string) => {
    try {
      // Using a placeholder approverId - in production this should come from auth context
      await leaveAttendanceService.approveLeave(id, 'admin');
      showSuccess('Leave approved successfully');
      loadData();
    } catch (error: any) {
      console.error('Error approving leave:', error);
      showError(error.message || 'Failed to approve leave');
    }
  };

  const handleRejectLeave = async (id: string) => {
    try {
      // Using a placeholder approverId and reason - in production these should come from UI
      await leaveAttendanceService.rejectLeave(id, 'admin', 'Rejected by admin');
      showSuccess('Leave rejected');
      loadData();
    } catch (error: any) {
      console.error('Error rejecting leave:', error);
      showError(error.message || 'Failed to reject leave');
    }
  };

  const filteredApplications = leaveApplications.filter(app => {
    const matchesSearch = searchTerm === '' ||
      employees.find(e => e.id === app.employee_id)?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3 mr-1 inline" />
        {status}
      </span>
    );
  };

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
              {onBackToDashboard && (
                <button
                  onClick={onBackToDashboard}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Dashboard
                </button>
              )}
              <h1 className="text-xl font-semibold text-gray-900">Leave Management</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-4 py-4">
            <button
              onClick={() => setActiveTab('applications')}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'applications'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Leave Applications
            </button>
            <button
              onClick={() => setActiveTab('balances')}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'balances'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Leave Balances
            </button>
            <button
              onClick={() => setActiveTab('apply')}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'apply'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plus className="w-4 h-4 mr-2" />
              Apply Leave
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Leave Applications Tab */}
        {activeTab === 'applications' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex-1 max-w-md flex space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by employee name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leave Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days
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
                  {filteredApplications.map((app) => {
                    const employee = employees.find(e => e.id === app.employee_id);
                    const leaveType = leaveTypes.find(lt => lt.id === app.leave_type_id);
                    return (
                      <tr key={app.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{employee?.full_name}</div>
                          <div className="text-sm text-gray-500">{employee?.employee_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{leaveType?.name}</div>
                          <div className="text-sm text-gray-500">{leaveType?.code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(app.from_date).toLocaleDateString('en-GB')} - {new Date(app.to_date).toLocaleDateString('en-GB')}
                          </div>
                          {app.reason && <div className="text-sm text-gray-500 max-w-xs truncate">{app.reason}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {app.total_days} {app.half_day ? '(Half Day)' : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(app.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {app.status === 'pending' && (
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleApproveLeave(app.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Approve"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleRejectLeave(app.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Reject"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </div>
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

        {/* Leave Balances Tab */}
        {activeTab === 'balances' && (
          <div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Employee
              </label>
              <select
                onChange={(e) => loadEmployeeBalances(e.target.value)}
                className="max-w-md px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select an employee</option>
                {employees.filter(e => e.employment_status === 'active').map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.employee_number})
                  </option>
                ))}
              </select>
            </div>

            {balances.length > 0 && (
              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Leave Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Opening
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Earned
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Taken
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Available
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {balances.map((balance) => {
                      const balanceWithType = balance as typeof balance & { leave_type?: { name: string; code: string } };
                      return (
                      <tr key={balance.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{balanceWithType.leave_type?.name}</div>
                          <div className="text-sm text-gray-500">{balanceWithType.leave_type?.code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {balance.opening_balance}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {balance.earned}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {balance.taken}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {balance.available}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Apply Leave Tab */}
        {activeTab === 'apply' && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-6">Apply for Leave</h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee *
                  </label>
                  <select
                    value={leaveForm.employee_id}
                    onChange={(e) => {
                      setLeaveForm({ ...leaveForm, employee_id: e.target.value });
                      loadEmployeeBalances(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.filter(e => e.employment_status === 'active').map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Leave Type *
                  </label>
                  <select
                    value={leaveForm.leave_type_id}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leave_type_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select leave type</option>
                    {leaveTypes.map(lt => (
                      <option key={lt.id} value={lt.id}>
                        {lt.name} ({lt.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={leaveForm.from_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, from_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={leaveForm.to_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, to_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Days Requested
                  </label>
                  <input
                    type="number"
                    value={leaveForm.days_requested}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>

                <div className="flex items-center pt-7">
                  <input
                    type="checkbox"
                    checked={leaveForm.half_day}
                    onChange={(e) => setLeaveForm({ ...leaveForm, half_day: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Half Day Leave
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason
                  </label>
                  <textarea
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Reason for leave application..."
                  />
                </div>
              </div>

              {balances.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Available Leave Balance</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {balances.map((balance) => {
                      const balanceWithType = balance as typeof balance & { leave_type?: { name: string; code: string } };
                      return (
                      <div key={balance.id} className="text-sm">
                        <div className="text-gray-600">{balanceWithType.leave_type?.code}</div>
                        <div className="text-lg font-semibold text-blue-900">{balance.available} days</div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setActiveTab('applications')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyLeave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Submit Leave Application
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LeaveManagement;
