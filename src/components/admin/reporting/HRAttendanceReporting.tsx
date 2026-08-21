import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  CalendarX,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../../config/supabase';
import { useCompanyContext } from '../../../contexts/CompanyContext';
import ReportingCard from './ReportingCard';
import SimpleBarChart from './SimpleBarChart';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  attendance_date: string;
  status: string;
  employees?: {
    id: string;
    first_name: string;
    last_name: string;
    department?: string;
  };
}

const HRAttendanceReporting: React.FC = () => {
  const { selectedCompany } = useCompanyContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [departmentData, setDepartmentData] = useState<{ label: string; value: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ label: string; value: number }[]>([]);
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);

  const companyId = selectedCompany?.id ?? null;

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let validEmpIds: string[] | null = null;
      if (companyId) {
        const { data: empData, error: empErr } = await supabase
          .from('employees')
          .select('id')
          .or(`company_settings_id.eq.${companyId},company_settings_id.is.null`);
        if (empErr) throw empErr;
        validEmpIds = (empData || []).map((e) => e.id);
      }

      if (companyId && (!validEmpIds || validEmpIds.length === 0)) {
        setTotalRecords(0);
        setPresentCount(0);
        setAbsentCount(0);
        setDepartmentData([]);
        setMonthlyData([]);
        setRecentRecords([]);
        setLoading(false);
        return;
      }

      let recordsQuery = supabase
        .from('attendance_records')
        .select('*, employees:employee_id(id, first_name, last_name, department)', { count: 'exact' })
        .order('attendance_date', { ascending: false })
        .limit(100);

      if (validEmpIds !== null) {
        recordsQuery = recordsQuery.in('employee_id', validEmpIds);
      }

      const { data: records, count, error: recordsError } = await recordsQuery;

      if (recordsError) throw recordsError;

      const allRecords = records || [];
      setTotalRecords(count || 0);
      setPresentCount(allRecords.filter((r) => r.status === 'present').length);
      setAbsentCount(allRecords.filter((r) => r.status === 'absent').length);
      setRecentRecords(allRecords.slice(0, 10));

      const deptMap = new Map<string, number>();
      allRecords.forEach((r) => {
        const dept = r.employees?.department || 'Unknown';
        deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
      });
      setDepartmentData(
        Array.from(deptMap.entries()).map(([label, value]) => ({ label, value }))
      );

      const months: { label: string; value: number }[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
        let monthQuery = supabase
          .from('attendance_records')
          .select('*', { count: 'exact', head: true })
          .gte('attendance_date', start)
          .lte('attendance_date', end);

        if (validEmpIds !== null) {
          monthQuery = monthQuery.in('employee_id', validEmpIds);
        }

        const { count: monthCount, error: monthError } = await monthQuery;
        if (monthError) throw monthError;
        months.push({ label, value: monthCount || 0 });
      }
      setMonthlyData(months);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { label: 'Attendance', route: '/admin/reporting/hr/attendance' },
    { label: 'Leave', route: '/admin/reporting/hr/leave' },
    { label: 'Compensation', route: '/admin/reporting/hr/compensation' },
    { label: 'Performance', route: '/admin/reporting/hr/performance' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attendance Analytics</h2>
          <p className="text-sm text-gray-500">
            {selectedCompany ? selectedCompany.company_name : 'All Entities'} — Attendance Records & Trends
          </p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.route || (location.pathname === '/admin/reporting/hr' && tab.route === '/admin/reporting/hr/attendance');
            return (
              <button
                key={tab.route}
                onClick={() => navigate(tab.route)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReportingCard
              title="Total Records"
              value={totalRecords}
              icon={<CalendarCheck className="w-6 h-6" />}
              color="blue"
            />
            <ReportingCard
              title="Present"
              value={presentCount}
              icon={<CalendarCheck className="w-6 h-6" />}
              color="green"
            />
            <ReportingCard
              title="Absent"
              value={absentCount}
              icon={<CalendarX className="w-6 h-6" />}
              color="red"
            />
            <ReportingCard
              title="Attendance Rate"
              value={
                totalRecords > 0
                  ? `${Math.round((presentCount / totalRecords) * 100)}%`
                  : '0%'
              }
              icon={<TrendingUp className="w-6 h-6" />}
              color="teal"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Department-wise Attendance
              </h3>
              <SimpleBarChart
                data={departmentData.map((d) => ({ ...d, color: 'bg-indigo-500' }))}
                height={200}
              />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Attendance Trend</h3>
              <SimpleBarChart
                data={monthlyData.map((d) => ({ ...d, color: 'bg-blue-500' }))}
                height={200}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              Recent Attendance Records
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Employee</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Department</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Date</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRecords.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-500">
                        No attendance records found for the selected company.
                      </td>
                    </tr>
                  ) : (
                    recentRecords.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2 px-3">
                          {r.employees
                            ? `${r.employees.first_name} ${r.employees.last_name}`
                            : 'N/A'}
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          {r.employees?.department || '-'}
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          {new Date(r.attendance_date).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              r.status === 'present'
                                ? 'bg-green-100 text-green-800'
                                : r.status === 'absent'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HRAttendanceReporting;
