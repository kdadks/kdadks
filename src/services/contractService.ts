/**
 * Contract Service
 * Handles all database operations for contract management
 */

import { supabase, isSupabaseConfigured } from '../config/supabase';
import { simpleAuth } from '../utils/simpleAuth';
import type {
  Contract,
  ContractWithDetails,
  ContractSection,
  ContractTemplate,
  ContractTemplateWithSections,
  CreateContractData,
  UpdateContractData,
  ContractFilters,
  ContractStatistics
} from '../types/contract';

class ContractService {
  
  // =====================================================
  // CONTRACT NUMBER GENERATION
  // =====================================================
  
  /**
   * Generate next contract number
   * Format: KDADKS/C/YYYY/MM/###
   */
  async generateContractNumber(): Promise<string> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not configured');
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `KDADKS/C/${year}/${month}/`;

    // Get the highest contract number for this month
    const { data, error } = await supabase
      .from('contracts')
      .select('contract_number')
      .like('contract_number', `${prefix}%`)
      .order('contract_number', { ascending: false })
      .limit(1);

    if (error) throw error;

    let nextNumber = 1;
    if (data && data.length > 0) {
      const lastNumber = data[0].contract_number.split('/').pop();
      nextNumber = parseInt(lastNumber || '0', 10) + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  }

  // =====================================================
  // CONTRACT TEMPLATES
  // =====================================================

  /**
   * Get all contract templates
   */
  async getTemplates(): Promise<ContractTemplate[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not configured');
    }

    const { data, error } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('is_active', true)
      .order('template_name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Get template with sections
   */
  async getTemplateWithSections(templateId: string): Promise<ContractTemplateWithSections | null> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not configured');
    }

    const { data: template, error: templateError } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) throw templateError;
    if (!template) return null;

    const { data: sections, error: sectionsError } = await supabase
      .from('contract_template_sections')
      .select('*')
      .eq('template_id', templateId)
      .order('section_number');

    if (sectionsError) throw sectionsError;

    return {
      ...template,
      sections: sections || []
    };
  }

  // =====================================================
  // CONTRACTS - CREATE
  // =====================================================

  /**
   * Create a new contract
   */
  async createContract(contractData: CreateContractData): Promise<Contract> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not configured');
    }

    const currentUser = await simpleAuth.getCurrentUser();
    const contractNumber = await this.generateContractNumber();

    // Prepare contract data (exclude sections and milestones for main insert)
    const { sections, milestones, ...contractInfo } = contractData;

    const contractToInsert = {
      ...contractInfo,
      contract_number: contractNumber,
      currency_code: contractData.currency_code || 'INR',
      status: 'draft',
      signed_by_party_a: false,
      signed_by_party_b: false,
      created_by: currentUser?.id
    };

    // Insert contract
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert(contractToInsert)
      .select()
      .single();

    if (contractError) throw contractError;

    // Insert sections
    if (sections && sections.length > 0) {
      const sectionsToInsert = sections.map(section => ({
        contract_id: contract.id,
        section_number: section.section_number,
        section_title: section.section_title,
        section_content: section.section_content,
        is_required: section.is_required || false,
        page_break_before: section.page_break_before || false
      }));

      const { error: sectionsError } = await supabase
        .from('contract_sections')
        .insert(sectionsToInsert);

      if (sectionsError) throw sectionsError;
    }

    // Insert milestones (if applicable for SOW/Work Orders)
    if (milestones && milestones.length > 0) {
      const milestonesToInsert = milestones.map(milestone => ({
        contract_id: contract.id,
        milestone_number: milestone.milestone_number,
        milestone_title: milestone.milestone_title,
        description: milestone.description,
        deliverables: milestone.deliverables,
        due_date: milestone.due_date,
        payment_amount: milestone.payment_amount || 0,
        status: 'pending'
      }));

      const { error: milestonesError } = await supabase
        .from('contract_milestones')
        .insert(milestonesToInsert);

      if (milestonesError) throw milestonesError;
    }

    return contract;
  }

  // =====================================================
  // CONTRACTS - READ
  // =====================================================

  /**
   * Get contracts with filtering and pagination
   */
  async getContracts(
    filters?: ContractFilters,
    page: number = 1,
    perPage: number = 10
  ): Promise<{ contracts: Contract[]; total: number }> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not configured');
    }

    let query = supabase
      .from('contracts')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters?.search) {
      query = query.or(`contract_number.ilike.%${filters.search}%,party_b_name.ilike.%${filters.search}%,contract_title.ilike.%${filters.search}%`);
    }

    if (filters?.contract_type) {
      query = query.eq('contract_type', filters.contract_type);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.party_b_name) {
      query = query.ilike('party_b_name', `%${filters.party_b_name}%`);
    }

    if (filters?.date_from) {
      query = query.gte('contract_date', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('contract_date', filters.date_to);
    }

    // Pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, error, count } = await query
      .order('contract_date', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      contracts: data || [],
      total: count || 0
    };
  }

  /**
   * Get single contract by ID with all details
   */
  async getContractById(id: string): Promise<ContractWithDetails | null> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not configured');
    }

    // Get contract
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single();

    if (contractError) throw contractError;
    if (!contract) return null;

    // Get sections
    const { data: sections, error: sectionsError } = await supabase
      .from('contract_sections')
      .select('*')
      .eq('contract_id', id)
      .order('section_number');

    if (sectionsError) throw sectionsError;

    // Get milestones
    const { data: milestones, error: milestonesError } = await supabase
      .from('contract_milestones')
      .select('*')
      .eq('contract_id', id)
      .order('milestone_number');

    if (milestonesError) throw milestonesError;

    // Get attachments
    const { data: attachments, error: attachmentsError } = await supabase
      .from('contract_attachments')
      .select('*')
      .eq('contract_id', id)
      .order('uploaded_at', { ascending: false });

    if (attachmentsError) throw attachmentsError;

    // Get amendments
    const { data: amendments, error: amendmentsError } = await supabase
      .from('contract_amendments')
      .select('*')
      .eq('contract_id', id)
      .order('amendment_number');

    if (amendmentsError) throw amendmentsError;

    // Get template if exists
    let template = null;
    if (contract.template_id) {
      const { data: templateData } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('id', contract.template_id)
        .single();
      template = templateData;
    }

    return {
      ...contract,
      sections: sections || [],
      milestones: milestones || [],
      attachments: attachments || [],
      amendments: amendments || [],
      template
    };
  }

  // =====================================================
  // CONTRACTS - UPDATE
  // =====================================================

  /**
   * Update contract
   */
  async updateContract(contractData: UpdateContractData): Promise<Contract> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not configured');
    }

    const { id, sections, milestones, ...updateData } = contractData;

    // Update contract
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (contractError) throw contractError;

    // Update sections if provided
    if (sections) {
      // Delete existing sections
      await supabase
        .from('contract_sections')
        .delete()
        .eq('contract_id', id);

      // Insert new sections
      if (sections.length > 0) {
        const sectionsToInsert = sections.map(section => ({
          contract_id: id,
          section_number: section.section_number,
          section_title: section.section_title,
          section_content: section.section_content,
          is_required: section.is_required || false,
          page_break_before: section.page_break_before || false
        }));

        const { error: sectionsError } = await supabase
          .from('contract_sections')
          .insert(sectionsToInsert);

        if (sectionsError) throw sectionsError;
      }
    }

    // Update milestones if provided
    if (milestones) {
      // Delete existing milestones
      await supabase
        .from('contract_milestones')
        .delete()
        .eq('contract_id', id);

      // Insert new milestones
      if (milestones.length > 0) {
        const milestonesToInsert = milestones.map(milestone => ({
          contract_id: id,
          milestone_number: milestone.milestone_number,
          milestone_title: milestone.milestone_title,
          description: milestone.description,
          deliverables: milestone.deliverables,
          due_date: milestone.due_date,
          payment_amount: milestone.payment_amount || 0
        }));

        const { error: milestonesError } = await supabase
          .from('contract_milestones')
          .insert(milestonesToInsert);

        if (milestonesError) throw milestonesError;
      }
    }

    return contract;
  }

  /**
   * Update contract status
   */
  async updateContractStatus(id: string, status: Contract['status']): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not configured');
    }

    const { error } = await supabase
      .from('contracts')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Sign contract
   */
  async signContract(id: string, signedBy: 'party_a' | 'party_b'): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not configured');
    }

    const field = signedBy === 'party_a' ? 'signed_by_party_a' : 'signed_by_party_b';
    
    const updateData: Partial<Contract> = {
      [field]: true
    };

    // Check if both parties have signed
    const { data: contract } = await supabase
      .from('contracts')
      .select('signed_by_party_a, signed_by_party_b')
      .eq('id', id)
      .single();

    const otherField = signedBy === 'party_a' ? 'signed_by_party_b' : 'signed_by_party_a';
    if (contract && contract[otherField]) {
      updateData.signed_date = new Date().toISOString().split('T')[0];
      updateData.status = 'active';
    }

    const { error } = await supabase
      .from('contracts')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  // =====================================================
  // CONTRACTS - DELETE
  // =====================================================

  /**
   * Delete contract
   */
  async deleteContract(id: string): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not configured');
    }

    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // =====================================================
  // CONTRACT SECTIONS
  // =====================================================

  /**
   * Add section to contract
   */
  async addSection(contractId: string, section: Omit<ContractSection, 'id' | 'contract_id' | 'created_at' | 'updated_at'>): Promise<ContractSection> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not configured');
    }

    const { data, error } = await supabase
      .from('contract_sections')
      .insert({
        contract_id: contractId,
        ...section
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Reorder sections
   */
  async reorderSections(contractId: string, sectionIds: string[]): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not configured');
    }

    for (let i = 0; i < sectionIds.length; i++) {
      await supabase
        .from('contract_sections')
        .update({ section_number: i + 1 })
        .eq('id', sectionIds[i])
        .eq('contract_id', contractId);
    }
  }

  // =====================================================
  // STATISTICS
  // =====================================================

  /**
   * Get contract statistics
   */
  async getStatistics(): Promise<ContractStatistics> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not configured');
    }

    const { data: contracts, error } = await supabase
      .from('contracts')
      .select('status, contract_type, contract_value, expiry_date');

    if (error) throw error;

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const stats: ContractStatistics = {
      total_contracts: contracts?.length || 0,
      active_contracts: 0,
      draft_contracts: 0,
      expired_contracts: 0,
      expiring_soon: 0,
      total_contract_value: 0,
      active_contract_value: 0,
      contracts_by_type: {
        MSA: 0,
        SOW: 0,
        NDA: 0,
        SLA: 0,
        WORK_ORDER: 0,
        MAINTENANCE: 0,
        CONSULTING: 0,
        LICENSE: 0,
        OTHER: 0
      }
    };

    contracts?.forEach(contract => {
      // Status counts
      if (contract.status === 'active') stats.active_contracts++;
      if (contract.status === 'draft') stats.draft_contracts++;
      if (contract.status === 'expired') stats.expired_contracts++;

      // Expiring soon
      if (contract.expiry_date) {
        const expiryDate = new Date(contract.expiry_date);
        if (expiryDate >= now && expiryDate <= thirtyDaysFromNow) {
          stats.expiring_soon++;
        }
      }

      // Contract values
      stats.total_contract_value += contract.contract_value || 0;
      if (contract.status === 'active') {
        stats.active_contract_value += contract.contract_value || 0;
      }

      // By type
      if (contract.contract_type) {
        stats.contracts_by_type[contract.contract_type as keyof typeof stats.contracts_by_type]++;
      }
    });

    return stats;
  }
}

export const contractService = new ContractService();
export default contractService;
