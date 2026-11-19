import React, { useState } from 'react';
import TaskCard from './TaskCard';
import { Plus, MoreHorizontal } from 'lucide-react';

export default function KanbanColumn({
  _id,
  title: _title,
  statusKey,
  tasks = [],
  onAddTask,
  onEditTask,
  onStatusChange,
  onSubmitWork,
  onReviewWork,
  currentUserId,
  isLeaderOrReviewer,
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  function getHeaderMeta() {
    switch (statusKey) {
      case 'done':
        return {
          barColor: 'bg-emerald-500',
          displayTitle: 'Done',
          subtitle: 'Verified & Approved',
          containerBg: 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/40',
          badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
          highlightRing: 'ring-2 ring-emerald-500/50 bg-emerald-50/80 dark:bg-emerald-950/40',
        };
      case 'changes_requested':
        return {
          barColor: 'bg-amber-500',
          displayTitle: 'Changes Requested',
          subtitle: 'Revisions Required',
          containerBg: 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-800/40',
          badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
          highlightRing: 'ring-2 ring-amber-500/50 bg-amber-50/80 dark:bg-amber-950/40',
        };
      case 'submitted':
        return {
          barColor: 'bg-purple-500',
          displayTitle: 'Submitted',
          subtitle: 'Under Formal Review',
          containerBg: 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-200/70 dark:border-purple-800/40',
          badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300',
          highlightRing: 'ring-2 ring-purple-500/50 bg-purple-50/80 dark:bg-purple-950/40',
        };
      case 'in_progress':
        return {
          barColor: 'bg-blue-500',
          displayTitle: 'In Progress',
          subtitle: 'Active Development',
          containerBg: 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/70 dark:border-blue-800/40',
          badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
          highlightRing: 'ring-2 ring-blue-500/50 bg-blue-50/80 dark:bg-blue-950/40',
        };
      case 'todo':
      default:
        return {
          barColor: 'bg-slate-400',
          displayTitle: 'To Do',
          subtitle: 'Planned Deliverables',
          containerBg: 'bg-slate-50/60 dark:bg-slate-900/30 border-slate-200/80 dark:border-slate-800/50',
          badgeBg: 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          highlightRing: 'ring-2 ring-slate-400/50 bg-slate-100/80 dark:bg-slate-800/40',
        };
    }
  }

  const meta = getHeaderMeta();

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      const { taskId, fromStatus } = data;
      if (!taskId || fromStatus === statusKey) return;

      const draggedTask = tasks.find((t) => t.id === taskId) || { id: taskId, status: fromStatus };

      // Route drop action according to workflow rules
      if (statusKey === 'todo' && fromStatus === 'in_progress') {
        onStatusChange?.(taskId, 'todo');
      } else if (statusKey === 'in_progress' && (fromStatus === 'todo' || fromStatus === 'changes_requested')) {
        onStatusChange?.(taskId, 'in_progress');
      } else if (statusKey === 'submitted' && (fromStatus === 'in_progress' || fromStatus === 'changes_requested')) {
        onSubmitWork?.(draggedTask);
      } else if ((statusKey === 'done' || statusKey === 'changes_requested') && fromStatus === 'submitted') {
        if (isLeaderOrReviewer) {
          onReviewWork?.(draggedTask);
        }
      }
    } catch {
      // Ignore invalid drag-drop parse
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 rounded-2xl p-3.5 flex flex-col min-w-[280px] max-w-[320px] flex-shrink-0 border transition-all duration-200 ${
        meta.containerBg
      } ${isDragOver ? meta.highlightRing : 'shadow-subtle'}`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 mb-2 px-1 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2">
          {/* Status color indicator bar */}
          <span className={`w-1.5 h-4 rounded-full ${meta.barColor}`} />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-heading font-bold text-xs sm:text-sm text-crew-text-primary tracking-tight">
                {meta.displayTitle}
              </h3>
              <span className={`text-[11px] font-mono font-bold px-1.5 py-0.2 rounded-full ${meta.badgeBg}`}>
                {tasks.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-crew-text-tertiary">
          {onAddTask && (statusKey === 'todo' || statusKey === 'in_progress') && (
            <button
              type="button"
              onClick={() => onAddTask(statusKey)}
              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 hover:text-crew-text-primary transition-colors"
              title="Add task in this column"
              aria-label={`Add task in ${meta.displayTitle}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 hover:text-crew-text-primary transition-colors"
            title="Column options"
            aria-label="Column options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Task Cards Container */}
      <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] pr-0.5 pb-2">
        {tasks.length === 0 ? (
          <div className="h-28 border border-dashed border-crew-border/80 rounded-xl flex flex-col items-center justify-center text-xs text-crew-text-tertiary p-4 text-center bg-white/40 dark:bg-black/10">
            <span>No tasks in {meta.displayTitle.toLowerCase()}</span>
            {onAddTask && (statusKey === 'todo' || statusKey === 'in_progress') && (
              <button
                type="button"
                onClick={() => onAddTask(statusKey)}
                className="mt-2 text-xs font-semibold text-crew-text-primary hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add new
              </button>
            )}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onStatusChange={onStatusChange}
              onSubmitWork={onSubmitWork}
              onReviewWork={onReviewWork}
              currentUserId={currentUserId}
              isLeaderOrReviewer={isLeaderOrReviewer}
            />
          ))
        )}
      </div>

      {/* Bottom + Add new button */}
      {onAddTask && (statusKey === 'todo' || statusKey === 'in_progress') && (
        <button
          type="button"
          onClick={() => onAddTask(statusKey)}
          className="mt-2 w-full py-2 px-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium text-crew-text-tertiary hover:text-crew-text-primary transition-colors flex items-center justify-center gap-1.5 focus:outline-none"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add new deliverable</span>
        </button>
      )}
    </div>
  );
}
