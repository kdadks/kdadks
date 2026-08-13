import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit, Trash2, X, Users, RefreshCw, TrendingUp, UserCheck, UserX, Mail, Phone, Building2, Filter } from 'lucide-react';
import { leadService } from '../../services/leadService';
import { leadActivityService } from '../../services/leadActivityService';
import { invoiceService } from '../../services/invoiceService';
import { useCompanyContext } from '../../contexts/CompanyContext';
import { useToast } from '../ui/ToastProvider';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../ui/ConfirmDialog';
import type { Lead, LeadStatus, LeadSource, CreateLeadData, LeadFilters, LeadStats } from '../../types/lead';
import type { Customer, CompanySettings, Country } from '../../types/invoice';
import { getTaxRegistrationLabel, getTaxLabel } from '../../utils/taxUtils';
import { getCustomerDisplayIds } from '../../utils/customerCodeUtils';

const SHARED_VALUE = '__shared__';

const LEAD_STATUSES: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-gray-100 text-gray-800' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-800' },
  { value: 'qualified', label: 'Qualified', color: 'bg-green-100 text-green-800' },
  { value: 'disqualified', label: 'Disqualified', color: 'bg-red-100 text-red-800' },
  { value: 'converted', label: 'Converted', color: 'bg-purple-100 text-purple-800' }
];

const LEAD_SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'partner', label: 'Partner' },
  { value: 'other', label: 'Other' }
];

const LeadManagement: React.FC = () => {
  const { selectedCompany, companies } = useCompanyContext();
  const { showSuccess, showError, showInfo } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'create-lead'>('dashboard');
  const [filters, setFilters] = useState<LeadFilters>({});

  const entityId = selectedCompany?.id ?? null;

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState<CreateLeadData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_title: '',
    company_name: '',
    source: 'website',
    description: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country_id: selectedCompany?.country_id || 'IN',
    company_settings_id: entityId ?? undefined,
    customer_id: undefined,
    budget_min: undefined,
    budget_max: undefined,
    expected_close_date: undefined,
    gstin: '',
    pan: '',
    vat_number: '',
    cro_number: ''
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
      
      if (activeTab === 'dashboard') {
        const [statsData, leadsData, customersData, countriesData] = await Promise.all([
          leadService.getLeadStats(),
          leadService.getLeads(filters, 1, 10),
          invoiceService.getCustomers(entityFilter, 1, 1000),
          invoiceService.getCountries()
        ]);
        setStats(statsData);
        setLeads(leadsData.data);
        setTotalPages(leadsData.total_pages);
        setCustomers(customersData.data || []);
        setCountries(countriesData);
      } else if (activeTab === 'leads') {
        const [leadsData, customersData] = await Promise.all([
          leadService.getLeads({ ...filters, ...entityFilter }, currentPage, 20),
          invoiceService.getCustomers(entityFilter, 1, 1000)
        ]);
        setLeads(leadsData.data);
        setTotalPages(leadsData.total_pages);
        setCustomers(customersData.data || []);
      } else if (activeTab === 'create-lead') {
        const [customersData, countriesData] = await Promise.all([
          invoiceService.getCustomers(entityFilter, 1, 1000),
          invoiceService.getCountries()
        ]);
        setCustomers(customersData.data || []);
        setCountries(countriesData);
      }
    } catch (err) {
      showError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode: 'view' | 'edit' | 'add', lead?: Lead) => {
    setModalMode(mode);
    setSelectedLead(lead ?? null);
    if (mode === 'add') {
      setFormData({
        first_name: '', last_name: '', email: '', phone: '', job_title: '', company_name: '',
        source: 'website', description: '', address_line1: '', address_line2: '', city: '', state: '', postal_code: '',
        country_id: selectedCompany?.country_id || 'IN',
        company_settings_id: entityId ?? undefined, customer_id: undefined,
        budget_min: undefined, budget_max: undefined, expected_close_date: undefined,
        gstin: '', pan: '', vat_number: '', cro_number: ''
      });
    } else if (lead) {
      setFormData({
        first_name: lead.first_name, last_name: lead.last_name, email: lead.email || '', phone: lead.phone || '',
        job_title: lead.job_title || '', company_name: lead.company_name || '', source: lead.source,
        description: lead.description || '', address_line1: lead.address_line1 || '', address_line2: lead.address_line2 || '',
        city: lead.city || '', state: lead.state || '', postal_code: lead.postal_code || '',
        country_id: lead.country_id || selectedCompany?.country_id || 'IN',
        company_settings_id: lead.company_settings_id ?? entityId ?? undefined,
        customer_id: lead.customer_id || undefined,
        budget_min: lead.budget_min, budget_max: lead.budget_max, expected_close_date: lead.expected_close_date || undefined,
        gstin: lead.gstin || '', pan: lead.pan || '', vat_number: lead.vat_number || '', cro_number: lead.cro_number || ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedLead(null);
    setModalLoading(false);
  };

  const handleChange = (field: keyof CreateLeadData, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    if (!formData.first_name?.trim() && !formData.last_name?.trim()) errors.push('First name or last name is required');
    if (formData.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.push('Please enter a valid email address');
    if (formData.phone?.trim() && !/^[+]?[1-9][\d]{3,14}$/.test(formData.phone.replace(/[\s\-()]/g, ''))) errors.push('Please enter a valid phone number');
    if (formData.pan?.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan)) errors.push('Please enter a valid PAN (e.g., ABCDE1234F)');
    return errors;
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (errors.length > 0) { showError(`Please fix: ${errors.join(', ')}`); return; }
    try {
      setModalLoading(true);
      if (modalMode === 'add') {
        const result = await leadService.createLead(formData);
        setLeads(prev => [result, ...prev]);
        showSuccess(`Lead ${result.lead_number} created successfully!`);
      } else if (modalMode === 'edit' && selectedLead) {
        const result = await leadService.updateLead(selectedLead.id, { ...formData, id: selectedLead.id });
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? result : l));
        showSuccess(`Lead ${result.lead_number} updated successfully!`);
      }
      closeModal();
      loadData();
    } catch (err) {
      showError(`Failed to save lead: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setModalLoading(false);
    }
  };

  const handleStatusChange = async (lead: Lead, newStatus: LeadStatus) => {
    try {
      const metadata: any = {};
      if (newStatus === 'qualified') metadata.qualified_at = new Date().toISOString();
      else if (newStatus === 'disqualified') { metadata.disqualified_at = new Date().toISOString(); metadata.disqualified_reason = 'Manually disqualified'; }
      else if (newStatus === 'converted') metadata.converted_at = new Date().toISOString();
      const updated = await leadService.updateLeadStatus(lead.id, newStatus, metadata);
      setLeads(prev => prev.map(l => l.id === lead.id ? updated : l));
      showSuccess(`Lead status updated to ${newStatus}`);
      loadData();
    } catch (err) {
      showError(`Failed to update status: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async (lead: Lead) => {
    const confirmed = await confirm({ title: 'Delete Lead', message: `Delete lead "${lead.first_name} ${lead.last_name}"? This action cannot be undone.`, confirmText: 'Delete', type: 'danger' });
    if (!confirmed) return;
    try {
      await leadService.deleteLead(lead.id);
      showSuccess('Lead deleted successfully!');
      loadData();
    } catch (err) {
      showError(`Failed to delete lead: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadData();
  };

  const selectedCountryForForm = countries.find(c => c.id === formData.country_id);
  const leadWithCountry = { country: selectedCountryForForm } as any;
  const taxRegLabel = getTaxRegistrationLabel(leadWithCountry);
  const isGST = getTaxLabel(leadWithCountry) === 'IGST';

  const entitySelectValue = (formData.company_settings_id ?? SHARED_VALUE) as string;
  const handleEntityChange = (val: string) => {
    setFormData(prev => ({ ...prev, company_settings_id: val === SHARED_VALUE ? undefined : val }));
  };

  const renderStatusBadge = (status: LeadStatus) => {
    const statusConfig = LEAD_STATUSES.find(s => s.value === status) || LEAD_STATUSES[0];
    return <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusConfig.color}`}>{statusConfig.label}</span>;
  };

  const renderSourceBadge = (source: LeadSource) => {
    const sourceConfig = LEAD_SOURCES.find(s => s.value === source);
    return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">{sourceConfig?.label || source}</span>;
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog {...dialogProps} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leads</h2>
          {selectedCompany && (<p className="text-sm text-gray-500 mt-1">Showing leads for <span className="font-medium text-blue-600">{selectedCompany.company_name}</span></p>)}
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <button onClick={loadData} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"><RefreshCw className="w-4 h-4 mr-2" />Refresh</button>
          <button onClick={() => openModal('add')} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Add Lead</button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[{ key: 'dashboard', label: 'Dashboard' }, { key: 'leads', label: 'All Leads' }, { key: 'create-lead', label: 'Create Lead' }].map(tab => (
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
              { label: 'Total Leads', value: stats?.total_leads || 0, icon: Users, color: 'text-blue-600' },
              { label: 'New Leads', value: stats?.new_leads || 0, icon: Mail, color: 'text-gray-600' },
              { label: 'Qualified', value: stats?.qualified_leads || 0, icon: UserCheck, color: 'text-green-600' },
              { label: 'Converted', value: stats?.converted_leads || 0, icon: TrendingUp, color: 'text-purple-600' }
            ].map(stat => (
              <div key={stat.label} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-gray-600">{stat.label}</p><p className="text-2xl font-semibold text-gray-900">{stat.value}</p></div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200"><h3 className="text-lg font-medium text-gray-900">Recent Leads</h3></div>
            {loading ? <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div> : leads.length === 0 ? <div className="text-center py-12 text-gray-500">No leads found</div> : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead #</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th></tr></thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leads.slice(0, 10).map(lead => (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lead.lead_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{lead.first_name} {lead.last_name}</div><div className="text-sm text-gray-500">{lead.email || lead.phone}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.company_name || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{renderSourceBadge(lead.source)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{renderStatusBadge(lead.status)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.company_settings ? lead.company_settings.company_name : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'leads' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative"><Search className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none h-5 w-5 text-gray-400" /><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" placeholder="Search leads by name, email, company..." /></div>
              <select value={filters.status || ''} onChange={e => setFilters(prev => ({ ...prev, status: e.target.value as LeadStatus || undefined }))} className="px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500"><option value="">All Statuses</option>{LEAD_STATUSES.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}</select>
              <select value={filters.source || ''} onChange={e => setFilters(prev => ({ ...prev, source: e.target.value as LeadSource || undefined }))} className="px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500"><option value="">All Sources</option>{LEAD_SOURCES.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}</select>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"><Filter className="w-4 h-4 mr-2" />Filter</button>
            </form>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div> : leads.length === 0 ? (
              <div className="text-center py-12"><Users className="h-16 w-16 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">No Leads Found</h3><p className="text-gray-500 mb-4">{searchTerm ? 'No leads match your search.' : 'No leads yet. Add your first lead to get started.'}</p>{!searchTerm && <button onClick={() => openModal('add')} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Add Lead</button>}</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead #</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {leads.map(lead => (
                        <tr key={lead.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lead.lead_number}</td>
                          <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{lead.first_name} {lead.last_name}</div><div className="text-sm text-gray-500">{lead.email || lead.phone}</div></td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.company_name || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{renderSourceBadge(lead.source)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{renderStatusBadge(lead.status)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.budget_min || lead.budget_max ? `$${(lead.budget_min || 0).toLocaleString()} - $${(lead.budget_max || 0).toLocaleString()}` : '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.company_settings ? lead.company_settings.company_name : '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button onClick={() => openModal('view', lead)} className="text-blue-600 hover:text-blue-900" title="View"><Eye className="w-4 h-4" /></button>
                              <button onClick={() => openModal('edit', lead)} className="text-gray-600 hover:text-gray-900" title="Edit"><Edit className="w-4 h-4" /></button>
                              {lead.status === 'new' && <button onClick={() => handleStatusChange(lead, 'contacted')} className="text-blue-600 hover:text-blue-900" title="Mark Contacted"><Phone className="w-4 h-4" /></button>}
                              {lead.status === 'contacted' && <button onClick={() => handleStatusChange(lead, 'qualified')} className="text-green-600 hover:text-green-900" title="Mark Qualified"><UserCheck className="w-4 h-4" /></button>}
                              {(lead.status === 'new' || lead.status === 'contacted') && <button onClick={() => handleStatusChange(lead, 'disqualified')} className="text-red-600 hover:text-red-900" title="Disqualify"><UserX className="w-4 h-4" /></button>}
                              <button onClick={() => handleDelete(lead)} className="text-red-600 hover:text-red-900" title="Delete"><Trash2 className="w-4 h-4" /></button>
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

      {activeTab === 'create-lead' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Create Lead</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label><input type="text" value={formData.first_name} onChange={e => handleChange('first_name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="Enter first name" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label><input type="text" value={formData.last_name} onChange={e => handleChange('last_name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="Enter last name" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="Enter email" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="tel" value={formData.phone} onChange={e => handleChange('phone', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="Enter phone" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label><input type="text" value={formData.job_title} onChange={e => handleChange('job_title', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="Enter job title" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label><input type="text" value={formData.company_name} onChange={e => handleChange('company_name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="Enter company name" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Source</label><select value={formData.source} onChange={e => handleChange('source', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500">{LEAD_SOURCES.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Associate Customer</label><select value={formData.customer_id || ''} onChange={e => handleChange('customer_id', e.target.value || undefined)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500"><option value="">Select Customer (Optional)</option>{customers.map(c => (<option key={c.id} value={c.id}>{c.company_name || c.contact_person}</option>))}</select></div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button onClick={() => setActiveTab('leads')} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300">Cancel</button>
            <button onClick={handleSave} disabled={modalLoading} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">{modalLoading ? 'Saving...' : 'Create Lead'}</button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{modalMode === 'view' ? 'Lead Details' : modalMode === 'edit' ? 'Edit Lead' : 'Add Lead'}</h3>
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
                <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label><input type="text" value={formData.first_name} onChange={e => handleChange('first_name', e.target.value)} disabled={modalMode === 'view'} placeholder="Enter first name" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label><input type="text" value={formData.last_name} onChange={e => handleChange('last_name', e.target.value)} disabled={modalMode === 'view'} placeholder="Enter last name" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} disabled={modalMode === 'view'} placeholder="Enter email" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="tel" value={formData.phone} onChange={e => handleChange('phone', e.target.value)} disabled={modalMode === 'view'} placeholder="Enter phone" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label><input type="text" value={formData.job_title} onChange={e => handleChange('job_title', e.target.value)} disabled={modalMode === 'view'} placeholder="Enter job title" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label><input type="text" value={formData.company_name} onChange={e => handleChange('company_name', e.target.value)} disabled={modalMode === 'view'} placeholder="Enter company name" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Source</label><select value={formData.source} onChange={e => handleChange('source', e.target.value)} disabled={modalMode === 'view'} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50">{LEAD_SOURCES.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Associate Customer</label><select value={formData.customer_id || ''} onChange={e => handleChange('customer_id', e.target.value || undefined)} disabled={modalMode === 'view'} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"><option value="">Select Customer (Optional)</option>{customers.map(c => (<option key={c.id} value={c.id}>{c.company_name || c.contact_person}</option>))}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {isGST ? (<>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label><input type="text" value={formData.gstin} onChange={e => handleChange('gstin', e.target.value.toUpperCase())} disabled={modalMode === 'view'} placeholder="e.g., 22AAAAA0000A1Z5" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">PAN</label><input type="text" value={formData.pan} onChange={e => handleChange('pan', e.target.value.toUpperCase())} disabled={modalMode === 'view'} placeholder="e.g., ABCDE1234F" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50" /></div>
                </>) : (<>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">VAT Number</label><input type="text" value={formData.vat_number} onChange={e => handleChange('vat_number', e.target.value.toUpperCase())} disabled={modalMode === 'view'} placeholder="Enter VAT Number" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">CRO Number</label><input type="text" value={formData.cro_number} onChange={e => handleChange('cro_number', e.target.value.toUpperCase())} disabled={modalMode === 'view'} placeholder="Enter CRO Number" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50" /></div>
                </>)}
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} disabled={modalMode === 'view'} rows={3} placeholder="Enter lead description..." className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50" /></div>
            </div>
            {modalMode !== 'view' && (
              <div className="flex justify-end space-x-3 mt-6">
                <button onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300">Cancel</button>
                <button onClick={handleSave} disabled={modalLoading} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">{modalLoading ? 'Saving...' : 'Save Lead'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadManagement;
