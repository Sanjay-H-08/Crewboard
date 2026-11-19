import React, { useState, useEffect } from 'react';
import { useTeam } from '../context/TeamContext';
import { tasksService, teamsService, authService, formatApiError } from '../services/api';
import WeeklyActivityChart from '../components/dashboard/WeeklyActivityChart';
import TaskStatusDistributionChart from '../components/dashboard/TaskStatusDistributionChart';
import ContributionTrendChart from '../components/dashboard/ContributionTrendChart';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function ProgressPage() {
  const { activeTeamId } = useTeam();
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [gamification, setGamification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      tasksService.getMyTasks().catch(() => []),
      activeTeamId ? teamsService.getActivity(activeTeamId).catch(() => []) : Promise.resolve([]),
      authService.getGamification(activeTeamId).catch(() => null),
    ])
      .then(([taskList, activityList, gamData]) => {
        if (!active) return;
        setTasks(taskList || []);
        setActivities(activityList || []);
        setGamification(gamData);
      })
      .catch((err) => {
        if (!active) return;
        setError(formatApiError(err, 'Failed to load progress analytics.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeTeamId]);

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" message="Loading your progress velocity..." />;
  }

  const completedCount = tasks.filter((t) => t.status === 'done').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const submittedCount = tasks.filter((t) => t.status === 'submitted').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-crew-border/60">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200">
            My Learning
          </span>
          {gamification && (
            <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200">
              Level {gamification.level || 1} · {gamification.total_xp || 0} XP
            </span>
          )}
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-crew-text-primary tracking-tight">
          Personal Contribution Progress & Analytics
        </h1>
        <p className="text-xs sm:text-sm text-crew-text-secondary mt-1">
          Comprehensive telemetry tracking your deliverables velocity and workflow status
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
          {error}
        </div>
      )}

      {/* KPI Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 shadow-subtle space-y-1">
          <span className="text-[11px] font-semibold text-crew-text-secondary uppercase tracking-wider block">
            Verified Done
          </span>
          <span className="font-heading font-extrabold text-2xl text-emerald-600 dark:text-emerald-400">
            {completedCount}
          </span>
          <span className="text-[10px] text-crew-text-tertiary block font-mono">Tasks approved</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 shadow-subtle space-y-1">
          <span className="text-[11px] font-semibold text-crew-text-secondary uppercase tracking-wider block">
            Under Review
          </span>
          <span className="font-heading font-extrabold text-2xl text-purple-600 dark:text-purple-400">
            {submittedCount}
          </span>
          <span className="text-[10px] text-crew-text-tertiary block font-mono">Awaiting audit</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 shadow-subtle space-y-1">
          <span className="text-[11px] font-semibold text-crew-text-secondary uppercase tracking-wider block">
            Active Progress
          </span>
          <span className="font-heading font-extrabold text-2xl text-blue-600 dark:text-blue-400">
            {inProgressCount}
          </span>
          <span className="text-[10px] text-crew-text-tertiary block font-mono">Currently working</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 shadow-subtle space-y-1">
          <span className="text-[11px] font-semibold text-crew-text-secondary uppercase tracking-wider block">
            Logged Actions
          </span>
          <span className="font-heading font-extrabold text-2xl text-indigo-600 dark:text-indigo-400">
            {activities.length}
          </span>
          <span className="text-[10px] text-crew-text-tertiary block font-mono">Audit trail logs</span>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeeklyActivityChart activities={activities} myTasks={tasks} />
        <TaskStatusDistributionChart tasks={tasks} />
      </div>

      <div>
        <ContributionTrendChart tasks={tasks} activities={activities} />
      </div>
    </div>
  );
}
