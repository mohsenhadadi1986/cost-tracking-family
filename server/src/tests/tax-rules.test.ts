import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadChangelog, loadRules, listAvailableRuleYears, incomeYearFor } from '../tax/rules/load-rules';

describe('730 tax rules', () => {
  it('loads the 2026 catalog with mapped v1 categories', () => {
    const catalog = loadRules(2026);

    assert.equal(catalog.dichiarazioneYear, 2026);
    assert.equal(catalog.incomeYear, 2025);
    assert.equal(catalog.officialCuLabel, 'CU 2026');
    assert.ok(listAvailableRuleYears().includes(2026));
    assert.equal(incomeYearFor(2026), 2025);

    const byId = Object.fromEntries(catalog.rules.map(rule => [rule.id, rule]));
    assert.equal(byId.healthcare.rigo, 'E1');
    assert.equal(byId.healthcare.franchise, 129.11);
    assert.deepEqual(byId.healthcare.categoryNames, ['Medical']);
    assert.equal(byId.school_non_university.codice, 12);
    assert.equal(byId.school_non_university.capPerBeneficiary, 1000);
    assert.equal(byId.university.codice, 13);
    assert.equal(byId.youth_sport.codice, 16);
    assert.equal(byId.youth_sport.capPerBeneficiary, 210);
    assert.equal(byId.nursery.codice, 33);
    assert.equal(byId.mortgage_principal.rigo, 'E7');
    assert.equal(byId.mortgage_principal.mortgageInterestOnly, true);
    assert.equal(byId.home_renovation.renovationRates?.primaryResidence, 0.5);
    assert.equal(byId.home_renovation.renovationRates?.other, 0.36);
    assert.ok(catalog.rules.some(rule => rule.categoryNames.length === 0 && rule.codice === 14));
  });

  it('lists 2026 updates vs 2025 including school cap and mortgage codes', () => {
    const changelog = loadChangelog(2026);
    const ids = changelog.entries.map(entry => entry.id);

    assert.ok(ids.includes('school_cap'));
    assert.ok(ids.includes('mortgage_codes'));
    assert.ok(ids.includes('reconstruction_rates'));
    assert.ok(ids.includes('riordino_75k'));
    assert.ok(ids.includes('insurance_codes_2025'));

    const school = changelog.entries.find(entry => entry.id === 'school_cap');
    assert.match(school?.summary ?? '', /1,000|1000/);
  });
});
