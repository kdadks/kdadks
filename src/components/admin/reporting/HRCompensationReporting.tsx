import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Users,
  TrendingUp,
  Building2,
  Wallet,
  ArrowUpRight,
} from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { useCompanyContext } from '../../../contexts/CompanyContext';
import { compensationService } from '../../../services/compensationService';
import ReportingCard from './ReportingCard';
import SimpleBarChart from './SimpleBarChart';

interface Compensation {
  id: string;
  employee_id: string;
  basic_salary: number;
  gross_salary: number;
  net_salary: number;
  effective_from: string;
  is_current: boolean;
  employees?: {
    id: string;
    first_name: string;
    last_name: string;
    department?: string;
  };
}

const HRCompensationReporting: React.FC = () => {
  const { selectedCompany } = useCompanyContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalEmployees: number;
    avgBasicSalary: number;
    avgGrossSalary: number;
    avgNetSalary: number;
    salaryRanges: { label: string; value: number }[];
    departmentData: { label: string; value: number }[];
    recentIncrements: any[];
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
        .from('employee_compensation')
        .select(`
          *,
          employee:employees!employee_id(id, first_name, last_name, department)
        `)
        .eq('is_current', true)
        .order('effective_from', { ascending: false });

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

      const { data: compensations, error: compError } = await query;
      if (compError) throw compError;

      const allCompensations = compensations || [];
      const totalEmployees = allCompensations.length;
      const avgBasicSalary =
        allCompensations.reduce((sum, c) => sum + c.basic_salary, 0) / Math.max(totalEmployees, 1);
      const avgGrossSalary =
        allCompensations.reduce((sum, c) => sum + c.gross_salary, 0) / Math.max(totalEmployees, 1);
      const avgNetSalary =
        allCompensations.reduce((sum, c) => sum + c.net_salary, 0) / Math.max(totalEmployees, 1);

      const ranges = [
        { label: '<50K', value: 0 },
        { label: '50K-100K', value: 0 },
        { label: '100K-200K', value: 0 },
        { label: '200K-500K', value: 0 },
        { label: '500K+', value: 0 },
      ];
      allCompensations.forEach((c) => {
        const salary = c.gross_salary;
        if (salary < 50000) ranges[0].value++;
        else if (salary < 100000) ranges[1].value++;
        else if (salary < 200000) ranges[2].value++;
        else if (salary < 500000) ranges[3].value++;
        else ranges[4].value++;
      });

      const deptMap = new Map<string, { count: number; total: number }>();
      allCompensations.forEach((c) => {
        const dept = c.employees?.department || 'Unknown';
        const existing = deptMap.get(dept) || { count: 0, total: 0 };
        deptMap.set(dept, { count: existing.count + 1, total: existing.total + c.basic_salary });
      });
      const departmentData = Array.from(deptMap.entries()).map(([label, { count, total }]) => ({
        label,
        value: Math.round(total / count),
      }));

      let incrementsQuery = supabase
        .from('salary_increments')
        .select(`
          *,
          employee:employees!employee_id(id, first_name, last_name, department)
        `)
        .order('effective_date', { ascending: false });

      if (companyName) {
        const { data: empIds } = await supabase
          .from('employees')
          .select('id')
          .eq('department', companyName);
        const ids = empIds?.map((e) => e.id) || [];
        if (ids.length > 0) {
          incrementsQuery = incrementsQuery.in('employee_id', ids);
        } else {
          incrementsQuery = incrementsQuery.eq('employee_id', '00000000-0000-0000-0000-000000000000');
        }
      }

      const { data: increments } = await incrementsQuery;
      const recentIncrements = (increments || [])
        .filter((i) => i.status === 'applied')
        .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())
        .slice(0, 10);

      setStats({
        totalEmployees,
        avgBasicSalary: Math.round(avgBasicSalary),
        avgGrossSalary: Math.round(avgGrossSalary),
        avgNetSalary: Math.round(avgNetSalary),
        salaryRanges: ranges.filter((r) => r.value > 0),
        departmentData,
        recentIncrements,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch compensation data');
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

  const formatCurrency = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Compensation Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportingCard
          title="Employees with Compensation"
          value={stats.totalEmployees}
          icon={<Users className="w-6 h-6" />}
          color="blue"
        />
        <ReportingCard
          title="Avg Basic Salary"
          value={formatCurrency(stats.avgBasicSalary)}
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
        />
        <ReportingCard
          title="Avg Gross Salary"
          value={formatCurrency(stats.avgGrossSalary)}
          icon={<Wallet className="w-6 h-6" />}
          color="purple"
        />
        <ReportingCard
          title="Avg Net Salary"
          value={formatCurrency(stats.avgNetSalary)}
          icon={<TrendingUp className="w-6 h-6" />}
          color="teal"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Salary Distribution Ranges</h3>
          <SimpleBarChart
            data={stats.salaryRanges.map((d) => ({ ...d, color: 'bg-indigo-500' }))}
            height={200}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-400" />
            Department-wise Average Salary
          </h3>
          <div className="space-y-3">
            {stats.departmentData.map((dept) => (
              <div
                key={dept.label}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <span className="text-sm font-medium text-gray-700">{dept.label}</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(dept.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {stats.recentIncrements.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-green-500" />
            Recent Increments
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Employee</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Department</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Type</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Effective Date</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Previous</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">New</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentIncrements.map((inc) => (
                  <tr key={inc.id} className="border-b last:border-0">
                    <td className="py-2 px-3">
                      {inc.employee
                        ? `${inc.employee.first_name} ${inc.employee.last_name}`
                        : 'N/A'}
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {inc.employee?.department || '-'}
                    </td>
                    <td className="py-2 px-3">
                      <span className="capitalize">{inc.increment_type.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-2 px-3 text-gray-600">{inc.effective_date}</td>
                    <td className="py-2 px-3">{formatCurrency(inc.previous_basic)}</td>
                    <td className="py-2 px-3 font-medium">{formatCurrency(inc.new_basic)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRCompensationReporting;
