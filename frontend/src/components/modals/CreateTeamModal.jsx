import React, { useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { useTeam } from '../../context/TeamContext';
import { Users } from 'lucide-react';

export default function CreateTeamModal({ isOpen, onClose, onCreated }) {
  const { createTeam } = useTeam();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a team name (2-100 characters).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const created = await createTeam({
        name: name.trim(),
        description: description.trim() || null,
      });
      setName('');
      setDescription('');
      onClose();
      if (onCreated) onCreated(created);
    } catch (err) {
      setError(err.message || 'Failed to create team.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Team"
      description="Assemble your coursework group and generate an invitation join code."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded bg-crew-danger/10 border border-crew-danger/20 text-crew-danger text-xs font-medium">
            {error}
          </div>
        )}

        <Input
          id="team-name"
          label="Team Name"
          placeholder="e.g. CS402 Senior Capstone Team"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={Users}
          required
          autoFocus
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="team-desc"
            className="text-xs font-semibold uppercase tracking-wider text-crew-text-secondary font-heading"
          >
            Description (Optional)
          </label>
          <textarea
            id="team-desc"
            rows={3}
            placeholder="Brief scope, project title or course details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-crew-surface text-crew-text-primary text-sm rounded border border-crew-border hover:border-crew-sand p-3 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-crew-action/20 focus:border-crew-action resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-crew-border">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Team
          </Button>
        </div>
      </form>
    </Modal>
  );
}
