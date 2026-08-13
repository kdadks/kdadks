import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  DollarSign,
  CheckCircle,
  XCircle,
  TrendingUp,
  Target,
  BarChart3,
} from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { useCompanyContext } from '../../../contexts/CompanyContext';
import ReportingCard from './ReportingCard';
import SimpleBarChart from './SimpleBarChart';

const OpportunityReporting: React.FC = () => {
  const { selectedCompany } = useCompanyContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    prospecting: number;
    qualification: number;
    proposal: number;
    negotiation: number;
    closedWon: number;
    closedLost: number;
    pipelineValue: number;
    openPipelineValue: number;
    winRate: number;
  } | null>(null);

  const companyId = selectedCompany?.id ?? null;

  useEffect(() => {
    fetchStats();
  }, [companyId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('opportunities')
        .select('stage, estimated_value, created_at', { count: 'exact' });

      if (companyId) {
        query = query.eq('company_settings_id', companyId);
      }

      const { data: opportunities, error: oppsError, count } = await query;

      if (oppsError) throw oppsError;

      const allOpps = opportunities || [];
      const won = allOpps.filter((o) => o.stage === 'closed_won').length;
      const lost = allOpps.filter((o) => o.stage === 'closed_lost').length;
      const totalClosed = won + lost;
      const pipelineValue = allOpps.reduce((sum, o) => sum + (o.estimated_value || 0), 0);
      const openPipelineValue = allOpps
        .filter((o) => !['closed_won', 'closed_lost'].includes(o.stage))
        .reduce((sum, o) => sum + (o.estimated_value || 0), 0);

      setStats({
        total: count || allOpps.length,
        prospecting: allOpps.filter((o) => o.stage === 'prospecting').length,
        qualification: allOpps.filter((o) => o.stage === 'qualification').length,
        proposal: allOpps.filter((o) => o.stage === 'proposal').length,
        negotiation: allOpps.filter((o) => o.stage === 'negotiation').length,
        closedWon: won,
        closedLost: lost,
        pipelineValue,
        openPipelineValue,
        winRate: totalClosed > 0 ? Math.round((won / totalClosed) * 100) : 0,
      });
    } catch (err) {
      console.error('OpportunityReporting fetchStats error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch opportunity stats');
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

  const stageData = [
    { label: 'Prospecting', value: stats.prospecting, color: 'bg-gray-400' },
    { label: 'Qualification', value: stats.qualification, color: 'bg-blue-400' },
    { label: 'Proposal', value: stats.proposal, color: 'bg-yellow-400' },
    { label: 'Negotiation', value: stats.negotiation, color: 'bg-orange-400' },
    { label: 'Closed Won', value: stats.closedWon, color: 'bg-green-500' },
    { label: 'Closed Lost', value: stats.closedLost, color: 'bg-red-500' },
  ];

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Opportunity Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportingCard
          title="Total Opportunities"
          value={stats.total}
          icon={<Briefcase className="w-6 h-6" />}
          color="blue"
        />
        <ReportingCard
          title="Pipeline Value"
          value={formatCurrency(stats.pipelineValue)}
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
        />
        <ReportingCard
          title="Open Pipeline"
          value={formatCurrency(stats.openPipelineValue)}
          icon={<TrendingUp className="w-6 h-6" />}
          color="purple"
        />
        <ReportingCard
          title="Win Rate"
          value={`${stats.winRate}%`}
          icon={<Target className="w-6 h-6" />}
          color="teal"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Stage Breakdown</h3>
          <SimpleBarChart
            data={stageData.map((d) => ({ ...d, color: d.color }))}
            height={200}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Win/Loss Ratio</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700 flex-1">Closed Won</span>
              <span className="text-sm font-bold text-gray-900">{stats.closedWon}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(stats.closedWon / Math.max(stats.total, 1)) * 100}%` }}
              />
            </div>
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-gray-700 flex-1">Closed Lost</span>
              <span className="text-sm font-bold text-gray-900">{stats.closedLost}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-red-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(stats.closedLost / Math.max(stats.total, 1)) * 100}%` }}
              />
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">Win Rate</span>
                <span className="font-bold text-gray-900">{stats.winRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReportingCard
          title="Prospecting"
          value={stats.prospecting}
          icon={<Target className="w-6 h-6" />}
          color="blue"
        />
        <ReportingCard
          title="In Negotiation"
          value={stats.negotiation}
          icon={<BarChart3 className="w-6 h-6" />}
          color="red"
        />
        <ReportingCard
          title="Closed Won"
          value={stats.closedWon}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
        />
      </div>
    </div>
  );
};

export default OpportunityReporting;
