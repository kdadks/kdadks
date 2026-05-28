import { supabase } from '../config/supabase';
import { simpleAuth } from '../utils/simpleAuth';
import type {
  SubscriptionPlan,
  CustomerSubscription,
  CreateSubscriptionPlanData,
  CreateCustomerSubscriptionData,
  SubscriptionFilters,
} from '../types/subscription';

class SubscriptionService {
  // ── Plans ──────────────────────────────────────────────────────────────────

  async getPlans(includeInactive = false): Promise<SubscriptionPlan[]> {
    let query = supabase
      .from('subscription_plans')
      .select('*')
      .order('name');

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getPlanById(id: string): Promise<SubscriptionPlan | null> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async createPlan(plan: CreateSubscriptionPlanData): Promise<SubscriptionPlan> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert({ ...plan, is_active: true })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async updatePlan(id: string, plan: Partial<CreateSubscriptionPlanData>): Promise<SubscriptionPlan> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .update({ ...plan, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async deactivatePlan(id: string): Promise<void> {
    const { error } = await supabase
      .from('subscription_plans')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  // ── Subscriptions ──────────────────────────────────────────────────────────

  async getSubscriptions(filters?: SubscriptionFilters): Promise<CustomerSubscription[]> {
    let query = supabase
      .from('customer_subscriptions')
      .select(`
        *,
        customer:customers(id, company_name, contact_person, email),
        plan:subscription_plans(*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.customer_id) query = query.eq('customer_id', filters.customer_id);
    if (filters?.plan_id) query = query.eq('plan_id', filters.plan_id);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getSubscriptionById(id: string): Promise<CustomerSubscription | null> {
    const { data, error } = await supabase
      .from('customer_subscriptions')
      .select(`
        *,
        customer:customers(id, company_name, contact_person, email),
        plan:subscription_plans(*)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async createSubscription(sub: CreateCustomerSubscriptionData): Promise<CustomerSubscription> {
    const currentUser = await simpleAuth.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const plan = await this.getPlanById(sub.plan_id);
    if (!plan) throw new Error('Plan not found');

    const nextBillingDate = this.calculateNextBillingDate(
      sub.start_date,
      plan.billing_interval,
    );

    const { data, error } = await supabase
      .from('customer_subscriptions')
      .insert({
        customer_id: sub.customer_id,
        plan_id: sub.plan_id,
        status: 'active',
        start_date: sub.start_date,
        end_date: sub.end_date || null,
        next_billing_date: nextBillingDate,
        notes: sub.notes || null,
        created_by: currentUser.id,
      })
      .select(`
        *,
        customer:customers(id, company_name, contact_person, email),
        plan:subscription_plans(*)
      `)
      .single();
    if (error) throw error;
    return data;
  }

  async updateSubscriptionStatus(
    id: string,
    status: CustomerSubscription['status'],
  ): Promise<CustomerSubscription> {
    const { data, error } = await supabase
      .from('customer_subscriptions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        customer:customers(id, company_name, contact_person, email),
        plan:subscription_plans(*)
      `)
      .single();
    if (error) throw error;
    return data;
  }

  async updateNextBillingDate(id: string, nextDate: string): Promise<void> {
    const { error } = await supabase
      .from('customer_subscriptions')
      .update({ next_billing_date: nextDate, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async updateSubscription(
    id: string,
    data: { plan_id?: string; end_date?: string | null; notes?: string; next_billing_date?: string },
  ): Promise<CustomerSubscription> {
    const { data: result, error } = await supabase
      .from('customer_subscriptions')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        customer:customers(id, company_name, contact_person, email),
        plan:subscription_plans(*)
      `)
      .single();
    if (error) throw error;
    return result;
  }

  /** Returns active subscriptions whose end_date is within the next `daysAhead` days. */
  getExpiringSoon(subscriptions: CustomerSubscription[], daysAhead = 30): CustomerSubscription[] {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    return subscriptions.filter(s => {
      if (s.status !== 'active' || !s.end_date) return false;
      const end = new Date(s.end_date);
      return end >= now && end <= cutoff;
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  calculateNextBillingDate(fromDate: string, interval: 'monthly' | 'annual'): string {
    const d = new Date(fromDate);
    if (interval === 'monthly') {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setFullYear(d.getFullYear() + 1);
    }
    return d.toISOString().split('T')[0];
  }

  /** Returns active monthly subscriptions whose next_billing_date is today or past. */
  async getDueSubscriptions(): Promise<CustomerSubscription[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('customer_subscriptions')
      .select(`
        *,
        customer:customers(id, company_name, contact_person, email),
        plan:subscription_plans(*)
      `)
      .eq('status', 'active')
      .lte('next_billing_date', today);
    if (error) throw error;
    return data || [];
  }
}

export const subscriptionService = new SubscriptionService();
