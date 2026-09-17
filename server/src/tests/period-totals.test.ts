import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildSummary, getPeriodTotals } from '../services/period-totals';

describe('period-totals', () => {
  const transactions = [
    { date: '2026-09-01', category: 'Food', type: 'expense' as const, amount: 10, account: 'Satispay' },
    { date: '2026-09-01', category: 'Salary', type: 'income' as const, amount: 100, account: 'Bank 1' },
    { date: '2026-08-15', category: 'Fuel', type: 'expense' as const, amount: 20, account: 'Bank 2' },
  ];

  it('zero-fills daily buckets for a short range', () => {
    const buckets = getPeriodTotals(transactions, '2026-08-31', '2026-09-01');
    assert.equal(buckets.length, 2);
    assert.deepEqual(buckets[0], { date: '2026-08-31', income: 0, expense: 0 });
    assert.deepEqual(buckets[1], { date: '2026-09-01', income: 100, expense: 10 });
  });

  it('uses monthly buckets for long ranges', () => {
    const buckets = getPeriodTotals(transactions, '2026-01-01', '2026-09-01');
    assert.ok(buckets.length >= 8);
    assert.ok(buckets.every(bucket => bucket.date.endsWith('-01')));
    const august = buckets.find(bucket => bucket.date === '2026-08-01');
    const september = buckets.find(bucket => bucket.date === '2026-09-01');
    assert.equal(august?.expense, 20);
    assert.equal(september?.income, 100);
  });

  it('includes net balance and income by source', () => {
    const summary = buildSummary(transactions, '2026-08-01', '2026-09-01');
    assert.equal(summary.totalIncome, 100);
    assert.equal(summary.totalExpense, 30);
    assert.equal(summary.netBalance, 70);
    assert.deepEqual(summary.incomeByCategory, { Salary: 100 });
    assert.deepEqual(summary.categoryTotals, { Food: 10, Fuel: 20 });
    assert.equal(summary.currentBalance, 70);
    assert.equal(summary.availableThisMonth, 70);
    assert.equal(summary.plannedDueTotal, 0);
    assert.equal(summary.incomeByAccount.find(row => row.account === 'Bank 1')?.amount, 100);
    assert.equal(summary.incomeByAccount.find(row => row.account === 'Bank 1')?.lastDate, '2026-09-01');
    assert.equal(summary.incomeByAccount.find(row => row.account === 'Bank 1')?.lastCategory, 'Salary');
    assert.equal(summary.accountBalances.find(row => row.account === 'Bank 1')?.amount, 100);
    assert.equal(summary.accountBalances.find(row => row.account === 'Satispay')?.amount, -10);
    assert.equal(summary.accountBalances.find(row => row.account === 'Bank 2')?.amount, -20);
  });

  it('counts card spend on the purchase date and charges the bank on next month 10th', () => {
    const transactions = [
      {
        date: '2026-09-15',
        category: 'Food',
        type: 'expense' as const,
        amount: 40,
        account: 'Credit Card',
        settlementDate: '2026-10-10',
        settlementAccount: 'Bank 1',
      },
      {
        date: '2026-09-01',
        category: 'Salary',
        type: 'income' as const,
        amount: 100,
        account: 'Bank 1',
      },
    ];
    const accounts = [
      { name: 'Bank 1', kind: 'wallet' as const },
      { name: 'Credit Card', kind: 'credit' as const },
    ];

    const beforeDue = buildSummary(transactions, '2026-09-01', '2026-09-30', {
      accounts,
      asOfDate: '2026-09-20',
    });

    assert.equal(beforeDue.totalExpense, 40);
    assert.equal(beforeDue.currentBalance, 100);
    assert.equal(beforeDue.accountBalances.find(row => row.account === 'Bank 1')?.amount, 100);
    assert.equal(beforeDue.accountBalances.find(row => row.account === 'Credit Card')?.amount, -40);
    assert.equal(beforeDue.creditCardDues.length, 1);
    assert.equal(beforeDue.creditCardDues[0]?.settlementDate, '2026-10-10');
    assert.equal(beforeDue.creditCardDues[0]?.settlementAccount, 'Bank 1');
    assert.equal(beforeDue.creditCardDues[0]?.amount, 40);
    assert.equal(beforeDue.availableThisMonth, 60);

    const afterDue = buildSummary(transactions, '2026-09-01', '2026-09-30', {
      accounts,
      asOfDate: '2026-10-10',
    });

    assert.equal(afterDue.totalExpense, 40);
    assert.equal(afterDue.currentBalance, 60);
    assert.equal(afterDue.accountBalances.find(row => row.account === 'Bank 1')?.amount, 60);
    assert.equal(afterDue.accountBalances.find(row => row.account === 'Credit Card')?.amount, 0);
    assert.equal(afterDue.creditCardDues.length, 0);
    assert.equal(afterDue.availableThisMonth, 60);
  });
});
