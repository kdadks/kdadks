import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Clock,
  RefreshCw,
  DollarSign,
} from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { useCompanyContext } from '../../../contexts/CompanyContext';
import ReportingCard from './ReportingCard';
import SimpleBarChart from './SimpleBarChart';
import DateRangeFilter, { DateRange, getDefaultDateRange } from './DateRangeFilter';
import ExportButton from './ExportButton';

interface QuoteRow {
  id: string;
  status: string;
  total_amount: number;
  inr_total_amount?: number;
  quote_date?: string;
  created_at: string;
  quote_number?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customer?: any;
  valid_until?: string;
}

const QuoteReporting: React.FC = () => {
  const { selectedCompany } = useCompanyContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [refreshKey, setRefreshKey] = useState(0);

  interface Stats {
    total: number;
    prevTotal: number;
    draft: number;
    sent: number;
    accepted: number;
    rejected: number;
    expired: number;
    converted: number;
    acceptanceRate: number;
    conversionRate: number;
    totalAmount: number;
    avgQuoteValue: number;
    monthlyQuotes: { label: string; value: number }[];
    monthlyAccepted: { label: string; value: number }[];
    topCustomers: { name: string; count: number; amount: number }[];
    expiringIn7: number;
    expiringIn14: number;
    expiringIn30: number;
    quotes: QuoteRow[];
  }

  const [stats, setStats] = useState<Stats | null>(null);
  const companyId = selectedCompany?.id ?? null;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let q = supabase
        .from('quotes')
        .select(
          'id, status, total_amount, inr_total_amount, quote_date, created_at, quote_number, valid_until, customer:customers(company_name, contact_person)'
        )
        .gte('created_at', dateRange.from)
        .lte('created_at', dateRange.to + 'T23:59:59')
        .order('created_at', { ascending: false });
      if (companyId) q = q.eq('company_settings_id', companyId);
      const { data: quotes, error: quotesErr } = await q;
      if (quotesErr) throw quotesErr;

      // Prior period
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      const duration = toDate.getTime() - fromDate.getTime();
      const prevFrom = new Date(fromDate.getTime() - duration).toISOString().split('T')[0];
      let prevQ = supabase
        .from('quotes')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', prevFrom)
        .lte('created_at', dateRange.from + 'T23:59:59');
      if (companyId) prevQ = prevQ.eq('company_settings_id', companyId);
      const { count: prevCount } = await prevQ;

      // Monthly trend (last 6 months)
      const now = new Date();
      const monthlyQuotes: { label: string; value: number }[] = [];
      const monthlyAccepted: { label: string; value: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

        let allQ = supabase
          .from('quotes')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', start)
          .lte('created_at', endStr + 'T23:59:59');
        let accQ = supabase
          .from('quotes')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'accepted')
          .gte('created_at', start)
          .lte('created_at', endStr + 'T23:59:59');
        if (companyId) {
          allQ = allQ.eq('company_settings_id', companyId);
          accQ = accQ.eq('company_settings_id', companyId);
        }
        const [{ count: ac }, { count: accC }] = await Promise.all([allQ, accQ]);
        monthlyQuotes.push({ label, value: ac || 0 });
        monthlyAccepted.push({ label, value: accC || 0 });
      }

      // Expiry analysis
      const today = new Date().toISOString().split('T')[0];
      const in7 = new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0];
      const in14 = new Date(Date.now() + 14 * 864e5).toISOString().split('T')[0];
      const in30 = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0];

      const buildExpiryQ = (to: string) => {
        let eq = supabase
          .from('quotes')
          .select('id', { count: 'exact', head: true })
          .in('status', ['draft', 'sent'])
          .gte('valid_until', today)
          .lte('valid_until', to + 'T23:59:59');
        if (companyId) eq = eq.eq('company_settings_id', companyId);
        return eq;
      };

      const [{ count: exp7 }, { count: exp14 }, { count: exp30 }] = await Promise.all([
        buildExpiryQ(in7),
        buildExpiryQ(in14),
        buildExpiryQ(in30),
      ]);

      const allQuotes: QuoteRow[] = quotes || [];
      const accepted = allQuotes.filter((q) => q.status === 'accepted').length;
      const converted = allQuotes.filter((q) => q.status === 'converted').length;
      const sent = allQuotes.filter((q) => q.status === 'sent').length;
      const totalAmount = allQuotes.reduce(
        (s, q) => s + (q.inr_total_amount || q.total_amount || 0),
        0
      );

      // Top customers by quote count + amount
      const custMap = new Map<string, { count: number; amount: number }>();
      allQuotes.forEach((q) => {
        const cust = Array.isArray(q.customer) ? q.customer[0] : q.customer;
        const name = cust?.company_name || cust?.contact_person || 'Unknown';
        const existing = custMap.get(name) || { count: 0, amount: 0 };
        custMap.set(name, {
          count: existing.count + 1,
          amount: existing.amount + (q.inr_total_amount || q.total_amount || 0),
        });
      });
      const topCustomers = Array.from(custMap.entries())
        .sort((a, b) => b[1].amount - a[1].amount)
        .slice(0, 6)
        .map(([name, { count, amount }]) => ({ name, count, amount }));

      setStats({
        total: allQuotes.length,
        prevTotal: prevCount || 0,
        draft: allQuotes.filter((q) => q.status === 'draft').length,
        sent,
        accepted,
        rejected: allQuotes.filter((q) => q.status === 'rejected').length,
        expired: allQuotes.filter((q) => q.status === 'expired').length,
        converted,
        acceptanceRate: sent + accepted > 0 ? Math.round((accepted / (sent + accepted)) * 100) : 0,
        conversionRate: allQuotes.length > 0 ? Math.round((converted / allQuotes.length) * 100) : 0,
        totalAmount,
        avgQuoteValue: allQuotes.length > 0 ? totalAmount / allQuotes.length : 0,
        monthlyQuotes,
        monthlyAccepted,
        topCustomers,
        expiringIn7: exp7 || 0,
        expiringIn14: exp14 || 0,
        expiringIn30: exp30 || 0,
        quotes: allQuotes,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quote stats');
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

  const exportData = (stats?.quotes || []).map((q) => {
    const cust = Array.isArray(q.customer) ? q.customer[0] : q.customer;
    return {
      'Quote #': q.quote_number || '',
      Customer: cust?.company_name || cust?.contact_person || '',
      Status: q.status,
      Amount: q.inr_total_amount || q.total_amount || 0,
      'Quote Date': q.quote_date || '',
      'Valid Until': q.valid_until || '',
    };
  });

  const statusBreakdown = stats
    ? [
        { label: 'Draft', value: stats.draft, color: 'bg-gray-400' },
        { label: 'Sent', value: stats.sent, color: 'bg-blue-400' },
        { label: 'Accepted', value: stats.accepted, color: 'bg-green-500' },
        { label: 'Rejected', value: stats.rejected, color: 'bg-red-500' },
        { label: 'Expired', value: stats.expired, color: 'bg-orange-400' },
        { label: 'Converted', value: stats.converted, color: 'bg-teal-500' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quote Analytics</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedCompany ? selectedCompany.company_name : 'All Entities'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={exportData} filename="quote-report" />
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

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportingCard
          title={`Quotes (${dateRange.label})`}
          value={loading ? '—' : stats?.total ?? 0}
          previousValue={stats?.prevTotal}
          currentNumericValue={stats?.total}
          icon={<FileText className="w-5 h-5" />}
          color="blue"
          loading={loading}
        />
        <ReportingCard
          title="Acceptance Rate"
          value={loading ? '—' : `${stats?.acceptanceRate ?? 0}%`}
          trend={stats && stats.acceptanceRate >= 50 ? 'up' : 'neutral'}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
          loading={loading}
        />
        <ReportingCard
          title="Conversion Rate"
          value={loading ? '—' : `${stats?.conversionRate ?? 0}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="teal"
          loading={loading}
        />
        <ReportingCard
          title="Avg Quote Value"
          value={loading ? '—' : formatCurrency(stats?.avgQuoteValue ?? 0)}
          icon={<DollarSign className="w-5 h-5" />}
          color="purple"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <ReportingCard
          title="Total Quoted Value"
          value={loading ? '—' : formatCurrency(stats?.totalAmount ?? 0)}
          icon={<BarChart3 className="w-5 h-5" />}
          color="indigo"
          loading={loading}
        />
        <ReportingCard
          title="Pending Quotes"
          value={loading ? '—' : (stats?.draft ?? 0) + (stats?.sent ?? 0)}
          icon={<Clock className="w-5 h-5" />}
          color="yellow"
          loading={loading}
          subtitle="Draft + Sent"
        />
        <ReportingCard
          title="Expiring in 30 Days"
          value={loading ? '—' : stats?.expiringIn30 ?? 0}
          trend={stats && (stats.expiringIn30 || 0) > 0 ? 'down' : 'neutral'}
          trendValue={stats ? (stats.expiringIn7 || 0) > 0 ? `${stats.expiringIn7} in 7 days!` : undefined : undefined}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="red"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Quotes Issued vs. Accepted (Last 6 Months)
          </h3>
          {loading ? (
            <div className="h-48 bg-gray-100 rounded animate-pulse" />
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-indigo-600 mb-1">Issued</p>
                <SimpleBarChart
                  data={(stats?.monthlyQuotes || []).map((d) => ({ ...d, color: 'bg-indigo-400' }))}
                  height={90}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-green-600 mb-1">Accepted</p>
                <SimpleBarChart
                  data={(stats?.monthlyAccepted || []).map((d) => ({ ...d, color: 'bg-green-500' }))}
                  height={90}
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Quote Status Funnel
          </h3>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {statusBreakdown.filter((s) => s.value > 0).map((item) => {
                const pct = stats && stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 w-20">{item.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className={`${item.color} h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700`}
                        style={{ width: `${Math.max(pct, 5)}%` }}
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
          )}
        </div>
      </div>

      {/* Expiry Risk Panel */}
      {!loading && ((stats?.expiringIn30 ?? 0) > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-amber-800">Quote Expiry Risk</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Expiring in 7 days', value: stats?.expiringIn7 ?? 0, urgency: 'critical' },
              { label: 'Expiring in 14 days', value: stats?.expiringIn14 ?? 0, urgency: 'warning' },
              { label: 'Expiring in 30 days', value: stats?.expiringIn30 ?? 0, urgency: 'info' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className={`text-2xl font-bold ${item.urgency === 'critical' ? 'text-red-600' : item.urgency === 'warning' ? 'text-amber-600' : 'text-gray-700'}`}>
                  {item.value}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Customers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
          Top Customers by Quote Value
        </h3>
        {loading ? (
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
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Quotes</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(stats?.topCustomers || []).map((c, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3 text-gray-400 text-xs font-medium">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-gray-900">{c.name}</td>
                    <td className="py-2.5 px-3 text-right text-gray-600 tabular-nums">{c.count}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-gray-900 tabular-nums">
                      {formatCurrency(c.amount)}
                    </td>
                  </tr>
                ))}
                {!stats?.topCustomers.length && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 text-sm">No quotes in this period</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteReporting;
