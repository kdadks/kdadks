import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Download,
  Filter
} from 'lucide-react';
import { leaveAttendanceService } from '../../services/leaveAttendanceService';
import { employeeService } from '../../services/employeeService';
import { useToast } from '../ui/ToastProvider';
import type { AttendanceRecord, MonthlyAttendanceSummary } from '../../types/payroll';
import type { Employee } from '../../types/employee';

interface AttendanceManagementProps {
  onBackToDashboard?: () => void;
}

type ActiveTab = 'mark-attendance' | 'view-records' | 'monthly-summary';

const AttendanceManagement: React.FC<AttendanceManagementProps> = ({ onBackToDashboard }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('mark-attendance');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlyAttendanceSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { showSuccess, showError } = useToast();

  // Attendance marking state
  const [bulkAttendance, setBulkAttendance] = useState<{
    [key: string]: {
      status: 'present' | 'absent' | 'half-day' | 'leave';
      check_in_time?: string;
      check_out_time?: string;
      notes?: string;
    };
  }>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'view-records') {
      loadAttendanceRecords();
    } else if (activeTab === 'monthly-summary') {
      loadMonthlySummary();
    }
  }, [activeTab, selectedDate, selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      const emps = await employeeService.getEmployees();
      setEmployees(emps.filter(e => e.employment_status === 'active'));

      // Initialize bulk attendance with default values
      const initial: typeof bulkAttendance = {};
      emps.forEach(emp => {
        initial[emp.id] = {
          status: 'present',
          check_in_time: '09:00',
          check_out_time: '18:00'
        };
      });
      setBulkAttendance(initial);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Failed to load employee data');
    } finally {
      setLoading(false);
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

  const loadMonthlySummary = async () => {
    try {
      const summary = await leaveAttendanceService.getMonthlyAttendanceSummary(
        selectedYear,
        selectedMonth
      );
      setMonthlySummary(summary);
    } catch (error) {
      console.error('Error loading monthly summary:', error);
    }
  };

  const handleMarkAttendance = async (employeeId: string) => {
    try {
      const data = bulkAttendance[employeeId];
      if (!data) return;

      await leaveAttendanceService.markAttendance({
        employee_id: employeeId,
        attendance_date: selectedDate,
        status: data.status,
        check_in_time: data.check_in_time,
        check_out_time: data.check_out_time,
        notes: data.notes
      });

      showSuccess('Attendance marked successfully');
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      showError(error.message || 'Failed to mark attendance');
    }
  };

  const handleBulkMarkAttendance = async () => {
    try {
      const promises = employees.map(emp => {
        const data = bulkAttendance[emp.id];
        return leaveAttendanceService.markAttendance({
          employee_id: emp.id,
          attendance_date: selectedDate,
          status: data.status,
          check_in_time: data.check_in_time,
          check_out_time: data.check_out_time,
          notes: data.notes
        });
      });

      await Promise.all(promises);
      showSuccess(`Attendance marked for ${employees.length} employees`);
      setActiveTab('view-records');
    } catch (error: any) {
      console.error('Error marking bulk attendance:', error);
      showError(error.message || 'Failed to mark attendance');
    }
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
              {onBackToDashboard && (
                <button
                  onClick={onBackToDashboard}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Dashboard
                </button>
              )}
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
              onClick={() => setActiveTab('mark-attendance')}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'mark-attendance'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-4 h-4 mr-2" />
              Mark Attendance
            </button>
            <button
              onClick={() => setActiveTab('view-records')}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'view-records'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4 mr-2" />
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
        {/* Mark Attendance Tab */}
        {activeTab === 'mark-attendance' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attendance Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleBulkMarkAttendance}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 flex items-center"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark All Attendance
              </button>
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
                      Notes
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{emp.full_name}</div>
                        <div className="text-sm text-gray-500">{emp.employee_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={bulkAttendance[emp.id]?.status || 'present'}
                          onChange={(e) => setBulkAttendance({
                            ...bulkAttendance,
                            [emp.id]: {
                              ...bulkAttendance[emp.id],
                              status: e.target.value as any
                            }
                          })}
                          className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="half-day">Half Day</option>
                          <option value="leave">On Leave</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="time"
                          value={bulkAttendance[emp.id]?.check_in_time || '09:00'}
                          onChange={(e) => setBulkAttendance({
                            ...bulkAttendance,
                            [emp.id]: {
                              ...bulkAttendance[emp.id],
                              check_in_time: e.target.value
                            }
                          })}
                          className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="time"
                          value={bulkAttendance[emp.id]?.check_out_time || '18:00'}
                          onChange={(e) => setBulkAttendance({
                            ...bulkAttendance,
                            [emp.id]: {
                              ...bulkAttendance[emp.id],
                              check_out_time: e.target.value
                            }
                          })}
                          className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={bulkAttendance[emp.id]?.notes || ''}
                          onChange={(e) => setBulkAttendance({
                            ...bulkAttendance,
                            [emp.id]: {
                              ...bulkAttendance[emp.id],
                              notes: e.target.value
                            }
                          })}
                          placeholder="Notes..."
                          className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleMarkAttendance(emp.id)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          Mark
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                  <div className="w-4 h-4 bg-gray-200 rounded mr-2"></div>
                  <span className="text-sm text-gray-700">Not Marked</span>
                </div>
              </div>
            </div>

            {/* Calendar View for Each Employee */}
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
                          Total: {summary.work_hours.toFixed(2)} hrs
                        </div>
                      </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2">
                      {/* Day Headers */}
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                          {day}
                        </div>
                      ))}

                      {/* Empty cells for days before month starts */}
                      {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                        <div key={`empty-${index}`} className="aspect-square"></div>
                      ))}

                      {/* Calendar Days */}
                      {Array.from({ length: daysInMonth }).map((_, index) => {
                        const day = index + 1;
                        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const record = attendanceRecords.find(
                          r => r.employee_id === summary.employee_id && r.attendance_date === dateStr
                        );

                        const getStatusColor = () => {
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
                          if (!record) return '';
                          switch (record.status) {
                            case 'present': return 'P';
                            case 'absent': return 'A';
                            case 'half-day': return 'H';
                            case 'on-leave': return 'L';
                            default: return '';
                          }
                        };

                        return (
                          <div
                            key={day}
                            className={`aspect-square flex flex-col items-center justify-center rounded-md ${getStatusColor()} text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity`}
                            title={record ? `${record.status} - ${record.check_in_time || ''} to ${record.check_out_time || ''}` : 'Not marked'}
                          >
                            <div className="text-xs">{day}</div>
                            {getStatusLabel() && (
                              <div className="text-xs mt-0.5 font-bold">{getStatusLabel()}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {monthlySummary.length === 0 && (
                <div className="bg-white shadow-md rounded-lg p-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No attendance records found for this month.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AttendanceManagement;
