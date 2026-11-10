import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import { tasksService, formatApiError } from '../../services/api';
import { CheckSquare, Calendar } from 'lucide-react';

export default function TaskModal({
  isOpen,
  onClose,
  projectId,
  teamMembers = [],
  taskToEdit = null,
  initialStatus = 'todo',
  onSaved,
}) {
  const isEditing = Boolean(taskToEdit);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState(initialStatus);
  const [deadline, setDeadline] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync state when taskToEdit or modal open state changes
  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setDescription(taskToEdit.description || '');
      setAssignedTo(taskToEdit.assigned_to || '');
      setPriority(taskToEdit.priority || 'medium');
      setStatus(taskToEdit.status || 'todo');
      setDeadline(taskToEdit.deadline || '');
    } else {
      setTitle('');
      setDescription('');
      setAssignedTo('');
      setPriority('medium');
      setStatus(initialStatus || 'todo');
      setDeadline('');
    }
    setError(null);
  }, [taskToEdit, isOpen, initialStatus]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required (1–200 characters).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        const payload = {
          title: title.trim(),
          description: description.trim() || null,
          assigned_to: assignedTo || null,
          priority,
          status,
          deadline: deadline || null,
        };
        const updated = await tasksService.update(taskToEdit.id, payload);
        onClose();
        if (onSaved) onSaved(updated);
      } else {
        const payload = {
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || null,
          assigned_to: assignedTo || null,
          priority,
          status,
          deadline: deadline || null,
        };
        const created = await tasksService.create(payload);
        onClose();
        if (onSaved) onSaved(created);
      }
    } catch (err) {
      setError(formatApiError(err, 'Failed to save task.'));
    } finally {
      setLoading(false);
    }
  }

  // Assignee options from verified team members
  const memberOptions = teamMembers.map((m) => ({
    value: m.user_id,
    label: `${m.full_name} (${m.role})`,
  }));

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  const statusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Task' : 'Create New Task'}
      description={
        isEditing
          ? 'Modify deliverable details, reassign ownership, or update deadlines.'
          : 'Define a task and allocate it to a verified team member.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded bg-crew-danger/10 border border-crew-danger/20 text-crew-danger text-xs font-medium">
            {error}
          </div>
        )}

        <Input
          id="task-title"
          label="Task Title"
          placeholder="e.g. Calibrate PWM outputs on motor controller"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          icon={CheckSquare}
          required
          autoFocus
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="task-desc"
            className="text-xs font-semibold uppercase tracking-wider text-crew-text-secondary font-heading"
          >
            Description (Optional)
          </label>
          <textarea
            id="task-desc"
            rows={3}
            placeholder="Technical details, acceptance criteria, or testing notes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-crew-surface text-crew-text-primary text-sm rounded border border-crew-border hover:border-crew-sand p-3 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-crew-action/20 focus:border-crew-action resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            id="task-assignee"
            label="Assigned Member"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            options={memberOptions}
            placeholder="Unassigned"
          />

          <Select
            id="task-priority"
            label="Priority Level"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            options={priorityOptions}
            placeholder=""
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="task-deadline"
            label="Due Date"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            icon={Calendar}
          />

          <Select
            id="task-status"
            label="Workflow Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={statusOptions}
            placeholder=""
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-crew-border">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEditing ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
