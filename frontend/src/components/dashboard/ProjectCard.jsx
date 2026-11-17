import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export default function ProjectCard({ project }) {
  const total = project.total_tasks || 0;
  const completed = project.completed_tasks || 0;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Deadline calculation
  const hasDeadline = Boolean(project.deadline);
  const isPastDeadline =
    hasDeadline &&
    project.status !== 'completed' &&
    new Date(`${project.deadline}T00:00:00`) < new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <div className="bg-crew-surface border border-crew-border rounded-2xl p-5 shadow-subtle hover:shadow-card hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-150 flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-heading font-bold text-base text-crew-text-primary group-hover:text-black dark:group-hover:text-white transition-colors tracking-tight line-clamp-1">
            {project.name}
          </h3>
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
              project.status === 'completed'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/40'
                : project.status === 'planning'
                ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/40'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/40'
            }`}
          >
            {project.status || 'Active'}
          </span>
        </div>

        <p className="text-xs text-crew-text-secondary line-clamp-2 mb-4 leading-relaxed min-h-[32px]">
          {project.description || 'No description provided.'}
        </p>

        {/* Deadline */}
        <div className="flex items-center gap-1.5 text-xs mb-4">
          <Calendar
            className={`w-3.5 h-3.5 ${isPastDeadline ? 'text-rose-600' : 'text-crew-text-tertiary'}`}
          />
          <span
            className={`font-medium ${
              isPastDeadline ? 'text-rose-600 font-semibold' : 'text-crew-text-secondary'
            }`}
          >
            {isPastDeadline ? `Deadline passed: ${formatDate(project.deadline)}` : formatDate(project.deadline)}
          </span>
        </div>
      </div>

      <div>
        {/* Progress bar */}
        <div className="space-y-1.5 pt-3 border-t border-crew-border/60">
          <div className="flex items-center justify-between text-xs">
            <span className="text-crew-text-secondary">Deliverables</span>
            <span className="font-mono text-crew-text-primary font-medium">
              {completed}/{total} ({percentage}%)
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-crew-bg border border-crew-border/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#181B20] dark:bg-white transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Action Link */}
        <div className="mt-4 flex justify-end">
          <Link
            to={`/projects/${project.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-crew-text-primary hover:text-black dark:hover:text-white transition-colors"
          >
            <span>Open Workspace</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
