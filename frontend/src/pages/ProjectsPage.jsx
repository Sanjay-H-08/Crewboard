import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { projectsService, formatApiError } from '../services/api';
import { formatDate } from '../utils/formatters';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { FolderGit2, Calendar, Users, ArrowRight } from 'lucide-react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    projectsService
      .list()
      .then((data) => {
        if (!active) return;
        setProjects(data || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(formatApiError(err, 'Failed to load projects.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" message="Loading your team projects..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-crew-border/60">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200">
            Workspace
          </span>
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-crew-text-primary tracking-tight">
          My Assigned Projects
        </h1>
        <p className="text-xs sm:text-sm text-crew-text-secondary mt-1">
          Active capstone projects, deliverables progress, and team assignments
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-heading font-semibold text-sm text-crew-text-primary">
              No Projects Assigned Yet
            </h4>
            <p className="text-xs text-crew-text-secondary max-w-sm mx-auto">
              You are not currently assigned to any team projects. Once your instructor assigns a project to your team, it will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="p-5 rounded-2xl bg-gradient-to-b from-white to-slate-50/60 dark:from-[#14171E] dark:to-[#1A1F29] border border-crew-border/90 shadow-subtle hover:shadow-card hover:-translate-y-0.5 transition-all duration-150 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80">
                    {proj.status || 'Active'}
                  </span>
                  {proj.deadline && (
                    <span className="text-[11px] text-crew-text-tertiary flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3" />
                      {formatDate(proj.deadline)}
                    </span>
                  )}
                </div>

                <h3 className="font-heading font-bold text-base text-crew-text-primary leading-snug">
                  {proj.name}
                </h3>

                {proj.description && (
                  <p className="text-xs text-crew-text-secondary line-clamp-2 leading-relaxed">
                    {proj.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-crew-border/60 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-crew-text-tertiary">
                  <Users className="w-3.5 h-3.5" />
                  <span>Team Deliverable</span>
                </div>

                <NavLink
                  to={`/projects/${proj.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 group"
                >
                  <span>Open Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </NavLink>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
