import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit, Trash2, X, Users, RefreshCw, TrendingUp, UserCheck, UserX, Mail, Phone, Building2, Filter, Bell, AlertTriangle, CheckCircle, Clock, Calendar, Flag, Activity, ChevronDown, ChevronRight, AlertCircle, MessageSquare, CheckSquare } from 'lucide-react';
import { leadService } from '../../services/leadService';
import { leadActivityService } from '../../services/leadActivityService';
import { leadFollowUpTaskService } from '../../services/leadFollowUpService';
import { invoiceService } from '../../services/invoiceService';
import { useCompanyContext } from '../../contexts/CompanyContext';
import { useToast } from '../ui/ToastProvider';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../ui/ConfirmDialog';
import type { Lead, LeadStatus, LeadSource, CreateLeadData, LeadFilters, LeadStats, LeadActivity, LeadFollowUpTask, LeadFollowUpTaskFilters, LeadFollowUpTaskStats, LeadTimelineEntry, FollowUpTaskStatus, FollowUpTaskPriority, CreateLeadFollowUpTaskData, LeadAlert } from '../../types/lead';
import type { Customer, CompanySettings, Country } from '../../types/invoice';
import { getTaxRegistrationLabel, getTaxLabel } from '../../utils/taxUtils';
import { getCustomerDisplayIds } from '../../utils/customerCodeUtils';
import { formatCurrencyWithSymbol } from '../../utils/currencyConverter';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'create-lead' | 'tasks' | 'timeline'>('dashboard');
  const [filters, setFilters] = useState<LeadFilters>({});
  
  const [followUpTasks, setFollowUpTasks] = useState<LeadFollowUpTask[]>([]);
  const [taskStats, setTaskStats] = useState<LeadFollowUpTaskStats | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskPage, setTaskPage] = useState(1);
  const [taskTotalPages, setTaskTotalPages] = useState(1);
  const [taskFilters, setTaskFilters] = useState<LeadFollowUpTaskFilters>({});
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<'add' | 'edit'>('add');
  const [selectedTask, setSelectedTask] = useState<LeadFollowUpTask | null>(null);
  const [taskFormData, setTaskFormData] = useState<CreateLeadFollowUpTaskData>({
    lead_id: '',
    title: '',
    due_date: '',
    priority: 'medium',
    recurrence: 'none'
  });
  
  // Action Task Modal with Notes state
  const [showActionTaskModal, setShowActionTaskModal] = useState(false);
  const [actionTask, setActionTask] = useState<LeadFollowUpTask | null>(null);
  const [actionType, setActionType] = useState<'complete' | 'in_progress' | 'cancel'>('complete');
  const [actionNotes, setActionNotes] = useState('');
  const [scheduleNextTask, setScheduleNextTask] = useState(false);
  const [nextTaskData, setNextTaskData] = useState({
    title: '',
    due_date: '',
    priority: 'medium' as FollowUpTaskPriority
  });
  
  const [timeline, setTimeline] = useState<LeadTimelineEntry[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [selectedLeadForTimeline, setSelectedLeadForTimeline] = useState<Lead | null>(null);
  
  const [alerts, setAlerts] = useState<LeadAlert[]>([]);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);

  const entityId = selectedCompany?.id ?? null;

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [notes, setNotes] = useState<LeadActivity[]>([]);
  const [newNote, setNewNote] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
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
    currency_code: selectedCompany?.country?.currency_code || 'INR',
    expected_close_date: undefined,
    gstin: '',
    pan: '',
    vat_number: '',
    cro_number: ''
  });

  useEffect(() => {
    loadData();
    if (activeTab === 'tasks') loadFollowUpTasks();
    if (activeTab === 'timeline') loadAlerts();
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
          leadService.getLeadStats(entityId ?? undefined),
          leadService.getLeads({ ...filters, ...entityFilter }, 1, 10),
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
      } else if (activeTab === 'tasks') {
        await loadFollowUpTasks();
      } else if (activeTab === 'timeline') {
        const [leadsData] = await Promise.all([
          leadService.getLeads({ ...filters, company_settings_id: selectedCompany?.id || undefined }, 1, 1000)
        ]);
        setLeads(leadsData.data);
        await loadAlerts();
      }
    } catch (err) {
      showError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowUpTasks = async () => {
    try {
      setTaskLoading(true);
      const [tasksData, statsData] = await Promise.all([
        leadFollowUpTaskService.getFollowUpTasks({ ...taskFilters, ...(entityId ? { company_settings_id: entityId } : {}) }, taskPage, 20),
        leadFollowUpTaskService.getFollowUpTaskStats(entityId || undefined)
      ]);
      setFollowUpTasks(tasksData.data);
      setTaskTotalPages(tasksData.total_pages);
      setTaskStats(statsData);
    } catch (err) {
      showError(`Failed to load tasks: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTaskLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const [overdueTasks, staleLeads] = await Promise.all([
        leadFollowUpTaskService.getOverdueFollowUpTasks(entityId || undefined),
        leadFollowUpTaskService.getStaleLeads(entityId || undefined)
      ]);
      
      const alertList: LeadAlert[] = [];
      
      for (const task of overdueTasks) {
        alertList.push({
          id: `overdue-${task.id}`,
          lead_id: task.lead_id,
          alert_type: 'overdue_follow_up',
          severity: 'critical',
          title: 'Overdue Follow-up Task',
          message: `"${task.title}" was due on ${new Date(task.due_date).toLocaleDateString()}`,
          is_read: false,
          created_at: task.due_date,
          lead: task.lead
        });
      }
      
      for (const lead of staleLeads) {
        alertList.push({
          id: `stale-${lead.id}`,
          lead_id: lead.id,
          alert_type: 'stale_lead',
          severity: 'warning',
          title: 'Stale Lead - No Activity',
          message: `Lead "${lead.first_name} ${lead.last_name}" has had no activity for 14+ days`,
          is_read: false,
          created_at: lead.updated_at,
          lead
        });
      }
      
      alertList.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 } as const;
        return severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder] || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      setAlerts(alertList);
    } catch (err) {
      showError(`Failed to load alerts: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeline = async (leadId: string) => {
    setTimelineLoading(true);
    try {
      const timelineData = await leadActivityService.getLeadTimeline(leadId);
      setTimeline(timelineData);
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setTimelineLoading(false);
    }
  };

  const openModal = (mode: 'view' | 'edit' | 'add', lead?: Lead) => {
    setModalMode(mode);
    setSelectedLead(lead ?? null);
    setNotes([]);
    setNewNote('');
    if (mode === 'add') {
      setFormData({
        first_name: '', last_name: '', email: '', phone: '', job_title: '', company_name: '',
        source: 'website', description: '', address_line1: '', address_line2: '', city: '', state: '', postal_code: '',
        country_id: selectedCompany?.country_id || 'IN',
        company_settings_id: entityId ?? undefined, customer_id: undefined,
        budget_min: undefined, budget_max: undefined, currency_code: selectedCompany?.country?.currency_code || 'INR', expected_close_date: undefined,
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
        budget_min: lead.budget_min, budget_max: lead.budget_max, currency_code: lead.currency_code || selectedCompany?.country?.currency_code || 'INR', expected_close_date: lead.expected_close_date || undefined,
        gstin: lead.gstin || '', pan: lead.pan || '', vat_number: lead.vat_number || '', cro_number: lead.cro_number || ''
      });
      loadNotes(lead.id);
      loadTimeline(lead.id);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedLead(null);
    setModalLoading(false);
  };

  const loadNotes = async (leadId: string) => {
    setNotesLoading(true);
    try {
      const activities = await leadActivityService.getActivities({ lead_id: leadId });
      setNotes(activities.data.filter(a => a.activity_type === 'note'));
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setNotesLoading(false);
    }
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

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedLead) return;
    try {
      await leadActivityService.createActivity({
        lead_id: selectedLead.id,
        activity_type: 'note',
        subject: 'Note',
        description: newNote.trim()
      });
      setNewNote('');
      loadNotes(selectedLead.id);
      showSuccess('Note added successfully!');
    } catch (err) {
      showError(`Failed to add note: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

  const handleCreateTask = async () => {
    if (!taskFormData.title.trim() || !taskFormData.due_date || !taskFormData.lead_id) return;
    try {
      await leadFollowUpTaskService.createFollowUpTask(taskFormData);
      showSuccess('Follow-up task created successfully!');
      setShowTaskModal(false);
      setTaskFormData({ lead_id: '', title: '', due_date: '', priority: 'medium', recurrence: 'none' });
      loadFollowUpTasks();
    } catch (err) {
      showError(`Failed to create task: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleOpenActionModal = (task: LeadFollowUpTask) => {
    setActionTask(task);
    setActionType('complete');
    setActionNotes('');
    setScheduleNextTask(false);
    const nextDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    setNextTaskData({
      title: `Follow up with ${task.lead ? `${task.lead.first_name} ${task.lead.last_name}` : 'Lead'}`,
      due_date: nextDate,
      priority: 'medium'
    });
    setShowActionTaskModal(true);
  };

  const handleSaveTaskAction = async () => {
    if (!actionTask) return;
    try {
      setTaskLoading(true);
      await leadFollowUpTaskService.actionFollowUpTask(
        actionTask.id,
        actionType,
        actionNotes.trim() || undefined,
        scheduleNextTask ? {
          lead_id: actionTask.lead_id,
          company_settings_id: actionTask.company_settings_id,
          title: nextTaskData.title || `Follow up with ${actionTask.lead?.first_name || 'Lead'}`,
          due_date: nextTaskData.due_date,
          priority: nextTaskData.priority
        } : undefined
      );
      showSuccess(`Task ${actionType === 'complete' ? 'completed' : actionType === 'cancel' ? 'cancelled' : 'updated'} with notes logged to Lead Timeline!`);
      setShowActionTaskModal(false);
      setActionTask(null);
      setActionNotes('');
      loadFollowUpTasks();
    } catch (err) {
      showError(`Failed to action task: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTaskLoading(false);
    }
  };

  const handleCompleteTask = async (task: LeadFollowUpTask) => {
    handleOpenActionModal(task);
  };

  const handleCancelTask = async (task: LeadFollowUpTask) => {
    setActionTask(task);
    setActionType('cancel');
    setActionNotes('');
    setScheduleNextTask(false);
    setShowActionTaskModal(true);
  };

  const handleDeleteTask = async (task: LeadFollowUpTask) => {
    const confirmed = await confirm({ title: 'Delete Task', message: `Delete task "${task.title}"? This action cannot be undone.`, confirmText: 'Delete', type: 'danger' });
    if (!confirmed) return;
    try {
      await leadFollowUpTaskService.deleteFollowUpTask(task.id);
      showSuccess('Task deleted successfully!');
      loadFollowUpTasks();
    } catch (err) {
      showError(`Failed to delete task: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const openTaskModal = (mode: 'add' | 'edit', task?: LeadFollowUpTask, leadId?: string) => {
    setTaskModalMode(mode);
    setSelectedTask(task ?? null);
    if (mode === 'add') {
      setTaskFormData({
        lead_id: leadId || selectedLead?.id || '',
        title: '',
        due_date: '',
        priority: 'medium',
        recurrence: 'none',
        company_settings_id: entityId ?? undefined
      });
    } else if (task) {
      setTaskFormData({
        lead_id: task.lead_id,
        opportunity_id: task.opportunity_id,
        title: task.title,
        description: task.description,
        task_type: task.task_type,
        priority: task.priority,
        due_date: task.due_date,
        reminder_date: task.reminder_date,
        recurrence: task.recurrence,
        parent_task_id: task.parent_task_id,
        assigned_to: task.assigned_to,
        company_settings_id: task.company_settings_id
      });
    }
    setShowTaskModal(true);
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
          {[{ key: 'dashboard', label: 'Dashboard' }, { key: 'leads', label: 'All Leads' }, { key: 'create-lead', label: 'Create Lead' }, { key: 'tasks', label: 'Follow-up Tasks' }, { key: 'timeline', label: 'Timeline & Alerts' }].map(tab => (
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
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Recent Leads</h3>
              <button onClick={() => setShowAlertsPanel(!showAlertsPanel)} className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Bell className="w-4 h-4 mr-2" />Alerts
                {alerts.filter(a => !a.is_read).length > 0 && <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">{alerts.filter(a => !a.is_read).length}</span>}
              </button>
            </div>
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
          {showAlertsPanel && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Alerts</h3>
              <div className="space-y-3">
                {alerts.slice(0, 5).map(alert => (
                  <div key={alert.id} className={`p-3 rounded-md border ${alert.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div className="flex items-start">
                      {alert.severity === 'critical' ? <AlertTriangle className="w-5 h-5 text-red-600 mr-3 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                        {alert.lead && <p className="text-xs text-blue-600 mt-1">{alert.lead.lead_number} - {alert.lead.first_name} {alert.lead.last_name}</p>}
                      </div>
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && <p className="text-sm text-gray-500">No active alerts.</p>}
              </div>
            </div>
          )}
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
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.budget_min || lead.budget_max ? formatCurrencyWithSymbol(lead.budget_min || 0, lead.currency_code || 'INR') + ' - ' + formatCurrencyWithSymbol(lead.budget_max || 0, lead.currency_code || 'INR') : '—'}</td>
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

      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Tasks', value: taskStats?.total_tasks || 0, icon: Activity, color: 'text-blue-600' },
              { label: 'Open', value: taskStats?.open_tasks || 0, icon: Clock, color: 'text-gray-600' },
              { label: 'Overdue', value: taskStats?.overdue_tasks || 0, icon: AlertTriangle, color: 'text-red-600' },
              { label: 'Upcoming', value: taskStats?.upcoming_tasks || 0, icon: Calendar, color: 'text-green-600' }
            ].map(stat => (
              <div key={stat.label} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-gray-600">{stat.label}</p><p className="text-2xl font-semibold text-gray-900">{stat.value}</p></div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <select value={taskFilters.status || ''} onChange={e => setTaskFilters(prev => ({ ...prev, status: e.target.value as FollowUpTaskStatus || undefined }))} className="px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500">
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select value={taskFilters.priority || ''} onChange={e => setTaskFilters(prev => ({ ...prev, priority: e.target.value as FollowUpTaskPriority || undefined }))} className="px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500">
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <label className="flex items-center space-x-2">
                <input type="checkbox" checked={taskFilters.overdue_only || false} onChange={e => setTaskFilters(prev => ({ ...prev, overdue_only: e.target.checked || undefined }))} className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">Overdue Only</span>
              </label>
            </div>
            <button onClick={() => openTaskModal('add')} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Add Task</button>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {taskLoading ? <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div> : followUpTasks.length === 0 ? (
              <div className="text-center py-12"><Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks Found</h3><p className="text-gray-500 mb-4">Create follow-up tasks to manage lead engagement.</p></div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {followUpTasks.map(task => {
                        const priorityColors = { low: 'bg-gray-100 text-gray-800', medium: 'bg-blue-100 text-blue-800', high: 'bg-orange-100 text-orange-800', urgent: 'bg-red-100 text-red-800' };
                        const statusColors = { open: 'bg-gray-100 text-gray-800', in_progress: 'bg-blue-100 text-blue-800', completed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800', overdue: 'bg-red-100 text-red-800' };
                        const isOverdue = task.due_date < new Date().toISOString() && task.status !== 'completed' && task.status !== 'cancelled';
                        return (
                          <tr key={task.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{task.title}</div>
                              <div className="text-xs text-gray-500">{task.task_type}</div>
                              {task.completion_notes && (
                                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded mt-1 max-w-xs truncate" title={task.completion_notes}>
                                  <strong>Notes:</strong> {task.completion_notes}
                                </div>
                              )}
                              {task.cancellation_reason && !task.completion_notes && (
                                <div className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded mt-1 max-w-xs truncate" title={task.cancellation_reason}>
                                  <strong>Cancelled:</strong> {task.cancellation_reason}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.lead ? `${task.lead.first_name} ${task.lead.last_name}` : '—'}</td>
                            <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${priorityColors[task.priority]}`}>{task.priority}</span></td>
                            <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[task.status]} ${isOverdue ? 'ring-2 ring-red-500' : ''}`}>{isOverdue ? 'overdue' : task.status.replace('_', ' ')}</span></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(task.due_date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                <button onClick={() => handleOpenActionModal(task)} className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-medium hover:bg-emerald-100" title="Action Task & Add Notes">
                                  <MessageSquare className="w-3.5 h-3.5 mr-1" />
                                  Action & Notes
                                </button>
                                {(task.status === 'open' || task.status === 'in_progress') && (
                                  <button onClick={() => handleCancelTask(task)} className="text-orange-600 hover:text-orange-900 p-1" title="Cancel Task">
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                                <button onClick={() => handleDeleteTask(task)} className="text-red-600 hover:text-red-900 p-1" title="Delete Task">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {taskTotalPages > 1 && (
                  <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">Page {taskPage} of {taskTotalPages}</div>
                    <div className="flex space-x-2">
                      <button onClick={() => setTaskPage(p => Math.max(1, p - 1))} disabled={taskPage === 1} className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50">Previous</button>
                      <button onClick={() => setTaskPage(p => Math.min(taskTotalPages, p + 1))} disabled={taskPage === taskTotalPages} className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50">Next</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Lead Alerts & Activity Timeline</h3>
            <button onClick={loadAlerts} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"><RefreshCw className="w-4 h-4 mr-2" />Refresh</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-lg shadow p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center"><AlertTriangle className="w-4 h-4 mr-2 text-red-600" />Alerts</h4>
                {loading ? <div className="text-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" /></div> : alerts.length === 0 ? (
                  <p className="text-sm text-gray-500">No active alerts.</p>
                ) : (
                  <div className="space-y-3">
                    {alerts.map(alert => (
                      <div key={alert.id} className={`p-3 rounded-md border ${alert.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start">
                            {alert.severity === 'critical' ? <AlertTriangle className="w-4 h-4 text-red-600 mr-2 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5" />}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                              <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                              {alert.lead && <p className="text-xs text-blue-600 mt-1">{alert.lead.first_name} {alert.lead.last_name} - {alert.lead.lead_number}</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">View Timeline for Lead</h4>
                <select onChange={e => { const lead = leads.find(l => l.id === e.target.value); if (lead) { setSelectedLeadForTimeline(lead); loadTimeline(lead.id); } }} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Select a lead...</option>
                  {leads.map(lead => (<option key={lead.id} value={lead.id}>{lead.lead_number} - {lead.first_name} {lead.last_name}</option>))}
                </select>
              </div>
            </div>
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Unified Activity Timeline</h4>
              {!selectedLeadForTimeline ? (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>Select a lead to view its complete timeline.</p>
                </div>
              ) : timelineLoading ? (
                <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
              ) : timeline.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No timeline entries found for this lead.</div>
              ) : (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {timeline.map((entry, idx) => {
                      const entryDate = new Date(entry.occurred_at).toLocaleString();
                      const iconMap = { activity: '📋', follow_up_task: '✅', status_change: '🔄', score_change: '📊' };
                      return (
                        <li key={entry.id}>
                          <div className="relative pb-8">
                            {idx !== timeline.length - 1 && <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />}
                            <div className="relative flex space-x-3">
                              <div>
                                <span className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-lg">{iconMap[entry.entry_type] || '📋'}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div>
                                  <div className="text-sm text-gray-500">
                                    <span className="font-medium text-gray-900">{entry.title}</span>
                                    <span className="ml-2 text-xs text-gray-400">{entryDate}</span>
                                  </div>
                                  {entry.description && <p className="mt-1 text-sm text-gray-600">{entry.description}</p>}
                                  {entry.metadata && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {Object.entries(entry.metadata).map(([k, v]) => (
                                        <span key={k} className="inline-flex px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700">{k}: {String(v)}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
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
                   <div><label className="block text-sm font-medium text-gray-700 mb-1">Budget Min</label><input type="number" value={formData.budget_min ?? ''} onChange={e => handleChange('budget_min', e.target.value ? parseFloat(e.target.value) : undefined)} disabled={modalMode === 'view'} placeholder="Min budget" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50" /></div>
                   <div><label className="block text-sm font-medium text-gray-700 mb-1">Budget Max</label><input type="number" value={formData.budget_max ?? ''} onChange={e => handleChange('budget_max', e.target.value ? parseFloat(e.target.value) : undefined)} disabled={modalMode === 'view'} placeholder="Max budget" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50" /></div>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                   <select value={formData.currency_code || 'INR'} onChange={e => handleChange('currency_code', e.target.value)} disabled={modalMode === 'view'} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50">
                     {countries.map(c => (<option key={c.id} value={c.currency_code}>{c.currency_code} - {c.currency_name}</option>))}
                   </select>
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
                {selectedLead && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Timeline</h4>
                    {timelineLoading ? (
                      <div className="text-center py-4 text-gray-500">Loading timeline...</div>
                    ) : timeline.length === 0 ? (
                      <p className="text-sm text-gray-500 mb-3">No timeline entries yet.</p>
                    ) : (
                      <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                        {timeline.slice(-10).map(entry => (
                          <div key={entry.id} className="bg-gray-50 rounded-md p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-500">{new Date(entry.occurred_at).toLocaleString()}</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700 capitalize">{entry.entry_type.replace('_', ' ')}</span>
                            </div>
                            <p className="text-sm text-gray-900 mt-1">{entry.title}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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

      {showTaskModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-lg shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{taskModalMode === 'add' ? 'Create Follow-up Task' : 'Edit Task'}</h3>
              <button onClick={() => setShowTaskModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead *</label>
                <select value={taskFormData.lead_id} onChange={e => setTaskFormData(prev => ({ ...prev, lead_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Select Lead</option>
                  {leads.map(lead => (<option key={lead.id} value={lead.id}>{lead.lead_number} - {lead.first_name} {lead.last_name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={taskFormData.title} onChange={e => setTaskFormData(prev => ({ ...prev, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="Enter task title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={taskFormData.description || ''} onChange={e => setTaskFormData(prev => ({ ...prev, description: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="Task description..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={taskFormData.priority} onChange={e => setTaskFormData(prev => ({ ...prev, priority: e.target.value as FollowUpTaskPriority }))} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence</label>
                  <select value={taskFormData.recurrence} onChange={e => setTaskFormData(prev => ({ ...prev, recurrence: e.target.value as any }))} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500">
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi_weekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                <input type="datetime-local" value={taskFormData.due_date} onChange={e => setTaskFormData(prev => ({ ...prev, due_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Date</label>
                <input type="datetime-local" value={taskFormData.reminder_date || ''} onChange={e => setTaskFormData(prev => ({ ...prev, reminder_date: e.target.value || undefined }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300">Cancel</button>
              <button onClick={handleCreateTask} disabled={!taskFormData.title.trim() || !taskFormData.due_date || !taskFormData.lead_id} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">{taskModalMode === 'add' ? 'Create Task' : 'Update Task'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Action Task & Add Notes Modal */}
      {showActionTaskModal && actionTask && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-6 border w-11/12 max-w-xl shadow-xl rounded-lg bg-white">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-gray-900">Action Task & Log Notes</h3>
              </div>
              <button onClick={() => setShowActionTaskModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Task Details Card */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs space-y-1">
                <div className="flex justify-between font-semibold text-gray-900 text-sm">
                  <span>{actionTask.title}</span>
                  <span className="capitalize px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs">{actionTask.priority} Priority</span>
                </div>
                {actionTask.lead && (
                  <p className="text-gray-600">
                    Lead: <strong className="text-blue-700">{actionTask.lead.lead_number}</strong> - {actionTask.lead.first_name} {actionTask.lead.last_name} ({actionTask.lead.company_name || 'No Company'})
                  </p>
                )}
                <div className="flex gap-4 text-gray-500 pt-1">
                  <span>Type: {actionTask.task_type || 'Follow-up'}</span>
                  <span>Due: {new Date(actionTask.due_date).toLocaleString()}</span>
                </div>
              </div>

              {/* Action Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Select Action Status</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setActionType('complete')}
                    className={`py-2 px-3 rounded-md text-xs font-bold border transition ${
                      actionType === 'complete'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-emerald-50'
                    }`}
                  >
                    ✓ Mark Complete
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('in_progress')}
                    className={`py-2 px-3 rounded-md text-xs font-bold border transition ${
                      actionType === 'in_progress'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
                    }`}
                  >
                    ⏳ In Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('cancel')}
                    className={`py-2 px-3 rounded-md text-xs font-bold border transition ${
                      actionType === 'cancel'
                        ? 'bg-red-600 text-white border-red-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-red-50'
                    }`}
                  >
                    ✕ Cancel Task
                  </button>
                </div>
              </div>

              {/* Task Notes Textarea */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Action / Call Notes <span className="text-gray-400 font-normal">(Logged to Lead Timeline)</span>
                </label>
                <textarea
                  value={actionNotes}
                  onChange={e => setActionNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Called client, discussed pricing proposal, client requested updated terms by Friday..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Next Follow-up Scheduling Option */}
              <div className="border-t border-gray-200 pt-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleNextTask}
                    onChange={e => setScheduleNextTask(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-gray-900">Schedule Next Follow-Up Task Automatically</span>
                </label>

                {scheduleNextTask && (
                  <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Next Task Title</label>
                      <input
                        type="text"
                        value={nextTaskData.title}
                        onChange={e => setNextTaskData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs bg-white focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Next Due Date</label>
                        <input
                          type="datetime-local"
                          value={nextTaskData.due_date}
                          onChange={e => setNextTaskData(prev => ({ ...prev, due_date: e.target.value }))}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs bg-white focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Next Priority</label>
                        <select
                          value={nextTaskData.priority}
                          onChange={e => setNextTaskData(prev => ({ ...prev, priority: e.target.value as FollowUpTaskPriority }))}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs bg-white focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 border-t pt-3">
              <button
                type="button"
                onClick={() => setShowActionTaskModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-xs font-semibold hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTaskAction}
                disabled={taskLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-xs text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              >
                {taskLoading ? 'Saving...' : 'Save Action & Log Notes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadManagement;
