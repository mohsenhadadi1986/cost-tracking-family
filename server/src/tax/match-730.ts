import type { Transaction } from '../models/transaction.model';
import type {
  CuDependent,
  ParsedCu,
  QuadroERow,
  TaxFilingOverrides,
  TaxMatchResult,
  TaxMatchRow,
} from '../models/tax-730.model';
import type { TaxRule, TaxRulesCatalog } from './rules/schema';

const BABY_SCHOOL_REVIEW =
  'Split Baby school between asilo nido (code 33) and scuola (code 12) before filing.';

const MORTGAGE_INTEREST_ONLY =
  '730 deducts mortgage interest only, not the full rata. Use CU oneri or enter the interest override.';

const NOT_TRACEABLE = '19% deductions need a traceable payment. Cash is excluded.';

const FOSSIL_BOILER = 'Fossil-fuel boiler replacement is not deductible in 2025.';

const CATASTALI_WARNING =
  'Home reconstruction also needs quadro E51–E53 catastali data for the commercialista.';

export function match730(input: {
  catalog: TaxRulesCatalog;
  cu: ParsedCu;
  transactions: Transaction[];
  overrides?: TaxFilingOverrides;
}): TaxMatchResult {
  const dependents = input.overrides?.dependents ?? input.cu.dependents;
  const warnings: string[] = [...input.cu.warnings];
  const reddito = input.cu.redditoLavoroDipendente ?? 0;

  if (reddito > input.catalog.incomeLimits.riordinoStart) {
    warnings.push(
      `Reddito ${formatEuro(reddito)} is above €${input.catalog.incomeLimits.riordinoStart.toLocaleString('it-IT')}. Apply the 2026 riordino delle detrazioni with the commercialista.`
    );
  }

  const matches: TaxMatchRow[] = [];
  const excluded: TaxMatchRow[] = [];
  const needsReview: TaxMatchRow[] = [];
  const quadroE: QuadroERow[] = [];

  const mappedRules = input.catalog.rules.filter(rule => rule.categoryNames.length > 0);

  for (const rule of mappedRules) {
    const ruleRows: TaxMatchRow[] = [];
    const relatedTransactions = input.transactions.filter(transaction =>
      rule.categoryNames.includes(transaction.category) && transaction.type === 'expense'
    );

    if (rule.mortgageInterestOnly) {
      const mortgageResult = matchMortgage(rule, relatedTransactions, input.cu, input.overrides);
      ruleRows.push(...mortgageResult.rows);
      excluded.push(...mortgageResult.excluded);
    } else {
      for (const transaction of relatedTransactions) {
        const reviewFlag = rule.reviewIfCategories?.includes(transaction.category)
          ? reviewMessage(rule, transaction.category)
          : null;

        if (reviewFlag) {
          needsReview.push(createRow(rule, transaction, 0, null, reviewFlag));
          continue;
        }

        if (rule.traceablePaymentRequired && isCash(transaction.account, input.catalog.cashAccountNames)) {
          excluded.push(createRow(rule, transaction, 0, NOT_TRACEABLE, null));
          continue;
        }

        if (rule.id === 'home_renovation' && isFossilBoiler(transaction.description)) {
          excluded.push(createRow(rule, transaction, 0, FOSSIL_BOILER, null));
          continue;
        }

        ruleRows.push(createRow(rule, transaction, transaction.amount, null, null));
      }
    }

    const cuCertified = rule.mortgageInterestOnly ? 0 : cuAmountForRule(rule, input.cu);
    const transactionGross = sum(ruleRows.map(row => row.eligibleAmount));
    let eligible = roundMoney(Math.max(transactionGross, cuCertified));

    if (cuCertified > 0) {
      ruleRows.push({
        transactionId: null,
        ruleId: rule.id,
        rigo: rule.rigo,
        codice: resolveCodice(rule, input.overrides),
        category: 'CU',
        date: `${input.catalog.incomeYear}-12-31`,
        description: `Already certified in CU — overlapping transaction amounts are not added twice`,
        grossAmount: cuCertified,
        eligibleAmount: 0,
        skipReason: null,
        reviewFlag: 'cu_certified',
      });
    }

    if (rule.franchise && rule.franchise > 0 && eligible > 0) {
      eligible = roundMoney(Math.max(0, eligible - rule.franchise));
    }

    const beneficiaryCap = capForRule(rule, dependents);
    if (beneficiaryCap != null) {
      eligible = roundMoney(Math.min(eligible, beneficiaryCap));
    }

    const rate = resolveRate(rule, input.overrides);
    const phaseOut = phaseOutFactor(rule, reddito, input.catalog);
    const estimated = roundMoney(eligible * rate * phaseOut);
    const quadroWarnings: string[] = [];

    if (phaseOut < 1) {
      quadroWarnings.push(`120k–240k phase-out applied (factor ${phaseOut.toFixed(4)}).`);
    }
    if (rule.id === 'home_renovation' && eligible > 0) {
      quadroWarnings.push(CATASTALI_WARNING);
    }
    if (rule.id === 'university' && eligible > 0) {
      quadroWarnings.push('Non-state university fees are capped by the annual MUR decree.');
    }
    if (rule.id === 'insurance_life_or_calamity' && eligible > 0) {
      quadroWarnings.push('Confirm the policy type and contract year (codes 36/43 vs 51/54).');
    }

    matches.push(...ruleRows);

    if (eligible > 0 || ruleRows.length > 0) {
      quadroE.push({
        ruleId: rule.id,
        rigo: rule.rigo,
        codice: resolveCodice(rule, input.overrides),
        label: rule.label,
        rate,
        grossAmount: roundMoney(Math.max(transactionGross, cuCertified)),
        eligibleAmount: eligible,
        estimatedDetrazione: estimated,
        warnings: quadroWarnings,
        transactionIds: ruleRows
          .map(row => row.transactionId)
          .filter((id): id is number => id != null),
      });
    }
  }

  if (needsReview.length > 0) {
    warnings.push(BABY_SCHOOL_REVIEW);
  }

  return {
    quadroE: quadroE.filter(row => row.eligibleAmount > 0 || row.grossAmount > 0 || row.warnings.length > 0),
    matches: matches.filter(row => row.eligibleAmount > 0 || row.skipReason == null),
    excluded,
    needsReview,
    warnings,
  };
}

function matchMortgage(
  rule: TaxRule,
  transactions: Transaction[],
  cu: ParsedCu,
  overrides?: TaxFilingOverrides
): { rows: TaxMatchRow[]; excluded: TaxMatchRow[] } {
  const excluded = transactions.map(transaction =>
    createRow(rule, transaction, 0, MORTGAGE_INTEREST_ONLY, null)
  );

  const fromCu = cuAmountForRule(rule, cu);
  const override = overrides?.mortgageInterestOverride;
  const interest = override != null && override > 0 ? override : fromCu;
  const rows: TaxMatchRow[] = [];

  if (interest > 0) {
    rows.push({
      transactionId: null,
      ruleId: rule.id,
      rigo: rule.rigo,
      codice: resolveCodice(rule, overrides),
      category: 'Mortgage',
      date: `${cu.redditoYear}-12-31`,
      description: override != null && override > 0
        ? 'Mortgage interest override'
        : 'Mortgage interest from CU oneri',
      grossAmount: interest,
      eligibleAmount: interest,
      skipReason: null,
      reviewFlag: null,
    });
  }

  return { rows, excluded };
}

function cuAmountForRule(rule: TaxRule, cu: ParsedCu): number {
  return roundMoney(cu.oneri
    .filter(item => oneriBelongsToRule(rule, item))
    .reduce((total, item) => total + item.amount, 0));
}

function oneriBelongsToRule(rule: TaxRule, item: { point: number; codice?: number; amount: number }): boolean {
  const codes = new Set(
    [rule.codice, ...(rule.mortgageCodesByStipulaYear ?? []).map(entry => entry.codice)]
      .filter((value): value is number => value != null)
  );

  if (item.codice != null) {
    return codes.has(item.codice);
  }

  if (codes.size > 0) {
    return false;
  }

  return rule.excludeIfPresentInCuPoints.includes(item.point);
}

function capForRule(rule: TaxRule, dependents: CuDependent[]): number | undefined {
  if (rule.cap != null && rule.capPerBeneficiary == null) {
    return rule.cap;
  }
  if (rule.capPerBeneficiary == null) {
    return undefined;
  }

  return roundMoney(rule.capPerBeneficiary * beneficiaryCount(rule, dependents));
}

function beneficiaryCount(rule: TaxRule, dependents: CuDependent[]): number {
  const inCharge = dependents.filter(dependent => dependent.aCarico);
  if (rule.id === 'youth_sport') {
    const withAge = inCharge.filter(dependent => dependent.age != null);
    if (withAge.length > 0) {
      return Math.max(withAge.filter(dependent => (dependent.age ?? 0) >= 5 && (dependent.age ?? 0) <= 18).length, 1);
    }
    return Math.max(inCharge.length, 1);
  }

  return Math.max(inCharge.length, 1);
}

function phaseOutFactor(rule: TaxRule, reddito: number, catalog: TaxRulesCatalog): number {
  if (rule.incomePhaseOut !== '120k_240k') {
    return 1;
  }

  const { phaseOutStart, phaseOutEnd } = catalog.incomeLimits;
  if (reddito <= phaseOutStart) {
    return 1;
  }
  if (reddito >= phaseOutEnd) {
    return 0;
  }

  return (phaseOutEnd - reddito) / (phaseOutEnd - phaseOutStart);
}

function resolveRate(rule: TaxRule, overrides?: TaxFilingOverrides): number {
  if (rule.renovationRates) {
    return overrides?.renovationIsPrimaryResidence === false
      ? rule.renovationRates.other
      : rule.renovationRates.primaryResidence;
  }
  return rule.rate;
}

function resolveCodice(rule: TaxRule, overrides?: TaxFilingOverrides): number | null {
  if (rule.mortgageCodesByStipulaYear && rule.mortgageCodesByStipulaYear.length > 0) {
    const year = overrides?.mortgageStipulaYear ?? 2025;
    const match = rule.mortgageCodesByStipulaYear.find(item =>
      year >= item.fromYear && (item.toYear == null || year <= item.toYear)
    );
    return match?.codice ?? rule.codice;
  }
  return rule.codice;
}

function reviewMessage(rule: TaxRule, category: string): string {
  if (category === 'Baby school') {
    return BABY_SCHOOL_REVIEW;
  }
  if (category === 'Insurance home') {
    return 'Confirm this home insurance policy is a deductible life or calamity premium.';
  }
  return `Review mapping of ${category} onto ${rule.id}.`;
}

function isCash(account: string, cashNames: string[]): boolean {
  const normalized = account.trim().toLowerCase();
  return cashNames.some(name => name.trim().toLowerCase() === normalized);
}

function isFossilBoiler(description: string): boolean {
  return /caldaia.*(gas|metano|condensazione|fossile)|boiler.*(gas|oil)|combustibili fossili/i.test(description);
}

function createRow(
  rule: TaxRule,
  transaction: Transaction,
  eligibleAmount: number,
  skipReason: string | null,
  reviewFlag: string | null
): TaxMatchRow {
  return {
    transactionId: transaction.id,
    ruleId: rule.id,
    rigo: rule.rigo,
    codice: rule.codice,
    category: transaction.category,
    date: transaction.date,
    description: transaction.description,
    grossAmount: transaction.amount,
    eligibleAmount: roundMoney(eligibleAmount),
    skipReason,
    reviewFlag,
  };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatEuro(value: number): string {
  return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
