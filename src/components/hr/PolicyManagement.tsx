import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Download,
  Edit2,
  Copy,
  Trash2,
  CheckCircle,
  Archive,
  BookOpen,
  Globe,
  Building,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Layers,
  ShieldCheck,
  Printer,
} from 'lucide-react';
import { useCompanyContext } from '../../contexts/CompanyContext';
import { useToast } from '../ui/ToastProvider';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../ui/ConfirmDialog';
import {
  Policy,
  PolicyFormData,
  PolicyCategory,
  PolicyJurisdiction,
  PolicyStatus,
  PolicySection,
  PolicyTemplate,
  JURISDICTION_OPTIONS,
  ENFORCEMENT_LEVELS,
  TARGET_AUDIENCE_OPTIONS,
} from '../../types/policy';
import { PolicyService } from '../../services/policyService';
import { PolicyPDFGenerator } from '../../utils/policyPDFGenerator';

export const PolicyManagement: React.FC = () => {
  const { selectedCompany } = useCompanyContext();
  const { showSuccess, showError, showInfo } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<PolicyCategory | 'all'>('all');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<PolicyJurisdiction | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<PolicyStatus | 'all'>('all');

  // Modals state
  const [showEditorModal, setShowEditorModal] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [previewPolicy, setPreviewPolicy] = useState<Policy | null>(null);

  // Form State
  const [formData, setFormData] = useState<PolicyFormData>({
    company_settings_id: selectedCompany?.id || null,
    policy_code: '',
    title: '',
    category: 'policy',
    policy_type: 'code_of_conduct',
    jurisdiction: 'IN',
    jurisdiction_name: 'India',
    version: '1.0',
    status: 'draft',
    effective_date: new Date().toISOString().split('T')[0],
    review_date: '',
    target_audience: 'All Employees',
    enforcement_level: 'Mandatory',
    summary: '',
    sections: [
      { section_number: '1.0', title: 'Objective & Scope', content: '' },
      { section_number: '2.0', title: 'Policy Guidelines', content: '' },
    ],
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Load policies on mount or entity switch
  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const data = await PolicyService.getPolicies({
        category: selectedCategory,
        jurisdiction: selectedJurisdiction,
        status: selectedStatus,
        searchQuery,
        company_settings_id: selectedCompany?.id || null,
      });
      setPolicies(data);
    } catch (err) {
      console.error('Error loading policies:', err);
      showError('Failed to load policies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, [selectedCompany?.id, selectedCategory, selectedJurisdiction, selectedStatus, searchQuery]);

  // Compute available prefilled templates based on form's selected jurisdiction & category
  const availableTemplates = useMemo(() => {
    return PolicyService.getTemplatesForJurisdiction(formData.jurisdiction, formData.category);
  }, [formData.jurisdiction, formData.category]);

  // Handle opening editor for new policy
  const handleOpenNewPolicyModal = () => {
    const jur = (selectedCompany?.country?.code as PolicyJurisdiction) || 'IN';
    const jurObj = JURISDICTION_OPTIONS.find((j) => j.value === jur) || JURISDICTION_OPTIONS[0];

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const suggestedCode = `POL-${jurObj.value}-${randomSuffix}`;

    setEditingPolicy(null);
    setFormData({
      company_settings_id: selectedCompany?.id || null,
      policy_code: suggestedCode,
      title: '',
      category: 'policy',
      policy_type: 'general',
      jurisdiction: jurObj.value,
      jurisdiction_name: jurObj.label,
      version: '1.0',
      status: 'draft',
      effective_date: new Date().toISOString().split('T')[0],
      review_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      target_audience: 'All Employees',
      enforcement_level: 'Mandatory',
      summary: '',
      sections: [
        { section_number: '1.0', title: 'Objective & Scope', content: '' },
        { section_number: '2.0', title: 'Policy Guidelines', content: '' },
      ],
    });
    setSelectedTemplateId('');
    setShowEditorModal(true);
  };

  // Handle opening editor for existing policy
  const handleEditPolicy = (policy: Policy) => {
    setEditingPolicy(policy);
    setFormData({
      company_settings_id: policy.company_settings_id,
      policy_code: policy.policy_code,
      title: policy.title,
      category: policy.category,
      policy_type: policy.policy_type,
      jurisdiction: policy.jurisdiction,
      jurisdiction_name: policy.jurisdiction_name,
      version: policy.version,
      status: policy.status,
      effective_date: policy.effective_date,
      review_date: policy.review_date || '',
      target_audience: policy.target_audience,
      enforcement_level: policy.enforcement_level,
      summary: policy.summary || '',
      sections: policy.sections || [],
    });
    setSelectedTemplateId('');
    setShowEditorModal(true);
  };

  // Apply chosen prefilled standard template
  const handleApplyTemplate = (templateId: string) => {
    const tmpl = availableTemplates.find((t) => t.id === templateId);
    if (!tmpl) return;

    setFormData((prev) => ({
      ...prev,
      title: tmpl.title,
      policy_type: tmpl.policy_type,
      policy_code: prev.policy_code || tmpl.suggested_code,
      target_audience: tmpl.target_audience,
      enforcement_level: tmpl.enforcement_level,
      summary: tmpl.summary,
      sections: JSON.parse(JSON.stringify(tmpl.sections)),
    }));

    showInfo(`Prefilled template "${tmpl.title}" applied!`);
  };

  // Save policy
  const handleSavePolicy = async (targetStatus?: PolicyStatus) => {
    if (!formData.title.trim()) {
      showError('Please enter a policy title.');
      return;
    }
    if (!formData.policy_code.trim()) {
      showError('Please enter a policy code.');
      return;
    }

    try {
      const payload: PolicyFormData = {
        ...formData,
        status: targetStatus || formData.status,
        company_settings_id: selectedCompany?.id || null,
      };

      if (editingPolicy) {
        await PolicyService.updatePolicy(editingPolicy.id, payload);
        showSuccess('Policy updated successfully!');
      } else {
        await PolicyService.createPolicy(payload);
        showSuccess('Policy created successfully!');
      }

      setShowEditorModal(false);
      fetchPolicies();
    } catch (err) {
      console.error('Failed to save policy:', err);
      showError('Failed to save policy record.');
    }
  };

  // Delete policy
  const handleDeletePolicy = async (id: string, title: string) => {
    const confirmed = await confirm({
      title: 'Delete Policy / SOP',
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      confirmText: 'Delete Policy',
      type: 'warning',
    });
    if (confirmed) {
      try {
        await PolicyService.deletePolicy(id);
        showSuccess('Policy deleted.');
        fetchPolicies();
      } catch (err) {
        console.error('Delete failed:', err);
        showError('Failed to delete policy.');
      }
    }
  };

  // Duplicate policy
  const handleDuplicatePolicy = async (id: string) => {
    try {
      await PolicyService.duplicatePolicy(id, selectedCompany?.id || null);
      showSuccess('Policy duplicated as a draft copy!');
      fetchPolicies();
    } catch (err) {
      console.error('Duplicate failed:', err);
      showError('Failed to duplicate policy.');
    }
  };

  // Publish / Archive quick action
  const handleStatusChange = async (id: string, newStatus: PolicyStatus) => {
    try {
      if (newStatus === 'published') {
        await PolicyService.publishPolicy(id);
        showSuccess('Policy published!');
      } else if (newStatus === 'archived') {
        await PolicyService.archivePolicy(id);
        showInfo('Policy archived.');
      }
      fetchPolicies();
    } catch (err) {
      console.error('Status update failed:', err);
      showError('Failed to update status.');
    }
  };

  // PDF Generation & Download
  const handleDownloadPDF = async (policy: Policy) => {
    try {
      showInfo('Generating PDF document with entity header & footer branding...');
      const dummyCompany = selectedCompany || {
        id: 'default',
        company_name: 'Kdadks',
      };

      const generator = new PolicyPDFGenerator(policy, dummyCompany as any);
      const pdf = await generator.generate();
      pdf.save(`${policy.policy_code}_${policy.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      showSuccess('PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF generation error:', err);
      showError('Failed to generate PDF document.');
    }
  };

  // Section manipulation helpers
  const handleAddSection = () => {
    const newNum = `${formData.sections.length + 1}.0`;
    setFormData((prev) => ({
      ...prev,
      sections: [...prev.sections, { section_number: newNum, title: 'New Section', content: '' }],
    }));
  };

  const handleRemoveSection = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateSection = (index: number, field: keyof PolicySection, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.sections];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, sections: updated };
    });
  };

  // Stats calculation
  const totalCount = policies.length;
  const publishedCount = policies.filter((p) => p.status === 'published').length;
  const sopCount = policies.filter((p) => p.category === 'sop').length;
  const jurisdictionCount = new Set(policies.map((p) => p.jurisdiction)).size;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <ConfirmDialog {...dialogProps} />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-blue-500/20 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full border border-blue-400/30 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              HR Governance & Compliance
            </span>
            {selectedCompany && (
              <span className="bg-white/10 text-gray-200 text-xs px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-amber-300" />
                {selectedCompany.company_name}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Policy & SOP Management</h1>
          <p className="text-blue-200/80 text-sm max-w-2xl mt-1">
            Define, customize, preview, and enforce HR policies and Standard Operating Procedures (SOPs) across legal
            jurisdictions with prefilled templates and entity header/footer PDF branding.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenNewPolicyModal}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Create Policy / SOP
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Documents</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Published Policies</p>
            <h3 className="text-2xl font-bold text-green-600 mt-1">{publishedCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active SOPs</p>
            <h3 className="text-2xl font-bold text-indigo-600 mt-1">{sopCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Jurisdictions</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{jurisdictionCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Globe className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, code, or summary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category Selector */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-full md:w-auto">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                selectedCategory === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Categories
            </button>
            <button
              onClick={() => setSelectedCategory('policy')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                selectedCategory === 'policy' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Policies
            </button>
            <button
              onClick={() => setSelectedCategory('sop')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                selectedCategory === 'sop' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              SOPs
            </button>
          </div>

          {/* Jurisdiction Dropdown */}
          <select
            value={selectedJurisdiction}
            onChange={(e) => setSelectedJurisdiction(e.target.value as PolicyJurisdiction | 'all')}
            className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">🌐 All Jurisdictions</option>
            {JURISDICTION_OPTIONS.map((j) => (
              <option key={j.value} value={j.value}>
                {j.flag} {j.label} ({j.value})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as PolicyStatus | 'all')}
            className="w-full md:w-36 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Policies List Table / Grid */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-3">Loading policy & SOP documents...</p>
        </div>
      ) : policies.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-800">No Policies Found</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-4">
            No policies or SOPs match your current filter settings. Click below to create a new policy or load standard prefilled jurisdiction templates.
          </p>
          <button
            onClick={handleOpenNewPolicyModal}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <Sparkles className="w-4 h-4" />
            Create & Prefill Policy
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Document / Code</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Jurisdiction</th>
                  <th className="px-4 py-3">Target & Enforcement</th>
                  <th className="px-4 py-3">Version & Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {policies.map((p) => {
                  const jurObj = JURISDICTION_OPTIONS.find((j) => j.value === p.jurisdiction) || JURISDICTION_OPTIONS[0];

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Title & Code */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer" onClick={() => { setPreviewPolicy(p); setShowPreviewModal(true); }}>
                          {p.title}
                        </div>
                        <div className="text-xs font-mono text-gray-400 mt-0.5">{p.policy_code}</div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            p.category === 'sop' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {p.category.toUpperCase()}
                        </span>
                      </td>

                      {/* Jurisdiction */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                          <span>{jurObj.flag}</span>
                          <span>{p.jurisdiction_name}</span>
                        </div>
                      </td>

                      {/* Target & Enforcement */}
                      <td className="px-4 py-3.5">
                        <div className="text-xs font-medium text-gray-800">{p.target_audience}</div>
                        <div className="text-[11px] text-gray-400">{p.enforcement_level}</div>
                      </td>

                      {/* Version & Dates */}
                      <td className="px-4 py-3.5">
                        <div className="text-xs font-medium text-gray-800">v{p.version}</div>
                        <div className="text-[11px] text-gray-400">Eff: {p.effective_date}</div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            p.status === 'published'
                              ? 'bg-green-100 text-green-800'
                              : p.status === 'archived'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status.toUpperCase()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Preview Document"
                            onClick={() => {
                              setPreviewPolicy(p);
                              setShowPreviewModal(true);
                            }}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            title="Download PDF"
                            onClick={() => handleDownloadPDF(p)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            title="Edit Policy"
                            onClick={() => handleEditPolicy(p)}
                            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            title="Duplicate Copy"
                            onClick={() => handleDuplicatePolicy(p.id)}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {p.status === 'draft' && (
                            <button
                              title="Publish Policy"
                              onClick={() => handleStatusChange(p.id, 'published')}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}

                          {p.status === 'published' && (
                            <button
                              title="Archive Policy"
                              onClick={() => handleStatusChange(p.id, 'archived')}
                              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            title="Delete Policy"
                            onClick={() => handleDeletePolicy(p.id, p.title)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
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
        </div>
      )}

      {/* EDIT / CREATE POLICY MODAL */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-8 border border-gray-100 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  {editingPolicy ? 'Edit Policy / SOP Document' : 'Create & Define Policy / SOP'}
                </h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  Customize legal policy terms, target audience, enforcement level, and section contents.
                </p>
              </div>
              <button
                onClick={() => setShowEditorModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm text-gray-700">
              {/* Prefill Template Banner */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-lg">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900">Prefill Standard Law Template</h4>
                    <p className="text-xs text-blue-700">
                      Select standard prefilled text tailored to {formData.jurisdiction_name} ({formData.jurisdiction}).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="px-3 py-1.5 border border-blue-300 rounded-lg text-xs bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 flex-1"
                  >
                    <option value="">-- Choose Standard Template --</option>
                    {availableTemplates.map((tmpl) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.title}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={!selectedTemplateId}
                    onClick={() => handleApplyTemplate(selectedTemplateId)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    Prefill
                  </button>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Jurisdiction */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Law Jurisdiction *</label>
                  <select
                    value={formData.jurisdiction}
                    onChange={(e) => {
                      const jurObj = JURISDICTION_OPTIONS.find((j) => j.value === e.target.value);
                      setFormData((prev) => ({
                        ...prev,
                        jurisdiction: e.target.value as PolicyJurisdiction,
                        jurisdiction_name: jurObj ? jurObj.label : 'Global Standard',
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    {JURISDICTION_OPTIONS.map((j) => (
                      <option key={j.value} value={j.value}>
                        {j.flag} {j.label} ({j.value})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Document Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value as PolicyCategory }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="policy">Policy</option>
                    <option value="sop">Standard Operating Procedure (SOP)</option>
                  </select>
                </div>

                {/* Policy Code */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Policy / Document Code *</label>
                  <input
                    type="text"
                    value={formData.policy_code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, policy_code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                    placeholder="e.g. POL-IN-POSH-001"
                  />
                </div>
              </div>

              {/* Title & Version */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Document Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                    placeholder="e.g. Prevention of Sexual Harassment (POSH) Policy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Version</label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData((prev) => ({ ...prev, version: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="1.0"
                  />
                </div>
              </div>

              {/* Dates & Target Audience */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Effective Date *</label>
                  <input
                    type="date"
                    value={formData.effective_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, effective_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Review Date</label>
                  <input
                    type="date"
                    value={formData.review_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, review_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Enforcement Level</label>
                  <select
                    value={formData.enforcement_level}
                    onChange={(e) => setFormData((prev) => ({ ...prev, enforcement_level: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    {ENFORCEMENT_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Audience Options */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Audience</label>
                <select
                  value={formData.target_audience}
                  onChange={(e) => setFormData((prev) => ({ ...prev, target_audience: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  {TARGET_AUDIENCE_OPTIONS.map((aud) => (
                    <option key={aud} value={aud}>
                      {aud}
                    </option>
                  ))}
                </select>
              </div>

              {/* Summary */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Executive Summary / Objective</label>
                <textarea
                  rows={2}
                  value={formData.summary}
                  onChange={(e) => setFormData((prev) => ({ ...prev, summary: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Provide a brief summary of the policy objective and legal context..."
                />
              </div>

              {/* Dynamic Sections Editor */}
              <div className="border-t border-gray-200 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Policy Sections ({formData.sections.length})
                  </h4>
                  <button
                    onClick={handleAddSection}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Section
                  </button>
                </div>

                {formData.sections.map((section, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 relative">
                    <div className="flex items-center justify-between gap-3">
                      <div className="w-24">
                        <input
                          type="text"
                          value={section.section_number}
                          onChange={(e) => handleUpdateSection(idx, 'section_number', e.target.value)}
                          className="w-full px-2.5 py-1 border border-gray-300 rounded text-xs font-bold text-gray-700"
                          placeholder="1.0"
                        />
                      </div>

                      <div className="flex-1">
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => handleUpdateSection(idx, 'title', e.target.value)}
                          className="w-full px-3 py-1 border border-gray-300 rounded text-xs font-semibold text-gray-900"
                          placeholder="Section Title (e.g. Scope & Applicability)"
                        />
                      </div>

                      <button
                        onClick={() => handleRemoveSection(idx)}
                        className="text-gray-400 hover:text-red-600 p-1"
                        title="Remove Section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      value={section.content}
                      onChange={(e) => handleUpdateSection(idx, 'content', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono bg-white leading-relaxed"
                      placeholder="Write policy terms, rules, bullet points, or instructions for this section..."
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 p-4 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setShowEditorModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-white"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSavePolicy('draft')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => handleSavePolicy('published')}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-lg"
                >
                  Save & Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {showPreviewModal && previewPolicy && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
            {/* Header Toolbar */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="bg-blue-500/20 text-blue-300 text-xs font-mono px-2.5 py-1 rounded border border-blue-400/30">
                  {previewPolicy.policy_code}
                </span>
                <h3 className="text-base font-semibold truncate max-w-md">{previewPolicy.title}</h3>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadPDF(previewPolicy)}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>

                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Render Canvas */}
            <div className="p-8 overflow-y-auto flex-1 bg-gray-50/50 space-y-6 font-sans">
              <div className="bg-white p-10 rounded-xl border border-gray-200 shadow-md max-w-3xl mx-auto space-y-6">
                {/* Header Banner / Entity Logo */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                      {selectedCompany?.company_name || 'KDADKS PRIVATE LIMITED'}
                    </h2>
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mt-0.5">
                      HR Policy & Compliance Document
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
                      {previewPolicy.jurisdiction_name} ({previewPolicy.jurisdiction})
                    </span>
                  </div>
                </div>

                {/* Title Block */}
                <div>
                  <h1 className="text-2xl font-extrabold text-gray-900">{previewPolicy.title}</h1>
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    Document Code: {previewPolicy.policy_code} • Version {previewPolicy.version}
                  </p>
                </div>

                {/* Metadata Card */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block font-medium">Effective Date</span>
                    <span className="font-semibold text-gray-900">{previewPolicy.effective_date}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Review Date</span>
                    <span className="font-semibold text-gray-900">{previewPolicy.review_date || 'Annual'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Target Audience</span>
                    <span className="font-semibold text-gray-900">{previewPolicy.target_audience}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Enforcement</span>
                    <span className="font-semibold text-gray-900">{previewPolicy.enforcement_level}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Category</span>
                    <span className="font-semibold text-gray-900 uppercase">{previewPolicy.category}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Status</span>
                    <span className="font-bold text-green-600 uppercase">{previewPolicy.status}</span>
                  </div>
                </div>

                {/* Executive Summary */}
                {previewPolicy.summary && (
                  <div className="bg-blue-50/50 border-l-4 border-blue-600 p-4 rounded-r-xl">
                    <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">
                      Executive Summary
                    </h4>
                    <p className="text-xs text-blue-950 leading-relaxed italic">{previewPolicy.summary}</p>
                  </div>
                )}

                {/* Structured Sections */}
                <div className="space-y-6 pt-2">
                  {previewPolicy.sections &&
                    previewPolicy.sections.map((sec, idx) => (
                      <div key={idx} className="space-y-2">
                        <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-1">
                          {sec.section_number} {sec.title}
                        </h3>
                        <div className="text-xs text-gray-700 whitespace-pre-line leading-relaxed font-sans pl-2">
                          {sec.content}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Enforcement Notice */}
                <div className="bg-slate-900 text-white rounded-xl p-4 text-xs space-y-1">
                  <h4 className="font-bold text-blue-300">COMPLIANCE ACKNOWLEDGMENT</h4>
                  <p className="text-gray-300 text-[11px] leading-relaxed">
                    Adherence to this document is mandatory for all covered personnel. Violations of policy terms may result
                    in disciplinary action up to and including termination of employment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyManagement;
