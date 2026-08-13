import React, { useState, useEffect } from 'react';
import { Users, UserPlus, UserX, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { useCompanyContext } from '../../../contexts/CompanyContext';
import ReportingCard from './ReportingCard';
import SimpleBarChart from './SimpleBarChart';

interface Customer {
  id: string;
  company_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

const CustomerReporting: React.FC = () => {
  const { selectedCompany } = useCompanyContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [activeCustomers, setActiveCustomers] = useState(0);
  const [inactiveCustomers, setInactiveCustomers] = useState(0);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [topCustomers, setTopCustomers] = useState<Customer[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ label: string; value: number }[]>([]);

  const companyId = selectedCompany?.id ?? null;

  const applyCompanyFilter = (query: any) => {
    if (companyId) {
      return query.eq('company_settings_id', companyId);
    }
    return query;
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [customersRes, recentRes, topRes] = await Promise.all([
        applyCompanyFilter(supabase.from('customers').select('id, is_active, created_at', { count: 'exact', head: true })),
        applyCompanyFilter(supabase
          .from('customers')
          .select('id, company_name, contact_person, email, phone, is_active, created_at')
          .order('created_at', { ascending: false })
          .limit(10)),
        applyCompanyFilter(supabase
          .from('customers')
          .select('id, company_name, contact_person, email, phone, is_active, created_at')
          .order('company_name', { ascending: true })
          .limit(10)),
      ]);

      if (customersRes.error) throw customersRes.error;
      if (recentRes.error) throw recentRes.error;
      if (topRes.error) throw topRes.error;

      const allCustomers = customersRes.count || 0;
      setTotalCustomers(allCustomers);

      const { data: statusData } = await applyCompanyFilter(supabase
        .from('customers')
        .select('is_active', { count: 'exact', head: true })
        .eq('is_active', true));

      const active = statusData?.length || 0;
      setActiveCustomers(active);
      setInactiveCustomers(allCustomers - active);

      setRecentCustomers(recentRes.data || []);
      setTopCustomers(topRes.data || []);

      const months: { label: string; value: number }[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-31`;
        const { count } = await applyCompanyFilter(supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', start)
          .lte('created_at', end));
        months.push({ label, value: count || 0 });
      }
      setMonthlyData(months);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customer data');
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
      <h2 className="text-2xl font-bold text-gray-900">Customer Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportingCard
          title="Total Customers"
          value={totalCustomers}
          trend="up"
          trendValue="All time"
          icon={<Users className="w-6 h-6" />}
          color="blue"
        />
        <ReportingCard
          title="Active Customers"
          value={activeCustomers}
          trend="up"
          trendValue={`${Math.round((activeCustomers / Math.max(totalCustomers, 1)) * 100)}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="green"
        />
        <ReportingCard
          title="Inactive Customers"
          value={inactiveCustomers}
          icon={<UserX className="w-6 h-6" />}
          color="red"
        />
        <ReportingCard
          title="Recent Signups"
          value={recentCustomers.length}
          icon={<UserPlus className="w-6 h-6" />}
          color="purple"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Count by Month</h3>
        <SimpleBarChart
          data={monthlyData.map((d) => ({ ...d, color: 'bg-indigo-500' }))}
          height={200}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Name</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Email</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2 px-3">{c.company_name || c.contact_person || 'N/A'}</td>
                    <td className="py-2 px-3 text-gray-600">{c.email || '-'}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          c.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Customers</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Name</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Email</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Phone</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentCustomers.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2 px-3">{c.company_name || c.contact_person || 'N/A'}</td>
                    <td className="py-2 px-3 text-gray-600">{c.email || '-'}</td>
                    <td className="py-2 px-3 text-gray-600">{c.phone || '-'}</td>
                    <td className="py-2 px-3 text-gray-600">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerReporting;
