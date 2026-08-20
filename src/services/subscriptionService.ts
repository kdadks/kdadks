import { supabase } from '../config/supabase';
import { simpleAuth } from '../utils/simpleAuth';
import { invoiceService } from './invoiceService';
import type {
  SubscriptionPlan,
  CustomerSubscription,
  CreateSubscriptionPlanData,
  CreateCustomerSubscriptionData,
  SubscriptionFilters,
} from '../types/subscription';

class SubscriptionService {
  // ── Plans ──────────────────────────────────────────────────────────────────

  async getPlans(includeInactive = false, companySettingsId?: string): Promise<SubscriptionPlan[]> {
    let query = supabase
      .from('subscription_plans')
      .select('*')
      .order('name');

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    let plans: SubscriptionPlan[] = data || [];

    if (companySettingsId) {
      plans = plans.filter(p => !p.company_settings_id || p.company_settings_id === companySettingsId);
    }

    return plans;
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
        customer:customers(id, company_name, contact_person, email, customer_code, company_settings_id),
        plan:subscription_plans(*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.customer_id) query = query.eq('customer_id', filters.customer_id);
    if (filters?.plan_id) query = query.eq('plan_id', filters.plan_id);

    const { data, error } = await query;
    if (error) throw error;
    let results: CustomerSubscription[] = data || [];

    // Filter by company_settings_id via subscription or customer relation if entity filter is provided
    if (filters?.company_settings_id) {
      results = results.filter(sub => 
        (!sub.company_settings_id && !sub.customer?.company_settings_id) ||
        sub.company_settings_id === filters.company_settings_id ||
        sub.customer?.company_settings_id === filters.company_settings_id
      );
    }

    return results;
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
        company_settings_id: sub.company_settings_id || null,
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

  /**
   * Generate a draft invoice from a subscription.
   * Creates a draft invoice populated with subscription details
   * and links it via subscription_id.
   */
  async generateDraftInvoice(subscriptionId: string): Promise<any> {
    const subscription = await this.getSubscriptionById(subscriptionId);
    if (!subscription) throw new Error('Subscription not found');
    if (subscription.status !== 'active') throw new Error('Subscription is not active');
    if (!subscription.plan) throw new Error('Subscription plan not found');
    if (!subscription.customer) throw new Error('Customer not found');

    const plan = subscription.plan;
    const customer = subscription.customer;

    // Determine the invoice date (use next_billing_date or today)
    const invoiceDate = subscription.next_billing_date || new Date().toISOString().split('T')[0];

    // Calculate due date (15 days from invoice date)
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 15);

    // Build line item from subscription plan
    const itemName = `${plan.name} - ${plan.billing_interval === 'monthly' ? 'Monthly' : 'Annual'} Subscription`;
    const itemDescription = `Subscription to ${plan.name} plan (${plan.billing_interval}). ${plan.description || ''}`;

    const invoiceData = {
      customer_id: subscription.customer_id,
      invoice_date: invoiceDate,
      due_date: dueDate.toISOString().split('T')[0],
      notes: `Auto-generated from subscription #${subscription.id}`,
      terms_conditions: subscription.notes || '',
      subscription_id: subscription.id,
      items: [
        {
          item_name: itemName,
          description: itemDescription,
          quantity: 1,
          unit: 'svc',
          unit_price: plan.price,
          tax_rate: 0,
        },
      ],
    };

    // Create the draft invoice (status will be 'draft')
    const invoice = await invoiceService.createInvoice(invoiceData, undefined, undefined);

    // Update the subscription's next_billing_date
    const newNextBillingDate = plan.billing_interval === 'monthly'
      ? this.calculateNextBillingDate(invoiceDate, 'monthly')
      : this.calculateNextBillingDate(invoiceDate, 'annual');

    await this.updateNextBillingDate(subscriptionId, newNextBillingDate);

    return invoice;
  }
}

export const subscriptionService = new SubscriptionService();
