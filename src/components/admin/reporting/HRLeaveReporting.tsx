import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../../config/supabase';
import { useCompanyContext } from '../../../contexts/CompanyContext';
import ReportingCard from './ReportingCard';
import SimpleBarChart from './SimpleBarChart';

interface Leave {
  id: string;
  status: string;
  from_date: string;
  to_date: string;
  total_days: number;
  employee: {
    first_name: string;
    last_name: string;
    department?: string;
  };
  leave_type: {
    name: string;
  };
}

const HRLeaveReporting: React.FC = () => {
  const { selectedCompany } = useCompanyContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
    leaveTypeData: { label: string; value: number }[];
    statusData: { label: string; value: number; color: string }[];
    monthlyData: { label: string; value: number }[];
    recentRequests: Leave[];
  } | null>(null);

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
        setStats({
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          cancelled: 0,
          leaveTypeData: [],
          statusData: [
            { label: 'Pending', value: 0, color: 'bg-yellow-500' },
            { label: 'Approved', value: 0, color: 'bg-green-500' },
            { label: 'Rejected', value: 0, color: 'bg-red-500' },
            { label: 'Cancelled', value: 0, color: 'bg-gray-400' },
          ],
          monthlyData: [],
          recentRequests: [],
        });
        setLoading(false);
        return;
      }

      let query = supabase
        .from('leave_applications')
        .select(`
          *,
          employee:employees!leave_applications_employee_id_fkey(first_name, last_name, department),
          leave_type:leave_types(name)
        `, { count: 'exact' })
        .order('applied_at', { ascending: false });

      if (validEmpIds !== null) {
        query = query.in('employee_id', validEmpIds);
      }

      const { data: leaves, count, error: leavesError } = await query;

      if (leavesError) throw leavesError;

      const allLeaves = leaves || [];
      const pendingCount = allLeaves.filter((l) => l.status === 'pending').length;
      const approvedCount = allLeaves.filter((l) => l.status === 'approved').length;
      const rejectedCount = allLeaves.filter((l) => l.status === 'rejected').length;
      const cancelledCount = allLeaves.filter((l) => l.status === 'cancelled').length;

      const leaveTypeMap = new Map<string, number>();
      allLeaves.forEach((l) => {
        const typeName = l.leave_type?.name || 'Unknown';
        leaveTypeMap.set(typeName, (leaveTypeMap.get(typeName) || 0) + 1);
      });

      const months: { label: string; value: number }[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-31`;
        let monthQuery = supabase
          .from('leave_applications')
          .select('*', { count: 'exact', head: true })
          .gte('from_date', start)
          .lte('from_date', end);

        if (validEmpIds !== null) {
          monthQuery = monthQuery.in('employee_id', validEmpIds);
        }

        const { count: monthCount } = await monthQuery;
        months.push({ label, value: monthCount || 0 });
      }

      setStats({
        total: count || 0,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        cancelled: cancelledCount,
        leaveTypeData: Array.from(leaveTypeMap.entries()).map(([label, value]) => ({
          label,
          value,
        })),
        statusData: [
          { label: 'Pending', value: pendingCount, color: 'bg-yellow-500' },
          { label: 'Approved', value: approvedCount, color: 'bg-green-500' },
          { label: 'Rejected', value: rejectedCount, color: 'bg-red-500' },
          { label: 'Cancelled', value: cancelledCount, color: 'bg-gray-400' },
        ],
        monthlyData: months,
        recentRequests: allLeaves.slice(0, 10),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leave data');
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
          <h2 className="text-2xl font-bold text-gray-900">Leave Analytics</h2>
          <p className="text-sm text-gray-500">
            {selectedCompany ? selectedCompany.company_name : 'All Entities'} — Leave Applications & Approvals
          </p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.route;
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
      ) : !stats ? null : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReportingCard
              title="Total Requests"
              value={stats.total}
              icon={<FileText className="w-6 h-6" />}
              color="blue"
            />
            <ReportingCard
              title="Pending"
              value={stats.pending}
              icon={<Clock className="w-6 h-6" />}
              color="yellow"
            />
            <ReportingCard
              title="Approved"
              value={stats.approved}
              icon={<CheckCircle className="w-6 h-6" />}
              color="green"
            />
            <ReportingCard
              title="Rejected"
              value={stats.rejected}
              icon={<XCircle className="w-6 h-6" />}
              color="red"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave Type Breakdown</h3>
              <SimpleBarChart
                data={stats.leaveTypeData.map((d) => ({ ...d, color: 'bg-indigo-500' }))}
                height={200}
              />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave Status Breakdown</h3>
              <div className="space-y-3">
                {stats.statusData.map((item) => {
                  const percentage = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                  return (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600 w-24">{item.label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                        <div
                          className={`${item.color} h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500`}
                          style={{ width: `${Math.max(percentage, 3)}%` }}
                        >
                          <span className="text-xs font-bold text-white">{item.value}</span>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500 w-12 text-right">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Leave Trend</h3>
            <SimpleBarChart
              data={stats.monthlyData.map((d) => ({ ...d, color: 'bg-blue-500' }))}
              height={200}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              Recent Leave Requests
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Employee</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Type</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">From</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">To</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-500">
                        No leave requests found for the selected company.
                      </td>
                    </tr>
                  ) : (
                    stats.recentRequests.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2 px-3">
                          {r.employee
                            ? `${r.employee.first_name} ${r.employee.last_name}`
                            : 'N/A'}
                        </td>
                        <td className="py-2 px-3">{r.leave_type?.name || 'N/A'}</td>
                        <td className="py-2 px-3 text-gray-600">{r.from_date}</td>
                        <td className="py-2 px-3 text-gray-600">{r.to_date}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              r.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : r.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : r.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
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

export default HRLeaveReporting;
