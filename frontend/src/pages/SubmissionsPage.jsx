import React, { useState, useEffect } from 'react';
import { tasksService, filesService, formatApiError } from '../services/api';
import { formatDate } from '../utils/formatters';
import LoadingSpinner from '../components/common/LoadingSpinner';
import DocumentPreviewModal from '../components/common/DocumentPreviewModal';
import {
  FileText,
  CheckCircle2,
  Clock,
  RotateCcw,
  Paperclip,
  Eye,
  Download,
  Calendar,
} from 'lucide-react';

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewingFile, setPreviewingFile] = useState(null);

  useEffect(() => {
    let active = true;
    tasksService
      .getMySubmissions()
      .then((data) => {
        if (!active) return;
        setSubmissions(data || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(formatApiError(err, 'Failed to load your submissions.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function formatSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" message="Loading your deliverables history..." />;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="pb-4 border-b border-crew-border/60">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200">
              My Learning
            </span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-crew-text-primary tracking-tight">
            Learning Journal & Submissions
          </h1>
          <p className="text-xs sm:text-sm text-crew-text-secondary mt-1">
            Audit trail of your submitted deliverables, revision versions, and peer feedback
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
            {error}
          </div>
        )}

        {submissions.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-heading font-semibold text-sm text-crew-text-primary">
                No Submissions Logged Yet
              </h4>
              <p className="text-xs text-crew-text-secondary max-w-sm mx-auto">
                When you submit deliverables on task cards in your Kanban workspace, your submission versions and feedback will be cataloged here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => {
              const isApproved = sub.status === 'approved';
              const isChangesRequested = sub.status === 'changes_requested';

              return (
                <div
                  key={sub.submission_id}
                  className={`p-5 rounded-2xl bg-gradient-to-b from-white to-slate-50/60 dark:from-[#14171E] dark:to-[#1A1F29] border transition-all duration-150 hover:shadow-card space-y-4 ${
                    sub.is_final_approved
                      ? 'border-emerald-300 dark:border-emerald-700/80'
                      : 'border-crew-border/90'
                  }`}
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-crew-border/60">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-crew-text-primary">
                          {sub.task_title}
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200">
                          Version {sub.version}
                        </span>
                        <span className="text-xs text-crew-text-tertiary">
                          ({sub.project_name})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-crew-text-tertiary font-mono">
                        <Calendar className="w-3 h-3" />
                        <span>Submitted {formatDate(sub.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {sub.is_final_approved ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Final Approved Deliverable</span>
                        </span>
                      ) : isApproved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Approved</span>
                        </span>
                      ) : isChangesRequested ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                          <RotateCcw className="w-3 h-3 text-amber-500" />
                          <span>Revisions Requested</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200">
                          <Clock className="w-3 h-3 text-purple-500" />
                          <span>Under Review</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reflection Notes & Review Comments */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-semibold text-crew-text-tertiary uppercase tracking-wider block">
                        Submission Notes
                      </span>
                      <p className="text-crew-text-primary leading-relaxed whitespace-pre-wrap">
                        {sub.notes || <span className="text-slate-400 italic">No notes provided.</span>}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-800/40 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                          Reviewer Feedback
                        </span>
                        {sub.reviewer_name && (
                          <span className="text-purple-600 dark:text-purple-400 font-mono">
                            By {sub.reviewer_name}
                          </span>
                        )}
                      </div>
                      <p className="text-crew-text-primary leading-relaxed italic">
                        {sub.review_feedback ? `"${sub.review_feedback}"` : <span className="text-slate-400 not-italic">Pending review evaluation.</span>}
                      </p>
                    </div>
                  </div>

                  {/* Attached Deliverables Files */}
                  {sub.files && sub.files.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-crew-text-primary">
                        <Paperclip className="w-3.5 h-3.5 text-purple-500" />
                        <span>Attached Deliverable Files ({sub.files.length})</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {sub.files.map((file) => {
                          const ext = file.original_filename.split('.').pop()?.toLowerCase();
                          const isPreviewable = ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext);

                          return (
                            <div
                              key={file.id}
                              className="p-2.5 rounded-xl border border-crew-border bg-white dark:bg-slate-900 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center flex-shrink-0">
                                  <FileText className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-medium text-crew-text-primary truncate block text-[11px]" title={file.original_filename}>
                                    {file.original_filename}
                                  </span>
                                  <span className="text-[10px] text-crew-text-tertiary font-mono">
                                    {formatSize(file.file_size_bytes)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                {isPreviewable && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewingFile(file)}
                                    className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                                    title="Preview Document"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => filesService.downloadFile(file.id, file.original_filename)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Download File"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={Boolean(previewingFile)}
        onClose={() => setPreviewingFile(null)}
        file={previewingFile}
      />
    </>
  );
}
