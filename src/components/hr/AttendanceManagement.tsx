import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Download,
  Filter,
  Plus,
  Trash2,
  Edit,
  Save,
  X
} from 'lucide-react';
import { leaveAttendanceService } from '../../services/leaveAttendanceService';
import { employeeService } from '../../services/employeeService';
import { useToast } from '../ui/ToastProvider';
import type { AttendanceRecord, MonthlyAttendanceSummary } from '../../types/payroll';
import type { Employee } from '../../types/employee';
import { supabase } from '../../config/supabase';

interface AttendanceManagementProps {
  onBackToDashboard?: () => void;
}

interface CompanyHoliday {
  id: string;
  holiday_name: string;
  holiday_date: string;
  holiday_type: 'national' | 'regional' | 'company';
  is_mandatory: boolean;
  description?: string;
  created_at?: string;
}

type ActiveTab = 'holiday-calendar' | 'view-records' | 'monthly-summary';

const AttendanceManagement: React.FC<AttendanceManagementProps> = ({ onBackToDashboard }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('holiday-calendar');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlyAttendanceSummary[]>([]);
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { showSuccess, showError } = useToast();

  // Holiday form state
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<CompanyHoliday | null>(null);
  const [holidayForm, setHolidayForm] = useState<Partial<CompanyHoliday>>({
    holiday_name: '',
    holiday_date: '',
    holiday_type: 'national',
    is_mandatory: true,
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'holiday-calendar') {
      loadHolidays();
    } else if (activeTab === 'view-records') {
      loadAttendanceRecords();
    } else if (activeTab === 'monthly-summary' && selectedEmployee) {
      loadMonthlySummaryForEmployee();
    }
  }, [activeTab, selectedDate, selectedMonth, selectedYear, selectedEmployee]);

  const loadData = async () => {
    try {
      setLoading(true);
      const emps = await employeeService.getEmployees();
      setEmployees(emps.filter(e => e.employment_status === 'active'));
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  const loadHolidays = async () => {
    try {
      const { data, error } = await supabase
        .from('company_holidays')
        .select('*')
        .order('holiday_date', { ascending: true });

      if (error) throw error;
      setHolidays(data || []);
    } catch (error) {
      console.error('Error loading holidays:', error);
      showError('Failed to load holidays');
    }
  };

  const loadAttendanceRecords = async () => {
    try {
      const records = await leaveAttendanceService.getAttendanceByDate(new Date(selectedDate));
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error loading attendance records:', error);
    }
  };

  const loadMonthlySummaryForEmployee = async () => {
    try {
      if (!selectedEmployee) return;
      
      const summary = await leaveAttendanceService.getMonthlyAttendanceSummary(
        selectedYear,
        selectedMonth
      );
      
      // Filter for selected employee
      const employeeSummary = summary.filter(s => s.employee_id === selectedEmployee);
      setMonthlySummary(employeeSummary);

      // Load all attendance records for the month for this employee
      const firstDay = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
      
      const { data: records, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', selectedEmployee)
        .gte('attendance_date', firstDay)
        .lte('attendance_date', lastDay)
        .order('attendance_date', { ascending: true });

      if (error) throw error;
      setAttendanceRecords(records || []);
    } catch (error) {
      console.error('Error loading monthly summary:', error);
      showError('Failed to load monthly summary');
    }
  };

  const handleSaveHoliday = async () => {
    try {
      if (!holidayForm.holiday_name || !holidayForm.holiday_date) {
        showError('Please fill all required fields');
        return;
      }

      if (editingHoliday) {
        // Update existing holiday
        const { data: updatedHolidays, error } = await supabase
          .from('company_holidays')
          .update({
            holiday_name: holidayForm.holiday_name,
            holiday_date: holidayForm.holiday_date,
            holiday_type: holidayForm.holiday_type,
            is_mandatory: holidayForm.is_mandatory,
            description: holidayForm.description
          })
          .eq('id', editingHoliday.id)
          .select('*');

        if (error) throw error;
        const updatedHoliday = updatedHolidays?.[0];
        if (updatedHoliday) {
          setHolidays((prev) =>
            prev.map((holiday) => (holiday.id === updatedHoliday.id ? updatedHoliday : holiday))
          );
        } else {
          await loadHolidays();
        }
        showSuccess('Holiday updated successfully');
      } else {
        // Create new holiday
        const { data: newHolidays, error } = await supabase
          .from('company_holidays')
          .insert({
            holiday_name: holidayForm.holiday_name,
            holiday_date: holidayForm.holiday_date,
            holiday_type: holidayForm.holiday_type,
            is_mandatory: holidayForm.is_mandatory,
            description: holidayForm.description
          })
          .select('*');

        if (error) throw error;
        const newHoliday = newHolidays?.[0];
        if (newHoliday) {
          setHolidays((prev) => [...prev, newHoliday].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date)));
        } else {
          await loadHolidays();
        }
        showSuccess('Holiday added successfully');
      }

      setShowHolidayForm(false);
      setEditingHoliday(null);
      setHolidayForm({
        holiday_name: '',
        holiday_date: '',
        holiday_type: 'national',
        is_mandatory: true,
        description: ''
      });
      loadHolidays();
    } catch (error: any) {
      console.error('Error saving holiday:', error);
      showError(error.message || 'Failed to save holiday');
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;

    try {
      const { error } = await supabase
        .from('company_holidays')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showSuccess('Holiday deleted successfully');
      loadHolidays();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      showError('Failed to delete holiday');
    }
  };

  const handleEditHoliday = (holiday: CompanyHoliday) => {
    setEditingHoliday(holiday);
    setHolidayForm({
      holiday_name: holiday.holiday_name,
      holiday_date: holiday.holiday_date,
      holiday_type: holiday.holiday_type,
      is_mandatory: holiday.is_mandatory,
      description: holiday.description
    });
    setShowHolidayForm(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      present: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      absent: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
      'half-day': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      leave: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Calendar }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.present;
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
              <h1 className="text-xl font-semibold text-gray-900">Attendance Management</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-4 py-4">
            <button
              onClick={() => setActiveTab('holiday-calendar')}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'holiday-calendar'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Holiday Calendar
            </button>
            <button
              onClick={() => setActiveTab('view-records')}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'view-records'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-4 h-4 mr-2" />
              View Records
            </button>
            <button
              onClick={() => setActiveTab('monthly-summary')}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'monthly-summary'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Monthly Summary
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Holiday Calendar Tab */}
        {activeTab === 'holiday-calendar' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Company Holiday Calendar</h2>
              <button
                onClick={() => {
                  setShowHolidayForm(true);
                  setEditingHoliday(null);
                  setHolidayForm({
                    holiday_name: '',
                    holiday_date: '',
                    holiday_type: 'national',
                    is_mandatory: true,
                    description: ''
                  });
                }}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Holiday
              </button>
            </div>

            {/* Holiday Form Modal */}
            {showHolidayForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
                    </h3>
                    <button
                      onClick={() => {
                        setShowHolidayForm(false);
                        setEditingHoliday(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Holiday Name *
                      </label>
                      <input
                        type="text"
                        value={holidayForm.holiday_name}
                        onChange={(e) => setHolidayForm({ ...holidayForm, holiday_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Republic Day"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={holidayForm.holiday_date}
                        onChange={(e) => setHolidayForm({ ...holidayForm, holiday_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Holiday Type
                      </label>
                      <select
                        value={holidayForm.holiday_type}
                        onChange={(e) => setHolidayForm({ ...holidayForm, holiday_type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="national">National Holiday</option>
                        <option value="regional">Regional Holiday</option>
                        <option value="company">Company Holiday</option>
                      </select>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_mandatory"
                        checked={holidayForm.is_mandatory}
                        onChange={(e) => setHolidayForm({ ...holidayForm, is_mandatory: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="is_mandatory" className="ml-2 text-sm text-gray-700">
                        Mandatory Holiday (Office Closed)
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={holidayForm.description}
                        onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Optional description..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => {
                        setShowHolidayForm(false);
                        setEditingHoliday(null);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md hover:from-red-600 hover:to-red-700 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveHoliday}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {editingHoliday ? 'Update' : 'Add'} Holiday
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Holidays List */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Holiday Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {holidays.map((holiday) => (
                    <tr key={holiday.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{holiday.holiday_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(holiday.holiday_date).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          holiday.holiday_type === 'national' ? 'bg-red-100 text-red-800' :
                          holiday.holiday_type === 'regional' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {holiday.holiday_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          holiday.is_mandatory ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {holiday.is_mandatory ? 'Mandatory' : 'Optional'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {holiday.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditHoliday(holiday)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Edit Holiday"
                        >
                          <Edit className="w-5 h-5 inline" />
                        </button>
                        <button
                          onClick={() => handleDeleteHoliday(holiday.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Holiday"
                        >
                          <Trash2 className="w-5 h-5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {holidays.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No holidays added yet. Click "Add Holiday" to create one.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mark Attendance Tab - REMOVED */}

        {/* View Records Tab */}
        {activeTab === 'view-records' && (
          <div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Working Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceRecords.map((record) => {
                    const employee = employees.find(e => e.id === record.employee_id);
                    return (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{employee?.full_name}</div>
                          <div className="text-sm text-gray-500">{employee?.employee_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(record.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.check_in_time || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.check_out_time || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.work_hours ? `${record.work_hours.toFixed(2)} hrs` : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {record.remarks || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Monthly Summary Tab */}
        {activeTab === 'monthly-summary' && (
          <div>
            <div className="mb-6 flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Employee *
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 min-w-[250px]"
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_number})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {!selectedEmployee ? (
              <div className="bg-white shadow-md rounded-lg p-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Please select an employee to view their monthly attendance summary.</p>
              </div>
            ) : (
              <>
                {/* Legend */}
                <div className="mb-6 bg-white shadow-md rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Legend:</h3>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                      <span className="text-sm text-gray-700">Present</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                      <span className="text-sm text-gray-700">Absent</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                      <span className="text-sm text-gray-700">Half Day</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                      <span className="text-sm text-gray-700">On Leave</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-purple-500 rounded mr-2"></div>
                      <span className="text-sm text-gray-700">Holiday</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-gray-200 rounded mr-2"></div>
                      <span className="text-sm text-gray-700">Not Marked</span>
                    </div>
                  </div>
                </div>

                {/* Calendar View for Selected Employee */}
                <div className="space-y-6">
                  {monthlySummary.map((summary) => {
                    const employee = employees.find(e => e.id === summary.employee_id);
                    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
                    const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1).getDay();

                    return (
                      <div key={summary.employee_id} className="bg-white shadow-md rounded-lg p-6">
                        {/* Employee Header */}
                        <div className="mb-4 flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{employee?.full_name}</h3>
                            <p className="text-sm text-gray-500">{employee?.employee_number}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">
                              <span className="text-green-600 font-medium">{summary.present_days}P</span>
                              {' / '}
                              <span className="text-red-600 font-medium">{summary.absent_days}A</span>
                              {' / '}
                              <span className="text-yellow-600 font-medium">{summary.half_days}H</span>
                              {' / '}
                              <span className="text-blue-600 font-medium">{summary.leave_days}L</span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Total Hours: {summary.work_hours.toFixed(2)} hrs
                            </div>
                          </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1">
                          {/* Day Headers */}
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
                              {day}
                            </div>
                          ))}

                          {/* Empty cells for days before month starts */}
                          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                            <div key={`empty-${index}`} className="h-10"></div>
                          ))}

                          {/* Calendar Days */}
                          {Array.from({ length: daysInMonth }).map((_, index) => {
                            const day = index + 1;
                            const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const record = attendanceRecords.find(
                              r => r.employee_id === summary.employee_id && r.attendance_date === dateStr
                            );

                            // Check if this date is a holiday
                            const isHoliday = holidays.some(h => h.holiday_date === dateStr);
                            const holiday = holidays.find(h => h.holiday_date === dateStr);

                            const getStatusColor = () => {
                              if (isHoliday) return 'bg-purple-500 text-white';
                              if (!record) return 'bg-gray-200 text-gray-700';
                              switch (record.status) {
                                case 'present': return 'bg-green-500 text-white';
                                case 'absent': return 'bg-red-500 text-white';
                                case 'half-day': return 'bg-yellow-500 text-white';
                                case 'on-leave': return 'bg-blue-500 text-white';
                                default: return 'bg-gray-200 text-gray-700';
                              }
                            };

                            const getStatusLabel = () => {
                              if (isHoliday) return 'H';
                              if (!record) return '';
                              switch (record.status) {
                                case 'present': return 'P';
                                case 'absent': return 'A';
                                case 'half-day': return 'H';
                                case 'on-leave': return 'L';
                                default: return '';
                              }
                            };

                            const getTitle = () => {
                              if (isHoliday) return `Holiday: ${holiday?.holiday_name}`;
                              if (record) return `${record.status} - ${record.check_in_time || ''} to ${record.check_out_time || ''}`;
                              return 'Not marked';
                            };

                            const getDisplayText = () => {
                              if (isHoliday) return holiday?.holiday_name || 'Holiday';
                              if (!record) return '';
                              if (record.status === 'on-leave') return 'Leave';
                              if (!record.work_hours) return '';
                              return `${parseFloat(record.work_hours.toString()).toFixed(1)}h`;
                            };

                            return (
                              <div
                                key={day}
                                className={`h-10 flex flex-col items-center justify-center rounded ${getStatusColor()} text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity`}
                                title={getTitle()}
                              >
                                <div className="text-xs leading-tight">{day}</div>
                                {getDisplayText() && (
                                  <div className="text-[10px] font-bold leading-tight truncate max-w-full px-0.5">{getDisplayText()}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {monthlySummary.length === 0 && selectedEmployee && (
                    <div className="bg-white shadow-md rounded-lg p-12 text-center">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No attendance records found for this employee in the selected month.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AttendanceManagement;
