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
  currentUserId?: string;
}

type ActiveTab = 'applications' | 'balances' | 'allocate';

const LeaveManagement: React.FC<LeaveManagementProps> = ({ onBackToDashboard, currentUserId }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('applications');
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [balances, setBalances] = useState<EmployeeLeaveBalance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEmployeeForAllocation, setSelectedEmployeeForAllocation] = useState<string>('');
  const [selectedEmployeeForBalance, setSelectedEmployeeForBalance] = useState<string>('');
  const [selectedFinancialYear, setSelectedFinancialYear] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    return month >= 4 ? `${year}-${(year + 1).toString().slice(-2)}` : `${year - 1}-${year.toString().slice(-2)}`;
  });
  const [allocationBalances, setAllocationBalances] = useState<EmployeeLeaveBalance[]>([]);
  const [approvingLeaveId, setApprovingLeaveId] = useState<string | null>(null);
  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null);
  const [updatingAllocation, setUpdatingAllocation] = useState(false);
  const { showSuccess, showError } = useToast();

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
      setSelectedEmployeeForBalance(employeeId);
      if (!employeeId) {
        setBalances([]);
        return;
      }
      const balanceData = await leaveAttendanceService.getEmployeeLeaveBalance(employeeId);
      setBalances(balanceData);
    } catch (error) {
      console.error('Error loading leave balances:', error);
    }
  };

  const loadAllocationBalances = async (employeeId: string, financialYear?: string) => {
    try {
      setSelectedEmployeeForAllocation(employeeId);
      
      if (!employeeId) {
        setAllocationBalances([]);
        return;
      }
      
      const fy = financialYear || selectedFinancialYear;
      
      // Try to get existing balances
      let balanceData = await leaveAttendanceService.getEmployeeLeaveBalance(employeeId, fy);
      
      // If no balances exist, initialize them
      if (!balanceData || balanceData.length === 0) {
        await leaveAttendanceService.initializeLeaveBalance(employeeId, fy);
        balanceData = await leaveAttendanceService.getEmployeeLeaveBalance(employeeId, fy);
      }
      
      setAllocationBalances(balanceData);
    } catch (error) {
      console.error('Error loading allocation balances:', error);
      showError('Failed to load leave allocation');
    }
  };

  const handleUpdateAllocation = async () => {
    try {
      if (!selectedEmployeeForAllocation) {
        showError('Please select an employee');
        return;
      }

      setUpdatingAllocation(true);

      // Update each leave balance
      for (const balance of allocationBalances) {
        const available = balance.opening_balance + balance.earned + balance.carry_forward - balance.taken;
        
        await leaveAttendanceService.updateLeaveAllocation(
          selectedEmployeeForAllocation,
          balance.leave_type_id,
          {
            opening_balance: balance.opening_balance,
            earned: balance.earned,
            carry_forward: balance.carry_forward,
            available: Math.max(0, available)
          },
          selectedFinancialYear
        );
      }

      showSuccess('Leave allocation updated successfully!');
      await loadAllocationBalances(selectedEmployeeForAllocation);
    } catch (error) {
      console.error('Error updating leave allocation:', error);
      showError('Failed to update leave allocation');
    } finally {
      setUpdatingAllocation(false);
    }
  };



  const handleApproveLeave = async (id: string) => {
    try {
      setApprovingLeaveId(id);
      await leaveAttendanceService.approveLeave(id, currentUserId || 'system');
      showSuccess('Leave approved successfully');
      loadData();
    } catch (error: any) {
      console.error('Error approving leave:', error);
      showError(error.message || 'Failed to approve leave');
    } finally {
      setApprovingLeaveId(null);
    }
  };

  const handleRejectLeave = async (id: string) => {
    try {
      setRejectingLeaveId(id);
      await leaveAttendanceService.rejectLeave(id, currentUserId || 'system', 'Rejected by admin');
      showSuccess('Leave rejected');
      loadData();
    } catch (error: any) {
      console.error('Error rejecting leave:', error);
      showError(error.message || 'Failed to reject leave');
    } finally {
      setRejectingLeaveId(null);
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
            <h1 className="text-xl font-semibold text-gray-900">Leave Management</h1>
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
              onClick={() => setActiveTab('allocate')}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'allocate'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Allocate Leaves
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
                                disabled={approvingLeaveId === app.id}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed relative"
                                title="Approve"
                              >
                                {approvingLeaveId === app.id ? (
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                                ) : (
                                  <CheckCircle className="w-5 h-5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleRejectLeave(app.id)}
                                disabled={rejectingLeaveId === app.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed relative"
                                title="Reject"
                              >
                                {rejectingLeaveId === app.id ? (
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                                ) : (
                                  <XCircle className="w-5 h-5" />
                                )}
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
                value={selectedEmployeeForBalance}
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

            {selectedEmployeeForBalance && balances.length > 0 && (
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

        {/* Allocate Leaves Tab */}
        {activeTab === 'allocate' && (
          <div>
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Financial Year *
                </label>
                <select
                  value={selectedFinancialYear}
                  onChange={(e) => {
                    setSelectedFinancialYear(e.target.value);
                    if (selectedEmployeeForAllocation) {
                      loadAllocationBalances(selectedEmployeeForAllocation, e.target.value);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="2023-24">2023-24</option>
                  <option value="2024-25">2024-25</option>
                  <option value="2025-26">2025-26</option>
                  <option value="2026-27">2026-27</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Employee *
                </label>
                <select
                  value={selectedEmployeeForAllocation}
                  onChange={(e) => loadAllocationBalances(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an employee</option>
                  {employees.filter(e => e.employment_status === 'active').map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_number})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {allocationBalances.length > 0 && (
              <div className="bg-white shadow-md rounded-lg p-4">
                <div className="mb-4">
                  <h2 className="text-base font-semibold text-gray-900 mb-1">Leave Allocation</h2>
                  <p className="text-xs text-gray-600">
                    Set the number of leaves allocated to this employee. Available = Opening + Earned + Carry Forward - Taken.
                  </p>
                </div>

                <div className="space-y-3">
                  {allocationBalances.map((balance, index) => {
                    const balanceWithType = balance as typeof balance & { leave_type?: { name: string; code: string; max_days_per_year: number } };
                    return (
                      <div key={balance.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">{balanceWithType.leave_type?.name}</h3>
                            <p className="text-xs text-gray-500">{balanceWithType.leave_type?.code} - Max: {balanceWithType.leave_type?.max_days_per_year} days/year</p>
                          </div>
                          <span className="text-base font-semibold text-green-600">
                            Available: {(balance.opening_balance + balance.earned + balance.carry_forward - balance.taken).toFixed(1)} days
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Opening Balance
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={balance.opening_balance}
                              onChange={(e) => {
                                const newBalances = [...allocationBalances];
                                newBalances[index] = { ...balance, opening_balance: parseFloat(e.target.value) || 0 };
                                setAllocationBalances(newBalances);
                              }}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Earned (This Year)
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max={balanceWithType.leave_type?.max_days_per_year || 999}
                              value={balance.earned}
                              onChange={(e) => {
                                const newBalances = [...allocationBalances];
                                newBalances[index] = { ...balance, earned: parseFloat(e.target.value) || 0 };
                                setAllocationBalances(newBalances);
                              }}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Carry Forward
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={balance.carry_forward}
                              onChange={(e) => {
                                const newBalances = [...allocationBalances];
                                newBalances[index] = { ...balance, carry_forward: parseFloat(e.target.value) || 0 };
                                setAllocationBalances(newBalances);
                              }}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Taken (Read-only)
                            </label>
                            <input
                              type="number"
                              value={balance.taken}
                              readOnly
                              className="w-full px-2 py-1.5 border border-gray-300 rounded bg-gray-50 text-sm text-gray-600"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setSelectedEmployeeForAllocation('');
                      setAllocationBalances([]);
                      setActiveTab('applications');
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md hover:from-red-600 hover:to-red-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateAllocation}
                    disabled={updatingAllocation}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {updatingAllocation ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Update Allocation
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {selectedEmployeeForAllocation && allocationBalances.length === 0 && (
              <div className="bg-white shadow-md rounded-lg p-12 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No leave types found. Please configure leave types first.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default LeaveManagement;
