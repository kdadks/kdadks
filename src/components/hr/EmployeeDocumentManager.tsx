import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  File
} from 'lucide-react';
import { employeeDocumentService } from '../../services/employeeDocumentService';
import type { EmployeeDocument } from '../../types/employee';
import { useToast } from '../ui/ToastProvider';
import ConfirmDialog from '../ui/ConfirmDialog';
import DocumentPreviewModal from '../shared/DocumentPreviewModal';

const DOCUMENT_TYPES = [
  { value: 'aadhar_card', label: 'Aadhar Card' },
  { value: 'pan_card', label: 'PAN Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'voter_id', label: 'Voter ID' },
  { value: 'education_certificate', label: 'Education Certificate' },
  { value: 'experience_letter', label: 'Experience Letter' },
  { value: 'bank_proof', label: 'Bank Account Proof' },
  { value: 'medical_certificate', label: 'Medical Certificate' },
  { value: 'resume', label: 'Resume/CV' },
  { value: 'photo', label: 'Photograph' },
  { value: 'other', label: 'Other' }
];

interface EmployeeDocumentManagerProps {
  employeeId: string;
  employeeName: string;
  readOnly?: boolean;
}

export const EmployeeDocumentManager: React.FC<EmployeeDocumentManagerProps> = ({
  employeeId,
  employeeName,
  readOnly = false
}) => {
  const { showSuccess, showError } = useToast();
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modals & Confirmation
  const [showUploadForm, setShowUploadForm] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [documentToDelete, setDocumentToDelete] = useState<EmployeeDocument | null>(null);

  // Preview State
  const [previewDoc, setPreviewDoc] = useState<EmployeeDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  // Form State for New Upload
  const [uploadForm, setUploadForm] = useState({
    document_type: 'aadhar_card',
    document_name: '',
    document_description: '',
    expiry_date: '',
    file: null as File | null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [documentToReplace, setDocumentToReplace] = useState<EmployeeDocument | null>(null);

  useEffect(() => {
    if (employeeId) {
      loadDocuments();
    }
  }, [employeeId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await employeeDocumentService.getDocuments({ employee_id: employeeId });
      setDocuments(docs);
    } catch (err: any) {
      console.error('Error loading employee documents:', err);
      showError('Failed to load employee documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError('File size exceeds 5MB limit');
      return;
    }

    const allowedMime = ['application/pdf', 'application/x-pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isAllowed = allowedMime.includes(file.type) || ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext || '');

    if (!isAllowed) {
      showError('Invalid file type. Allowed formats: PDF, JPEG, PNG, WEBP');
      return;
    }

    const defaultName = uploadForm.document_name || file.name.replace(/\.[^/.]+$/, '');
    setUploadForm({
      ...uploadForm,
      file,
      document_name: defaultName
    });
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.document_type || !uploadForm.document_name) {
      showError('Please select a file and enter document name');
      return;
    }

    try {
      setUploading(true);
      await employeeDocumentService.uploadDocument({
        employee_id: employeeId,
        document_type: uploadForm.document_type,
        document_name: uploadForm.document_name,
        document_description: uploadForm.document_description,
        file: uploadForm.file,
        expiry_date: uploadForm.expiry_date || undefined
      });

      showSuccess('Document uploaded successfully');
      setShowUploadForm(false);
      setUploadForm({
        document_type: 'aadhar_card',
        document_name: '',
        document_description: '',
        expiry_date: '',
        file: null
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadDocuments();
    } catch (err: any) {
      console.error('Error uploading document:', err);
      showError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async (doc: EmployeeDocument) => {
    try {
      setPreviewDoc(doc);
      let url = doc.document_url;
      if (!url && doc.storage_path) {
        url = await employeeDocumentService.getDocumentUrl(doc.storage_path, 3600);
      }
      if (!url) {
        showError('Preview URL is unavailable for this document');
        return;
      }
      setPreviewUrl(url);
      setShowPreviewModal(true);
    } catch (err: any) {
      console.error('Preview error:', err);
      showError('Failed to generate document preview');
    }
  };

  const handleDownload = async (doc: EmployeeDocument) => {
    try {
      const blob = await employeeDocumentService.downloadDocument(doc.storage_path);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Download error:', err);
      showError('Failed to download document file');
    }
  };

  const triggerReplace = (doc: EmployeeDocument) => {
    setDocumentToReplace(doc);
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
      replaceInputRef.current.click();
    }
  };

  const handleReplaceFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !documentToReplace) return;

    try {
      setReplacingId(documentToReplace.id);
      await employeeDocumentService.replaceDocument(documentToReplace.id, file);
      showSuccess(`Successfully replaced document file: ${documentToReplace.document_name}`);
      setDocumentToReplace(null);
      loadDocuments();
    } catch (err: any) {
      console.error('Replace error:', err);
      showError(err.message || 'Failed to replace document file');
    } finally {
      setReplacingId(null);
    }
  };

  const triggerDelete = (doc: EmployeeDocument) => {
    setDocumentToDelete(doc);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;
    try {
      setDeletingId(documentToDelete.id);
      await employeeDocumentService.deleteDocument(documentToDelete.id, true);
      showSuccess('Document deleted successfully');
      setShowDeleteConfirm(false);
      setDocumentToDelete(null);
      loadDocuments();
    } catch (err: any) {
      console.error('Delete document error:', err);
      showError(err.message || 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: any; color: string; label: string }> = {
      pending: { icon: Clock, color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Pending Verification' },
      verified: { icon: CheckCircle, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Verified' },
      rejected: { icon: XCircle, color: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Rejected' },
      expired: { icon: AlertCircle, color: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Expired' }
    };
    const cfg = config[status] || config.pending;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for replacement */}
      <input
        type="file"
        ref={replaceInputRef}
        onChange={handleReplaceFileSelect}
        accept="application/pdf,image/jpeg,image/jpg,image/png"
        className="hidden"
      />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200/80">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Employee Documents ({documents.length})
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Uploaded identity, address, and qualification documents for {employeeName}
          </p>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="flex items-center justify-center px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {showUploadForm ? 'Cancel Upload' : 'Upload New Document'}
          </button>
        )}
      </div>

      {/* Upload New Document Form */}
      {showUploadForm && !readOnly && (
        <form onSubmit={handleUploadSubmit} className="bg-blue-50/50 p-5 rounded-xl border border-blue-200/80 space-y-4 animate-fade-in">
          <h4 className="text-sm font-semibold text-blue-900 border-b border-blue-200 pb-2">
            Upload Document Form
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Document Type *
              </label>
              <select
                value={uploadForm.document_type}
                onChange={(e) => setUploadForm({ ...uploadForm, document_type: e.target.value })}
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Document Name / Title *
              </label>
              <input
                type="text"
                value={uploadForm.document_name}
                onChange={(e) => setUploadForm({ ...uploadForm, document_name: e.target.value })}
                placeholder="e.g. Aadhar Card Front & Back"
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Select File (PDF, PNG, JPG - Max 5MB) *
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="application/pdf,image/jpeg,image/jpg,image/png"
                className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                value={uploadForm.expiry_date}
                onChange={(e) => setUploadForm({ ...uploadForm, expiry_date: e.target.value })}
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Notes / Description (Optional)
              </label>
              <input
                type="text"
                value={uploadForm.document_description}
                onChange={(e) => setUploadForm({ ...uploadForm, document_description: e.target.value })}
                placeholder="Additional notes about this document..."
                className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-blue-200">
            <button
              type="button"
              onClick={() => setShowUploadForm(false)}
              className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex items-center px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Upload Document
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Document List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mr-2" />
          <span className="text-xs text-gray-500">Loading documents...</span>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300 p-6">
          <File className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <h4 className="text-sm font-medium text-gray-900">No documents found</h4>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            No official documents have been uploaded for this employee yet. Use the upload button above to add documents.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Document Name & Type</th>
                  <th className="px-4 py-3">Size & Format</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Uploaded Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents.map((doc) => {
                  const typeLabel = DOCUMENT_TYPES.find((t) => t.value === doc.document_type)?.label || doc.document_type;
                  const isReplacing = replacingId === doc.id;
                  const isDeleting = deletingId === doc.id;

                  return (
                    <tr key={doc.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{doc.document_name}</div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <span className="capitalize bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px]">
                            {typeLabel}
                          </span>
                          {doc.document_description && <span>• {doc.document_description}</span>}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-gray-900">{formatFileSize(doc.file_size)}</div>
                        <div className="text-[10px] text-gray-400 uppercase">{doc.mime_type?.split('/')[1] || 'FILE'}</div>
                      </td>

                      <td className="px-4 py-3">
                        {getStatusBadge(doc.verification_status)}
                        {doc.expiry_date && (
                          <div className="text-[10px] text-gray-500 mt-1 flex items-center">
                            <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                            Exp: {new Date(doc.expiry_date).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-gray-500">
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => handlePreview(doc)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Preview Document In-App"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownload(doc)}
                            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Download File"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {!readOnly && (
                            <>
                              <button
                                type="button"
                                onClick={() => triggerReplace(doc)}
                                disabled={isReplacing}
                                className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Replace Document File"
                              >
                                <RefreshCw className={`w-4 h-4 ${isReplacing ? 'animate-spin' : ''}`} />
                              </button>

                              <button
                                type="button"
                                onClick={() => triggerDelete(doc)}
                                disabled={isDeleting}
                                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Delete Document"
                              >
                                <Trash2 className={`w-4 h-4 ${isDeleting ? 'animate-spin' : ''}`} />
                              </button>
                            </>
                          )}
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

      {/* In-App Preview Modal */}
      <DocumentPreviewModal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setPreviewUrl(null);
          setPreviewDoc(null);
        }}
        title={previewDoc?.document_name || 'Document Preview'}
        previewUrl={previewUrl}
        fileName={previewDoc?.file_name}
        mimeType={previewDoc?.mime_type}
        onDownload={previewDoc ? () => handleDownload(previewDoc) : undefined}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDocumentToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Employee Document"
        message={`Are you sure you want to delete "${documentToDelete?.document_name}"? This file will be permanently removed from storage and database records.`}
        confirmText="Delete Document"
        cancelText="Cancel"
        type="danger"
        loading={deletingId !== null}
      />
    </div>
  );
};

export default EmployeeDocumentManager;
