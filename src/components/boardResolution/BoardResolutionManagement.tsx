import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Download,
  Trash2,
  RefreshCw,
  X,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Save,
} from 'lucide-react';
import { boardResolutionService } from '../../services/boardResolutionService';
import { invoiceService } from '../../services/invoiceService';
import { generateBoardResolutionPDF } from '../../utils/boardResolutionPDFGenerator';
import { useToast } from '../ui/ToastProvider';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../ui/ConfirmDialog';
import type {
  BoardResolution,
  CreateBoardResolutionData,
  BoardResolutionFilters,
  BoardResolutionStats,
  BoardResolutionStatus,
} from '../../types/boardResolution';
import { BOARD_ACTIONS } from '../../types/boardResolution';
import type { CompanySettings } from '../../types/invoice';

// ─── Constants ───────────────────────────────────────────────────────────────

const EMPTY_FORM: CreateBoardResolutionData = {
  resolution_date: new Date().toISOString().split('T')[0],
  board_action: '',
  title: '',
  preamble: '',
  resolution_text: '',
  directors_present: [''],
  directors_absent: [],
  chairperson: '',
  status: 'draft',
  passed_by: 'not_voted',
  notes: '',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: BoardResolutionStatus }> = ({ status }) => {
  const cfg: Record<BoardResolutionStatus, { label: string; className: string; Icon: React.FC<{ className?: string }> }> = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700', Icon: Clock },
    passed: { label: 'Passed', className: 'bg-green-100 text-green-700', Icon: CheckCircle },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700', Icon: XCircle },
  };
  const { label, className, Icon } = cfg[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const BoardResolutionManagement: React.FC = () => {
  const [resolutions, setResolutions] = useState<BoardResolution[]>([]);
  const [stats, setStats] = useState<BoardResolutionStats>({ total: 0, draft: 0, passed: 0, rejected: 0 });
  const [companySettings, setCompanySettings] = useState<CompanySettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<BoardResolutionStatus | ''>('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editingResolution, setEditingResolution] = useState<BoardResolution | null>(null);
  const [previewResolution, setPreviewResolution] = useState<BoardResolution | null>(null);
  const [formData, setFormData] = useState<CreateBoardResolutionData>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [customAction, setCustomAction] = useState('');

  const { showSuccess, showError } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();

  const PAGE_SIZE = 20;

  // ─── Data loading ────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: BoardResolutionFilters = {};
      if (filterStatus) filters.status = filterStatus;
      if (searchTerm) filters.search = searchTerm;

      const [{ data, total }, statsData, companies] = await Promise.all([
        boardResolutionService.getResolutions(currentPage, PAGE_SIZE, filters),
        boardResolutionService.getStats(),
        invoiceService.getCompanySettings(),
      ]);

      setResolutions(data);
      setStats(statsData);
      setTotalPages(Math.ceil(total / PAGE_SIZE) || 1);
      setCompanySettings(companies);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterStatus, searchTerm]);

  useEffect(() => { loadData(); }, [loadData]);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [filterStatus, searchTerm]);

  // ─── Form helpers ────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setEditingResolution(null);
    setFormData({ ...EMPTY_FORM, resolution_date: new Date().toISOString().split('T')[0] });
    setCustomAction('');
    setShowFormModal(true);
  };

  const openEditModal = (resolution: BoardResolution) => {
    setEditingResolution(resolution);
    const isCustom = !BOARD_ACTIONS.includes(resolution.board_action as typeof BOARD_ACTIONS[number]);
    setCustomAction(isCustom ? resolution.board_action : '');
    setFormData({
      resolution_date: resolution.resolution_date,
      board_action: isCustom ? 'Other' : resolution.board_action,
      title: resolution.title,
      preamble: resolution.preamble || '',
      resolution_text: resolution.resolution_text,
      directors_present: resolution.directors_present.length ? resolution.directors_present : [''],
      directors_absent: resolution.directors_absent || [],
      chairperson: resolution.chairperson || '',
      company_settings_id: resolution.company_settings_id,
      status: resolution.status,
      passed_by: resolution.passed_by,
      notes: resolution.notes || '',
    });
    setShowFormModal(true);
  };

  const handleFormChange = (field: keyof CreateBoardResolutionData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Auto-suggest title from board action
    if (field === 'board_action' && typeof value === 'string' && value !== 'Other' && !formData.title) {
      setFormData(prev => ({ ...prev, board_action: value, title: `Resolution for ${value}` }));
    }
  };

  const handleDirectorChange = (type: 'present' | 'absent', index: number, value: string) => {
    const key = type === 'present' ? 'directors_present' : 'directors_absent';
    const list = [...(formData[key] as string[])];
    list[index] = value;
    setFormData(prev => ({ ...prev, [key]: list }));
  };

  const addDirector = (type: 'present' | 'absent') => {
    const key = type === 'present' ? 'directors_present' : 'directors_absent';
    setFormData(prev => ({ ...prev, [key]: [...(prev[key] as string[]), ''] }));
  };

  const removeDirector = (type: 'present' | 'absent', index: number) => {
    const key = type === 'present' ? 'directors_present' : 'directors_absent';
    const list = (formData[key] as string[]).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, [key]: list.length ? list : [''] }));
  };

  const handleSave = async () => {
    const effectiveAction = formData.board_action === 'Other' ? customAction : formData.board_action;
    if (!effectiveAction.trim() || !formData.title.trim() || !formData.resolution_text.trim()) {
      showError('Board action, title, and resolution text are required.');
      return;
    }

    const payload: CreateBoardResolutionData = {
      ...formData,
      board_action: effectiveAction,
      directors_present: formData.directors_present.filter(d => d.trim()),
      directors_absent: (formData.directors_absent || []).filter(d => d.trim()),
      company_settings_id: companySettings[0]?.id,
    };

    setFormLoading(true);
    try {
      if (editingResolution) {
        await boardResolutionService.updateResolution(editingResolution.id, payload);
        showSuccess('Resolution updated successfully.');
      } else {
        await boardResolutionService.createResolution(payload);
        showSuccess('Resolution created successfully.');
      }
      setShowFormModal(false);
      loadData();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save resolution.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (resolution: BoardResolution) => {
    const ok = await confirm({
      title: 'Delete Board Resolution',
      message: `Delete resolution "${resolution.resolution_number}"? This cannot be undone.`,
      confirmText: 'Delete',
    });
    if (!ok) return;

    try {
      await boardResolutionService.deleteResolution(resolution.id);
      showSuccess('Resolution deleted.');
      loadData();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete resolution.');
    }
  };

  const handleDownload = async (resolution: BoardResolution) => {
    const company = companySettings[0];
    if (!company) { showError('Company settings not found.'); return; }
    setDownloadingId(resolution.id);
    try {
      await generateBoardResolutionPDF(resolution, company);
      showSuccess('PDF downloaded.');
    } catch (err) {
      showError('Failed to generate PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const openPreview = (resolution: BoardResolution) => {
    setPreviewResolution(resolution);
    setShowPreviewModal(true);
  };

  // ─── Preview content ──────────────────────────────────────────────────────

  const renderPreviewContent = (resolution: BoardResolution) => {
    const company = companySettings[0];
    return (
      <div className="bg-white p-8 shadow-lg max-w-4xl mx-auto text-sm" style={{ lineHeight: '1.6' }}>
        {/* Header */}
        <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-blue-600">
          <div>
            {company?.logo_url && (
              <img src={company.logo_url} alt="Logo" className="h-12 w-auto mb-2" />
            )}
            <div className="text-lg font-bold text-gray-900">{company?.company_name || 'Company Name'}</div>
            <div className="text-xs text-gray-500 mt-1">
              {company?.address_line1 && <div>{company.address_line1}</div>}
              {company?.city && <div>{company.city}{company.state ? `, ${company.state}` : ''} {company.postal_code}</div>}
              {company?.gstin && <div>GSTIN: {company.gstin}</div>}
              {company?.cin && <div>CIN: {company.cin}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">BOARD RESOLUTION</div>
            <div className="mt-2 text-xs text-gray-600 space-y-1">
              <div><span className="font-medium">Resolution #:</span> {resolution.resolution_number}</div>
              <div>
                <span className="font-medium">Date:</span>{' '}
                {new Date(resolution.resolution_date).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </div>
              <div className="mt-1">
                <StatusBadge status={resolution.status} />
              </div>
            </div>
          </div>
        </div>

        {/* Meeting info */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-6 text-xs grid grid-cols-2 gap-2">
          <div><span className="font-semibold text-blue-800">Board Action:</span> {resolution.board_action}</div>
          {resolution.chairperson && (
            <div><span className="font-semibold text-blue-800">Chairperson:</span> {resolution.chairperson}</div>
          )}
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="text-base font-bold text-gray-900">{resolution.title}</div>
        </div>

        {/* Preamble */}
        {resolution.preamble?.trim() && (
          <div className="mb-6">
            <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Preamble</div>
            <p className="text-xs text-gray-700 whitespace-pre-wrap">{resolution.preamble}</p>
          </div>
        )}

        {/* Resolution text */}
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded p-4">
          <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Resolved That</div>
          <p className="text-xs text-gray-800 whitespace-pre-wrap">{resolution.resolution_text}</p>
        </div>

        {/* Voting result */}
        {resolution.status === 'passed' && resolution.passed_by !== 'not_voted' && (
          <div className="text-center mb-6">
            <span className="inline-block bg-green-100 text-green-800 text-sm font-bold px-4 py-2 rounded">
              {resolution.passed_by === 'unanimous' ? 'RESOLVED UNANIMOUSLY' : 'RESOLVED BY MAJORITY'}
            </span>
          </div>
        )}

        {/* Directors present */}
        {resolution.directors_present.length > 0 && (
          <div className="mb-6">
            <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Directors Present</div>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="py-2 px-3 text-left w-16">S.No.</th>
                  <th className="py-2 px-3 text-left">Name of Director</th>
                </tr>
              </thead>
              <tbody>
                {resolution.directors_present.map((name, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-blue-50' : 'bg-white'}>
                    <td className="py-2 px-3 border-b border-gray-200">{idx + 1}</td>
                    <td className="py-2 px-3 border-b border-gray-200">{name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Directors absent */}
        {resolution.directors_absent?.length > 0 && (
          <div className="mb-6 text-xs text-gray-600">
            <span className="font-semibold">Directors Absent (Leave of Absence):</span>{' '}
            {resolution.directors_absent.join(', ')}
          </div>
        )}

        {/* Notes */}
        {resolution.notes?.trim() && (
          <div className="mb-6 text-xs text-gray-500 border-t pt-3">
            <span className="font-semibold">Notes:</span> {resolution.notes}
          </div>
        )}

        {/* Signatures */}
        <div className="mt-10 pt-6 border-t border-gray-300">
          <div className="text-xs font-semibold text-gray-700 mb-6">Certified True Copy</div>
          <div className="flex justify-between mt-4">
            <div className="w-44">
              <div className="border-b border-gray-900 mb-1 h-8" />
              <div className="text-xs text-gray-600">Chairperson</div>
            </div>
            <div className="w-44">
              <div className="border-b border-gray-900 mb-1 h-8" />
              <div className="text-xs text-gray-600">Director / Authorised Signatory</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Board Resolutions</h2>
          <p className="text-sm text-gray-500 mt-1">Manage formal board resolutions linked to board actions</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Resolution
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
          { label: 'Draft', value: stats.draft, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
          { label: 'Passed', value: stats.passed, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
          { label: 'Rejected', value: stats.rejected, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} className={`${bg} border ${border} rounded-lg p-4`}>
            <div className="text-sm text-gray-500">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by number, title, or action…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as BoardResolutionStatus | '')}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="passed">Passed</option>
          <option value="rejected">Rejected</option>
        </select>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : resolutions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <FileText className="w-10 h-10 mb-2" />
            <p className="text-sm">No resolutions found</p>
            <button onClick={openCreateModal} className="mt-3 text-sm text-blue-600 hover:underline">
              Create the first resolution
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Resolution #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Board Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {resolutions.map(res => (
                  <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{res.resolution_number}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(res.resolution_date).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{res.board_action}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{res.title}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={res.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openPreview(res)}
                          title="Preview"
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(res)}
                          title="Edit"
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(res)}
                          disabled={downloadingId === res.id}
                          title="Download PDF"
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-40"
                        >
                          {downloadingId === res.id
                            ? <RefreshCw className="w-4 h-4 animate-spin" />
                            : <Download className="w-4 h-4" />
                          }
                        </button>
                        <button
                          onClick={() => handleDelete(res)}
                          title="Delete"
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Create / Edit Modal ─────────────────────────────────────────── */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center overflow-y-auto py-6">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 my-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingResolution ? 'Edit Board Resolution' : 'New Board Resolution'}
              </h3>
              <button onClick={() => setShowFormModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Row 1: Date + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Resolution Date *</label>
                  <input
                    type="date"
                    value={formData.resolution_date}
                    onChange={e => handleFormChange('resolution_date', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => handleFormChange('status', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="passed">Passed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Board Action */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Board Action *</label>
                <select
                  value={formData.board_action}
                  onChange={e => handleFormChange('board_action', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select board action…</option>
                  {BOARD_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                {formData.board_action === 'Other' && (
                  <input
                    type="text"
                    placeholder="Describe the board action…"
                    value={customAction}
                    onChange={e => setCustomAction(e.target.value)}
                    className="mt-2 w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                )}
              </div>

              {/* Row 3: Title */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Resolution Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Resolution for Appointment of Statutory Auditors"
                  value={formData.title}
                  onChange={e => handleFormChange('title', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Row 4: Chairperson + Passed By */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Chairperson</label>
                  <input
                    type="text"
                    placeholder="Name of meeting chairperson"
                    value={formData.chairperson || ''}
                    onChange={e => handleFormChange('chairperson', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Passed By</label>
                  <select
                    value={formData.passed_by}
                    onChange={e => handleFormChange('passed_by', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="not_voted">Not Voted Yet</option>
                    <option value="unanimous">Unanimous</option>
                    <option value="majority">Majority</option>
                  </select>
                </div>
              </div>

              {/* Preamble */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Preamble (optional)</label>
                <textarea
                  placeholder="Background context — WHEREAS the company requires…"
                  value={formData.preamble || ''}
                  onChange={e => handleFormChange('preamble', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                />
              </div>

              {/* Resolution text */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Resolution Text *</label>
                <textarea
                  placeholder="RESOLVED THAT the Board of Directors of the Company hereby…"
                  value={formData.resolution_text}
                  onChange={e => handleFormChange('resolution_text', e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                />
              </div>

              {/* Directors Present */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-700">Directors Present</label>
                  <button
                    type="button"
                    onClick={() => addDirector('present')}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.directors_present.map((name, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`Director ${idx + 1} name`}
                        value={name}
                        onChange={e => handleDirectorChange('present', idx, e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      {formData.directors_present.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDirector('present', idx)}
                          className="p-2 text-red-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Directors Absent */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-700">Directors Absent (optional)</label>
                  <button
                    type="button"
                    onClick={() => addDirector('absent')}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                {(formData.directors_absent || []).length > 0 && (
                  <div className="space-y-2">
                    {(formData.directors_absent || []).map((name, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          placeholder={`Absent director ${idx + 1} name`}
                          value={name}
                          onChange={e => handleDirectorChange('absent', idx, e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeDirector('absent', idx)}
                          className="p-2 text-red-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  placeholder="Any additional notes or remarks…"
                  value={formData.notes || ''}
                  onChange={e => handleFormChange('notes', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowFormModal(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={formLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {formLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingResolution ? 'Update Resolution' : 'Create Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Preview Modal ──────────────────────────────────────────────── */}
      {showPreviewModal && previewResolution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-5xl shadow-lg rounded-lg bg-white mb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Resolution Preview
                <span className="ml-3 text-sm font-normal text-gray-500">
                  {previewResolution.resolution_number}
                </span>
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownload(previewResolution)}
                  disabled={downloadingId === previewResolution.id}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {downloadingId === previewResolution.id
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <Download className="w-4 h-4" />
                  }
                  Download PDF
                </button>
                <button onClick={() => setShowPreviewModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Preview scroll area */}
            <div className="max-h-[80vh] overflow-y-auto border border-gray-200 rounded">
              {renderPreviewContent(previewResolution)}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
};

export default BoardResolutionManagement;
