import React, { useState, useEffect } from 'react';
import {
  Star,
  Users,
  TrendingUp,
  Award,
  AlertTriangle,
  BarChart3,
  FileText,
} from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { useCompanyContext } from '../../../contexts/CompanyContext';
import ReportingCard from './ReportingCard';
import SimpleBarChart from './SimpleBarChart';

interface PerformanceFeedback {
  id: string;
  overall_rating: number;
  feedback_type: string;
  created_at: string;
  employees?: {
    id: string;
    first_name: string;
    last_name: string;
    department?: string;
  };
}

const HRPerformanceReporting: React.FC = () => {
  const { selectedCompany } = useCompanyContext();
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
    recentFeedback: any[];
  } | null>(null);

  const companyName = selectedCompany?.company_name ?? null;

  useEffect(() => {
    fetchData();
  }, [companyName]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('performance_feedback')
        .select(`
          *,
          employees(id, first_name, last_name, department, designation)
        `)
        .order('created_at', { ascending: false });

      if (companyName) {
        const { data: employeeIds } = await supabase
          .from('employees')
          .select('id')
          .eq('department', companyName);
        const ids = employeeIds?.map((e) => e.id) || [];
        if (ids.length > 0) {
          query = query.in('employee_id', ids);
        } else {
          query = query.eq('employee_id', '00000000-0000-0000-0000-000000000000');
        }
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

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Performance Analytics</h2>

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
          <SimpleBarChart
            data={stats.typeData.map((d) => ({ ...d, color: 'bg-indigo-500' }))}
            height={200}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Distribution</h3>
          <SimpleBarChart
            data={stats.ratingDistribution.map((d) => ({ ...d, color: 'bg-yellow-500' }))}
            height={200}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-400" />
          Department-wise Average Rating
        </h3>
        <div className="space-y-3">
          {stats.departmentData.map((dept) => (
            <div
              key={dept.label}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <span className="text-sm font-medium text-gray-700">{dept.label}</span>
              <span className="text-sm font-bold text-gray-900">{dept.value}</span>
            </div>
          ))}
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
              {stats.recentFeedback.map((f) => (
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
                    {f.period_start} to {f.period_end}
                  </td>
                  <td className="py-2 px-3 font-medium">{f.overall_rating}/5</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HRPerformanceReporting;
