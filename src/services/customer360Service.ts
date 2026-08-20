import { supabase, isSupabaseConfigured } from '../config/supabase';
import { convertCurrency } from '../utils/currencyConverter';
import type { Customer, Invoice, Payment } from '../types/invoice';
import type { CustomerContact } from '../types/customerContact';
import type { Lead, Opportunity } from '../types/lead';
import type { Quote } from '../types/quote';
import type { Contract } from '../types/contract';
import type { CustomerSubscription } from '../types/subscription';
import type { Customer360Data, CustomerFinancialMetrics, CustomerActivityTimelineItem } from '../types/customer360';

class Customer360Service {
  /**
   * Fetch all 360-degree customer data and aggregate metrics/timeline
   * @param customerId - Customer UUID
   * @param targetCurrency - Target currency of the active entity (INR for India, EUR for Ireland, etc.)
   */
  async getCustomer360Data(customerId: string, targetCurrency: string = 'INR'): Promise<Customer360Data | null> {
    if (!isSupabaseConfigured || !customerId) {
      console.warn('Supabase not configured or missing customerId');
      return null;
    }

    try {
      // 1. Fetch main Customer profile
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select(`
          *,
          country:countries(*),
          company_settings:company_settings(*)
        `)
        .eq('id', customerId)
        .single();

      if (customerError || !customerData) {
        console.error('Error fetching customer profile for 360 view:', customerError);
        return null;
      }

      const customer: Customer = customerData;

      // Execute queries
      const [
        contactsResult,
        leadsResult,
        quotesResult,
        contractsResult,
        subscriptionsResult,
        invoicesResult,
      ] = await Promise.all([
        // 2. Contacts
        supabase
          .from('customer_contacts')
          .select('*')
          .eq('customer_id', customerId)
          .eq('is_active', true)
          .order('is_primary', { ascending: false }),

        // 3. Leads
        supabase
          .from('leads')
          .select('*')
          .or(`customer_id.eq.${customerId},email.ilike.${customer.email || 'nonexistent_email'}`)
          .order('created_at', { ascending: false }),

        // 5. Quotes
        supabase
          .from('quotes')
          .select('*, items:quote_items(*)')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),

        // 6. Contracts (by customer company name matching party_b_name)
        supabase
          .from('contracts')
          .select('*')
          .or(`party_b_name.ilike.%${customer.company_name || '___'}%,party_b_contact.ilike.%${customer.email || '___'}%`)
          .order('created_at', { ascending: false }),

        // 7. Subscriptions
        supabase
          .from('customer_subscriptions')
          .select('*, plan:subscription_plans(*)')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),

        // 8. Invoices
        supabase
          .from('invoices')
          .select('*, items:invoice_items(*)')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),
      ]);

      const contacts: CustomerContact[] = contactsResult.data || [];
      const primaryContact = contacts.find(c => c.is_primary) || contacts[0];
      const leads: Lead[] = leadsResult.data || [];
      const quotes: Quote[] = quotesResult.data || [];
      const contracts: Contract[] = contractsResult.data || [];
      const subscriptions: CustomerSubscription[] = subscriptionsResult.data || [];
      const invoices: Invoice[] = invoicesResult.data || [];

      // 4. Opportunities (Fetch by customer_id OR lead_id / source_lead_id of customer leads)
      const leadIds = leads.map(l => l.id).filter(Boolean);
      let oppsQuery = supabase
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadIds.length > 0) {
        oppsQuery = oppsQuery.or(`customer_id.eq.${customerId},lead_id.in.(${leadIds.join(',')}),source_lead_id.in.(${leadIds.join(',')})`);
      } else {
        oppsQuery = oppsQuery.eq('customer_id', customerId);
      }

      const opportunitiesResult = await oppsQuery;
      const opportunities: Opportunity[] = opportunitiesResult.data || [];

      // 9. Payments (for all fetched invoice IDs)
      let payments: Payment[] = [];
      const invoiceIds = invoices.map(i => i.id).filter(Boolean);

      if (invoiceIds.length > 0) {
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .in('invoice_id', invoiceIds)
          .order('payment_date', { ascending: false });

        payments = paymentsData || [];
      }

      // Calculate Financial Metrics in entity target currency
      const metrics = this.calculateMetrics(invoices, payments, subscriptions, opportunities, contracts, targetCurrency);

      // Build Chronological Timeline
      const timeline = this.buildTimeline(customer, contacts, leads, opportunities, quotes, contracts, subscriptions, invoices, payments, targetCurrency);

      return {
        customer,
        contacts,
        primaryContact,
        leads,
        opportunities,
        quotes,
        contracts,
        subscriptions,
        invoices,
        payments,
        metrics,
        timeline,
      };
    } catch (error) {
      console.error('Error fetching Customer 360 Data:', error);
      return null;
    }
  }

  /**
   * Calculate summary metrics converted to the active entity's target currency
   */
  private calculateMetrics(
    invoices: Invoice[],
    payments: Payment[],
    subscriptions: CustomerSubscription[],
    opportunities: Opportunity[],
    contracts: Contract[],
    targetCurrency: string
  ): CustomerFinancialMetrics {
    const today = new Date().toISOString().split('T')[0];

    // Helper map of payments converted to target currency per invoice
    const paymentsPerInvoiceMap: Record<string, number> = {};
    payments.forEach(p => {
      if (p.invoice_id) {
        // If payment has inr_amount and target is INR, use inr_amount. Otherwise convert.
        let amtInTarget = 0;
        if (targetCurrency === 'INR' && p.inr_amount) {
          amtInTarget = Number(p.inr_amount);
        } else {
          const fromCurr = p.original_currency_code || 'INR';
          amtInTarget = convertCurrency(Number(p.amount || 0), fromCurr, targetCurrency);
        }
        paymentsPerInvoiceMap[p.invoice_id] = (paymentsPerInvoiceMap[p.invoice_id] || 0) + amtInTarget;
      }
    });

    // Valid invoices (excluding cancelled and draft)
    const validInvoices = invoices.filter(i => i.status !== 'cancelled' && i.status !== 'draft');

    // Total Invoiced in target currency
    const totalInvoiced = validInvoices.reduce((sum, inv) => {
      let invTotalInTarget = 0;
      if (targetCurrency === 'INR' && inv.inr_total_amount) {
        invTotalInTarget = Number(inv.inr_total_amount);
      } else {
        invTotalInTarget = convertCurrency(Number(inv.total_amount || 0), inv.currency_code || 'INR', targetCurrency);
      }
      return sum + invTotalInTarget;
    }, 0);

    // Total Collected in target currency
    const totalCollected = validInvoices.reduce((sum, inv) => {
      let invTotalInTarget = 0;
      if (targetCurrency === 'INR' && inv.inr_total_amount) {
        invTotalInTarget = Number(inv.inr_total_amount);
      } else {
        invTotalInTarget = convertCurrency(Number(inv.total_amount || 0), inv.currency_code || 'INR', targetCurrency);
      }

      const paidInTarget = paymentsPerInvoiceMap[inv.id] !== undefined
        ? paymentsPerInvoiceMap[inv.id]
        : (inv.status === 'paid' ? invTotalInTarget : 0);

      return sum + Number(paidInTarget || 0);
    }, 0);

    // Outstanding Balance in target currency
    const outstandingBalance = validInvoices.reduce((sum, inv) => {
      let invTotalInTarget = 0;
      if (targetCurrency === 'INR' && inv.inr_total_amount) {
        invTotalInTarget = Number(inv.inr_total_amount);
      } else {
        invTotalInTarget = convertCurrency(Number(inv.total_amount || 0), inv.currency_code || 'INR', targetCurrency);
      }

      const paidInTarget = paymentsPerInvoiceMap[inv.id] !== undefined
        ? paymentsPerInvoiceMap[inv.id]
        : (inv.status === 'paid' ? invTotalInTarget : 0);

      const bal = Math.max(0, invTotalInTarget - paidInTarget);
      return sum + bal;
    }, 0);

    // Overdue Balance in target currency
    const overdueBalance = validInvoices
      .filter(inv => {
        let invTotalInTarget = 0;
        if (targetCurrency === 'INR' && inv.inr_total_amount) {
          invTotalInTarget = Number(inv.inr_total_amount);
        } else {
          invTotalInTarget = convertCurrency(Number(inv.total_amount || 0), inv.currency_code || 'INR', targetCurrency);
        }

        const paidInTarget = paymentsPerInvoiceMap[inv.id] !== undefined
          ? paymentsPerInvoiceMap[inv.id]
          : (inv.status === 'paid' ? invTotalInTarget : 0);

        const bal = Math.max(0, invTotalInTarget - paidInTarget);
        return inv.status === 'overdue' || (inv.due_date && inv.due_date < today && bal > 0);
      })
      .reduce((sum, inv) => {
        let invTotalInTarget = 0;
        if (targetCurrency === 'INR' && inv.inr_total_amount) {
          invTotalInTarget = Number(inv.inr_total_amount);
        } else {
          invTotalInTarget = convertCurrency(Number(inv.total_amount || 0), inv.currency_code || 'INR', targetCurrency);
        }

        const paidInTarget = paymentsPerInvoiceMap[inv.id] !== undefined
          ? paymentsPerInvoiceMap[inv.id]
          : (inv.status === 'paid' ? invTotalInTarget : 0);

        return sum + Math.max(0, invTotalInTarget - paidInTarget);
      }, 0);

    // Active Subscriptions MRR in target currency
    const activeSubs = subscriptions.filter(s => s.status === 'active');
    const activeSubscriptionMRR = activeSubs.reduce((sum, sub) => {
      const originalPrice = Number(sub.plan?.price || 0);
      const fromCurr = sub.plan?.currency_code || 'INR';
      const priceInTarget = convertCurrency(originalPrice, fromCurr, targetCurrency);
      if (sub.plan?.billing_interval === 'annual') {
        return sum + priceInTarget / 12;
      }
      return sum + priceInTarget;
    }, 0);

    // Open Pipeline Value (Opportunities not closed_won/closed_lost) in target currency
    const openOpps = opportunities.filter(o => o.stage !== 'closed_won' && o.stage !== 'closed_lost');
    const openPipelineValue = openOpps.reduce((sum, opp) => {
      const val = Number(opp.estimated_value || 0);
      const fromCurr = opp.currency_code || 'INR';
      return sum + convertCurrency(val, fromCurr, targetCurrency);
    }, 0);

    // Win Rate
    const closedOpps = opportunities.filter(o => o.stage === 'closed_won' || o.stage === 'closed_lost');
    const wonOpps = opportunities.filter(o => o.stage === 'closed_won');
    const winRatePercentage = closedOpps.length > 0 ? Math.round((wonOpps.length / closedOpps.length) * 100) : 0;

    // Active Contracts Count
    const activeContracts = contracts.filter(c => c.status === 'active' || c.status === 'accepted');

    return {
      totalInvoiced,
      totalCollected,
      outstandingBalance,
      overdueBalance,
      activeSubscriptionMRR,
      openPipelineValue,
      winRatePercentage,
      contractsCount: activeContracts.length,
      totalInvoicesCount: invoices.length,
      paidInvoicesCount: invoices.filter(i => i.status === 'paid').length,
    };
  }

  /**
   * Consolidate touchpoints into a unified chronological timeline
   */
  private buildTimeline(
    customer: Customer,
    contacts: CustomerContact[],
    leads: Lead[],
    opportunities: Opportunity[],
    quotes: Quote[],
    contracts: Contract[],
    subscriptions: CustomerSubscription[],
    invoices: Invoice[],
    payments: Payment[],
    targetCurrency: string
  ): CustomerActivityTimelineItem[] {
    const items: CustomerActivityTimelineItem[] = [];

    // Customer created
    if (customer.created_at) {
      items.push({
        id: `cust-${customer.id}`,
        sourceType: 'customer',
        title: 'Customer Account Created',
        description: `Customer profile for ${customer.company_name || 'Customer'} was added.`,
        timestamp: customer.created_at,
        badgeText: 'Account',
        badgeVariant: 'purple',
      });
    }

    // Contacts
    contacts.forEach(c => {
      items.push({
        id: `contact-${c.id}`,
        sourceType: 'contact',
        title: `Contact Added: ${c.name}`,
        description: `${c.role ? `${c.role.toUpperCase()} Contact` : 'Contact'} - ${c.email || c.phone || 'No direct contact info'}`,
        timestamp: c.created_at,
        badgeText: c.is_primary ? 'Primary Contact' : 'Contact',
        badgeVariant: c.is_primary ? 'blue' : 'gray',
      });
    });

    // Leads
    leads.forEach(l => {
      const title = `${l.first_name || ''} ${l.last_name || ''}`.trim() || l.company_name || l.lead_number;
      items.push({
        id: `lead-${l.id}`,
        sourceType: 'lead',
        title: `Lead Logged: ${title}`,
        description: `Source: ${l.source || 'N/A'} | Status: ${l.status.toUpperCase()}`,
        timestamp: l.created_at,
        badgeText: `Lead #${l.lead_number}`,
        badgeVariant: l.status === 'converted' ? 'green' : 'yellow',
      });
    });

    // Opportunities
    opportunities.forEach(o => {
      const valInTarget = convertCurrency(Number(o.estimated_value || 0), o.currency_code || 'INR', targetCurrency);
      items.push({
        id: `opp-${o.id}`,
        sourceType: 'opportunity',
        title: `Opportunity Created: ${o.opportunity_name || o.opportunity_number}`,
        description: `Stage: ${o.stage.toUpperCase()} | Value: ${valInTarget.toFixed(2)} ${targetCurrency}`,
        timestamp: o.created_at,
        badgeText: `Opp #${o.opportunity_number}`,
        badgeVariant: o.stage === 'closed_won' ? 'green' : o.stage === 'closed_lost' ? 'red' : 'purple',
      });
    });

    // Quotes
    quotes.forEach(q => {
      const valInTarget = convertCurrency(Number(q.total_amount || 0), q.currency_code || 'INR', targetCurrency);
      items.push({
        id: `quote-${q.id}`,
        sourceType: 'quote',
        title: `Quote Issued: ${q.quote_number}`,
        description: `Total: ${valInTarget.toFixed(2)} ${targetCurrency} | Status: ${q.status.toUpperCase()}`,
        timestamp: q.created_at,
        badgeText: `Quote #${q.quote_number}`,
        badgeVariant: q.status === 'accepted' ? 'green' : q.status === 'rejected' ? 'red' : 'blue',
      });
    });

    // Contracts
    contracts.forEach(c => {
      items.push({
        id: `contract-${c.id}`,
        sourceType: 'contract',
        title: `Contract Created: ${c.contract_title || c.contract_number}`,
        description: `Type: ${c.contract_type} | Status: ${c.status.toUpperCase()}`,
        timestamp: c.created_at,
        badgeText: c.contract_number,
        badgeVariant: c.status === 'active' ? 'green' : 'gray',
      });
    });

    // Subscriptions
    subscriptions.forEach(s => {
      const priceInTarget = convertCurrency(Number(s.plan?.price || 0), s.plan?.currency_code || 'INR', targetCurrency);
      items.push({
        id: `sub-${s.id}`,
        sourceType: 'subscription',
        title: `Subscription ${s.status.toUpperCase()}: ${s.plan?.name || 'Recurring Plan'}`,
        description: `Billing: ${s.plan?.billing_interval || 'monthly'} | Price: ${priceInTarget.toFixed(2)} ${targetCurrency}`,
        timestamp: s.created_at,
        badgeText: 'Subscription',
        badgeVariant: s.status === 'active' ? 'green' : 'yellow',
      });
    });

    // Invoices
    invoices.forEach(inv => {
      const valInTarget = targetCurrency === 'INR' && inv.inr_total_amount
        ? Number(inv.inr_total_amount)
        : convertCurrency(Number(inv.total_amount || 0), inv.currency_code || 'INR', targetCurrency);
      items.push({
        id: `inv-${inv.id}`,
        sourceType: 'invoice',
        title: `Invoice Generated: ${inv.invoice_number}`,
        description: `Amount: ${valInTarget.toFixed(2)} ${targetCurrency} | Status: ${inv.status.toUpperCase()}`,
        timestamp: inv.created_at,
        badgeText: `Invoice #${inv.invoice_number}`,
        badgeVariant: inv.status === 'paid' ? 'green' : inv.status === 'overdue' ? 'red' : 'yellow',
      });
    });

    // Payments
    payments.forEach(p => {
      const amtInTarget = targetCurrency === 'INR' && p.inr_amount
        ? Number(p.inr_amount)
        : convertCurrency(Number(p.amount || 0), p.original_currency_code || 'INR', targetCurrency);
      items.push({
        id: `pay-${p.id}`,
        sourceType: 'payment',
        title: `Payment Received: ${amtInTarget.toFixed(2)} ${targetCurrency}`,
        description: `Method: ${p.payment_method || 'N/A'} | Ref: ${p.reference_number || 'N/A'}`,
        timestamp: p.payment_date || p.created_at,
        badgeText: 'Payment',
        badgeVariant: 'green',
      });
    });

    // Sort descending by date
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

export const customer360Service = new Customer360Service();
