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
  GraduationCap,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isTeacher } = useAuth();
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

      // 2. Fetch user's tasks in a single query via dedicated endpoint
      const allUserTasks = await tasksService.getMyTasks();
      const teamUserTasks = (allUserTasks || []).filter((t) => t.team_id === activeTeamId);
      setMyTasks(teamUserTasks);
    } catch (err) {
      setError(formatApiError(err, 'Failed to load project dashboard.'));
    } finally {
      setLoadingProjects(false);
    }
  }, [activeTeamId]);

  // Load activity feed for active team
  const loadActivityFeed = useCallback(async () => {
    if (!activeTeamId) return;
    setLoadingActivities(true);
    try {
      const feed = await teamsService.getActivity(activeTeamId, { limit: 15 });
      setActivities(feed || []);
    } catch {
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
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-crew-surface border border-crew-border rounded-3xl p-8 sm:p-10 shadow-subtle text-center">
          <div className="w-12 h-12 rounded-2xl bg-crew-bg border border-crew-border flex items-center justify-center text-crew-text-primary mx-auto mb-4">
            <Users className="w-6 h-6" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-crew-text-primary tracking-tight mb-2">
            Welcome to Crewboard, {user?.full_name}!
          </h1>
          <p className="text-xs sm:text-sm text-crew-text-secondary max-w-md mx-auto mb-8 leading-relaxed">
            Crewboard organizes student group projects with transparent task ownership and objective
            contribution analytics. To begin, create your team workspace or enter an existing join code.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={openCreateTeam} icon={Plus} size="md">
              Create a Team
            </Button>
            <Button onClick={openJoinTeam} variant="outline" size="md">
              Join with Code
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Personalized Greeting & Context Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-crew-border/60">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-crew-text-primary tracking-tight">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Teammate'}
          </h1>
          <p className="text-xs sm:text-sm text-crew-text-secondary mt-1">
            Active workspace:{' '}
            <strong className="text-crew-text-primary font-semibold">{activeTeam?.name}</strong>
            {activeTeam?.description && <span> — {activeTeam.description}</span>}
          </p>
        </div>

        {/* Quick Action Buttons matching Reference Image 1 */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={openCreateProject}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#181B20] text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-all shadow-sm"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
          <button
            type="button"
            onClick={openJoinTeam}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border border-crew-border bg-crew-surface hover:bg-crew-bg text-crew-text-primary transition-colors shadow-subtle"
          >
            Join Code
          </button>
          <button
            type="button"
            onClick={openCreateTeam}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl text-crew-text-secondary hover:text-crew-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            New Team
          </button>
        </div>
      </div>

      {isTeacher && (
        <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-sm text-crew-text-primary">
                Teacher & Supervisor Portal
              </h3>
              <p className="text-xs text-crew-text-secondary">
                Publish curriculum projects, assign teams, extend deadlines, and export performance reports.
              </p>
            </div>
          </div>
          <Link
            to="/teacher"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors shadow-sm flex-shrink-0"
          >
            <span>Open Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center justify-between">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Metric 1 */}
        <div className="bg-crew-surface border border-crew-border rounded-2xl p-4 sm:p-5 shadow-subtle">
          <div className="flex items-center justify-between text-crew-text-secondary text-xs mb-2 font-medium">
            <span>Team Projects</span>
            <FolderKanban className="w-4 h-4 text-crew-text-tertiary" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-bold text-crew-text-primary">
            {projects.length}
          </div>
          <p className="text-[11px] text-crew-text-tertiary mt-1">In active team</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-crew-surface border border-crew-border rounded-2xl p-4 sm:p-5 shadow-subtle">
          <div className="flex items-center justify-between text-crew-text-secondary text-xs mb-2 font-medium">
            <span>Assigned to Me</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-bold text-crew-text-primary">
            {myTasks.length}
          </div>
          <p className="text-[11px] text-crew-text-tertiary mt-1">
            {inProgressCount} currently in progress
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-crew-surface border border-crew-border rounded-2xl p-4 sm:p-5 shadow-subtle">
          <div className="flex items-center justify-between text-crew-text-secondary text-xs mb-2 font-medium">
            <span>Completed by Me</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-bold text-crew-text-primary">
            {completedTasksCount}
          </div>
          <p className="text-[11px] text-crew-text-tertiary mt-1">Tasks resolved</p>
        </div>

        {/* Metric 4 */}
        <div
          className={`border rounded-2xl p-4 sm:p-5 shadow-subtle ${
            overdueTasksCount > 0
              ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
              : 'bg-crew-surface border-crew-border'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2 font-medium">
            <span className={overdueTasksCount > 0 ? 'text-rose-600 font-semibold' : 'text-crew-text-secondary'}>
              Overdue Deliverables
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${
                overdueTasksCount > 0 ? 'text-rose-600' : 'text-crew-text-tertiary'
              }`}
            />
          </div>
          <div
            className={`font-heading text-2xl sm:text-3xl font-bold ${
              overdueTasksCount > 0 ? 'text-rose-600' : 'text-crew-text-primary'
            }`}
          >
            {overdueTasksCount}
          </div>
          <p
            className={`text-[11px] mt-1 ${
              overdueTasksCount > 0 ? 'text-rose-600 font-medium' : 'text-crew-text-tertiary'
            }`}
          >
            {overdueTasksCount > 0 ? 'Requires immediate attention' : 'All milestones on schedule'}
          </p>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Left 8 Cols: Projects & My Tasks */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-8">
          {/* Active Projects */}
          <section className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-base sm:text-lg font-bold text-crew-text-primary tracking-tight">
                  Team Projects
                </h2>
                <p className="text-xs text-crew-text-secondary">
                  Active milestones and sprint goals for {activeTeam?.name}
                </p>
              </div>

              <button
                type="button"
                onClick={openCreateProject}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-crew-border bg-crew-surface hover:bg-crew-bg text-crew-text-primary transition-colors shadow-subtle"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Project</span>
              </button>
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
          <section className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-base sm:text-lg font-bold text-crew-text-primary tracking-tight">
                  My Assigned Tasks
                </h2>
                <p className="text-xs text-crew-text-secondary">
                  Deliverables currently owned by you across projects
                </p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40">
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
            <div className="bg-crew-surface border border-crew-border rounded-2xl p-5 shadow-subtle space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-crew-text-secondary font-heading">
                  Team Invitation Code
                </span>
                <span className="text-[11px] font-medium text-crew-text-secondary">
                  {activeTeam.member_count || 1} Members
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 bg-crew-bg border border-crew-border rounded-xl px-3 py-2 font-mono font-bold text-sm tracking-widest text-crew-text-primary text-center select-all">
                  {activeTeam.join_code || 'N/A'}
                </div>
                <button
                  type="button"
                  onClick={copyJoinCode}
                  className="px-3 py-2 rounded-xl bg-[#181B20] text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-colors flex items-center justify-center shadow-subtle focus:outline-none"
                  title="Copy join code"
                >
                  {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 text-xs border-t border-crew-border/60">
                <span className="text-crew-text-tertiary">
                  {codeCopied ? 'Code copied to clipboard!' : 'Share with group members'}
                </span>
                <Link
                  to={`/teams/${activeTeam.id}`}
                  className="font-semibold text-crew-text-primary hover:underline inline-flex items-center gap-1"
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
