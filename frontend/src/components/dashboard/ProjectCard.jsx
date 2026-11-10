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
    <div className="bg-crew-surface border border-crew-border rounded-lg p-5 shadow-card hover:border-crew-sand transition-all duration-150 flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-heading font-bold text-base text-crew-text-primary group-hover:text-crew-action transition-colors tracking-tight line-clamp-1">
            {project.name}
          </h3>
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
              project.status === 'completed'
                ? 'bg-crew-success/10 text-crew-success border-crew-success/20'
                : project.status === 'planning'
                ? 'bg-crew-info/10 text-crew-info border-crew-info/20'
                : 'bg-crew-sand/20 text-crew-warning border-crew-sand/30'
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
            className={`w-3.5 h-3.5 ${isPastDeadline ? 'text-crew-danger' : 'text-crew-text-secondary'}`}
          />
          <span
            className={`font-medium ${
              isPastDeadline ? 'text-crew-danger font-semibold' : 'text-crew-text-secondary'
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
            <span className="text-crew-text-secondary font-medium">Deliverables</span>
            <span className="font-heading font-semibold text-crew-text-primary">
              {completed}/{total} tasks ({percentage}%)
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-crew-bg overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                percentage === 100 ? 'bg-crew-success' : 'bg-crew-action'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Action Link */}
        <div className="pt-4 flex items-center justify-end">
          <Link
            to={`/projects/${project.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-crew-action hover:text-crew-action-hover group-hover:translate-x-0.5 transition-all"
          >
            Open Workspace
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
