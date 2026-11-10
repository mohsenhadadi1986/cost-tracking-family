import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCreditCardStatementPayoffs,
  creditCardSettlementDate,
  creditCardStatementDescription,
  resolveTransactionSettlement,
  todayIsoDate,
} from './credit-card';

describe('credit-card', () => {
  it('charges the bank on the 10th of the next month', () => {
    assert.equal(creditCardSettlementDate('2026-09-15'), '2026-10-10');
  });

  it('keeps wallet expenses on the purchase date and place', () => {
    assert.deepEqual(
      resolveTransactionSettlement(
        { date: '2026-09-15', type: 'expense', account: 'Satispay' },
        [{ name: 'Satispay', kind: 'wallet' }]
      ),
      { settlementDate: '2026-09-15', settlementAccount: 'Satispay' }
    );
  });

  it('settles credit-card expenses from the linked bank', () => {
    assert.deepEqual(
      resolveTransactionSettlement(
        { date: '2026-09-15', type: 'expense', account: 'Credit Card' },
        [{ name: 'Credit Card', kind: 'credit', billingDay: 10, settlementAccount: 'Bank 1' }]
      ),
      { settlementDate: '2026-10-10', settlementAccount: 'Bank 1' }
    );
  });

  it('uses Europe/Rome for today so 10 Nov starts at Rome midnight', () => {
    assert.equal(todayIsoDate(new Date('2026-11-09T22:59:59.000Z')), '2026-11-09');
    assert.equal(todayIsoDate(new Date('2026-11-09T23:00:00.000Z')), '2026-11-10');
  });

  it('builds one statement payoff of 162.03 on the billing date', () => {
    const payoffs = buildCreditCardStatementPayoffs(
      [
        {
          date: '2026-10-12',
          type: 'expense',
          amount: 80,
          account: 'ING Credit Account',
          settlementDate: '2026-11-10',
          settlementAccount: 'ING Current Account',
        },
        {
          date: '2026-10-28',
          type: 'expense',
          amount: 82.03,
          account: 'ING Credit Account',
          settlementDate: '2026-11-10',
          settlementAccount: 'ING Current Account',
        },
      ],
      [
        { name: 'ING Current Account', kind: 'wallet' },
        { name: 'ING Credit Account', kind: 'credit' },
      ],
      '2026-11-10'
    );

    assert.equal(payoffs.length, 1);
    assert.equal(payoffs[0]?.amount, 162.03);
    assert.equal(payoffs[0]?.date, '2026-11-10');
    assert.equal(payoffs[0]?.description, creditCardStatementDescription('ING Credit Account'));
  });
});
