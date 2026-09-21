export type DeductionKind = 'detrazione' | 'deduzione';

export type IncomePhaseOut = 'none' | '120k_240k' | 'riordino_75k';

export type ChangelogKind = 'new' | 'updated';

export interface MortgageCodeByYear {
  fromYear: number;
  toYear: number | null;
  codice: number;
}

export interface RenovationRates {
  primaryResidence: number;
  other: number;
}

export interface TaxRule {
  id: string;
  label: string;
  rigo: string;
  codice: number | null;
  kind: DeductionKind;
  rate: number;
  cap: number | null;
  capPerBeneficiary: number | null;
  franchise: number | null;
  traceablePaymentRequired: boolean;
  incomePhaseOut: IncomePhaseOut;
  categoryNames: string[];
  reviewIfCategories?: string[];
  excludeIfPresentInCuPoints: number[];
  notes?: string;
  mortgageInterestOnly?: boolean;
  mortgageCodesByStipulaYear?: MortgageCodeByYear[];
  renovationRates?: RenovationRates;
}

export interface TaxIncomeLimits {
  phaseOutStart: number;
  phaseOutEnd: number;
  riordinoStart: number;
}

export interface TaxRulesCatalog {
  dichiarazioneYear: number;
  incomeYear: number;
  officialForm: string;
  officialCuLabel: string;
  version: string;
  source: string;
  cashAccountNames: string[];
  incomeLimits: TaxIncomeLimits;
  rules: TaxRule[];
}

export interface TaxChangelogEntry {
  id: string;
  kind: ChangelogKind;
  ruleId: string | null;
  summary: string;
}

export interface TaxChangelog {
  dichiarazioneYear: number;
  comparedTo: number;
  entries: TaxChangelogEntry[];
}

const KINDS = new Set<DeductionKind>(['detrazione', 'deduzione']);
const PHASE_OUTS = new Set<IncomePhaseOut>(['none', '120k_240k', 'riordino_75k']);

export function assertTaxRulesCatalog(value: unknown): TaxRulesCatalog {
  if (!isRecord(value)) {
    throw new Error('Tax rules catalog must be an object');
  }

  const catalog = value as unknown as TaxRulesCatalog;
  if (!Number.isInteger(catalog.dichiarazioneYear) || !Number.isInteger(catalog.incomeYear)) {
    throw new Error('Tax rules catalog is missing dichiarazioneYear or incomeYear');
  }

  if (!Array.isArray(catalog.rules) || catalog.rules.length === 0) {
    throw new Error('Tax rules catalog must include at least one rule');
  }

  if (!Array.isArray(catalog.cashAccountNames) || catalog.cashAccountNames.length === 0) {
    throw new Error('Tax rules catalog must list cash account names');
  }

  for (const rule of catalog.rules) {
    if (!rule.id || !rule.label || !rule.rigo) {
      throw new Error('Each tax rule needs id, label, and rigo');
    }
    if (!KINDS.has(rule.kind)) {
      throw new Error(`Invalid kind on rule ${rule.id}`);
    }
    if (!PHASE_OUTS.has(rule.incomePhaseOut)) {
      throw new Error(`Invalid incomePhaseOut on rule ${rule.id}`);
    }
    if (!Array.isArray(rule.categoryNames) || !Array.isArray(rule.excludeIfPresentInCuPoints)) {
      throw new Error(`Rule ${rule.id} is missing categoryNames or excludeIfPresentInCuPoints`);
    }
  }

  return catalog;
}

export function assertTaxChangelog(value: unknown): TaxChangelog {
  if (!isRecord(value)) {
    throw new Error('Tax changelog must be an object');
  }

  const changelog = value as unknown as TaxChangelog;
  if (!Number.isInteger(changelog.dichiarazioneYear) || !Array.isArray(changelog.entries)) {
    throw new Error('Tax changelog is missing dichiarazioneYear or entries');
  }

  for (const entry of changelog.entries) {
    if (!entry.id || (entry.kind !== 'new' && entry.kind !== 'updated') || !entry.summary) {
      throw new Error('Each changelog entry needs id, kind, and summary');
    }
  }

  return changelog;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
