import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fallbackSummary } from '../src/services/fallbackSummary.js';

test('empty meeting gives a clear message', () => {
  const r = fallbackSummary([], []);
  assert.match(r.summary, /No transcript/);
  assert.deepEqual(r.actionItems, []);
});

test('finds action items and decisions with owners', () => {
  const r = fallbackSummary(
    [
      { speaker: 'Asha', text: 'I will send the design doc by Friday' },
      { speaker: 'Ravi', text: 'We agreed to ship the beta next week' },
      { speaker: 'Asha', text: 'Nice weather today' },
    ],
    [{ sender: 'Ravi', text: 'we need to fix the login bug' }]
  );
  assert.equal(r.actionItems.length, 2);
  assert.equal(r.actionItems[0].owner, 'Asha');
  assert.equal(r.decisions.length, 1);
  assert.match(r.summary, /2 participants/);
});
