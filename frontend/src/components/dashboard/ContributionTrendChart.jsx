import React, { useMemo } from 'react';
import { TrendingUp, CheckCircle2, FileCheck, Layers } from 'lucide-react';

export default function ContributionTrendChart({ tasks = [], activities = [] }) {
  const trendData = useMemo(() => {
    const now = new Date();
    const weeks = [];

    for (let w = 3; w >= 0; w--) {
      const end = new Date(now);
      end.setDate(end.getDate() - w * 7);
      end.setHours(23, 59, 59, 999);

      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);

      const label = w === 0 ? 'This Week' : `${w}w Ago`;

      const finishedTasks = tasks.filter((t) => {
        if (t.status !== 'done') return false;
        const ts = t.updated_at || t.latest_submission?.reviewed_at;
        if (!ts) return false;
        const d = new Date(ts);
        return d >= start && d <= end;
      }).length;

      const submissions = tasks.filter((t) => {
        if (!t.latest_submission?.created_at) return false;
        const d = new Date(t.latest_submission.created_at);
        return d >= start && d <= end;
      }).length;

      const activityCount = activities.filter((act) => {
        if (!act.created_at) return false;
        const d = new Date(act.created_at);
        return d >= start && d <= end;
      }).length;

      const totalWork = finishedTasks * 2 + submissions + activityCount;

      weeks.push({
        label,
        startDate: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        endDate: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        finishedTasks,
        submissions,
        activityCount,
        totalWork,
      });
    }

    const maxVal = Math.max(...weeks.map((w) => w.totalWork), 6);
    const totalFinishedOverall = tasks.filter((t) => t.status === 'done').length;
    const totalSubmittedOverall = tasks.filter((t) => t.latest_submission).length;

    return { weeks, maxVal, totalFinishedOverall, totalSubmittedOverall };
  }, [tasks, activities]);

  const { weeks, maxVal, totalFinishedOverall, totalSubmittedOverall } = trendData;

  return (
    <div className="bg-gradient-to-b from-white to-slate-50/60 dark:from-[#14171E] dark:to-[#1A1F29] border border-crew-border/90 rounded-2xl p-5 shadow-subtle space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-crew-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/80 dark:border-indigo-800/40 shadow-xs">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-crew-text-primary">
              Personal Contribution Trend
            </h3>
            <p className="text-[11px] text-crew-text-secondary">
              Deliverable volume & verified progress over rolling 4 weeks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-crew-text-primary font-mono shadow-xs">
            {totalFinishedOverall} Verified Done
          </span>
        </div>
      </div>

      {/* Velocity Trend Graphic with reference lines */}
      <div className="pt-2">
        <div className="h-36 flex items-end justify-between gap-3 sm:gap-4 px-2 relative border-b border-slate-200 dark:border-slate-800/80">
          <div className="absolute inset-x-2 top-0 border-b border-dashed border-slate-200/60 dark:border-slate-800/40 pointer-events-none" />
          <div className="absolute inset-x-2 top-1/2 border-b border-dashed border-slate-200/60 dark:border-slate-800/40 pointer-events-none" />

          {weeks.map((w, idx) => {
            const heightPercent = w.totalWork > 0 ? Math.max((w.totalWork / maxVal) * 100, 18) : 10;
            const isCurrent = idx === 3;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center h-full justify-end group relative z-10"
              >
                {/* Hover Tooltip with High Contrast */}
                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] py-1.5 px-3 rounded-xl shadow-panel whitespace-nowrap font-mono space-y-0.5">
                  <div className="font-bold">{w.startDate} – {w.endDate}</div>
                  <div className="text-[9px] text-slate-300 dark:text-slate-600">
                    Done: {w.finishedTasks} · Submissions: {w.submissions} · Logs: {w.activityCount}
                  </div>
                </div>

                {/* Visual Bar */}
                <div className="w-full flex justify-center h-full items-end pb-1">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[42px] rounded-t-lg transition-all duration-300 relative overflow-hidden ${
                      isCurrent
                        ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 dark:from-indigo-500 dark:to-indigo-300 shadow-sm ring-2 ring-indigo-500/20'
                        : w.totalWork > 0
                        ? 'bg-gradient-to-t from-blue-600 to-indigo-400 dark:from-blue-500 dark:to-indigo-300 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800/60 border-t border-x border-slate-200/70 dark:border-slate-700/50'
                    }`}
                  >
                    {w.finishedTasks > 0 && (
                      <div className="w-full h-1.5 bg-emerald-400 dark:bg-emerald-300 absolute top-0" />
                    )}
                  </div>
                </div>

                {/* Week Label */}
                <div className="text-center pt-2 w-full">
                  <span
                    className={`text-[11px] block font-medium ${
                      isCurrent
                        ? 'font-bold text-indigo-600 dark:text-indigo-400'
                        : 'text-crew-text-secondary group-hover:text-crew-text-primary'
                    }`}
                  >
                    {w.label}
                  </span>
                  <span className="text-[9px] text-crew-text-tertiary block font-mono">
                    {w.startDate}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary KPI Footer */}
      <div className="pt-2 border-t border-crew-border/60 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="p-2.5 rounded-xl bg-white/70 dark:bg-black/20 border border-crew-border/60 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-crew-text-secondary block truncate">Tasks Verified</span>
            <span className="font-mono font-bold text-crew-text-primary text-xs">{totalFinishedOverall} Completed</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/70 dark:bg-black/20 border border-crew-border/60 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center flex-shrink-0">
            <FileCheck className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-crew-text-secondary block truncate">Work Revisions</span>
            <span className="font-mono font-bold text-crew-text-primary text-xs">{totalSubmittedOverall} Submissions</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/70 dark:bg-black/20 border border-crew-border/60 flex items-center gap-2 col-span-2 sm:col-span-1">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-crew-text-secondary block truncate">Academic Velocity</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs truncate">
              {totalFinishedOverall > 0 ? 'Consistent Contributor' : 'Beginning Project'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
