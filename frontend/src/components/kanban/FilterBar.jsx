import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';

export default function FilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  assigneeFilter,
  onAssigneeChange,
  teamMembers = [],
  onResetFilters,
  totalFiltered,
  totalCount,
}) {
  const isFiltered =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    assigneeFilter !== 'all';

  return (
    <div className="bg-crew-bg/30 dark:bg-[#181C24]/50 border border-crew-border/60 rounded-2xl p-2.5 sm:p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
      {/* Left: Search Bar */}
      <div className="relative flex-1 max-w-sm">
        <Search className="w-4 h-4 text-crew-text-tertiary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search deliverables..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-crew-surface text-crew-text-primary text-xs rounded-xl border border-crew-border hover:border-gray-300 dark:hover:border-gray-600 pl-9 pr-3 py-2 h-9 transition-colors focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 shadow-subtle"
        />
      </div>

      {/* Right: Dropdown Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-crew-text-secondary font-medium mr-1 hidden sm:flex">
          <Filter className="w-3.5 h-3.5 text-crew-text-tertiary" />
          <span>Filters:</span>
        </div>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-9 text-xs bg-crew-surface border border-crew-border hover:border-gray-300 dark:hover:border-gray-600 text-crew-text-primary rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 shadow-subtle"
          aria-label="Filter by Status"
        >
          <option value="all">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="submitted">In Review</option>
          <option value="changes_requested">Changes Requested</option>
          <option value="done">Completed</option>
        </select>

        {/* Priority */}
        <select
          value={priorityFilter}
          onChange={(e) => onPriorityChange(e.target.value)}
          className="h-9 text-xs bg-crew-surface border border-crew-border hover:border-gray-300 dark:hover:border-gray-600 text-crew-text-primary rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 shadow-subtle"
          aria-label="Filter by Priority"
        >
          <option value="all">All Priorities</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>

        {/* Assignee */}
        <select
          value={assigneeFilter}
          onChange={(e) => onAssigneeChange(e.target.value)}
          className="h-9 text-xs bg-crew-surface border border-crew-border hover:border-gray-300 dark:hover:border-gray-600 text-crew-text-primary rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 max-w-[150px] truncate shadow-subtle"
          aria-label="Filter by Assignee"
        >
          <option value="all">All Members</option>
          <option value="unassigned">Unassigned</option>
          {teamMembers.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.full_name}
            </option>
          ))}
        </select>

        {/* Reset Filter Button */}
        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline px-2 py-1 focus:outline-none font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}

        {totalCount !== undefined && (
          <span className="text-xs text-crew-text-tertiary ml-1 font-mono">
            Showing {totalFiltered !== undefined ? totalFiltered : totalCount} of {totalCount}
          </span>
        )}
      </div>
    </div>
  );
}
