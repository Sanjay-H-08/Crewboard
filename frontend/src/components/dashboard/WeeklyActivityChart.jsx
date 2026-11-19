import React, { useMemo } from 'react';
import { Activity, TrendingUp } from 'lucide-react';

export default function WeeklyActivityChart({ activities = [], myTasks = [] }) {
  // Compute activity for the past 7 days (today down to 6 days ago)
  const chartData = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Count activities occurring on this date
      const activityEvents = activities.filter((act) => {
        if (!act.created_at) return false;
        const actDate = new Date(act.created_at);
        return actDate >= d && actDate <= dayEnd;
      }).length;

      // Count deliverables completed on this date
      const completedEvents = myTasks.filter((t) => {
        if (t.status !== 'done') return false;
        const ts = t.updated_at || t.latest_submission?.reviewed_at;
        if (!ts) return false;
        const taskDate = new Date(ts);
        return taskDate >= d && taskDate <= dayEnd;
      }).length;

      // Count submissions created on this date
      const submissionEvents = myTasks.filter((t) => {
        if (!t.latest_submission?.created_at) return false;
        const subDate = new Date(t.latest_submission.created_at);
        return subDate >= d && subDate <= dayEnd;
      }).length;

      const count = activityEvents + completedEvents + submissionEvents;

      days.push({
        dayName,
        dateLabel,
        count,
        activityEvents,
        completedEvents,
        submissionEvents,
        isToday: i === 0,
        date: d,
      });
    }

    const maxCount = Math.max(...days.map((d) => d.count), 4);
    const totalWeek = days.reduce((acc, d) => acc + d.count, 0);
    const mostActive = days.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), days[0]);

    return { days, maxCount, totalWeek, mostActive };
  }, [activities, myTasks]);

  const { days, maxCount, totalWeek, mostActive } = chartData;

  return (
    <div className="bg-gradient-to-b from-white to-slate-50/60 dark:from-[#14171E] dark:to-[#1A1F29] border border-crew-border/90 rounded-2xl p-5 shadow-subtle space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-crew-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200/80 dark:border-sky-800/40 shadow-xs">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-crew-text-primary">
              Weekly Activity Velocity
            </h3>
            <p className="text-[11px] text-crew-text-secondary">
              Logged deliverable events, revisions and collaboration across 7 days
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-crew-text-primary font-mono shadow-xs">
          <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
          <span>{totalWeek} Actions</span>
        </div>
      </div>

      {/* Bar Chart Visualization with Gridlines */}
      <div className="pt-2">
        <div className="h-36 flex items-end justify-between gap-2 sm:gap-3 px-2 relative border-b border-slate-200 dark:border-slate-800/80">
          {/* Subtle horizontal reference grid */}
          <div className="absolute inset-x-2 top-0 border-b border-dashed border-slate-200/60 dark:border-slate-800/40 pointer-events-none" />
          <div className="absolute inset-x-2 top-1/2 border-b border-dashed border-slate-200/60 dark:border-slate-800/40 pointer-events-none" />

          {days.map((item, idx) => {
            const heightPercent = item.count > 0 ? Math.max((item.count / maxCount) * 100, 16) : 10;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center h-full justify-end group relative z-10"
              >
                {/* Tooltip on Hover */}
                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] py-1.5 px-3 rounded-xl shadow-panel whitespace-nowrap font-mono space-y-0.5">
                  <div className="font-bold">{item.dateLabel}: {item.count} action{item.count !== 1 ? 's' : ''}</div>
                  <div className="text-[9px] text-slate-300 dark:text-slate-600">
                    {item.completedEvents} completed · {item.submissionEvents} submissions · {item.activityEvents} logs
                  </div>
                </div>

                {/* Bar */}
                <div className="w-full flex justify-center h-full items-end pb-1">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[32px] rounded-t-lg transition-all duration-300 relative ${
                      item.isToday
                        ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 dark:from-indigo-500 dark:to-indigo-300 shadow-sm ring-2 ring-indigo-500/20'
                        : item.count > 0
                        ? 'bg-gradient-to-t from-sky-600 to-sky-400 dark:from-sky-500 dark:to-sky-300 shadow-xs group-hover:from-indigo-600 group-hover:to-indigo-400'
                        : 'bg-slate-100 dark:bg-slate-800/60 border-t border-x border-slate-200/70 dark:border-slate-700/50'
                    }`}
                  >
                    {item.completedEvents > 0 && (
                      <div className="w-full h-1.5 bg-emerald-400 dark:bg-emerald-300 rounded-t-lg" title={`${item.completedEvents} completed`} />
                    )}
                  </div>
                </div>

                {/* Day Labels */}
                <div className="text-center pt-2 w-full">
                  <span
                    className={`text-[11px] block font-medium ${
                      item.isToday
                        ? 'font-bold text-indigo-600 dark:text-indigo-400'
                        : 'text-crew-text-secondary group-hover:text-crew-text-primary'
                    }`}
                  >
                    {item.dayName}
                  </span>
                  <span className="text-[9px] text-crew-text-tertiary block font-mono">
                    {item.count > 0 ? `${item.count} act` : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart Footer Meta */}
      <div className="pt-2 border-t border-crew-border/60 flex items-center justify-between text-xs text-crew-text-secondary">
        <span>
          Peak Day:{' '}
          <strong className="text-crew-text-primary font-medium">
            {mostActive.count > 0 ? `${mostActive.dayName} (${mostActive.count} actions)` : 'Awaiting activity'}
          </strong>
        </span>
        <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
          Evidence-based velocity
        </span>
      </div>
    </div>
  );
}
