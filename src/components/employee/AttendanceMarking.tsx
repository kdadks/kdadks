import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Calendar as CalendarIcon } from 'lucide-react';
import { attendanceService } from '../../services/attendanceService';
import type { AttendanceStatus, Attendance, AttendanceSummary } from '../../types/employee';

export default function AttendanceMarking() {
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [monthlyAttendance, setMonthlyAttendance] = useState<Attendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [currentUser] = useState(() => {
    const session = sessionStorage.getItem('employee_session');
    if (session) {
      const employee = JSON.parse(session);
      return { id: employee.id };
    }
    return { id: '' };
  });

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadAttendanceData();
  }, []);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);

      // Get today's attendance
      const todayData = await attendanceService.getAttendanceByDateRange(
        currentUser.id,
        today,
        today
      );
      setTodayAttendance(todayData?.[0] || null);

      // Get monthly attendance
      const firstDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
      const monthData = await attendanceService.getAttendanceByDateRange(
        currentUser.id,
        firstDay,
        lastDay
      );
      setMonthlyAttendance(monthData || []);

      // Get monthly summary
      const summaryData = await attendanceService.getMonthlyAttendanceSummary(
        currentUser.id,
        currentMonth,
        currentYear
      );
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (status: AttendanceStatus) => {
    try {
      setLoading(true);

      const currentTime = new Date().toTimeString().split(' ')[0];
      
      await attendanceService.markAttendance(
        currentUser.id,
        today,
        status,
        status === 'present' || status === 'half-day' ? (checkInTime || currentTime) : undefined,
        checkOutTime || undefined
      );

      await loadAttendanceData();
      alert(`Attendance marked as ${status}!`);
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      present: 'bg-green-100 text-green-800 border-green-300',
      absent: 'bg-red-100 text-red-800 border-red-300',
      half_day: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      on_leave: 'bg-blue-100 text-blue-800 border-blue-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4" />;
      case 'absent':
        return <XCircle className="w-4 h-4" />;
      case 'half_day':
        return <Clock className="w-4 h-4" />;
      default:
        return <CalendarIcon className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900">Attendance Tracking</h1>
        <p className="text-gray-600 mt-2">Mark your daily attendance and view attendance history</p>
      </div>

      {/* Today's Attendance */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Attendance</h2>
        
        {todayAttendance ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="text-lg font-semibold text-gray-900">Attendance Marked</p>
                  <p className="text-sm text-gray-600">
                    Status: <span className="font-medium capitalize">{todayAttendance.status}</span>
                  </p>
                  {todayAttendance.check_in_time && (
                    <p className="text-sm text-gray-600">
                      Check-in: {todayAttendance.check_in_time}
                      {todayAttendance.check_out_time && ` | Check-out: ${todayAttendance.check_out_time}`}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => loadAttendanceData()}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Refresh
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-in Time (Optional)
                </label>
                <input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-out Time (Optional)
                </label>
                <input
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => markAttendance('present')}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Present
              </button>
              
              <button
                onClick={() => markAttendance('half-day')}
                disabled={loading}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center justify-center"
              >
                <Clock className="w-5 h-5 mr-2" />
                Half Day
              </button>
              
              <button
                onClick={() => markAttendance('absent')}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Absent
              </button>
              
              <button
                onClick={() => markAttendance('on-leave')}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                <CalendarIcon className="w-5 h-5 mr-2" />
                On Leave
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Total Days</p>
            <p className="text-2xl font-bold text-gray-900">{summary.total_working_days}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Present</p>
            <p className="text-2xl font-bold text-green-600">{summary.days_present}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Absent</p>
            <p className="text-2xl font-bold text-red-600">{summary.days_absent}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Half Day</p>
            <p className="text-2xl font-bold text-yellow-600">{summary.days_half_day}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Attendance %</p>
            <p className="text-2xl font-bold text-primary-600">
              {summary.attendance_percentage?.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Attendance History */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Check-in
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Check-out
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {monthlyAttendance.map((record) => (
                <tr key={record.id}>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-900">
                    {new Date(record.attendance_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center w-fit ${getStatusColor(record.status)}`}>
                      {getStatusIcon(record.status)}
                      <span className="ml-2 capitalize">{record.status.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                    {record.check_in_time || '-'}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                    {record.check_out_time || '-'}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                    {record.check_in_time && record.check_out_time ? 
                      `${((new Date(`1970-01-01T${record.check_out_time}`).getTime() - new Date(`1970-01-01T${record.check_in_time}`).getTime()) / (1000 * 60 * 60)).toFixed(1)}h` : '-'}
                  </td>
                </tr>
              ))}
              {monthlyAttendance.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No attendance records found for this month
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

