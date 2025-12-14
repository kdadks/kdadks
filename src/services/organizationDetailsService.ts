import { supabase } from '../config/supabase';
import type { OrganizationDetails, CreateOrganizationDetailsDto, UpdateOrganizationDetailsDto } from '../types/payroll';

/**
 * Service for managing organization details
 * Handles CRUD operations for organization information needed for statutory forms
 */
export const organizationDetailsService = {
  /**
   * Get all organization details
   */
  async getAll(): Promise<{ data: OrganizationDetails[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('organization_details')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Failed to fetch organization details:', error);
      return { data: null, error };
    }
  },

  /**
   * Get primary/active organization details
   */
  async getPrimaryOrganization(): Promise<{ data: OrganizationDetails | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('organization_details')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
      return { data, error: null };
    } catch (error) {
      console.error('Failed to fetch primary organization:', error);
      return { data: null, error };
    }
  },

  /**
   * Get organization by ID
   */
  async getById(id: string): Promise<{ data: OrganizationDetails | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('organization_details')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Failed to fetch organization details:', error);
      return { data: null, error };
    }
  },

  /**
   * Create new organization details
   */
  async create(orgDetails: CreateOrganizationDetailsDto): Promise<{ data: OrganizationDetails | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('organization_details')
        .insert([orgDetails])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Failed to create organization details:', error);
      return { data: null, error };
    }
  },

  /**
   * Update organization details
   */
  async update(id: string, updates: UpdateOrganizationDetailsDto): Promise<{ data: OrganizationDetails | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('organization_details')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Failed to update organization details:', error);
      return { data: null, error };
    }
  },

  /**
   * Delete organization details
   */
  async delete(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('organization_details')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Failed to delete organization details:', error);
      return { error };
    }
  },

  /**
   * Update compliance tracking dates
   */
  async updateComplianceDates(id: string, dates: {
    pf_last_deposit_date?: string;
    esi_last_deposit_date?: string;
    tds_last_deposit_date?: string;
  }): Promise<{ data: OrganizationDetails | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('organization_details')
        .update({
          ...dates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Failed to update compliance dates:', error);
      return { data: null, error };
    }
  },

  /**
   * Upload logo image and update organization
   */
  async updateLogo(id: string, logoBase64: string): Promise<{ data: OrganizationDetails | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('organization_details')
        .update({
          logo_image_data: logoBase64,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Failed to update logo:', error);
      return { data: null, error };
    }
  },
};

export default organizationDetailsService;
