import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { match730 } from '../tax/match-730';
import { loadRules } from '../tax/rules/load-rules';
import { parseCuXml } from '../tax/parse-cu';
import type { Transaction } from '../models/transaction.model';

const CU_XML = `<?xml version="1.0" encoding="UTF-8"?>
<CertificazioneUnica anno="2025" cuLabel="CU 2026">
  <Punto n="1">45000</Punto>
  <Punto n="21">8500</Punto>
  <Familiare nome="Giulia Rossi" aCarico="true" eta="8"/>
  <Onero punto="341" codice="7">1200</Onero>
</CertificazioneUnica>
`;

function transaction(partial: Partial<Transaction> & Pick<Transaction, 'id' | 'category' | 'amount'>): Transaction {
  return {
    date: '2025-06-15',
    type: 'expense',
    description: partial.description ?? partial.category,
    account: partial.account ?? 'ING Current Account',
    settlementDate: '2025-06-15',
    settlementAccount: partial.account ?? 'ING Current Account',
    ...partial,
  };
}

describe('730 matching', () => {
  const catalog = loadRules(2026);
  const cu = parseCuXml(CU_XML, 2025);

  it('applies the medical franchise of 129.11', () => {
    const result = match730({
      catalog,
      cu: { ...cu, oneri: [] },
      transactions: [transaction({ id: 1, category: 'Medical', amount: 200 })],
    });

    const healthcare = result.quadroE.find(row => row.ruleId === 'healthcare');
    assert.equal(healthcare?.eligibleAmount, 70.89);
    assert.equal(healthcare?.estimatedDetrazione, 13.47);
  });

  it('caps school expenses at 1000 per student when Baby school is mapped', () => {
    const schoolCatalog = structuredClone(catalog);
    const school = schoolCatalog.rules.find(rule => rule.id === 'school_non_university');
    if (school) {
      school.reviewIfCategories = [];
    }

    const result = match730({
      catalog: schoolCatalog,
      cu: { ...cu, oneri: [] },
      transactions: [transaction({ id: 2, category: 'Baby school', amount: 1800 })],
    });

    const schoolRow = result.quadroE.find(row => row.ruleId === 'school_non_university');
    assert.equal(schoolRow?.eligibleAmount, 1000);
  });

  it('excludes cash payments from traceable 19% rules', () => {
    const result = match730({
      catalog,
      cu: { ...cu, oneri: [] },
      transactions: [transaction({ id: 3, category: 'Sport', amount: 180, account: 'Cash' })],
    });

    assert.equal(result.quadroE.find(row => row.ruleId === 'youth_sport'), undefined);
    assert.ok(result.excluded.some(row => row.skipReason?.includes('traceable')));
  });

  it('does not double-count medical amounts already in the CU', () => {
    const result = match730({
      catalog,
      cu: {
        ...cu,
        oneri: [{ point: 341, amount: 500 }],
      },
      transactions: [transaction({ id: 4, category: 'Medical', amount: 500 })],
    });

    const healthcare = result.quadroE.find(row => row.ruleId === 'healthcare');
    assert.equal(healthcare?.eligibleAmount, 370.89);
  });

  it('uses CU mortgage interest instead of the full rata', () => {
    const result = match730({
      catalog,
      cu,
      transactions: [transaction({ id: 5, category: 'Mortgage', amount: 850, description: 'Rata mutuo' })],
    });

    const mortgage = result.quadroE.find(row => row.ruleId === 'mortgage_principal');
    assert.equal(mortgage?.eligibleAmount, 1200);
    assert.equal(mortgage?.codice, 57);
    assert.ok(result.excluded.some(row => row.category === 'Mortgage' && row.skipReason?.includes('interest')));
  });

  it('uses the mortgage interest override when CU has no oneri', () => {
    const result = match730({
      catalog,
      cu: { ...cu, oneri: [] },
      transactions: [transaction({ id: 6, category: 'Mortgage', amount: 850 })],
      overrides: { mortgageInterestOverride: 980, mortgageStipulaYear: 2020 },
    });

    const mortgage = result.quadroE.find(row => row.ruleId === 'mortgage_principal');
    assert.equal(mortgage?.eligibleAmount, 980);
    assert.equal(mortgage?.codice, 7);
  });
});
