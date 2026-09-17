import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  enumeratePlanDueDates,
  firstDueDate,
  markPlanOccurrences,
  plannedDuesThisMonth,
} from './plan-schedule';

const mortgage = {
  id: 1,
  name: 'Mortgage',
  amount: 800,
  account: 'ING Current Account',
  billingDay: 1,
  startDate: '2026-01-01',
  endDate: '2026-12-01',
  paymentCount: null,
};

describe('plan schedule', () => {
  it('starts on the billing day on or after the start date', () => {
    assert.equal(firstDueDate('2026-03-01', 10), '2026-03-10');
    assert.equal(firstDueDate('2026-09-15', 5), '2026-10-05');
  });

  it('keeps a same-month bill when the end date is before the next billing day', () => {
    assert.equal(firstDueDate('2026-09-30', 20, '2026-09-30'), '2026-09-30');
    const dates = enumeratePlanDueDates({
      id: 3,
      name: 'Electricity bill',
      amount: 121.25,
      account: 'ING Current Account',
      billingDay: 20,
      startDate: '2026-09-30',
      endDate: '2026-09-30',
      paymentCount: null,
    });
    assert.deepEqual(dates, ['2026-09-30']);
  });

  it('counts remaining unpaid dues this month', () => {
    const dates = enumeratePlanDueDates(mortgage);
    assert.equal(dates.length, 12);
    const planned = plannedDuesThisMonth(markPlanOccurrences([mortgage], []), '2026-09-17');
    assert.equal(planned[0]?.amount, 800);
  });
});
