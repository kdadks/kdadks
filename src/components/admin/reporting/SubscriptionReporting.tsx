import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  DollarSign,
  Calendar,
  Percent,
} from 'lucide-react';
import { subscriptionService } from '../../../services/subscriptionService';
import { supabase } from '../../../config/supabase';
import { useCompanyContext } from '../../../contexts/CompanyContext';
import ReportingCard from './ReportingCard';
import SimpleBarChart from './SimpleBarChart';
import DateRangeFilter, { DateRange, getDefaultDateRange } from './DateRangeFilter';
import ExportButton from './ExportButton';

interface SubRow {
  id: string;
  status: string;
  created_at?: string;
  end_date?: string;
  start_date?: string;
  customer?: { company_name?: string; contact_person?: string };
  plan?: { name?: string; price?: number; billing_interval?: string };
}

const SubscriptionReporting: React.FC = () => {
  const { selectedCompany } = useCompanyContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [refreshKey, setRefreshKey] = useState(0);

  interface Stats {
    total: number;
    active: number;
    paused: number;
    cancelled: number;
    expired: number;
    mrr: number;
    arr: number;
    churnRate: number;
    netNew: number;
    planDistribution: { label: string; value: number }[];
    planRevenue: { plan: string; count: number; revenue: number }[];
    mrrTrend: { label: string; value: number }[];
    churnTrend: { label: string; value: number }[];
    expiringSoon: { id: string; customer?: string; plan?: string; end_date?: string }[];
    upcomingRenewals: { id: string; customer?: string; plan?: string; end_date?: string; daysLeft: number }[];
    subscriptions: SubRow[];
  }

  const [stats, setStats] = useState<Stats | null>(null);
  const companyId = selectedCompany?.id ?? null;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = companyId ? { company_settings_id: companyId } : undefined;
      const [subscriptions, plans] = await Promise.all([
        subscriptionService.getSubscriptions(filters),
        subscriptionService.getPlans(true),
      ]);

      // Filter to date range for new subscriptions
      const inRange = subscriptions.filter((s) => {
        if (!s.created_at) return true;
        return s.created_at >= dateRange.from && s.created_at <= dateRange.to + 'T23:59:59';
      });

      const active = subscriptions.filter((s) => s.status === 'active');
      const paused = subscriptions.filter((s) => s.status === 'paused');
      const cancelled = subscriptions.filter((s) => s.status === 'cancelled');
      const expired = subscriptions.filter((s) => s.status === 'expired');

      // MRR from active monthly subscriptions
      const mrr = active
        .filter((s) => s.plan?.billing_interval === 'monthly')
        .reduce((sum, s) => sum + (s.plan?.price || 0), 0);

      // ARR including annual + monthly
      const arr =
        mrr * 12 +
        active
          .filter((s) => s.plan?.billing_interval === 'annual')
          .reduce((sum, s) => sum + (s.plan?.price || 0), 0);

      // Churn rate = (cancelled + expired) / total
      const churnCount = cancelled.length + expired.length;
      const churnRate =
        subscriptions.length > 0 ? Math.round((churnCount / subscriptions.length) * 100) : 0;

      // Net new = new in period - cancelled in period
      const newInPeriod = inRange.filter((s) => s.status === 'active').length;
      const cancelledInPeriod = inRange.filter(
        (s) => s.status === 'cancelled' || s.status === 'expired'
      ).length;
      const netNew = newInPeriod - cancelledInPeriod;

      // Plan distribution
      const planMap = new Map<string, { count: number; revenue: number }>();
      subscriptions.forEach((s) => {
        const planName = s.plan?.name || 'Unknown';
        const existing = planMap.get(planName) || { count: 0, revenue: 0 };
        planMap.set(planName, {
          count: existing.count + 1,
          revenue: existing.revenue + (s.plan?.price || 0),
        });
      });

      const planDistribution = Array.from(planMap.entries()).map(([label, { count }]) => ({
        label,
        value: count,
      }));

      const planRevenue = Array.from(planMap.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .map(([plan, { count, revenue }]) => ({ plan, count, revenue }));

      // Monthly MRR trend (simplified from subscription data)
      const now = new Date();
      const mrrTrend: { label: string; value: number }[] = [];
      const churnTrend: { label: string; value: number }[] = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

        let newQ = supabase
          .from('subscriptions')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', start)
          .lte('created_at', endStr + 'T23:59:59');
        let churnQ = supabase
          .from('subscriptions')
          .select('id', { count: 'exact', head: true })
          .in('status', ['cancelled', 'expired'])
          .gte('updated_at', start)
          .lte('updated_at', endStr + 'T23:59:59');
        if (companyId) {
          newQ = newQ.eq('company_settings_id', companyId);
          churnQ = churnQ.eq('company_settings_id', companyId);
        }
        const [{ count: nc }, { count: cc }] = await Promise.all([newQ, churnQ]);
        mrrTrend.push({ label, value: nc || 0 });
        churnTrend.push({ label, value: cc || 0 });
      }

      // Expiring soon
      const expiringSoon = subscriptionService
        .getExpiringSoon(subscriptions, 30)
        .map((e) => ({
          id: e.id,
          customer: e.customer?.company_name || e.customer?.contact_person,
          plan: e.plan?.name,
          end_date: e.end_date,
        }));

      // Upcoming renewals (active, end_date in next 30 days)
      const todayStr = new Date().toISOString().split('T')[0];
      const in30Str = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0];
      const upcomingRenewals = subscriptions
        .filter(
          (s) =>
            s.status === 'active' &&
            s.end_date &&
            s.end_date >= todayStr &&
            s.end_date <= in30Str
        )
        .map((s) => ({
          id: s.id,
          customer: s.customer?.company_name || s.customer?.contact_person,
          plan: s.plan?.name,
          end_date: s.end_date,
          daysLeft: Math.ceil(
            (new Date(s.end_date!).getTime() - Date.now()) / 864e5
          ),
        }))
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 10);

      setStats({
        total: subscriptions.length,
        active: active.length,
        paused: paused.length,
        cancelled: cancelled.length,
        expired: expired.length,
        mrr,
        arr,
        churnRate,
        netNew,
        planDistribution,
        planRevenue,
        mrrTrend,
        churnTrend,
        expiringSoon,
        upcomingRenewals,
        subscriptions,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription data');
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

  const exportData = (stats?.subscriptions || []).map((s) => {
    const cust = Array.isArray(s.customer) ? s.customer[0] : s.customer;
    return {
      ID: s.id,
      Customer: cust?.company_name || cust?.contact_person || '',
      Plan: s.plan?.name || '',
      Status: s.status,
      'Plan Price': s.plan?.price || 0,
      'Billing Interval': s.plan?.billing_interval || '',
      'Start Date': s.start_date || '',
      'End Date': s.end_date || '',
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subscription Analytics</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedCompany ? selectedCompany.company_name : 'All Entities'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={exportData} filename="subscription-report" />
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportingCard
          title="Total Subscriptions"
          value={loading ? '—' : stats?.total ?? 0}
          icon={<CreditCard className="w-5 h-5" />}
          color="blue"
          loading={loading}
        />
        <ReportingCard
          title="Active"
          value={loading ? '—' : stats?.active ?? 0}
          subtitle={
            stats
              ? `${Math.round((stats.active / Math.max(stats.total, 1)) * 100)}% of total`
              : undefined
          }
          trend="up"
          trendValue={
            stats
              ? `${Math.round((stats.active / Math.max(stats.total, 1)) * 100)}% active`
              : undefined
          }
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
          loading={loading}
        />
        <ReportingCard
          title="MRR"
          value={loading ? '—' : formatCurrency(stats?.mrr ?? 0)}
          subtitle="Monthly Recurring Revenue"
          icon={<DollarSign className="w-5 h-5" />}
          color="purple"
          loading={loading}
        />
        <ReportingCard
          title="ARR"
          value={loading ? '—' : formatCurrency(stats?.arr ?? 0)}
          subtitle="Annual Recurring Revenue"
          icon={<TrendingUp className="w-5 h-5" />}
          color="indigo"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportingCard
          title="Churn Rate"
          value={loading ? '—' : `${stats?.churnRate ?? 0}%`}
          trend={stats && (stats.churnRate || 0) <= 5 ? 'up' : 'down'}
          trendValue={stats ? (stats.churnRate <= 5 ? 'Healthy' : 'High churn') : undefined}
          icon={<Percent className="w-5 h-5" />}
          color={stats && (stats.churnRate || 0) <= 5 ? 'green' : 'red'}
          loading={loading}
          invertTrend
        />
        <ReportingCard
          title="Cancelled"
          value={loading ? '—' : stats?.cancelled ?? 0}
          icon={<XCircle className="w-5 h-5" />}
          color="red"
          loading={loading}
        />
        <ReportingCard
          title="Paused"
          value={loading ? '—' : stats?.paused ?? 0}
          icon={<XCircle className="w-5 h-5" />}
          color="yellow"
          loading={loading}
        />
        <ReportingCard
          title="Net New Subs"
          value={loading ? '—' : (stats?.netNew ?? 0) >= 0 ? `+${stats?.netNew}` : `${stats?.netNew}`}
          subtitle={`${dateRange.label}`}
          trend={stats && (stats.netNew || 0) >= 0 ? 'up' : 'down'}
          icon={<TrendingUp className="w-5 h-5" />}
          color={stats && (stats.netNew || 0) >= 0 ? 'green' : 'red'}
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            New Subscriptions (Last 6 Months)
          </h3>
          {loading ? (
            <div className="h-48 bg-gray-100 rounded animate-pulse" />
          ) : (
            <SimpleBarChart
              data={(stats?.mrrTrend || []).map((d) => ({ ...d, color: 'bg-indigo-500' }))}
              height={200}
            />
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Churn / Cancellations (Last 6 Months)
          </h3>
          {loading ? (
            <div className="h-48 bg-gray-100 rounded animate-pulse" />
          ) : (
            <SimpleBarChart
              data={(stats?.churnTrend || []).map((d) => ({ ...d, color: 'bg-red-400' }))}
              height={200}
            />
          )}
        </div>
      </div>

      {/* Plan Distribution + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Plan Distribution
          </h3>
          {loading ? (
            <div className="h-48 bg-gray-100 rounded animate-pulse" />
          ) : (
            <SimpleBarChart
              data={(stats?.planDistribution || []).map((d) => ({
                ...d,
                color: 'bg-purple-500',
              }))}
              height={200}
            />
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Plan Revenue Table
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Subscribers</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(stats?.planRevenue || []).map((p, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-2 font-medium text-gray-900">{p.plan}</td>
                    <td className="py-2.5 px-2 text-right text-gray-600 tabular-nums">{p.count}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-gray-900 tabular-nums">
                      {formatCurrency(p.revenue)}
                    </td>
                  </tr>
                ))}
                {!stats?.planRevenue.length && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-gray-400 text-sm">No plan data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Status Breakdown
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Active', value: stats?.active ?? 0, color: 'bg-green-500' },
              { label: 'Paused', value: stats?.paused ?? 0, color: 'bg-yellow-500' },
              { label: 'Cancelled', value: stats?.cancelled ?? 0, color: 'bg-red-500' },
              { label: 'Expired', value: stats?.expired ?? 0, color: 'bg-gray-400' },
            ].map((item) => {
              const total = stats?.total || 1;
              const pct = (item.value / total) * 100;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-20">{item.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className={`${item.color} h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700`}
                      style={{ width: `${Math.max(pct, 3)}%` }}
                    >
                      <span className="text-xs font-bold text-white">{item.value}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right tabular-nums">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Renewals */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            Upcoming Renewals (30 Days)
          </h3>
          {(stats?.upcomingRenewals || []).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Days Left</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(stats?.upcomingRenewals || []).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2 px-2 font-medium text-gray-900 truncate max-w-[140px]">
                        {item.customer || 'N/A'}
                      </td>
                      <td className="py-2 px-2 text-gray-600 truncate">{item.plan || 'N/A'}</td>
                      <td className="py-2 px-2 text-right">
                        <span
                          className={`text-xs font-bold ${
                            item.daysLeft <= 7
                              ? 'text-red-600'
                              : item.daysLeft <= 14
                              ? 'text-yellow-600'
                              : 'text-gray-600'
                          }`}
                        >
                          {item.daysLeft}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No renewals in next 30 days</p>
          )}
        </div>
      </div>

      {/* Expiring Soon Alert */}
      {(stats?.expiringSoon || []).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Subscriptions Expiring Soon (Next 30 Days)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">End Date</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Days Left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(stats?.expiringSoon || []).map((item) => {
                  const end = item.end_date ? new Date(item.end_date) : null;
                  const daysLeft = end
                    ? Math.ceil((end.getTime() - Date.now()) / 864e5)
                    : null;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2 px-3 font-medium text-gray-900">{item.customer || 'N/A'}</td>
                      <td className="py-2 px-3 text-gray-600">{item.plan || 'N/A'}</td>
                      <td className="py-2 px-3 text-gray-500">{end?.toLocaleDateString() || 'N/A'}</td>
                      <td className="py-2 px-3 text-right">
                        {daysLeft !== null ? (
                          <span
                            className={`text-xs font-bold ${
                              daysLeft <= 7
                                ? 'text-red-600'
                                : daysLeft <= 14
                                ? 'text-yellow-600'
                                : 'text-gray-600'
                            }`}
                          >
                            {daysLeft} days
                          </span>
                        ) : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionReporting;
