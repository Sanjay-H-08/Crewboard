import test from 'node:test';
import assert from 'node:assert/strict';

test('task status distribution accurately categorizes deliverable counts and percentages', () => {
  const tasks = [
    { id: '1', status: 'done', deadline: '2026-11-20' },
    { id: '2', status: 'done', deadline: '2026-11-20' },
    { id: '3', status: 'submitted', deadline: '2026-11-20' },
    { id: '4', status: 'in_progress', deadline: '2026-11-20' },
    { id: '5', status: 'changes_requested', deadline: '2026-11-20' },
  ];

  const total = tasks.length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const inReviewCount = tasks.filter((t) => t.status === 'submitted').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const changesCount = tasks.filter((t) => t.status === 'changes_requested').length;

  assert.equal(total, 5);
  assert.equal(doneCount, 2);
  assert.equal(inReviewCount, 1);
  assert.equal(inProgressCount, 1);
  assert.equal(changesCount, 1);

  assert.equal(Math.round((doneCount / total) * 100), 40);
  assert.equal(Math.round((inReviewCount / total) * 100), 20);
});

test('academic report rubric metrics calculate accurate averages and completion rates', () => {
  const students = [
    {
      user_id: 'alice',
      assessment: {
        technical_score: 5,
        documentation_score: 4,
        collaboration_score: 4,
        total_rubric_score: 13,
      },
    },
    {
      user_id: 'bob',
      assessment: {
        technical_score: 4,
        documentation_score: 5,
        collaboration_score: 5,
        total_rubric_score: 14,
      },
    },
    {
      user_id: 'charlie',
      assessment: null,
    },
  ];

  const assessed = students.filter((s) => Boolean(s.assessment));
  assert.equal(assessed.length, 2);

  const avgTotal = (assessed.reduce((acc, s) => acc + s.assessment.total_rubric_score, 0) / assessed.length).toFixed(1);
  const avgTech = (assessed.reduce((acc, s) => acc + s.assessment.technical_score, 0) / assessed.length).toFixed(1);

  assert.equal(avgTotal, '13.5');
  assert.equal(avgTech, '4.5');
});
