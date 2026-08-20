import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  DollarSign,
  CheckCircle,
  XCircle,
  TrendingUp,
  Target,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { useCompanyContext } from '../../../contexts/CompanyContext';
import ReportingCard from './ReportingCard';
import SimpleBarChart from './SimpleBarChart';
import DateRangeFilter, { DateRange, getDefaultDateRange } from './DateRangeFilter';
import ExportButton from './ExportButton';

interface OppRow {
  id: string;
  stage: string;
  estimated_value: number;
  probability?: number;
  created_at: string;
  expected_close_date?: string;
  opportunity_name?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customer?: any;
}

const STAGE_PROBABILITY: Record<string, number> = {
  prospecting: 10,
  qualification: 25,
  proposal: 50,
  negotiation: 75,
  closed_won: 100,
  closed_lost: 0,
};

const STAGE_COLORS: Record<string, string> = {
  prospecting: 'bg-gray-400',
  qualification: 'bg-blue-400',
  proposal: 'bg-yellow-400',
  negotiation: 'bg-orange-400',
  closed_won: 'bg-green-500',
  closed_lost: 'bg-red-500',
};

const OpportunityReporting: React.FC = () => {
  const { selectedCompany } = useCompanyContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [refreshKey, setRefreshKey] = useState(0);

  interface Stats {
    total: number;
    prevTotal: number;
    stageBreakdown: { label: string; value: number; color: string }[];
    pipelineValue: number;
    weightedPipeline: number;
    openPipelineValue: number;
    wonValue: number;
    closedWon: number;
    closedLost: number;
    winRate: number;
    avgDealSize: number;
    monthlyWon: { label: string; value: number }[];
    monthlyLost: { label: string; value: number }[];
    topOpportunities: {
      title: string;
      customer: string;
      stage: string;
      value: number;
      closeDate: string;
    }[];
    opportunities: OppRow[];
  }

  const [stats, setStats] = useState<Stats | null>(null);
  const companyId = selectedCompany?.id ?? null;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let q = supabase
        .from('opportunities')
        .select(
          'id, stage, estimated_value, probability, created_at, expected_close_date, opportunity_name, customer:customers(company_name, contact_person)'
        )
        .gte('created_at', dateRange.from)
        .lte('created_at', dateRange.to + 'T23:59:59')
        .order('estimated_value', { ascending: false });
      if (companyId) q = q.eq('company_settings_id', companyId);
      const { data: opps, error: oppsErr } = await q;
      if (oppsErr) throw oppsErr;

      // Prior period
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      const duration = toDate.getTime() - fromDate.getTime();
      const prevFrom = new Date(fromDate.getTime() - duration).toISOString().split('T')[0];
      let prevQ = supabase
        .from('opportunities')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', prevFrom)
        .lte('created_at', dateRange.from + 'T23:59:59');
      if (companyId) prevQ = prevQ.eq('company_settings_id', companyId);
      const { count: prevCount } = await prevQ;

      // Monthly won/lost (last 6 months)
      const now = new Date();
      const monthlyWon: { label: string; value: number }[] = [];
      const monthlyLost: { label: string; value: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

        let wonQ = supabase
          .from('opportunities')
          .select('id', { count: 'exact', head: true })
          .eq('stage', 'closed_won')
          .gte('created_at', start)
          .lte('created_at', endStr + 'T23:59:59');
        if (companyId) wonQ = wonQ.eq('company_settings_id', companyId);

        let lostQ = supabase
          .from('opportunities')
          .select('id', { count: 'exact', head: true })
          .eq('stage', 'closed_lost')
          .gte('created_at', start)
          .lte('created_at', endStr + 'T23:59:59');
        if (companyId) lostQ = lostQ.eq('company_settings_id', companyId);

        const [{ count: wc }, { count: lc }] = await Promise.all([wonQ, lostQ]);
        monthlyWon.push({ label, value: wc || 0 });
        monthlyLost.push({ label, value: lc || 0 });
      }

      const allOpps: OppRow[] = opps || [];
      const won = allOpps.filter((o) => o.stage === 'closed_won');
      const lost = allOpps.filter((o) => o.stage === 'closed_lost');
      const open = allOpps.filter((o) => !['closed_won', 'closed_lost'].includes(o.stage));

      const pipelineValue = allOpps.reduce((s, o) => s + (o.estimated_value || 0), 0);
      const weightedPipeline = allOpps.reduce((s, o) => {
        const prob = o.probability ?? STAGE_PROBABILITY[o.stage] ?? 0;
        return s + (o.estimated_value || 0) * (prob / 100);
      }, 0);
      const openPipelineValue = open.reduce((s, o) => s + (o.estimated_value || 0), 0);
      const wonValue = won.reduce((s, o) => s + (o.estimated_value || 0), 0);
      const totalClosed = won.length + lost.length;

      const stageBreakdown = Object.entries(STAGE_COLORS).map(([stage, color]) => ({
        label: stage.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value: allOpps.filter((o) => o.stage === stage).length,
        color,
      })).filter((s) => s.value > 0);

      const topOpportunities = allOpps
        .filter((o) => !['closed_lost'].includes(o.stage))
        .slice(0, 8)
        .map((o) => {
          const cust = Array.isArray(o.customer) ? o.customer[0] : o.customer;
          return {
            title: o.opportunity_name || 'Untitled',
            customer: cust?.company_name || cust?.contact_person || 'Unknown',
            stage: o.stage,
            value: o.estimated_value || 0,
            closeDate: o.expected_close_date
              ? new Date(o.expected_close_date).toLocaleDateString()
              : '—',
          };
        });

      setStats({
        total: allOpps.length,
        prevTotal: prevCount || 0,
        stageBreakdown,
        pipelineValue,
        weightedPipeline,
        openPipelineValue,
        wonValue,
        closedWon: won.length,
        closedLost: lost.length,
        winRate: totalClosed > 0 ? Math.round((won.length / totalClosed) * 100) : 0,
        avgDealSize: allOpps.length > 0 ? pipelineValue / allOpps.length : 0,
        monthlyWon,
        monthlyLost,
        topOpportunities,
        opportunities: allOpps,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch opportunity stats');
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

  const exportData = (stats?.opportunities || []).map((o) => {
    const cust = Array.isArray(o.customer) ? o.customer[0] : o.customer;
    return {
      Title: o.opportunity_name || '',
      Customer: cust?.company_name || cust?.contact_person || '',
      Stage: o.stage,
      'Estimated Value': o.estimated_value || 0,
      Probability: o.probability ?? STAGE_PROBABILITY[o.stage] ?? 0,
      'Expected Close': o.expected_close_date || '',
      'Created At': new Date(o.created_at).toLocaleDateString(),
    };
  });

  const stageBadge = (stage: string) => {
    const colors: Record<string, string> = {
      prospecting: 'bg-gray-100 text-gray-600',
      qualification: 'bg-blue-100 text-blue-700',
      proposal: 'bg-yellow-100 text-yellow-700',
      negotiation: 'bg-orange-100 text-orange-700',
      closed_won: 'bg-green-100 text-green-700',
      closed_lost: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[stage] || 'bg-gray-100 text-gray-600'}`}>
        {stage.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Opportunity Analytics</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedCompany ? selectedCompany.company_name : 'All Entities'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={exportData} filename="opportunity-report" />
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
          title={`Opportunities (${dateRange.label})`}
          value={loading ? '—' : stats?.total ?? 0}
          previousValue={stats?.prevTotal}
          currentNumericValue={stats?.total}
          icon={<Briefcase className="w-5 h-5" />}
          color="blue"
          loading={loading}
        />
        <ReportingCard
          title="Win Rate"
          value={loading ? '—' : `${stats?.winRate ?? 0}%`}
          trend={stats && stats.winRate >= 30 ? 'up' : 'neutral'}
          trendValue={stats ? (stats.winRate >= 30 ? 'Healthy' : 'Below 30%') : undefined}
          icon={<Target className="w-5 h-5" />}
          color="green"
          loading={loading}
        />
        <ReportingCard
          title="Open Pipeline"
          value={loading ? '—' : formatCurrency(stats?.openPipelineValue ?? 0)}
          icon={<DollarSign className="w-5 h-5" />}
          color="purple"
          loading={loading}
        />
        <ReportingCard
          title="Weighted Pipeline"
          value={loading ? '—' : formatCurrency(stats?.weightedPipeline ?? 0)}
          subtitle="Probability-adjusted value"
          icon={<BarChart3 className="w-5 h-5" />}
          color="indigo"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <ReportingCard
          title="Total Pipeline Value"
          value={loading ? '—' : formatCurrency(stats?.pipelineValue ?? 0)}
          icon={<DollarSign className="w-5 h-5" />}
          color="blue"
          loading={loading}
        />
        <ReportingCard
          title="Won Value"
          value={loading ? '—' : formatCurrency(stats?.wonValue ?? 0)}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
          loading={loading}
        />
        <ReportingCard
          title="Avg Deal Size"
          value={loading ? '—' : formatCurrency(stats?.avgDealSize ?? 0)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="teal"
          loading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Pipeline Stage Distribution
          </h3>
          {loading ? (
            <div className="h-48 bg-gray-100 rounded animate-pulse" />
          ) : (
            <SimpleBarChart
              data={stats?.stageBreakdown || []}
              height={200}
            />
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Win / Loss Trend (Last 6 Months)
          </h3>
          {loading ? (
            <div className="h-48 bg-gray-100 rounded animate-pulse" />
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-green-600 mb-1">Won</p>
                <SimpleBarChart
                  data={(stats?.monthlyWon || []).map((d) => ({ ...d, color: 'bg-green-500' }))}
                  height={90}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-red-500 mb-1">Lost</p>
                <SimpleBarChart
                  data={(stats?.monthlyLost || []).map((d) => ({ ...d, color: 'bg-red-400' }))}
                  height={90}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Win/Loss Ratio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 col-span-1">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Win / Loss Ratio
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Closed Won', value: stats?.closedWon ?? 0, color: 'bg-green-500', icon: <CheckCircle className="w-4 h-4 text-green-600" /> },
              { label: 'Closed Lost', value: stats?.closedLost ?? 0, color: 'bg-red-500', icon: <XCircle className="w-4 h-4 text-red-500" /> },
            ].map((item) => {
              const total = (stats?.closedWon ?? 0) + (stats?.closedLost ?? 0);
              const pct = total > 0 ? (item.value / total) * 100 : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.icon}
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums">{item.value}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 text-right">{pct.toFixed(1)}%</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Opportunities Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Top Open Opportunities
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
                    <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Opportunity</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stage</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Close</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(stats?.topOpportunities || []).map((o, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2 px-2 font-medium text-gray-900 max-w-[150px] truncate">{o.title}</td>
                      <td className="py-2 px-2 text-gray-600 max-w-[120px] truncate">{o.customer}</td>
                      <td className="py-2 px-2">{stageBadge(o.stage)}</td>
                      <td className="py-2 px-2 text-right font-bold tabular-nums">{formatCurrency(o.value)}</td>
                      <td className="py-2 px-2 text-gray-500 text-xs">{o.closeDate}</td>
                    </tr>
                  ))}
                  {!stats?.topOpportunities.length && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 text-sm">
                        No opportunities in this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpportunityReporting;
