import React, { useState, useEffect } from 'react';
import {
  DollarSign, Plus, Edit2, Trash2, Eye, X, Save, Check, XCircle,
  TrendingUp, Gift, Calendar, User, ChevronDown, ChevronUp, Search,
  ArrowUpRight, ArrowDownRight, Wallet, Calculator, History, FileText
} from 'lucide-react';
import {
  compensationService,
  EmployeeCompensation,
  SalaryIncrement,
  EmployeeBonus,
  CreateCompensationData,
  CreateIncrementData,
  CreateBonusData
} from '../../services/compensationService';
import { employeeService } from '../../services/employeeService';
import { useToast } from '../ui/ToastProvider';
import ConfirmDialog from '../ui/ConfirmDialog';
import { calculateSalaryBreakdown, type SalaryBreakdown } from '../../utils/salaryCalculator';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  employee_number: string;
  designation: string;
  department?: string;
}

type TabType = 'compensation' | 'increments' | 'bonuses';

const incrementTypes = [
  { value: 'annual_increment', label: 'Annual Increment' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'performance_based', label: 'Performance Based' },
  { value: 'market_adjustment', label: 'Market Adjustment' },
  { value: 'role_change', label: 'Role Change' },
  { value: 'special_increment', label: 'Special Increment' },
  { value: 'correction', label: 'Correction' },
  { value: 'other', label: 'Other' }
];

const bonusTypes = [
  { value: 'performance_bonus', label: 'Performance Bonus' },
  { value: 'annual_bonus', label: 'Annual Bonus' },
  { value: 'festival_bonus', label: 'Festival Bonus' },
  { value: 'referral_bonus', label: 'Referral Bonus' },
  { value: 'project_bonus', label: 'Project Bonus' },
  { value: 'retention_bonus', label: 'Retention Bonus' },
  { value: 'signing_bonus', label: 'Signing Bonus' },
  { value: 'spot_award', label: 'Spot Award' },
  { value: 'other', label: 'Other' }
];

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

const CompensationManagement: React.FC = () => {
  const { showError, showSuccess } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('compensation');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  // Filter states
  const [filterEmployee, setFilterEmployee] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data states
  const [compensations, setCompensations] = useState<EmployeeCompensation[]>([]);
  const [increments, setIncrements] = useState<SalaryIncrement[]>([]);
  const [bonuses, setBonuses] = useState<EmployeeBonus[]>([]);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    loadData();
  }, [activeTab, filterEmployee]);

  const loadEmployees = async () => {
    try {
      const data = await employeeService.getEmployees();
      setEmployees(data);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'compensation':
          const compData = await compensationService.getCompensations(filterEmployee || undefined);
          setCompensations(compData);
          break;
        case 'increments':
          const incData = await compensationService.getIncrements(filterEmployee || undefined);
          setIncrements(incData);
          break;
        case 'bonuses':
          const bonusData = await compensationService.getBonuses(filterEmployee || undefined);
          setBonuses(bonusData);
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const openCreateModal = () => {
    setSelectedItem(null);
    setModalMode('create');
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setSelectedItem(item);
    setModalMode('edit');
    setShowModal(true);
  };

  const openViewModal = (item: any) => {
    setSelectedItem(item);
    setModalMode('view');
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    setDeleting(true);
    try {
      switch (activeTab) {
        case 'compensation':
          await compensationService.deleteCompensation(itemToDelete);
          break;
        case 'increments':
          await compensationService.deleteIncrement(itemToDelete);
          break;
        case 'bonuses':
          await compensationService.deleteBonus(itemToDelete);
          break;
      }
      loadData();
      showSuccess('Record deleted successfully');
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting:', error);
      showError('Failed to delete record');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-blue-100 text-blue-700',
      applied: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      paid: 'bg-green-100 text-green-700',
      cancelled: 'bg-gray-100 text-gray-700'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Stats
  const stats = {
    totalEmployeesWithComp: new Set(compensations.filter(c => c.is_current).map(c => c.employee_id)).size,
    totalGrossSalary: compensations.filter(c => c.is_current).reduce((sum, c) => sum + (c.gross_salary * 12), 0), // Annual gross
    pendingIncrements: increments.filter(i => i.status === 'pending').length,
    pendingBonuses: bonuses.filter(b => b.payment_status === 'pending' || b.payment_status === 'approved').length,
    totalBonusesPaid: bonuses.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + b.amount, 0)
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-7 h-7 text-green-600" />
            Compensation Management
          </h1>
          <p className="text-gray-600 mt-1">Manage salaries, increments, and bonuses</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>
            {activeTab === 'compensation' && 'New Compensation'}
            {activeTab === 'increments' && 'New Increment'}
            {activeTab === 'bonuses' && 'New Bonus'}
          </span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Employees</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalEmployeesWithComp}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Annual Gross</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.totalGrossSalary)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Increments</p>
              <p className="text-xl font-bold text-gray-900">{stats.pendingIncrements}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Gift className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Bonuses</p>
              <p className="text-xl font-bold text-gray-900">{stats.pendingBonuses}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Check className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Bonuses Paid</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.totalBonusesPaid)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {[
              { id: 'compensation', label: 'Salary Structure', icon: DollarSign },
              { id: 'increments', label: 'Increments', icon: TrendingUp },
              { id: 'bonuses', label: 'Bonuses', icon: Gift }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-4 md:px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
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

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.employee_number})
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <>
              {/* Compensation Tab */}
              {activeTab === 'compensation' && (
                <CompensationTable
                  data={compensations}
                  expandedRows={expandedRows}
                  onToggleExpand={toggleExpand}
                  onView={openViewModal}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                />
              )}

              {/* Increments Tab */}
              {activeTab === 'increments' && (
                <IncrementsTable
                  data={increments}
                  onView={openViewModal}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                  onApprove={async (item) => {
                    // Get current compensation to build new one
                    const currentComp = await compensationService.getCurrentCompensation(item.employee_id);
                    if (currentComp) {
                      const newCompData: CreateCompensationData = {
                        employee_id: item.employee_id,
                        basic_salary: item.new_basic,
                        hra: currentComp.hra,
                        da: currentComp.da,
                        special_allowance: currentComp.special_allowance,
                        transport_allowance: currentComp.transport_allowance,
                        medical_allowance: currentComp.medical_allowance,
                        other_allowances: currentComp.other_allowances,
                        pf_contribution: currentComp.pf_contribution,
                        esi_contribution: currentComp.esi_contribution,
                        professional_tax: currentComp.professional_tax,
                        tds: currentComp.tds,
                        other_deductions: currentComp.other_deductions,
                        effective_from: item.effective_date,
                        is_current: true,
                        notes: `Increment applied: ${item.increment_type}`
                      };
                      await compensationService.approveIncrement(item.id, newCompData);
                      loadData();
                    }
                  }}
                  onReject={async (id, reason) => {
                    await compensationService.rejectIncrement(id, reason);
                    loadData();
                  }}
                />
              )}

              {/* Bonuses Tab */}
              {activeTab === 'bonuses' && (
                <BonusesTable
                  data={bonuses}
                  onView={openViewModal}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                  onApprove={async (id) => {
                    await compensationService.approveBonus(id);
                    loadData();
                  }}
                  onMarkPaid={async (id) => {
                    await compensationService.markBonusPaid(id, new Date().toISOString().split('T')[0]);
                    loadData();
                  }}
                  onCancel={async (id) => {
                    await compensationService.cancelBonus(id);
                    loadData();
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <CompensationModal
          mode={modalMode}
          type={activeTab}
          item={selectedItem}
          employees={employees}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            try {
              switch (activeTab) {
                case 'compensation':
                  if (modalMode === 'create') {
                    await compensationService.createCompensation(data as CreateCompensationData);
                  } else {
                    await compensationService.updateCompensation(selectedItem.id, data as Partial<CreateCompensationData>);
                  }
                  break;
                case 'increments':
                  if (modalMode === 'create') {
                    await compensationService.createIncrement(data as CreateIncrementData);
                  } else {
                    await compensationService.updateIncrement(selectedItem.id, data as Partial<CreateIncrementData>);
                  }
                  break;
                case 'bonuses':
                  if (modalMode === 'create') {
                    await compensationService.createBonus(data as CreateBonusData);
                  } else {
                    await compensationService.updateBonus(selectedItem.id, data as Partial<CreateBonusData>);
                  }
                  break;
              }
              setShowModal(false);
              loadData();
              showSuccess('Saved successfully');
            } catch (error) {
              console.error('Error saving:', error);
              showError('Failed to save. Please try again.');
            }
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Record"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
      />
    </div>
  );
};

// Compensation Table Component
const CompensationTable: React.FC<{
  data: EmployeeCompensation[];
  expandedRows: Set<string>;
  onToggleExpand: (id: string) => void;
  onView: (item: EmployeeCompensation) => void;
  onEdit: (item: EmployeeCompensation) => void;
  onDelete: (id: string) => void;
}> = ({ data, expandedRows, onToggleExpand, onView, onEdit, onDelete }) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No compensation records</h3>
        <p className="text-gray-600">Start by adding a compensation structure for employees</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Desktop Table */}
      <table className="w-full hidden md:table">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Basic</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Deductions</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((comp) => (
            <React.Fragment key={comp.id}>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-700 font-medium text-sm">
                        {comp.employees?.first_name?.[0]}{comp.employees?.last_name?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{comp.employees?.full_name}</p>
                      <p className="text-sm text-gray-500">{comp.employees?.designation}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(comp.basic_salary)}</td>
                <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCurrency(comp.gross_salary)}</td>
                <td className="px-4 py-3 text-right text-red-600">{formatCurrency(comp.total_deductions)}</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(comp.net_salary)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{formatDate(comp.effective_from)}</td>
                <td className="px-4 py-3">
                  {comp.is_current ? (
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Current</span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">Historical</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onToggleExpand(comp.id)} className="p-2 hover:bg-gray-100 rounded-lg">
                      {expandedRows.has(comp.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button onClick={() => onView(comp)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => onEdit(comp)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!comp.is_current && (
                      <button onClick={() => onDelete(comp.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              {expandedRows.has(comp.id) && (
                <tr className="bg-gray-50">
                  <td colSpan={8} className="px-4 py-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">HRA</p>
                        <p className="font-medium">{formatCurrency(comp.hra)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">DA</p>
                        <p className="font-medium">{formatCurrency(comp.da)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Special Allowance</p>
                        <p className="font-medium">{formatCurrency(comp.special_allowance)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Transport</p>
                        <p className="font-medium">{formatCurrency(comp.transport_allowance)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">PF</p>
                        <p className="font-medium text-red-600">-{formatCurrency(comp.pf_contribution)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">ESI</p>
                        <p className="font-medium text-red-600">-{formatCurrency(comp.esi_contribution)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Professional Tax</p>
                        <p className="font-medium text-red-600">-{formatCurrency(comp.professional_tax)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">TDS</p>
                        <p className="font-medium text-red-600">-{formatCurrency(comp.tds)}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {data.map((comp) => (
          <div key={comp.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-700 font-medium text-sm">
                    {comp.employees?.first_name?.[0]}{comp.employees?.last_name?.[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{comp.employees?.full_name}</p>
                  <p className="text-sm text-gray-500">{comp.employees?.designation}</p>
                </div>
              </div>
              {comp.is_current ? (
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Current</span>
              ) : (
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">Historical</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Gross Salary</p>
                <p className="font-medium text-green-600">{formatCurrency(comp.gross_salary)}</p>
              </div>
              <div>
                <p className="text-gray-500">Net Salary</p>
                <p className="font-bold text-gray-900">{formatCurrency(comp.net_salary)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-500">From: {formatDate(comp.effective_from)}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => onView(comp)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                  <Eye className="w-4 h-4" />
                </button>
                <button onClick={() => onEdit(comp)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Increments Table Component
const IncrementsTable: React.FC<{
  data: SalaryIncrement[];
  onView: (item: SalaryIncrement) => void;
  onEdit: (item: SalaryIncrement) => void;
  onDelete: (id: string) => void;
  onApprove: (item: SalaryIncrement) => void;
  onReject: (id: string, reason: string) => void;
}> = ({ data, onView, onEdit, onDelete, onApprove, onReject }) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No increment records</h3>
        <p className="text-gray-600">Salary increments will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((inc) => (
        <div key={inc.id} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${inc.increment_amount > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {inc.increment_amount > 0 ? (
                  <ArrowUpRight className="w-5 h-5 text-green-600" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">{inc.employees?.full_name}</p>
                <p className="text-sm text-gray-500">{inc.employees?.designation}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-sm">
                <span className="text-gray-500">Type:</span>{' '}
                <span className="font-medium">{incrementTypes.find(t => t.value === inc.increment_type)?.label}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">{formatCurrency(inc.previous_basic)}</span>
                <span className="mx-2">→</span>
                <span className="font-medium text-green-600">{formatCurrency(inc.new_basic)}</span>
              </div>
              <div className={`text-sm font-bold ${inc.increment_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {inc.increment_amount > 0 ? '+' : ''}{formatCurrency(inc.increment_amount)} ({inc.increment_percentage?.toFixed(1)}%)
              </div>
              {getStatusBadge(inc.status)}
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">Effective: {formatDate(inc.effective_date)}</span>
            <div className="flex items-center gap-1">
              {inc.status === 'pending' && (
                <>
                  <button
                    onClick={() => onApprove(inc)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-sm"
                  >
                    <Check className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Rejection reason:');
                      if (reason) onReject(inc.id, reason);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </>
              )}
              <button onClick={() => onView(inc)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                <Eye className="w-4 h-4" />
              </button>
              {inc.status === 'pending' && (
                <>
                  <button onClick={() => onEdit(inc)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDelete(inc.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Bonuses Table Component
const BonusesTable: React.FC<{
  data: EmployeeBonus[];
  onView: (item: EmployeeBonus) => void;
  onEdit: (item: EmployeeBonus) => void;
  onDelete: (id: string) => void;
  onApprove: (id: string) => void;
  onMarkPaid: (id: string) => void;
  onCancel: (id: string) => void;
}> = ({ data, onView, onEdit, onDelete, onApprove, onMarkPaid, onCancel }) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No bonus records</h3>
        <p className="text-gray-600">Employee bonuses will appear here</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
      cancelled: 'bg-gray-100 text-gray-700'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {data.map((bonus) => (
        <div key={bonus.id} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Gift className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{bonus.employees?.full_name}</p>
                <p className="text-sm text-gray-500">{bonus.bonus_name}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                {bonusTypes.find(t => t.value === bonus.bonus_type)?.label}
              </span>
              <div className="text-lg font-bold text-gray-900">{formatCurrency(bonus.amount)}</div>
              {bonus.is_taxable && bonus.tax_amount > 0 && (
                <span className="text-sm text-gray-500">(Net: {formatCurrency(bonus.net_amount)})</span>
              )}
              {getStatusBadge(bonus.payment_status)}
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              {bonus.payment_date ? `Paid: ${formatDate(bonus.payment_date)}` : `Created: ${formatDate(bonus.created_at)}`}
            </span>
            <div className="flex items-center gap-1">
              {bonus.payment_status === 'pending' && (
                <button
                  onClick={() => onApprove(bonus.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm"
                >
                  <Check className="w-4 h-4" /> Approve
                </button>
              )}
              {bonus.payment_status === 'approved' && (
                <button
                  onClick={() => onMarkPaid(bonus.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-sm"
                >
                  <DollarSign className="w-4 h-4" /> Mark Paid
                </button>
              )}
              {(bonus.payment_status === 'pending' || bonus.payment_status === 'approved') && (
                <button
                  onClick={() => onCancel(bonus.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-sm"
                >
                  <XCircle className="w-4 h-4" /> Cancel
                </button>
              )}
              <button onClick={() => onView(bonus)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                <Eye className="w-4 h-4" />
              </button>
              {bonus.payment_status === 'pending' && (
                <>
                  <button onClick={() => onEdit(bonus)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDelete(bonus.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Modal Component
const CompensationModal: React.FC<{
  mode: 'create' | 'edit' | 'view';
  type: TabType;
  item: any;
  employees: Employee[];
  onClose: () => void;
  onSave: (data: any) => void;
}> = ({ mode, type, item, employees, onClose, onSave }) => {
  const [grossSalaryInput, setGrossSalaryInput] = useState<number>(0);
  const [salaryBreakdown, setSalaryBreakdown] = useState<SalaryBreakdown | null>(null);
  const [autoCalculate, setAutoCalculate] = useState(true);

  const [formData, setFormData] = useState<any>(() => {
    if (item && mode !== 'create') {
      // Calculate gross from existing data
      const gross = item.basic_salary + (item.hra || 0) + (item.da || 0) + 
                   (item.special_allowance || 0) + (item.transport_allowance || 0) + 
                   (item.medical_allowance || 0) + (item.other_allowances || 0);
      setGrossSalaryInput(gross);
      setAutoCalculate(false);
      return { ...item };
    }
    
    // Default values based on type
    if (type === 'compensation') {
      return {
        employee_id: '',
        basic_salary: 0,
        hra: 0,
        da: 0,
        special_allowance: 0,
        transport_allowance: 0,
        medical_allowance: 0,
        other_allowances: 0,
        pf_contribution: 0,
        esi_contribution: 0,
        professional_tax: 0,
        tds: 0,
        other_deductions: 0,
        effective_from: new Date().toISOString().split('T')[0],
        is_current: true,
        notes: ''
      };
    }
    if (type === 'increments') {
      return {
        employee_id: '',
        increment_type: 'annual_increment',
        previous_basic: 0,
        new_basic: 0,
        increment_percentage: 0,
        effective_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        reason: '',
        remarks: ''
      };
    }
    if (type === 'bonuses') {
      return {
        employee_id: '',
        bonus_type: 'performance_bonus',
        bonus_name: '',
        amount: 0,
        is_taxable: true,
        tax_amount: 0,
        payment_status: 'pending',
        reason: '',
        remarks: ''
      };
    }
    return {};
  });

  const [currentComp, setCurrentComp] = useState<EmployeeCompensation | null>(null);

  // Calculate salary breakdown when gross salary changes
  useEffect(() => {
    if (type === 'compensation' && autoCalculate && grossSalaryInput > 0) {
      const breakdown = calculateSalaryBreakdown(grossSalaryInput, {
        otherAllowances: formData.other_allowances || 0,
        otherDeductions: formData.other_deductions || 0
      });
      setSalaryBreakdown(breakdown);
      
      // Update form data with calculated values
      setFormData((prev: any) => ({
        ...prev,
        basic_salary: breakdown.basicSalary,
        hra: breakdown.hra,
        da: breakdown.da,
        special_allowance: breakdown.specialAllowance,
        transport_allowance: breakdown.transportAllowance,
        medical_allowance: breakdown.medicalAllowance,
        pf_contribution: 0, // No PF as per user requirement
        esi_contribution: breakdown.esi,
        professional_tax: breakdown.professionalTax,
        tds: breakdown.tds
      }));
    }
  }, [grossSalaryInput, autoCalculate, type, formData.other_allowances, formData.other_deductions]);

  // Load current compensation when employee changes (for increments)
  useEffect(() => {
    if (type === 'increments' && formData.employee_id && mode === 'create') {
      compensationService.getCurrentCompensation(formData.employee_id).then(comp => {
        if (comp) {
          setCurrentComp(comp);
          setFormData((prev: any) => ({
            ...prev,
            previous_basic: comp.basic_salary,
            new_basic: comp.basic_salary
          }));
        }
      });
    }
  }, [formData.employee_id, type, mode]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const isReadOnly = mode === 'view';

  const getTitle = () => {
    const action = mode === 'create' ? 'Create' : mode === 'edit' ? 'Edit' : 'View';
    const typeLabel = type === 'compensation' ? 'Compensation' : type === 'increments' ? 'Increment' : 'Bonus';
    return `${action} ${typeLabel}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{getTitle()}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
            <select
              value={formData.employee_id}
              onChange={(e) => handleChange('employee_id', e.target.value)}
              disabled={isReadOnly || mode === 'edit'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
              required
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.employee_number})
                </option>
              ))}
            </select>
          </div>

          {/* Compensation Form */}
          {type === 'compensation' && (
            <>
              {/* Auto-Calculate Toggle */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">Auto-Calculate Salary Breakdown</p>
                    <p className="text-sm text-blue-600">Enter gross salary and get automatic breakdown as per Indian standards</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCalculate}
                    onChange={(e) => setAutoCalculate(e.target.checked)}
                    disabled={isReadOnly}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Gross Salary Input (when auto-calculate is ON) */}
              {autoCalculate && !isReadOnly && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <label className="block text-sm font-medium text-green-900 mb-2">
                    Monthly Gross Salary * <span className="text-green-600 font-normal">(CTC/Month)</span>
                  </label>
                  <input
                    type="number"
                    value={grossSalaryInput}
                    onChange={(e) => setGrossSalaryInput(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 text-lg font-semibold border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter monthly gross salary"
                    min="0"
                    step="100"
                  />
                  {salaryBreakdown && (
                    <div className="mt-3 p-3 bg-white rounded border border-green-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Breakdown Preview:</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-600">Basic (40%):</span> <span className="font-medium">₹{salaryBreakdown.basicSalary.toLocaleString('en-IN')}</span></div>
                        <div><span className="text-gray-600">HRA (40%):</span> <span className="font-medium">₹{salaryBreakdown.hra.toLocaleString('en-IN')}</span></div>
                        <div><span className="text-gray-600">Special (20%):</span> <span className="font-medium">₹{salaryBreakdown.specialAllowance.toLocaleString('en-IN')}</span></div>
                        <div><span className="text-red-600">PT:</span> <span className="font-medium text-red-600">-₹{salaryBreakdown.professionalTax.toLocaleString('en-IN')}</span></div>
                        {salaryBreakdown.esi > 0 && (
                          <div><span className="text-red-600">ESI (0.75%):</span> <span className="font-medium text-red-600">-₹{salaryBreakdown.esi.toLocaleString('en-IN')}</span></div>
                        )}
                        <div><span className="text-red-600">TDS:</span> <span className="font-medium text-red-600">-₹{salaryBreakdown.tds.toLocaleString('en-IN')}</span></div>
                        <div className="col-span-2 pt-2 border-t border-green-200">
                          <span className="text-green-700 font-semibold">Net Salary:</span> 
                          <span className="font-bold text-green-700 text-lg ml-2">₹{salaryBreakdown.netSalary.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Basic Salary * {autoCalculate && <span className="text-blue-600 text-xs">(Auto-calculated)</span>}
                  </label>
                  <input
                    type="number"
                    value={formData.basic_salary}
                    onChange={(e) => handleChange('basic_salary', parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly || autoCalculate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HRA {autoCalculate && <span className="text-blue-600 text-xs">(Auto-calculated)</span>}
                  </label>
                  <input
                    type="number"
                    value={formData.hra}
                    onChange={(e) => handleChange('hra', parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly || autoCalculate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DA {autoCalculate && <span className="text-blue-600 text-xs">(Auto-calculated)</span>}
                  </label>
                  <input
                    type="number"
                    value={formData.da}
                    onChange={(e) => handleChange('da', parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly || autoCalculate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Special Allowance {autoCalculate && <span className="text-blue-600 text-xs">(Auto-calculated)</span>}
                  </label>
                  <input
                    type="number"
                    value={formData.special_allowance}
                    onChange={(e) => handleChange('special_allowance', parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly || autoCalculate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transport Allowance {autoCalculate && <span className="text-blue-600 text-xs">(Auto-calculated)</span>}
                  </label>
                  <input
                    type="number"
                    value={formData.transport_allowance}
                    onChange={(e) => handleChange('transport_allowance', parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly || autoCalculate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medical Allowance {autoCalculate && <span className="text-blue-600 text-xs">(Auto-calculated)</span>}
                  </label>
                  <input
                    type="number"
                    value={formData.medical_allowance}
                    onChange={(e) => handleChange('medical_allowance', parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly || autoCalculate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium mb-3 text-red-600 flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4" />
                  Deductions {autoCalculate && <span className="text-xs text-blue-600 font-normal">(Auto-calculated per Indian tax laws)</span>}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PF Contribution <span className="text-xs text-gray-500">(Not provided)</span>
                    </label>
                    <input
                      type="number"
                      value={formData.pf_contribution}
                      onChange={(e) => handleChange('pf_contribution', parseFloat(e.target.value) || 0)}
                      disabled={isReadOnly || autoCalculate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ESI Contribution {autoCalculate && <span className="text-blue-600 text-xs">(0.75% if ≤₹21k)</span>}
                    </label>
                    <input
                      type="number"
                      value={formData.esi_contribution}
                      onChange={(e) => handleChange('esi_contribution', parseFloat(e.target.value) || 0)}
                      disabled={isReadOnly || autoCalculate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Professional Tax {autoCalculate && <span className="text-blue-600 text-xs">(Auto-calculated)</span>}
                    </label>
                    <input
                      type="number"
                      value={formData.professional_tax}
                      onChange={(e) => handleChange('professional_tax', parseFloat(e.target.value) || 0)}
                      disabled={isReadOnly || autoCalculate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      TDS {autoCalculate && <span className="text-blue-600 text-xs">(Auto-calculated per FY 2025-26)</span>}
                    </label>
                    <input
                      type="number"
                      value={formData.tds}
                      onChange={(e) => handleChange('tds', parseFloat(e.target.value) || 0)}
                      disabled={isReadOnly || autoCalculate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Effective From *</label>
                <input
                  type="date"
                  value={formData.effective_from}
                  onChange={(e) => handleChange('effective_from', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  disabled={isReadOnly}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                />
              </div>
            </>
          )}

          {/* Increment Form */}
          {type === 'increments' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Increment Type *</label>
                  <select
                    value={formData.increment_type}
                    onChange={(e) => handleChange('increment_type', e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                    required
                  >
                    {incrementTypes.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date *</label>
                  <input
                    type="date"
                    value={formData.effective_date}
                    onChange={(e) => handleChange('effective_date', e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Previous Basic *</label>
                  <input
                    type="number"
                    value={formData.previous_basic}
                    onChange={(e) => handleChange('previous_basic', parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly || (mode === 'create' && !!currentComp)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Basic *</label>
                  <input
                    type="number"
                    value={formData.new_basic}
                    onChange={(e) => handleChange('new_basic', parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                    required
                  />
                </div>
              </div>

              {formData.previous_basic > 0 && formData.new_basic > 0 && (
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Increment Amount:</span>
                    <span className={`font-bold ${formData.new_basic - formData.previous_basic > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(formData.new_basic - formData.previous_basic)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-700">Increment Percentage:</span>
                    <span className={`font-bold ${formData.new_basic - formData.previous_basic > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(((formData.new_basic - formData.previous_basic) / formData.previous_basic) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={formData.reason || ''}
                  onChange={(e) => handleChange('reason', e.target.value)}
                  disabled={isReadOnly}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  placeholder="Reason for increment..."
                />
              </div>
            </>
          )}

          {/* Bonus Form */}
          {type === 'bonuses' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Type *</label>
                  <select
                    value={formData.bonus_type}
                    onChange={(e) => handleChange('bonus_type', e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                    required
                  >
                    {bonusTypes.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Name *</label>
                  <input
                    type="text"
                    value={formData.bonus_name}
                    onChange={(e) => handleChange('bonus_name', e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                    placeholder="e.g., Q4 Performance Bonus"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Amount</label>
                  <input
                    type="number"
                    value={formData.tax_amount}
                    onChange={(e) => handleChange('tax_amount', parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_taxable"
                  checked={formData.is_taxable}
                  onChange={(e) => handleChange('is_taxable', e.target.checked)}
                  disabled={isReadOnly}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="is_taxable" className="text-sm text-gray-700">This bonus is taxable</label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={formData.reason || ''}
                  onChange={(e) => handleChange('reason', e.target.value)}
                  disabled={isReadOnly}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  placeholder="Reason for bonus..."
                />
              </div>
            </>
          )}

          {/* Footer */}
          {!isReadOnly && (
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Save className="w-4 h-4" />
                {mode === 'create' ? 'Create' : 'Save Changes'}
              </button>
            </div>
          )}

          {isReadOnly && (
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

// Helper function to get status badge
function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-blue-100 text-blue-700',
    applied: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    paid: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-700'
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default CompensationManagement;
