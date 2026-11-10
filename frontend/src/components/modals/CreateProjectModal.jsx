import React, { useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import Select from '../common/Select';
import { projectsService, formatApiError } from '../../services/api';
import { useTeam } from '../../context/TeamContext';
import { FolderPlus, Calendar } from 'lucide-react';

export default function CreateProjectModal({ isOpen, onClose, onCreated, teamId }) {
  const { teams, activeTeamId } = useTeam();
  const effectiveTeamId = teamId || activeTeamId;

  const [selectedTeamId, setSelectedTeamId] = useState(effectiveTeamId || '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync effectiveTeamId if changed
  React.useEffect(() => {
    if (effectiveTeamId) {
      setSelectedTeamId(effectiveTeamId);
    }
  }, [effectiveTeamId]);

  async function handleSubmit(e) {
    e.preventDefault();
    const finalTeamId = selectedTeamId || effectiveTeamId;
    if (!finalTeamId) {
      setError('Please select a team for this project.');
      return;
    }
    if (!name.trim()) {
      setError('Project name is required (2–150 characters).');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const payload = {
        team_id: finalTeamId,
        name: name.trim(),
        description: description.trim() || null,
        start_date: startDate || null,
        deadline: deadline || null,
        status: status || 'active',
      };
      const created = await projectsService.create(payload);
      setName('');
      setDescription('');
      setStartDate('');
      setDeadline('');
      setStatus('active');
      onClose();
      if (onCreated) onCreated(created);
    } catch (err) {
      setError(formatApiError(err, 'Failed to create project.'));
    } finally {
      setLoading(false);
    }
  }

  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }));
  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'planning', label: 'Planning' },
    { value: 'completed', label: 'Completed' },
    { value: 'archived', label: 'Archived' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Project"
      description="Define a collaborative milestone or sprint deliverable for your team."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded bg-crew-danger/10 border border-crew-danger/20 text-crew-danger text-xs font-medium">
            {error}
          </div>
        )}

        {!teamId && teams.length > 1 && (
          <Select
            id="proj-team"
            label="Assigned Team"
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            options={teamOptions}
            required
          />
        )}

        <Input
          id="proj-name"
          label="Project Name"
          placeholder="e.g. Chassis & Motor Controller Build"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={FolderPlus}
          required
          autoFocus
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="proj-desc"
            className="text-xs font-semibold uppercase tracking-wider text-crew-text-secondary font-heading"
          >
            Description (Optional)
          </label>
          <textarea
            id="proj-desc"
            rows={2}
            placeholder="Key deliverables, scope or architectural details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-crew-surface text-crew-text-primary text-sm rounded border border-crew-border hover:border-crew-sand p-3 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-crew-action/20 focus:border-crew-action resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            id="proj-start-date"
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            icon={Calendar}
          />

          <Input
            id="proj-deadline"
            label="Target Deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            icon={Calendar}
          />
        </div>

        <Select
          id="proj-status"
          label="Initial Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={statusOptions}
          placeholder=""
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-crew-border">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
