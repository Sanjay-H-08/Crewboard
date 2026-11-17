import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { tasksService, formatApiError } from '../../services/api';
import { PriorityBadge, OverdueBadge, StatusBadge } from '../common/Badge';
import { formatDate, isTaskOverdue } from '../../utils/formatters';
import { CheckCircle2, Play, Calendar, ExternalLink, UploadCloud } from 'lucide-react';

export default function MyTasksList({ tasks = [], onTaskUpdated }) {
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [error, setError] = useState(null);

  async function handleQuickStatusChange(task, nextStatus) {
    setUpdatingTaskId(task.id);
    setError(null);
    try {
      const updated = await tasksService.update(task.id, { status: nextStatus });
      if (onTaskUpdated) onTaskUpdated(updated);
    } catch (err) {
      setError(formatApiError(err, 'Failed to update task status.'));
    } finally {
      setUpdatingTaskId(null);
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-crew-surface border border-crew-border rounded-2xl p-8 text-center text-xs text-crew-text-secondary shadow-subtle">
        <CheckCircle2 className="w-8 h-8 text-crew-text-tertiary mx-auto mb-2" />
        <p className="font-semibold text-crew-text-primary text-sm">All caught up!</p>
        <p className="mt-1">You have no pending tasks assigned in this workspace.</p>
      </div>
    );
  }

  return (
    <div className="bg-crew-surface border border-crew-border rounded-2xl shadow-subtle overflow-hidden">
      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-medium border-b border-rose-200 dark:border-rose-800/40">
          {error}
        </div>
      )}

      <div className="divide-y divide-crew-border/60">
        {tasks.map((task) => {
          const overdue = isTaskOverdue(task);
          const isUpdating = updatingTaskId === task.id;

          return (
            <div
              key={task.id}
              className="p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                  {overdue && <OverdueBadge text="Overdue" />}
                </div>

                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-crew-text-primary truncate">
                    {task.title}
                  </h4>
                  {task.project_id && (
                    <Link
                      to={`/projects/${task.project_id}`}
                      className="text-crew-text-tertiary hover:text-crew-text-primary p-0.5"
                      title="Open project"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-crew-text-secondary">
                  {task.deadline && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3 text-crew-text-tertiary" />
                      Due {formatDate(task.deadline)}
                    </span>
                  )}
                  {task.project_name && (
                    <span className="truncate text-crew-text-tertiary">Project: {task.project_name}</span>
                  )}
                </div>
              </div>

              {/* 1-Click Quick Transition Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                {task.status === 'todo' && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleQuickStatusChange(task, 'in_progress')}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl bg-crew-bg hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-crew-text-primary border border-crew-border transition-all disabled:opacity-50"
                  >
                    <Play className="w-3 h-3" />
                    <span>Start</span>
                  </button>
                )}

                {(task.status === 'in_progress' || task.status === 'changes_requested') && (
                  <Link
                    to={`/projects/${task.project_id}`}
                    className="inline-flex items-center gap-1 text-xs px-3.5 py-1.5 rounded-xl bg-[#181B20] text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 font-semibold transition-all shadow-sm"
                  >
                    <UploadCloud className="w-3 h-3" />
                    <span>Submit</span>
                  </Link>
                )}

                {task.status === 'submitted' && (
                  <span className="text-[11px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-200/80 dark:border-purple-800/40">
                    In Review
                  </span>
                )}

                {task.status === 'done' && (
                  <div className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Done</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
