import React, { useState, useEffect } from 'react';
import { useTeam } from '../context/TeamContext';
import { teamsService, formatApiError } from '../services/api';
import MemberTable from '../components/team/MemberTable';
import JoinCodeCard from '../components/team/JoinCodeCard';
import WorkloadDistribution from '../components/team/WorkloadDistribution';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Users, Check } from 'lucide-react';

export default function TeamsPage() {
  const { teams, activeTeam, activeTeamId, selectTeam } = useTeam();
  const [teamDetails, setTeamDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!activeTeamId) {
      setLoading(false);
      return;
    }
    let active = true;
    teamsService
      .get(activeTeamId)
      .then((data) => {
        if (!active) return;
        setTeamDetails(data);
      })
      .catch((err) => {
        if (!active) return;
        setError(formatApiError(err, 'Failed to load team workspace.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeTeamId]);

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" message="Loading team workspace..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-crew-border/60">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200">
            Workspace
          </span>
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-crew-text-primary tracking-tight">
          Team Workspace & Collaboration
        </h1>
        <p className="text-xs sm:text-sm text-crew-text-secondary mt-1">
          Manage your team members, workload distribution, and group identity
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
          {error}
        </div>
      )}

      {/* Team Switcher Pills if member of multiple teams */}
      {teams.length > 1 && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 shadow-subtle flex items-center gap-2 overflow-x-auto text-xs">
          <span className="font-semibold text-crew-text-secondary flex-shrink-0">Active Team:</span>
          {teams.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTeam(t.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 flex-shrink-0 ${
                t.id === activeTeamId
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-crew-text-secondary hover:text-crew-text-primary'
              }`}
            >
              <span>{t.name}</span>
              {t.id === activeTeamId && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}

      {teamDetails ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <MemberTable
                members={teamDetails.members || []}
                currentUserId={teamDetails.current_user_id}
                isLeader={activeTeam?.role === 'owner' || activeTeam?.role === 'leader'}
              />
              <WorkloadDistribution members={teamDetails.members || []} />
            </div>

            <div className="space-y-6">
              {teamDetails.join_code && (
                <JoinCodeCard joinCode={teamDetails.join_code} />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-heading font-semibold text-sm text-crew-text-primary">
              No Active Team Selected
            </h4>
            <p className="text-xs text-crew-text-secondary max-w-sm mx-auto">
              Join a team using a code or create a new team from the left sidebar to collaborate with peers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
