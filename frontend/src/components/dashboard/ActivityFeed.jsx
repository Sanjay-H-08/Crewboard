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
      <div className="bg-crew-surface border border-crew-border rounded-lg p-5 shadow-card space-y-4">
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
      <div className="bg-crew-surface border border-crew-border rounded-lg p-6 shadow-card text-center text-xs text-crew-text-secondary">
        <History className="w-6 h-6 text-crew-sand mx-auto mb-2" />
        <p className="font-semibold text-crew-text-primary text-sm">No activity logged yet</p>
        <p className="mt-1">Actions on tasks and projects will automatically show up here.</p>
      </div>
    );
  }

  function getActionIcon(action) {
    switch (action) {
      case 'task_created':
        return <FolderPlus className="w-3.5 h-3.5 text-crew-action" />;
      case 'status_changed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-crew-terracotta" />;
      case 'task_assigned':
        return <UserCheck className="w-3.5 h-3.5 text-crew-info" />;
      case 'priority_changed':
        return <AlertCircle className="w-3.5 h-3.5 text-crew-warning" />;
      case 'deadline_changed':
        return <Calendar className="w-3.5 h-3.5 text-crew-sand" />;
      case 'project_created':
        return <FolderPlus className="w-3.5 h-3.5 text-crew-action" />;
      default:
        return <ArrowRightLeft className="w-3.5 h-3.5 text-crew-text-secondary" />;
    }
  }

  return (
    <div className="bg-crew-surface border border-crew-border rounded-lg p-5 shadow-card">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-crew-border/60">
        <h3 className="font-heading font-bold text-sm text-crew-text-primary tracking-tight flex items-center gap-2">
          <History className="w-4 h-4 text-crew-action" />
          Recent Team Activity
        </h3>
        <span className="text-[11px] text-crew-text-secondary">Live Audit</span>
      </div>

      <div className="flow-root">
        <ul className="-mb-4 space-y-4">
          {activities.map((activity, idx) => {
            const formatted = formatActivityText(activity);
            const isLast = idx === activities.length - 1;

            return (
              <li key={activity.id || idx} className="relative flex gap-3 text-xs">
                {!isLast && (
                  <span
                    className="absolute top-5 left-3.5 -ml-px h-full w-0.5 bg-crew-border/60"
                    aria-hidden="true"
                  />
                )}

                <div className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-crew-bg border border-crew-border text-crew-text-primary font-heading font-semibold text-[11px]">
                  {getInitials(activity.user_name)}
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-crew-text-primary leading-snug">
                    <span className="font-semibold">{formatted.actor}</span>{' '}
                    <span className="text-crew-text-secondary">{formatted.action}</span>{' '}
                    <span className="font-medium text-crew-text-primary">{formatted.target}</span>{' '}
                    {formatted.detail && (
                      <span className="text-crew-text-secondary">{formatted.detail}</span>
                    )}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-crew-text-secondary/80">
                    {getActionIcon(activity.action)}
                    <span>{formatRelativeTime(activity.created_at)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
