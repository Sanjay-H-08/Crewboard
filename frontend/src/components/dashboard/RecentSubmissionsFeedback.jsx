import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../common/Badge';
import { formatDate } from '../../utils/formatters';
import {
  FileCheck,
  RotateCcw,
  Clock,
  ExternalLink,
  CheckCircle2,
  Award,
} from 'lucide-react';

export default function RecentSubmissionsFeedback({ tasks = [], teacherAssessment = null }) {
  // Find tasks that have an existing submission record or are in submitted/changes_requested/done state
  const submittedTasks = tasks
    .filter(
      (t) =>
        t.latest_submission ||
        t.status === 'submitted' ||
        t.status === 'changes_requested' ||
        (t.status === 'done' && t.latest_submission),
    )
    .sort((a, b) => {
      const dateA = a.latest_submission?.created_at || a.updated_at;
      const dateB = b.latest_submission?.created_at || b.updated_at;
      return new Date(dateB) - new Date(dateA);
    });

  return (
    <div className="bg-crew-surface border border-crew-border rounded-2xl p-5 shadow-subtle space-y-3.5">
      <div className="flex items-center justify-between pb-2 border-b border-crew-border/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/80 dark:border-purple-800/40">
            <FileCheck className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-crew-text-primary">
              Recent Submissions & Feedback
            </h3>
            <p className="text-[11px] text-crew-text-secondary">
              Reviewer verification notes and deliverable status
            </p>
          </div>
        </div>

        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-crew-bg border border-crew-border text-crew-text-primary">
          {submittedTasks.length} Submitted
        </span>
      </div>

      {/* Official Faculty Rubric Evaluation */}
      {teacherAssessment && (
        <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-heading font-bold text-xs text-emerald-900 dark:text-emerald-200">
                Official Faculty Assessment
              </span>
            </div>
            <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
              {teacherAssessment.total_rubric_score || 0} / 15
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[11px] font-medium pt-1">
            <div className="p-1.5 rounded-lg bg-crew-surface/70 border border-emerald-200/40 dark:border-emerald-800/20 text-center">
              <span className="text-[10px] text-crew-text-secondary block">Technical</span>
              <span className="font-bold text-crew-text-primary">
                {teacherAssessment.technical_score || 0}/5
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-crew-surface/70 border border-emerald-200/40 dark:border-emerald-800/20 text-center">
              <span className="text-[10px] text-crew-text-secondary block">Documentation</span>
              <span className="font-bold text-crew-text-primary">
                {teacherAssessment.documentation_score || 0}/5
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-crew-surface/70 border border-emerald-200/40 dark:border-emerald-800/20 text-center">
              <span className="text-[10px] text-crew-text-secondary block">Collaboration</span>
              <span className="font-bold text-crew-text-primary">
                {teacherAssessment.collaboration_score || 0}/5
              </span>
            </div>
          </div>

          {teacherAssessment.feedback && (
            <div className="p-2 rounded-lg bg-crew-surface/60 border border-emerald-200/40 dark:border-emerald-800/20 text-[11px] text-crew-text-secondary italic">
              "{teacherAssessment.feedback}"
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-300 pt-0.5">
            <span>Evaluator: {teacherAssessment.teacher_name || 'Faculty Supervisor'}</span>
            <span>{teacherAssessment.updated_at ? formatDate(teacherAssessment.updated_at) : ''}</span>
          </div>
        </div>
      )}

      {submittedTasks.length === 0 ? (
        <div className="py-8 text-center text-xs text-crew-text-secondary space-y-1.5">
          <Clock className="w-6 h-6 text-crew-text-tertiary mx-auto mb-1" />
          <p className="font-semibold text-crew-text-primary">No submissions recorded yet</p>
          <p className="text-[11px] text-crew-text-tertiary">
            When you submit completed tasks for peer or leader review, status updates and feedback will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
          {submittedTasks.slice(0, 5).map((task) => {
            const sub = task.latest_submission;
            const hasFeedback = Boolean(sub?.review_feedback);
            const isChangesRequested = task.status === 'changes_requested';
            const isApproved = task.status === 'done' || sub?.status === 'approved';

            return (
              <div
                key={task.id}
                className="p-3.5 rounded-xl border border-crew-border bg-crew-bg/40 space-y-2 text-xs transition-colors hover:border-gray-300 dark:hover:border-gray-600"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={task.status} />
                      {sub?.version && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-crew-bg border border-crew-border text-crew-text-secondary">
                          v{sub.version}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-crew-text-primary truncate">
                      {task.title}
                    </h4>
                  </div>

                  <Link
                    to={`/projects/${task.project_id}`}
                    className="p-1 text-crew-text-tertiary hover:text-crew-text-primary transition-colors flex-shrink-0"
                    title="View task"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Feedback Box */}
                {hasFeedback ? (
                  <div
                    className={`p-2.5 rounded-lg text-[11px] leading-relaxed border ${
                      isChangesRequested
                        ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/40 text-amber-900 dark:text-amber-200'
                        : isApproved
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
                        : 'bg-crew-surface border-crew-border text-crew-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold mb-0.5 text-[10px] uppercase tracking-wider">
                      {isChangesRequested ? (
                        <RotateCcw className="w-3 h-3 text-amber-600" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      )}
                      <span>
                        Feedback from {sub.reviewer_name || task.reviewer_name || 'Reviewer'}:
                      </span>
                    </div>
                    <p className="italic">{sub.review_feedback}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[11px] text-crew-text-tertiary">
                    <Clock className="w-3 h-3" />
                    <span>Awaiting peer review verification</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-crew-text-tertiary pt-1 border-t border-crew-border/40">
                  <span>
                    {sub?.created_at ? `Submitted ${formatDate(sub.created_at)}` : 'Recently updated'}
                  </span>
                  {task.project_name && (
                    <span className="truncate max-w-[140px] font-medium">{task.project_name}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
