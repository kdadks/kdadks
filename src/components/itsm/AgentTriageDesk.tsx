import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Star,
  Users,
  Search,
  Filter,
  RefreshCw,
  UserCheck,
  Tag,
  ShieldAlert,
  ArrowUpDown,
  Building2,
  CheckSquare,
  Square,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import {
  ITSMTicket,
  ITSMTicketCategory,
  TicketPriority,
  TicketStatus,
  TriageDeskMetrics,
  TicketFilters,
  TICKET_PRIORITY_BADGES,
  TICKET_STATUS_BADGES,
} from '../../types/itsm';
import { ITSMTicketService } from '../../services/itsmTicketService';
import { ITSMSlaService } from '../../services/itsmSlaService';
import { useCompanyContext } from '../../contexts/CompanyContext';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import { useToast } from '../ui/ToastProvider';
import TicketDetailModal from './TicketDetailModal';
import CompanySelector from '../ui/CompanySelector';

type QueueTab = 'unassigned' | 'my_assigned' | 'p1_p2' | 'sla_breaching' | 'pending_customer' | 'resolved' | 'all';

export const AgentTriageDesk: React.FC = () => {
  const { selectedCompany, companies, selectCompany } = useCompanyContext();
  const { can, hasAny } = useRolePermissions();
  const { showSuccess, showError } = useToast();

  const [activeQueueTab, setActiveQueueTab] = useState<QueueTab>('unassigned');
  const [tickets, setTickets] = useState<ITSMTicket[]>([]);
  const [categories, setCategories] = useState<ITSMTicketCategory[]>([]);
  const [metrics, setMetrics] = useState<TriageDeskMetrics>({
    total_open: 0,
    unassigned_count: 0,
    sla_breached_count: 0,
    sla_warning_count: 0,
    avg_csat: 4.8,
    csat_total_surveys: 12,
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Bulk Operations State
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [bulkActionType, setBulkActionType] = useState<'assign_agent' | 'override_priority' | 'reassign_category' | 'transition_status'>('assign_agent');
  const [bulkTargetVal, setBulkTargetVal] = useState<string>('');
  const [bulkSubmitting, setBulkSubmitting] = useState<boolean>(false);

  // Selected Ticket Workspace Modal
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  useEffect(() => {
    loadTriageDeskData();
  }, [selectedCompany, activeQueueTab, selectedPriority, selectedCategory]);

  const loadTriageDeskData = async () => {
    try {
      setLoading(true);
      const companyId = selectedCompany?.id || (companies.length > 0 ? companies[0].id : null);

      // Map QueueTab to ticket filters
      const filterObj: TicketFilters = {
        company_settings_id: companyId,
        searchQuery: searchQuery.trim() || undefined,
        priority: selectedPriority !== 'all' ? (selectedPriority as TicketPriority) : undefined,
        category_id: selectedCategory !== 'all' ? selectedCategory : undefined,
      };

      if (activeQueueTab === 'unassigned') {
        filterObj.assigned_agent_id = 'unassigned';
        filterObj.status = 'open';
      } else if (activeQueueTab === 'my_assigned') {
        filterObj.assigned_agent_id = 'my_assigned';
        filterObj.status = 'open';
      } else if (activeQueueTab === 'p1_p2') {
        filterObj.status = 'open';
      } else if (activeQueueTab === 'sla_breaching') {
        filterObj.status = 'open';
      } else if (activeQueueTab === 'pending_customer') {
        filterObj.status = 'pending_customer';
      } else if (activeQueueTab === 'resolved') {
        filterObj.status = 'resolved';
      } else {
        filterObj.status = 'all';
      }

      const [ticketList, metricData, catList] = await Promise.all([
        ITSMTicketService.getTickets(filterObj),
        ITSMTicketService.getTriageMetrics(companyId),
        ITSMTicketService.getCategories(companyId),
      ]);

      // Client-side queue tab refinement if needed
      let finalTickets = ticketList;
      if (activeQueueTab === 'p1_p2') {
        finalTickets = ticketList.filter((t) => t.priority === 'P1_critical' || t.priority === 'P2_high');
      } else if (activeQueueTab === 'sla_breaching') {
        const now = new Date();
        finalTickets = ticketList.filter((t) => {
          const status = ITSMSlaService.getSlaStopwatchStatus(t, now);
          return status.ttoBadgeColor === 'red' || status.ttoBadgeColor === 'yellow' || status.ttrBadgeColor === 'red' || status.ttrBadgeColor === 'yellow';
        });
      }

      setTickets(finalTickets);
      setMetrics(metricData);
      setCategories(catList);
    } catch (err) {
      showError(`Failed to load triage desk: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedTicketIds.length === tickets.length) {
      setSelectedTicketIds([]);
    } else {
      setSelectedTicketIds(tickets.map((t) => t.id));
    }
  };

  const toggleSelectTicket = (id: string) => {
    setSelectedTicketIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExecuteBulkAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTicketIds.length === 0 || !bulkTargetVal) return;

    try {
      setBulkSubmitting(true);
      const count = await ITSMTicketService.executeBulkAction({
        ticket_ids: selectedTicketIds,
        action: bulkActionType,
        assigned_agent_id: bulkActionType === 'assign_agent' ? bulkTargetVal : undefined,
        priority: bulkActionType === 'override_priority' ? (bulkTargetVal as TicketPriority) : undefined,
        category_id: bulkActionType === 'reassign_category' ? bulkTargetVal : undefined,
        status: bulkActionType === 'transition_status' ? (bulkTargetVal as TicketStatus) : undefined,
      });

      showSuccess(`Successfully updated ${count} ticket(s).`);
      setShowBulkModal(false);
      setSelectedTicketIds([]);
      await loadTriageDeskData();
    } catch (err) {
      showError(`Bulk action failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setBulkSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <LifeBuoy className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            <span>ITSM Operations Triage Desk</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time incident queue, dual Mon-Fri 09:00-18:00 SLA stopwatches & triage workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <CompanySelector
            companies={companies}
            selectedId={selectedCompany?.id ?? companies[0]?.id ?? null}
            onChange={selectCompany}
          />

          <button
            onClick={loadTriageDeskData}
            className="px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center space-x-1.5 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>

          <button
            onClick={() => {
              sessionStorage.removeItem('itsm_agent_session');
              window.location.reload();
            }}
            title="Sign Out of ITSM Agent Portal"
            className="px-3.5 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl hover:bg-red-100 transition flex items-center space-x-1.5 shadow-sm"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Agent Sign Out</span>
          </button>
        </div>
      </div>

      {/* Executive KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Open Queue</span>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{metrics.total_open}</h3>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl text-indigo-600 dark:text-indigo-400">
            <LifeBuoy className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Unassigned Triage</span>
            <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{metrics.unassigned_count}</h3>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/40 rounded-xl text-purple-600 dark:text-purple-400">
            <UserCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">SLA Breached / Warning</span>
            <h3 className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{metrics.sla_breached_count + metrics.sla_warning_count}</h3>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/40 rounded-xl text-red-600 dark:text-red-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CSAT Score</span>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{metrics.avg_csat} / 5.0</h3>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/40 rounded-xl text-amber-500">
            <Star className="h-6 w-6 fill-amber-400" />
          </div>
        </div>
      </div>

      {/* Queue Filter Bar & Search */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
        {/* Queue Navigation Tabs */}
        <div className="flex items-center space-x-1 border-b border-gray-200 dark:border-gray-700 pb-2 overflow-x-auto">
          {[
            { id: 'unassigned', label: 'Unassigned Triage' },
            { id: 'my_assigned', label: 'My Assigned' },
            { id: 'p1_p2', label: 'P1/P2 Critical' },
            { id: 'sla_breaching', label: 'SLA Breaching Soon' },
            { id: 'pending_customer', label: 'Pending Customer' },
            { id: 'resolved', label: 'Resolved / Sign-off' },
            { id: 'all', label: 'All Entity Tickets' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveQueueTab(tab.id as QueueTab)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                activeQueueTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Multi-Parameter Filters Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadTriageDeskData()}
              placeholder="Search ticket #, title, customer..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Priorities</option>
              <option value="P1_critical">P1 Critical</option>
              <option value="P2_high">P2 High</option>
              <option value="P3_medium">P3 Medium</option>
              <option value="P4_low">P4 Low</option>
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white max-w-[180px] truncate"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Bulk Action Trigger */}
            {selectedTicketIds.length > 0 && (
              <button
                onClick={() => setShowBulkModal(true)}
                className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow hover:bg-indigo-700 transition"
              >
                Bulk Action ({selectedTicketIds.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Ticket Queue Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-500" />
            <span>Loading triage queue...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-2">
            <LifeBuoy className="h-10 w-10 text-gray-400 mx-auto" />
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">No tickets found in this triage queue view</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="p-4 w-10 text-center">
                    <button onClick={handleSelectAll} className="text-gray-400 hover:text-indigo-600">
                      {selectedTicketIds.length === tickets.length ? (
                        <CheckSquare className="h-4 w-4 text-indigo-600" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">Ticket Number</th>
                  <th className="p-4">Customer Account</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">SLA Stopwatches</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {tickets.map((t) => {
                  const sla = ITSMSlaService.getSlaStopwatchStatus(t);
                  const isSelected = selectedTicketIds.includes(t.id);

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${
                        isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="p-4 text-center">
                        <button onClick={() => toggleSelectTicket(t.id)} className="text-gray-400">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-indigo-600" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {t.ticket_number}
                      </td>
                      <td className="p-4 font-medium text-gray-900 dark:text-white">
                        <div>{t.customer?.company_name || 'N/A'}</div>
                        {t.customer?.customer_code && (
                          <span className="text-[10px] text-gray-400 font-mono">{t.customer.customer_code}</span>
                        )}
                      </td>
                      <td className="p-4 font-semibold text-gray-900 dark:text-white max-w-xs truncate">
                        {t.title}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${TICKET_PRIORITY_BADGES[t.priority]}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase ${TICKET_STATUS_BADGES[t.status]}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="p-4 space-y-1">
                        <div className="flex items-center space-x-1 text-[10px] font-mono font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded ${
                              sla.ttoBadgeColor === 'red'
                                ? 'bg-red-100 text-red-800 animate-pulse'
                                : sla.ttoBadgeColor === 'yellow'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            TTO: {sla.ttoLabel}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-[10px] font-mono font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded ${
                              sla.ttrBadgeColor === 'red'
                                ? 'bg-red-100 text-red-800 animate-pulse'
                                : sla.ttrBadgeColor === 'yellow'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            TTR: {sla.ttrLabel}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedTicketId(t.id)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition inline-flex items-center space-x-1 shadow"
                        >
                          <span>Open Workspace</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Action Sub-modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Bulk Update ({selectedTicketIds.length} tickets)
            </h3>

            <form onSubmit={handleExecuteBulkAction} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Select Action</label>
                <select
                  value={bulkActionType}
                  onChange={(e) => setBulkActionType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="assign_agent">Assign Agent</option>
                  <option value="override_priority">Override Priority</option>
                  <option value="reassign_category">Reassign Category</option>
                  <option value="transition_status">Transition Status</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Target Value</label>
                {bulkActionType === 'override_priority' ? (
                  <select
                    value={bulkTargetVal}
                    onChange={(e) => setBulkTargetVal(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">-- Select Priority --</option>
                    <option value="P1_critical">P1 Critical</option>
                    <option value="P2_high">P2 High</option>
                    <option value="P3_medium">P3 Medium</option>
                    <option value="P4_low">P4 Low</option>
                  </select>
                ) : bulkActionType === 'transition_status' ? (
                  <select
                    value={bulkTargetVal}
                    onChange={(e) => setBulkTargetVal(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">-- Select Target Status --</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="pending_customer">Pending Customer</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={bulkTargetVal}
                    onChange={(e) => setBulkTargetVal(e.target.value)}
                    placeholder="Enter Agent ID or Category ID..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow"
                >
                  {bulkSubmitting ? 'Executing...' : 'Apply Bulk Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workspace Viewer Modal */}
      <TicketDetailModal
        isOpen={!!selectedTicketId}
        onClose={() => setSelectedTicketId(null)}
        ticketId={selectedTicketId}
        isAgentView={true}
        onTicketUpdated={loadTriageDeskData}
      />
    </div>
  );
};

export default AgentTriageDesk;
