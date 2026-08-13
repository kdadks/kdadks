import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  CheckCircle,
  XCircle,
  Target,
  TrendingUp,
  Globe,
  UserCheck,
  Share2,
} from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { useCompanyContext } from '../../../contexts/CompanyContext';
import ReportingCard from './ReportingCard';
import SimpleBarChart from './SimpleBarChart';

interface Lead {
  id: string;
  status: string;
  source: string;
  created_at: string;
}

const LeadReporting: React.FC = () => {
  const { selectedCompany } = useCompanyContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    new: number;
    qualified: number;
    converted: number;
    disqualified: number;
    website: number;
    referral: number;
    campaign: number;
    conversionRate: number;
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
        .from('leads')
        .select('status, source, created_at')
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_settings_id', companyId);
      }

      const { data: leads, error: leadsError } = await query;

      if (leadsError) throw leadsError;

      const allLeads = leads || [];
      const total = allLeads.length;
      const newLeads = allLeads.filter((l) => l.status === 'new').length;
      const qualified = allLeads.filter((l) => l.status === 'qualified').length;
      const converted = allLeads.filter((l) => l.status === 'converted').length;
      const disqualified = allLeads.filter((l) => l.status === 'disqualified').length;
      const website = allLeads.filter((l) => l.source === 'website').length;
      const referral = allLeads.filter((l) => l.source === 'referral').length;
      const campaign = allLeads.filter((l) => l.source === 'campaign').length;

      setStats({
        total,
        new: newLeads,
        qualified,
        converted,
        disqualified,
        website,
        referral,
        campaign,
        conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lead stats');
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

  const sourceData = [
    { label: 'Website', value: stats.website, color: 'bg-blue-500' },
    { label: 'Referral', value: stats.referral, color: 'bg-green-500' },
    { label: 'Campaign', value: stats.campaign, color: 'bg-purple-500' },
  ].filter((d) => d.value > 0);

  const funnelData = [
    { label: 'New', value: stats.new, color: 'bg-gray-400' },
    { label: 'Qualified', value: stats.qualified, color: 'bg-yellow-500' },
    { label: 'Converted', value: stats.converted, color: 'bg-green-500' },
    { label: 'Disqualified', value: stats.disqualified, color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Lead Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportingCard
          title="Total Leads"
          value={stats.total}
          icon={<Users className="w-6 h-6" />}
          color="blue"
        />
        <ReportingCard
          title="New Leads"
          value={stats.new}
          icon={<UserPlus className="w-6 h-6" />}
          color="purple"
        />
        <ReportingCard
          title="Qualified Leads"
          value={stats.qualified}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
        />
        <ReportingCard
          title="Converted Leads"
          value={stats.converted}
          icon={<Target className="w-6 h-6" />}
          color="teal"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Source Breakdown</h3>
          <SimpleBarChart
            data={sourceData.map((d) => ({ ...d, color: d.color }))}
            height={180}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Status Funnel</h3>
          <div className="space-y-3">
            {funnelData.map((item) => {
              const percentage = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-24">{item.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className={`${item.color} h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500`}
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    >
                      <span className="text-xs font-bold text-white">{item.value}</span>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 w-12 text-right">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReportingCard
          title="Conversion Rate"
          value={`${stats.conversionRate}%`}
          trend={stats.conversionRate >= 20 ? 'up' : 'neutral'}
          icon={<TrendingUp className="w-6 h-6" />}
          color="green"
        />
        <ReportingCard
          title="Disqualified Leads"
          value={stats.disqualified}
          icon={<XCircle className="w-6 h-6" />}
          color="red"
        />
        <ReportingCard
          title="Website Leads"
          value={stats.website}
          icon={<Globe className="w-6 h-6" />}
          color="blue"
        />
      </div>
    </div>
  );
};

export default LeadReporting;
