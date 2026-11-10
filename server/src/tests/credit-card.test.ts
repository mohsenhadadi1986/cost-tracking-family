import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCreditCardStatementPayoffs,
  creditCardSettlementDate,
  creditCardStatementDescription,
  todayIsoDate,
} from '../utils/credit-card';

describe('creditCardSettlementDate', () => {
  it('charges the bank on the 10th of the next month', () => {
    assert.equal(creditCardSettlementDate('2026-09-15'), '2026-10-10');
    assert.equal(creditCardSettlementDate('2026-09-01', 10), '2026-10-10');
  });

  it('rolls over December into January', () => {
    assert.equal(creditCardSettlementDate('2026-12-20'), '2027-01-10');
  });

  it('clamps the billing day between 1 and 28', () => {
    assert.equal(creditCardSettlementDate('2026-09-15', 31), '2026-10-28');
    assert.equal(creditCardSettlementDate('2026-09-15', 0), '2026-10-10');
  });
});

describe('todayIsoDate', () => {
  it('uses Europe/Rome, so billing day starts at Rome midnight not UTC midnight', () => {
    assert.equal(todayIsoDate(new Date('2026-11-09T22:59:59.000Z')), '2026-11-09');
    assert.equal(todayIsoDate(new Date('2026-11-09T23:00:00.000Z')), '2026-11-10');
    assert.equal(todayIsoDate(new Date('2026-11-10T15:57:00.000Z')), '2026-11-10');
  });
});

describe('buildCreditCardStatementPayoffs', () => {
  const accounts = [
    { name: 'ING Current Account', kind: 'wallet' as const },
    { name: 'ING Credit Account', kind: 'credit' as const },
  ];

  it('groups last month card spend into one payoff on the settlement date', () => {
    const payoffs = buildCreditCardStatementPayoffs(
      [
        {
          date: '2026-10-03',
          type: 'expense',
          amount: 100,
          account: 'ING Credit Account',
          settlementDate: '2026-11-10',
          settlementAccount: 'ING Current Account',
        },
        {
          date: '2026-10-20',
          type: 'expense',
          amount: 62.03,
          account: 'ING Credit Account',
          settlementDate: '2026-11-10',
          settlementAccount: 'ING Current Account',
        },
      ],
      accounts,
      '2026-11-10'
    );

    assert.equal(payoffs.length, 1);
    assert.deepEqual(payoffs[0], {
      date: '2026-11-10',
      amount: 162.03,
      account: 'ING Current Account',
      toAccount: 'ING Credit Account',
      description: creditCardStatementDescription('ING Credit Account'),
    });
  });

  it('does not emit a payoff before the Europe/Rome billing day', () => {
    const payoffs = buildCreditCardStatementPayoffs(
      [
        {
          date: '2026-10-15',
          type: 'expense',
          amount: 162.03,
          account: 'ING Credit Account',
          settlementDate: '2026-11-10',
          settlementAccount: 'ING Current Account',
        },
      ],
      accounts,
      '2026-11-09'
    );

    assert.deepEqual(payoffs, []);
  });
});
