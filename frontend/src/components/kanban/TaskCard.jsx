import React, { useState } from 'react';
import { PriorityBadge, OverdueBadge } from '../common/Badge';
import { formatDate, getInitials, isTaskOverdue } from '../../utils/formatters';
import {
  Calendar,
  Pencil,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  User,
  Loader2,
} from 'lucide-react';

export default function TaskCard({ task, onEdit, onStatusChange }) {
  const [updating, setUpdating] = useState(false);
  const overdue = isTaskOverdue(task);

  async function handleMove(nextStatus) {
    if (updating) return;
    setUpdating(true);
    try {
      await onStatusChange(task.id, nextStatus);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="bg-crew-surface border border-crew-border rounded-md p-4 shadow-subtle hover:border-crew-sand hover:shadow-card transition-all duration-150 flex flex-col justify-between group">
      <div>
        {/* Top Badges & Edit Button */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <PriorityBadge priority={task.priority} />
            {overdue && <OverdueBadge text="Overdue" />}
          </div>

          <button
            type="button"
            onClick={() => onEdit(task)}
            className="text-crew-text-secondary hover:text-crew-action p-1 rounded hover:bg-crew-bg transition-colors opacity-70 group-hover:opacity-100"
            title="Edit task details"
            aria-label="Edit task"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Title */}
        <h4 className="font-heading font-semibold text-sm text-crew-text-primary leading-snug tracking-tight mb-1.5">
          {task.title}
        </h4>

        {/* Description snippet */}
        {task.description && (
          <p className="text-xs text-crew-text-secondary line-clamp-2 leading-relaxed mb-3">
            {task.description}
          </p>
        )}
      </div>

      {/* Footer: Assignee & Deadline + Status Buttons */}
      <div className="pt-3 border-t border-crew-border/60 space-y-3">
        <div className="flex items-center justify-between text-xs gap-2">
          {/* Assignee */}
          <div className="flex items-center gap-1.5 min-w-0" title={task.assignee_name || 'Unassigned'}>
            {task.assigned_to ? (
              <div className="w-5 h-5 rounded-full bg-crew-action/15 text-crew-action border border-crew-action/25 flex items-center justify-center font-heading font-bold text-[10px] flex-shrink-0">
                {getInitials(task.assignee_name)}
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-crew-bg text-crew-text-secondary border border-crew-border flex items-center justify-center flex-shrink-0">
                <User className="w-3 h-3" />
              </div>
            )}
            <span className="text-[11px] font-medium text-crew-text-secondary truncate">
              {task.assignee_name || 'Unassigned'}
            </span>
          </div>

          {/* Deadline */}
          {task.deadline && (
            <div
              className={`flex items-center gap-1 text-[11px] font-medium flex-shrink-0 ${
                overdue ? 'text-crew-danger font-semibold' : 'text-crew-text-secondary'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>{formatDate(task.deadline)}</span>
            </div>
          )}
        </div>

        {/* 1-Click Status Movement Action Buttons */}
        <div className="flex items-center justify-between gap-1.5 pt-1">
          {task.status === 'todo' && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                disabled={updating}
                onClick={() => handleMove('in_progress')}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-crew-bg hover:bg-crew-sand/20 border border-crew-border text-crew-text-primary transition-colors disabled:opacity-50"
              >
                {updating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <span>Start Work</span>
                    <ArrowRight className="w-3 h-3 text-crew-action" />
                  </>
                )}
              </button>
            </div>
          )}

          {task.status === 'in_progress' && (
            <div className="w-full flex items-center justify-between">
              <button
                type="button"
                disabled={updating}
                onClick={() => handleMove('todo')}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded hover:bg-crew-bg text-crew-text-secondary hover:text-crew-text-primary transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>To Do</span>
              </button>

              <button
                type="button"
                disabled={updating}
                onClick={() => handleMove('done')}
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded bg-crew-success/10 text-crew-success hover:bg-crew-success hover:text-crew-surface border border-crew-success/20 transition-all disabled:opacity-50"
              >
                {updating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <span>Complete</span>
                    <CheckCircle2 className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          )}

          {task.status === 'done' && (
            <div className="w-full flex justify-start">
              <button
                type="button"
                disabled={updating}
                onClick={() => handleMove('in_progress')}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded hover:bg-crew-bg text-crew-text-secondary hover:text-crew-text-primary transition-colors disabled:opacity-50"
              >
                {updating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <ArrowLeft className="w-3 h-3" />
                    <span>Reopen Task</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
