import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { tasksService, formatApiError } from '../../services/api';
import { PriorityBadge, OverdueBadge, StatusBadge } from '../common/Badge';
import { formatDate, isTaskOverdue } from '../../utils/formatters';
import { CheckCircle2, Play, Calendar, ExternalLink } from 'lucide-react';

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
      <div className="bg-crew-surface border border-crew-border rounded-lg p-6 text-center text-xs text-crew-text-secondary">
        <CheckCircle2 className="w-8 h-8 text-crew-action/40 mx-auto mb-2" />
        <p className="font-semibold text-crew-text-primary text-sm">All caught up!</p>
        <p className="mt-1">You have no pending tasks assigned in this workspace.</p>
      </div>
    );
  }

  return (
    <div className="bg-crew-surface border border-crew-border rounded-lg shadow-card overflow-hidden">
      {error && (
        <div className="p-3 bg-crew-danger/10 text-crew-danger text-xs font-medium border-b border-crew-danger/20">
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
              className="p-4 hover:bg-crew-bg/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                      className="text-crew-text-secondary hover:text-crew-action p-0.5"
                      title="Open project"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-crew-text-secondary">
                  {task.deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-crew-text-secondary/70" />
                      Due {formatDate(task.deadline)}
                    </span>
                  )}
                  {task.project_name && (
                    <span className="truncate">Project: {task.project_name}</span>
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
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-sm bg-crew-terracotta/10 text-crew-terracotta hover:bg-crew-terracotta hover:text-crew-surface font-medium border border-crew-terracotta/20 transition-all disabled:opacity-50"
                  >
                    <Play className="w-3 h-3" />
                    Start
                  </button>
                )}

                {task.status === 'in_progress' && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleQuickStatusChange(task, 'done')}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-sm bg-crew-success/10 text-crew-success hover:bg-crew-success hover:text-crew-surface font-medium border border-crew-success/20 transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Mark Done
                  </button>
                )}

                {task.status === 'done' && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleQuickStatusChange(task, 'in_progress')}
                    className="text-xs px-2 py-1 rounded-sm text-crew-text-secondary hover:text-crew-text-primary hover:bg-crew-bg font-medium transition-colors disabled:opacity-50"
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
