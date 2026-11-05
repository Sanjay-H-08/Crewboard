import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { teamsService, projectsService, formatApiError } from '../services/api';
import JoinCodeCard from '../components/team/JoinCodeCard';
import ImbalanceAlert from '../components/team/ImbalanceAlert';
import WorkloadDistribution from '../components/team/WorkloadDistribution';
import MemberTable from '../components/team/MemberTable';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  BarChart2,
} from 'lucide-react';

export default function TeamOverviewPage() {
  const { teamId } = useParams();

  const [team, setTeam] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [activities, setActivities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [error, setError] = useState(null);

  // Load team details, projects, and initial activity feed
  const loadTeamData = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch team details with members
      const teamData = await teamsService.get(teamId);
      setTeam(teamData);

      // 2. Fetch projects under this team
      const projectList = await projectsService.list(teamId);
      setProjects(projectList || []);

      if (projectList && projectList.length > 0) {
        setSelectedProjectId(projectList[0].id);
      }

      // 3. Fetch team activity feed
      const activityFeed = await teamsService.getActivity(teamId, { limit: 20 });
      setActivities(activityFeed || []);
    } catch (err) {
      setError(formatApiError(err, 'Failed to load team overview.'));
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  // Load project analytics whenever selectedProjectId changes
  useEffect(() => {
    async function fetchAnalytics() {
      if (!selectedProjectId) {
        setAnalytics(null);
        return;
      }
      setLoadingAnalytics(true);
      try {
        const data = await projectsService.getAnalytics(selectedProjectId);
        setAnalytics(data);
      } catch {
        setAnalytics(null);
      } finally {
        setLoadingAnalytics(false);
      }
    }

    fetchAnalytics();
  }, [selectedProjectId]);

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" message="Loading team overview & analytics..." />;
  }

  if (error && !team) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="p-4 rounded-lg bg-crew-danger/10 border border-crew-danger/20 text-crew-danger text-sm font-medium">
          {error}
        </div>
        <Link to="/dashboard">
          <Button icon={ArrowLeft} variant="outline">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const completionPercentage = analytics?.completion_percentage || 0;
  const summary = analytics?.summary || {
    total_tasks: 0,
    completed_tasks: 0,
    in_progress_tasks: 0,
    todo_tasks: 0,
    overdue_tasks: 0,
  };
  const warnings = analytics?.imbalance_warnings || [];

  return (
    <div className="space-y-8">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-crew-border/60">
        <div>
          <div className="flex items-center gap-2 text-xs text-crew-text-secondary mb-1">
            <Link to="/dashboard" className="hover:text-crew-text-primary flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-crew-text-primary font-semibold truncate">{team?.name}</span>
          </div>

          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-crew-text-primary tracking-tight">
            {team?.name}
          </h1>

          {team?.description && (
            <p className="text-xs sm:text-sm text-crew-text-secondary mt-1 max-w-2xl">
              {team.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-crew-bg border border-crew-border text-crew-text-secondary">
            Role: {team?.current_user_role || 'Member'}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-crew-sand/20 text-crew-warning border border-crew-sand/30">
            {team?.members?.length || 1} Members
          </span>
        </div>
      </div>

      {/* Top Grid: Join Code Card + Imbalance Alert */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-5">
          <JoinCodeCard team={team} />
        </div>

        <div className="md:col-span-7">
          {warnings.length > 0 ? (
            <ImbalanceAlert warnings={warnings} />
          ) : (
            <div className="bg-crew-surface border border-crew-border rounded-lg p-5 shadow-card flex items-center gap-3 text-xs text-crew-text-secondary">
              <div className="w-9 h-9 rounded-full bg-crew-success/10 text-crew-success border border-crew-success/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-semibold text-crew-text-primary text-sm">
                  Balanced Workload Distribution
                </h4>
                <p className="mt-0.5 text-crew-text-secondary">
                  No workload concentration or excessive overdue risks detected in this project.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Section: Project Selector & KPI metrics */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold text-crew-text-primary tracking-tight flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-crew-action" />
              Project Contribution & Health Analytics
            </h2>
            <p className="text-xs text-crew-text-secondary">
              Real-time deliverables progress, workload concentration, and overdue indicators
            </p>
          </div>

          {/* Project Selector Dropdown */}
          {projects.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-crew-text-secondary font-medium">Select Project:</span>
              <div className="relative">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="appearance-none bg-crew-surface border border-crew-border hover:border-crew-sand rounded text-xs text-crew-text-primary font-medium py-1.5 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-crew-action"
                  aria-label="Select Project for Analytics"
                >
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-crew-text-secondary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {loadingAnalytics ? (
          <div className="bg-crew-surface border border-crew-border rounded-lg p-8 text-center text-xs text-crew-text-secondary">
            Loading analytics calculation...
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-crew-surface border border-crew-border rounded-lg p-8 text-center text-xs text-crew-text-secondary">
            No projects in this team yet. Create a project to view metrics.
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Metric Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-crew-surface border border-crew-border rounded-lg p-4 shadow-card">
                <span className="text-xs text-crew-text-secondary font-medium">Completion Rate</span>
                <div className="font-heading text-2xl font-bold text-crew-text-primary mt-1">
                  {completionPercentage}%
                </div>
                <div className="w-full h-1.5 rounded-full bg-crew-bg mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-crew-action transition-all duration-300"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              <div className="bg-crew-surface border border-crew-border rounded-lg p-4 shadow-card">
                <span className="text-xs text-crew-text-secondary font-medium">Total Deliverables</span>
                <div className="font-heading text-2xl font-bold text-crew-text-primary mt-1">
                  {summary.total_tasks}
                </div>
                <p className="text-[11px] text-crew-text-secondary mt-1">
                  {summary.completed_tasks} completed
                </p>
              </div>

              <div className="bg-crew-surface border border-crew-border rounded-lg p-4 shadow-card">
                <span className="text-xs text-crew-text-secondary font-medium">In Progress</span>
                <div className="font-heading text-2xl font-bold text-crew-terracotta mt-1">
                  {summary.in_progress_tasks}
                </div>
                <p className="text-[11px] text-crew-text-secondary mt-1">Active tasks</p>
              </div>

              <div
                className={`border rounded-lg p-4 shadow-card ${
                  summary.overdue_tasks > 0
                    ? 'bg-crew-danger/5 border-crew-danger/30'
                    : 'bg-crew-surface border-crew-border'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={
                      summary.overdue_tasks > 0 ? 'text-crew-danger' : 'text-crew-text-secondary'
                    }
                  >
                    Overdue Tasks
                  </span>
                  {summary.overdue_tasks > 0 && (
                    <AlertTriangle className="w-3.5 h-3.5 text-crew-danger animate-pulse" />
                  )}
                </div>
                <div
                  className={`font-heading text-2xl font-bold mt-1 ${
                    summary.overdue_tasks > 0 ? 'text-crew-danger' : 'text-crew-text-primary'
                  }`}
                >
                  {summary.overdue_tasks}
                </div>
                <p
                  className={`text-[11px] mt-1 ${
                    summary.overdue_tasks > 0 ? 'text-crew-danger' : 'text-crew-text-secondary'
                  }`}
                >
                  {summary.overdue_tasks > 0 ? 'Exceeded deadline' : 'Zero overdue items'}
                </p>
              </div>
            </div>

            {/* Workload Distribution Visualization */}
            <WorkloadDistribution workload={analytics?.workload_distribution || []} />
          </div>
        )}
      </section>

      {/* Team Roster & Contribution Table */}
      <section className="space-y-4">
        <MemberTable
          members={team?.members || []}
          workload={analytics?.workload_distribution || []}
        />
      </section>

      {/* Team Activity Feed */}
      <section className="space-y-4">
        <ActivityFeed activities={activities} />
      </section>
    </div>
  );
}
