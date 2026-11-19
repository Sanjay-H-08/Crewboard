import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { projectsService, tasksService, teamsService, formatApiError } from '../services/api';
import KanbanColumn from '../components/kanban/KanbanColumn';
import TaskModal from '../components/kanban/TaskModal';
import SubmissionModal from '../components/kanban/SubmissionModal';
import ReviewModal from '../components/kanban/ReviewModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Plus, Search, FolderGit2, Users, RefreshCw, Layers } from 'lucide-react';

export default function KanbanPage() {
  const { user } = useAuth();
  const { activeTeam } = useTeam();
  const [searchParams, setSearchParams] = useSearchParams();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    return (
      searchParams.get('project') ||
      localStorage.getItem('crewboard_selected_project_id') ||
      ''
    );
  });
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modals state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [targetColumnStatus, setTargetColumnStatus] = useState('todo');
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [taskToSubmit, setTaskToSubmit] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [taskToReview, setTaskToReview] = useState(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Load student projects
  useEffect(() => {
    let active = true;
    projectsService
      .list()
      .then((projs) => {
        if (!active) return;
        const validProjs = projs || [];
        setProjects(validProjs);

        // Determine which project to select
        if (validProjs.length > 0) {
          const urlProj = searchParams.get('project');
          const storedProj = localStorage.getItem('crewboard_selected_project_id');
          const matchedProj = validProjs.find(
            (p) => p.id === urlProj || p.id === storedProj || p.id === selectedProjectId,
          );

          const targetId = matchedProj ? matchedProj.id : validProjs[0].id;
          setSelectedProjectId(targetId);
          localStorage.setItem('crewboard_selected_project_id', targetId);
          setSearchParams(
            (prev) => {
              const p = new URLSearchParams(prev);
              p.set('project', targetId);
              return p;
            },
            { replace: true },
          );
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Sync selectedProjectId changes with URL and localStorage
  const handleSelectProject = useCallback(
    (projId) => {
      setSelectedProjectId(projId);
      localStorage.setItem('crewboard_selected_project_id', projId);
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set('project', projId);
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Load team members for selected project
  useEffect(() => {
    if (!selectedProjectId || projects.length === 0) return;
    const proj = projects.find((p) => p.id === selectedProjectId);
    if (proj?.team_id) {
      teamsService
        .get(proj.team_id)
        .then((teamData) => {
          setTeamMembers(teamData.members || []);
        })
        .catch(() => {
          setTeamMembers(activeTeam?.members || []);
        });
    } else {
      setTeamMembers(activeTeam?.members || []);
    }
  }, [selectedProjectId, projects, activeTeam]);

  // Load tasks for active project
  const loadTasks = useCallback(
    async (projId, isManualRefresh = false) => {
      if (!projId) {
        setTasks([]);
        return;
      }
      if (isManualRefresh) setRefreshing(true);
      setError(null);
      try {
        const data = await tasksService.list(projId);
        setTasks(data || []);
      } catch (err) {
        setError(formatApiError(err, 'Failed to load project tasks.'));
      } finally {
        if (isManualRefresh) setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedProjectId) {
      loadTasks(selectedProjectId);
    }
  }, [selectedProjectId, loadTasks]);

  // Workflow handlers
  async function handleStatusChange(taskId, newStatus) {
    try {
      const updated = await tasksService.update(taskId, { status: newStatus });
      handleTaskSaved(updated);
    } catch (err) {
      setError(formatApiError(err, 'Failed to update task status.'));
    }
  }

  function handleOpenCreateTask(colStatus = 'todo') {
    setTargetColumnStatus(colStatus);
    setTaskToEdit(null);
    setTaskModalOpen(true);
  }

  function handleOpenEditTask(task) {
    setTargetColumnStatus(task.status || 'todo');
    setTaskToEdit(task);
    setTaskModalOpen(true);
  }

  function handleTaskSaved(savedTask) {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === savedTask.id);
      if (exists) {
        return prev.map((t) => (t.id === savedTask.id ? savedTask : t));
      }
      return [savedTask, ...prev];
    });
    setTaskModalOpen(false);
    setTaskToEdit(null);
  }

  function handleOpenSubmit(task) {
    setTaskToSubmit(task);
    setSubmissionModalOpen(true);
  }

  async function handleSubmissionSuccess(submission) {
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
    } else if (selectedProjectId) {
      loadTasks(selectedProjectId);
    }
    setSubmissionModalOpen(false);
    setTaskToSubmit(null);
  }

  function handleOpenReview(task) {
    setTaskToReview(task);
    setReviewModalOpen(true);
  }

  function handleReviewSuccess(updatedTask) {
    if (updatedTask && updatedTask.id) {
      handleTaskSaved(updatedTask);
    } else if (selectedProjectId) {
      loadTasks(selectedProjectId);
    }
    setReviewModalOpen(false);
    setTaskToReview(null);
  }

  const isLeaderOrTeacher =
    user?.system_role === 'teacher' ||
    activeTeam?.role === 'owner' ||
    activeTeam?.role === 'leader';

  // Multi-criteria filtering
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Stage status filter
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;

      // 2. Priority filter
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

      // 3. Assignee filter
      if (assigneeFilter !== 'all') {
        if (assigneeFilter === 'unassigned') {
          if (t.assigned_to) return false;
        } else if (assigneeFilter === 'me') {
          if (t.assigned_to !== user?.id) return false;
        } else if (t.assigned_to !== assigneeFilter) {
          return false;
        }
      }

      // 4. Keyword search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title?.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchAssignee = t.assignee_name?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchAssignee) return false;
      }

      return true;
    });
  }, [tasks, statusFilter, priorityFilter, assigneeFilter, searchQuery, user?.id]);

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

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" message="Loading Kanban Workspace..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-crew-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200">
              Interactive Workspace
            </span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-crew-text-primary tracking-tight">
            Academic Kanban Board
          </h1>
          <p className="text-xs sm:text-sm text-crew-text-secondary mt-1">
            Visual workflow stages with formal submission reviews and milestone tracking
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {projects.length > 0 && (
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-indigo-500" />
              <select
                value={selectedProjectId}
                onChange={(e) => handleSelectProject(e.target.value)}
                className="text-xs rounded-xl border border-crew-border bg-white dark:bg-slate-900 px-3 py-2 text-crew-text-primary font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.team_name ? `(${p.team_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => loadTasks(selectedProjectId, true)}
            disabled={refreshing || !selectedProjectId}
            className="p-2 rounded-xl border border-crew-border bg-white dark:bg-slate-900 text-crew-text-secondary hover:text-crew-text-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Refresh Board"
            aria-label="Refresh Board"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => handleOpenCreateTask('todo')}
            disabled={!selectedProjectId}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200 flex items-center justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs underline hover:text-rose-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Empty State: No projects available */}
      {projects.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 shadow-subtle space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-heading font-bold text-base text-crew-text-primary">
              No Projects Available
            </h3>
            <p className="text-xs text-crew-text-secondary leading-relaxed">
              Join or create a team and initiate your first project milestone to populate the Academic Kanban board.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to="/teams"
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
            >
              Go to Teams
            </Link>
            <Link
              to="/projects"
              className="px-4 py-2 rounded-xl border border-crew-border bg-white dark:bg-slate-900 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Browse Projects
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Filter and Search Bar */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 shadow-subtle flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Search Input */}
            <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search deliverables, descriptions, assignees..."
                className="w-full bg-transparent text-xs text-crew-text-primary focus:outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Assignee Filter */}
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-crew-border rounded-lg px-2.5 py-1 text-xs text-crew-text-primary focus:outline-none"
                >
                  <option value="all">All Assignees</option>
                  <option value="me">Assigned to Me</option>
                  <option value="unassigned">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div className="flex items-center gap-1.5">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-crew-border rounded-lg px-2.5 py-1 text-xs text-crew-text-primary focus:outline-none"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">⚡ Urgent</option>
                  <option value="high">▲ High</option>
                  <option value="medium">● Medium</option>
                  <option value="low">↓ Low</option>
                </select>
              </div>

              {/* Stage Filter */}
              <div className="flex items-center gap-1.5">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-crew-border rounded-lg px-2.5 py-1 text-xs text-crew-text-primary focus:outline-none"
                >
                  <option value="all">All Columns</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="submitted">Submitted</option>
                  <option value="changes_requested">Changes Requested</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <span className="font-mono text-crew-text-tertiary ml-1 text-[11px] font-semibold">
                {filteredTasks.length} / {tasks.length} tasks
              </span>
            </div>
          </div>

          {/* 5-Column Kanban Board */}
          <div className="flex flex-col xl:flex-row gap-4 overflow-x-auto pb-6">
            <KanbanColumn
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

            <KanbanColumn
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

            <KanbanColumn
              statusKey="submitted"
              tasks={submittedTasks}
              onEditTask={handleOpenEditTask}
              onStatusChange={handleStatusChange}
              onSubmitWork={handleOpenSubmit}
              onReviewWork={handleOpenReview}
              currentUserId={user?.id}
              isLeaderOrReviewer={isLeaderOrTeacher}
            />

            <KanbanColumn
              statusKey="changes_requested"
              tasks={changesRequestedTasks}
              onEditTask={handleOpenEditTask}
              onStatusChange={handleStatusChange}
              onSubmitWork={handleOpenSubmit}
              onReviewWork={handleOpenReview}
              currentUserId={user?.id}
              isLeaderOrReviewer={isLeaderOrTeacher}
            />

            <KanbanColumn
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
        </>
      )}

      {/* Modals */}
      {taskModalOpen && (
        <TaskModal
          isOpen={taskModalOpen}
          onClose={() => {
            setTaskModalOpen(false);
            setTaskToEdit(null);
          }}
          taskToEdit={taskToEdit}
          task={taskToEdit}
          initialStatus={targetColumnStatus}
          projectId={selectedProjectId}
          teamMembers={teamMembers}
          onSaved={handleTaskSaved}
          onSuccess={handleTaskSaved}
        />
      )}

      {submissionModalOpen && (
        <SubmissionModal
          isOpen={submissionModalOpen}
          onClose={() => {
            setSubmissionModalOpen(false);
            setTaskToSubmit(null);
          }}
          task={taskToSubmit}
          onSubmitted={handleSubmissionSuccess}
          onSuccess={handleSubmissionSuccess}
        />
      )}

      {reviewModalOpen && (
        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setTaskToReview(null);
          }}
          task={taskToReview}
          onReviewed={handleReviewSuccess}
          onSuccess={handleReviewSuccess}
        />
      )}
    </div>
  );
}
