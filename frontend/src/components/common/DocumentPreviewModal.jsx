import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Image as ImageIcon, FileArchive, Loader2, AlertCircle } from 'lucide-react';
import { filesService } from '../../services/api';

export default function DocumentPreviewModal({ isOpen, onClose, file }) {
  const [loading, setLoading] = useState(false);
  const [objectUrl, setObjectUrl] = useState(null);
  const [error, setError] = useState(null);

  const filename = file?.original_filename || file?.filename || 'Document';
  const mimeType = file?.mime_type || '';
  const ext = filename.split('.').pop()?.toLowerCase();

  const isPdf = mimeType.includes('pdf') || ext === 'pdf';
  const isImage = mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
  const canPreview = isPdf || isImage;

  useEffect(() => {
    if (!isOpen || !file?.id || !canPreview) {
      setObjectUrl(null);
      return;
    }

    let active = true;
    let url = null;
    setLoading(true);
    setError(null);

    filesService
      .fetchBlob(file.id, 'preview')
      .then((blob) => {
        if (!active) return;
        url = window.URL.createObjectURL(blob);
        setObjectUrl(url);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.detail || 'Failed to load document preview.');
        setLoading(false);
      });

    return () => {
      active = false;
      if (url) {
        window.URL.revokeObjectURL(url);
      }
    };
  }, [isOpen, file?.id, canPreview]);

  if (!isOpen || !file) return null;

  function handleDownload() {
    filesService.downloadFile(file.id, filename);
  }

  function formatSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white dark:bg-[#1A1F29] border border-crew-border shadow-modal flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-crew-border/80 bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center flex-shrink-0">
              {isPdf ? (
                <FileText className="w-4 h-4" />
              ) : isImage ? (
                <ImageIcon className="w-4 h-4" />
              ) : (
                <FileArchive className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-semibold text-sm text-crew-text-primary truncate">
                {filename}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-crew-text-tertiary font-mono">
                <span>{formatSize(file.file_size_bytes)}</span>
                <span>•</span>
                <span className="uppercase">{ext || 'FILE'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close document preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100/60 dark:bg-black/30 min-h-[350px]">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-xs text-crew-text-secondary py-12">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
              <span>Loading document stream...</span>
            </div>
          )}

          {error && (
            <div className="p-6 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-center space-y-2 max-w-md">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <div className="font-semibold text-xs text-rose-700 dark:text-rose-300">Preview Error</div>
              <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
              <button
                type="button"
                onClick={handleDownload}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-600 text-white"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File Directly</span>
              </button>
            </div>
          )}

          {!loading && !error && canPreview && objectUrl && (
            isPdf ? (
              <iframe
                src={objectUrl}
                title={filename}
                className="w-full h-[70vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white shadow-sm"
              />
            ) : (
              <div className="max-h-[70vh] flex items-center justify-center p-2">
                <img
                  src={objectUrl}
                  alt={filename}
                  className="max-h-[68vh] max-w-full object-contain rounded-xl shadow-md"
                />
              </div>
            )
          )}

          {!loading && !error && !canPreview && (
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-crew-border text-center space-y-3 max-w-md shadow-subtle">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 mx-auto flex items-center justify-center">
                <FileArchive className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-heading font-bold text-sm text-crew-text-primary">
                  Native Browser Preview Not Supported
                </h4>
                <p className="text-xs text-crew-text-secondary leading-relaxed">
                  In-browser preview is available for PDF and image files. For Microsoft Office files (.docx, .pptx) or archives (.zip), download the file to inspect on your machine.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-semibold text-xs transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download {filename}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
