import React from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../../utils/formatters';
import { PriorityBadge } from '../common/Badge';
import { AlertTriangle, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function UpcomingDeadlines({ tasks = [] }) {
  // Filter for uncompleted tasks with valid deadlines
  const activeTasksWithDeadlines = tasks
    .filter((t) => t.status !== 'done' && Boolean(t.deadline))
    .sort((a, b) => new Date(`${a.deadline}T00:00:00`) - new Date(`${b.deadline}T00:00:00`));

  function getDeadlineCountdown(deadlineStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(`${deadlineStr}T00:00:00`);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const daysOverdue = Math.abs(diffDays);
      return {
        label: `${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'} overdue`,
        isOverdue: true,
        urgency: 'critical',
      };
    }
    if (diffDays === 0) {
      return { label: 'Due today', isOverdue: false, urgency: 'high' };
    }
    if (diffDays === 1) {
      return { label: 'Due tomorrow', isOverdue: false, urgency: 'medium' };
    }
    if (diffDays <= 7) {
      return { label: `Due in ${diffDays} days`, isOverdue: false, urgency: 'moderate' };
    }
    return { label: formatDate(deadlineStr), isOverdue: false, urgency: 'normal' };
  }

  return (
    <div className="bg-crew-surface border border-crew-border rounded-2xl p-5 shadow-subtle space-y-3.5">
      <div className="flex items-center justify-between pb-2 border-b border-crew-border/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/80 dark:border-amber-800/40">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-crew-text-primary">
              Upcoming Deadlines
            </h3>
            <p className="text-[11px] text-crew-text-secondary">
              Pending milestones requiring attention
            </p>
          </div>
        </div>

        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-crew-bg border border-crew-border text-crew-text-primary">
          {activeTasksWithDeadlines.length} Due
        </span>
      </div>

      {activeTasksWithDeadlines.length === 0 ? (
        <div className="py-8 text-center text-xs text-crew-text-secondary space-y-1.5">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
          <p className="font-semibold text-crew-text-primary">Zero impending deadlines</p>
          <p className="text-[11px] text-crew-text-tertiary">
            All your assigned milestones are on track or completed.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 divide-y divide-crew-border/40">
          {activeTasksWithDeadlines.slice(0, 6).map((task) => {
            const { label, isOverdue } = getDeadlineCountdown(task.deadline);

            return (
              <div
                key={task.id}
                className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 text-xs group"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={task.priority} />
                    <span className="font-semibold text-crew-text-primary truncate">
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-crew-text-secondary">
                    {task.project_name && (
                      <span className="truncate text-crew-text-tertiary">
                        {task.project_name}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        isOverdue
                          ? 'text-rose-600 dark:text-rose-400 font-bold'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {isOverdue && <AlertTriangle className="w-3 h-3 text-rose-500 flex-shrink-0" />}
                      <span>{label}</span>
                    </span>
                  </div>
                </div>

                <Link
                  to={`/projects/${task.project_id}`}
                  className="p-1 rounded-lg text-crew-text-tertiary hover:text-crew-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex-shrink-0"
                  title="Open in project workspace"
                >
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
