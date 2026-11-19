import React, { useState } from 'react';
import { PriorityBadge, OverdueBadge } from '../common/Badge';
import { formatDate, getInitials, isTaskOverdue } from '../../utils/formatters';
import {
  Calendar,
  Pencil,
  ArrowRight,
  ArrowLeft,
  Paperclip,
  RotateCcw,
  Clock,
  CheckCircle2,
  FileCheck,
  Loader2,
  Check,
} from 'lucide-react';

export default function TaskCard({
  task,
  onEdit,
  onStatusChange,
  onSubmitWork,
  onReviewWork,
  currentUserId,
  isLeaderOrReviewer = false,
}) {
  const [updating, setUpdating] = useState(false);
  const overdue = isTaskOverdue(task);

  const isDesignatedReviewer = task.reviewer_id && task.reviewer_id === currentUserId;
  const canReview = isLeaderOrReviewer || isDesignatedReviewer;

  async function handleMove(nextStatus) {
    if (updating) return;
    setUpdating(true);
    try {
      await onStatusChange(task.id, nextStatus);
    } finally {
      setUpdating(false);
    }
  }

  const latestSub = task.latest_submission;

  function handleDragStart(e) {
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({
        taskId: task.id,
        fromStatus: task.status,
      })
    );
  }

  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      className="bg-crew-surface dark:bg-[#1F242F] border border-crew-border/90 dark:border-[#2D3545] rounded-2xl p-4 shadow-subtle hover:shadow-card hover:-translate-y-0.5 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-150 flex flex-col justify-between group cursor-grab active:cursor-grabbing select-none"
    >
      <div>
        {/* Top Category / Topic & Edit Button */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-medium text-crew-text-tertiary tracking-wide truncate max-w-[190px]">
            {task.project_name || 'Academic Deliverable'}
          </span>

          <button
            type="button"
            onClick={() => onEdit(task)}
            className="text-crew-text-tertiary hover:text-crew-text-primary p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors opacity-60 group-hover:opacity-100"
            title="Edit task details"
            aria-label="Edit task"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Task Title */}
        <h4 className="font-heading font-semibold text-sm text-crew-text-primary leading-snug tracking-tight mb-2">
          {task.title}
        </h4>

        {/* Description snippet if available */}
        {task.description && (
          <p className="text-xs text-crew-text-secondary line-clamp-2 leading-relaxed mb-3">
            {task.description}
          </p>
        )}

        {/* Assignee & Tags Row (Directly matching Reference Image 1) */}
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          {/* Assignee Avatar + Name */}
          <div className="flex items-center gap-1.5 min-w-0" title={`Assignee: ${task.assignee_name || 'Unassigned'}`}>
            <div className="w-5 h-5 rounded-full bg-crew-bg border border-crew-border text-crew-text-primary flex items-center justify-center font-heading font-bold text-[10px] flex-shrink-0">
              {task.assignee_name ? getInitials(task.assignee_name) : '—'}
            </div>
            <span className="text-xs text-crew-text-secondary font-medium truncate max-w-[90px]">
              {task.assignee_name || 'Unassigned'}
            </span>
          </div>

          {/* Tags / Badges */}
          <div className="flex items-center gap-1 flex-wrap">
            <PriorityBadge priority={task.priority} />
            {overdue && <OverdueBadge text="Overdue" />}
            {latestSub && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/40"
                title={`Submission Version ${latestSub.version}`}
              >
                <span>v{latestSub.version}</span>
                {latestSub.files && latestSub.files.length > 0 && (
                  <span className="flex items-center gap-0.5 text-purple-700 dark:text-purple-300">
                    <Paperclip className="w-2.5 h-2.5" />
                    {latestSub.files.length}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Changes Requested Feedback Callout */}
        {task.status === 'changes_requested' && latestSub?.review_feedback && (
          <div className="mb-3 p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40 text-xs text-crew-text-primary">
            <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold text-[11px] mb-1">
              <RotateCcw className="w-3 h-3" />
              <span>Feedback on v{latestSub.version}:</span>
            </div>
            <p className="text-[11px] italic text-crew-text-secondary line-clamp-3">
              "{latestSub.review_feedback}"
            </p>
          </div>
        )}

        {/* Submitted Awaiting Review Callout */}
        {task.status === 'submitted' && (
          <div className="mb-3 p-2 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/40 text-xs text-purple-700 dark:text-purple-300 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] font-medium">
              <FileCheck className="w-3 h-3" />
              <span>Awaiting Review (v{latestSub?.version || 1})</span>
            </div>
            {latestSub?.files?.length > 0 && (
              <span className="text-[10px] text-crew-text-secondary font-mono">
                {latestSub.files.length} deliverable{latestSub.files.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Row: Progress & Due Date + Context Action */}
      <div className="pt-2.5 border-t border-crew-border/60 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-crew-text-tertiary">
          {/* Metadata icons */}
          <div className="flex items-center gap-2 text-xs">
            {task.status === 'done' ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                <Check className="w-3 h-3" />
                <span>100%</span>
              </span>
            ) : task.status === 'in_progress' ? (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                <Clock className="w-3 h-3" />
                <span>Active</span>
              </span>
            ) : null}
            {task.reviewer_name && (
              <span className="text-[10px] text-crew-text-tertiary">
                Rev: {task.reviewer_name.split(' ')[0]}
              </span>
            )}
          </div>

          {/* Due date */}
          {task.deadline && (
            <div
              className={`flex items-center gap-1 text-xs font-medium ${
                overdue ? 'text-rose-600 font-semibold' : 'text-crew-text-tertiary'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>{formatDate(task.deadline)}</span>
            </div>
          )}
        </div>

        {/* Workflow Actions */}
        <div>
          {/* Status: To Do */}
          {task.status === 'todo' && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                disabled={updating}
                onClick={() => handleMove('in_progress')}
                className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-lg bg-crew-bg hover:bg-black/5 dark:hover:bg-white/5 border border-crew-border text-crew-text-primary transition-colors disabled:opacity-50"
              >
                {updating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <span>Start Work</span>
                    <ArrowRight className="w-3 h-3 text-crew-text-secondary" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Status: In Progress */}
          {task.status === 'in_progress' && (
            <div className="w-full flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={updating}
                onClick={() => handleMove('todo')}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-crew-text-secondary hover:text-crew-text-primary transition-colors"
                title="Move back to To Do"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>To Do</span>
              </button>

              <button
                type="button"
                onClick={() => onSubmitWork(task)}
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-lg bg-[#181B20] text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-all shadow-sm"
              >
                <span>Submit Work</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Status: Submitted */}
          {task.status === 'submitted' && (
            <div className="w-full flex justify-end">
              {canReview ? (
                <button
                  type="button"
                  onClick={() => onReviewWork(task)}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors shadow-sm"
                >
                  <FileCheck className="w-3 h-3" />
                  <span>Review Deliverable</span>
                </button>
              ) : (
                <span className="text-[11px] text-crew-text-tertiary italic">
                  Awaiting review
                </span>
              )}
            </div>
          )}

          {/* Status: Changes Requested */}
          {task.status === 'changes_requested' && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={() => onSubmitWork(task)}
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-sm"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Resubmit Work</span>
              </button>
            </div>
          )}

          {/* Status: Done */}
          {task.status === 'done' && (
            <div className="w-full flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approved</span>
              </span>
              {latestSub && (
                <button
                  type="button"
                  onClick={() => onReviewWork(task)}
                  className="text-[11px] text-crew-text-tertiary hover:text-crew-text-primary hover:underline"
                >
                  View Details
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
