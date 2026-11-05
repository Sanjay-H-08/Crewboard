import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { projectsService, teamsService, tasksService, formatApiError } from '../services/api';
import ProjectCard from '../components/dashboard/ProjectCard';
import MyTasksList from '../components/dashboard/MyTasksList';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';
import { CardSkeleton } from '../components/common/Skeleton';
import { isTaskOverdue } from '../utils/formatters';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Users,
  Copy,
  Check,
  FolderPlus,
  ArrowRight,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { teams, activeTeam, activeTeamId } = useTeam();
  const { openCreateTeam, openJoinTeam, openCreateProject, projectRefreshTrigger } =
    useOutletContext();

  const [projects, setProjects] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [activities, setActivities] = useState([]);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [error, setError] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Load projects and tasks for active team
  const loadDashboardData = useCallback(async () => {
    if (!activeTeamId) {
      setProjects([]);
      setMyTasks([]);
      setActivities([]);
      setLoadingProjects(false);
      return;
    }

    setLoadingProjects(true);
    setError(null);

    try {
      // 1. Fetch team's projects
      const projectList = await projectsService.list(activeTeamId);
      setProjects(projectList || []);

      // 2. Fetch tasks for each project to gather "assigned to me" tasks
      const allTasksPromises = (projectList || []).map((p) =>
        tasksService.listByProject(p.id).catch(() => []),
      );
      const tasksArrays = await Promise.all(allTasksPromises);

      const combinedMyTasks = [];
      tasksArrays.forEach((tasks, idx) => {
        const projectName = projectList[idx]?.name;
        (tasks || []).forEach((t) => {
          if (t.assigned_to === user?.id) {
            combinedMyTasks.push({ ...t, project_name: projectName });
          }
        });
      });

      // Sort my tasks: overdue first, then by deadline, then status
      combinedMyTasks.sort((a, b) => {
        const aOverdue = isTaskOverdue(a);
        const bOverdue = isTaskOverdue(b);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (a.status !== 'done' && b.status === 'done') return -1;
        return 0;
      });

      setMyTasks(combinedMyTasks);
    } catch (err) {
      setError(formatApiError(err, 'Failed to load project dashboard.'));
    } finally {
      setLoadingProjects(false);
    }
  }, [activeTeamId, user?.id]);

  // Load activity feed for active team
  const loadActivityFeed = useCallback(async () => {
    if (!activeTeamId) return;
    setLoadingActivities(true);
    try {
      const feed = await teamsService.getActivity(activeTeamId, { limit: 15 });
      setActivities(feed || []);
    } catch {
      // Non-critical: activity feed can fail gracefully
      setActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  }, [activeTeamId]);

  useEffect(() => {
    loadDashboardData();
    loadActivityFeed();
  }, [loadDashboardData, loadActivityFeed, projectRefreshTrigger]);

  function copyJoinCode() {
    if (!activeTeam?.join_code) return;
    navigator.clipboard.writeText(activeTeam.join_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2500);
  }

  // KPI Calculations
  const overdueTasksCount = myTasks.filter((t) => isTaskOverdue(t)).length;
  const inProgressCount = myTasks.filter((t) => t.status === 'in_progress').length;
  const completedTasksCount = myTasks.filter((t) => t.status === 'done').length;

  // Handle case where user has no teams at all
  if (!loadingProjects && teams.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="bg-crew-surface border border-crew-border rounded-lg p-10 shadow-card text-center">
          <div className="w-14 h-14 rounded-lg bg-crew-sand/20 border border-crew-sand/30 flex items-center justify-center text-crew-action mx-auto mb-4">
            <Users className="w-7 h-7" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-crew-text-primary tracking-tight mb-2">
            Welcome to Crewboard, {user?.full_name}!
          </h1>
          <p className="text-sm text-crew-text-secondary max-w-lg mx-auto mb-8 leading-relaxed">
            Crewboard organizes student group projects with transparent task ownership and objective
            contribution analytics. To begin, create your team workspace or enter an existing join code.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={openCreateTeam} icon={Plus} size="lg">
              Create a Team
            </Button>
            <Button onClick={openJoinTeam} variant="outline" size="lg">
              Join with Code
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Personalized Greeting & Context Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-crew-border/60">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-crew-text-primary tracking-tight">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Teammate'}
          </h1>
          <p className="text-xs sm:text-sm text-crew-text-secondary mt-1">
            Active workspace:{' '}
            <span className="font-semibold text-crew-text-primary">{activeTeam?.name}</span>
            {activeTeam?.description && <span> — {activeTeam.description}</span>}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button onClick={openCreateProject} icon={FolderPlus} size="sm">
            New Project
          </Button>
          <Button onClick={openJoinTeam} variant="outline" size="sm">
            Join Code
          </Button>
          <Button onClick={openCreateTeam} variant="ghost" size="sm">
            New Team
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-crew-danger/10 border border-crew-danger/20 text-crew-danger text-xs font-medium flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadDashboardData}
            className="underline hover:no-underline font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-crew-surface border border-crew-border rounded-lg p-4 shadow-card">
          <div className="flex items-center justify-between text-crew-text-secondary text-xs mb-2 font-medium">
            <span>Team Projects</span>
            <FolderKanban className="w-4 h-4 text-crew-action" />
          </div>
          <div className="font-heading text-2xl font-bold text-crew-text-primary">
            {projects.length}
          </div>
          <p className="text-[11px] text-crew-text-secondary mt-1">In active team</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-crew-surface border border-crew-border rounded-lg p-4 shadow-card">
          <div className="flex items-center justify-between text-crew-text-secondary text-xs mb-2 font-medium">
            <span>Assigned to Me</span>
            <Clock className="w-4 h-4 text-crew-terracotta" />
          </div>
          <div className="font-heading text-2xl font-bold text-crew-text-primary">
            {myTasks.length}
          </div>
          <p className="text-[11px] text-crew-text-secondary mt-1">
            {inProgressCount} currently in progress
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-crew-surface border border-crew-border rounded-lg p-4 shadow-card">
          <div className="flex items-center justify-between text-crew-text-secondary text-xs mb-2 font-medium">
            <span>Completed by Me</span>
            <CheckCircle2 className="w-4 h-4 text-crew-success" />
          </div>
          <div className="font-heading text-2xl font-bold text-crew-text-primary">
            {completedTasksCount}
          </div>
          <p className="text-[11px] text-crew-text-secondary mt-1">Tasks resolved</p>
        </div>

        {/* Metric 4 */}
        <div
          className={`border rounded-lg p-4 shadow-card ${
            overdueTasksCount > 0
              ? 'bg-crew-danger/5 border-crew-danger/30'
              : 'bg-crew-surface border-crew-border'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2 font-medium">
            <span className={overdueTasksCount > 0 ? 'text-crew-danger' : 'text-crew-text-secondary'}>
              Overdue Deliverables
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${
                overdueTasksCount > 0 ? 'text-crew-danger animate-pulse' : 'text-crew-text-secondary'
              }`}
            />
          </div>
          <div
            className={`font-heading text-2xl font-bold ${
              overdueTasksCount > 0 ? 'text-crew-danger' : 'text-crew-text-primary'
            }`}
          >
            {overdueTasksCount}
          </div>
          <p
            className={`text-[11px] mt-1 ${
              overdueTasksCount > 0 ? 'text-crew-danger font-medium' : 'text-crew-text-secondary'
            }`}
          >
            {overdueTasksCount > 0 ? 'Requires immediate action' : 'All milestones on schedule'}
          </p>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 8 Cols: Projects & My Tasks */}
        <div className="lg:col-span-8 space-y-8">
          {/* Active Projects */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-lg font-bold text-crew-text-primary tracking-tight">
                  Team Projects
                </h2>
                <p className="text-xs text-crew-text-secondary">
                  Active milestones and sprint goals for {activeTeam?.name}
                </p>
              </div>

              <Button onClick={openCreateProject} icon={Plus} size="sm" variant="outline">
                New Project
              </Button>
            </div>

            {loadingProjects ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : projects.length === 0 ? (
              <EmptyState
                icon={FolderPlus}
                title="No projects in this team yet"
                description="Start a project to break down capstone deliverables, assign tasks, and track team progress."
                actionLabel="Create First Project"
                actionIcon={Plus}
                onAction={openCreateProject}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </section>

          {/* Tasks Assigned to Current User */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-lg font-bold text-crew-text-primary tracking-tight">
                  My Assigned Tasks
                </h2>
                <p className="text-xs text-crew-text-secondary">
                  Deliverables currently owned by you across projects
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-crew-sand/20 text-crew-warning border border-crew-sand/30">
                {myTasks.length} Assigned
              </span>
            </div>

            <MyTasksList tasks={myTasks} onTaskUpdated={loadDashboardData} />
          </section>
        </div>

        {/* Right 4 Cols: Join Code + Team Activity + Overview Link */}
        <div className="lg:col-span-4 space-y-6">
          {/* Join Code Widget */}
          {activeTeam && (
            <div className="bg-crew-surface border border-crew-border rounded-lg p-5 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-crew-text-secondary font-heading">
                  Team Invitation Code
                </span>
                <span className="text-[11px] font-medium text-crew-action bg-crew-action/10 px-2 py-0.5 rounded">
                  {activeTeam.member_count || 1} Member{activeTeam.member_count === 1 ? '' : 's'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 bg-crew-bg border border-crew-border rounded px-3 py-2 font-mono font-bold text-sm tracking-widest text-crew-text-primary text-center select-all">
                  {activeTeam.join_code || 'N/A'}
                </div>
                <button
                  type="button"
                  onClick={copyJoinCode}
                  className="px-3 py-2 rounded bg-crew-action text-crew-surface hover:bg-crew-action-hover transition-colors flex items-center justify-center shadow-subtle focus:outline-none focus:ring-2 focus:ring-crew-action"
                  title="Copy join code"
                >
                  {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 text-xs border-t border-crew-border/60">
                <span className="text-crew-text-secondary">
                  {codeCopied ? 'Code copied to clipboard!' : 'Share with group members'}
                </span>
                <Link
                  to={`/teams/${activeTeam.id}`}
                  className="font-semibold text-crew-action hover:underline inline-flex items-center gap-1"
                >
                  Team Overview
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {/* Activity Feed */}
          <ActivityFeed activities={activities} loading={loadingActivities} />
        </div>
      </div>
    </div>
  );
}
