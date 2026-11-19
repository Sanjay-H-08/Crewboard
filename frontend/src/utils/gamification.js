/**
 * Lightweight, Balanced Gamification Utilities for Crewboard
 *
 * Guiding Principles:
 * 1. Verifiable Rewards Only: XP is awarded strictly for approved deliverables,
 *    first-pass quality, on-time delivery, and constructive peer reviews.
 * 2. Deterministic & Non-Punitive: No streak resets for weekends or holidays.
 * 3. Academic Integrity: XP does NOT dictate grades; it transparently reflects engagement.
 */

/**
 * Calculate user XP, Level, Badges, and Team Milestones from verified deliverable data
 */
export function calculateStudentGamification(
  myTasks = [],
  activities = [],
  teamProgressPct = 0,
  currentUserId = null
) {
  // 1. Approved deliverables count (status == 'done' or approved submission)
  const completedTasks = myTasks.filter((t) => t.status === 'done');
  const completedDeliverablesCount = completedTasks.length;

  // 2. First-pass approvals (approved without revision / v1)
  const firstPassCount = completedTasks.filter((t) => {
    return t.latest_submission && t.latest_submission.version === 1;
  }).length;

  // 3. Punctual completions (completed on or before deadline)
  // Compares actual task completion date against designated deadline
  const onTimeCount = completedTasks.filter((t) => {
    if (!t.deadline) return false;
    const completionTimestamp = t.updated_at || t.latest_submission?.reviewed_at;
    if (!completionTimestamp) return true;
    const finishDateStr = new Date(completionTimestamp).toISOString().slice(0, 10);
    return finishDateStr <= t.deadline;
  }).length;

  // 4. Peer reviews conducted for teammates (from activity logs), capped at 1 reward per unique task
  const reviewedTaskIds = new Set();
  activities.forEach((act) => {
    const isReviewAction =
      act.action === 'submission_approved' ||
      act.action === 'changes_requested' ||
      act.action === 'task_reviewed';
    if (!isReviewAction) return;
    // Attribution: ensure activity was performed by the currently authenticated student
    if (currentUserId && act.user_id !== currentUserId) return;
    if (act.task_id) {
      reviewedTaskIds.add(act.task_id);
    }
  });
  const peerReviewsCount = reviewedTaskIds.size;

  // XP Rules
  const deliverablesXP = completedDeliverablesCount * 100;
  const firstPassXP = firstPassCount * 50;
  const punctualityXP = onTimeCount * 25;
  const peerReviewsXP = peerReviewsCount * 40;

  const totalXP = deliverablesXP + firstPassXP + punctualityXP + peerReviewsXP;

  // Level Progression: Level = 1 + floor(sqrt(totalXP / 50))
  const level = totalXP > 0 ? 1 + Math.floor(Math.sqrt(totalXP / 50)) : 1;

  const currentLevelBaseXP = 50 * Math.pow(level - 1, 2);
  const nextLevelXP = 50 * Math.pow(level, 2);
  const bracketRange = nextLevelXP - currentLevelBaseXP;
  const xpInLevel = totalXP - currentLevelBaseXP;
  const progressPct =
    bracketRange > 0
      ? Math.round(Math.min(Math.max((xpInLevel / bracketRange) * 100, 0), 100))
      : 0;
  const xpToNextLevel = Math.max(nextLevelXP - totalXP, 0);

  const levelTitles = {
    1: 'Apprentice Contributor',
    2: 'Active Scholar',
    3: 'Reliable Specialist',
    4: 'Lead Architect',
    5: 'Distinguished Collaborator',
    6: 'Master Scholar',
  };
  const levelTitle = levelTitles[level] || 'Senior Fellow';

  // Badges
  const badges = [
    {
      id: 'first_deliverable',
      name: 'First Deliverable',
      description: 'Completed and verified your first academic deliverable.',
      category: 'Delivery',
      icon: 'Target',
      isUnlocked: completedDeliverablesCount >= 1,
      progressText: `${Math.min(completedDeliverablesCount, 1)}/1 completed`,
      criteria: 'Complete and obtain approval on 1 task deliverable.',
    },
    {
      id: 'clean_delivery',
      name: 'One-Shot Precision',
      description: 'Deliverable approved on version 1 without revisions requested.',
      category: 'Quality',
      icon: 'Sparkles',
      isUnlocked: firstPassCount >= 1,
      progressText: `${Math.min(firstPassCount, 1)}/1 v1 approved`,
      criteria: 'Achieve approval on submission version 1.',
    },
    {
      id: 'punctual_pro',
      name: 'Ahead of Time',
      description: 'Finished milestone deliverables on or before deadlines.',
      category: 'Punctuality',
      icon: 'Clock',
      isUnlocked: onTimeCount >= 3,
      progressText: `${Math.min(onTimeCount, 3)}/3 on-time`,
      criteria: 'Complete at least 3 tasks on or before the target deadline.',
    },
    {
      id: 'peer_reviewer',
      name: 'Quality Guardian',
      description: 'Conducted formal peer reviews with written feedback on teammate deliverables.',
      category: 'Collaboration',
      icon: 'ShieldCheck',
      isUnlocked: peerReviewsCount >= 2,
      progressText: `${Math.min(peerReviewsCount, 2)}/2 peer reviews`,
      criteria: 'Review and provide constructive feedback on at least 2 teammate submissions.',
    },
    {
      id: 'sprint_driver',
      name: 'Heavy Lifter',
      description: 'Owned and delivered 5 or more verified deliverables for the capstone team.',
      category: 'Delivery',
      icon: 'Flame',
      isUnlocked: completedDeliverablesCount >= 5,
      progressText: `${Math.min(completedDeliverablesCount, 5)}/5 completed`,
      criteria: 'Successfully complete 5 verified task deliverables.',
    },
    {
      id: 'team_synergy',
      name: 'Team Cohesion',
      description: 'Contributed to a team reaching 50% assignment milestone progress.',
      category: 'Teamwork',
      icon: 'Users',
      isUnlocked: teamProgressPct >= 50,
      progressText: `${teamProgressPct}% / 50% milestone`,
      criteria: 'Contribute to a team that achieves at least 50% completion.',
    },
  ];

  // Team Milestones
  const teamMilestones = [
    {
      id: 'milestone_kickoff',
      name: 'Sprint Kickoff (25%)',
      description: 'Initial deliverables submitted and approved.',
      isUnlocked: teamProgressPct >= 25,
      completionPct: Math.min(Math.round((teamProgressPct / 25) * 100), 100),
    },
    {
      id: 'milestone_halfway',
      name: 'Midterm Milestone (50%)',
      description: 'Core functional deliverable milestones achieved.',
      isUnlocked: teamProgressPct >= 50,
      completionPct: Math.min(Math.round((teamProgressPct / 50) * 100), 100),
    },
    {
      id: 'milestone_completion',
      name: 'Capstone Horizon (100%)',
      description: 'All team deliverables submitted and approved.',
      isUnlocked: teamProgressPct >= 100,
      completionPct: teamProgressPct,
    },
  ];

  return {
    totalXP,
    level,
    levelTitle,
    progressPct,
    currentLevelBaseXP,
    nextLevelXP,
    xpToNextLevel,
    xpBreakdown: {
      deliverablesXP,
      firstPassXP,
      punctualityXP,
      peerReviewsXP,
    },
    completedDeliverablesCount,
    firstPassCount,
    onTimeCount,
    peerReviewsCount,
    badges,
    teamMilestones,
  };
}
