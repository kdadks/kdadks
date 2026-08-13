import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { useCompanyContext } from '../../../contexts/CompanyContext';
import ReportingCard from './ReportingCard';
import SimpleBarChart from './SimpleBarChart';

const QuoteReporting: React.FC = () => {
  const { selectedCompany } = useCompanyContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    draft: number;
    sent: number;
    accepted: number;
    rejected: number;
    expired: number;
    converted: number;
    acceptanceRate: number;
    conversionRate: number;
    totalAmount: number;
    monthlyData: { label: string; value: number }[];
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
        .from('quotes')
        .select('status, total_amount, inr_total_amount, quote_date, created_at', { count: 'exact' });

      if (companyId) {
        query = query.eq('company_settings_id', companyId);
      }

      const { data: quotes, error: quotesError, count } = await query;

      if (quotesError) throw quotesError;

      const allQuotes = quotes || [];
      const total = count || allQuotes.length;
      const draft = allQuotes.filter((q) => q.status === 'draft').length;
      const sent = allQuotes.filter((q) => q.status === 'sent').length;
      const accepted = allQuotes.filter((q) => q.status === 'accepted').length;
      const rejected = allQuotes.filter((q) => q.status === 'rejected').length;
      const expired = allQuotes.filter((q) => q.status === 'expired').length;
      const converted = allQuotes.filter((q) => q.status === 'converted').length;
      const totalAmount = allQuotes.reduce((sum, q) => sum + (q.inr_total_amount || q.total_amount || 0), 0);

      const months: { label: string; value: number }[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-31`;
        let monthQuery = supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .gte('quote_date', start)
          .lte('quote_date', end);
        if (companyId) {
          monthQuery = monthQuery.eq('company_settings_id', companyId);
        }
        const { count: monthCount } = await monthQuery;
        months.push({ label, value: monthCount || 0 });
      }

      setStats({
        total,
        draft,
        sent,
        accepted,
        rejected,
        expired,
        converted,
        acceptanceRate: sent + accepted > 0 ? Math.round((accepted / (sent + accepted)) * 100) : 0,
        conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
        totalAmount,
        monthlyData: months,
      });
    } catch (err) {
      console.error('QuoteReporting fetchStats error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch quote stats');
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

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value}`;
  };

  const statusData = [
    { label: 'Draft', value: stats.draft, color: 'bg-gray-400' },
    { label: 'Sent', value: stats.sent, color: 'bg-blue-400' },
    { label: 'Accepted', value: stats.accepted, color: 'bg-green-500' },
    { label: 'Rejected', value: stats.rejected, color: 'bg-red-500' },
    { label: 'Expired', value: stats.expired, color: 'bg-orange-400' },
    { label: 'Converted', value: stats.converted, color: 'bg-teal-500' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Quote Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportingCard
          title="Total Quotes"
          value={stats.total}
          icon={<FileText className="w-6 h-6" />}
          color="blue"
        />
        <ReportingCard
          title="Accepted Quotes"
          value={stats.accepted}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
        />
        <ReportingCard
          title="Converted"
          value={stats.converted}
          icon={<TrendingUp className="w-6 h-6" />}
          color="teal"
        />
        <ReportingCard
          title="Total Quoted Amount"
          value={formatCurrency(stats.totalAmount)}
          icon={<BarChart3 className="w-6 h-6" />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReportingCard
          title="Acceptance Rate"
          value={`${stats.acceptanceRate}%`}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
        />
        <ReportingCard
          title="Conversion Rate"
          value={`${stats.conversionRate.toFixed(1)}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="blue"
        />
        <ReportingCard
          title="Pending Quotes"
          value={stats.draft + stats.sent}
          icon={<Clock className="w-6 h-6" />}
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quote Status Breakdown</h3>
          <SimpleBarChart
            data={statusData.map((d) => ({ ...d, color: d.color }))}
            height={200}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Quote Trend</h3>
          <SimpleBarChart
            data={stats.monthlyData.map((d) => ({ ...d, color: 'bg-indigo-500' }))}
            height={200}
          />
        </div>
      </div>
    </div>
  );
};

export default QuoteReporting;
