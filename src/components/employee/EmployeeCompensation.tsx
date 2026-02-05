import React, { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, Gift, Calendar, Wallet, ArrowUpRight,
  ArrowDownRight, History, Eye, X, ChevronRight, Clock, CheckCircle, Info
} from 'lucide-react';
import {
  compensationService,
  EmployeeCompensation,
  SalaryIncrement,
  EmployeeBonus
} from '../../services/compensationService';
import { calculateSalaryBreakdown } from '../../utils/salaryCalculator';

type TabType = 'current' | 'history' | 'increments' | 'bonuses';

const incrementTypes: Record<string, string> = {
  annual_increment: 'Annual Increment',
  promotion: 'Promotion',
  performance_based: 'Performance Based',
  market_adjustment: 'Market Adjustment',
  role_change: 'Role Change',
  special_increment: 'Special Increment',
  correction: 'Correction',
  other: 'Other'
};

const bonusTypes: Record<string, string> = {
  performance_bonus: 'Performance Bonus',
  annual_bonus: 'Annual Bonus',
  festival_bonus: 'Festival Bonus',
  referral_bonus: 'Referral Bonus',
  project_bonus: 'Project Bonus',
  retention_bonus: 'Retention Bonus',
  signing_bonus: 'Signing Bonus',
  spot_award: 'Spot Award',
  other: 'Other'
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

const EmployeeCompensationView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('current');
  const [loading, setLoading] = useState(true);
  const [currentCompensation, setCurrentCompensation] = useState<EmployeeCompensation | null>(null);
  const [compensationHistory, setCompensationHistory] = useState<EmployeeCompensation[]>([]);
  const [increments, setIncrements] = useState<SalaryIncrement[]>([]);
  const [bonuses, setBonuses] = useState<EmployeeBonus[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  // Get employee ID from session storage
  const employeeId = (() => {
    const session = sessionStorage.getItem('employee_session');
    if (session) {
      try {
        const employee = JSON.parse(session);
        return employee.id || '';
      } catch {
        return '';
      }
    }
    return '';
  })();

  useEffect(() => {
    if (employeeId) {
      loadData();
    }
  }, [employeeId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [current, history, incrementData, bonusData] = await Promise.all([
        compensationService.getCurrentCompensation(employeeId),
        compensationService.getCompensationHistory(employeeId),
        compensationService.getIncrements(employeeId),
        compensationService.getBonuses(employeeId)
      ]);

      setCurrentCompensation(current);
      setCompensationHistory(history);
      // Only show applied increments to employee
      setIncrements(incrementData.filter(i => i.status === 'applied'));
      // Only show paid bonuses to employee
      setBonuses(bonusData.filter(b => b.payment_status === 'paid'));
    } catch (error) {
      console.error('Error loading compensation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (item: any, type: string) => {
    setSelectedItem({ ...item, _type: type });
    setShowModal(true);
  };

  // Calculate stats
  const stats = {
    currentGross: currentCompensation?.gross_salary || 0,
    currentNet: currentCompensation?.net_salary || 0,
    totalIncrements: increments.length,
    lastIncrementAmount: increments[0]?.increment_amount || 0,
    totalBonusesPaid: bonuses.reduce((sum, b) => sum + b.net_amount, 0),
    bonusesThisYear: bonuses
      .filter(b => new Date(b.payment_date || b.created_at).getFullYear() === new Date().getFullYear())
      .reduce((sum, b) => sum + b.net_amount, 0)
  };

  if (!employeeId) {
    return (
      <div className="p-6 text-center">
        <Wallet className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Session Error</h2>
        <p className="text-gray-600">Please log in again to view your compensation details.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wallet className="w-7 h-7 text-green-600" />
          My Compensation
        </h1>
        <p className="text-gray-600 mt-1">View your salary, increments, and bonus details</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Gross Salary</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.currentGross)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Net Salary</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.currentNet)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Increments</p>
              <p className="text-lg font-bold text-gray-900">{stats.totalIncrements}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Gift className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Bonuses (YTD)</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.bonusesThisYear)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {[
              { id: 'current', label: 'Current Salary', icon: DollarSign },
              { id: 'history', label: 'Salary History', icon: History },
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

        <div className="p-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <>
              {/* Current Salary Tab */}
              {activeTab === 'current' && (
                <CurrentSalaryView compensation={currentCompensation} />
              )}

              {/* Salary History Tab */}
              {activeTab === 'history' && (
                <SalaryHistoryView
                  history={compensationHistory}
                  onView={(item) => openDetail(item, 'compensation')}
                />
              )}

              {/* Increments Tab */}
              {activeTab === 'increments' && (
                <IncrementsView
                  increments={increments}
                  onView={(item) => openDetail(item, 'increment')}
                />
              )}

              {/* Bonuses Tab */}
              {activeTab === 'bonuses' && (
                <BonusesView
                  bonuses={bonuses}
                  onView={(item) => openDetail(item, 'bonus')}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedItem && (
        <DetailModal
          item={selectedItem}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

// Current Salary View Component
const CurrentSalaryView: React.FC<{ compensation: EmployeeCompensation | null }> = ({ compensation }) => {
  if (!compensation) {
    return (
      <div className="text-center py-12">
        <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No salary structure found</h3>
        <p className="text-gray-600">Your compensation details will appear here once set up.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Effective Date */}
      <div className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded-lg p-3">
        <Calendar className="w-5 h-5" />
        <span>Effective from: <strong>{formatDate(compensation.effective_from)}</strong></span>
      </div>

      {/* Salary Structure Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Indian Salary Structure (FY 2025-26)</p>
            <p className="text-blue-700">
              Your salary follows standard Indian compensation structure:
              Basic (40%), HRA (40%), Special Allowance (20%).
              Deductions include Professional Tax, ESI (if applicable), and TDS based on current tax slabs.
            </p>
          </div>
        </div>
      </div>

      {/* Earnings */}
      <div>
        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <ArrowUpRight className="w-5 h-5 text-green-500" />
          Earnings Breakdown
        </h3>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <SalaryItem 
              label="Basic Salary (40%)" 
              amount={compensation.basic_salary}
              percentage={(compensation.basic_salary / compensation.gross_salary * 100).toFixed(1)}
            />
            <SalaryItem 
              label="HRA (40%)" 
              amount={compensation.hra}
              percentage={(compensation.hra / compensation.gross_salary * 100).toFixed(1)}
            />
            <SalaryItem 
              label="DA" 
              amount={compensation.da}
              percentage={compensation.da > 0 ? (compensation.da / compensation.gross_salary * 100).toFixed(1) : undefined}
            />
            <SalaryItem 
              label="Special Allowance (20%)" 
              amount={compensation.special_allowance}
              percentage={(compensation.special_allowance / compensation.gross_salary * 100).toFixed(1)}
            />
            <SalaryItem 
              label="Transport Allowance" 
              amount={compensation.transport_allowance}
              percentage={compensation.transport_allowance > 0 ? (compensation.transport_allowance / compensation.gross_salary * 100).toFixed(1) : undefined}
            />
            <SalaryItem 
              label="Medical Allowance" 
              amount={compensation.medical_allowance}
              percentage={compensation.medical_allowance > 0 ? (compensation.medical_allowance / compensation.gross_salary * 100).toFixed(1) : undefined}
            />
            {compensation.other_allowances > 0 && (
              <SalaryItem 
                label="Other Allowances" 
                amount={compensation.other_allowances}
                percentage={(compensation.other_allowances / compensation.gross_salary * 100).toFixed(1)}
              />
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-green-200 flex justify-between items-center">
            <span className="font-medium text-gray-700">Gross Salary (Monthly)</span>
            <span className="text-xl font-bold text-green-600">{formatCurrency(compensation.gross_salary)}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-green-200 flex justify-between items-center">
            <span className="text-sm text-gray-600">Annual CTC</span>
            <span className="text-lg font-semibold text-green-700">{formatCurrency(compensation.gross_salary * 12)}</span>
          </div>
        </div>
      </div>

      {/* Deductions */}
      <div>
        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <ArrowDownRight className="w-5 h-5 text-red-500" />
          Statutory Deductions
        </h3>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {compensation.pf_contribution > 0 && (
              <SalaryItem 
                label="PF Contribution (12%)" 
                amount={compensation.pf_contribution} 
                isDeduction 
              />
            )}
            {compensation.esi_contribution > 0 && (
              <SalaryItem 
                label="ESI (0.75%)" 
                amount={compensation.esi_contribution} 
                isDeduction
                info="Applicable if gross ≤ ₹21,000"
              />
            )}
            <SalaryItem 
              label="Professional Tax" 
              amount={compensation.professional_tax} 
              isDeduction
              info="State-specific tax"
            />
            <SalaryItem 
              label="TDS (Income Tax)" 
              amount={compensation.tds} 
              isDeduction
              info="Based on new tax regime FY 2025-26"
            />
            {compensation.other_deductions > 0 && (
              <SalaryItem 
                label="Other Deductions" 
                amount={compensation.other_deductions} 
                isDeduction 
              />
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-red-200 flex justify-between items-center">
            <span className="font-medium text-gray-700">Total Deductions (Monthly)</span>
            <span className="text-xl font-bold text-red-600">-{formatCurrency(compensation.total_deductions)}</span>
          </div>
        </div>
      </div>

      {/* Net Salary */}
      <div className="bg-blue-100 rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-blue-800 font-medium">Net Salary (Take Home) (Monthly)</p>
            <p className="text-sm text-blue-600 mt-1">After all deductions</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-blue-800 block">{formatCurrency(compensation.net_salary)}</span>
            <span className="text-sm text-blue-700">₹{(compensation.net_salary * 12).toLocaleString('en-IN')} per year</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Salary Item Component
const SalaryItem: React.FC<{ 
  label: string; 
  amount: number; 
  isDeduction?: boolean;
  percentage?: string;
  info?: string;
}> = ({ label, amount, isDeduction, percentage, info }) => (
  <div>
    <div className="flex items-center gap-1">
      <p className="text-sm text-gray-600">{label}</p>
      {info && (
        <span className="text-xs text-gray-400" title={info}>ⓘ</span>
      )}
    </div>
    <p className={`font-medium ${isDeduction ? 'text-red-600' : 'text-gray-900'}`}>
      {isDeduction && amount > 0 ? '-' : ''}{formatCurrency(amount)}
      {percentage && <span className="text-xs text-gray-500 ml-1">({percentage}%)</span>}
    </p>
  </div>
);

// Salary History View
const SalaryHistoryView: React.FC<{
  history: EmployeeCompensation[];
  onView: (item: EmployeeCompensation) => void;
}> = ({ history, onView }) => {
  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No history available</h3>
        <p className="text-gray-600">Your salary change history will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((comp, index) => (
        <div
          key={comp.id}
          className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
            comp.is_current ? 'border-green-300 bg-green-50/50' : 'border-gray-200'
          }`}
          onClick={() => onView(comp)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${comp.is_current ? 'bg-green-100' : 'bg-gray-100'}`}>
                <DollarSign className={`w-5 h-5 ${comp.is_current ? 'text-green-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">Gross: {formatCurrency(comp.gross_salary)}</p>
                  {comp.is_current && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">Current</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">Net: {formatCurrency(comp.net_salary)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-gray-600">{formatDate(comp.effective_from)}</p>
                {comp.effective_to && (
                  <p className="text-xs text-gray-400">to {formatDate(comp.effective_to)}</p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Increments View
const IncrementsView: React.FC<{
  increments: SalaryIncrement[];
  onView: (item: SalaryIncrement) => void;
}> = ({ increments, onView }) => {
  if (increments.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No increments yet</h3>
        <p className="text-gray-600">Your salary increments will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {increments.map((inc) => (
        <div
          key={inc.id}
          className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => onView(inc)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${inc.increment_amount > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {inc.increment_amount > 0 ? (
                  <ArrowUpRight className="w-5 h-5 text-green-600" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">{incrementTypes[inc.increment_type]}</p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(inc.previous_basic)} → {formatCurrency(inc.new_basic)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className={`font-bold ${inc.increment_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {inc.increment_amount > 0 ? '+' : ''}{formatCurrency(inc.increment_amount)}
                </p>
                <p className="text-sm text-gray-500">{inc.increment_percentage?.toFixed(1)}%</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Effective: {formatDate(inc.effective_date)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Bonuses View
const BonusesView: React.FC<{
  bonuses: EmployeeBonus[];
  onView: (item: EmployeeBonus) => void;
}> = ({ bonuses, onView }) => {
  if (bonuses.length === 0) {
    return (
      <div className="text-center py-12">
        <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No bonuses yet</h3>
        <p className="text-gray-600">Your bonus payments will appear here.</p>
      </div>
    );
  }

  const totalBonuses = bonuses.reduce((sum, b) => sum + b.net_amount, 0);

  return (
    <div className="space-y-4">
      {/* Total Summary */}
      <div className="bg-purple-50 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-purple-800 font-medium">Total Bonuses Received</p>
          <p className="text-sm text-purple-600">{bonuses.length} bonus payments</p>
        </div>
        <span className="text-2xl font-bold text-purple-800">{formatCurrency(totalBonuses)}</span>
      </div>

      {/* Bonus List */}
      {bonuses.map((bonus) => (
        <div
          key={bonus.id}
          className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => onView(bonus)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Gift className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{bonus.bonus_name}</p>
                <p className="text-sm text-gray-500">{bonusTypes[bonus.bonus_type]}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-bold text-gray-900">{formatCurrency(bonus.net_amount)}</p>
                {bonus.tax_amount > 0 && (
                  <p className="text-xs text-gray-500">Tax: {formatCurrency(bonus.tax_amount)}</p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Paid</span>
            </div>
            {bonus.payment_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(bonus.payment_date)}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Detail Modal
const DetailModal: React.FC<{
  item: any;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const type = item._type;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {type === 'compensation' && 'Compensation Details'}
            {type === 'increment' && 'Increment Details'}
            {type === 'bonus' && 'Bonus Details'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {type === 'compensation' && (
            <>
              <DetailRow label="Effective From" value={formatDate(item.effective_from)} />
              {item.effective_to && <DetailRow label="Effective To" value={formatDate(item.effective_to)} />}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-green-600 mb-3">Earnings</h4>
                <DetailRow label="Basic Salary" value={formatCurrency(item.basic_salary)} />
                <DetailRow label="HRA" value={formatCurrency(item.hra)} />
                <DetailRow label="DA" value={formatCurrency(item.da)} />
                <DetailRow label="Special Allowance" value={formatCurrency(item.special_allowance)} />
                <DetailRow label="Transport Allowance" value={formatCurrency(item.transport_allowance)} />
                <DetailRow label="Medical Allowance" value={formatCurrency(item.medical_allowance)} />
                <DetailRow label="Gross Salary" value={formatCurrency(item.gross_salary)} highlight />
              </div>
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-red-600 mb-3">Deductions</h4>
                <DetailRow label="PF" value={formatCurrency(item.pf_contribution)} />
                <DetailRow label="ESI" value={formatCurrency(item.esi_contribution)} />
                <DetailRow label="Professional Tax" value={formatCurrency(item.professional_tax)} />
                <DetailRow label="TDS" value={formatCurrency(item.tds)} />
                <DetailRow label="Total Deductions" value={formatCurrency(item.total_deductions)} highlight />
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <DetailRow label="Net Salary" value={formatCurrency(item.net_salary)} highlight />
              </div>
            </>
          )}

          {type === 'increment' && (
            <>
              <DetailRow label="Type" value={incrementTypes[item.increment_type]} />
              <DetailRow label="Effective Date" value={formatDate(item.effective_date)} />
              <div className="border-t border-gray-200 pt-4">
                <DetailRow label="Previous Basic" value={formatCurrency(item.previous_basic)} />
                <DetailRow label="New Basic" value={formatCurrency(item.new_basic)} />
                <DetailRow 
                  label="Increment Amount" 
                  value={`${item.increment_amount > 0 ? '+' : ''}${formatCurrency(item.increment_amount)}`} 
                  highlight 
                />
                <DetailRow label="Increment %" value={`${item.increment_percentage?.toFixed(2)}%`} />
              </div>
              {item.reason && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-600">Reason</p>
                  <p className="text-gray-900">{item.reason}</p>
                </div>
              )}
            </>
          )}

          {type === 'bonus' && (
            <>
              <DetailRow label="Bonus Name" value={item.bonus_name} />
              <DetailRow label="Type" value={bonusTypes[item.bonus_type]} />
              <div className="border-t border-gray-200 pt-4">
                <DetailRow label="Gross Amount" value={formatCurrency(item.amount)} />
                {item.is_taxable && <DetailRow label="Tax Deducted" value={formatCurrency(item.tax_amount)} />}
                <DetailRow label="Net Amount" value={formatCurrency(item.net_amount)} highlight />
              </div>
              {item.payment_date && (
                <DetailRow label="Payment Date" value={formatDate(item.payment_date)} />
              )}
              {item.reason && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-600">Reason</p>
                  <p className="text-gray-900">{item.reason}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Detail Row Component
const DetailRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="flex justify-between items-center py-1">
    <span className="text-gray-600">{label}</span>
    <span className={highlight ? 'font-bold text-gray-900' : 'text-gray-900'}>{value}</span>
  </div>
);

export default EmployeeCompensationView;
