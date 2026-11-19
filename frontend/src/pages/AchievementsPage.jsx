import React, { useState, useEffect } from 'react';
import { useTeam } from '../context/TeamContext';
import { authService, formatApiError } from '../services/api';
import StudentGamificationCard from '../components/dashboard/StudentGamificationCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Info } from 'lucide-react';

export default function AchievementsPage() {
  const { activeTeamId } = useTeam();
  const [gamification, setGamification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    authService
      .getGamification(activeTeamId)
      .then((data) => {
        if (!active) return;
        setGamification(data);
      })
      .catch((err) => {
        if (!active) return;
        setError(formatApiError(err, 'Failed to load gamification status.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeTeamId]);

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" message="Loading your achievements dossier..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-crew-border/60">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200">
            My Learning
          </span>
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-crew-text-primary tracking-tight">
          Achievements & Milestone Badges
        </h1>
        <p className="text-xs sm:text-sm text-crew-text-secondary mt-1">
          Evidence-based contributor rank, deliverable milestones, and team achievements
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
          {error}
        </div>
      )}

      {/* Main Interactive Gamification Dossier */}
      <div className="max-w-4xl">
        <StudentGamificationCard gamification={gamification} />
      </div>

      {/* Educational & Academic Integrity Notice */}
      <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5 max-w-4xl">
        <div className="flex items-center gap-2 font-semibold text-crew-text-primary">
          <Info className="w-4 h-4 text-indigo-500" />
          <span>About Crewboard Academic Gamification</span>
        </div>
        <p className="text-crew-text-secondary leading-relaxed">
          XP and badges in Crewboard are earned exclusively through verifiable milestone completions: approved deliverables (+100 XP), first-pass approvals with no changes requested (+50 XP), punctual completions on or before deadline (+25 XP), and thorough peer-review audits (+40 XP).
        </p>
        <p className="text-[11px] text-crew-text-tertiary">
          Academic evaluations and course grades remain strictly under the rubric control of your instructor.
        </p>
      </div>
    </div>
  );
}
