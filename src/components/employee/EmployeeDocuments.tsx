import { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  X,
  File
} from 'lucide-react';
import { employeeDocumentService } from '../../services/employeeDocumentService';
import type { EmployeeDocument } from '../../types/employee';
import { useToast } from '../ui/ToastProvider';
import ConfirmDialog from '../ui/ConfirmDialog';

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

export default function EmployeeDocuments() {
  const { showSuccess, showError } = useToast();
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [adminDocuments, setAdminDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<EmployeeDocument | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<EmployeeDocument | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'uploaded' | 'admin-generated'>('uploaded');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    document_type: '',
    document_name: '',
    document_description: '',
    expiry_date: '',
    file: null as File | null
  });

  const currentUser = (() => {
    const session = sessionStorage.getItem('employee_session');
    if (session) {
      const employee = JSON.parse(session);
      return { id: employee.id, name: employee.name };
    }
    return { id: '', name: '' };
  })();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const [uploaded, adminGen] = await Promise.all([
        employeeDocumentService.getDocuments({ employee_id: currentUser.id }),
        employeeDocumentService.getAdminGeneratedDocuments(currentUser.id)
      ]);
      setDocuments(uploaded);
      setAdminDocuments(adminGen);
    } catch (error) {
      console.error('Error loading documents:', error);
      showError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      showError('File size exceeds 2MB limit');
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      showError('Invalid file type. Allowed: PDF, JPEG, JPG, PNG');
      return;
    }

    setUploadForm({ ...uploadForm, file });
  };

  const handleUpload = async () => {
    try {
      if (!uploadForm.file || !uploadForm.document_type || !uploadForm.document_name) {
        showError('Please fill all required fields');
        return;
      }

      setUploading(true);

      await employeeDocumentService.uploadDocument({
        employee_id: currentUser.id,
        document_type: uploadForm.document_type,
        document_name: uploadForm.document_name,
        document_description: uploadForm.document_description,
        file: uploadForm.file,
        expiry_date: uploadForm.expiry_date || undefined
      });

      showSuccess('Document uploaded successfully');
      setShowUploadModal(false);
      setUploadForm({
        document_type: '',
        document_name: '',
        document_description: '',
        expiry_date: '',
        file: null
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      loadDocuments();
    } catch (error: any) {
      console.error('Upload error:', error);
      showError(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async (document: EmployeeDocument) => {
    try {
      const url = await employeeDocumentService.getDocumentUrl(document.storage_path);
      setPreviewUrl(url);
      setSelectedDocument(document);
      setShowPreviewModal(true);
    } catch (error) {
      console.error('Preview error:', error);
      showError('Failed to preview document');
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
    } catch (error) {
      console.error('Download error:', error);
      showError('Failed to download document');
    }
  };

  const handleDelete = (doc: EmployeeDocument) => {
    setDocumentToDelete(doc);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;
    
    setDeleting(true);
    try {
      await employeeDocumentService.deleteDocument(documentToDelete.id);
      showSuccess('Document deleted successfully');
      setShowDeleteConfirm(false);
      setDocumentToDelete(null);
      loadDocuments();
    } catch (error: any) {
      console.error('Delete error:', error);
      showError(error.message || 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-700', label: 'Pending Verification' },
      verified: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Verified' },
      rejected: { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Rejected' },
      expired: { icon: AlertCircle, color: 'bg-gray-100 text-gray-700', label: 'Expired' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getDocumentTypeName = (type: string) => {
    return DOCUMENT_TYPES.find(dt => dt.value === type)?.label || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
          <p className="text-gray-600 mt-1">Upload and manage your documents</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('uploaded')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'uploaded'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My Uploads ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab('admin-generated')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'admin-generated'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Company Documents ({adminDocuments.length})
          </button>
        </nav>
      </div>

      {/* Documents List */}
      {activeTab === 'uploaded' ? (
        <>
          {documents.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents uploaded</h3>
              <p className="text-gray-600 mb-4">Start by uploading your first document</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="bg-primary-100 rounded-lg p-3">
                        <FileText className="w-6 h-6 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{doc.document_name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{getDocumentTypeName(doc.document_type)}</p>
                        {doc.document_description && (
                          <p className="text-sm text-gray-500 mt-2">{doc.document_description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>•</span>
                          <span>{new Date(doc.uploaded_at!).toLocaleDateString('en-IN')}</span>
                          {doc.expiry_date && (
                            <>
                              <span>•</span>
                              <span>Expires: {new Date(doc.expiry_date).toLocaleDateString('en-IN')}</span>
                            </>
                          )}
                        </div>
                        <div className="mt-3">
                          {getStatusBadge(doc.verification_status)}
                        </div>
                        {doc.verification_comments && (
                          <div className={`mt-3 p-3 rounded-lg text-sm ${
                            doc.verification_status === 'rejected' 
                              ? 'bg-red-50 border border-red-200' 
                              : 'bg-blue-50 border border-blue-200'
                          }`}>
                            <div className="flex items-start">
                              {doc.verification_status === 'rejected' ? (
                                <XCircle className="w-4 h-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                              )}
                              <div>
                                <strong className={doc.verification_status === 'rejected' ? 'text-red-900' : 'text-blue-900'}>
                                  {doc.verification_status === 'rejected' ? 'Rejection Reason:' : 'Admin Comment:'}
                                </strong>
                                <p className={`mt-1 ${doc.verification_status === 'rejected' ? 'text-red-800' : 'text-blue-800'}`}>
                                  {doc.verification_comments}
                                </p>
                                {doc.verification_status === 'rejected' && (
                                  <p className="mt-2 text-xs text-red-700 font-medium">
                                    Please upload a corrected document or contact admin for clarification.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handlePreview(doc)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      {(doc.verification_status === 'pending' || doc.verification_status === 'rejected') && (
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {adminDocuments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No company documents</h3>
              <p className="text-gray-600">Company-generated documents will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {adminDocuments.map(doc => (
                <div
                  key={doc.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-4">
                    <div className="bg-green-100 rounded-lg p-3">
                      <FileText className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {doc.document_type.replace('_', ' ').toUpperCase()}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">Document #: {doc.document_number}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>{new Date(doc.document_date).toLocaleDateString('en-IN')}</span>
                        <span>•</span>
                        <span className="capitalize">{doc.status}</span>
                      </div>
                      {doc.purpose && (
                        <p className="text-sm text-gray-600 mt-2">{doc.purpose}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Upload Document</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Document Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type *
                </label>
                <select
                  value={uploadForm.document_type}
                  onChange={(e) => setUploadForm({ ...uploadForm, document_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select document type</option>
                  {DOCUMENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Document Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Name *
                </label>
                <input
                  type="text"
                  value={uploadForm.document_name}
                  onChange={(e) => setUploadForm({ ...uploadForm, document_name: e.target.value })}
                  placeholder="e.g., PAN Card - John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={uploadForm.document_description}
                  onChange={(e) => setUploadForm({ ...uploadForm, document_description: e.target.value })}
                  placeholder="Brief description of the document"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={uploadForm.expiry_date}
                  onChange={(e) => setUploadForm({ ...uploadForm, expiry_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Allowed: PDF, JPEG, PNG | Max size: 2MB
                </p>
                {uploadForm.file && (
                  <p className="text-sm text-gray-700 mt-2">
                    Selected: {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewUrl && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{selectedDocument.document_name}</h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleDownload(selectedDocument)}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setPreviewUrl(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {selectedDocument.mime_type === 'application/pdf' ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full"
                  title="Document Preview"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt={selectedDocument.document_name}
                  className="max-w-full max-h-full mx-auto"
                />
              )}
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDocumentToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${documentToDelete?.document_name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
      />    </div>
  );
}
