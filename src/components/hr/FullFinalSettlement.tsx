import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Search,
  Eye,
  Edit,
  Download,
  CheckCircle,
  XCircle,
  DollarSign,
  FileText,
  Calendar,
  User,
  Trash2,
  Save
} from 'lucide-react';
import { settlementService } from '../../services/settlementService';
import { employeeService } from '../../services/employeeService';
import { useToast } from '../ui/ToastProvider';
import type {
  FullFinalSettlement,
  CreateSettlementInput,
  Employee
} from '../../types/employee';

interface FullFinalSettlementProps {
  onBackToDashboard?: () => void;
}

type ActiveView = 'list' | 'create' | 'view' | 'edit' | 'preview';

const FullFinalSettlementComponent: React.FC<FullFinalSettlementProps> = ({
  onBackToDashboard
}) => {
  const [settlements, setSettlements] = useState<FullFinalSettlement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('list');
  const [selectedSettlement, setSelectedSettlement] = useState<FullFinalSettlement | null>(null);
  const [previewData, setPreviewData] = useState<Partial<FullFinalSettlement> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { showSuccess, showError } = useToast();

  // Form state
  const [formData, setFormData] = useState<CreateSettlementInput>({
    employee_id: '',
    date_of_leaving: '',
    relieving_date: '',
    last_working_day: '',
    reason_for_leaving: '',
    notice_period_days: 30,
    notice_period_served: 0,
    bonus_amount: 0,
    incentive_amount: 0,
    gratuity_amount: 0,
    advance_recovery: 0,
    loan_recovery: 0,
    asset_recovery: 0,
    other_dues: 0,
    other_recoveries: 0,
    assets_returned: false,
    asset_clearance_remarks: '',
    remarks: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settlementsData, employeesData] = await Promise.all([
        settlementService.getSettlements(),
        employeeService.getEmployees()
      ]);

      setSettlements(settlementsData);
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewSettlement = async () => {
    try {
      if (!formData.employee_id || !formData.last_working_day || !formData.date_of_leaving) {
        showError('Please fill all required fields');
        return;
      }

      const preview = await settlementService.previewSettlement(formData);
      setPreviewData(preview);
      setActiveView('preview');
    } catch (error) {
      console.error('Error generating preview:', error);
      showError('Failed to generate preview');
    }
  };

  const handleCreateSettlement = async () => {
    try {
      if (!formData.employee_id || !formData.last_working_day || !formData.date_of_leaving) {
        showError('Please fill all required fields');
        return;
      }

      const newSettlement = await settlementService.createSettlement(formData);
      setSettlements([newSettlement, ...settlements]);
      showSuccess('Settlement created successfully');
      resetForm();
      setPreviewData(null);
      setActiveView('list');
    } catch (error) {
      console.error('Error creating settlement:', error);
      showError('Failed to create settlement');
    }
  };

  const handleApproveSettlement = async (id: string) => {
    try {
      const updated = await settlementService.approveSettlement(id);
      setSettlements(settlements.map(s => s.id === id ? updated : s));
      showSuccess('Settlement approved successfully');
    } catch (error) {
      console.error('Error approving settlement:', error);
      showError('Failed to approve settlement');
    }
  };

  const handleMarkAsPaid = async (
    id: string,
    paymentMode: string,
    paymentReference: string,
    paymentDate: string
  ) => {
    try {
      const updated = await settlementService.markAsPaid(id, paymentMode, paymentReference, paymentDate);
      setSettlements(settlements.map(s => s.id === id ? updated : s));
      showSuccess('Settlement marked as paid');
    } catch (error) {
      console.error('Error marking as paid:', error);
      showError('Failed to mark as paid');
    }
  };

  const handleDeleteSettlement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this settlement?')) return;

    try {
      await settlementService.deleteSettlement(id);
      setSettlements(settlements.filter(s => s.id !== id));
      showSuccess('Settlement deleted successfully');
    } catch (error) {
      console.error('Error deleting settlement:', error);
      showError('Failed to delete settlement');
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      date_of_leaving: '',
      relieving_date: '',
      last_working_day: '',
      reason_for_leaving: '',
      notice_period_days: 30,
      notice_period_served: 0,
      bonus_amount: 0,
      incentive_amount: 0,
      gratuity_amount: 0,
      advance_recovery: 0,
      loan_recovery: 0,
      asset_recovery: 0,
      other_dues: 0,
      other_recoveries: 0,
      assets_returned: false,
      asset_clearance_remarks: '',
      remarks: ''
    });
  };

  const filteredSettlements = settlements.filter(settlement =>
    settlement.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    settlement.employee_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    settlement.designation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      paid: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badges[status as keyof typeof badges] || badges.draft}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settlements...</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Full & Final Settlement</h1>
            <p className="text-gray-600 mt-1">Manage employee exit settlements</p>
          </div>
          {activeView === 'list' && (
            <button
              onClick={() => setActiveView('create')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Settlement
            </button>
          )}
        </div>
      </div>

      {/* List View */}
      {activeView === 'list' && (
        <div className="bg-white shadow-md rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by employee name, number, or designation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Relieving Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Settlement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSettlements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No settlements found
                    </td>
                  </tr>
                ) : (
                  filteredSettlements.map((settlement) => (
                    <tr key={settlement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{settlement.employee_name}</div>
                          <div className="text-sm text-gray-500">{settlement.employee_number}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{settlement.designation}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(settlement.relieving_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        ₹{settlement.net_settlement.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(settlement.status)}</td>
                      <td className="px-6 py-4 text-sm font-medium space-x-2">
                        <button
                          onClick={() => {
                            setSelectedSettlement(settlement);
                            setActiveView('view');
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="View"
                        >
                          <Eye className="w-5 h-5 inline" />
                        </button>
                        {settlement.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleApproveSettlement(settlement.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Approve"
                            >
                              <CheckCircle className="w-5 h-5 inline" />
                            </button>
                            <button
                              onClick={() => handleDeleteSettlement(settlement.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5 inline" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Settlement View */}
      {activeView === 'create' && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Create Full & Final Settlement</h2>
            <button
              onClick={() => {
                resetForm();
                setActiveView('list');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Employee Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Employee *
                </label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select an employee</option>
                  {employees
                    .filter(emp => emp.employment_status === 'active' || emp.employment_status === 'resigned')
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_number}) - {emp.designation}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Working Day *
                </label>
                <input
                  type="date"
                  value={formData.last_working_day}
                  onChange={(e) => setFormData({ ...formData, last_working_day: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Leaving *
                </label>
                <input
                  type="date"
                  value={formData.date_of_leaving}
                  onChange={(e) => setFormData({ ...formData, date_of_leaving: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relieving Date *
                </label>
                <input
                  type="date"
                  value={formData.relieving_date}
                  onChange={(e) => setFormData({ ...formData, relieving_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Leaving
                </label>
                <input
                  type="text"
                  value={formData.reason_for_leaving}
                  onChange={(e) => setFormData({ ...formData, reason_for_leaving: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Resignation, Better Opportunity, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notice Period (Days) *
                </label>
                <input
                  type="number"
                  value={formData.notice_period_days}
                  onChange={(e) => setFormData({ ...formData, notice_period_days: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notice Period Served (Days) *
                </label>
                <input
                  type="number"
                  value={formData.notice_period_served}
                  onChange={(e) => setFormData({ ...formData, notice_period_served: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Additional Payments Section */}
            <div>
              <h3 className="text-md font-semibold mb-4 text-gray-900">Additional Payments</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bonus Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.bonus_amount}
                    onChange={(e) => setFormData({ ...formData, bonus_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Incentive Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.incentive_amount}
                    onChange={(e) => setFormData({ ...formData, incentive_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Other Dues
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.other_dues}
                    onChange={(e) => setFormData({ ...formData, other_dues: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Recoveries Section */}
            <div>
              <h3 className="text-md font-semibold mb-4 text-gray-900">Recoveries</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Advance Recovery
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.advance_recovery}
                    onChange={(e) => setFormData({ ...formData, advance_recovery: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loan Recovery
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.loan_recovery}
                    onChange={(e) => setFormData({ ...formData, loan_recovery: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asset Recovery
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.asset_recovery}
                    onChange={(e) => setFormData({ ...formData, asset_recovery: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Other Recoveries
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.other_recoveries}
                    onChange={(e) => setFormData({ ...formData, other_recoveries: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Asset Clearance */}
            <div>
              <h3 className="text-md font-semibold mb-4 text-gray-900">Asset Clearance</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.assets_returned}
                    onChange={(e) => setFormData({ ...formData, assets_returned: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Assets Returned
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asset Clearance Remarks
                  </label>
                  <textarea
                    value={formData.asset_clearance_remarks}
                    onChange={(e) => setFormData({ ...formData, asset_clearance_remarks: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="List of assets returned: laptop, phone, ID card, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    General Remarks
                  </label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Any additional notes or remarks"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 border-t pt-4">
              <button
                onClick={() => {
                  resetForm();
                  setActiveView('list');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePreviewSettlement}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                <Eye className="w-4 h-4 inline mr-2" />
                Preview Calculation
              </button>
              <button
                onClick={handleCreateSettlement}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Save className="w-4 h-4 inline mr-2" />
                Create Settlement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Settlement Detail */}
      {activeView === 'view' && selectedSettlement && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Settlement Details</h2>
            <button
              onClick={() => {
                setSelectedSettlement(null);
                setActiveView('list');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Employee Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-md font-semibold mb-3 text-gray-900">Employee Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Employee Number</p>
                  <p className="font-medium">{selectedSettlement.employee_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{selectedSettlement.employee_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Designation</p>
                  <p className="font-medium">{selectedSettlement.designation}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="font-medium">{selectedSettlement.department || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date of Joining</p>
                  <p className="font-medium">{new Date(selectedSettlement.date_of_joining).toLocaleDateString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date of Leaving</p>
                  <p className="font-medium">{new Date(selectedSettlement.date_of_leaving).toLocaleDateString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Relieving Date</p>
                  <p className="font-medium">{new Date(selectedSettlement.relieving_date).toLocaleDateString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">{getStatusBadge(selectedSettlement.status)}</p>
                </div>
              </div>
            </div>

            {/* Settlement Calculation */}
            <div>
              <h3 className="text-md font-semibold mb-3 text-gray-900">Settlement Calculation</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Component</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr className="bg-green-50">
                      <td colSpan={2} className="px-4 py-2 font-semibold text-green-800">Amounts Payable</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Pending Salary ({selectedSettlement.pending_salary_days} days)</td>
                      <td className="px-4 py-2 text-sm text-right">{selectedSettlement.pending_salary_amount.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Leave Encashment ({selectedSettlement.earned_leave_days} days)</td>
                      <td className="px-4 py-2 text-sm text-right">{selectedSettlement.earned_leave_encashment.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Bonus</td>
                      <td className="px-4 py-2 text-sm text-right">{selectedSettlement.bonus_amount.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Incentive</td>
                      <td className="px-4 py-2 text-sm text-right">{selectedSettlement.incentive_amount.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Gratuity</td>
                      <td className="px-4 py-2 text-sm text-right">{selectedSettlement.gratuity_amount.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Other Dues</td>
                      <td className="px-4 py-2 text-sm text-right">{selectedSettlement.other_dues.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="bg-green-100 font-semibold">
                      <td className="px-4 py-2 text-sm">Total Dues</td>
                      <td className="px-4 py-2 text-sm text-right">{selectedSettlement.total_dues.toLocaleString('en-IN')}</td>
                    </tr>

                    <tr className="bg-red-50">
                      <td colSpan={2} className="px-4 py-2 font-semibold text-red-800">Deductions/Recoveries</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Advance Recovery</td>
                      <td className="px-4 py-2 text-sm text-right">{selectedSettlement.advance_recovery.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Loan Recovery</td>
                      <td className="px-4 py-2 text-sm text-right">{selectedSettlement.loan_recovery.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Notice Period Recovery ({selectedSettlement.notice_period_shortfall} days)</td>
                      <td className="px-4 py-2 text-sm text-right">{selectedSettlement.notice_period_recovery.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Asset Recovery</td>
                      <td className="px-4 py-2 text-sm text-right">{selectedSettlement.asset_recovery.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Other Recoveries</td>
                      <td className="px-4 py-2 text-sm text-right">{selectedSettlement.other_recoveries.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="bg-red-100 font-semibold">
                      <td className="px-4 py-2 text-sm">Total Recoveries</td>
                      <td className="px-4 py-2 text-sm text-right">{selectedSettlement.total_recoveries.toLocaleString('en-IN')}</td>
                    </tr>

                    <tr className="bg-blue-50">
                      <td colSpan={2} className="px-4 py-2 font-semibold text-blue-800">Final Settlement</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Gross Settlement</td>
                      <td className="px-4 py-2 text-sm text-right">{selectedSettlement.gross_settlement.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Tax Deduction (TDS)</td>
                      <td className="px-4 py-2 text-sm text-right">{selectedSettlement.tax_deduction.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="bg-blue-200 font-bold text-lg">
                      <td className="px-4 py-3 text-sm">Net Settlement Payable</td>
                      <td className="px-4 py-3 text-sm text-right">₹ {selectedSettlement.net_settlement.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Asset Clearance */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-md font-semibold mb-3 text-gray-900">Asset Clearance</h3>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Assets Returned:</span>{' '}
                  <span className={selectedSettlement.assets_returned ? 'text-green-600' : 'text-red-600'}>
                    {selectedSettlement.assets_returned ? 'Yes' : 'No'}
                  </span>
                </p>
                {selectedSettlement.asset_clearance_remarks && (
                  <p className="text-sm">
                    <span className="font-medium">Remarks:</span> {selectedSettlement.asset_clearance_remarks}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between border-t pt-4">
              <button
                onClick={() => {
                  setSelectedSettlement(null);
                  setActiveView('list');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Back to List
              </button>
              <div className="space-x-3">
                {selectedSettlement.status === 'draft' && (
                  <button
                    onClick={() => handleApproveSettlement(selectedSettlement.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-2" />
                    Approve Settlement
                  </button>
                )}
                {selectedSettlement.status === 'approved' && (
                  <button
                    onClick={() => {
                      const paymentDate = prompt('Enter payment date (YYYY-MM-DD):');
                      const paymentMode = prompt('Enter payment mode (e.g., Bank Transfer):');
                      const paymentRef = prompt('Enter payment reference:');
                      if (paymentDate && paymentMode && paymentRef) {
                        handleMarkAsPaid(selectedSettlement.id, paymentMode, paymentRef, paymentDate);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <DollarSign className="w-4 h-4 inline mr-2" />
                    Mark as Paid
                  </button>
                )}
                <button
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  title="Download PDF (Coming Soon)"
                  disabled
                >
                  <Download className="w-4 h-4 inline mr-2" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Settlement Calculation */}
      {activeView === 'preview' && previewData && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Settlement Preview - Calculation Summary</h2>
            <button
              onClick={() => setActiveView('create')}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Preview Mode:</strong> This is a calculation preview. No data will be saved until you click "Confirm & Create Settlement".
            </p>
          </div>

          <div className="space-y-6">
            {/* Employee Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-md font-semibold mb-3 text-gray-900">Employee Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Employee Number</p>
                  <p className="font-medium">{previewData.employee_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{previewData.employee_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Designation</p>
                  <p className="font-medium">{previewData.designation}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="font-medium">{previewData.department || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Settlement Calculation */}
            <div>
              <h3 className="text-md font-semibold mb-3 text-gray-900">Settlement Calculation</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Component</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr className="bg-green-50">
                      <td colSpan={2} className="px-4 py-2 font-semibold text-green-800">Amounts Payable</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Pending Salary ({previewData.pending_salary_days} days)</td>
                      <td className="px-4 py-2 text-sm text-right">{previewData.pending_salary_amount?.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Leave Encashment ({previewData.earned_leave_days} days)</td>
                      <td className="px-4 py-2 text-sm text-right">{previewData.earned_leave_encashment?.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Bonus</td>
                      <td className="px-4 py-2 text-sm text-right">{previewData.bonus_amount?.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Incentive</td>
                      <td className="px-4 py-2 text-sm text-right">{previewData.incentive_amount?.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Gratuity</td>
                      <td className="px-4 py-2 text-sm text-right">{previewData.gratuity_amount?.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Other Dues</td>
                      <td className="px-4 py-2 text-sm text-right">{previewData.other_dues?.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="bg-green-100 font-semibold">
                      <td className="px-4 py-2 text-sm">Total Dues</td>
                      <td className="px-4 py-2 text-sm text-right">{previewData.total_dues?.toLocaleString('en-IN')}</td>
                    </tr>

                    <tr className="bg-red-50">
                      <td colSpan={2} className="px-4 py-2 font-semibold text-red-800">Deductions/Recoveries</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Advance Recovery</td>
                      <td className="px-4 py-2 text-sm text-right">{previewData.advance_recovery?.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Loan Recovery</td>
                      <td className="px-4 py-2 text-sm text-right">{previewData.loan_recovery?.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Notice Period Recovery ({previewData.notice_period_shortfall} days)</td>
                      <td className="px-4 py-2 text-sm text-right">{previewData.notice_period_recovery?.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Asset Recovery</td>
                      <td className="px-4 py-2 text-sm text-right">{previewData.asset_recovery?.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Other Recoveries</td>
                      <td className="px-4 py-2 text-sm text-right">{previewData.other_recoveries?.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="bg-red-100 font-semibold">
                      <td className="px-4 py-2 text-sm">Total Recoveries</td>
                      <td className="px-4 py-2 text-sm text-right">{previewData.total_recoveries?.toLocaleString('en-IN')}</td>
                    </tr>

                    <tr className="bg-blue-50">
                      <td colSpan={2} className="px-4 py-2 font-semibold text-blue-800">Final Settlement</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Gross Settlement</td>
                      <td className="px-4 py-2 text-sm text-right">{previewData.gross_settlement?.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Tax Deduction (TDS)</td>
                      <td className="px-4 py-2 text-sm text-right">{previewData.tax_deduction?.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="bg-blue-200 font-bold text-lg">
                      <td className="px-4 py-3 text-sm">Net Settlement Payable</td>
                      <td className="px-4 py-3 text-sm text-right">₹ {previewData.net_settlement?.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between border-t pt-4">
              <button
                onClick={() => setActiveView('create')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Back to Edit
              </button>
              <button
                onClick={handleCreateSettlement}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Save className="w-4 h-4 inline mr-2" />
                Confirm & Create Settlement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FullFinalSettlementComponent;
