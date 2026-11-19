import React, { useState } from 'react';
import {
  Sparkles,
  Award,
  ShieldCheck,
  Target,
  Clock,
  Users,
  CheckCircle2,
  Lock,
  Info,
  ChevronRight,
  X,
  Flame,
} from 'lucide-react';

export default function StudentGamificationCard({ gamification }) {
  const [activeTab, setActiveTab] = useState('badges'); // 'badges' | 'team' | 'breakdown'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [inspectingBadge, setInspectingBadge] = useState(null);

  if (!gamification) return null;

  const totalXP = gamification.totalXP ?? gamification.total_xp ?? 0;
  const level = gamification.level ?? 1;
  const levelTitle = gamification.levelTitle ?? gamification.level_title ?? 'Apprentice Contributor';
  const progressPct = gamification.progressPct ?? gamification.level_progress_percentage ?? 0;
  const currentLevelBaseXP =
    gamification.currentLevelBaseXP ?? gamification.current_level_base_xp ?? 0;
  const nextLevelXP = gamification.nextLevelXP ?? gamification.next_level_xp ?? 50;
  const xpToNextLevel = gamification.xpToNextLevel ?? gamification.xp_to_next_level ?? 50;
  const rawBreakdown = gamification.xpBreakdown ?? gamification.xp_breakdown ?? {};
  const xpBreakdown = {
    deliverablesXP: rawBreakdown.deliverablesXP ?? rawBreakdown.deliverables_xp ?? 0,
    firstPassXP: rawBreakdown.firstPassXP ?? rawBreakdown.first_pass_xp ?? 0,
    punctualityXP: rawBreakdown.punctualityXP ?? rawBreakdown.punctuality_xp ?? 0,
    peerReviewsXP: rawBreakdown.peerReviewsXP ?? rawBreakdown.peer_reviews_xp ?? 0,
  };

  const rawBadges = gamification.badges || [];
  const badges = rawBadges.map((b) => ({
    ...b,
    isUnlocked: b.isUnlocked ?? b.is_unlocked ?? false,
    criteria: b.criteria || b.description || '',
    category: b.category || 'Delivery',
    progressText: b.progress_text || b.progressText || '',
    icon:
      b.icon ||
      (b.category === 'Quality'
        ? 'Sparkles'
        : b.category === 'Punctuality'
          ? 'Clock'
          : b.category === 'Collaboration'
            ? 'ShieldCheck'
            : b.category === 'Teamwork'
              ? 'Users'
              : 'Target'),
  }));

  const rawMilestones = gamification.teamMilestones || gamification.team_milestones || [];
  const teamMilestones = rawMilestones.map((m) => ({
    ...m,
    isUnlocked: m.isUnlocked ?? m.is_unlocked ?? false,
    completionPct: m.completionPct ?? m.completion_percentage ?? 0,
  }));

  function getBadgeIcon(iconName, isUnlocked, size = 'w-4 h-4') {
    const className = `${size} ${
      isUnlocked ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'
    }`;
    switch (iconName) {
      case 'Target':
        return <Target className={className} />;
      case 'Sparkles':
        return <Sparkles className={className} />;
      case 'Clock':
        return <Clock className={className} />;
      case 'ShieldCheck':
        return <ShieldCheck className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      case 'Users':
        return <Users className={className} />;
      default:
        return <Award className={className} />;
    }
  }

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;
  const badgesCompletionPct = badges.length > 0 ? Math.round((unlockedCount / badges.length) * 100) : 0;

  const categories = ['all', 'Delivery', 'Quality', 'Collaboration', 'Punctuality', 'Teamwork'];
  const filteredBadges = selectedCategory === 'all'
    ? badges
    : badges.filter((b) => b.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <>
      <div className="bg-gradient-to-b from-white to-slate-50/60 dark:from-[#14171E] dark:to-[#1A1F29] border border-crew-border/90 rounded-2xl p-5 shadow-subtle space-y-4">
        {/* Level & Rank Header with Gold Accent */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-crew-border/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex flex-col items-center justify-center shadow-sm flex-shrink-0 ring-2 ring-amber-500/20">
              <span className="text-[10px] uppercase font-bold tracking-wider leading-none">LVL</span>
              <span className="font-heading font-extrabold text-xl leading-tight">{level}</span>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-sm text-crew-text-primary tracking-tight">
                  {levelTitle}
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40 shadow-xs">
                  {totalXP} XP
                </span>
              </div>
              <p className="text-[11px] text-crew-text-secondary">
                {xpToNextLevel > 0
                  ? `${xpToNextLevel} XP needed for Level ${level + 1}`
                  : `Maximum Level ${level} Reached!`}
              </p>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-[11px] font-semibold text-crew-text-primary font-mono">
              {unlockedCount}/{badges.length} Badges
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              {badgesCompletionPct}% Complete
            </div>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-crew-text-secondary text-[11px] font-medium">Level Progression</span>
            <span className="font-mono text-[11px] font-bold text-crew-text-primary">
              {progressPct}%
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-crew-text-tertiary font-mono pt-0.5">
            <span>{currentLevelBaseXP} XP</span>
            <span>{nextLevelXP} XP</span>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('badges')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-colors ${
              activeTab === 'badges'
                ? 'bg-white dark:bg-slate-900 font-semibold text-crew-text-primary shadow-xs'
                : 'text-crew-text-secondary hover:text-crew-text-primary'
            }`}
          >
            Achievements ({unlockedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-colors ${
              activeTab === 'team'
                ? 'bg-white dark:bg-slate-900 font-semibold text-crew-text-primary shadow-xs'
                : 'text-crew-text-secondary hover:text-crew-text-primary'
            }`}
          >
            Team Milestones
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('breakdown')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-colors ${
              activeTab === 'breakdown'
                ? 'bg-white dark:bg-slate-900 font-semibold text-crew-text-primary shadow-xs'
                : 'text-crew-text-secondary hover:text-crew-text-primary'
            }`}
          >
            XP Breakdown
          </button>
        </div>

        {/* Tab 1: Interactive Achievements */}
        {activeTab === 'badges' && (
          <div className="space-y-3 pt-1">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap transition-colors font-medium ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-crew-text-secondary hover:text-crew-text-primary border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {filteredBadges.map((badge) => (
                <button
                  key={badge.id}
                  type="button"
                  onClick={() => setInspectingBadge(badge)}
                  className={`text-left p-3 rounded-xl border transition-all text-xs group relative hover:-translate-y-0.5 hover:shadow-card cursor-pointer ${
                    badge.isUnlocked
                      ? 'bg-gradient-to-br from-white to-amber-50/40 dark:from-slate-900 dark:to-amber-950/20 border-amber-200/80 dark:border-amber-800/40 shadow-xs'
                      : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/70 dark:border-slate-800/60 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
                        badge.isUnlocked
                          ? 'bg-amber-100/70 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {badge.isUnlocked ? (
                        getBadgeIcon(badge.icon, true)
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-crew-text-primary truncate block text-[11px]">
                          {badge.name}
                        </span>
                        {badge.isUnlocked ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                        )}
                      </div>
                      <span className="text-[10px] text-crew-text-secondary block truncate mt-0.5">
                        {badge.category}
                      </span>
                      {badge.progressText && !badge.isUnlocked && (
                        <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 block mt-1">
                          {badge.progressText}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Team Milestone Achievements */}
        {activeTab === 'team' && (
          <div className="space-y-2.5 pt-1">
            {teamMilestones.map((milestone) => (
              <div
                key={milestone.id}
                className={`p-3 rounded-xl border text-xs space-y-2 ${
                  milestone.isUnlocked
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40 shadow-xs'
                    : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/70 dark:border-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      milestone.isUnlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Award className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-crew-text-primary text-[12px]">
                      {milestone.name}
                    </span>
                  </div>
                  {milestone.isUnlocked ? (
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Achieved
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-semibold text-crew-text-tertiary">
                      {milestone.completionPct}% Done
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-crew-text-secondary leading-snug">
                  {milestone.description}
                </p>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      milestone.isUnlocked ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(milestone.completionPct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Verifiable XP Breakdown */}
        {activeTab === 'breakdown' && (
          <div className="space-y-2 pt-1 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[11px] shadow-xs">
              <span className="text-crew-text-secondary font-medium">Approved Deliverables (100 XP each)</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                +{xpBreakdown?.deliverablesXP || 0} XP
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[11px] shadow-xs">
              <span className="text-crew-text-secondary font-medium">Clean Delivery Bonus (v1 Approved: 50 XP)</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                +{xpBreakdown?.firstPassXP || 0} XP
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[11px] shadow-xs">
              <span className="text-crew-text-secondary font-medium">Punctual Milestone Bonus (25 XP each)</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                +{xpBreakdown?.punctualityXP || 0} XP
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[11px] shadow-xs">
              <span className="text-crew-text-secondary font-medium">Peer Review Auditing (40 XP each)</span>
              <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                +{xpBreakdown?.peerReviewsXP || 0} XP
              </span>
            </div>
          </div>
        )}

        {/* Non-Punitive Academic Integrity Disclaimer */}
        <div className="flex items-center gap-2 pt-1 text-[10px] text-crew-text-tertiary border-t border-crew-border/60">
          <Info className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
          <span>
            XP points reward verified deliverable approvals and constructive peer reviews. XP is decoupled from academic grading.
          </span>
        </div>
      </div>

      {/* Interactive Badge Inspection Modal */}
      {inspectingBadge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setInspectingBadge(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1A1F29] border border-crew-border p-6 shadow-modal space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                    inspectingBadge.isUnlocked
                      ? 'bg-amber-100 text-amber-600 border border-amber-300'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {getBadgeIcon(inspectingBadge.icon, inspectingBadge.isUnlocked, 'w-6 h-6')}
                </div>
                <div>
                  <h4 className="font-heading font-bold text-base text-crew-text-primary">
                    {inspectingBadge.name}
                  </h4>
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    {inspectingBadge.category} Track
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingBadge(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-crew-text-tertiary">
                  Earning Criteria
                </span>
                <p className="text-crew-text-primary font-medium leading-relaxed">
                  {inspectingBadge.criteria}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-crew-text-tertiary">
                  Status & Progress
                </span>
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${
                    inspectingBadge.isUnlocked ? 'text-emerald-600' : 'text-slate-500'
                  }`}>
                    {inspectingBadge.isUnlocked ? 'Unlocked & Verified' : 'Locked (In Progress)'}
                  </span>
                  {inspectingBadge.progressText && (
                    <span className="font-mono font-bold text-indigo-600">
                      {inspectingBadge.progressText}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setInspectingBadge(null)}
              className="w-full py-2.5 rounded-xl bg-[#181B20] text-white dark:bg-white dark:text-gray-900 font-semibold text-xs transition-colors hover:bg-black dark:hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
