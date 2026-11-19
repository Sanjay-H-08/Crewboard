import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { projectsService, teamsService, tasksService, authService, formatApiError } from '../services/api';
import ProjectCard from '../components/dashboard/ProjectCard';
import MyTasksList from '../components/dashboard/MyTasksList';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import WeeklyActivityChart from '../components/dashboard/WeeklyActivityChart';
import TaskStatusDistributionChart from '../components/dashboard/TaskStatusDistributionChart';
import ContributionTrendChart from '../components/dashboard/ContributionTrendChart';
import UpcomingDeadlines from '../components/dashboard/UpcomingDeadlines';
import RecentSubmissionsFeedback from '../components/dashboard/RecentSubmissionsFeedback';
import StudentGamificationCard from '../components/dashboard/StudentGamificationCard';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';
import { CardSkeleton } from '../components/common/Skeleton';
import { isTaskOverdue, formatDate } from '../utils/formatters';
import { calculateStudentGamification } from '../utils/gamification';
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
  FileCheck,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isTeacher } = useAuth();
  const { teams, activeTeam, activeTeamId } = useTeam();
  const { openCreateTeam, openJoinTeam, openCreateProject, projectRefreshTrigger } =
    useOutletContext();

  const [projects, setProjects] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [serverGamification, setServerGamification] = useState(null);
  const [myAssessment, setMyAssessment] = useState(null);

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

      // 2. Fetch user's tasks across projects
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
      const feed = await teamsService.getActivity(activeTeamId, { limit: 25 });
      setActivities(feed || []);
    } catch {
      setActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  }, [activeTeamId]);

  // Load backend-calculated gamification stats as the source of truth
  const loadGamification = useCallback(async () => {
    try {
      const data = await authService.getGamification(activeTeamId);
      setServerGamification(data);
    } catch {
      setServerGamification(null);
    }
  }, [activeTeamId]);

  useEffect(() => {
    loadDashboardData();
    loadActivityFeed();
    loadGamification();
  }, [loadDashboardData, loadActivityFeed, loadGamification, projectRefreshTrigger]);

  function copyJoinCode() {
    if (!activeTeam?.join_code) return;
    navigator.clipboard.writeText(activeTeam.join_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2500);
  }

  // Personal Metrics
  const totalTasksCount = myTasks.length;
  const inProgressCount = myTasks.filter((t) => t.status === 'in_progress').length;
  const inReviewCount = myTasks.filter((t) => t.status === 'submitted').length;
  const changesRequestedCount = myTasks.filter((t) => t.status === 'changes_requested').length;
  const completedTasksCount = myTasks.filter((t) => t.status === 'done').length;
  const overdueTasksCount = myTasks.filter((t) => isTaskOverdue(t)).length;

  // Active Project (first active project in the team)
  const primaryProject = useMemo(() => {
    if (!projects || projects.length === 0) return null;
    return projects.find((p) => p.status === 'active') || projects[0];
  }, [projects]);

  // Load current student's rubric assessment on the active primary project
  useEffect(() => {
    if (!primaryProject?.id) {
      setMyAssessment(null);
      return;
    }
    projectsService
      .getMyAssessment(primaryProject.id)
      .then((data) => setMyAssessment(data))
      .catch(() => setMyAssessment(null));
  }, [primaryProject?.id]);

  const teamTotalDeliverables = primaryProject?.total_tasks || 0;
  const teamCompletedDeliverables = primaryProject?.completed_tasks || 0;
  const teamProgressPercentage =
    teamTotalDeliverables > 0
      ? Math.round((teamCompletedDeliverables / teamTotalDeliverables) * 100)
      : 0;

  // Calculate verifiable, balanced student gamification stats (client fallback if server is unreachable)
  const localGamification = useMemo(() => {
    return calculateStudentGamification(myTasks, activities, teamProgressPercentage, user?.id);
  }, [myTasks, activities, teamProgressPercentage, user?.id]);

  // Server-calculated values serve as primary source of truth
  const gamification = serverGamification || localGamification;

  // Today's formatted date string for modern productivity header
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, []);

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
            Crewboard organizes student group assignments with transparent deliverable ownership and objective
            contribution analytics. To begin, create your team workspace or enter an existing join code.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={openCreateTeam} icon={Plus} size="md">
              Create a Team
            </Button>
            <Button onClick={openJoinTeam} variant="outline" size="md">
              Join Team with Code
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-medium border border-rose-200 dark:border-rose-800/40">
          {error}
        </div>
      )}

      {/* 1. Modern Welcome Hero Banner */}
      <div className="bg-crew-surface border border-crew-border rounded-3xl p-6 sm:p-8 shadow-subtle relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-crew-bg border border-crew-border text-crew-text-secondary font-mono">
                {todayFormatted}
              </span>
              {activeTeam && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Team: {activeTeam.name}</span>
                </span>
              )}
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-crew-text-primary tracking-tight">
              Good day, {user?.full_name ? user.full_name.split(' ')[0] : 'Scholar'}
            </h1>
            <p className="text-xs sm:text-sm text-crew-text-secondary max-w-xl leading-relaxed">
              Here is your current progress overview across team deliverables, verified submissions, and upcoming milestones.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0">
            {isTeacher && (
              <Link to="/teacher">
                <Button variant="outline" size="sm" icon={GraduationCap}>
                  Teacher Supervision Portal
                </Button>
              </Link>
            )}
            <Button onClick={openCreateProject} size="sm" icon={Plus}>
              New Deliverable
            </Button>
            {activeTeam && (
              <Link to={`/teams/${activeTeam.id}`}>
                <Button variant="outline" size="sm" icon={Users}>
                  Team Overview
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Row (Modern Productivity Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Deliverables */}
        <div className="bg-crew-surface border border-crew-border rounded-2xl p-4 sm:p-5 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-xs text-crew-text-secondary font-medium">
            <span>My Tasks</span>
            <FolderKanban className="w-4 h-4 text-crew-text-tertiary" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-bold text-crew-text-primary">
            {totalTasksCount}
          </div>
          <p className="text-[11px] text-crew-text-tertiary">Assigned to you</p>
        </div>

        {/* In Progress */}
        <div className="bg-crew-surface border border-crew-border rounded-2xl p-4 sm:p-5 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-xs text-crew-text-secondary font-medium">
            <span>In Progress</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
            {inProgressCount}
          </div>
          <p className="text-[11px] text-crew-text-tertiary">Actively underway</p>
        </div>

        {/* In Review */}
        <div className="bg-crew-surface border border-crew-border rounded-2xl p-4 sm:p-5 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-xs text-crew-text-secondary font-medium">
            <span>Under Review</span>
            <FileCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
            {inReviewCount}
          </div>
          <p className="text-[11px] text-crew-text-tertiary">
            {changesRequestedCount > 0 ? `${changesRequestedCount} need revision` : 'Awaiting feedback'}
          </p>
        </div>

        {/* Completed */}
        <div className="bg-crew-surface border border-crew-border rounded-2xl p-4 sm:p-5 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-xs text-crew-text-secondary font-medium">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {completedTasksCount}
          </div>
          <p className="text-[11px] text-crew-text-tertiary">Verified and approved</p>
        </div>

        {/* Overdue */}
        <div
          className={`col-span-2 lg:col-span-1 border rounded-2xl p-4 sm:p-5 shadow-subtle space-y-2 transition-colors ${
            overdueTasksCount > 0
              ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40'
              : 'bg-crew-surface border-crew-border'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium">
            <span className={overdueTasksCount > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-crew-text-secondary'}>
              Overdue
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${
                overdueTasksCount > 0 ? 'text-rose-600 animate-pulse' : 'text-crew-text-tertiary'
              }`}
            />
          </div>
          <div
            className={`font-heading text-2xl sm:text-3xl font-bold ${
              overdueTasksCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-crew-text-primary'
            }`}
          >
            {overdueTasksCount}
          </div>
          <p
            className={`text-[11px] ${
              overdueTasksCount > 0 ? 'text-rose-600 dark:text-rose-300 font-medium' : 'text-crew-text-tertiary'
            }`}
          >
            {overdueTasksCount > 0 ? 'Needs immediate focus' : 'Zero overdue items'}
          </p>
        </div>
      </div>

      {/* 3. Assignment Progress Overview Banner */}
      {primaryProject && (
        <div className="bg-crew-surface border border-crew-border rounded-2xl p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-crew-text-tertiary font-heading">
                Active Assignment Progress
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-crew-bg border border-crew-border font-medium text-crew-text-secondary">
                {primaryProject.name}
              </span>
            </div>
            <h3 className="font-heading text-lg font-bold text-crew-text-primary">
              {teamCompletedDeliverables} of {teamTotalDeliverables} deliverables completed
            </h3>
            <p className="text-xs text-crew-text-secondary leading-relaxed">
              Target Deadline:{' '}
              <strong className="text-crew-text-primary">
                {primaryProject.deadline ? formatDate(primaryProject.deadline) : 'Ongoing Project'}
              </strong>
            </p>
          </div>

          <div className="w-full md:w-72 space-y-2 flex-shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-crew-text-primary">Team Milestone</span>
              <span className="font-mono font-bold text-crew-action">{teamProgressPercentage}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-crew-bg border border-crew-border/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#181B20] dark:bg-white transition-all duration-500"
                style={{ width: `${teamProgressPercentage}%` }}
              />
            </div>
            <div className="flex justify-end pt-1">
              <Link
                to={`/projects/${primaryProject.id}`}
                className="text-xs font-semibold text-crew-text-primary hover:underline inline-flex items-center gap-1"
              >
                <span>Open Kanban Board</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 4. Main Two-Column Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Projects, My Tasks, Activity Chart, Deadlines */}
        <div className="lg:col-span-8 space-y-6">
          {/* Visual Analytics Suite: Weekly Activity Velocity, Status Distribution & Contribution Trend */}
          <WeeklyActivityChart activities={activities} myTasks={myTasks} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TaskStatusDistributionChart tasks={myTasks} />
            <ContributionTrendChart tasks={myTasks} activities={activities} />
          </div>

          {/* Upcoming Deadlines Radar */}
          <UpcomingDeadlines tasks={myTasks} />

          {/* Active Projects Grid */}
          <section className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-base sm:text-lg font-bold text-crew-text-primary tracking-tight">
                  Team Deliverables & Projects
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
                <span>New Deliverable</span>
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

          {/* Tasks Assigned to Current User Checklist */}
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

        {/* Right Column (4 cols): Gamification, Submissions Feedback, Invitation Code, Activity Feed */}
        <div className="lg:col-span-4 space-y-6">
          {/* Verifiable Gamification & Achievements */}
          <StudentGamificationCard gamification={gamification} />

          {/* Recent Submissions & Feedback */}
          <RecentSubmissionsFeedback tasks={myTasks} teacherAssessment={myAssessment} />

          {/* Team Invitation Code Widget */}
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
