import React from 'react';
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
  function getHeaderMeta() {
    switch (statusKey) {
      case 'done':
        return {
          barColor: 'bg-emerald-500',
          displayTitle: 'Completed',
        };
      case 'changes_requested':
        return {
          barColor: 'bg-rose-500',
          displayTitle: 'Changes Requested',
        };
      case 'submitted':
        return {
          barColor: 'bg-purple-500',
          displayTitle: 'In Review',
        };
      case 'in_progress':
        return {
          barColor: 'bg-amber-500',
          displayTitle: 'In Progress',
        };
      case 'todo':
      default:
        return {
          barColor: 'bg-blue-500',
          displayTitle: 'To Do',
        };
    }
  }

  const meta = getHeaderMeta();

  return (
    <div className="flex-1 bg-crew-bg/40 dark:bg-[#181C24] border border-crew-border/60 rounded-2xl p-3.5 flex flex-col min-w-[280px] max-w-[320px] flex-shrink-0">
      {/* Column Header matching Reference Image 1 & 2 */}
      <div className="flex items-center justify-between pb-3 mb-2 px-1">
        <div className="flex items-center gap-2">
          {/* Vertical colored bar */}
          <span className={`w-1 h-3.5 rounded-full ${meta.barColor}`} />
          <h3 className="font-heading font-bold text-xs sm:text-sm text-crew-text-primary tracking-tight">
            {meta.displayTitle}
          </h3>
          <span className="text-xs text-crew-text-tertiary font-normal">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-1 text-crew-text-tertiary">
          {onAddTask && (statusKey === 'todo' || statusKey === 'in_progress') && (
            <button
              type="button"
              onClick={() => onAddTask(statusKey)}
              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 hover:text-crew-text-primary transition-colors"
              title="Add task"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 hover:text-crew-text-primary transition-colors"
            title="Column options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Task Cards Container */}
      <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] pr-0.5 pb-2">
        {tasks.length === 0 ? (
          <div className="h-28 border border-dashed border-crew-border rounded-xl flex flex-col items-center justify-center text-xs text-crew-text-tertiary p-4 text-center">
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

      {/* Bottom + Add new ghost button */}
      {onAddTask && (statusKey === 'todo' || statusKey === 'in_progress') && (
        <button
          type="button"
          onClick={() => onAddTask(statusKey)}
          className="mt-2 w-full py-2 px-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium text-crew-text-tertiary hover:text-crew-text-primary transition-colors flex items-center justify-center gap-1.5 focus:outline-none"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add new</span>
        </button>
      )}
    </div>
  );
}
