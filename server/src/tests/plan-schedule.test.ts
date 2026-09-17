import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  enumeratePlanDueDates,
  firstDueDate,
  markPlanOccurrences,
  plannedDuesThisMonth,
} from '../utils/plan-schedule';

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

const sofa = {
  id: 2,
  name: 'Sofa',
  amount: 100,
  account: 'Revolut',
  billingDay: 5,
  startDate: '2026-09-15',
  endDate: null,
  paymentCount: 12,
};

describe('plan schedule', () => {
  it('starts on the billing day on or after the start date', () => {
    assert.equal(firstDueDate('2026-03-01', 10), '2026-03-10');
    assert.equal(firstDueDate('2026-03-10', 10), '2026-03-10');
    assert.equal(firstDueDate('2026-03-11', 10), '2026-04-10');
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

  it('clamps day 31 to the last day of shorter months', () => {
    const dates = enumeratePlanDueDates({
      id: 4,
      name: 'Rent',
      amount: 900,
      account: 'ING Current Account',
      billingDay: 31,
      startDate: '2026-01-31',
      endDate: '2026-03-31',
      paymentCount: null,
    });

    assert.deepEqual(dates, ['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  it('builds monthly dues until the end date', () => {
    const dates = enumeratePlanDueDates(mortgage);
    assert.equal(dates[0], '2026-01-01');
    assert.equal(dates.at(-1), '2026-12-01');
    assert.equal(dates.length, 12);
  });

  it('builds a fixed number of installment dues', () => {
    const dates = enumeratePlanDueDates(sofa);
    assert.equal(dates[0], '2026-10-05');
    assert.equal(dates.length, 12);
    assert.equal(dates.at(-1), '2027-09-05');
  });

  it('drops a due when a matching expense is logged in the same month', () => {
    const occurrences = markPlanOccurrences([mortgage], [
      {
        date: '2026-09-03',
        type: 'expense',
        amount: 800,
        account: 'ING Current Account',
      },
    ]);

    const september = occurrences.find(occurrence => occurrence.dueDate === '2026-09-01');
    const august = occurrences.find(occurrence => occurrence.dueDate === '2026-08-01');
    assert.equal(september?.paid, true);
    assert.equal(august?.paid, false);

    const planned = plannedDuesThisMonth(occurrences, '2026-09-17');
    assert.equal(planned.length, 0);
  });

  it('keeps this month reserved when the payment is not logged', () => {
    const planned = plannedDuesThisMonth(markPlanOccurrences([mortgage], []), '2026-09-17');
    assert.equal(planned.length, 1);
    assert.equal(planned[0]?.amount, 800);
    assert.equal(planned[0]?.remainingCount, 12);
  });
});
