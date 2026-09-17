import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { creditCardSettlementDate, resolveTransactionSettlement } from './credit-card';

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
});
