import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Tax730Filing } from '../models/tax-730.model';
import { buildDeductionRows, deductionTotals } from './tax-730-view';

const filing: Tax730Filing = {
  dichiarazioneYear: 2026,
  incomeYear: 2025,
  officialForm: 'Modello 730/2026',
  officialCuLabel: 'CU 2026',
  status: 'matched',
  hasCu: true,
  overrides: {},
  changelog: [],
  rulesVersion: '2026.1.0',
  match: {
    warnings: [],
    excluded: [],
    needsReview: [],
    matches: [
      {
        transactionId: 1,
        ruleId: 'healthcare',
        rigo: 'E1',
        codice: null,
        category: 'Medical',
        date: '2025-03-12',
        description: 'Visita specialistica',
        grossAmount: 200,
        eligibleAmount: 70.89,
        skipReason: null,
        reviewFlag: null,
      },
    ],
    quadroE: [
      {
        ruleId: 'healthcare',
        rigo: 'E1',
        codice: null,
        label: 'Spese sanitarie',
        rate: 0.19,
        grossAmount: 200,
        eligibleAmount: 70.89,
        estimatedDetrazione: 13.47,
        warnings: [],
        transactionIds: [1],
      },
    ],
  },
};

describe('buildDeductionRows', () => {
  it('maps quadro E into family category rows with included expenses', () => {
    const rows = buildDeductionRows(filing);

    assert.equal(rows.length, 1);
    assert.equal(rows[0].category, 'Medical');
    assert.equal(rows[0].spent, 200);
    assert.equal(rows[0].counted, 70.89);
    assert.equal(rows[0].taxBack, 13.47);
    assert.match(rows[0].note ?? '', /franchise/i);
    assert.equal(rows[0].expenses[0].description, 'Visita specialistica');
  });

  it('sums spent, counted, and tax back', () => {
    const totals = deductionTotals(buildDeductionRows(filing));
    assert.equal(totals.spent, 200);
    assert.equal(totals.counted, 70.89);
    assert.equal(totals.taxBack, 13.47);
  });
});
