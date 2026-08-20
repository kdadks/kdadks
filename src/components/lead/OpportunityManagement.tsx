import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit, Trash2, X, Users, RefreshCw, TrendingUp, DollarSign, Filter, ArrowRightCircle, UserCheck, UserX } from 'lucide-react';
import { opportunityService } from '../../services/opportunityService';
import { leadService } from '../../services/leadService';
import { leadActivityService } from '../../services/leadActivityService';
import { invoiceService } from '../../services/invoiceService';
import { quoteService } from '../../services/quoteService';
import { useCompanyContext } from '../../contexts/CompanyContext';
import { useToast } from '../ui/ToastProvider';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../ui/ConfirmDialog';
import type { Opportunity, OpportunityStage, CreateOpportunityData, OpportunityFilters, OpportunityStats, Lead, LeadActivity } from '../../types/lead';
import type { Customer, CompanySettings, Country } from '../../types/invoice';
import { getCustomerDisplayIds } from '../../utils/customerCodeUtils';
import { formatCurrencyWithSymbol } from '../../utils/currencyConverter';

const SHARED_VALUE = '__shared__';

const OPPORTUNITY_STAGES: { value: OpportunityStage; label: string; color: string }[] = [
  { value: 'prospecting', label: 'Prospecting', color: 'bg-gray-100 text-gray-800' },
  { value: 'qualification', label: 'Qualification', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'proposal', label: 'Proposal', color: 'bg-blue-100 text-blue-800' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-800' },
  { value: 'closed_won', label: 'Closed Won', color: 'bg-green-100 text-green-800' },
  { value: 'closed_lost', label: 'Closed Lost', color: 'bg-red-100 text-red-800' }
];

const OpportunityManagement: React.FC = () => {
  const { selectedCompany, companies } = useCompanyContext();
  const { showSuccess, showError, showInfo } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [stats, setStats] = useState<OpportunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'opportunities' | 'create-opportunity'>('dashboard');
  const [filters, setFilters] = useState<OpportunityFilters>({});

  const entityId = selectedCompany?.id ?? null;

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [notes, setNotes] = useState<LeadActivity[]>([]);
  const [newNote, setNewNote] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  const [formData, setFormData] = useState<CreateOpportunityData>({
    opportunity_name: '',
    customer_id: '',
    lead_id: undefined,
    company_settings_id: entityId ?? undefined,
    stage: 'prospecting',
    probability: 10,
    estimated_value: 0,
    currency_code: selectedCompany?.country?.currency_code || 'INR',
    expected_close_date: '',
    description: '',
    next_steps: ''
  });

  useEffect(() => {
    loadData();
  }, [currentPage, searchTerm, activeTab, selectedCompany]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      const entityFilter = { company_settings_id: selectedCompany?.id };
      
      const [leadsData, customersData, countriesData] = await Promise.all([
        leadService.getLeads(entityFilter, 1, 1000),
        invoiceService.getCustomers(entityFilter, 1, 1000),
        invoiceService.getCountries()
      ]);
      setLeads(leadsData.data);
      setCustomers(customersData.data || []);
      setCountries(countriesData);
      
      if (activeTab === 'dashboard') {
        const [statsData, opportunitiesData] = await Promise.all([
          opportunityService.getOpportunityStats(entityId ?? undefined),
          opportunityService.getOpportunities({ ...filters, ...entityFilter }, 1, 10)
        ]);
        setStats(statsData);
        setOpportunities(opportunitiesData.data);
        setTotalPages(opportunitiesData.total_pages);
      } else if (activeTab === 'opportunities') {
        const opportunitiesData = await opportunityService.getOpportunities({ ...filters, ...entityFilter }, currentPage, 20);
        setOpportunities(opportunitiesData.data);
        setTotalPages(opportunitiesData.total_pages);
      }
    } catch (err) {
      showError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode: 'view' | 'edit' | 'add', opportunity?: Opportunity) => {
    setModalMode(mode);
    setSelectedOpportunity(opportunity ?? null);
    setNotes([]);
    setNewNote('');
    if (mode === 'add') {
      setFormData({
        opportunity_name: '', customer_id: '', lead_id: undefined,
        company_settings_id: entityId ?? undefined, stage: 'prospecting', probability: 10,
        estimated_value: 0, currency_code: selectedCompany?.country?.currency_code || 'INR', expected_close_date: '', description: '', next_steps: ''
      });
    } else if (opportunity) {
      setFormData({
        opportunity_name: opportunity.opportunity_name,
        customer_id: opportunity.customer_id || '',
        lead_id: opportunity.lead_id,
        company_settings_id: opportunity.company_settings_id ?? entityId ?? undefined,
        stage: opportunity.stage,
        probability: opportunity.probability,
        estimated_value: opportunity.estimated_value,
        currency_code: opportunity.currency_code,
        expected_close_date: opportunity.expected_close_date || '',
        description: opportunity.description || '',
        next_steps: opportunity.next_steps || ''
      });
      loadNotes(opportunity.id);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOpportunity(null);
    setModalLoading(false);
  };

  const loadNotes = async (opportunityId: string) => {
    setNotesLoading(true);
    try {
      const activities = await leadActivityService.getActivities({ opportunity_id: opportunityId });
      setNotes(activities.data.filter(a => a.activity_type === 'note'));
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedOpportunity) return;
    try {
      await leadActivityService.createActivity({
        opportunity_id: selectedOpportunity.id,
        activity_type: 'note',
        subject: 'Note',
        description: newNote.trim()
      });
      setNewNote('');
      loadNotes(selectedOpportunity.id);
      showSuccess('Note added successfully!');
    } catch (err) {
      showError(`Failed to add note: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleChange = (field: keyof CreateOpportunityData, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    if (!formData.opportunity_name?.trim()) errors.push('Opportunity name is required');
    if (!formData.customer_id) errors.push('Customer is required');
    return errors;
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (errors.length > 0) { showError(`Please fix: ${errors.join(', ')}`); return; }
    try {
      setModalLoading(true);
      if (modalMode === 'add') {
        const result = await opportunityService.createOpportunity(formData);
        setOpportunities(prev => [result, ...prev]);
        showSuccess(`Opportunity ${result.opportunity_number} created successfully!`);
      } else if (modalMode === 'edit' && selectedOpportunity) {
        const result = await opportunityService.updateOpportunity(selectedOpportunity.id, { ...formData, id: selectedOpportunity.id });
        setOpportunities(prev => prev.map(o => o.id === selectedOpportunity.id ? result : o));
        showSuccess(`Opportunity ${result.opportunity_number} updated successfully!`);
      }
      closeModal();
      loadData();
    } catch (err) {
      showError(`Failed to save opportunity: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setModalLoading(false);
    }
  };

  const handleStageChange = async (opportunity: Opportunity, newStage: OpportunityStage) => {
    try {
      const metadata: any = {};
      if (newStage === 'closed_won') metadata.actual_close_date = new Date().toISOString().split('T')[0];
      if (newStage === 'closed_lost') metadata.loss_reason = 'Manually closed lost';
      const updated = await opportunityService.updateOpportunityStage(opportunity.id, newStage, metadata);
      setOpportunities(prev => prev.map(o => o.id === opportunity.id ? updated : o));
      showSuccess(`Opportunity stage updated to ${newStage.replace('_', ' ')}`);
      loadData();
    } catch (err) {
      showError(`Failed to update stage: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async (opportunity: Opportunity) => {
    const confirmed = await confirm({ title: 'Delete Opportunity', message: `Delete opportunity "${opportunity.opportunity_name}"? This action cannot be undone.`, confirmText: 'Delete', type: 'danger' });
    if (!confirmed) return;
    try {
      await opportunityService.deleteOpportunity(opportunity.id);
      showSuccess('Opportunity deleted successfully!');
      loadData();
    } catch (err) {
      showError(`Failed to delete opportunity: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleConvertToQuote = async (opportunity: Opportunity) => {
    const confirmed = await confirm({
      title: 'Convert to Quote',
      message: `Convert opportunity "${opportunity.opportunity_name}" to a quote?\n\nThis will create a new quote based on the opportunity details.`,
      confirmText: 'Convert',
      type: 'info'
    });
    if (!confirmed) return;
    try {
      showInfo('Converting opportunity to quote...');
      const result = await opportunityService.convertOpportunityToQuote(opportunity.id, {});
      showSuccess(`Opportunity converted to quote ${result.quoteNumber} successfully!`);
      loadData();
    } catch (err) {
      showError(`Failed to convert opportunity: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadData();
  };

  const entitySelectValue = (formData.company_settings_id ?? SHARED_VALUE) as string;
  const handleEntityChange = (val: string) => {
    setFormData(prev => ({ ...prev, company_settings_id: val === SHARED_VALUE ? undefined : val }));
  };

  const renderStageBadge = (stage: OpportunityStage) => {
    const stageConfig = OPPORTUNITY_STAGES.find(s => s.value === stage) || OPPORTUNITY_STAGES[0];
    return <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stageConfig.color}`}>{stageConfig.label.replace('_', ' ')}</span>;
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog {...dialogProps} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Opportunities</h2>
          {selectedCompany && (<p className="text-sm text-gray-500 mt-1">Showing opportunities for <span className="font-medium text-blue-600">{selectedCompany.company_name}</span></p>)}
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <button onClick={loadData} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"><RefreshCw className="w-4 h-4 mr-2" />Refresh</button>
          <button onClick={() => openModal('add')} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Add Opportunity</button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[{ key: 'dashboard', label: 'Dashboard' }, { key: 'opportunities', label: 'All Opportunities' }, { key: 'create-opportunity', label: 'Create Opportunity' }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`${
              activeTab === tab.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>{tab.label}</button>
          ))}
        </nav>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Opportunities', value: stats?.total_opportunities || 0, icon: TrendingUp, color: 'text-blue-600' },
               { label: 'Open Pipeline', value: stats?.open_pipeline_value || 0, icon: DollarSign, color: 'text-green-600' },
              { label: 'Closed Won', value: stats?.closed_won_opportunities || 0, icon: Users, color: 'text-green-600' },
              { label: 'Closed Lost', value: stats?.closed_lost_opportunities || 0, icon: Users, color: 'text-red-600' }
            ].map(stat => (
              <div key={stat.label} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                   <div><p className="text-sm text-gray-600">{stat.label}</p><p className="text-2xl font-semibold text-gray-900">{stat.value.toLocaleString()}</p></div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200"><h3 className="text-lg font-medium text-gray-900">Recent Opportunities</h3></div>
            {loading ? <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div> : opportunities.length === 0 ? <div className="text-center py-12 text-gray-500">No opportunities found</div> : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opportunity #</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th></tr></thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {opportunities.slice(0, 10).map(opp => (
                      <tr key={opp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{opp.opportunity_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{opp.opportunity_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{opp.customer?.company_name || opp.customer?.contact_person || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{renderStageBadge(opp.stage)}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrencyWithSymbol(opp.estimated_value || 0, opp.currency_code || 'INR')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{opp.company_settings?.company_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'opportunities' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative"><Search className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none h-5 w-5 text-gray-400" /><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" placeholder="Search opportunities..." /></div>
              <select value={filters.stage || ''} onChange={e => setFilters(prev => ({ ...prev, stage: e.target.value as OpportunityStage || undefined }))} className="px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500"><option value="">All Stages</option>{OPPORTUNITY_STAGES.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}</select>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"><Filter className="w-4 h-4 mr-2" />Filter</button>
            </form>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div> : opportunities.length === 0 ? (
              <div className="text-center py-12"><TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">No Opportunities Found</h3><p className="text-gray-500 mb-4">{searchTerm ? 'No opportunities match your search.' : 'No opportunities yet. Create your first opportunity to get started.'}</p>{!searchTerm && <button onClick={() => openModal('add')} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Add Opportunity</button>}</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opportunity #</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {opportunities.map(opp => (
                        <tr key={opp.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{opp.opportunity_number}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{opp.opportunity_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{opp.customer?.company_name || opp.customer?.contact_person || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{renderStageBadge(opp.stage)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrencyWithSymbol(opp.estimated_value || 0, opp.currency_code || 'INR')}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{opp.company_settings?.company_name || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button onClick={() => openModal('view', opp)} className="text-blue-600 hover:text-blue-900" title="View"><Eye className="w-4 h-4" /></button>
                              <button onClick={() => openModal('edit', opp)} className="text-gray-600 hover:text-gray-900" title="Edit"><Edit className="w-4 h-4" /></button>
                              {opp.stage === 'prospecting' && <button onClick={() => handleStageChange(opp, 'qualification')} className="text-blue-600 hover:text-blue-900" title="Move to Qualification">→</button>}
                              {opp.stage === 'qualification' && <button onClick={() => handleStageChange(opp, 'proposal')} className="text-blue-600 hover:text-blue-900" title="Move to Proposal">→</button>}
                              {opp.stage === 'proposal' && <button onClick={() => handleStageChange(opp, 'negotiation')} className="text-blue-600 hover:text-blue-900" title="Move to Negotiation">→</button>}
                              {opp.stage === 'negotiation' && <><button onClick={() => handleStageChange(opp, 'closed_won')} className="text-green-600 hover:text-green-900" title="Close Won"><UserCheck className="w-4 h-4" /></button><button onClick={() => handleStageChange(opp, 'closed_lost')} className="text-red-600 hover:text-red-900" title="Close Lost"><UserX className="w-4 h-4" /></button></>}
                              {opp.stage === 'closed_won' && <button onClick={() => handleConvertToQuote(opp)} className="text-purple-600 hover:text-purple-900" title="Convert to Quote"><ArrowRightCircle className="w-4 h-4" /></button>}
                              <button onClick={() => handleDelete(opp)} className="text-red-600 hover:text-red-900" title="Delete"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">Page {currentPage} of {totalPages}</div>
                    <div className="flex space-x-2">
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50">Previous</button>
                      <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50">Next</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'create-opportunity' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Create Opportunity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Opportunity Name *</label><input type="text" value={formData.opportunity_name} onChange={e => handleChange('opportunity_name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="Enter opportunity name" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label><select value={formData.customer_id} onChange={e => handleChange('customer_id', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500"><option value="">Select Customer</option>{customers.map(c => (<option key={c.id} value={c.id}>{c.company_name || c.contact_person}</option>))}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Associate Lead (Optional)</label><select value={formData.lead_id || ''} onChange={e => handleChange('lead_id', e.target.value || undefined)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500"><option value="">Select Lead</option>{leads.map(l => (<option key={l.id} value={l.id}>{l.lead_number ? `#${l.lead_number} - ` : ''}{l.first_name} {l.last_name} ({l.company_name || 'No Company'}) [{l.status?.toUpperCase() || 'LEAD'}]</option>))}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Estimated Value ({formData.currency_code || 'INR'})</label><input type="number" value={formData.estimated_value} onChange={e => handleChange('estimated_value', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="0.00" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Expected Close Date</label><input type="date" value={formData.expected_close_date} onChange={e => handleChange('expected_close_date', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Stage</label><select value={formData.stage} onChange={e => handleChange('stage', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500">{OPPORTUNITY_STAGES.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Currency</label><select value={formData.currency_code || 'INR'} onChange={e => handleChange('currency_code', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500">{countries.map(c => (<option key={c.id} value={c.currency_code}>{c.currency_code} - {c.currency_name}</option>))}</select></div>
          </div>
          <div className="mt-4"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} rows={3} placeholder="Enter opportunity description..." className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" /></div>
          <div className="mt-6 flex justify-end space-x-3">
            <button onClick={() => setActiveTab('opportunities')} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300">Cancel</button>
            <button onClick={handleSave} disabled={modalLoading} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">{modalLoading ? 'Saving...' : 'Create Opportunity'}</button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{modalMode === 'view' ? 'Opportunity Details' : modalMode === 'edit' ? 'Edit Opportunity' : 'Add Opportunity'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <label className="block text-sm font-semibold text-blue-900 mb-1">Entity Association</label>
                <select value={entitySelectValue} onChange={e => handleEntityChange(e.target.value)} disabled={modalMode === 'view'} className="w-full px-3 py-2 border border-blue-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 text-sm">
                  <option value={SHARED_VALUE}>All Entities (Shared)</option>
                  {companies.map(c => (<option key={c.id} value={c.id}>{c.company_name}</option>))}
                </select>
              </div>
               <div className="grid grid-cols-2 gap-4">
                 <div><label className="block text-sm font-medium text-gray-700 mb-1">Opportunity Name *</label><input type="text" value={formData.opportunity_name} onChange={e => handleChange('opportunity_name', e.target.value)} disabled={modalMode === 'view'} placeholder="Enter opportunity name" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50" /></div>
                 <div><label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label><select value={formData.customer_id} onChange={e => handleChange('customer_id', e.target.value)} disabled={modalMode === 'view'} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"><option value="">Select Customer</option>{customers.map(c => (<option key={c.id} value={c.id}>{c.company_name || c.contact_person}</option>))}</select></div>
                 <div><label className="block text-sm font-medium text-gray-700 mb-1">Associate Lead</label><select value={formData.lead_id || ''} onChange={e => handleChange('lead_id', e.target.value || undefined)} disabled={modalMode === 'view'} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"><option value="">Select Lead</option>{leads.map(l => (<option key={l.id} value={l.id}>{l.lead_number ? `#${l.lead_number} - ` : ''}{l.first_name} {l.last_name} ({l.company_name || 'No Company'}) [{l.status?.toUpperCase() || 'LEAD'}]</option>))}</select></div>
                 <div><label className="block text-sm font-medium text-gray-700 mb-1">Stage</label><select value={formData.stage} onChange={e => handleChange('stage', e.target.value)} disabled={modalMode === 'view'} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50">{OPPORTUNITY_STAGES.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}</select></div>
                 <div><label className="block text-sm font-medium text-gray-700 mb-1">Currency</label><select value={formData.currency_code || 'INR'} onChange={e => handleChange('currency_code', e.target.value)} disabled={modalMode === 'view'} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50">{countries.map(c => (<option key={c.id} value={c.currency_code}>{c.currency_code} - {c.currency_name}</option>))}</select></div>
                 <div><label className="block text-sm font-medium text-gray-700 mb-1">Estimated Value ({formData.currency_code || 'INR'})</label><input type="number" value={formData.estimated_value} onChange={e => handleChange('estimated_value', parseFloat(e.target.value) || 0)} disabled={modalMode === 'view'} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50" /></div>
                 <div><label className="block text-sm font-medium text-gray-700 mb-1">Expected Close Date</label><input type="date" value={formData.expected_close_date} onChange={e => handleChange('expected_close_date', e.target.value)} disabled={modalMode === 'view'} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50" /></div>
               </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} disabled={modalMode === 'view'} rows={3} placeholder="Enter opportunity description..." className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50" /></div>
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Notes</h4>
                {notesLoading ? (
                  <div className="text-center py-4 text-gray-500">Loading notes...</div>
                ) : notes.length === 0 ? (
                  <p className="text-sm text-gray-500 mb-3">No notes yet.</p>
                ) : (
                  <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                    {notes.map(note => (
                      <div key={note.id} className="bg-gray-50 rounded-md p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">{new Date(note.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-gray-900 mt-1">{note.description || note.subject}</p>
                      </div>
                    ))}
                  </div>
                )}
                {modalMode !== 'view' && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      placeholder="Add a note..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                      onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                    />
                    <button onClick={handleAddNote} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">Add</button>
                  </div>
                )}
              </div>
            </div>
            {modalMode !== 'view' && (
              <div className="flex justify-end space-x-3 mt-6">
                <button onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300">Cancel</button>
                <button onClick={handleSave} disabled={modalLoading} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">{modalLoading ? 'Saving...' : 'Save Opportunity'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunityManagement;
