import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getIntervalRange, hasCustomSidebarDates, resolveOverviewRange, shiftMonthKey } from './overview-interval';

describe('overview-interval', () => {
  it('defaults month to the full selected calendar month', () => {
    const today = new Date(2026, 8, 17);
    assert.deepEqual(getIntervalRange('month', today), {
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });
    assert.deepEqual(getIntervalRange('month', today, '2026-10'), {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });
  });

  it('uses Monday as the start of the week', () => {
    const thursday = new Date(2026, 8, 17);
    assert.deepEqual(getIntervalRange('week', thursday), {
      startDate: '2026-09-14',
      endDate: '2026-09-17',
    });
  });

  it('lets sidebar dates win over the interval chips', () => {
    const today = new Date(2026, 8, 17);
    assert.deepEqual(
      resolveOverviewRange('month', { startDate: '2026-01-01', endDate: '2026-01-31' }, today),
      { startDate: '2026-01-01', endDate: '2026-01-31' }
    );
    assert.equal(hasCustomSidebarDates({ startDate: '2026-01-01', endDate: '' }), true);
    assert.equal(hasCustomSidebarDates({ startDate: '', endDate: '' }), false);
  });

  it('shifts a month key forward and backward', () => {
    assert.equal(shiftMonthKey('2026-09', 1), '2026-10');
    assert.equal(shiftMonthKey('2026-01', -1), '2025-12');
  });
});
