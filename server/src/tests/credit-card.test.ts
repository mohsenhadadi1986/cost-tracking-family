import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { creditCardSettlementDate } from '../utils/credit-card';

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
