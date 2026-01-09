import React, { useState, useEffect } from 'react';
import { Calendar, Save, X, AlertCircle } from 'lucide-react';
import { leaveService } from '../../services/leaveService';
import { leaveAttendanceService } from '../../services/leaveAttendanceService';
import { useToast } from '../ui/ToastProvider';

interface LeaveType {
  id: string;
  name: string;
  code: string;
  description?: string;
  balance?: number;
}

interface LeaveBalance {
  leave_type: string;
  allocated: number;
  used: number;
  carried_forward: number;
  total_available: number;
  remaining: number;
}

interface LeaveHistoryItem {
  id: string;
  leave_types?: { name: string };
  from_date: string;
  to_date: string;
  total_days: number;
  status: string;
  reason?: string;
}

export default function LeaveManagement() {
  const { showSuccess, showError } = useToast();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance[]>([]);
  const [leaveHistory, setLeaveHistory] = useState<LeaveHistoryItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    leave_type_id: '',
    from_date: '',
    to_date: '',
    reason: '',
  });
  const [currentUser] = useState(() => {
    const session = sessionStorage.getItem('employee_session');
    if (session) {
      const employee = JSON.parse(session);
      return { id: employee.id };
    }
    return { id: '' };
  });

  useEffect(() => {
    loadLeaveData();
  }, []);

  const loadLeaveData = async () => {
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();

      // Load leave types from database
      const types = await leaveAttendanceService.getLeaveTypes();
      
      // Load leave balance for current employee
      const balanceData = await leaveAttendanceService.getEmployeeLeaveBalance(currentUser.id);
      
      // Merge leave types with their balances
      const typesWithBalances = types.map(type => {
        const balance = balanceData.find(b => b.leave_type_id === type.id);
        return {
          ...type,
          balance: balance ? balance.available : 0,
          balanceDetails: balance // Store full balance details for display
        };
      });
      
      setLeaveTypes(typesWithBalances || []);

      // Format balance data for display section
      const formattedBalance = balanceData.map(b => {
        const type = types.find(t => t.id === b.leave_type_id);
        return {
          leave_type: type?.name || 'Unknown',
          allocated: b.opening_balance + b.earned + b.carry_forward,
          used: b.taken,
          carried_forward: b.carry_forward,
          total_available: b.opening_balance + b.earned + b.carry_forward,
          remaining: b.available
        };
      });
      setLeaveBalance(formattedBalance);

      // Load leave history
      const history = await leaveService.getEmployeeLeaves(currentUser.id);
      setLeaveHistory(history || []);
    } catch (error) {
      console.error('Error loading leave data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Calculate requested days
      const requestedDays = calculateDays();
      
      // Find the selected leave type with balance
      const selectedLeaveType = leaveTypes.find(lt => lt.id === formData.leave_type_id);
      
      // Check if employee has sufficient balance
      if (!selectedLeaveType || selectedLeaveType.balance === undefined || selectedLeaveType.balance <= 0) {
        alert(`You don't have any ${selectedLeaveType?.name || 'leave'} balance available. Please contact HR to allocate leaves.`);
        setLoading(false);
        return;
      }
      
      if (selectedLeaveType.balance < requestedDays) {
        alert(`Insufficient leave balance. You have ${selectedLeaveType.balance} days remaining, but requested ${requestedDays} days.`);
        setLoading(false);
        return;
      }
      
      await leaveService.requestLeave({
        employee_id: currentUser.id,
        leave_type_id: formData.leave_type_id,
        from_date: formData.from_date,
        to_date: formData.to_date,
        reason: formData.reason,
      });

      // Reset form
      setFormData({
        leave_type_id: '',
        from_date: '',
        to_date: '',
        reason: '',
      });
      setShowForm(false);

      // Reload data
      await loadLeaveData();

      showSuccess('Leave application submitted successfully!');
    } catch (error) {
      console.error('Error submitting leave:', error);
      showError('Failed to submit leave application');
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = () => {
    if (formData.from_date && formData.to_date) {
      const start = new Date(formData.from_date);
      const end = new Date(formData.to_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return days > 0 ? days : 0;
    }
    return 0;
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600 mt-2">Apply for leaves and track your leave balance</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center"
        >
          <Calendar className="w-5 h-5 mr-2" />
          Apply for Leave
        </button>
      </div>

      {/* Leave Application Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">New Leave Application</h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Leave Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leave Type *
                </label>
                <select
                  value={formData.leave_type_id}
                  onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select leave type</option>
                  {leaveTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.code}) - Balance: {type.balance || 0} days
                    </option>
                  ))}
                </select>
                {formData.leave_type_id && (() => {
                  const selectedType = leaveTypes.find(lt => lt.id === formData.leave_type_id);
                  if (!selectedType || selectedType.balance === undefined || selectedType.balance === 0) {
                    return (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">
                          You don't have any balance for this leave type. Please contact HR to allocate leaves.
                        </p>
                      </div>
                    );
                  }
                  if (selectedType.balance !== undefined && selectedType.balance < calculateDays() && calculateDays() > 0) {
                    return (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-700">
                          Insufficient balance. You have {selectedType.balance} days remaining, but requesting {calculateDays()} days.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Days
                </label>
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                  {calculateDays()} days
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.from_date}
                  onChange={(e) => setFormData({ ...formData, from_date: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.to_date}
                  onChange={(e) => setFormData({ ...formData, to_date: e.target.value })}
                  required
                  min={formData.from_date}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason *
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Provide a brief reason for your leave"
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || (() => {
                  const selectedType = leaveTypes.find(lt => lt.id === formData.leave_type_id);
                  return selectedType && selectedType.balance !== undefined && selectedType.balance <= 0;
                })()}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Submit Application
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Leave Balance */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave Balance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {leaveBalance.map((balance, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700 font-medium">{balance.leave_type}</span>
                <Calendar className="w-5 h-5 text-primary-600" />
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Allocated:</span>
                  <span className="font-semibold">{balance.allocated} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Used:</span>
                  <span className="font-semibold">{balance.used} days</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="text-gray-900 font-medium">Remaining:</span>
                  <span className="font-bold text-primary-600">{balance.remaining} days</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leave History */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Leave Type
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Start Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  End Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Days
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaveHistory.map((leave) => (
                <tr key={leave.id}>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900">
                    {leave.leave_types?.name || 'N/A'}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                    {new Date(leave.from_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                    {new Date(leave.to_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                    {leave.total_days}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(leave.status)}`}>
                      {leave.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-600 max-w-xs truncate">
                    {leave.reason}
                  </td>
                </tr>
              ))}
              {leaveHistory.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    No leave history found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

