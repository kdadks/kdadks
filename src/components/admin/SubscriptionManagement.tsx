import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Package,
  Users,
  Calendar,
  ChevronDown,
  CheckCircle,
  XCircle,
  PauseCircle,
  AlertCircle,
  Receipt,
  Bell,
  X,
} from 'lucide-react';
import { supabase } from '../../config/supabase';
import { subscriptionService } from '../../services/subscriptionService';
import { invoiceService } from '../../services/invoiceService';
import { useToast } from '../ui/ToastProvider';
import type {
  SubscriptionPlan,
  CustomerSubscription,
  CreateSubscriptionPlanData,
  CreateCustomerSubscriptionData,
} from '../../types/subscription';
import type { Customer } from '../../types/invoice';

type ActiveTab = 'plans' | 'subscriptions';

const PLAN_TYPES = ['basic', 'premium', 'tiered', 'add-on'] as const;
const CURRENCIES = ['INR', 'USD', 'GBP', 'EUR', 'AUD', 'SGD', 'AED'];

const statusIcon = (status: CustomerSubscription['status']) => {
  switch (status) {
    case 'active':   return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'paused':   return <PauseCircle className="w-4 h-4 text-yellow-500" />;
    case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
    case 'expired':  return <AlertCircle className="w-4 h-4 text-gray-400" />;
  }
};

const statusBadge = (status: CustomerSubscription['status']) => {
  const map = {
    active:    'bg-green-100 text-green-800',
    paused:    'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
    expired:   'bg-gray-100 text-gray-600',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
};

const emptyPlanForm = (): CreateSubscriptionPlanData => ({
  name: '',
  description: '',
  price: 0,
  currency_code: 'INR',
  billing_interval: 'monthly',
  plan_type: 'basic',
});

const emptySubForm = (): CreateCustomerSubscriptionData => ({
  customer_id: '',
  plan_id: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  notes: '',
});

interface EditSubForm {
  plan_id: string;
  end_date: string;
  notes: string;
  next_billing_date: string;
}

// ── Fixed-position portal dropdown (escapes overflow-hidden) ─────────────────
interface DropdownPos { top: number; right: number }

const ActionMenu: React.FC<{
  sub: CustomerSubscription;
  onStatusChange: (sub: CustomerSubscription, status: CustomerSubscription['status']) => void;
  onEdit: (sub: CustomerSubscription) => void;
}> = ({ sub, onStatusChange, onEdit }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<DropdownPos>({ top: 0, right: 0 });

  const openMenu = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen(true);
  };

  const allOptions: { label: string; status: CustomerSubscription['status'] }[] = [
    { label: 'Set Active',   status: 'active' },
    { label: 'Pause',        status: 'paused' },
    { label: 'Cancel',       status: 'cancelled' },
    { label: 'Mark Expired', status: 'expired' },
  ];
  const statusOptions = allOptions.filter(o => o.status !== sub.status);

  return (
    <div className="inline-block">
      <button
        ref={btnRef}
        onClick={openMenu}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
      >
        Actions <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* menu — fixed so it escapes overflow-hidden on the table wrapper */}
          <div
            style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 50 }}
            className="w-40 bg-white rounded-lg shadow-xl border border-gray-200 py-1"
          >
            <button
              onClick={() => { setOpen(false); onEdit(sub); }}
              className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
            >
              <Edit className="w-3 h-3" /> Edit
            </button>
            <div className="border-t border-gray-100 my-1" />
            {statusOptions.map(o => (
              <button
                key={o.status}
                onClick={() => { setOpen(false); onStatusChange(sub, o.status); }}
                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── Expiry warning banner ────────────────────────────────────────────────────
const ExpiryBanner: React.FC<{ expiring: CustomerSubscription[]; onDismiss: () => void }> = ({
  expiring,
  onDismiss,
}) => {
  if (expiring.length === 0) return null;
  return (
    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {expiring.length} subscription{expiring.length > 1 ? 's' : ''} expiring within 30 days
            </p>
            <ul className="mt-1 space-y-0.5">
              {expiring.map(s => {
                const daysLeft = Math.ceil(
                  (new Date(s.end_date!).getTime() - Date.now()) / 86_400_000,
                );
                return (
                  <li key={s.id} className="text-xs text-amber-700">
                    <strong>{s.customer?.company_name || s.customer?.contact_person}</strong>
                    {' — '}{s.plan?.name}
                    {' — expires in '}<strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>
                    {' ('}{new Date(s.end_date!).toLocaleDateString()}{')'}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <button onClick={onDismiss} className="text-amber-500 hover:text-amber-700 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────
interface SubscriptionManagementProps {
  onBackToDashboard?: () => void;
}

const SubscriptionManagement: React.FC<SubscriptionManagementProps> = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('plans');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Plan form
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState<CreateSubscriptionPlanData>(emptyPlanForm());
  const [planSaving, setPlanSaving] = useState(false);

  // Create subscription form
  const [showSubModal, setShowSubModal] = useState(false);
  const [subForm, setSubForm] = useState<CreateCustomerSubscriptionData>(emptySubForm());
  const [subSaving, setSubSaving] = useState(false);

  // Edit subscription form
  const [showEditSubModal, setShowEditSubModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<CustomerSubscription | null>(null);
  const [editSubForm, setEditSubForm] = useState<EditSubForm>({
    plan_id: '', end_date: '', notes: '', next_billing_date: '',
  });
  const [editSubSaving, setEditSubSaving] = useState(false);

  // Filter & expiry banner
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [expiryDismissed, setExpiryDismissed] = useState(false);

  const { showSuccess, showError } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansData, subsData, customersResult] = await Promise.all([
        subscriptionService.getPlans(true),
        subscriptionService.getSubscriptions(
          statusFilter !== 'all'
            ? { status: statusFilter as CustomerSubscription['status'] }
            : undefined,
        ),
        invoiceService.getCustomers(undefined, 1, 500),
      ]);
      setPlans(plansData);
      setSubscriptions(subsData);
      setCustomers(customersResult.data);
      setExpiryDismissed(false);
    } catch {
      showError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // Expiry warning: active subs with end_date within 30 days
  const expiringSoon = expiryDismissed
    ? []
    : subscriptionService.getExpiringSoon(subscriptions);

  // ── Plan handlers ──────────────────────────────────────────────────────────

  const openCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm(emptyPlanForm());
    setShowPlanModal(true);
  };

  const openEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      currency_code: plan.currency_code,
      billing_interval: plan.billing_interval,
      plan_type: plan.plan_type,
    });
    setShowPlanModal(true);
  };

  const savePlan = async () => {
    if (!planForm.name.trim()) { showError('Plan name is required'); return; }
    if (planForm.price <= 0) { showError('Price must be greater than 0'); return; }
    setPlanSaving(true);
    try {
      if (editingPlan) {
        await subscriptionService.updatePlan(editingPlan.id, planForm);
        showSuccess('Plan updated');
      } else {
        await subscriptionService.createPlan(planForm);
        showSuccess('Plan created');
      }
      setShowPlanModal(false);
      loadData();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setPlanSaving(false);
    }
  };

  const deactivatePlan = async (plan: SubscriptionPlan) => {
    if (!confirm(`Deactivate "${plan.name}"? Existing subscriptions are not affected.`)) return;
    try {
      await subscriptionService.deactivatePlan(plan.id);
      showSuccess('Plan deactivated');
      loadData();
    } catch { showError('Failed to deactivate plan'); }
  };

  const reactivatePlan = async (plan: SubscriptionPlan) => {
    try {
      await supabase
        .from('subscription_plans')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', plan.id);
      showSuccess('Plan reactivated');
      loadData();
    } catch { showError('Failed to reactivate plan'); }
  };

  // ── Create subscription handler ────────────────────────────────────────────

  const openCreateSub = () => {
    setSubForm(emptySubForm());
    setShowSubModal(true);
  };

  const saveSub = async () => {
    if (!subForm.customer_id) { showError('Please select a customer'); return; }
    if (!subForm.plan_id) { showError('Please select a plan'); return; }
    if (!subForm.start_date) { showError('Start date is required'); return; }
    setSubSaving(true);
    try {
      await subscriptionService.createSubscription(subForm);
      showSuccess('Subscription created');
      setShowSubModal(false);
      loadData();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create subscription');
    } finally {
      setSubSaving(false);
    }
  };

  // ── Edit subscription handler ──────────────────────────────────────────────

  const openEditSub = (sub: CustomerSubscription) => {
    setEditingSubscription(sub);
    setEditSubForm({
      plan_id: sub.plan_id,
      end_date: sub.end_date || '',
      notes: sub.notes || '',
      next_billing_date: sub.next_billing_date,
    });
    setShowEditSubModal(true);
  };

  const saveEditSub = async () => {
    if (!editingSubscription) return;
    if (!editSubForm.plan_id) { showError('Plan is required'); return; }
    if (!editSubForm.next_billing_date) { showError('Next billing date is required'); return; }
    setEditSubSaving(true);
    try {
      await subscriptionService.updateSubscription(editingSubscription.id, {
        plan_id: editSubForm.plan_id,
        end_date: editSubForm.end_date || null,
        notes: editSubForm.notes,
        next_billing_date: editSubForm.next_billing_date,
      });
      showSuccess('Subscription updated');
      setShowEditSubModal(false);
      loadData();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update subscription');
    } finally {
      setEditSubSaving(false);
    }
  };

  // ── Status change handler ──────────────────────────────────────────────────

  const changeSubStatus = async (sub: CustomerSubscription, status: CustomerSubscription['status']) => {
    const labels: Record<CustomerSubscription['status'], string> = {
      active: 'activate', paused: 'pause', cancelled: 'cancel', expired: 'expire',
    };
    const label = labels[status];
    if (!confirm(
      `${label.charAt(0).toUpperCase() + label.slice(1)} subscription for "${sub.customer?.company_name || sub.customer?.contact_person}"?`,
    )) return;
    try {
      await subscriptionService.updateSubscriptionStatus(sub.id, status);
      showSuccess(`Subscription ${label}d`);
      loadData();
    } catch { showError('Failed to update status'); }
  };

  const activePlanCount = plans.filter(p => p.is_active).length;
  const activeSubCount = subscriptions.filter(s => s.status === 'active').length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage plans and customer subscriptions</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
        <div className="flex gap-6 mt-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Package className="w-4 h-4 text-blue-500" />
            <span><strong className="text-gray-900">{activePlanCount}</strong> active plans</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4 text-green-500" />
            <span><strong className="text-gray-900">{activeSubCount}</strong> active subscriptions</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Receipt className="w-4 h-4 text-purple-500" />
            <span>Draft invoices auto-generated monthly (1st of month)</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex px-6">
          {(['plans', 'subscriptions'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
              {tab === 'subscriptions' && expiringSoon.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs font-bold rounded-full bg-amber-500 text-white">
                  {expiringSoon.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : activeTab === 'plans' ? (
          renderPlans()
        ) : (
          renderSubscriptions()
        )}
      </div>

      {/* ── Plan Modal ──────────────────────────────────────────────────── */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingPlan ? 'Edit Plan' : 'Create Plan'}
              </h2>
              <button onClick={() => setShowPlanModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={planForm.name}
                  onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Starter Monthly"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  value={planForm.description}
                  onChange={e => setPlanForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of what's included"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                  <input
                    type="number" min="0" step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={planForm.price || ''}
                    onChange={e => setPlanForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={planForm.currency_code}
                    onChange={e => setPlanForm(p => ({ ...p, currency_code: e.target.value }))}
                  >
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Interval</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={planForm.billing_interval}
                    onChange={e => setPlanForm(p => ({ ...p, billing_interval: e.target.value as 'monthly' | 'annual' }))}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={planForm.plan_type}
                    onChange={e => setPlanForm(p => ({ ...p, plan_type: e.target.value as CreateSubscriptionPlanData['plan_type'] }))}
                  >
                    {PLAN_TYPES.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowPlanModal(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={savePlan}
                disabled={planSaving}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {planSaving && <RefreshCw className="w-3 h-3 animate-spin" />}
                {editingPlan ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Subscription Modal ───────────────────────────────────── */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Create Subscription</h2>
              <button onClick={() => setShowSubModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={subForm.customer_id}
                  onChange={e => setSubForm(f => ({ ...f, customer_id: e.target.value }))}
                >
                  <option value="">Select customer…</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.company_name || c.contact_person || c.email || c.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan *</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={subForm.plan_id}
                  onChange={e => setSubForm(f => ({ ...f, plan_id: e.target.value }))}
                >
                  <option value="">Select plan…</option>
                  {plans.filter(p => p.is_active).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.currency_code} {p.price.toLocaleString()} / {p.billing_interval}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={subForm.start_date}
                    onChange={e => setSubForm(f => ({ ...f, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={subForm.end_date || ''}
                    onChange={e => setSubForm(f => ({ ...f, end_date: e.target.value || undefined }))}
                  />
                </div>
              </div>
              {subForm.plan_id && subForm.start_date && (() => {
                const plan = plans.find(p => p.id === subForm.plan_id);
                if (!plan) return null;
                const next = subscriptionService.calculateNextBillingDate(subForm.start_date, plan.billing_interval);
                return (
                  <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    First invoice generated on: <strong>{new Date(next).toLocaleDateString()}</strong>
                  </div>
                );
              })()}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  value={subForm.notes || ''}
                  onChange={e => setSubForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowSubModal(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveSub}
                disabled={subSaving}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {subSaving && <RefreshCw className="w-3 h-3 animate-spin" />}
                Create Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Subscription Modal ─────────────────────────────────────── */}
      {showEditSubModal && editingSubscription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Edit Subscription</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingSubscription.customer?.company_name || editingSubscription.customer?.contact_person}
                </p>
              </div>
              <button onClick={() => setShowEditSubModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan *</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editSubForm.plan_id}
                  onChange={e => setEditSubForm(f => ({ ...f, plan_id: e.target.value }))}
                >
                  {plans.filter(p => p.is_active || p.id === editSubForm.plan_id).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.currency_code} {p.price.toLocaleString()} / {p.billing_interval}
                      {!p.is_active ? ' (inactive)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                    <span className="ml-1 text-xs text-gray-400">(leave blank for ongoing)</span>
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editSubForm.end_date}
                    onChange={e => setEditSubForm(f => ({ ...f, end_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Next Billing Date *
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editSubForm.next_billing_date}
                    onChange={e => setEditSubForm(f => ({ ...f, next_billing_date: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  value={editSubForm.notes}
                  onChange={e => setEditSubForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowEditSubModal(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEditSub}
                disabled={editSubSaving}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {editSubSaving && <RefreshCw className="w-3 h-3 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Tab renderers ──────────────────────────────────────────────────────────

  function renderPlans() {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Subscription Plans</h2>
          <button
            onClick={openCreatePlan}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> New Plan
          </button>
        </div>

        {plans.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No plans yet. Create your first subscription plan.</p>
            <button onClick={openCreatePlan} className="mt-4 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              Create Plan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={`bg-white rounded-xl border ${plan.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'} p-5 flex flex-col gap-3`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{plan.description}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${plan.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">{plan.price.toLocaleString()}</span>
                  <span className="text-sm text-gray-500">{plan.currency_code} / {plan.billing_interval}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full capitalize">{plan.plan_type}</span>
                  <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full capitalize">{plan.billing_interval}</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                  <button
                    onClick={() => openEditPlan(plan)}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50"
                  >
                    <Edit className="w-3 h-3" /> Edit
                  </button>
                  {plan.is_active ? (
                    <button
                      onClick={() => deactivatePlan(plan)}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" /> Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => reactivatePlan(plan)}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-green-600 px-2 py-1 rounded hover:bg-green-50"
                    >
                      <CheckCircle className="w-3 h-3" /> Reactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderSubscriptions() {
    return (
      <div>
        {/* Expiry warning banner */}
        <ExpiryBanner expiring={expiringSoon} onDismiss={() => setExpiryDismissed(true)} />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-900">Customer Subscriptions</h2>
            <select
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <button
            onClick={openCreateSub}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> New Subscription
          </button>
        </div>

        {subscriptions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No subscriptions found.</p>
            <button onClick={openCreateSub} className="mt-4 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              Create Subscription
            </button>
          </div>
        ) : (
          /* No overflow-hidden — lets fixed-position dropdown escape the container */
          <div className="bg-white rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {subscriptions.map(sub => {
                  const isExpiringSoon = expiringSoon.some(e => e.id === sub.id);
                  return (
                    <tr key={sub.id} className={`hover:bg-gray-50 ${isExpiringSoon ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {sub.customer?.company_name || sub.customer?.contact_person || '—'}
                        </div>
                        {sub.customer?.email && (
                          <div className="text-xs text-gray-500">{sub.customer.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{sub.plan?.name || '—'}</div>
                        <div className="text-xs text-gray-500 capitalize">
                          {sub.plan?.plan_type} · {sub.plan?.billing_interval}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {sub.plan ? `${sub.plan.currency_code} ${sub.plan.price.toLocaleString()}` : '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {sub.status === 'active'
                            ? new Date(sub.next_billing_date).toLocaleDateString()
                            : '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sub.end_date ? (
                          <div className={`text-xs font-medium ${isExpiringSoon ? 'text-amber-600' : 'text-gray-600'}`}>
                            {isExpiringSoon && <AlertCircle className="w-3 h-3 inline mr-1" />}
                            {new Date(sub.end_date).toLocaleDateString()}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">Ongoing</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full ${statusBadge(sub.status)}`}>
                          {statusIcon(sub.status)}
                          {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <ActionMenu
                          sub={sub}
                          onStatusChange={changeSubStatus}
                          onEdit={openEditSub}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }
};

export default SubscriptionManagement;
