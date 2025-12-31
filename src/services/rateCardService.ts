import { supabase } from '../config/supabase';
import type {
  RateCardTemplate,
  CostHeadType,
  QuoteRateCard,
  CreateRateCardTemplateData,
  UpdateRateCardTemplateData,
  CreateCostHeadTypeData,
  UpdateCostHeadTypeData,
  CreateQuoteRateCardData,
  UpdateQuoteRateCardData,
  RateCardFilters,
  RateCardStats,
} from '../types/rateCard';

class RateCardService {
  // ==================== Rate Card Templates ====================

  async getRateCardTemplates(filters?: RateCardFilters): Promise<RateCardTemplate[]> {
    let query = supabase
      .from('rate_card_templates')
      .select('*')
      .order('category', { ascending: true })
      .order('resource_level', { ascending: true });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.resource_level) {
      query = query.eq('resource_level', filters.resource_level);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters?.search) {
      query = query.or(`template_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch rate card templates: ${error.message}`);
    }

    return data || [];
  }

  async getRateCardTemplateById(id: string): Promise<RateCardTemplate | null> {
    const { data, error } = await supabase
      .from('rate_card_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch rate card template: ${error.message}`);
    }

    return data;
  }

  async getDefaultTemplates(): Promise<RateCardTemplate[]> {
    const { data, error } = await supabase
      .from('rate_card_templates')
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('resource_level', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch default templates: ${error.message}`);
    }

    return data || [];
  }

  async createRateCardTemplate(data: CreateRateCardTemplateData): Promise<RateCardTemplate> {
    const { data: template, error } = await supabase
      .from('rate_card_templates')
      .insert({
        template_name: data.template_name,
        category: data.category,
        resource_level: data.resource_level,
        base_rate_usd: data.base_rate_usd,
        base_rate_inr: data.base_rate_inr,
        cost_heads: data.cost_heads,
        estimated_annual_salary_usd: data.estimated_annual_salary_usd,
        estimated_annual_salary_inr: data.estimated_annual_salary_inr,
        estimated_monthly_salary_usd: data.estimated_monthly_salary_usd,
        estimated_monthly_salary_inr: data.estimated_monthly_salary_inr,
        working_hours_per_month: data.working_hours_per_month ?? 160,
        working_days_per_year: data.working_days_per_year ?? 220,
        salary_to_rate_multiplier: data.salary_to_rate_multiplier ?? 1.75,
        is_active: data.is_active ?? true,
        is_default: data.is_default ?? false,
        description: data.description,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create rate card template: ${error.message}`);
    }

    return template;
  }

  async updateRateCardTemplate(id: string, data: UpdateRateCardTemplateData): Promise<RateCardTemplate> {
    const updateData: any = {};

    if (data.template_name !== undefined) updateData.template_name = data.template_name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.resource_level !== undefined) updateData.resource_level = data.resource_level;
    if (data.base_rate_usd !== undefined) updateData.base_rate_usd = data.base_rate_usd;
    if (data.base_rate_inr !== undefined) updateData.base_rate_inr = data.base_rate_inr;
    if (data.cost_heads !== undefined) updateData.cost_heads = data.cost_heads;
    if (data.estimated_annual_salary_usd !== undefined) updateData.estimated_annual_salary_usd = data.estimated_annual_salary_usd;
    if (data.estimated_annual_salary_inr !== undefined) updateData.estimated_annual_salary_inr = data.estimated_annual_salary_inr;
    if (data.estimated_monthly_salary_usd !== undefined) updateData.estimated_monthly_salary_usd = data.estimated_monthly_salary_usd;
    if (data.estimated_monthly_salary_inr !== undefined) updateData.estimated_monthly_salary_inr = data.estimated_monthly_salary_inr;
    if (data.working_hours_per_month !== undefined) updateData.working_hours_per_month = data.working_hours_per_month;
    if (data.working_days_per_year !== undefined) updateData.working_days_per_year = data.working_days_per_year;
    if (data.salary_to_rate_multiplier !== undefined) updateData.salary_to_rate_multiplier = data.salary_to_rate_multiplier;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.is_default !== undefined) updateData.is_default = data.is_default;
    if (data.description !== undefined) updateData.description = data.description;

    const { data: template, error } = await supabase
      .from('rate_card_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update rate card template: ${error.message}`);
    }

    return template;
  }

  async deleteRateCardTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('rate_card_templates')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete rate card template: ${error.message}`);
    }
  }

  // ==================== Cost Head Types ====================

  async getCostHeadTypes(): Promise<CostHeadType[]> {
    const { data, error } = await supabase
      .from('cost_head_types')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch cost head types: ${error.message}`);
    }

    return data || [];
  }

  async getCostHeadTypesByCategory(category: string): Promise<CostHeadType[]> {
    const { data, error } = await supabase
      .from('cost_head_types')
      .select('*')
      .or(`applies_to.eq.all,applies_to.eq.${category}`)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch cost head types for category: ${error.message}`);
    }

    return data || [];
  }

  async createCostHeadType(data: CreateCostHeadTypeData): Promise<CostHeadType> {
    const { data: costHead, error } = await supabase
      .from('cost_head_types')
      .insert({
        name: data.name,
        description: data.description,
        default_percentage: data.default_percentage,
        applies_to: data.applies_to,
        display_order: data.display_order ?? 999,
        is_active: data.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create cost head type: ${error.message}`);
    }

    return costHead;
  }

  async updateCostHeadType(id: string, data: UpdateCostHeadTypeData): Promise<CostHeadType> {
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.default_percentage !== undefined) updateData.default_percentage = data.default_percentage;
    if (data.applies_to !== undefined) updateData.applies_to = data.applies_to;
    if (data.display_order !== undefined) updateData.display_order = data.display_order;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const { data: costHead, error } = await supabase
      .from('cost_head_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update cost head type: ${error.message}`);
    }

    return costHead;
  }

  async deleteCostHeadType(id: string): Promise<void> {
    const { error } = await supabase
      .from('cost_head_types')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete cost head type: ${error.message}`);
    }
  }

  // ==================== Quote Rate Cards ====================

  async getQuoteRateCards(quoteId: string): Promise<QuoteRateCard[]> {
    const { data, error } = await supabase
      .from('quote_rate_cards')
      .select(`
        *,
        template:template_id (*)
      `)
      .eq('quote_id', quoteId);

    if (error) {
      throw new Error(`Failed to fetch quote rate cards: ${error.message}`);
    }

    return data || [];
  }

  async getQuoteRateCardById(id: string): Promise<QuoteRateCard | null> {
    const { data, error } = await supabase
      .from('quote_rate_cards')
      .select(`
        *,
        template:template_id (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch quote rate card: ${error.message}`);
    }

    return data;
  }

  async createQuoteRateCard(data: CreateQuoteRateCardData): Promise<QuoteRateCard> {
    // Calculate subtotals
    const totalRateUSD = data.cost_heads.reduce((sum, head) => sum + head.value, 0);
    const totalRateINR = data.cost_heads.reduce((sum, head) => sum + head.valueINR, 0);
    const subtotalUSD = totalRateUSD * data.quantity;
    const subtotalINR = totalRateINR * data.quantity;

    const { data: rateCard, error } = await supabase
      .from('quote_rate_cards')
      .insert({
        quote_id: data.quote_id,
        template_id: data.template_id,
        category: data.category,
        resource_level: data.resource_level,
        rate_usd: data.rate_usd,
        rate_inr: data.rate_inr,
        cost_heads: data.cost_heads,
        quantity: data.quantity,
        unit: data.unit,
        subtotal_usd: subtotalUSD,
        subtotal_inr: subtotalINR,
        notes: data.notes,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create quote rate card: ${error.message}`);
    }

    return rateCard;
  }

  async updateQuoteRateCard(id: string, data: UpdateQuoteRateCardData): Promise<QuoteRateCard> {
    const updateData: any = {};

    if (data.template_id !== undefined) updateData.template_id = data.template_id;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.resource_level !== undefined) updateData.resource_level = data.resource_level;
    if (data.rate_usd !== undefined) updateData.rate_usd = data.rate_usd;
    if (data.rate_inr !== undefined) updateData.rate_inr = data.rate_inr;
    if (data.cost_heads !== undefined) updateData.cost_heads = data.cost_heads;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Recalculate subtotals if relevant fields changed
    if (data.cost_heads || data.quantity) {
      const currentCard = await this.getQuoteRateCardById(id);
      if (currentCard) {
        const costHeads = data.cost_heads || currentCard.cost_heads;
        const quantity = data.quantity || currentCard.quantity;

        const totalRateUSD = costHeads.reduce((sum, head) => sum + head.value, 0);
        const totalRateINR = costHeads.reduce((sum, head) => sum + head.valueINR, 0);

        updateData.subtotal_usd = totalRateUSD * quantity;
        updateData.subtotal_inr = totalRateINR * quantity;
      }
    }

    const { data: rateCard, error } = await supabase
      .from('quote_rate_cards')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update quote rate card: ${error.message}`);
    }

    return rateCard;
  }

  async deleteQuoteRateCard(id: string): Promise<void> {
    const { error } = await supabase
      .from('quote_rate_cards')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete quote rate card: ${error.message}`);
    }
  }

  // ==================== Statistics ====================

  async getRateCardStats(): Promise<RateCardStats> {
    const { data: templates, error } = await supabase
      .from('rate_card_templates')
      .select('*');

    if (error) {
      throw new Error(`Failed to fetch rate card stats: ${error.message}`);
    }

    const stats: RateCardStats = {
      total_templates: templates.length,
      active_templates: templates.filter((t) => t.is_active).length,
      templates_by_category: {
        'Full Stack Custom': templates.filter((t) => t.category === 'Full Stack Custom').length,
        'AI/ML': templates.filter((t) => t.category === 'AI/ML').length,
        'Non Technical Roles': templates.filter((t) => t.category === 'Non Technical Roles').length,
      },
      templates_by_level: {
        Junior: templates.filter((t) => t.resource_level === 'Junior').length,
        Senior: templates.filter((t) => t.resource_level === 'Senior').length,
        Specialist: templates.filter((t) => t.resource_level === 'Specialist').length,
      },
      avg_rate_usd: templates.length > 0
        ? templates.reduce((sum, t) => sum + t.base_rate_usd, 0) / templates.length
        : 0,
      avg_rate_inr: templates.length > 0
        ? templates.reduce((sum, t) => sum + t.base_rate_inr, 0) / templates.length
        : 0,
    };

    return stats;
  }
}

export const rateCardService = new RateCardService();
