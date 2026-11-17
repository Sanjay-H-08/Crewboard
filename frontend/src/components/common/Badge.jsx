import React from 'react';
import {
  AlertTriangle,
  Clock,
  ArrowDown,
  CheckCircle2,
  Circle,
  Activity,
  Shield,
  User,
  FileCheck,
  RotateCcw,
} from 'lucide-react';

export function PriorityBadge({ priority = 'medium', className = '' }) {
  const normalized = priority?.toLowerCase() || 'medium';

  switch (normalized) {
    case 'high':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/40 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>High Priority</span>
        </span>
      );
    case 'low':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/40 ${className}`}
        >
          <ArrowDown className="w-3 h-3 flex-shrink-0" />
          <span>Low Priority</span>
        </span>
      );
    case 'medium':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40 ${className}`}
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
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40 ${className}`}
        >
          <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
          <span>Done</span>
        </span>
      );
    case 'submitted':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/40 ${className}`}
        >
          <FileCheck className="w-3 h-3 flex-shrink-0" />
          <span>Submitted</span>
        </span>
      );
    case 'changes_requested':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40 ${className}`}
        >
          <RotateCcw className="w-3 h-3 flex-shrink-0" />
          <span>Changes Requested</span>
        </span>
      );
    case 'in_progress':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/40 ${className}`}
        >
          <Activity className="w-3 h-3 flex-shrink-0" />
          <span>In Progress</span>
        </span>
      );
    case 'todo':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 ${className}`}
        >
          <Circle className="w-3 h-3 flex-shrink-0" />
          <span>To Do</span>
        </span>
      );
  }
}

export function RoleBadge({ role = 'member', className = '' }) {
  const normalized = role?.toLowerCase() || 'member';

  switch (normalized) {
    case 'owner':
    case 'leader':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40 ${className}`}
        >
          <Shield className="w-3 h-3 flex-shrink-0" />
          <span>Team Leader</span>
        </span>
      );
    case 'teacher':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/40 ${className}`}
        >
          <Shield className="w-3 h-3 flex-shrink-0" />
          <span>Teacher / Supervisor</span>
        </span>
      );
    case 'member':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 ${className}`}
        >
          <User className="w-3 h-3 flex-shrink-0" />
          <span>Member</span>
        </span>
      );
  }
}

export function OverdueBadge({ text = 'Overdue', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/40 ${className}`}
    >
      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
      <span>{text}</span>
    </span>
  );
}
