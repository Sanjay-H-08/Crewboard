import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { projectsService, tasksService, teamsService, formatApiError } from '../services/api';
import { formatDate, isTaskOverdue } from '../utils/formatters';
import KanbanColumn from '../components/kanban/KanbanColumn';
import TaskModal from '../components/kanban/TaskModal';
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

  // Group filtered tasks into columns
  const todoTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === 'todo'),
    [filteredTasks],
  );
  const inProgressTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === 'in_progress'),
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
      {/* Breadcrumb & Navigation Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-crew-text-secondary">
          <Link to="/dashboard" className="hover:text-crew-text-primary flex items-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-crew-text-primary font-semibold truncate max-w-[200px] sm:max-w-xs">
            {project?.name}
          </span>
        </div>

        {/* Analytics Shortcut */}
        {project?.team_id && (
          <Link
            to={`/teams/${project.team_id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-crew-action hover:text-crew-action-hover px-2.5 py-1.5 rounded hover:bg-crew-bg transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Team Overview & Analytics</span>
          </Link>
        )}
      </div>

      {/* Workspace Header Panel */}
      <div className="bg-crew-surface border border-crew-border rounded-lg p-6 shadow-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-crew-bg border border-crew-border text-crew-text-secondary">
                {project?.team_name || 'Team Deliverable'}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-crew-sand/20 text-crew-warning border border-crew-sand/30">
                {project?.status || 'Active'}
              </span>
              {overdueCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-crew-danger/10 text-crew-danger border border-crew-danger/20 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {overdueCount} Overdue Task{overdueCount === 1 ? '' : 's'}
                </span>
              )}
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-crew-text-primary tracking-tight">
              {project?.name}
            </h1>

            {project?.description && (
              <p className="text-xs sm:text-sm text-crew-text-secondary leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button onClick={() => handleOpenCreateTask('todo')} icon={Plus}>
              New Task
            </Button>
          </div>
        </div>

        {/* Deliverables Progress & Dates */}
        <div className="pt-4 border-t border-crew-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 flex-wrap text-crew-text-secondary">
            {project?.start_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Started: {formatDate(project.start_date)}</span>
              </div>
            )}
            {project?.deadline && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-crew-terracotta" />
                <span className="font-medium text-crew-text-primary">
                  Target Deadline: {formatDate(project.deadline)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>{teamMembers.length} Members</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="font-heading font-semibold text-crew-text-primary">
                {completedTasksCount}/{totalTasksCount} Completed ({completionPercentage}%)
              </span>
            </div>
            <div className="w-28 h-2 rounded-full bg-crew-bg overflow-hidden">
              <div
                className="h-full rounded-full bg-crew-action transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
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

      {/* 3-Column Interactive Kanban Board */}
      <div className="flex flex-col lg:flex-row gap-6 overflow-x-auto pb-6">
        {/* Column 1: To Do */}
        <KanbanColumn
          id="col-todo"
          title="To Do"
          statusKey="todo"
          tasks={todoTasks}
          onAddTask={handleOpenCreateTask}
          onEditTask={handleOpenEditTask}
          onStatusChange={handleStatusChange}
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
        />

        {/* Column 3: Done */}
        <KanbanColumn
          id="col-done"
          title="Done"
          statusKey="done"
          tasks={doneTasks}
          onAddTask={handleOpenCreateTask}
          onEditTask={handleOpenEditTask}
          onStatusChange={handleStatusChange}
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
    </div>
  );
}
