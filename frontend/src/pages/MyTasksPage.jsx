import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { tasksService, formatApiError } from '../services/api';
import { PriorityBadge, StatusBadge, OverdueBadge } from '../components/common/Badge';
import { formatDate, isTaskOverdue } from '../utils/formatters';
import SubmissionModal from '../components/kanban/SubmissionModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import {
  Calendar,
  ExternalLink,
  UploadCloud,
  RotateCcw,
  Search,
  CheckCircle2,
  Paperclip,
  UserCheck,
  Play,
} from 'lucide-react';

export default function MyTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Submission modal
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [taskToSubmit, setTaskToSubmit] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const loadMyTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tasksService.getMyTasks();
      setTasks(data || []);
    } catch (err) {
      setError(formatApiError(err, 'Failed to load your assigned deliverables.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyTasks();
  }, [loadMyTasks]);

  function triggerFeedback(msg) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  }

  async function handleQuickStart(task) {
    setUpdatingTaskId(task.id);
    try {
      const updated = await tasksService.update(task.id, { status: 'in_progress' });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      triggerFeedback(`Task "${task.title}" is now In Progress.`);
    } catch (err) {
      setError(formatApiError(err, 'Failed to update task status.'));
    } finally {
      setUpdatingTaskId(null);
    }
  }

  function handleOpenSubmit(task) {
    setTaskToSubmit(task);
    setSubmissionModalOpen(true);
  }

  async function handleTaskSubmitted(submission) {
    if (taskToSubmit) {
      try {
        const refreshed = await tasksService.get(taskToSubmit.id);
        setTasks((prev) => prev.map((t) => (t.id === taskToSubmit.id ? refreshed : t)));
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

  // Filter tasks locally
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title?.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const matchesProject = t.project_name?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesProject) return false;
      }
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  // Metrics
  const pendingCount = tasks.filter((t) => t.status !== 'done').length;
  const underReviewCount = tasks.filter((t) => t.status === 'submitted').length;
  const changesRequestedCount = tasks.filter((t) => t.status === 'changes_requested').length;
  const overdueCount = tasks.filter((t) => isTaskOverdue(t)).length;

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" message="Loading your assigned deliverables..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-crew-text-primary tracking-tight">
            My Deliverables
          </h1>
          <p className="text-xs sm:text-sm text-crew-text-secondary mt-1">
            Track, execute, and submit your academic tasks across all project teams.
          </p>
        </div>

        <Button onClick={loadMyTasks} variant="outline" icon={RotateCcw} size="sm">
          Refresh Tasks
        </Button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-5 rounded-2xl bg-crew-surface border border-crew-border shadow-subtle">
          <div className="text-xs text-crew-text-secondary font-medium uppercase tracking-wider font-heading">
            Active Tasks
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-crew-text-primary mt-1">
            {pendingCount}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-crew-surface border border-crew-border shadow-subtle">
          <div className="text-xs text-crew-text-secondary font-medium uppercase tracking-wider font-heading">
            Under Review
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-purple-600 mt-1">
            {underReviewCount}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-crew-surface border border-crew-border shadow-subtle">
          <div className="text-xs text-crew-text-secondary font-medium uppercase tracking-wider font-heading">
            Changes Needed
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-500 mt-1">
            {changesRequestedCount}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-crew-surface border border-crew-border shadow-subtle">
          <div className="text-xs text-crew-text-secondary font-medium uppercase tracking-wider font-heading">
            Overdue
          </div>
          <div
            className={`text-2xl sm:text-3xl font-bold mt-1 ${
              overdueCount > 0 ? 'text-rose-600' : 'text-crew-text-primary'
            }`}
          >
            {overdueCount}
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300 text-xs font-medium animate-in fade-in flex items-center justify-between">
          <span>{feedback}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-crew-bg/40 dark:bg-[#181C24]/50 border border-crew-border/60 rounded-2xl p-3 sm:p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-crew-text-tertiary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search deliverables, projects, descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-crew-surface text-crew-text-primary text-xs rounded-xl border border-crew-border hover:border-gray-300 dark:hover:border-gray-600 pl-9 pr-3 py-2 h-9 transition-colors focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 shadow-subtle"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 text-xs bg-crew-surface border border-crew-border hover:border-gray-300 dark:hover:border-gray-600 text-crew-text-primary rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 shadow-subtle"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="submitted">In Review</option>
            <option value="changes_requested">Changes Requested</option>
            <option value="done">Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 text-xs bg-crew-surface border border-crew-border hover:border-gray-300 dark:hover:border-gray-600 text-crew-text-primary rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 shadow-subtle"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                priorityFilter !== 'all' && setPriorityFilter('all');
              }}
              className="text-xs text-rose-600 hover:underline font-medium px-2 py-1"
            >
              Reset
            </button>
          )}

          <span className="text-xs text-crew-text-tertiary ml-auto md:ml-2 font-mono">
            Showing {filteredTasks.length} of {tasks.length}
          </span>
        </div>
      </div>

      {/* Deliverables List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-crew-surface border border-crew-border rounded-2xl p-10 text-center text-xs text-crew-text-secondary space-y-2 shadow-subtle">
          <CheckCircle2 className="w-10 h-10 text-crew-text-tertiary mx-auto mb-2" />
          <h3 className="font-heading font-semibold text-crew-text-primary text-base">
            No Deliverables Match Your Criteria
          </h3>
          <p>
            {tasks.length === 0
              ? 'You do not have any assigned tasks across your project teams yet.'
              : 'Try clearing your search query or adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const overdue = isTaskOverdue(task);
            const latestSub = task.latest_submission;
            const isUpdating = updatingTaskId === task.id;

            return (
              <div
                key={task.id}
                className="bg-crew-surface border border-crew-border rounded-2xl p-5 shadow-subtle hover:border-gray-300 dark:hover:border-gray-600 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                      {overdue && <OverdueBadge text="Overdue" />}
                      {latestSub && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/40">
                          <span>v{latestSub.version}</span>
                          {latestSub.files?.length > 0 && (
                            <span className="flex items-center gap-0.5 text-purple-700 dark:text-purple-300">
                              <Paperclip className="w-2.5 h-2.5" />
                              {latestSub.files.length}
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    <h3 className="font-heading font-bold text-base text-crew-text-primary tracking-tight">
                      {task.title}
                    </h3>

                    {task.description && (
                      <p className="text-xs text-crew-text-secondary leading-relaxed line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-start">
                    {task.status === 'todo' && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleQuickStart(task)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-crew-bg hover:bg-black/5 dark:hover:bg-white/5 text-crew-text-primary border border-crew-border transition-colors disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Start Work</span>
                      </button>
                    )}

                    {(task.status === 'in_progress' || task.status === 'changes_requested') && (
                      <button
                        type="button"
                        onClick={() => handleOpenSubmit(task)}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md text-white transition-colors shadow-subtle ${
                          task.status === 'changes_requested'
                            ? 'bg-crew-warning hover:bg-crew-warning/90'
                            : 'bg-crew-action hover:bg-crew-action-hover'
                        }`}
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>
                          {task.status === 'changes_requested' ? 'Resubmit Work' : 'Submit Work'}
                        </span>
                      </button>
                    )}

                    {task.project_id && (
                      <Link
                        to={`/projects/${task.project_id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md border border-crew-border bg-crew-surface hover:bg-crew-selected text-crew-text-primary transition-colors"
                      >
                        <span>Workspace</span>
                        <ExternalLink className="w-3 h-3 text-crew-text-secondary" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Changes Requested Feedback Callout */}
                {task.status === 'changes_requested' && latestSub?.review_feedback && (
                  <div className="p-3 rounded-md bg-crew-warning/10 border border-crew-warning/20 text-xs">
                    <div className="flex items-center gap-1 text-crew-warning font-semibold mb-1">
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reviewer Feedback (v{latestSub.version}):</span>
                    </div>
                    <p className="italic text-crew-text-primary">{latestSub.review_feedback}</p>
                  </div>
                )}

                {/* Subtitle / Metadata Row */}
                <div className="pt-2 border-t border-crew-border/60 flex flex-wrap items-center justify-between gap-3 text-xs text-crew-text-secondary">
                  <div className="flex items-center gap-4 flex-wrap">
                    {task.project_name && (
                      <span className="font-medium text-crew-text-primary">
                        Project: {task.project_name}
                      </span>
                    )}
                    {task.reviewer_name && (
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-crew-action" />
                        <span>Reviewer: {task.reviewer_name}</span>
                      </span>
                    )}
                  </div>

                  {task.deadline && (
                    <div
                      className={`flex items-center gap-1.5 font-medium ${
                        overdue ? 'text-crew-danger font-semibold' : 'text-crew-text-secondary'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Target Due Date: {formatDate(task.deadline)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deliverable Submission Modal */}
      <SubmissionModal
        isOpen={submissionModalOpen}
        onClose={() => setSubmissionModalOpen(false)}
        task={taskToSubmit}
        onSubmitted={handleTaskSubmitted}
      />
    </div>
  );
}
