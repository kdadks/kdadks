import { useState, useEffect } from 'react';
import { Calendar, Clock, FileText, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { leaveService } from '../../services/leaveService';
import { attendanceService } from '../../services/attendanceService';

interface DashboardStats {
  leavesRemaining: { [key: string]: number };
  attendancePercentage: number;
  pendingLeaves: number;
  lastSalarySlip?: Record<string, unknown>;
}

export default function EmployeeDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    leavesRemaining: {},
    attendancePercentage: 0,
    pendingLeaves: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentUser] = useState(() => {
    // Get employee from session storage
    const session = sessionStorage.getItem('employee_session');
    if (session) {
      const employee = JSON.parse(session);
      return { id: employee.id, name: employee.name };
    }
    return { id: '', name: '' };
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      // Get leave balance
      const leaves = await leaveService.getRemainingLeaves(currentUser.id, currentYear);
      const leaveBalance: { [key: string]: number } = {};
      leaves?.forEach((leave: { leave_type: string; remaining: number }) => {
        leaveBalance[leave.leave_type] = leave.remaining;
      });

      // Get attendance summary
      const attendance = await attendanceService.getMonthlyAttendanceSummary(
        currentUser.id,
        currentMonth,
        currentYear
      );

      // Get pending leaves count
      const employeeLeaves = await leaveService.getEmployeeLeaves(currentUser.id, { status: 'pending' });

      setStats({
        leavesRemaining: leaveBalance,
        attendancePercentage: attendance?.attendance_percentage || 0,
        pendingLeaves: employeeLeaves?.length || 0,
        lastSalarySlip: undefined, // TODO: Fetch from salary service
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {currentUser.name}!</h1>
        <p className="text-gray-600 mt-2">Here's your employee dashboard overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Attendance Card */}
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Attendance</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.attendancePercentage.toFixed(1)}%
              </p>
              <p className="text-gray-500 text-xs mt-1">This month</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Casual Leaves */}
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Casual Leaves</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.leavesRemaining['Casual Leave'] || 0}
              </p>
              <p className="text-gray-500 text-xs mt-1">Days remaining</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Sick Leaves */}
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Sick Leaves</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.leavesRemaining['Sick Leave'] || 0}
              </p>
              <p className="text-gray-500 text-xs mt-1">Days remaining</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Pending Leaves */}
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Pending Approvals</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.pendingLeaves}
              </p>
              <p className="text-gray-500 text-xs mt-1">Leave requests</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => window.location.href = '/employee/leaves'}
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <Calendar className="w-8 h-8 text-primary-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Apply Leave</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/employee/attendance'}
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <Clock className="w-8 h-8 text-primary-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Mark Attendance</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/employee/salary'}
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <TrendingUp className="w-8 h-8 text-primary-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Salary Slips</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/employee/documents'}
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <FileText className="w-8 h-8 text-primary-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Documents</span>
          </button>
        </div>
      </div>

      {/* Leave Balance Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave Balance</h2>
          <div className="space-y-3">
            {Object.entries(stats.leavesRemaining).map(([type, remaining]) => (
              <div key={type} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                    <Calendar className="w-5 h-5 text-primary-600" />
                  </div>
                  <span className="text-gray-700 font-medium">{type}</span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{remaining}</p>
                  <p className="text-xs text-gray-500">days left</p>
                </div>
              </div>
            ))}
            {Object.keys(stats.leavesRemaining).length === 0 && (
              <p className="text-gray-500 text-center py-4">No leave balance data available</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Attendance marked</p>
                <p className="text-xs text-gray-500">Today at 9:00 AM</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3 mt-1">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Leave application pending</p>
                <p className="text-xs text-gray-500">2 days ago</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-1">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Salary slip generated</p>
                <p className="text-xs text-gray-500">Last month</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

