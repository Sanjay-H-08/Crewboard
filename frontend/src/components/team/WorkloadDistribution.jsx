import React from 'react';
import { PieChart, CheckCircle2, Activity, ListTodo } from 'lucide-react';

export default function WorkloadDistribution({ workload = [] }) {
  if (!workload || workload.length === 0) {
    return (
      <div className="bg-crew-surface border border-crew-border rounded-lg p-6 shadow-card text-center text-xs text-crew-text-secondary">
        <PieChart className="w-6 h-6 text-crew-sand mx-auto mb-2" />
        <p className="font-semibold text-crew-text-primary text-sm">No workload distribution data</p>
        <p className="mt-1">Assign tasks to team members to visualize work allocation.</p>
      </div>
    );
  }

  // Pre-selected colors from the Warm Editorial palette
  const segmentColors = [
    'bg-crew-action',
    'bg-crew-terracotta',
    'bg-crew-sand',
    'bg-crew-info',
    'bg-[#8C6D58]',
    'bg-[#5F7D6D]',
  ];

  return (
    <div className="bg-crew-surface border border-crew-border rounded-lg p-5 shadow-card space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-crew-border/60">
        <div>
          <h3 className="font-heading font-bold text-sm text-crew-text-primary tracking-tight flex items-center gap-2">
            <PieChart className="w-4 h-4 text-crew-action" />
            Workload Distribution
          </h3>
          <p className="text-xs text-crew-text-secondary mt-0.5">
            Share of assigned deliverables per teammate
          </p>
        </div>
      </div>

      {/* Stacked Proportional Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-3 rounded-full bg-crew-bg flex overflow-hidden border border-crew-border/60">
          {workload.map((member, idx) => {
            const share = member.workload_share_percentage || 0;
            if (share <= 0) return null;
            const colorClass = segmentColors[idx % segmentColors.length];
            return (
              <div
                key={member.user_id || idx}
                className={`${colorClass} h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full`}
                style={{ width: `${share}%` }}
                title={`${member.full_name}: ${share}% (${member.assigned_tasks} tasks)`}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] text-crew-text-secondary">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Detailed Member Rows */}
      <div className="space-y-3 pt-2">
        {workload.map((member, idx) => {
          const colorClass = segmentColors[idx % segmentColors.length];
          const isConcentrated = (member.workload_share_percentage || 0) >= 50 && workload.length > 1;

          return (
            <div
              key={member.user_id || idx}
              className={`p-3 rounded-md border transition-colors ${
                isConcentrated
                  ? 'bg-crew-warning/5 border-crew-warning/30'
                  : 'bg-crew-bg/40 border-crew-border'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full ${colorClass} flex-shrink-0`} />
                  <span className="font-heading font-semibold text-xs text-crew-text-primary truncate">
                    {member.full_name}
                  </span>
                  {isConcentrated && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-crew-warning/10 text-crew-warning border border-crew-warning/20">
                      High Load
                    </span>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="font-heading font-bold text-xs text-crew-text-primary">
                    {member.workload_share_percentage || 0}%
                  </span>
                  <span className="text-[11px] text-crew-text-secondary ml-1">
                    ({member.assigned_tasks} tasks)
                  </span>
                </div>
              </div>

              {/* Granular Task Breakdown */}
              <div className="flex items-center gap-4 text-[11px] text-crew-text-secondary pl-4">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-crew-success" />
                  {member.completed_tasks || 0} done
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-crew-terracotta" />
                  {member.in_progress_tasks || 0} active
                </span>
                <span className="flex items-center gap-1">
                  <ListTodo className="w-3 h-3 text-crew-text-secondary" />
                  {member.todo_tasks || 0} todo
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
