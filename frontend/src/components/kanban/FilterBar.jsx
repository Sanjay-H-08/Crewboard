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
    <div className="bg-crew-surface border border-crew-border rounded-lg p-3 sm:p-4 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Left: Search Bar */}
      <div className="relative flex-1 max-w-xs">
        <Search className="w-4 h-4 text-crew-text-secondary/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search deliverables..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-crew-bg/60 text-crew-text-primary text-xs rounded border border-crew-border hover:border-crew-sand pl-9 pr-3 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-crew-action/20 focus:border-crew-action"
        />
      </div>

      {/* Right: Dropdown Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-crew-text-secondary font-medium mr-1 hidden sm:flex">
          <Filter className="w-3.5 h-3.5 text-crew-action" />
          <span>Filters:</span>
        </div>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="text-xs bg-crew-bg border border-crew-border hover:border-crew-sand text-crew-text-primary rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-crew-action"
          aria-label="Filter by Status"
        >
          <option value="all">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>

        {/* Priority */}
        <select
          value={priorityFilter}
          onChange={(e) => onPriorityChange(e.target.value)}
          className="text-xs bg-crew-bg border border-crew-border hover:border-crew-sand text-crew-text-primary rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-crew-action"
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
          className="text-xs bg-crew-bg border border-crew-border hover:border-crew-sand text-crew-text-primary rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-crew-action max-w-[150px] truncate"
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
            className="inline-flex items-center gap-1 text-xs text-crew-terracotta hover:underline px-2 py-1 focus:outline-none font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}

        {/* Counter */}
        <div className="text-xs text-crew-text-secondary ml-auto md:ml-2 font-medium">
          Showing <span className="font-semibold text-crew-text-primary">{totalFiltered}</span> of{' '}
          {totalCount}
        </div>
      </div>
    </div>
  );
}
