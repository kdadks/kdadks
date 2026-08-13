import { supabase, isSupabaseConfigured } from '../config/supabase';
import { simpleAuth } from '../utils/simpleAuth';
import type {
  LeadActivity,
  ActivityType,
  CreateLeadActivityData,
  LeadActivityFilters
} from '../types/lead';

class LeadActivityService {
  async getActivities(filters?: LeadActivityFilters, page: number = 1, perPage: number = 20) {
    let query = supabase
      .from('lead_activities')
      .select(`
        *,
        lead:leads(*),
        opportunity:opportunities(*)
      `, { count: 'exact' });

    if (filters) {
      if (filters.lead_id) {
        query = query.eq('lead_id', filters.lead_id);
      }
      if (filters.opportunity_id) {
        query = query.eq('opportunity_id', filters.opportunity_id);
      }
      if (filters.activity_type) {
        query = query.eq('activity_type', filters.activity_type);
      }
      if (filters.created_by) {
        query = query.eq('created_by', filters.created_by);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    
    return {
      data: data || [],
      count: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage)
    };
  }

  async getActivityById(id: string): Promise<LeadActivity | null> {
    const { data, error } = await supabase
      .from('lead_activities')
      .select(`
        *,
        lead:leads(*),
        opportunity:opportunities(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async createActivity(activityData: CreateLeadActivityData): Promise<LeadActivity> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not configured');
    }

    const currentUser = await simpleAuth.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('lead_activities')
      .insert({
        ...activityData,
        created_by: currentUser.id
      })
      .select(`
        *,
        lead:leads(*),
        opportunity:opportunities(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateActivity(id: string, activityData: Partial<CreateLeadActivityData>): Promise<LeadActivity> {
    const { data, error } = await supabase
      .from('lead_activities')
      .update({
        ...activityData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        lead:leads(*),
        opportunity:opportunities(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  async completeActivity(id: string): Promise<LeadActivity> {
    const { data, error } = await supabase
      .from('lead_activities')
      .update({
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        lead:leads(*),
        opportunity:opportunities(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteActivity(id: string): Promise<void> {
    const { error } = await supabase
      .from('lead_activities')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async getActivitiesForLead(leadId: string): Promise<LeadActivity[]> {
    const { data, error } = await supabase
      .from('lead_activities')
      .select(`
        *,
        lead:leads(*),
        opportunity:opportunities(*)
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async getActivitiesForOpportunity(opportunityId: string): Promise<LeadActivity[]> {
    const { data, error } = await supabase
      .from('lead_activities')
      .select(`
        *,
        lead:leads(*),
        opportunity:opportunities(*)
      `)
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
}

export const leadActivityService = new LeadActivityService();
