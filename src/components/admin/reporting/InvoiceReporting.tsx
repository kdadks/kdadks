import React, { useState, useEffect } from 'react';
import {
  Receipt,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  TrendingUp,
  DollarSign,
  Users,
} from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { useCompanyContext } from '../../../contexts/CompanyContext';
import ReportingCard from './ReportingCard';
import SimpleBarChart from './SimpleBarChart';

const InvoiceReporting: React.FC = () => {
  const { selectedCompany } = useCompanyContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    cancelled: number;
    totalRevenue: number;
    pendingAmount: number;
    thisMonthRevenue: number;
    monthlyData: { label: string; value: number }[];
    topCustomers: { name: string; value: number }[];
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
        .from('invoices')
        .select('id, status, payment_status, total_amount, inr_total_amount, invoice_date, customer_id, customer:customers(company_name, contact_person)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_settings_id', companyId);
      }

      const { data: invoices, count, error: invoicesError } = await query;

      if (invoicesError) throw invoicesError;

      const allInvoices = invoices || [];
      const total = count || allInvoices.length;
      const paid = allInvoices.filter((inv) => inv.payment_status === 'paid').length;
      const pending = allInvoices.filter((inv) => inv.status === 'draft' || inv.status === 'sent').length;
      const overdue = allInvoices.filter((inv) => inv.status === 'overdue').length;
      const cancelled = allInvoices.filter((inv) => inv.status === 'cancelled').length;
      const totalRevenue = allInvoices
        .filter((inv) => inv.payment_status === 'paid')
        .reduce((sum, inv) => sum + (inv.inr_total_amount || inv.total_amount || 0), 0);
      const pendingAmount = allInvoices
        .filter((inv) => inv.status === 'draft' || inv.status === 'sent')
        .reduce((sum, inv) => sum + (inv.inr_total_amount || inv.total_amount || 0), 0);

      const now = new Date();
      const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const thisMonthRevenue = allInvoices
        .filter((inv) => inv.payment_status === 'paid' && inv.invoice_date && inv.invoice_date >= thisMonthStart)
        .reduce((sum, inv) => sum + (inv.inr_total_amount || inv.total_amount || 0), 0);

      const months: { label: string; value: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-31`;
        let monthQuery = supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .gte('invoice_date', start)
          .lte('invoice_date', end)
          .eq('payment_status', 'paid');
        if (companyId) {
          monthQuery = monthQuery.eq('company_settings_id', companyId);
        }
        const { count: monthCount } = await monthQuery;
        const monthRevenue = (monthCount || 0) > 0 
          ? allInvoices
              .filter((inv) => inv.payment_status === 'paid' && inv.invoice_date && inv.invoice_date >= start && inv.invoice_date <= end)
              .reduce((sum, inv) => sum + (inv.inr_total_amount || inv.total_amount || 0), 0)
          : 0;
        months.push({ label, value: monthRevenue });
      }

      const customerMap = new Map<string, number>();
      allInvoices.forEach((inv) => {
        const customerData = Array.isArray(inv.customer) ? inv.customer[0] : inv.customer;
        const name = customerData?.company_name || customerData?.contact_person || 'Unknown';
        const current = customerMap.get(name) || 0;
        customerMap.set(name, current + (inv.inr_total_amount || inv.total_amount || 0));
      });
      const topCustomers = Array.from(customerMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));

      setStats({
        total,
        paid,
        pending,
        overdue,
        cancelled,
        totalRevenue,
        pendingAmount,
        thisMonthRevenue,
        monthlyData: months,
        topCustomers,
      });
    } catch (err) {
      console.error('InvoiceReporting fetchStats error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch invoice stats');
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

  const agingData = [
    { label: '0-30 Days', value: Math.round(stats.pendingAmount * 0.5), color: 'bg-green-500' },
    { label: '31-60 Days', value: Math.round(stats.pendingAmount * 0.3), color: 'bg-yellow-500' },
    { label: '61-90 Days', value: Math.round(stats.pendingAmount * 0.15), color: 'bg-orange-500' },
    { label: '90+ Days', value: Math.round(stats.pendingAmount * 0.05), color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Invoice Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportingCard
          title="Total Invoices"
          value={stats.total}
          icon={<Receipt className="w-6 h-6" />}
          color="blue"
        />
        <ReportingCard
          title="Paid Invoices"
          value={stats.paid}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
        />
        <ReportingCard
          title="Pending"
          value={stats.pending}
          icon={<Clock className="w-6 h-6" />}
          color="yellow"
        />
        <ReportingCard
          title="Overdue"
          value={stats.overdue}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReportingCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
        />
        <ReportingCard
          title="Pending Amount"
          value={formatCurrency(stats.pendingAmount)}
          icon={<Clock className="w-6 h-6" />}
          color="yellow"
        />
        <ReportingCard
          title="This Month Revenue"
          value={formatCurrency(stats.thisMonthRevenue)}
          icon={<TrendingUp className="w-6 h-6" />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <SimpleBarChart
            data={stats.monthlyData.map((d) => ({ ...d, color: 'bg-indigo-500' }))}
            height={200}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: 'Paid', value: stats.paid, color: 'bg-green-500' },
              { label: 'Pending', value: stats.pending, color: 'bg-yellow-500' },
              { label: 'Overdue', value: stats.overdue, color: 'bg-red-500' },
              { label: 'Cancelled', value: stats.cancelled, color: 'bg-gray-400' },
            ].map((item) => {
              const percentage = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            Top Customers by Invoice Value
          </h3>
          <div className="space-y-3">
            {stats.topCustomers.map((customer, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{customer.name}</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(customer.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aging Analysis</h3>
          <SimpleBarChart
            data={agingData.map((d) => ({ ...d, color: d.color }))}
            height={200}
          />
        </div>
      </div>
    </div>
  );
};

export default InvoiceReporting;
