import React, { useMemo } from 'react';
import { PieChart, CheckCircle2, Clock, FileCheck, RotateCcw, AlertTriangle, ListTodo } from 'lucide-react';
import { isTaskOverdue } from '../../utils/formatters';

export default function TaskStatusDistributionChart({ tasks = [] }) {
  const stats = useMemo(() => {
    const total = tasks.length;
    if (total === 0) {
      return {
        total: 0,
        segments: [],
        overdueCount: 0,
      };
    }

    const doneCount = tasks.filter((t) => t.status === 'done').length;
    const inReviewCount = tasks.filter((t) => t.status === 'submitted').length;
    const changesCount = tasks.filter((t) => t.status === 'changes_requested').length;
    const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
    const todoCount = tasks.filter((t) => t.status === 'todo').length;
    const overdueCount = tasks.filter((t) => isTaskOverdue(t)).length;

    const segments = [
      {
        id: 'done',
        label: 'Completed',
        count: doneCount,
        percentage: Math.round((doneCount / total) * 100),
        barClass: 'bg-emerald-500 hover:bg-emerald-600',
        textColor: 'text-emerald-700 dark:text-emerald-300',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
        borderColor: 'border-emerald-200 dark:border-emerald-800/40',
        dotColor: 'bg-emerald-500',
        icon: CheckCircle2,
      },
      {
        id: 'in_progress',
        label: 'In Progress',
        count: inProgressCount,
        percentage: Math.round((inProgressCount / total) * 100),
        barClass: 'bg-blue-500 hover:bg-blue-600',
        textColor: 'text-blue-700 dark:text-blue-300',
        bgColor: 'bg-blue-50 dark:bg-blue-950/40',
        borderColor: 'border-blue-200 dark:border-blue-800/40',
        dotColor: 'bg-blue-500',
        icon: Clock,
      },
      {
        id: 'submitted',
        label: 'Under Review',
        count: inReviewCount,
        percentage: Math.round((inReviewCount / total) * 100),
        barClass: 'bg-purple-500 hover:bg-purple-600',
        textColor: 'text-purple-700 dark:text-purple-300',
        bgColor: 'bg-purple-50 dark:bg-purple-950/40',
        borderColor: 'border-purple-200 dark:border-purple-800/40',
        dotColor: 'bg-purple-500',
        icon: FileCheck,
      },
      {
        id: 'changes_requested',
        label: 'Needs Revision',
        count: changesCount,
        percentage: Math.round((changesCount / total) * 100),
        barClass: 'bg-amber-500 hover:bg-amber-600',
        textColor: 'text-amber-700 dark:text-amber-300',
        bgColor: 'bg-amber-50 dark:bg-amber-950/40',
        borderColor: 'border-amber-200 dark:border-amber-800/40',
        dotColor: 'bg-amber-500',
        icon: RotateCcw,
      },
      {
        id: 'todo',
        label: 'To Do',
        count: todoCount,
        percentage: Math.round((todoCount / total) * 100),
        barClass: 'bg-slate-400 hover:bg-slate-500',
        textColor: 'text-slate-700 dark:text-slate-300',
        bgColor: 'bg-slate-50 dark:bg-slate-900/40',
        borderColor: 'border-slate-200 dark:border-slate-800/40',
        dotColor: 'bg-slate-400',
        icon: ListTodo,
      },
    ];

    return { total, segments, overdueCount };
  }, [tasks]);

  const { total, segments = [], overdueCount = 0 } = stats;

  return (
    <div className="bg-gradient-to-b from-white to-slate-50/60 dark:from-[#14171E] dark:to-[#1A1F29] border border-crew-border/90 rounded-2xl p-5 shadow-subtle space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-crew-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/80 dark:border-emerald-800/40 shadow-xs">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-crew-text-primary">
              Task Status Distribution
            </h3>
            <p className="text-[11px] text-crew-text-secondary">
              Proportional breakdown of active and completed deliverables
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              <span>{overdueCount} Overdue</span>
            </span>
          )}
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-crew-text-primary font-mono shadow-xs">
            {total} Total Tasks
          </span>
        </div>
      </div>

      {total === 0 ? (
        <div className="py-7 px-4 rounded-xl bg-slate-50/60 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
            <ListTodo className="w-4 h-4" />
          </div>
          <div className="text-xs font-semibold text-crew-text-primary">No Deliverables Assigned Yet</div>
          <p className="text-[11px] text-crew-text-tertiary max-w-sm mx-auto">
            Once tasks are created and assigned in your team workspace, their workflow distribution will render here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* High-visibility multi-segment distribution bar with rounded track */}
          <div className="space-y-1.5">
            <div className="w-full h-5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 flex overflow-hidden p-1 gap-1 shadow-inner">
              {segments
                .filter((s) => s.count > 0)
                .map((seg) => (
                  <div
                    key={seg.id}
                    style={{ width: `${Math.max(seg.percentage, 5)}%` }}
                    className={`h-full rounded-md ${seg.barClass} transition-all duration-500 shadow-xs cursor-pointer`}
                    title={`${seg.label}: ${seg.count} (${seg.percentage}%)`}
                  />
                ))}
            </div>
            <div className="flex justify-between items-center text-[10px] text-crew-text-tertiary px-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Interactive Legend Grid with high contrast */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {segments.map((seg) => {
              const Icon = seg.icon;
              return (
                <div
                  key={seg.id}
                  className={`p-2.5 rounded-xl border ${seg.bgColor} ${seg.borderColor} flex items-center justify-between text-xs transition-colors hover:shadow-xs`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${seg.dotColor} flex-shrink-0`} />
                    <Icon className={`w-3.5 h-3.5 ${seg.textColor} flex-shrink-0`} />
                    <span className="font-semibold text-crew-text-primary truncate text-[11px]">
                      {seg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono flex-shrink-0">
                    <span className="font-bold text-crew-text-primary text-xs">{seg.count}</span>
                    <span className="text-[10px] text-crew-text-secondary">({seg.percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
