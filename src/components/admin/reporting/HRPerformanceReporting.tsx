import React, { useState, useEffect } from 'react';
import {
  Star,
  TrendingUp,
  Award,
  AlertTriangle,
  BarChart3,
  FileText,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../../config/supabase';
import { useCompanyContext } from '../../../contexts/CompanyContext';
import ReportingCard from './ReportingCard';
import SimpleBarChart from './SimpleBarChart';

interface PerformanceFeedback {
  id: string;
  overall_rating: number;
  feedback_type: string;
  created_at: string;
  period_start?: string;
  period_end?: string;
  employees?: {
    id: string;
    first_name: string;
    last_name: string;
    department?: string;
  };
}

const HRPerformanceReporting: React.FC = () => {
  const { selectedCompany } = useCompanyContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    avgRating: number;
    excellent: number;
    good: number;
    average: number;
    needsImprovement: number;
    typeData: { label: string; value: number }[];
    ratingDistribution: { label: string; value: number }[];
    departmentData: { label: string; value: number }[];
    recentFeedback: PerformanceFeedback[];
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
          avgRating: 0,
          excellent: 0,
          good: 0,
          average: 0,
          needsImprovement: 0,
          typeData: [],
          ratingDistribution: [],
          departmentData: [],
          recentFeedback: [],
        });
        setLoading(false);
        return;
      }

      let query = supabase
        .from('performance_feedback')
        .select(`
          *,
          employees(id, first_name, last_name, department, designation)
        `)
        .order('created_at', { ascending: false });

      if (validEmpIds !== null) {
        query = query.in('employee_id', validEmpIds);
      }

      const { data: feedback, error: feedbackError } = await query;
      if (feedbackError) throw feedbackError;

      const allFeedback = feedback || [];
      const total = allFeedback.length;
      const avgRating = total > 0
        ? allFeedback.reduce((sum, f) => sum + (f.overall_rating || 0), 0) / total
        : 0;
      const excellent = allFeedback.filter((f) => f.overall_rating >= 4.5).length;
      const good = allFeedback.filter((f) => f.overall_rating >= 3.5 && f.overall_rating < 4.5).length;
      const average = allFeedback.filter((f) => f.overall_rating >= 2.5 && f.overall_rating < 3.5).length;
      const needsImprovement = allFeedback.filter((f) => f.overall_rating < 2.5).length;

      const typeMap = new Map<string, number>();
      allFeedback.forEach((f) => {
        const type = f.feedback_type || 'unknown';
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      });

      const ratingDistMap = new Map<string, number>();
      allFeedback.forEach((f) => {
        const rating = Math.round(f.overall_rating || 0);
        const key = `${rating} Star`;
        ratingDistMap.set(key, (ratingDistMap.get(key) || 0) + 1);
      });

      const deptMap = new Map<string, { count: number; total: number }>();
      allFeedback.forEach((f) => {
        const dept = f.employees?.department || 'Unknown';
        const existing = deptMap.get(dept) || { count: 0, total: 0 };
        deptMap.set(dept, { count: existing.count + 1, total: existing.total + (f.overall_rating || 0) });
      });
      const departmentData = Array.from(deptMap.entries()).map(([label, { count, total }]) => ({
        label,
        value: Math.round((total / count) * 10) / 10,
      }));

      setStats({
        total,
        avgRating: Math.round(avgRating * 10) / 10,
        excellent,
        good,
        average,
        needsImprovement,
        typeData: Array.from(typeMap.entries()).map(([label, value]) => ({ label, value })),
        ratingDistribution: Array.from(ratingDistMap.entries()).map(([label, value]) => ({ label, value })),
        departmentData,
        recentFeedback: allFeedback.slice(0, 10),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch performance data');
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
          <h2 className="text-2xl font-bold text-gray-900">Performance Analytics</h2>
          <p className="text-sm text-gray-500">
            {selectedCompany ? selectedCompany.company_name : 'All Entities'} — Performance Feedback & Ratings
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
              title="Total Feedback"
              value={stats.total}
              icon={<FileText className="w-6 h-6" />}
              color="blue"
            />
            <ReportingCard
              title="Average Rating"
              value={stats.avgRating.toFixed(1)}
              icon={<Star className="w-6 h-6" />}
              color="yellow"
            />
            <ReportingCard
              title="Excellent"
              value={stats.excellent}
              icon={<Award className="w-6 h-6" />}
              color="green"
            />
            <ReportingCard
              title="Needs Improvement"
              value={stats.needsImprovement}
              icon={<AlertTriangle className="w-6 h-6" />}
              color="red"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Feedback Type Breakdown</h3>
              {stats.typeData.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No feedback type data available.</p>
              ) : (
                <SimpleBarChart
                  data={stats.typeData.map((d) => ({ ...d, color: 'bg-indigo-500' }))}
                  height={200}
                />
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Distribution</h3>
              {stats.ratingDistribution.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No rating distribution data available.</p>
              ) : (
                <SimpleBarChart
                  data={stats.ratingDistribution.map((d) => ({ ...d, color: 'bg-yellow-500' }))}
                  height={200}
                />
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-400" />
              Department-wise Average Rating
            </h3>
            <div className="space-y-3">
              {stats.departmentData.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No department rating data available.</p>
              ) : (
                stats.departmentData.map((dept) => (
                  <div
                    key={dept.label}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <span className="text-sm font-medium text-gray-700">{dept.label}</span>
                    <span className="text-sm font-bold text-gray-900">{dept.value} / 5</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-400" />
              Recent Feedback
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Employee</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Department</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Type</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Period</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentFeedback.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-500">
                        No performance feedback records found for the selected company.
                      </td>
                    </tr>
                  ) : (
                    stats.recentFeedback.map((f) => (
                      <tr key={f.id} className="border-b last:border-0">
                        <td className="py-2 px-3">
                          {f.employees
                            ? `${f.employees.first_name} ${f.employees.last_name}`
                            : 'N/A'}
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          {f.employees?.department || '-'}
                        </td>
                        <td className="py-2 px-3 capitalize">{f.feedback_type}</td>
                        <td className="py-2 px-3 text-gray-600">
                          {f.period_start && f.period_end ? `${f.period_start} to ${f.period_end}` : '-'}
                        </td>
                        <td className="py-2 px-3 font-medium">{f.overall_rating}/5</td>
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

export default HRPerformanceReporting;
