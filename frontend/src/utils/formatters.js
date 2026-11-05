/**
 * Formatting and Helper Utilities for Crewboard
 * Warm Editorial design tokens and standard formatting
 */

/**
 * Extract 1-2 letter initials from a full name
 */
export function getInitials(name = '') {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Format ISO date string (YYYY-MM-DD or ISO timestamp) to readable date
 */
export function formatDate(dateString) {
  if (!dateString) return 'No deadline';
  try {
    const date = new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Format ISO timestamp to relative time (e.g., "5m ago", "2h ago", "Yesterday")
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;

    return formatDate(dateString);
  } catch {
    return dateString;
  }
}

/**
 * Determine if a task deadline is overdue
 */
export function isTaskOverdue(task) {
  if (!task || task.status === 'done' || !task.deadline) return false;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(`${task.deadline}T00:00:00`);
    return deadlineDate < today;
  } catch {
    return false;
  }
}

/**
 * Format action logs into human readable activity sentences
 */
export function formatActivityText(activity) {
  const actor = activity.user_name || 'A team member';
  const task = activity.task_title ? `"${activity.task_title}"` : 'a task';
  const project = activity.project_name ? ` in ${activity.project_name}` : '';

  switch (activity.action) {
    case 'task_created':
      return {
        actor,
        action: 'created',
        target: task,
        detail: project,
      };
    case 'status_changed':
      return {
        actor,
        action: 'moved',
        target: task,
        detail: `to ${formatStatusLabel(activity.new_value)}`,
      };
    case 'task_assigned':
      return {
        actor,
        action: activity.new_value ? 'assigned' : 'unassigned',
        target: task,
        detail: activity.new_value ? `to ${activity.new_value}` : '',
      };
    case 'priority_changed':
      return {
        actor,
        action: 'set priority of',
        target: task,
        detail: `to ${activity.new_value}`,
      };
    case 'deadline_changed':
      return {
        actor,
        action: 'updated deadline for',
        target: task,
        detail: `to ${formatDate(activity.new_value)}`,
      };
    case 'project_created':
      return {
        actor,
        action: 'created project',
        target: `"${activity.new_value || activity.project_name}"`,
        detail: '',
      };
    default:
      return {
        actor,
        action: activity.action?.replace('_', ' ') || 'updated',
        target: task,
        detail: '',
      };
  }
}

export function formatStatusLabel(status) {
  switch (status) {
    case 'todo':
      return 'To Do';
    case 'in_progress':
      return 'In Progress';
    case 'done':
      return 'Done';
    default:
      return status || 'Unknown';
  }
}

export function formatPriorityLabel(priority) {
  switch (priority) {
    case 'high':
      return 'High Priority';
    case 'medium':
      return 'Medium Priority';
    case 'low':
      return 'Low Priority';
    default:
      return priority || 'Medium';
  }
}
