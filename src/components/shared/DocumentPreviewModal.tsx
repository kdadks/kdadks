import React from 'react';
import { X, Download, FileText, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  previewUrl: string | null;
  fileName?: string;
  mimeType?: string;
  onDownload?: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  previewUrl,
  fileName,
  mimeType = 'application/pdf',
  onDownload
}) => {
  if (!isOpen || !previewUrl) return null;

  const isImage = mimeType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName || '');

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full h-[85vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
              {isImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div className="truncate">
              <h2 className="text-base font-semibold text-gray-900 truncate">{title}</h2>
              {fileName && <p className="text-xs text-gray-500 truncate">{fileName}</p>}
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {onDownload && (
              <button
                onClick={onDownload}
                className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-lg transition-colors"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Preview Area */}
        <div className="flex-1 bg-gray-950/90 flex items-center justify-center p-4 overflow-auto">
          {isImage ? (
            <div className="max-w-full max-h-full flex items-center justify-center">
              <img
                src={previewUrl}
                alt={title}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          ) : (
            <iframe
              src={previewUrl}
              className="w-full h-full rounded-md border-0 bg-white"
              title={title}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;
