import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Eye,
  Download,
  CheckCircle2,
  Clock,
  RotateCcw,
  Paperclip,
  Award,
} from 'lucide-react';
import { formatDate, getInitials } from '../../utils/formatters';
import { filesService } from '../../services/api';
import DocumentPreviewModal from '../common/DocumentPreviewModal';

export default function SubmissionsDocumentsViewer({
  submissions = [],
  projects = [],
  selectedProjectId = '',
  onSelectProject,
  onOpenRubricModal,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [previewingFile, setPreviewingFile] = useState(null);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      if (selectedProjectId && sub.project_id !== selectedProjectId) {
        return false;
      }
      if (selectedStatus !== 'all' && sub.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesStudent = sub.student_name?.toLowerCase().includes(query);
        const matchesTask = sub.task_title?.toLowerCase().includes(query);
        const matchesProject = sub.project_name?.toLowerCase().includes(query);
        const matchesTeam = sub.team_name?.toLowerCase().includes(query);
        if (!matchesStudent && !matchesTask && !matchesProject && !matchesTeam) {
          return false;
        }
      }
      return true;
    });
  }, [submissions, selectedProjectId, selectedStatus, searchQuery]);

  function getStatusBadge(status, isFinalApproved) {
    if (isFinalApproved) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Final Approved</span>
        </span>
      );
    }
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Approved</span>
          </span>
        );
      case 'changes_requested':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
            <RotateCcw className="w-3 h-3 text-amber-500" />
            <span>Needs Revision</span>
          </span>
        );
      case 'submitted':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200">
            <Clock className="w-3 h-3 text-purple-500" />
            <span>Awaiting Review</span>
          </span>
        );
    }
  }

  function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filter and Search Bar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 shadow-subtle flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student, task, or team..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-crew-border bg-slate-50/50 dark:bg-slate-900/50 text-crew-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Project Filter */}
            <select
              value={selectedProjectId}
              onChange={(e) => onSelectProject(e.target.value)}
              className="text-xs rounded-xl border border-crew-border bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2 text-crew-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[200px]"
            >
              <option value="">All Supervised Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.team_name ? `(${p.team_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs w-full md:w-auto">
            {['all', 'submitted', 'approved', 'changes_requested'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-colors ${
                  selectedStatus === st
                    ? 'bg-white dark:bg-slate-900 text-crew-text-primary font-semibold shadow-xs'
                    : 'text-crew-text-secondary hover:text-crew-text-primary'
                }`}
              >
                {st === 'changes_requested' ? 'Revisions' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Submissions List */}
        {filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 shadow-subtle space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-heading font-semibold text-sm text-crew-text-primary">
                No Submissions Found
              </h4>
              <p className="text-xs text-crew-text-secondary max-w-sm mx-auto">
                No deliverables matching your filter criteria. Student submissions and attached files will appear here for review.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredSubmissions.map((sub) => (
              <div
                key={sub.submission_id}
                className={`p-5 rounded-2xl bg-white dark:bg-[#14171E] border transition-all duration-150 hover:shadow-card space-y-4 ${
                  sub.is_final_approved
                    ? 'border-emerald-200/90 dark:border-emerald-800/60 shadow-subtle'
                    : 'border-crew-border/90 shadow-subtle'
                }`}
              >
                {/* Row 1: Header metadata */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-crew-border/60">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-heading font-bold text-xs text-crew-text-primary flex-shrink-0">
                      {getInitials(sub.student_name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-crew-text-primary truncate">
                          {sub.student_name}
                        </span>
                        <span className="text-[11px] text-crew-text-tertiary">
                          ({sub.student_email})
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-crew-text-secondary border border-slate-200 dark:border-slate-700">
                          {sub.team_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-crew-text-secondary mt-0.5">
                        <span className="font-medium text-crew-text-primary">{sub.task_title}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                          Version {sub.version}
                        </span>
                        <span>•</span>
                        <span className="text-[11px] text-crew-text-tertiary">
                          Submitted {formatDate(sub.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
                    {getStatusBadge(sub.status, sub.is_final_approved)}
                    {onOpenRubricModal && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenRubricModal({
                            user_id: sub.student_id,
                            student_id: sub.student_id,
                            studentId: sub.student_id,
                            full_name: sub.student_name,
                            student_name: sub.student_name,
                            studentName: sub.student_name,
                            email: sub.student_email,
                            student_email: sub.student_email,
                            studentEmail: sub.student_email,
                            project_id: sub.project_id,
                            projectId: sub.project_id,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-semibold border border-indigo-200/80 dark:border-indigo-800/40 transition-colors"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Assess Rubric</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Row 2: Submitter Notes & Feedback */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {sub.notes ? (
                    <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/60 space-y-1">
                      <span className="text-[10px] font-semibold text-crew-text-tertiary uppercase tracking-wider block">
                        Student Submission Notes
                      </span>
                      <p className="text-crew-text-primary leading-relaxed whitespace-pre-wrap">
                        {sub.notes}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50/40 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 italic">
                      No submitter notes provided.
                    </div>
                  )}

                  {sub.review_feedback ? (
                    <div className="p-3 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-800/40 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                          Reviewer Audit Feedback
                        </span>
                        {sub.reviewer_name && (
                          <span className="text-purple-600 dark:text-purple-400 font-mono">
                            By {sub.reviewer_name}
                          </span>
                        )}
                      </div>
                      <p className="text-crew-text-primary leading-relaxed italic">
                        "{sub.review_feedback}"
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50/40 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 italic">
                      No review feedback recorded yet.
                    </div>
                  )}
                </div>

                {/* Row 3: Attached Deliverables Files */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-crew-text-primary">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Attached Deliverable Files ({sub.files.length})</span>
                  </div>

                  {sub.files.length === 0 ? (
                    <div className="text-xs text-crew-text-tertiary italic">
                      No files attached to this submission record.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {sub.files.map((file) => {
                        const ext = file.original_filename.split('.').pop()?.toLowerCase();
                        const isPreviewable = ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext);

                        return (
                          <div
                            key={file.id}
                            className="p-2.5 rounded-xl border border-crew-border bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-2 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium text-crew-text-primary truncate block text-[11px]" title={file.original_filename}>
                                  {file.original_filename}
                                </span>
                                <span className="text-[10px] text-crew-text-tertiary font-mono">
                                  {formatFileSize(file.file_size_bytes)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              {isPreviewable && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewingFile(file)}
                                  className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                                  title="Preview Document"
                                  aria-label="Preview Document"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => filesService.downloadFile(file.id, file.original_filename)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Download File"
                                aria-label="Download File"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
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
