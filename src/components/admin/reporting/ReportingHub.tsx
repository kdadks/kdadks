import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Target,
  Briefcase,
  FileText,
  Receipt,
  CreditCard,
  TrendingUp,
  DollarSign,
  ArrowRight,
  RefreshCw,
  BarChart3,
  Activity,
} from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { subscriptionService } from '../../../services/subscriptionService';
import { useCompanyContext } from '../../../contexts/CompanyContext';
import { useNavigate } from 'react-router-dom';

interface HubStats {
  totalCustomers: number;
  activeCustomers: number;
  totalLeads: number;
  leadConversionRate: number;
  totalOpportunities: number;
  pipelineValue: number;
  openPipelineValue: number;
  winRate: number;
  totalQuotes: number;
  quoteAcceptanceRate: number;
  totalInvoices: number;
  collectedRevenue: number;
  pendingRevenue: number;
  collectionRate: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  mrr: number;
  arr: number;
}

interface ModuleCard {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: React.ReactNode;
  gradient: string;
  primaryMetric: { label: string; value: string | number };
  secondaryMetric: { label: string; value: string | number };
  trend?: 'up' | 'down' | 'neutral';
}

const ReportingHub: React.FC = () => {
  const { selectedCompany } = useCompanyContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<HubStats | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const companyId = selectedCompany?.id ?? null;

  const formatCurrency = (v: number) => {
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
    return `₹${Math.round(v)}`;
  };

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);

      // Customers
      let custTotalQ = supabase.from('customers').select('id', { count: 'exact', head: true });
      let custActiveQ = supabase.from('customers').select('id', { count: 'exact', head: true }).eq('is_active', true);
      if (companyId) {
        custTotalQ = custTotalQ.eq('company_settings_id', companyId);
        custActiveQ = custActiveQ.eq('company_settings_id', companyId);
      }
      const { count: custTotal } = await custTotalQ;
      const { count: custActive } = await custActiveQ;

      // Leads
      let leadsQ = supabase.from('leads').select('status');
      if (companyId) leadsQ = leadsQ.eq('company_settings_id', companyId);
      const { data: leads } = await leadsQ;
      const allLeads = leads || [];
      const convertedLeads = allLeads.filter((l) => l.status === 'converted').length;

      // Opportunities
      let oppsQ = supabase.from('opportunities').select('stage, estimated_value');
      if (companyId) oppsQ = oppsQ.eq('company_settings_id', companyId);
      const { data: opps } = await oppsQ;
      const allOpps = opps || [];
      const won = allOpps.filter((o) => o.stage === 'closed_won');
      const lost = allOpps.filter((o) => o.stage === 'closed_lost');
      const pipelineValue = allOpps.reduce((s, o) => s + (o.estimated_value || 0), 0);
      const openPipeline = allOpps
        .filter((o) => !['closed_won', 'closed_lost'].includes(o.stage))
        .reduce((s, o) => s + (o.estimated_value || 0), 0);
      const totalClosed = won.length + lost.length;
      const winRate = totalClosed > 0 ? Math.round((won.length / totalClosed) * 100) : 0;

      // Quotes
      let quotesQ = supabase.from('quotes').select('status, inr_total_amount, total_amount');
      if (companyId) quotesQ = quotesQ.eq('company_settings_id', companyId);
      const { data: quotesData } = await quotesQ;
      const allQuotes = quotesData || [];
      const acceptedQ = allQuotes.filter((q) => q.status === 'accepted').length;
      const sentQ = allQuotes.filter((q) => q.status === 'sent').length;
      const acceptanceRate = sentQ + acceptedQ > 0 ? Math.round((acceptedQ / (sentQ + acceptedQ)) * 100) : 0;

      // Invoices
      let invQ = supabase.from('invoices').select('payment_status, inr_total_amount, total_amount, status');
      if (companyId) invQ = invQ.eq('company_settings_id', companyId);
      const { data: invData, count: invCount } = await invQ;
      const allInvoices = invData || [];
      const paidInvs = allInvoices.filter((i) => i.payment_status === 'paid');
      const pendingInvs = allInvoices.filter(
        (i) => i.payment_status !== 'paid' && !['cancelled'].includes(i.status)
      );
      const collectedRevenue = paidInvs.reduce(
        (s, i) => s + (i.inr_total_amount || i.total_amount || 0), 0
      );
      const pendingRevenue = pendingInvs.reduce(
        (s, i) => s + (i.inr_total_amount || i.total_amount || 0), 0
      );
      const totalIssued = allInvoices.reduce(
        (s, i) => s + (i.inr_total_amount || i.total_amount || 0), 0
      );
      const collectionRate = totalIssued > 0 ? Math.round((collectedRevenue / totalIssued) * 100) : 0;

      // Subscriptions
      const filters = companyId ? { company_settings_id: companyId } : undefined;
      const subscriptions = await subscriptionService.getSubscriptions(filters);
      const activeSubs = subscriptions.filter((s) => s.status === 'active');
      const mrr = activeSubs
        .filter((s) => s.plan?.billing_interval === 'monthly')
        .reduce((sum, s) => sum + (s.plan?.price || 0), 0);
      const arr =
        mrr * 12 +
        activeSubs
          .filter((s) => ['yearly', 'annual'].includes(s.plan?.billing_interval || ''))
          .reduce((sum, s) => sum + (s.plan?.price || 0), 0);

      setStats({
        totalCustomers: custTotal || 0,
        activeCustomers: custActive || 0,
        totalLeads: allLeads.length,
        leadConversionRate: allLeads.length > 0 ? Math.round((convertedLeads / allLeads.length) * 100) : 0,
        totalOpportunities: allOpps.length,
        pipelineValue,
        openPipelineValue: openPipeline,
        winRate,
        totalQuotes: allQuotes.length,
        quoteAcceptanceRate: acceptanceRate,
        totalInvoices: invCount || allInvoices.length,
        collectedRevenue,
        pendingRevenue,
        collectionRate,
        totalSubscriptions: subscriptions.length,
        activeSubscriptions: activeSubs.length,
        mrr,
        arr,
      });
    } catch (err) {
      console.error('ReportingHub fetchStats error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const moduleCards: ModuleCard[] = stats
    ? [
        {
          id: 'customers',
          title: 'Customers',
          description: 'Acquisition trends, revenue by customer, segmentation',
          route: '/admin/reporting/customers',
          icon: <Users className="w-6 h-6" />,
          gradient: 'from-blue-500 to-blue-600',
          primaryMetric: { label: 'Total Customers', value: stats.totalCustomers },
          secondaryMetric: {
            label: 'Active Rate',
            value: `${Math.round((stats.activeCustomers / Math.max(stats.totalCustomers, 1)) * 100)}%`,
          },
          trend: 'up',
        },
        {
          id: 'leads',
          title: 'Lead Analytics',
          description: 'Lead funnel, source breakdown, conversion rate, stale leads',
          route: '/admin/reporting/leads',
          icon: <Target className="w-6 h-6" />,
          gradient: 'from-purple-500 to-purple-600',
          primaryMetric: { label: 'Total Leads', value: stats.totalLeads },
          secondaryMetric: {
            label: 'Conversion Rate',
            value: `${stats.leadConversionRate}%`,
          },
          trend: stats.leadConversionRate >= 20 ? 'up' : 'neutral',
        },
        {
          id: 'opportunities',
          title: 'Opportunities',
          description: 'Pipeline stages, weighted value, win rate, deal velocity',
          route: '/admin/reporting/opportunities',
          icon: <Briefcase className="w-6 h-6" />,
          gradient: 'from-indigo-500 to-indigo-600',
          primaryMetric: { label: 'Open Pipeline', value: formatCurrency(stats.openPipelineValue) },
          secondaryMetric: {
            label: 'Win Rate',
            value: `${stats.winRate}%`,
          },
          trend: stats.winRate >= 30 ? 'up' : 'neutral',
        },
        {
          id: 'quotes',
          title: 'Quotes',
          description: 'Acceptance rate, expiry risk, monthly trends, top customers',
          route: '/admin/reporting/quotes',
          icon: <FileText className="w-6 h-6" />,
          gradient: 'from-yellow-500 to-orange-500',
          primaryMetric: { label: 'Total Quotes', value: stats.totalQuotes },
          secondaryMetric: {
            label: 'Acceptance Rate',
            value: `${stats.quoteAcceptanceRate}%`,
          },
          trend: stats.quoteAcceptanceRate >= 50 ? 'up' : 'neutral',
        },
        {
          id: 'invoices',
          title: 'Invoices',
          description: 'Revenue collected, DSO, aging buckets, collection rate',
          route: '/admin/reporting/invoices',
          icon: <Receipt className="w-6 h-6" />,
          gradient: 'from-green-500 to-emerald-600',
          primaryMetric: { label: 'Collected Revenue', value: formatCurrency(stats.collectedRevenue) },
          secondaryMetric: {
            label: 'Collection Rate',
            value: `${stats.collectionRate}%`,
          },
          trend: stats.collectionRate >= 80 ? 'up' : 'down',
        },
        {
          id: 'subscriptions',
          title: 'Subscriptions',
          description: 'MRR, ARR, churn rate, plan distribution, renewals',
          route: '/admin/reporting/subscriptions',
          icon: <CreditCard className="w-6 h-6" />,
          gradient: 'from-teal-500 to-cyan-600',
          primaryMetric: { label: 'MRR', value: formatCurrency(stats.mrr) },
          secondaryMetric: {
            label: 'Active Subscriptions',
            value: stats.activeSubscriptions,
          },
          trend: 'up',
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Reporting Hub</h2>
          </div>
          <p className="text-sm text-gray-500">
            Enterprise analytics dashboard —{' '}
            <span className="font-medium text-gray-700">
              {selectedCompany ? selectedCompany.company_name : 'All Entities'}
            </span>
          </p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Cross-Module Executive KPIs */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-5">
          <Activity className="w-4 h-4 text-indigo-200" />
          <h3 className="text-sm font-semibold text-indigo-100 uppercase tracking-wider">
            Executive Summary
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            {
              label: 'Total Revenue',
              value: loading ? '—' : formatCurrency(stats?.collectedRevenue ?? 0),
              icon: <DollarSign className="w-4 h-4" />,
            },
            {
              label: 'MRR',
              value: loading ? '—' : formatCurrency(stats?.mrr ?? 0),
              icon: <TrendingUp className="w-4 h-4" />,
            },
            {
              label: 'Total Customers',
              value: loading ? '—' : stats?.totalCustomers ?? 0,
              icon: <Users className="w-4 h-4" />,
            },
            {
              label: 'Pipeline Value',
              value: loading ? '—' : formatCurrency(stats?.pipelineValue ?? 0),
              icon: <Briefcase className="w-4 h-4" />,
            },
            {
              label: 'Lead Conversion',
              value: loading ? '—' : `${stats?.leadConversionRate ?? 0}%`,
              icon: <Target className="w-4 h-4" />,
            },
            {
              label: 'Collection Rate',
              value: loading ? '—' : `${stats?.collectionRate ?? 0}%`,
              icon: <Receipt className="w-4 h-4" />,
            },
          ].map((kpi) => (
            <div key={kpi.label} className="text-center">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                {kpi.icon}
              </div>
              <p className="text-xl font-bold tabular-nums">{kpi.value}</p>
              <p className="text-xs text-indigo-200 mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Module Cards Grid */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Module Reports
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-full" />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="h-10 bg-gray-100 rounded" />
                    <div className="h-10 bg-gray-100 rounded" />
                  </div>
                </div>
              ))
            : moduleCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => navigate(card.route)}
                  className="text-left bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-indigo-200 transition-all duration-200 group"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200`}
                    >
                      {card.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-gray-900">{card.title}</h4>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all duration-200" />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-xs text-gray-400 truncate">{card.primaryMetric.label}</p>
                      <p className="text-base font-bold text-gray-900 tabular-nums mt-0.5">
                        {card.primaryMetric.value}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-xs text-gray-400 truncate">{card.secondaryMetric.label}</p>
                      <p
                        className={`text-base font-bold mt-0.5 tabular-nums ${
                          card.trend === 'up'
                            ? 'text-green-600'
                            : card.trend === 'down'
                            ? 'text-red-600'
                            : 'text-gray-900'
                        }`}
                      >
                        {card.secondaryMetric.value}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
        </div>
      </div>

      {/* Quick Pipeline View */}
      {!loading && stats && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-5">
            Business Health Scorecard
          </h3>
          <div className="space-y-4">
            {[
              {
                label: 'Lead Conversion Rate',
                value: stats.leadConversionRate,
                target: 25,
                color: stats.leadConversionRate >= 25 ? 'bg-green-500' : 'bg-yellow-400',
                display: `${stats.leadConversionRate}%`,
              },
              {
                label: 'Quote Acceptance Rate',
                value: stats.quoteAcceptanceRate,
                target: 50,
                color: stats.quoteAcceptanceRate >= 50 ? 'bg-green-500' : 'bg-yellow-400',
                display: `${stats.quoteAcceptanceRate}%`,
              },
              {
                label: 'Invoice Collection Rate',
                value: stats.collectionRate,
                target: 80,
                color: stats.collectionRate >= 80 ? 'bg-green-500' : 'bg-red-400',
                display: `${stats.collectionRate}%`,
              },
              {
                label: 'Opportunity Win Rate',
                value: stats.winRate,
                target: 30,
                color: stats.winRate >= 30 ? 'bg-green-500' : 'bg-yellow-400',
                display: `${stats.winRate}%`,
              },
              {
                label: 'Subscription Active Rate',
                value:
                  stats.totalSubscriptions > 0
                    ? Math.round((stats.activeSubscriptions / stats.totalSubscriptions) * 100)
                    : 0,
                target: 85,
                color:
                  stats.totalSubscriptions > 0 &&
                  (stats.activeSubscriptions / stats.totalSubscriptions) * 100 >= 85
                    ? 'bg-green-500'
                    : 'bg-yellow-400',
                display:
                  stats.totalSubscriptions > 0
                    ? `${Math.round((stats.activeSubscriptions / stats.totalSubscriptions) * 100)}%`
                    : '—',
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-600 w-52 flex-shrink-0">
                  {item.label}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`${item.color} h-3 rounded-full transition-all duration-700`}
                    style={{ width: `${Math.min(item.value, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-900 w-12 text-right tabular-nums">
                  {item.display}
                </span>
                <span className="text-xs text-gray-400 w-16 text-right">
                  target: {item.target}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportingHub;
