import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getIntervalRange, hasCustomSidebarDates, resolveOverviewRange } from './overview-interval';

describe('overview-interval', () => {
  it('defaults month to the first of the month through today', () => {
    const today = new Date(2026, 8, 17);
    assert.deepEqual(getIntervalRange('month', today), {
      startDate: '2026-09-01',
      endDate: '2026-09-17',
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
});
