import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  CalendarX,
  Users,
  TrendingUp,
  Building2,
  Clock,
} from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [departmentData, setDepartmentData] = useState<{ label: string; value: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ label: string; value: number }[]>([]);
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);

  const companyName = selectedCompany?.company_name ?? null;

  useEffect(() => {
    fetchData();
  }, [companyName]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let recordsQuery = supabase
        .from('attendance_records')
        .select('*, employees:employee_id(id, first_name, last_name, department)', { count: 'exact' })
        .order('attendance_date', { ascending: false })
        .limit(100);

      if (companyName) {
        const { data: employeeIds } = await supabase
          .from('employees')
          .select('id')
          .eq('department', companyName);
        const ids = employeeIds?.map((e) => e.id) || [];
        if (ids.length > 0) {
          recordsQuery = recordsQuery.in('employee_id', ids);
        } else {
          recordsQuery = recordsQuery.eq('employee_id', '00000000-0000-0000-0000-000000000000');
        }
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
        if (companyName) {
          const { data: empIds } = await supabase
            .from('employees')
            .select('id')
            .eq('department', companyName);
          const ids = empIds?.map((e) => e.id) || [];
          if (ids.length > 0) {
            monthQuery = monthQuery.in('employee_id', ids);
          } else {
            monthQuery = monthQuery.eq('employee_id', '00000000-0000-0000-0000-000000000000');
          }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Attendance Analytics</h2>

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
              {recentRecords.map((r) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HRAttendanceReporting;
