// Lead & Opportunity Management TypeScript Definitions
// Multi-entity workflow supporting Ireland vs India operations

import type { Customer, CompanySettings, Country } from './invoice';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'disqualified' | 'converted';

export type LeadSource = 
  | 'website'
  | 'referral'
  | 'campaign'
  | 'social_media'
  | 'cold_outreach'
  | 'partner'
  | 'other';

export type OpportunityStage = 
  | 'prospecting'
  | 'qualification'
  | 'proposal'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';

export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'task' | 'status_change';

// =====================================================
// LEAD INTERFACES
// =====================================================

export interface Lead {
  id: string;
  
  // Entity context
  company_settings_id?: string;
  
  // Customer association
  customer_id?: string;
  
  // Lead identification
  lead_number: string;
  
  // Contact information
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  job_title?: string;
  company_name?: string;
  
  // Lead details
  source: LeadSource;
  status: LeadStatus;
  
  // Qualification criteria
  budget_min?: number;
  budget_max?: number;
  currency_code?: string;
  expected_close_date?: string;
  probability: number;
  
  // Entity-specific fields (India)
  gstin?: string;
  pan?: string;
  
  // Entity-specific fields (Ireland/EU)
  vat_number?: string;
  cro_number?: string;
  
  // Additional information
  description?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country_id?: string;
  
  // Tracking
  created_by?: string;
  assigned_to?: string;
  qualified_at?: string;
  disqualified_at?: string;
  disqualified_reason?: string;
  converted_at?: string;
  created_at: string;
  updated_at: string;
  
  // Populated from relations
  customer?: Customer;
  company_settings?: CompanySettings;
  country?: Country;
}

export interface CreateLeadData {
  // Entity context
  company_settings_id?: string;
  
  // Customer association
  customer_id?: string;
  
  // Contact information
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  job_title?: string;
  company_name?: string;
  
  // Lead details
  source: LeadSource;
  
  // Qualification criteria
  budget_min?: number;
  budget_max?: number;
  currency_code?: string;
  expected_close_date?: string;
  
  // Entity-specific fields (India)
  gstin?: string;
  pan?: string;
  
  // Entity-specific fields (Ireland/EU)
  vat_number?: string;
  cro_number?: string;
  
  // Additional information
  description?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country_id?: string;
  
  // Assignment
  assigned_to?: string;
}

export interface UpdateLeadData extends Partial<CreateLeadData> {
  id: string;
  status?: LeadStatus;
  probability?: number;
  qualified_at?: string;
  disqualified_at?: string;
  disqualified_reason?: string;
  converted_at?: string;
}

// =====================================================
// OPPORTUNITY INTERFACES
// =====================================================

export interface Opportunity {
  id: string;
  
  // Entity context
  company_settings_id?: string;
  
  // Lead and Customer association
  lead_id?: string;
  customer_id?: string;
  source_lead_id?: string;
  
  // Opportunity identification
  opportunity_number: string;
  opportunity_name: string;
  
  // Stage and probability
  stage: OpportunityStage;
  probability: number;
  
  // Financial information
  estimated_value: number;
  currency_code: string;
  
  // Timeline
  expected_close_date?: string;
  actual_close_date?: string;
  
  // Quote conversion tracking
  converted_to_quote_id?: string;
  converted_to_invoice_id?: string;
  converted_at?: string;
  
  // Additional information
  description?: string;
  next_steps?: string;
  loss_reason?: string;
  
  // Tracking
  created_by?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  
  // Populated from relations
  lead?: Lead;
  customer?: Customer;
  company_settings?: CompanySettings;
}

export interface CreateOpportunityData {
  // Entity context
  company_settings_id?: string;
  
  // Lead and Customer association
  lead_id?: string;
  customer_id: string;
  
  // Source lead tracking (when created from lead conversion)
  source_lead_id?: string;
  
  // Opportunity identification
  opportunity_name: string;
  
  // Stage and probability
  stage?: OpportunityStage;
  probability?: number;
  
  // Financial information
  estimated_value?: number;
  currency_code?: string;
  
  // Timeline
  expected_close_date?: string;
  
  // Additional information
  description?: string;
  next_steps?: string;
  
  // Assignment
  assigned_to?: string;
}

export interface UpdateOpportunityData extends Partial<CreateOpportunityData> {
  id: string;
  stage?: OpportunityStage;
  probability?: number;
  actual_close_date?: string;
  converted_to_quote_id?: string;
  converted_to_invoice_id?: string;
  converted_at?: string;
  loss_reason?: string;
}

// =====================================================
// LEAD ACTIVITY INTERFACES
// =====================================================

export interface LeadActivity {
  id: string;
  
  // Associations
  lead_id?: string;
  opportunity_id?: string;
  
  // Activity details
  activity_type: ActivityType;
  subject: string;
  description?: string;
  
  // Scheduling
  due_date?: string;
  completed_at?: string;
  
  // Tracking
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Populated from relations
  lead?: Lead;
  opportunity?: Opportunity;
}

export interface CreateLeadActivityData {
  lead_id?: string;
  opportunity_id?: string;
  activity_type: ActivityType;
  subject: string;
  description?: string;
  due_date?: string;
}

// =====================================================
// QUOTE HANDOFF PAYLOAD
// =====================================================

export interface QuoteHandoffPayload {
  // Entity context
  company_settings_id: string;
  
  // Customer information
  customer_id: string;
  
  // Lead/Opportunity reference
  lead_id?: string;
  opportunity_id?: string;
  
  // Quote details
  project_title?: string;
  estimated_time?: string;
  company_contact_name?: string;
  company_contact_email?: string;
  company_contact_phone?: string;
  
  // Quote items
  items: QuoteHandoffItem[];
  
  // Additional information
  notes?: string;
  terms_conditions?: string;
  
  // Entity-specific defaults
  default_tax_rate?: number;
  currency_code?: string;
}

export interface QuoteHandoffItem {
  product_id?: string;
  item_name: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate: number;
  hsn_code?: string;
  billable_hours?: number;
  resource_count?: number;
  is_service_item?: boolean;
}

// =====================================================
// FILTERS & PAGINATION
// =====================================================

export interface LeadFilters {
  search?: string;
  status?: LeadStatus;
  source?: LeadSource;
  customer_id?: string;
  company_settings_id?: string;
  assigned_to?: string;
  date_from?: string;
  date_to?: string;
}

export interface OpportunityFilters {
  search?: string;
  stage?: OpportunityStage;
  customer_id?: string;
  company_settings_id?: string;
  lead_id?: string;
  assigned_to?: string;
  date_from?: string;
  date_to?: string;
}

export interface LeadStats {
  total_leads: number;
  new_leads: number;
  contacted_leads: number;
  qualified_leads: number;
  disqualified_leads: number;
  converted_leads: number;
  website_leads: number;
  referral_leads: number;
  campaign_leads: number;
  this_month_leads: number;
  this_year_leads: number;
}

export interface OpportunityStats {
  total_opportunities: number;
  prospecting_opportunities: number;
  qualification_opportunities: number;
  proposal_opportunities: number;
  negotiation_opportunities: number;
  closed_won_opportunities: number;
  closed_lost_opportunities: number;
  total_pipeline_value: number;
  open_pipeline_value: number;
  this_month_opportunities: number;
  this_year_opportunities: number;
}

export interface LeadActivityFilters {
  lead_id?: string;
  opportunity_id?: string;
  activity_type?: ActivityType;
  created_by?: string;
  date_from?: string;
  date_to?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
  total_pages: number;
}
