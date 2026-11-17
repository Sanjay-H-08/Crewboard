import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { projectsService, tasksService, teamsService, formatApiError } from '../services/api';
import { formatDate, isTaskOverdue } from '../utils/formatters';
import KanbanColumn from '../components/kanban/KanbanColumn';
import TaskModal from '../components/kanban/TaskModal';
import SubmissionModal from '../components/kanban/SubmissionModal';
import ReviewModal from '../components/kanban/ReviewModal';
import FilterBar from '../components/kanban/FilterBar';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  Calendar,
  Plus,
  ArrowLeft,
  BarChart3,
  AlertTriangle,
  Users,
} from 'lucide-react';

export default function ProjectWorkspacePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, isTeacher } = useAuth();
  const { activeTeam } = useTeam();

  const isLeader = activeTeam?.role === 'owner' || activeTeam?.role === 'leader';
  const isLeaderOrTeacher = isLeader || isTeacher;

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  // Modal states
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [targetColumnStatus, setTargetColumnStatus] = useState('todo');

  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [taskToSubmit, setTaskToSubmit] = useState(null);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [taskToReview, setTaskToReview] = useState(null);

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Load project details and team members
  const loadWorkspace = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch project details
      const projData = await projectsService.get(projectId);
      setProject(projData);

      // 2. Fetch project tasks
      const taskList = await tasksService.listByProject(projectId);
      setTasks(taskList || []);

      // 3. Fetch team details to obtain verified team members
      if (projData.team_id) {
        const teamData = await teamsService.get(projData.team_id);
        setTeamMembers(teamData.members || []);
      }
    } catch (err) {
      setError(formatApiError(err, 'Failed to load project workspace.'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  // Show auto-dismissing feedback messages
  function triggerFeedback(msg) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  }

  // Handle task status transition
  async function handleStatusChange(taskId, newStatus) {
    try {
      const updated = await tasksService.update(taskId, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      triggerFeedback(`Moved task to ${newStatus.replace('_', ' ')}.`);
    } catch (err) {
      setError(formatApiError(err, 'Failed to change task status.'));
    }
  }

  // Open modal for task creation
  function handleOpenCreateTask(columnStatus = 'todo') {
    setTaskToEdit(null);
    setTargetColumnStatus(columnStatus);
    setTaskModalOpen(true);
  }

  // Open modal for task editing
  function handleOpenEditTask(task) {
    setTaskToEdit(task);
    setTargetColumnStatus(task.status);
    setTaskModalOpen(true);
  }

  // Open modal for task submission
  function handleOpenSubmit(task) {
    setTaskToSubmit(task);
    setSubmissionModalOpen(true);
  }

  // Open modal for task review
  function handleOpenReview(task) {
    setTaskToReview(task);
    setReviewModalOpen(true);
  }

  // Task saved callback (create or edit)
  function handleTaskSaved(savedTask) {
    setTasks((prev) => {
      const index = prev.findIndex((t) => t.id === savedTask.id);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = savedTask;
        return copy;
      }
      return [savedTask, ...prev];
    });
    triggerFeedback(taskToEdit ? 'Task updated successfully.' : 'New task created.');
  }

  // Deliverable submitted callback
  async function handleTaskSubmitted(submission) {
    if (taskToSubmit) {
      try {
        const refreshed = await tasksService.get(taskToSubmit.id);
        handleTaskSaved(refreshed);
      } catch {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskToSubmit.id
              ? { ...t, status: 'submitted', latest_submission: submission }
              : t,
          ),
        );
      }
      triggerFeedback('Deliverable successfully submitted for review.');
    }
    setSubmissionModalOpen(false);
  }

  // Deliverable reviewed callback
  function handleTaskReviewed(updatedTask) {
    handleTaskSaved(updatedTask);
    triggerFeedback(`Evaluation recorded: ${updatedTask.status.replace('_', ' ')}.`);
    setReviewModalOpen(false);
  }

  // Filter tasks locally based on search, status, priority, and assignee
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title?.toLowerCase().includes(q);
        const matchesDesc = task.description?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // Status
      if (statusFilter !== 'all' && task.status !== statusFilter) {
        return false;
      }

      // Priority
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }

      // Assignee
      if (assigneeFilter !== 'all') {
        if (assigneeFilter === 'unassigned') {
          if (task.assigned_to) return false;
        } else if (task.assigned_to !== assigneeFilter) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, assigneeFilter]);

  // Group filtered tasks into 5 workflow columns
  const todoTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === 'todo'),
    [filteredTasks],
  );
  const inProgressTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === 'in_progress'),
    [filteredTasks],
  );
  const submittedTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === 'submitted'),
    [filteredTasks],
  );
  const changesRequestedTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === 'changes_requested'),
    [filteredTasks],
  );
  const doneTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === 'done'),
    [filteredTasks],
  );

  // Overall metrics
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.status === 'done').length;
  const completionPercentage =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const overdueCount = tasks.filter((t) => isTaskOverdue(t)).length;

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" message="Loading project workspace..." />;
  }

  if (error && !project) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="p-4 rounded-lg bg-crew-danger/10 border border-crew-danger/20 text-crew-danger text-sm font-medium">
          {error}
        </div>
        <Button onClick={() => navigate('/dashboard')} icon={ArrowLeft} variant="outline">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation matching Reference Image 1 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-xs text-crew-text-tertiary">
          <Link to="/dashboard" className="hover:text-crew-text-primary flex items-center gap-1 font-medium transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <span className="text-crew-border">/</span>
          <span className="text-crew-text-secondary font-medium">Projects</span>
          <span className="text-crew-border">/</span>
          <span className="text-crew-text-primary font-semibold truncate max-w-[240px] sm:max-w-md">
            {project?.name}
          </span>
        </div>

        {/* Analytics & Overview Shortcut */}
        {project?.team_id && (
          <Link
            to={`/teams/${project.team_id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-crew-text-secondary hover:text-crew-text-primary px-3 py-1.5 rounded-xl border border-crew-border bg-crew-surface hover:bg-crew-bg transition-colors shadow-subtle"
          >
            <BarChart3 className="w-3.5 h-3.5 text-crew-text-tertiary" />
            <span>Team Analytics</span>
          </Link>
        )}
      </div>

      {/* Top Project Command Bar */}
      <div className="space-y-4">
        {/* Title and Top Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-crew-bg border border-crew-border text-crew-text-secondary">
                {project?.team_name || 'Academic Sprint'}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40">
                {project?.status || 'Active'}
              </span>
              {overdueCount > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/40 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {overdueCount} Overdue
                </span>
              )}
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-crew-text-primary tracking-tight">
              {project?.name}
            </h1>

            {project?.description && (
              <p className="text-xs sm:text-sm text-crew-text-secondary leading-relaxed max-w-3xl pt-0.5">
                {project.description}
              </p>
            )}
          </div>

          {/* Primary Action Button (Solid Dark Button matching Reference Image 1) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => handleOpenCreateTask('todo')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#181B20] text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs & Progress Strip matching Reference Image 1 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-b border-crew-border/60 pb-3">
          {/* Segmented View Tabs */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-crew-bg border border-crew-border w-fit">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-crew-surface text-crew-text-primary shadow-subtle border border-crew-border/60"
            >
              Board
            </button>
            <button
              type="button"
              onClick={() => navigate('/my-tasks')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-crew-text-secondary hover:text-crew-text-primary transition-colors"
            >
              List
            </button>
            {project?.team_id && (
              <button
                type="button"
                onClick={() => navigate(`/teams/${project.team_id}`)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-crew-text-secondary hover:text-crew-text-primary transition-colors"
              >
                Analytics
              </button>
            )}
          </div>

          {/* Right Metrics & Progress Bar */}
          <div className="flex items-center gap-4 text-xs text-crew-text-secondary flex-wrap">
            {project?.deadline && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-crew-text-tertiary" />
                <span>Target Deadline: <strong className="text-crew-text-primary font-semibold">{formatDate(project.deadline)}</strong></span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-crew-text-tertiary" />
              <span>{teamMembers.length} Members</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-crew-text-primary">
                {completedTasksCount}/{totalTasksCount} ({completionPercentage}%)
              </span>
              <div className="w-24 h-2 rounded-full bg-crew-bg border border-crew-border/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#181B20] dark:bg-white transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating feedback alert */}
      {feedback && (
        <div className="p-3 rounded-lg bg-crew-action/10 border border-crew-action/20 text-crew-action text-xs font-medium animate-in fade-in flex items-center justify-between">
          <span>{feedback}</span>
        </div>
      )}

      {/* Multi-Criteria Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        assigneeFilter={assigneeFilter}
        onAssigneeChange={setAssigneeFilter}
        teamMembers={teamMembers}
        onResetFilters={() => {
          setSearchQuery('');
          setStatusFilter('all');
          setPriorityFilter('all');
          setAssigneeFilter('all');
        }}
        totalFiltered={filteredTasks.length}
        totalCount={tasks.length}
      />

      {/* 5-Column Interactive Academic Kanban Board */}
      <div className="flex flex-col xl:flex-row gap-4 overflow-x-auto pb-6">
        {/* Column 1: To Do */}
        <KanbanColumn
          id="col-todo"
          title="To Do"
          statusKey="todo"
          tasks={todoTasks}
          onAddTask={handleOpenCreateTask}
          onEditTask={handleOpenEditTask}
          onStatusChange={handleStatusChange}
          onSubmitWork={handleOpenSubmit}
          onReviewWork={handleOpenReview}
          currentUserId={user?.id}
          isLeaderOrReviewer={isLeaderOrTeacher}
        />

        {/* Column 2: In Progress */}
        <KanbanColumn
          id="col-in-progress"
          title="In Progress"
          statusKey="in_progress"
          tasks={inProgressTasks}
          onAddTask={handleOpenCreateTask}
          onEditTask={handleOpenEditTask}
          onStatusChange={handleStatusChange}
          onSubmitWork={handleOpenSubmit}
          onReviewWork={handleOpenReview}
          currentUserId={user?.id}
          isLeaderOrReviewer={isLeaderOrTeacher}
        />

        {/* Column 3: Submitted for Review */}
        <KanbanColumn
          id="col-submitted"
          title="Submitted for Review"
          statusKey="submitted"
          tasks={submittedTasks}
          onEditTask={handleOpenEditTask}
          onStatusChange={handleStatusChange}
          onSubmitWork={handleOpenSubmit}
          onReviewWork={handleOpenReview}
          currentUserId={user?.id}
          isLeaderOrReviewer={isLeaderOrTeacher}
        />

        {/* Column 4: Changes Requested */}
        <KanbanColumn
          id="col-changes-requested"
          title="Changes Requested"
          statusKey="changes_requested"
          tasks={changesRequestedTasks}
          onEditTask={handleOpenEditTask}
          onStatusChange={handleStatusChange}
          onSubmitWork={handleOpenSubmit}
          onReviewWork={handleOpenReview}
          currentUserId={user?.id}
          isLeaderOrReviewer={isLeaderOrTeacher}
        />

        {/* Column 5: Approved / Done */}
        <KanbanColumn
          id="col-done"
          title="Approved / Completed"
          statusKey="done"
          tasks={doneTasks}
          onEditTask={handleOpenEditTask}
          onStatusChange={handleStatusChange}
          onSubmitWork={handleOpenSubmit}
          onReviewWork={handleOpenReview}
          currentUserId={user?.id}
          isLeaderOrReviewer={isLeaderOrTeacher}
        />
      </div>

      {/* Task Creation & Editing Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        projectId={projectId}
        teamMembers={teamMembers}
        taskToEdit={taskToEdit}
        initialStatus={targetColumnStatus}
        onSaved={handleTaskSaved}
      />

      {/* Deliverable Submission Modal */}
      <SubmissionModal
        isOpen={submissionModalOpen}
        onClose={() => setSubmissionModalOpen(false)}
        task={taskToSubmit}
        onSubmitted={handleTaskSubmitted}
      />

      {/* Deliverable Review Modal */}
      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        task={taskToReview}
        onReviewed={handleTaskReviewed}
      />
    </div>
  );
}
