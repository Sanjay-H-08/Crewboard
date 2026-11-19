import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStudentGamification } from './gamification.js';

test('calculateStudentGamification calculates base level 1 with 0 tasks', () => {
  const result = calculateStudentGamification([], [], 0);
  assert.equal(result.totalXP, 0);
  assert.equal(result.level, 1);
  assert.equal(result.levelTitle, 'Apprentice Contributor');
  assert.equal(result.progressPct, 0);
  assert.equal(result.nextLevelXP, 50);
  assert.equal(result.xpToNextLevel, 50);
});

test('calculateStudentGamification awards XP for approved deliverables and first-pass quality', () => {
  const tasks = [
    {
      id: 'task-1',
      title: 'API Schema Design',
      status: 'done',
      deadline: '2026-12-01',
      latest_submission: { version: 1, status: 'approved' },
    },
    {
      id: 'task-2',
      title: 'Database Setup',
      status: 'done',
      deadline: '2026-12-01',
      latest_submission: { version: 2, status: 'approved' },
    },
  ];

  const result = calculateStudentGamification(tasks, [], 25);
  // 2 deliverables * 100 = 200 XP
  // 1 first-pass * 50 = 50 XP
  // 2 on-time * 25 = 50 XP
  // Total XP = 300 XP
  assert.equal(result.totalXP, 300);
  // Level = 1 + floor(sqrt(300 / 50)) = 1 + floor(sqrt(6)) = 1 + 2 = 3
  assert.equal(result.level, 3);
  assert.equal(result.completedDeliverablesCount, 2);
  assert.equal(result.firstPassCount, 1);
  assert.equal(result.onTimeCount, 2);

  // Check badges
  const firstBadge = result.badges.find((b) => b.id === 'first_deliverable');
  assert.equal(firstBadge.isUnlocked, true);

  const cleanBadge = result.badges.find((b) => b.id === 'clean_delivery');
  assert.equal(cleanBadge.isUnlocked, true);

  const heavyLifter = result.badges.find((b) => b.id === 'sprint_driver');
  assert.equal(heavyLifter.isUnlocked, false);
});

test('calculateStudentGamification unlocks team milestones based on progress percentage', () => {
  const result = calculateStudentGamification([], [], 60);
  const kickoff = result.teamMilestones.find((m) => m.id === 'milestone_kickoff');
  const halfway = result.teamMilestones.find((m) => m.id === 'milestone_halfway');
  const capstone = result.teamMilestones.find((m) => m.id === 'milestone_completion');

  assert.equal(kickoff.isUnlocked, true);
  assert.equal(halfway.isUnlocked, true);
  assert.equal(capstone.isUnlocked, false);
});

test('calculateStudentGamification accurately compares task completion date against deadline', () => {
  const tasks = [
    // Task completed on or before deadline in the past -> ON TIME
    {
      id: 'task-past-ontime',
      status: 'done',
      deadline: '2026-10-15',
      updated_at: '2026-10-14T10:00:00Z',
    },
    // Task completed after deadline in the past -> LATE
    {
      id: 'task-past-late',
      status: 'done',
      deadline: '2026-10-15',
      updated_at: '2026-10-18T10:00:00Z',
    },
    // Task completed with no deadline -> not counted in onTimeCount
    {
      id: 'task-no-deadline',
      status: 'done',
      deadline: null,
      updated_at: '2026-10-14T10:00:00Z',
    },
  ];

  const result = calculateStudentGamification(tasks, [], 0);
  assert.equal(result.completedDeliverablesCount, 3);
  assert.equal(result.onTimeCount, 1);
  assert.equal(result.xpBreakdown.punctualityXP, 25);
});

test('calculateStudentGamification scopes peer reviews to authenticated student and caps per task', () => {
  const currentUserId = 'student-alice-id';
  const activities = [
    // Review 1 by Alice on task-A (approved)
    {
      user_id: 'student-alice-id',
      action: 'submission_approved',
      task_id: 'task-A',
    },
    // Review 2 by Alice on task-A (subsequent cycle on same task -> should be deduplicated)
    {
      user_id: 'student-alice-id',
      action: 'changes_requested',
      task_id: 'task-A',
    },
    // Review 3 by Alice on task-B (distinct task -> counted)
    {
      user_id: 'student-alice-id',
      action: 'task_reviewed',
      task_id: 'task-B',
    },
    // Review 4 by Bob (another student -> should NOT be attributed to Alice)
    {
      user_id: 'student-bob-id',
      action: 'submission_approved',
      task_id: 'task-C',
    },
  ];

  const result = calculateStudentGamification([], activities, 0, currentUserId);
  // Alice reviewed task-A and task-B (2 unique tasks). Bob's review on task-C is excluded.
  assert.equal(result.peerReviewsCount, 2);
  assert.equal(result.xpBreakdown.peerReviewsXP, 80);
});
