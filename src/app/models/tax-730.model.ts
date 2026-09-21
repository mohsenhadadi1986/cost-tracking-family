export interface Tax730YearOption {
  dichiarazioneYear: number;
  incomeYear: number;
  officialForm: string;
  officialCuLabel: string;
}

export interface CuDependent {
  name: string;
  codiceFiscale?: string;
  relationship?: string;
  age?: number;
  aCarico: boolean;
}

export interface ParsedCu {
  redditoYear: number;
  cuLabel?: string;
  codiceFiscale?: string;
  redditoLavoroDipendente?: number;
  ritenute?: number;
  dependents: CuDependent[];
  oneri: Array<{ point: number; codice?: number; amount: number }>;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

export interface TaxFilingOverrides {
  mortgageInterestOverride?: number | null;
  mortgageStipulaYear?: number | null;
  renovationIsPrimaryResidence?: boolean;
  dependents?: CuDependent[];
}

export interface TaxMatchRow {
  transactionId: number | null;
  ruleId: string;
  rigo: string;
  codice: number | null;
  category: string;
  date: string;
  description: string;
  grossAmount: number;
  eligibleAmount: number;
  skipReason: string | null;
  reviewFlag: string | null;
}

export interface QuadroERow {
  ruleId: string;
  rigo: string;
  codice: number | null;
  label: string;
  rate: number;
  grossAmount: number;
  eligibleAmount: number;
  estimatedDetrazione: number;
  warnings: string[];
  transactionIds: number[];
}

export interface TaxMatchResult {
  quadroE: QuadroERow[];
  matches: TaxMatchRow[];
  excluded: TaxMatchRow[];
  needsReview: TaxMatchRow[];
  warnings: string[];
}

export interface Tax730Filing {
  dichiarazioneYear: number;
  incomeYear: number;
  officialForm: string;
  officialCuLabel: string;
  status: 'awaiting_cu' | 'cu_parsed' | 'matched';
  hasCu: boolean;
  cu?: ParsedCu | null;
  overrides: TaxFilingOverrides;
  match?: TaxMatchResult | null;
  changelog: Array<{ id: string; kind: 'new' | 'updated'; ruleId: string | null; summary: string }>;
  rulesVersion: string;
}
