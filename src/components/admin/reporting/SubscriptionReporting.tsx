import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Package,
  Calendar,
} from 'lucide-react';
import { subscriptionService } from '../../../services/subscriptionService';
import { useCompanyContext } from '../../../contexts/CompanyContext';
import ReportingCard from './ReportingCard';
import SimpleBarChart from './SimpleBarChart';

interface SubscriptionReportingData {
  total: number;
  active: number;
  paused: number;
  cancelled: number;
  expired: number;
  monthlyRevenue: number;
  planDistribution: { label: string; value: number }[];
  expiringSoon: { id: string; customer?: string; plan?: string; end_date?: string }[];
}

const SubscriptionReporting: React.FC = () => {
  const { selectedCompany } = useCompanyContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SubscriptionReportingData | null>(null);

  const companyId = selectedCompany?.id ?? null;

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = companyId ? { company_settings_id: companyId } : undefined;
      const [subscriptions, plans] = await Promise.all([
        subscriptionService.getSubscriptions(filters),
        subscriptionService.getPlans(true),
      ]);

      const active = subscriptions.filter((s) => s.status === 'active').length;
      const paused = subscriptions.filter((s) => s.status === 'paused').length;
      const cancelled = subscriptions.filter((s) => s.status === 'cancelled').length;
      const expired = subscriptions.filter((s) => s.status === 'expired').length;

      const planMap = new Map<string, number>();
      subscriptions.forEach((s) => {
        const planName = s.plan?.name || 'Unknown';
        planMap.set(planName, (planMap.get(planName) || 0) + 1);
      });

      const monthlyRevenue = subscriptions
        .filter((s) => s.status === 'active' && s.plan?.billing_interval === 'monthly')
        .reduce((sum, s) => sum + (s.plan?.price || 0), 0);

      const expiring = subscriptionService.getExpiringSoon(subscriptions, 30);

      const planDistribution = Array.from(planMap.entries()).map(([label, value]) => ({
        label,
        value,
      }));

      setData({
        total: subscriptions.length,
        active,
        paused,
        cancelled,
        expired,
        monthlyRevenue,
        planDistribution,
        expiringSoon: expiring.map((e) => ({
          id: e.id,
          customer: e.customer?.company_name || e.customer?.contact_person,
          plan: e.plan?.name,
          end_date: e.end_date,
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription data');
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

  if (!data) return null;

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Subscription Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <ReportingCard
          title="Total Subscriptions"
          value={data.total}
          icon={<CreditCard className="w-6 h-6" />}
          color="blue"
        />
        <ReportingCard
          title="Active"
          value={data.active}
          trend="up"
          trendValue={`${Math.round((data.active / Math.max(data.total, 1)) * 100)}%`}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
        />
        <ReportingCard
          title="Paused"
          value={data.paused}
          icon={<XCircle className="w-6 h-6" />}
          color="yellow"
        />
        <ReportingCard
          title="Cancelled"
          value={data.cancelled}
          icon={<XCircle className="w-6 h-6" />}
          color="red"
        />
        <ReportingCard
          title="MRR Estimate"
          value={formatCurrency(data.monthlyRevenue)}
          icon={<TrendingUp className="w-6 h-6" />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Distribution</h3>
          <SimpleBarChart
            data={data.planDistribution.map((d) => ({
              ...d,
              color: 'bg-indigo-500',
            }))}
            height={200}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: 'Active', value: data.active, color: 'bg-green-500' },
              { label: 'Paused', value: data.paused, color: 'bg-yellow-500' },
              { label: 'Cancelled', value: data.cancelled, color: 'bg-red-500' },
              { label: 'Expired', value: data.expired, color: 'bg-gray-400' },
            ].map((item) => {
              const percentage = data.total > 0 ? (item.value / data.total) * 100 : 0;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-24">{item.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className={`${item.color} h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500`}
                      style={{ width: `${Math.max(percentage, 3)}%` }}
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

      {data.expiringSoon.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Expiring Soon (Next 30 Days)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Customer</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Plan</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">End Date</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Days Left</th>
                </tr>
              </thead>
              <tbody>
                {data.expiringSoon.map((item) => {
                  const end = item.end_date ? new Date(item.end_date) : null;
                  const daysLeft = end
                    ? Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 px-3">{item.customer || 'N/A'}</td>
                      <td className="py-2 px-3">{item.plan || 'N/A'}</td>
                      <td className="py-2 px-3">
                        {end ? end.toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-2 px-3">
                        {daysLeft !== null ? (
                          <span
                            className={`font-medium ${
                              daysLeft <= 7
                                ? 'text-red-600'
                                : daysLeft <= 14
                                ? 'text-yellow-600'
                                : 'text-gray-600'
                            }`}
                          >
                            {daysLeft} days
                          </span>
                        ) : (
                          'N/A'
                        )}
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
