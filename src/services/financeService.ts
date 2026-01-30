import { supabase } from '../config/supabase';

// ==================== TYPES ====================

export interface ManualTransaction {
  id: string;
  transaction_number: string;
  transaction_type: 'income' | 'expense';
  title: string;
  description: string | null;
  category: string | null;
  amount: number;
  tax_amount: number;
  net_amount: number;
  currency: string;
  // Multi-currency fields
  original_currency_code: string;
  original_amount: number | null;
  exchange_rate: number;
  exchange_rate_date: string | null;
  inr_amount: number | null;
  inr_tax_amount: number | null;
  inr_net_amount: number | null;
  is_currency_locked: boolean;
  // Other fields
  transaction_date: string;
  payment_method: string | null;
  payment_reference: string | null;
  bank_account: string | null;
  party_name: string | null;
  party_type: string | null;
  reference_type: string | null;
  reference_id: string | null;
  is_reconciled: boolean;
  reconciled_at: string | null;
  reconciled_by: string | null;
  notes: string | null;
  attachments: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionData {
  transaction_type: 'income' | 'expense';
  title: string;
  description?: string;
  category?: string;
  amount: number;
  tax_amount?: number;
  currency?: string;
  // Multi-currency fields
  original_currency_code?: string;
  original_amount?: number;
  exchange_rate?: number;
  exchange_rate_date?: string;
  inr_amount?: number;
  inr_tax_amount?: number;
  inr_net_amount?: number;
  // Other fields
  transaction_date: string;
  payment_method?: string;
  payment_reference?: string;
  bank_account?: string;
  party_name?: string;
  party_type?: string;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  attachments?: string[];
  created_by?: string;
}

export interface FinancialPeriod {
  id: string;
  period_type: 'monthly' | 'quarterly' | 'annual';
  period_name: string;
  start_date: string;
  end_date: string;
  financial_year: string;
  is_closed: boolean;
  closed_at: string | null;
  closed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface FinancialSummary {
  period: string;
  startDate: string;
  endDate: string;
  income: {
    invoices: number;
    manualIncome: number;
    total: number;
  };
  expenses: {
    operationalExpenses: number;
    salaries: number;
    bonuses: number;
    manualExpenses: number;
    total: number;
  };
  netProfit: number;
  profitMargin: number;
  cashFlow: {
    inflow: number;
    outflow: number;
    net: number;
  };
}

export interface FinancialTransaction {
  source_type: string;
  source_id: string;
  reference_number: string;
  transaction_date: string;
  party_name: string;
  party_type: string;
  gross_amount: number;
  tax_amount: number;
  net_amount: number;
  currency: string;
  description: string;
  category?: string;
}

export interface FinancialHealth {
  currentRatio: number;
  profitMargin: number;
  monthOverMonthGrowth: number;
  yearToDateProfit: number;
  averageMonthlyRevenue: number;
  averageMonthlyExpense: number;
  pendingReceivables: number;
  pendingPayables: number;
}

// ==================== SERVICE ====================

export const financeService = {
  // ==================== MANUAL TRANSACTIONS ====================

  async getTransactions(filters?: {
    type?: 'income' | 'expense';
    startDate?: string;
    endDate?: string;
    reconciled?: boolean;
  }): Promise<ManualTransaction[]> {
    let query = supabase
      .from('manual_transactions')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (filters?.type) query = query.eq('transaction_type', filters.type);
    if (filters?.startDate) query = query.gte('transaction_date', filters.startDate);
    if (filters?.endDate) query = query.lte('transaction_date', filters.endDate);
    if (filters?.reconciled !== undefined) query = query.eq('is_reconciled', filters.reconciled);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getTransactionById(id: string): Promise<ManualTransaction | null> {
    const { data, error } = await supabase
      .from('manual_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async createTransaction(transactionData: CreateTransactionData): Promise<ManualTransaction> {
    const { data, error } = await supabase
      .from('manual_transactions')
      .insert(transactionData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTransaction(id: string, updates: Partial<CreateTransactionData>): Promise<ManualTransaction> {
    // Remove computed columns
    const { net_amount, created_at, updated_at, id: _id, transaction_number, ...updateData } = updates as any;

    const { data, error } = await supabase
      .from('manual_transactions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase
      .from('manual_transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async reconcileTransaction(id: string): Promise<void> {
    const { error } = await supabase
      .from('manual_transactions')
      .update({
        is_reconciled: true,
        reconciled_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  },

  // ==================== FINANCIAL PERIODS ====================

  async getFinancialPeriods(type?: 'monthly' | 'quarterly' | 'annual'): Promise<FinancialPeriod[]> {
    let query = supabase
      .from('financial_periods')
      .select('*')
      .order('start_date', { ascending: false });

    if (type) query = query.eq('period_type', type);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // ==================== FINANCIAL REPORTS ====================

  async getIncomeData(startDate: string, endDate: string): Promise<FinancialTransaction[]> {
    console.log('💰 getIncomeData called with date range:', { startDate, endDate });
    
    // Get payments from invoices (actual cash received)
    const { data: payments, error: paymentError } = await supabase
      .from('payments')
      .select(`
        id, 
        payment_date, 
        amount, 
        payment_method, 
        reference_number,
        invoices!inner(
          id,
          invoice_number, 
          invoice_date, 
          total_amount, 
          tax_amount, 
          currency_code,
          customers(company_name)
        )
      `)
      .gte('payment_date', startDate)
      .lte('payment_date', endDate);

    console.log('💰 Payments query result:', { count: payments?.length || 0, error: paymentError?.message });

    if (paymentError) {
      console.error('Payment query error:', paymentError);
      // Fallback to old logic if payments table doesn't exist or query fails
      return this.getIncomeDataFallback(startDate, endDate);
    }

    // Get manual income
    const { data: manualIncome, error: manualError } = await supabase
      .from('manual_transactions')
      .select('*')
      .eq('transaction_type', 'income')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    if (manualError) throw manualError;

    const income: FinancialTransaction[] = [];

    // Transform payments from invoices
    (payments || []).forEach((payment: any) => {
      const inv = payment.invoices;
      if (!inv) return;
      income.push({
        source_type: 'invoice',
        source_id: inv.id,
        reference_number: inv.invoice_number,
        transaction_date: payment.payment_date,
        party_name: inv.customers?.company_name || 'Unknown',
        party_type: 'customer',
        gross_amount: payment.amount,
        tax_amount: 0, // Tax is on the invoice level
        net_amount: payment.amount,
        currency: inv.currency_code || 'INR',
        description: `Invoice Payment - ${inv.invoice_number}`
      });
    });

    // Transform manual income
    (manualIncome || []).forEach((mi: ManualTransaction) => {
      income.push({
        source_type: 'manual',
        source_id: mi.id,
        reference_number: mi.transaction_number,
        transaction_date: mi.transaction_date,
        party_name: mi.party_name || 'Unknown',
        party_type: mi.party_type || 'other',
        gross_amount: mi.amount,
        tax_amount: mi.tax_amount,
        net_amount: mi.net_amount,
        currency: mi.currency,
        description: mi.title,
        category: mi.category || undefined
      });
    });

    return income.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  },

  // Fallback method for income data if payments table query fails
  async getIncomeDataFallback(startDate: string, endDate: string): Promise<FinancialTransaction[]> {
    // Get paid invoices (by invoice_date as fallback)
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number, invoice_date, total_amount, tax_amount, currency_code, customers(company_name)')
      .eq('status', 'paid')
      .gte('invoice_date', startDate)
      .lte('invoice_date', endDate);

    if (invoiceError) throw invoiceError;

    // Get manual income
    const { data: manualIncome, error: manualError } = await supabase
      .from('manual_transactions')
      .select('*')
      .eq('transaction_type', 'income')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    if (manualError) throw manualError;

    const income: FinancialTransaction[] = [];

    // Transform invoices
    (invoices || []).forEach((inv: any) => {
      income.push({
        source_type: 'invoice',
        source_id: inv.id,
        reference_number: inv.invoice_number,
        transaction_date: inv.invoice_date,
        party_name: inv.customers?.company_name || 'Unknown',
        party_type: 'customer',
        gross_amount: inv.total_amount,
        tax_amount: inv.tax_amount || 0,
        net_amount: inv.total_amount,
        currency: inv.currency_code || 'INR',
        description: 'Invoice Payment'
      });
    });

    // Transform manual income
    (manualIncome || []).forEach((mi: ManualTransaction) => {
      income.push({
        source_type: 'manual',
        source_id: mi.id,
        reference_number: mi.transaction_number,
        transaction_date: mi.transaction_date,
        party_name: mi.party_name || 'Unknown',
        party_type: mi.party_type || 'other',
        gross_amount: mi.amount,
        tax_amount: mi.tax_amount,
        net_amount: mi.net_amount,
        currency: mi.currency,
        description: mi.title,
        category: mi.category || undefined
      });
    });

    return income.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  },

  async getExpenseData(startDate: string, endDate: string): Promise<FinancialTransaction[]> {
    // Get paid expenses
    const { data: expenses, error: expenseError } = await supabase
      .from('expenses')
      .select('*, expense_categories(name), vendors(name)')
      .eq('status', 'approved')
      .eq('payment_status', 'paid')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate);

    if (expenseError) throw expenseError;

    // Get paid salary slips
    const { data: salaries, error: salaryError } = await supabase
      .from('salary_slips')
      .select('*, employees(full_name)')
      .eq('status', 'paid')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate);

    if (salaryError) throw salaryError;

    // Get paid bonuses
    const { data: bonuses, error: bonusError } = await supabase
      .from('employee_bonuses')
      .select('*, employees:employee_id(full_name)')
      .eq('payment_status', 'paid')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate);

    if (bonusError) throw bonusError;

    // Get manual expenses
    const { data: manualExpenses, error: manualError } = await supabase
      .from('manual_transactions')
      .select('*')
      .eq('transaction_type', 'expense')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    if (manualError) throw manualError;

    const expenseList: FinancialTransaction[] = [];

    // Transform expenses
    (expenses || []).forEach((exp: any) => {
      expenseList.push({
        source_type: 'expense',
        source_id: exp.id,
        reference_number: exp.expense_number,
        transaction_date: exp.expense_date,
        party_name: exp.vendors?.name || exp.vendor_name || 'Unknown',
        party_type: 'vendor',
        gross_amount: exp.amount,
        tax_amount: exp.tax_amount || 0,
        net_amount: exp.total_amount,
        currency: exp.currency || 'INR',
        description: exp.title,
        category: exp.expense_categories?.name
      });
    });

    // Transform salaries
    (salaries || []).forEach((sal: any) => {
      const salaryDate = new Date(sal.salary_year, sal.salary_month - 1, 1);
      expenseList.push({
        source_type: 'salary',
        source_id: sal.id,
        reference_number: `SAL-${sal.salary_year}-${String(sal.salary_month).padStart(2, '0')}-${sal.id.substring(0, 8)}`,
        transaction_date: sal.payment_date || salaryDate.toISOString().split('T')[0],
        party_name: sal.employees?.full_name || 'Unknown',
        party_type: 'employee',
        gross_amount: sal.gross_salary,
        tax_amount: sal.total_deductions || 0,
        net_amount: sal.net_salary,
        currency: 'INR',
        description: `Salary - ${salaryDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`,
        category: 'Salaries'
      });
    });

    // Transform bonuses
    (bonuses || []).forEach((bon: any) => {
      expenseList.push({
        source_type: 'bonus',
        source_id: bon.id,
        reference_number: `BONUS-${bon.id.substring(0, 8)}`,
        transaction_date: bon.payment_date,
        party_name: bon.employees?.full_name || 'Unknown',
        party_type: 'employee',
        gross_amount: bon.amount,
        tax_amount: bon.tax_amount || 0,
        net_amount: bon.net_amount,
        currency: 'INR',
        description: bon.bonus_name,
        category: 'Bonuses'
      });
    });

    // Transform manual expenses
    (manualExpenses || []).forEach((me: ManualTransaction) => {
      expenseList.push({
        source_type: 'manual',
        source_id: me.id,
        reference_number: me.transaction_number,
        transaction_date: me.transaction_date,
        party_name: me.party_name || 'Unknown',
        party_type: me.party_type || 'other',
        gross_amount: me.amount,
        tax_amount: me.tax_amount,
        net_amount: me.net_amount,
        currency: me.currency,
        description: me.title,
        category: me.category || undefined
      });
    });

    return expenseList.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  },

  async getFinancialSummary(startDate: string, endDate: string, periodName?: string): Promise<FinancialSummary> {
    const income = await this.getIncomeData(startDate, endDate);
    const expenses = await this.getExpenseData(startDate, endDate);

    // Calculate income totals
    const invoiceIncome = income.filter(i => i.source_type === 'invoice').reduce((sum, i) => sum + i.net_amount, 0);
    const manualIncome = income.filter(i => i.source_type === 'manual').reduce((sum, i) => sum + i.net_amount, 0);
    const totalIncome = invoiceIncome + manualIncome;

    // Calculate expense totals
    const operationalExpenses = expenses.filter(e => e.source_type === 'expense').reduce((sum, e) => sum + e.net_amount, 0);
    const salaries = expenses.filter(e => e.source_type === 'salary').reduce((sum, e) => sum + e.net_amount, 0);
    const bonuses = expenses.filter(e => e.source_type === 'bonus').reduce((sum, e) => sum + e.net_amount, 0);
    const manualExpenses = expenses.filter(e => e.source_type === 'manual').reduce((sum, e) => sum + e.net_amount, 0);
    const totalExpenses = operationalExpenses + salaries + bonuses + manualExpenses;

    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    return {
      period: periodName || `${startDate} to ${endDate}`,
      startDate,
      endDate,
      income: {
        invoices: invoiceIncome,
        manualIncome,
        total: totalIncome
      },
      expenses: {
        operationalExpenses,
        salaries,
        bonuses,
        manualExpenses,
        total: totalExpenses
      },
      netProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      cashFlow: {
        inflow: totalIncome,
        outflow: totalExpenses,
        net: netProfit
      }
    };
  },

  async getFinancialHealth(): Promise<FinancialHealth> {
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const yearStart = today.getMonth() >= 3 
      ? new Date(today.getFullYear(), 3, 1) 
      : new Date(today.getFullYear() - 1, 3, 1);

    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    // Get current month summary
    const currentSummary = await this.getFinancialSummary(
      currentMonth.toISOString().split('T')[0],
      currentMonthEnd.toISOString().split('T')[0]
    );

    // Get last month summary
    const lastSummary = await this.getFinancialSummary(
      lastMonth.toISOString().split('T')[0],
      lastMonthEnd.toISOString().split('T')[0]
    );

    // Get YTD summary
    const ytdSummary = await this.getFinancialSummary(
      yearStart.toISOString().split('T')[0],
      today.toISOString().split('T')[0]
    );

    // Get pending receivables (unpaid invoices)
    const { data: unpaidInvoices } = await supabase
      .from('invoices')
      .select('total_amount')
      .in('status', ['sent', 'overdue']);

    const pendingReceivables = (unpaidInvoices || []).reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);

    // Get pending payables (approved but unpaid expenses)
    const { data: unpaidExpenses } = await supabase
      .from('expenses')
      .select('total_amount')
      .eq('status', 'approved')
      .eq('payment_status', 'pending');

    const pendingPayables = (unpaidExpenses || []).reduce((sum: number, exp: any) => sum + (exp.total_amount || 0), 0);

    // Calculate month over month growth
    const monthOverMonthGrowth = lastSummary.income.total > 0
      ? ((currentSummary.income.total - lastSummary.income.total) / lastSummary.income.total) * 100
      : 0;

    // Calculate average monthly figures (based on months elapsed in FY)
    const monthsElapsed = Math.max(1, Math.ceil((today.getTime() - yearStart.getTime()) / (30 * 24 * 60 * 60 * 1000)));
    const averageMonthlyRevenue = ytdSummary.income.total / monthsElapsed;
    const averageMonthlyExpense = ytdSummary.expenses.total / monthsElapsed;

    return {
      currentRatio: pendingPayables > 0 ? pendingReceivables / pendingPayables : pendingReceivables > 0 ? Infinity : 1,
      profitMargin: ytdSummary.profitMargin,
      monthOverMonthGrowth: Math.round(monthOverMonthGrowth * 100) / 100,
      yearToDateProfit: ytdSummary.netProfit,
      averageMonthlyRevenue: Math.round(averageMonthlyRevenue),
      averageMonthlyExpense: Math.round(averageMonthlyExpense),
      pendingReceivables,
      pendingPayables
    };
  },

  async getMonthlyTrend(months: number = 12): Promise<{ month: string; income: number; expenses: number; profit: number }[]> {
    const trend = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);

      const summary = await this.getFinancialSummary(
        monthStart.toISOString().split('T')[0],
        monthEnd.toISOString().split('T')[0]
      );

      trend.push({
        month: monthStart.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        income: summary.income.total,
        expenses: summary.expenses.total,
        profit: summary.netProfit
      });
    }

    return trend;
  }
};
