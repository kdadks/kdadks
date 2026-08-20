import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Users,
  RefreshCw,
  Percent,
} from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { useCompanyContext } from '../../../contexts/CompanyContext';
import ReportingCard from './ReportingCard';
import SimpleBarChart from './SimpleBarChart';
import DateRangeFilter, { DateRange, getDefaultDateRange } from './DateRangeFilter';
import ExportButton from './ExportButton';

interface InvoiceRow {
  id: string;
  invoice_number?: string;
  status: string;
  payment_status: string;
  total_amount: number;
  inr_total_amount?: number;
  invoice_date?: string;
  due_date?: string;
  created_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customer?: any;
  currency_code?: string;
}

const InvoiceReporting: React.FC = () => {
  const { selectedCompany } = useCompanyContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [refreshKey, setRefreshKey] = useState(0);

  interface Stats {
    total: number;
    prevTotal: number;
    paid: number;
    pending: number;
    overdue: number;
    cancelled: number;
    totalRevenue: number;
    prevRevenue: number;
    pendingAmount: number;
    overdueAmount: number;
    thisMonthRevenue: number;
    collectionRate: number;
    dso: number;
    monthlyIssued: { label: string; value: number }[];
    monthlyRevenue: { label: string; value: number }[];
    aging: { label: string; value: number; color: string }[];
    topCustomers: { name: string; value: number }[];
    byCurrency: { currency: string; amount: number; count: number }[];
    invoices: InvoiceRow[];
  }

  const [stats, setStats] = useState<Stats | null>(null);
  const companyId = selectedCompany?.id ?? null;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Main invoice fetch in period
      let q = supabase
        .from('invoices')
        .select(
          'id, invoice_number, status, payment_status, total_amount, inr_total_amount, invoice_date, due_date, created_at, currency_code, customer:customers(company_name, contact_person)'
        )
        .gte('invoice_date', dateRange.from)
        .lte('invoice_date', dateRange.to)
        .order('invoice_date', { ascending: false });
      if (companyId) q = q.eq('company_settings_id', companyId);
      const { data: invoices, error: invErr } = await q;
      if (invErr) throw invErr;

      // Prior period revenue
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      const duration = toDate.getTime() - fromDate.getTime();
      const prevFrom = new Date(fromDate.getTime() - duration).toISOString().split('T')[0];
      let prevQ = supabase
        .from('invoices')
        .select('inr_total_amount, total_amount, payment_status')
        .gte('invoice_date', prevFrom)
        .lte('invoice_date', dateRange.from);
      if (companyId) prevQ = prevQ.eq('company_settings_id', companyId);
      const { data: prevInvoices } = await prevQ;

      // Monthly trend (last 6 months)
      const now = new Date();
      const monthlyIssued: { label: string; value: number }[] = [];
      const monthlyRevenue: { label: string; value: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

        let issuedQ = supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .gte('invoice_date', start)
          .lte('invoice_date', endStr);
        if (companyId) issuedQ = issuedQ.eq('company_settings_id', companyId);
        const { count: ic } = await issuedQ;

        let revQ = supabase
          .from('invoices')
          .select('inr_total_amount, total_amount')
          .eq('payment_status', 'paid')
          .gte('invoice_date', start)
          .lte('invoice_date', endStr);
        if (companyId) revQ = revQ.eq('company_settings_id', companyId);
        const { data: revData } = await revQ;
        const rev = (revData || []).reduce(
          (s, inv) => s + (inv.inr_total_amount || inv.total_amount || 0),
          0
        );

        monthlyIssued.push({ label, value: ic || 0 });
        monthlyRevenue.push({ label, value: Math.round(rev / 1000) }); // in thousands for readability
      }

      const allInvoices: InvoiceRow[] = invoices || [];
      const today = new Date();

      const paid = allInvoices.filter((inv) => inv.payment_status === 'paid');
      const pendingInvs = allInvoices.filter(
        (inv) => inv.payment_status !== 'paid' && !['cancelled'].includes(inv.status)
      );
      const overdueInvs = pendingInvs.filter((inv) => {
        if (!inv.due_date) return false;
        return new Date(inv.due_date) < today;
      });

      const totalRevenue = paid.reduce(
        (s, inv) => s + (inv.inr_total_amount || inv.total_amount || 0),
        0
      );
      const prevRevenue = (prevInvoices || [])
        .filter((inv) => inv.payment_status === 'paid')
        .reduce((s, inv) => s + (inv.inr_total_amount || inv.total_amount || 0), 0);
      const pendingAmount = pendingInvs.reduce(
        (s, inv) => s + (inv.inr_total_amount || inv.total_amount || 0),
        0
      );
      const overdueAmount = overdueInvs.reduce(
        (s, inv) => s + (inv.inr_total_amount || inv.total_amount || 0),
        0
      );
      const totalIssued = allInvoices.reduce(
        (s, inv) => s + (inv.inr_total_amount || inv.total_amount || 0),
        0
      );
      const collectionRate = totalIssued > 0 ? Math.round((totalRevenue / totalIssued) * 100) : 0;

      // Real aging buckets from due_date
      const aging = [
        { label: '0-30 Days', max: 30, color: 'bg-green-500' },
        { label: '31-60 Days', max: 60, color: 'bg-yellow-500' },
        { label: '61-90 Days', max: 90, color: 'bg-orange-500' },
        { label: '90+ Days', max: Infinity, color: 'bg-red-500' },
      ].map(({ label, max, color }) => {
        const prev = max === 30 ? 0 : max === 60 ? 31 : max === 90 ? 61 : 91;
        const sum = overdueInvs
          .filter((inv) => {
            if (!inv.due_date) return false;
            const daysOverdue = Math.floor(
              (today.getTime() - new Date(inv.due_date).getTime()) / 864e5
            );
            return daysOverdue >= prev && (max === Infinity || daysOverdue <= max);
          })
          .reduce((s, inv) => s + (inv.inr_total_amount || inv.total_amount || 0), 0);
        return { label, value: Math.round(sum / 1000), color }; // in thousands
      });

      // DSO = (outstanding receivables / total revenue) * days in period
      const periodDays = Math.round(duration / 864e5);
      const dso = totalRevenue > 0 ? Math.round((pendingAmount / totalRevenue) * periodDays) : 0;

      // Top customers by collected revenue
      const custMap = new Map<string, number>();
      allInvoices.forEach((inv) => {
        const cust = Array.isArray(inv.customer) ? inv.customer[0] : inv.customer;
        const name = cust?.company_name || cust?.contact_person || 'Unknown';
        custMap.set(name, (custMap.get(name) || 0) + (inv.inr_total_amount || inv.total_amount || 0));
      });
      const topCustomers = Array.from(custMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, value]) => ({ name, value }));

      // Currency breakdown
      const currMap = new Map<string, { amount: number; count: number }>();
      allInvoices.forEach((inv) => {
        const cc = inv.currency_code || 'INR';
        const existing = currMap.get(cc) || { amount: 0, count: 0 };
        currMap.set(cc, {
          amount: existing.amount + (inv.total_amount || 0),
          count: existing.count + 1,
        });
      });
      const byCurrency = Array.from(currMap.entries())
        .sort((a, b) => b[1].amount - a[1].amount)
        .map(([currency, { amount, count }]) => ({ currency, amount, count }));

      const now2 = new Date();
      const thisMonthStart = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}-01`;
      const thisMonthRevenue = paid
        .filter((inv) => inv.invoice_date && inv.invoice_date >= thisMonthStart)
        .reduce((s, inv) => s + (inv.inr_total_amount || inv.total_amount || 0), 0);

      setStats({
        total: allInvoices.length,
        prevTotal: (prevInvoices || []).length,
        paid: paid.length,
        pending: pendingInvs.length,
        overdue: allInvoices.filter((inv) => inv.status === 'overdue').length,
        cancelled: allInvoices.filter((inv) => inv.status === 'cancelled').length,
        totalRevenue,
        prevRevenue,
        pendingAmount,
        overdueAmount,
        thisMonthRevenue,
        collectionRate,
        dso,
        monthlyIssued,
        monthlyRevenue,
        aging,
        topCustomers,
        byCurrency,
        invoices: allInvoices,
      });
    } catch (err) {
      console.error('InvoiceReporting error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch invoice stats');
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

  const exportData = (stats?.invoices || []).map((inv) => {
    const cust = Array.isArray(inv.customer) ? inv.customer[0] : inv.customer;
    return {
      'Invoice #': inv.invoice_number || '',
      Customer: cust?.company_name || cust?.contact_person || '',
      Status: inv.status,
      'Payment Status': inv.payment_status,
      Amount: inv.inr_total_amount || inv.total_amount || 0,
      Currency: inv.currency_code || 'INR',
      'Invoice Date': inv.invoice_date || '',
      'Due Date': inv.due_date || '',
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invoice Analytics</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedCompany ? selectedCompany.company_name : 'All Entities'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={exportData} filename="invoice-report" />
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
          title={`Invoices (${dateRange.label})`}
          value={loading ? '—' : stats?.total ?? 0}
          previousValue={stats?.prevTotal}
          currentNumericValue={stats?.total}
          icon={<Receipt className="w-5 h-5" />}
          color="blue"
          loading={loading}
        />
        <ReportingCard
          title="Collected Revenue"
          value={loading ? '—' : formatCurrency(stats?.totalRevenue ?? 0)}
          previousValue={stats?.prevRevenue}
          currentNumericValue={stats?.totalRevenue}
          icon={<DollarSign className="w-5 h-5" />}
          color="green"
          loading={loading}
        />
        <ReportingCard
          title="Collection Rate"
          value={loading ? '—' : `${stats?.collectionRate ?? 0}%`}
          trend={stats && (stats.collectionRate || 0) >= 80 ? 'up' : 'down'}
          trendValue={stats ? (stats.collectionRate >= 80 ? 'Healthy' : 'Below 80%') : undefined}
          icon={<Percent className="w-5 h-5" />}
          color="teal"
          loading={loading}
        />
        <ReportingCard
          title="DSO (Days)"
          value={loading ? '—' : `${stats?.dso ?? 0} days`}
          subtitle="Days Sales Outstanding"
          trend={stats && (stats.dso || 0) <= 30 ? 'up' : 'down'}
          icon={<Clock className="w-5 h-5" />}
          color={stats && (stats.dso || 0) <= 30 ? 'green' : 'red'}
          loading={loading}
          invertTrend
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <ReportingCard
          title="Outstanding Amount"
          value={loading ? '—' : formatCurrency(stats?.pendingAmount ?? 0)}
          icon={<Clock className="w-5 h-5" />}
          color="yellow"
          loading={loading}
        />
        <ReportingCard
          title="Overdue Amount"
          value={loading ? '—' : formatCurrency(stats?.overdueAmount ?? 0)}
          trend={stats && (stats.overdueAmount || 0) > 0 ? 'down' : 'neutral'}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="red"
          loading={loading}
        />
        <ReportingCard
          title="This Month Revenue"
          value={loading ? '—' : formatCurrency(stats?.thisMonthRevenue ?? 0)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple"
          loading={loading}
        />
      </div>

      {/* Revenue Waterfall */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Invoices Issued (Last 6 Months)
          </h3>
          {loading ? (
            <div className="h-48 bg-gray-100 rounded animate-pulse" />
          ) : (
            <SimpleBarChart
              data={(stats?.monthlyIssued || []).map((d) => ({ ...d, color: 'bg-blue-400' }))}
              height={200}
            />
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Revenue Collected — ₹K (Last 6 Months)
          </h3>
          {loading ? (
            <div className="h-48 bg-gray-100 rounded animate-pulse" />
          ) : (
            <SimpleBarChart
              data={(stats?.monthlyRevenue || []).map((d) => ({ ...d, color: 'bg-green-500' }))}
              height={200}
            />
          )}
        </div>
      </div>

      {/* Payment Status + Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Payment Status Breakdown
          </h3>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Paid', value: stats?.paid ?? 0, color: 'bg-green-500' },
                { label: 'Pending', value: stats?.pending ?? 0, color: 'bg-yellow-500' },
                { label: 'Overdue', value: stats?.overdue ?? 0, color: 'bg-red-500' },
                { label: 'Cancelled', value: stats?.cancelled ?? 0, color: 'bg-gray-400' },
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
                    <span className="text-xs text-gray-500 w-12 text-right tabular-nums">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Aging Analysis — Overdue ₹K
          </h3>
          {loading ? (
            <div className="h-48 bg-gray-100 rounded animate-pulse" />
          ) : (
            <SimpleBarChart data={stats?.aging || []} height={200} />
          )}
        </div>
      </div>

      {/* Top Customers + Currency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            Top Customers by Invoice Value
          </h3>
          <div className="space-y-3">
            {(stats?.topCustomers || []).map((c, idx) => {
              const totalRev = (stats?.topCustomers || []).reduce((a, b) => a + b.value, 0);
              const pct = totalRev > 0 ? (c.value / totalRev) * 100 : 0;
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-4">{idx + 1}</span>
                  <span className="text-sm font-medium text-gray-700 flex-1 truncate">{c.name}</span>
                  <div className="w-24 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-bold text-gray-900 tabular-nums w-20 text-right">
                    {formatCurrency(c.value)}
                  </span>
                </div>
              );
            })}
            {!stats?.topCustomers.length && (
              <p className="text-sm text-gray-400 text-center py-6">No invoice data in this period</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Currency Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Currency</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Invoices</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(stats?.byCurrency || []).map((c, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700">
                        {c.currency}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right text-gray-600 tabular-nums">{c.count}</td>
                    <td className="py-2 px-2 text-right font-bold text-gray-900 tabular-nums">
                      {c.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
                {!stats?.byCurrency.length && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-gray-400 text-sm">No data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceReporting;
