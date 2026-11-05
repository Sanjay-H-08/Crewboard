import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getInitials,
  formatDate,
  formatRelativeTime,
  isTaskOverdue,
  formatActivityText,
  formatStatusLabel,
  formatPriorityLabel,
} from './formatters.js';
import { formatApiError } from '../services/api.js';

test('getInitials extracts 1-2 uppercase characters properly', () => {
  assert.equal(getInitials('Marcus Vance'), 'MV');
  assert.equal(getInitials('Elena'), 'EL');
  assert.equal(getInitials(''), '?');
  assert.equal(getInitials(null), '?');
  assert.equal(getInitials('Devon Wei Chen'), 'DC');
});

test('formatDate correctly parses ISO dates and returns readable string', () => {
  assert.equal(formatDate('2026-11-20'), 'Nov 20, 2026');
  assert.equal(formatDate(null), 'No deadline');
  assert.equal(formatDate(''), 'No deadline');
});

test('formatRelativeTime returns accurate relative strings', () => {
  const now = new Date().toISOString();
  assert.equal(formatRelativeTime(now), 'Just now');
  assert.equal(formatRelativeTime(''), '');
  assert.equal(formatRelativeTime(null), '');
});

test('isTaskOverdue flags overdue tasks correctly', () => {
  const pastTask = {
    status: 'in_progress',
    deadline: '2020-01-01',
  };
  assert.equal(isTaskOverdue(pastTask), true);

  const donePastTask = {
    status: 'done',
    deadline: '2020-01-01',
  };
  assert.equal(isTaskOverdue(donePastTask), false);

  const futureTask = {
    status: 'todo',
    deadline: '2099-12-31',
  };
  assert.equal(isTaskOverdue(futureTask), false);

  const noDeadlineTask = {
    status: 'todo',
    deadline: null,
  };
  assert.equal(isTaskOverdue(noDeadlineTask), false);
});

test('formatStatusLabel and formatPriorityLabel return user-friendly labels', () => {
  assert.equal(formatStatusLabel('todo'), 'To Do');
  assert.equal(formatStatusLabel('in_progress'), 'In Progress');
  assert.equal(formatStatusLabel('done'), 'Done');

  assert.equal(formatPriorityLabel('high'), 'High Priority');
  assert.equal(formatPriorityLabel('medium'), 'Medium Priority');
  assert.equal(formatPriorityLabel('low'), 'Low Priority');
});

test('formatActivityText formats audit events according to contract specification', () => {
  const createdAct = {
    user_name: 'Marcus Vance',
    action: 'task_created',
    task_title: 'PWM Calibration',
    project_name: 'Rover Build',
  };
  const res1 = formatActivityText(createdAct);
  assert.equal(res1.actor, 'Marcus Vance');
  assert.equal(res1.action, 'created');
  assert.equal(res1.target, '"PWM Calibration"');

  const statusAct = {
    user_name: 'Elena Rostova',
    action: 'status_changed',
    task_title: 'Mount Encoders',
    new_value: 'in_progress',
  };
  const res2 = formatActivityText(statusAct);
  assert.equal(res2.action, 'moved');
  assert.equal(res2.detail, 'to In Progress');
});

test('formatApiError handles FastAPI RFC error formats', () => {
  // String detail (e.g. 400 Bad Request, 401 Unauthorized)
  const err1 = { response: { data: { detail: 'Email already registered.' } } };
  assert.equal(formatApiError(err1), 'Email already registered.');

  // Array of validation errors (e.g. 422 Unprocessable Entity)
  const err2 = {
    response: {
      data: {
        detail: [
          { msg: 'Field required', loc: ['body', 'password'] },
          { msg: 'Invalid email', loc: ['body', 'email'] },
        ],
      },
    },
  };
  assert.equal(formatApiError(err2), 'Field required, Invalid email');

  // Network error
  const err3 = { message: 'Network Error', code: 'ERR_NETWORK' };
  assert.match(formatApiError(err3), /Unable to connect/);

  // Fallback
  assert.equal(formatApiError(null, 'Custom fallback'), 'Custom fallback');
});
