import React from 'react';
import { formatRelativeTime, formatActivityText, getInitials } from '../../utils/formatters';
import {
  CheckCircle2,
  FolderPlus,
  ArrowRightLeft,
  UserCheck,
  AlertCircle,
  Calendar,
  History,
} from 'lucide-react';

export default function ActivityFeed({ activities = [], loading = false }) {
  if (loading) {
    return (
      <div className="bg-crew-surface border border-crew-border rounded-2xl p-5 shadow-subtle space-y-4">
        <div className="h-4 bg-crew-border/40 rounded w-1/3 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex gap-3 items-start animate-pulse">
              <div className="w-7 h-7 rounded-full bg-crew-border/60 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-crew-border/60 rounded w-3/4" />
                <div className="h-2.5 bg-crew-border/40 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-crew-surface border border-crew-border rounded-2xl p-6 shadow-subtle text-center text-xs text-crew-text-secondary">
        <History className="w-6 h-6 text-crew-text-tertiary mx-auto mb-2" />
        <p className="font-semibold text-crew-text-primary text-sm">No activity logged yet</p>
        <p className="mt-1">Actions on tasks and projects will automatically show up here.</p>
      </div>
    );
  }

  function getActionIcon(action) {
    switch (action) {
      case 'task_created':
        return <FolderPlus className="w-3.5 h-3.5 text-sky-600" />;
      case 'status_changed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'task_assigned':
        return <UserCheck className="w-3.5 h-3.5 text-purple-600" />;
      case 'priority_changed':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-600" />;
      case 'deadline_changed':
        return <Calendar className="w-3.5 h-3.5 text-amber-600" />;
      case 'project_created':
        return <FolderPlus className="w-3.5 h-3.5 text-sky-600" />;
      default:
        return <ArrowRightLeft className="w-3.5 h-3.5 text-crew-text-secondary" />;
    }
  }

  return (
    <div className="bg-crew-surface border border-crew-border rounded-2xl p-5 shadow-subtle space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-crew-border/60">
        <h3 className="font-heading font-semibold text-xs uppercase tracking-wider text-crew-text-primary flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-crew-text-tertiary" />
          <span>Recent Team Activity</span>
        </h3>
        <span className="text-[10px] text-crew-text-tertiary font-mono">Live Audit</span>
      </div>

      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {activities.map((act) => {
          const item = formatActivityText(act);
          const meta = typeof item === 'object' && item !== null ? item : {};
          const actorName = act.user_name || meta.actor || 'Teammate';
          const shortActor = actorName.split(' ')[0];

          return (
            <div key={act.id} className="flex items-start gap-2.5 text-xs">
              <div className="w-6 h-6 rounded-full bg-crew-bg border border-crew-border flex items-center justify-center font-heading font-bold text-[9px] text-crew-text-secondary flex-shrink-0 mt-0.5">
                {getInitials(act.user_name || meta.actor)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-crew-text-secondary leading-snug">
                  <span className="font-semibold text-crew-text-primary">
                    {shortActor}
                  </span>{' '}
                  <span>{meta.action || 'updated'}</span>{' '}
                  {meta.target && (
                    <span className="font-medium text-crew-text-primary">
                      {meta.target}
                    </span>
                  )}
                  {meta.detail && (
                    <span className="text-crew-text-secondary"> {meta.detail}</span>
                  )}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-crew-text-tertiary font-mono">
                  {getActionIcon(act.action)}
                  <span>{formatRelativeTime(act.created_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
