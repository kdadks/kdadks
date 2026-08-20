import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Target,
  TrendingUp,
  XCircle,
  Globe,
  Clock,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { useCompanyContext } from '../../../contexts/CompanyContext';
import ReportingCard from './ReportingCard';
import SimpleBarChart from './SimpleBarChart';
import DateRangeFilter, { DateRange, getDefaultDateRange } from './DateRangeFilter';
import ExportButton from './ExportButton';

interface LeadRow {
  id: string;
  status: string;
  source: string;
  created_at: string;
  lead_number?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
}

const ALL_SOURCES = [
  'website', 'referral', 'campaign', 'direct', 'event',
  'cold_call', 'social_media', 'other',
];

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-400',
  contacted: 'bg-blue-400',
  qualified: 'bg-yellow-500',
  converted: 'bg-green-500',
  disqualified: 'bg-red-500',
};

const LeadReporting: React.FC = () => {
  const { selectedCompany } = useCompanyContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [refreshKey, setRefreshKey] = useState(0);

  interface Stats {
    total: number;
    prevTotal: number;
    newLeads: number;
    contacted: number;
    qualified: number;
    converted: number;
    disqualified: number;
    conversionRate: number;
    avgDaysToConvert: number;
    sourceBreakdown: { label: string; value: number; color: string }[];
    monthlyTrend: { label: string; value: number }[];
    staleLeads: number;
    leads: LeadRow[];
  }

  const [stats, setStats] = useState<Stats | null>(null);
  const companyId = selectedCompany?.id ?? null;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Leads in selected period
      let q = supabase
        .from('leads')
        .select('id, status, source, created_at, lead_number, first_name, last_name, company_name, email')
        .gte('created_at', dateRange.from)
        .lte('created_at', dateRange.to + 'T23:59:59')
        .order('created_at', { ascending: false });
      if (companyId) q = q.eq('company_settings_id', companyId);
      const { data: leads, error: leadsErr } = await q;
      if (leadsErr) throw leadsErr;

      // Prior period count
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      const duration = toDate.getTime() - fromDate.getTime();
      const prevFrom = new Date(fromDate.getTime() - duration).toISOString().split('T')[0];
      let prevQ = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', prevFrom)
        .lte('created_at', dateRange.from + 'T23:59:59');
      if (companyId) prevQ = prevQ.eq('company_settings_id', companyId);
      const { count: prevCount } = await prevQ;

      // Monthly trend (last 6 months fixed)
      const now = new Date();
      const months: { label: string; value: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
        let mq = supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', start)
          .lte('created_at', endStr + 'T23:59:59');
        if (companyId) mq = mq.eq('company_settings_id', companyId);
        const { count: mc } = await mq;
        months.push({ label, value: mc || 0 });
      }

      // Stale leads (no activity in 14+ days) — approximate using leads with status not converted/disqualified
      const staleDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      let staleQ = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .in('status', ['new', 'contacted', 'qualified'])
        .lte('created_at', staleDate + 'T23:59:59');
      if (companyId) staleQ = staleQ.eq('company_settings_id', companyId);
      const { count: staleCount } = await staleQ;

      const allLeads: LeadRow[] = leads || [];
      const total = allLeads.length;
      const converted = allLeads.filter((l) => l.status === 'converted').length;

      const sourceBreakdown = ALL_SOURCES
        .map((src, i) => ({
          label: src.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          value: allLeads.filter((l) => l.source === src).length,
          color: ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-400',
            'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-gray-400'][i % 8],
        }))
        .filter((s) => s.value > 0)
        .sort((a, b) => b.value - a.value);

      setStats({
        total,
        prevTotal: prevCount || 0,
        newLeads: allLeads.filter((l) => l.status === 'new').length,
        contacted: allLeads.filter((l) => l.status === 'contacted').length,
        qualified: allLeads.filter((l) => l.status === 'qualified').length,
        converted,
        disqualified: allLeads.filter((l) => l.status === 'disqualified').length,
        conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
        avgDaysToConvert: 0, // Would need start/end dates on leads
        sourceBreakdown,
        monthlyTrend: months,
        staleLeads: staleCount || 0,
        leads: allLeads,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lead stats');
    } finally {
      setLoading(false);
    }
  }, [companyId, dateRange, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportData = (stats?.leads || []).map((l) => ({
    'Lead #': l.lead_number || '',
    Name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || l.company_name || '',
    Status: l.status,
    Source: l.source,
    'Created At': new Date(l.created_at).toLocaleDateString(),
  }));

  const funnelData = stats
    ? [
        { label: 'New', value: stats.newLeads, color: STATUS_COLORS.new },
        { label: 'Contacted', value: stats.contacted, color: STATUS_COLORS.contacted },
        { label: 'Qualified', value: stats.qualified, color: STATUS_COLORS.qualified },
        { label: 'Converted', value: stats.converted, color: STATUS_COLORS.converted },
        { label: 'Disqualified', value: stats.disqualified, color: STATUS_COLORS.disqualified },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lead Analytics</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedCompany ? selectedCompany.company_name : 'All Entities'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={exportData} filename="lead-report" />
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
          title={`Leads (${dateRange.label})`}
          value={loading ? '—' : stats?.total ?? 0}
          previousValue={stats?.prevTotal}
          currentNumericValue={stats?.total}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          loading={loading}
        />
        <ReportingCard
          title="Conversion Rate"
          value={loading ? '—' : `${stats?.conversionRate ?? 0}%`}
          trend={stats && stats.conversionRate >= 20 ? 'up' : 'neutral'}
          trendValue={stats ? (stats.conversionRate >= 20 ? 'Good' : 'Below target') : undefined}
          icon={<Target className="w-5 h-5" />}
          color="green"
          loading={loading}
        />
        <ReportingCard
          title="Qualified"
          value={loading ? '—' : stats?.qualified ?? 0}
          icon={<UserPlus className="w-5 h-5" />}
          color="purple"
          loading={loading}
        />
        <ReportingCard
          title="Stale Leads (14+ days)"
          value={loading ? '—' : stats?.staleLeads ?? 0}
          trend={stats && (stats.staleLeads || 0) > 0 ? 'down' : 'neutral'}
          trendValue={stats && (stats.staleLeads || 0) > 0 ? 'Need attention' : 'All active'}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="yellow"
          loading={loading}
          invertTrend
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Monthly Lead Volume (Last 6 Months)
          </h3>
          {loading ? (
            <div className="h-48 bg-gray-100 rounded animate-pulse" />
          ) : (
            <SimpleBarChart
              data={(stats?.monthlyTrend || []).map((d) => ({ ...d, color: 'bg-indigo-500' }))}
              height={200}
            />
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Lead Source Breakdown
          </h3>
          {loading ? (
            <div className="h-48 bg-gray-100 rounded animate-pulse" />
          ) : (
            <SimpleBarChart
              data={stats?.sourceBreakdown || []}
              height={200}
            />
          )}
        </div>
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-5">
          Lead Status Funnel — Stage Drop-Off
        </h3>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {funnelData.map((item, idx) => {
              const pct = stats && stats.total > 0 ? (item.value / stats.total) * 100 : 0;
              const prevItem = funnelData[idx - 1];
              const dropOff =
                idx > 0 && prevItem && prevItem.value > 0
                  ? Math.round(((prevItem.value - item.value) / prevItem.value) * 100)
                  : null;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700 w-28">{item.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden">
                    <div
                      className={`${item.color} h-full rounded-full flex items-center justify-between px-3 transition-all duration-700`}
                      style={{ width: `${Math.max(pct, 5)}%` }}
                    >
                      <span className="text-xs font-bold text-white">{item.value}</span>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-500 w-12 text-right tabular-nums">
                    {pct.toFixed(1)}%
                  </span>
                  {dropOff !== null && (
                    <span className="text-xs text-red-500 w-20 text-right">
                      {dropOff > 0 ? `-${dropOff}% drop` : ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ReportingCard
          title="Converted"
          value={stats?.converted ?? 0}
          icon={<TrendingUp className="w-5 h-5" />}
          color="teal"
          loading={loading}
        />
        <ReportingCard
          title="Disqualified"
          value={stats?.disqualified ?? 0}
          icon={<XCircle className="w-5 h-5" />}
          color="red"
          loading={loading}
        />
        <ReportingCard
          title="Source Count"
          value={stats?.sourceBreakdown.length ?? 0}
          icon={<Globe className="w-5 h-5" />}
          color="blue"
          loading={loading}
          subtitle="Active lead sources"
        />
      </div>
    </div>
  );
};

export default LeadReporting;
