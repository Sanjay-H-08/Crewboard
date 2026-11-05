import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  ArrowDown,
  CheckCircle2,
  Circle,
  Activity,
  Shield,
  User,
} from 'lucide-react';

export function PriorityBadge({ priority = 'medium', className = '' }) {
  const normalized = priority?.toLowerCase() || 'medium';

  switch (normalized) {
    case 'high':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium bg-crew-danger/10 text-crew-danger border border-crew-danger/20 ${className}`}
        >
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>High Priority</span>
        </span>
      );
    case 'low':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium bg-crew-info/10 text-crew-info border border-crew-info/20 ${className}`}
        >
          <ArrowDown className="w-3 h-3 flex-shrink-0" />
          <span>Low Priority</span>
        </span>
      );
    case 'medium':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium bg-crew-sand/20 text-crew-warning border border-crew-sand/40 ${className}`}
        >
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>Medium Priority</span>
        </span>
      );
  }
}

export function StatusBadge({ status = 'todo', className = '' }) {
  const normalized = status?.toLowerCase() || 'todo';

  switch (normalized) {
    case 'done':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-medium bg-crew-success/10 text-crew-success border border-crew-success/20 ${className}`}
        >
          <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
          <span>Done</span>
        </span>
      );
    case 'in_progress':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-medium bg-crew-terracotta/10 text-crew-terracotta border border-crew-terracotta/20 ${className}`}
        >
          <Activity className="w-3 h-3 flex-shrink-0" />
          <span>In Progress</span>
        </span>
      );
    case 'todo':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-medium bg-crew-bg text-crew-text-secondary border border-crew-border ${className}`}
        >
          <Circle className="w-3 h-3 flex-shrink-0" />
          <span>To Do</span>
        </span>
      );
  }
}

export function RoleBadge({ role = 'member', className = '' }) {
  const isOwner = role?.toLowerCase() === 'owner';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium ${
        isOwner
          ? 'bg-crew-sand/25 text-crew-warning border border-crew-sand/40'
          : 'bg-crew-bg text-crew-text-secondary border border-crew-border'
      } ${className}`}
    >
      {isOwner ? <Shield className="w-3 h-3 flex-shrink-0 text-crew-warning" /> : <User className="w-3 h-3 flex-shrink-0 text-crew-text-secondary" />}
      <span>{isOwner ? 'Owner' : 'Member'}</span>
    </span>
  );
}

export function OverdueBadge({ text = 'Overdue', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-semibold bg-crew-danger/10 text-crew-danger border border-crew-danger/30 ${className}`}
    >
      <AlertTriangle className="w-3 h-3 flex-shrink-0 animate-pulse" />
      <span>{text}</span>
    </span>
  );
}
