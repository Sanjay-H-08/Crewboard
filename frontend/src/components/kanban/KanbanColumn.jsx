import React from 'react';
import TaskCard from './TaskCard';
import { Circle, Activity, CheckCircle2, Plus } from 'lucide-react';

export default function KanbanColumn({
  _id,
  title,
  statusKey,
  tasks = [],
  onAddTask,
  onEditTask,
  onStatusChange,
}) {
  function getHeaderMeta() {
    switch (statusKey) {
      case 'done':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-crew-success" />,
          accentClass: 'bg-crew-success/10 text-crew-success border-crew-success/20',
          indicatorColor: 'bg-crew-success',
        };
      case 'in_progress':
        return {
          icon: <Activity className="w-4 h-4 text-crew-terracotta" />,
          accentClass: 'bg-crew-terracotta/10 text-crew-terracotta border-crew-terracotta/20',
          indicatorColor: 'bg-crew-terracotta',
        };
      case 'todo':
      default:
        return {
          icon: <Circle className="w-4 h-4 text-crew-text-secondary" />,
          accentClass: 'bg-crew-bg text-crew-text-secondary border-crew-border',
          indicatorColor: 'bg-crew-text-secondary',
        };
    }
  }

  const meta = getHeaderMeta();

  return (
    <div className="flex-1 bg-crew-surface/70 border border-crew-border rounded-lg p-4 flex flex-col min-w-[280px] shadow-subtle">
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-crew-border">
        <div className="flex items-center gap-2">
          {meta.icon}
          <h3 className="font-heading font-bold text-sm text-crew-text-primary tracking-tight">
            {title}
          </h3>
        </div>

        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-sm border ${meta.accentClass}`}
        >
          {tasks.length}
        </span>
      </div>

      {/* Task Cards Container */}
      <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5 pb-2">
        {tasks.length === 0 ? (
          <div className="h-32 border border-dashed border-crew-border/80 rounded-md flex flex-col items-center justify-center text-xs text-crew-text-secondary/70 p-4 text-center">
            <span>No tasks in {title.toLowerCase()}</span>
            <button
              type="button"
              onClick={() => onAddTask(statusKey)}
              className="mt-2 text-crew-action hover:underline font-medium inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add one
            </button>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </div>

      {/* Quick Add at column footer */}
      <button
        type="button"
        onClick={() => onAddTask(statusKey)}
        className="mt-3 w-full py-2 px-3 rounded border border-dashed border-crew-border hover:border-crew-sand hover:bg-crew-bg/60 text-xs font-medium text-crew-text-secondary hover:text-crew-text-primary transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-crew-action"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Task to {title}
      </button>
    </div>
  );
}
