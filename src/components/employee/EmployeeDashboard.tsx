import { useState, useEffect } from 'react';
import { Calendar, Clock, FileText, TrendingUp, AlertCircle, CheckCircle, Bell } from 'lucide-react';
import { leaveService } from '../../services/leaveService';
import { attendanceService } from '../../services/attendanceService';
import { announcementService } from '../../services/announcementService';
import { supabase } from '../../config/supabase';

interface ActivityItem {
  id: string;
  type: 'attendance' | 'leave' | 'salary';
  title: string;
  timestamp: string;
  icon: 'check' | 'alert' | 'file';
  color: 'green' | 'yellow' | 'blue';
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned?: boolean;
  is_read?: boolean;
}

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
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
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

      // Load recent activity
      await loadRecentActivity();

      // Load announcements
      await loadAnnouncements();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const activities: ActivityItem[] = [];

      // Get recent attendance (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: attendanceRecords } = await supabase
        .from('attendance_records')
        .select('attendance_date, check_in_time, status')
        .eq('employee_id', currentUser.id)
        .gte('attendance_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('attendance_date', { ascending: false })
        .limit(3);

      if (attendanceRecords) {
        attendanceRecords.forEach(record => {
          activities.push({
            id: `attendance-${record.attendance_date}`,
            type: 'attendance',
            title: record.status === 'on-leave' ? 'On Leave' : 'Attendance marked',
            timestamp: new Date(record.attendance_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            icon: 'check',
            color: record.status === 'on-leave' ? 'yellow' : 'green'
          });
        });
      }

      // Get recent leave applications (last 30 days)
      const { data: leaveApps } = await supabase
        .from('leave_applications')
        .select('id, status, applied_at, from_date, to_date')
        .eq('employee_id', currentUser.id)
        .order('applied_at', { ascending: false })
        .limit(3);

      if (leaveApps) {
        leaveApps.forEach(leave => {
          const status = leave.status === 'pending' ? 'pending' : leave.status === 'approved' ? 'approved' : 'rejected';
          activities.push({
            id: `leave-${leave.id}`,
            type: 'leave',
            title: `Leave application ${status}`,
            timestamp: new Date(leave.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            icon: status === 'pending' ? 'alert' : status === 'approved' ? 'check' : 'alert',
            color: status === 'pending' ? 'yellow' : status === 'approved' ? 'green' : 'yellow'
          });
        });
      }

      // Sort all activities by timestamp (most recent first)
      activities.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });

      setRecentActivities(activities.slice(0, 5)); // Show only 5 most recent
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const data = await announcementService.getEmployeeAnnouncements(currentUser.id);
      setAnnouncements(data.slice(0, 5)); // Show only 5 most recent
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

  const getActivityIcon = (icon: string, color: string) => {
    const colorClasses = {
      green: 'bg-green-100 text-green-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      blue: 'bg-blue-100 text-blue-600'
    };

    const IconComponent = icon === 'check' ? CheckCircle : icon === 'alert' ? AlertCircle : FileText;

    return (
      <div className={`w-8 h-8 ${colorClasses[color as keyof typeof colorClasses]} rounded-full flex items-center justify-center mr-3 mt-1`}>
        <IconComponent className="w-4 h-4" />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Welcome, {currentUser.name}!</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Your employee dashboard overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4">
        {/* Attendance Card */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-gray-600 text-xs sm:text-sm font-medium truncate">Attendance</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
                {stats.attendancePercentage.toFixed(1)}%
              </p>
              <p className="text-gray-500 text-[10px] sm:text-xs mt-1">This month</p>
            </div>
            <div className="bg-blue-100 rounded-full p-2 sm:p-3 flex-shrink-0 ml-2">
              <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Casual Leaves */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-gray-600 text-xs sm:text-sm font-medium truncate">Casual</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
                {stats.leavesRemaining['Casual Leave'] || 0}
              </p>
              <p className="text-gray-500 text-[10px] sm:text-xs mt-1">Days left</p>
            </div>
            <div className="bg-green-100 rounded-full p-2 sm:p-3 flex-shrink-0 ml-2">
              <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Sick Leaves */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-gray-600 text-xs sm:text-sm font-medium truncate">Sick</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
                {stats.leavesRemaining['Sick Leave'] || 0}
              </p>
              <p className="text-gray-500 text-[10px] sm:text-xs mt-1">Days left</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-2 sm:p-3 flex-shrink-0 ml-2">
              <AlertCircle className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Pending Leaves */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-gray-600 text-xs sm:text-sm font-medium truncate">Pending</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
                {stats.pendingLeaves}
              </p>
              <p className="text-gray-500 text-[10px] sm:text-xs mt-1">Requests</p>
            </div>
            <div className="bg-purple-100 rounded-full p-2 sm:p-3 flex-shrink-0 ml-2">
              <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <button
            onClick={() => window.location.href = '/employee/leaves'}
            className="flex flex-col items-center justify-center p-3 sm:p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 active:bg-primary-100 transition-colors touch-manipulation"
          >
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 mb-1 sm:mb-2" />
            <span className="text-xs sm:text-sm font-medium text-gray-700 text-center">Apply Leave</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/employee/attendance'}
            className="flex flex-col items-center justify-center p-3 sm:p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 active:bg-primary-100 transition-colors touch-manipulation"
          >
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 mb-1 sm:mb-2" />
            <span className="text-xs sm:text-sm font-medium text-gray-700 text-center">Attendance</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/employee/salary'}
            className="flex flex-col items-center justify-center p-3 sm:p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 active:bg-primary-100 transition-colors touch-manipulation"
          >
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 mb-1 sm:mb-2" />
            <span className="text-xs sm:text-sm font-medium text-gray-700 text-center">Salary</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/employee/documents'}
            className="flex flex-col items-center justify-center p-3 sm:p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 active:bg-primary-100 transition-colors touch-manipulation"
          >
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 mb-1 sm:mb-2" />
            <span className="text-xs sm:text-sm font-medium text-gray-700 text-center">Documents</span>
          </button>
        </div>
      </div>

      {/* Company Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">📢 Announcements</h2>
          <div className="space-y-3">
            {announcements.length > 0 ? (
              announcements.map(announcement => (
                <div key={announcement.id} className={`border-l-4 p-3 rounded ${
                  announcement.priority === 'urgent' ? 'border-red-500 bg-red-50' :
                  announcement.priority === 'high' ? 'border-orange-500 bg-orange-50' :
                  'border-primary-500 bg-primary-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {announcement.is_pinned && <Bell className="w-4 h-4 text-primary-600" />}
                        <h3 className="text-sm font-semibold text-gray-900">{announcement.title}</h3>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap line-clamp-3">{announcement.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {announcement.created_at && new Date(announcement.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    {(announcement.priority === 'high' || announcement.priority === 'urgent') && (
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded ${
                        announcement.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {announcement.priority === 'urgent' ? 'Urgent' : 'Important'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No announcements at this time</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map(activity => (
                <div key={activity.id} className="flex items-start">
                  {getActivityIcon(activity.icon, activity.color)}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

