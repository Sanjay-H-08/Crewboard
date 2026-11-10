import React, { useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { useTeam } from '../../context/TeamContext';
import { KeyRound } from 'lucide-react';

export default function JoinTeamModal({ isOpen, onClose, onJoined }) {
  const { joinTeam } = useTeam();
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Please enter a team join code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const team = await joinTeam(joinCode.trim());
      setJoinCode('');
      onClose();
      if (onJoined) onJoined(team);
    } catch (err) {
      setError(err.message || 'Failed to join team. Please check the code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Join Team with Code"
      description="Enter the 6–8 character uppercase alphanumeric code provided by your team lead."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded bg-crew-danger/10 border border-crew-danger/20 text-crew-danger text-xs font-medium">
            {error}
          </div>
        )}

        <Input
          id="join-code"
          label="Join Code"
          placeholder="e.g. ROVER-8491"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          icon={KeyRound}
          required
          autoFocus
          className="uppercase tracking-widest font-mono"
        />

        <p className="text-xs text-crew-text-secondary leading-relaxed">
          Once you join, you will automatically have access to all projects, Kanban boards, and contribution analytics for this team.
        </p>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-crew-border">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Join Team
          </Button>
        </div>
      </form>
    </Modal>
  );
}
