export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency_code: string;
  billing_interval: 'monthly' | 'annual';
  plan_type: 'basic' | 'premium' | 'tiered' | 'add-on';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerSubscription {
  id: string;
  customer_id: string;
  plan_id: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  start_date: string;
  end_date?: string;
  next_billing_date: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  customer?: {
    id: string;
    company_name?: string;
    contact_person?: string;
    email?: string;
  };
  plan?: SubscriptionPlan;
}

export interface CreateSubscriptionPlanData {
  name: string;
  description?: string;
  price: number;
  currency_code: string;
  billing_interval: 'monthly' | 'annual';
  plan_type: 'basic' | 'premium' | 'tiered' | 'add-on';
}

export interface CreateCustomerSubscriptionData {
  customer_id: string;
  plan_id: string;
  start_date: string;
  end_date?: string;
  notes?: string;
}

export interface SubscriptionFilters {
  status?: string;
  customer_id?: string;
  plan_id?: string;
}
