import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  UserX,
  TrendingUp,
  Globe,
  DollarSign,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { useCompanyContext } from '../../../contexts/CompanyContext';
import ReportingCard from './ReportingCard';
import SimpleBarChart from './SimpleBarChart';
import DateRangeFilter, { DateRange, getDefaultDateRange } from './DateRangeFilter';
import ExportButton from './ExportButton';

interface CustomerRow {
  id: string;
  company_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  country?: { name?: string };
  revenue?: number;
}

interface Stats {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  newInPeriod: number;
  prevPeriodNew: number;
  avgRevenue: number;
  customers: CustomerRow[];
  topByRevenue: { name: string; revenue: number; email: string }[];
  monthlyData: { label: string; value: number }[];
  byCountry: { country: string; count: number }[];
}

const CustomerReporting: React.FC = () => {
  const { selectedCompany } = useCompanyContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [refreshKey, setRefreshKey] = useState(0);

  const companyId = selectedCompany?.id ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyCompany = (q: any) =>
    companyId ? q.eq('company_settings_id', companyId) : q;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // All customers (no date filter) for totals
      const { data: allCust, error: allErr } = await applyCompany(
        supabase
          .from('customers')
          .select('id, company_name, contact_person, email, phone, is_active, created_at, country:countries(name)')
          .order('created_at', { ascending: false })
      );
      if (allErr) throw allErr;

      const all: CustomerRow[] = allCust || [];
      const active = all.filter((c) => c.is_active).length;

      // New in period
      const { count: newCount } = await applyCompany(
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', dateRange.from)
          .lte('created_at', dateRange.to + 'T23:59:59')
      );

      // Prior period (same duration)
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      const duration = toDate.getTime() - fromDate.getTime();
      const prevFrom = new Date(fromDate.getTime() - duration).toISOString().split('T')[0];
      const prevTo = dateRange.from;
      const { count: prevCount } = await applyCompany(
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', prevFrom)
          .lte('created_at', prevTo + 'T23:59:59')
      );

      // Revenue per customer from invoices
      let invQuery = supabase
        .from('invoices')
        .select('customer_id, inr_total_amount, total_amount, payment_status')
        .eq('payment_status', 'paid');
      if (companyId) invQuery = invQuery.eq('company_settings_id', companyId);
      const { data: invData } = await invQuery;

      const revMap = new Map<string, number>();
      (invData || []).forEach((inv) => {
        const amt = inv.inr_total_amount || inv.total_amount || 0;
        revMap.set(inv.customer_id, (revMap.get(inv.customer_id) || 0) + amt);
      });

      // Enrich customers with revenue
      const enriched: CustomerRow[] = all.map((c) => ({
        ...c,
        revenue: revMap.get(c.id) || 0,
      }));

      const totalRevenue = Array.from(revMap.values()).reduce((a, b) => a + b, 0);
      const customersWithRevenue = enriched.filter((c) => (c.revenue || 0) > 0).length;
      const avgRevenue = customersWithRevenue > 0 ? totalRevenue / customersWithRevenue : 0;

      const topByRevenue = enriched
        .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
        .slice(0, 8)
        .map((c) => ({
          name: c.company_name || c.contact_person || 'Unknown',
          revenue: c.revenue || 0,
          email: c.email || '-',
        }));

      // Monthly trend (last 6 months)
      const now = new Date();
      const months: { label: string; value: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
        const { count: mCount } = await applyCompany(
          supabase
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', start)
            .lte('created_at', endStr + 'T23:59:59')
        );
        months.push({ label, value: mCount || 0 });
      }

      // By country
      const countryMap = new Map<string, number>();
      enriched.forEach((c) => {
        const cn = c.country?.name || 'Unknown';
        countryMap.set(cn, (countryMap.get(cn) || 0) + 1);
      });
      const byCountry = Array.from(countryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([country, count]) => ({ country, count }));

      setStats({
        totalCustomers: all.length,
        activeCustomers: active,
        inactiveCustomers: all.length - active,
        newInPeriod: newCount || 0,
        prevPeriodNew: prevCount || 0,
        avgRevenue,
        customers: enriched,
        topByRevenue,
        monthlyData: months,
        byCountry,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customer data');
    } finally {
      setLoading(false);
    }
  }, [companyId, dateRange, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (v: number) => {
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
    return `₹${Math.round(v)}`;
  };

  const exportData = stats
    ? stats.customers.map((c) => ({
        Name: c.company_name || c.contact_person || 'N/A',
        Email: c.email || '',
        Phone: c.phone || '',
        Status: c.is_active ? 'Active' : 'Inactive',
        Country: c.country?.name || '',
        Revenue: c.revenue || 0,
        'Created At': new Date(c.created_at).toLocaleDateString(),
      }))
    : [];

  const isLoading = loading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Analytics</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedCompany ? selectedCompany.company_name : 'All Entities'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={exportData} filename="customer-report" />
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* KPI Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportingCard
          title="Total Customers"
          value={isLoading ? '—' : stats?.totalCustomers ?? 0}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          loading={isLoading}
        />
        <ReportingCard
          title="Active Customers"
          value={isLoading ? '—' : stats?.activeCustomers ?? 0}
          subtitle={
            stats
              ? `${Math.round((stats.activeCustomers / Math.max(stats.totalCustomers, 1)) * 100)}% of total`
              : ''
          }
          trend="up"
          trendValue={
            stats
              ? `${Math.round((stats.activeCustomers / Math.max(stats.totalCustomers, 1)) * 100)}% active rate`
              : undefined
          }
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
          loading={isLoading}
        />
        <ReportingCard
          title={`New (${dateRange.label})`}
          value={isLoading ? '—' : stats?.newInPeriod ?? 0}
          previousValue={stats?.prevPeriodNew}
          currentNumericValue={stats?.newInPeriod}
          icon={<UserPlus className="w-5 h-5" />}
          color="purple"
          loading={isLoading}
        />
        <ReportingCard
          title="Avg Revenue / Customer"
          value={isLoading ? '—' : formatCurrency(stats?.avgRevenue ?? 0)}
          icon={<DollarSign className="w-5 h-5" />}
          color="indigo"
          loading={isLoading}
        />
      </div>

      {/* Row 2 — Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Customer Acquisition — Last 6 Months
          </h3>
          {isLoading ? (
            <div className="h-48 bg-gray-100 rounded animate-pulse" />
          ) : (
            <SimpleBarChart
              data={(stats?.monthlyData || []).map((d) => ({ ...d, color: 'bg-indigo-500' }))}
              height={200}
            />
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Customers by Country
          </h3>
          {isLoading ? (
            <div className="h-48 bg-gray-100 rounded animate-pulse" />
          ) : (
            <SimpleBarChart
              data={(stats?.byCountry || []).map((d) => ({
                label: d.country,
                value: d.count,
                color: 'bg-teal-500',
              }))}
              height={200}
            />
          )}
        </div>
      </div>

      {/* Top Customers by Revenue */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            Top Customers by Collected Revenue
          </h3>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenue (Paid)</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(stats?.topByRevenue || []).map((c, idx) => {
                  const totalRev = stats?.topByRevenue.reduce((a, b) => a + b.revenue, 0) || 1;
                  const pct = (c.revenue / totalRev) * 100;
                  return (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 px-3 text-gray-400 font-medium text-xs">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-gray-900">{c.name}</td>
                      <td className="py-2.5 px-3 text-gray-500">{c.email}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-900 tabular-nums">
                        {formatCurrency(c.revenue)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[60px]">
                            <div
                              className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!stats?.topByRevenue.length && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 text-sm">
                      No revenue data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ReportingCard
          title="Inactive Customers"
          value={stats?.inactiveCustomers ?? 0}
          icon={<UserX className="w-5 h-5" />}
          color="red"
          loading={isLoading}
        />
        <ReportingCard
          title="Countries Served"
          value={stats?.byCountry.length ?? 0}
          icon={<Globe className="w-5 h-5" />}
          color="teal"
          loading={isLoading}
        />
        <ReportingCard
          title="Customers with Revenue"
          value={
            stats
              ? stats.customers.filter((c) => (c.revenue || 0) > 0).length
              : 0
          }
          icon={<DollarSign className="w-5 h-5" />}
          color="green"
          loading={isLoading}
        />
      </div>
    </div>
  );
};

export default CustomerReporting;
