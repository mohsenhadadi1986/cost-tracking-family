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
    assert.equal(summary.projectedBalance, 70);
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
    assert.equal(beforeDue.creditCardDues.length, 0);
    assert.equal(beforeDue.availableThisMonth, 100);

    const october = buildSummary(transactions, '2026-10-01', '2026-10-31', {
      accounts,
      asOfDate: '2026-09-20',
    });

    assert.equal(october.creditCardDues.length, 1);
    assert.equal(october.creditCardDues[0]?.settlementDate, '2026-10-10');
    assert.equal(october.creditCardDues[0]?.settlementAccount, 'Bank 1');
    assert.equal(october.creditCardDues[0]?.amount, 40);
    assert.equal(october.availableThisMonth, 60);

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

  it('keeps lent money out of cash on hand', () => {
    const transactions = [
      {
        date: '2026-09-17',
        category: 'Initial budget',
        type: 'income' as const,
        amount: 200,
        account: 'Cash',
      },
      {
        date: '2026-09-17',
        category: 'Lend Mohammad',
        type: 'income' as const,
        amount: 300,
        account: 'Cash',
      },
    ];

    const summary = buildSummary(transactions, '2026-09-01', '2026-09-30', {
      asOfDate: '2026-09-17',
    });

    assert.equal(summary.accountBalances.find(row => row.account === 'Cash')?.amount, 200);
    assert.equal(summary.currentBalance, 200);
    assert.equal(summary.receivableTotal, 300);
    assert.equal(summary.receivableBalances[0]?.account, 'Lend Mohammad');
    assert.equal(summary.receivableBalances[0]?.amount, 300);
    assert.equal(summary.receivableBalances[0]?.lastCategory, 'Cash');
    assert.equal(summary.totalIncome, 200);
    assert.deepEqual(summary.incomeByCategory, { 'Initial budget': 200 });
  });

  it('uses the selected month for plans even when today is earlier', () => {
    const summary = buildSummary([], '2026-10-01', '2026-10-31', {
      asOfDate: '2026-09-17',
      plans: [{
        id: 1,
        name: 'Mutuo',
        amount: 550,
        account: 'ING Current Account',
        billingDay: 1,
        startDate: '2026-10-01',
        endDate: null,
        paymentCount: 98,
      }],
    });

    assert.equal(summary.plannedDueTotal, 550);
    assert.equal(summary.plannedDues[0]?.dueDate, '2026-10-01');
    assert.equal(summary.availableThisMonth, -550);
  });

  it('subtracts remaining this-month plans from next month available cash', () => {
    const transactions = [
      {
        date: '2026-09-17',
        category: 'Salary',
        type: 'income' as const,
        amount: 7298.82,
        account: 'ING Current Account',
      },
      {
        date: '2026-09-17',
        category: 'Baby school',
        type: 'expense' as const,
        amount: 180,
        account: 'Cash',
      },
    ];
    const plans = [
      {
        id: 1,
        name: 'Gas bill',
        amount: 84,
        account: 'ING Current Account',
        billingDay: 30,
        startDate: '2026-09-30',
        endDate: '2026-09-30',
        paymentCount: null,
      },
      {
        id: 2,
        name: 'Mutuo',
        amount: 550,
        account: 'ING Current Account',
        billingDay: 1,
        startDate: '2026-10-01',
        endDate: null,
        paymentCount: 98,
      },
      {
        id: 3,
        name: 'Prestito',
        amount: 70,
        account: 'ING Current Account',
        billingDay: 1,
        startDate: '2026-10-01',
        endDate: null,
        paymentCount: 90,
      },
    ];

    const september = buildSummary(transactions, '2026-09-01', '2026-09-30', {
      asOfDate: '2026-09-17',
      plans,
    });
    assert.equal(september.currentBalance, 7118.82);
    assert.equal(september.projectedBalance, 7118.82);
    assert.equal(september.plannedDueTotal, 84);
    assert.equal(september.availableThisMonth, 7034.82);
    assert.equal(september.totalIncome, 7298.82);
    assert.equal(september.totalExpense, 180);

    const october = buildSummary(
      transactions.filter(transaction => transaction.date.startsWith('2026-10')),
      '2026-10-01',
      '2026-10-31',
      {
        lifetimeTransactions: transactions,
        asOfDate: '2026-09-17',
        plans,
      }
    );
    assert.equal(october.currentBalance, 7118.82);
    assert.equal(october.projectedBalance, 7034.82);
    assert.equal(october.plannedDueTotal, 620);
    assert.equal(october.availableThisMonth, 6414.82);
    assert.equal(october.totalIncome, 0);
    assert.equal(october.totalExpense, 0);
    assert.equal(october.expenseByAccount.length, 0);
  });
});
