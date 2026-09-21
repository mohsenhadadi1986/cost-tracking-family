import { Tax730Filing, TaxMatchRow, QuadroERow } from '../models/tax-730.model';

export interface TaxDeductionExpense {
  date: string;
  description: string;
  amount: number;
}

export interface TaxDeductionRow {
  ruleId: string;
  category: string;
  spent: number;
  counted: number;
  taxBack: number;
  note: string | null;
  expenses: TaxDeductionExpense[];
}

export interface TaxDeductionTotals {
  spent: number;
  counted: number;
  taxBack: number;
}

export function buildDeductionRows(filing: Tax730Filing | null): TaxDeductionRow[] {
  const quadroE = filing?.match?.quadroE ?? [];
  const matches = filing?.match?.matches ?? [];

  return quadroE
    .filter(row => row.grossAmount > 0 || row.eligibleAmount > 0)
    .map(row => ({
      ruleId: row.ruleId,
      category: categoryForRow(row, matches),
      spent: row.grossAmount,
      counted: row.eligibleAmount,
      taxBack: row.estimatedDetrazione,
      note: familyNote(row),
      expenses: expensesForRule(row.ruleId, matches),
    }));
}

export function deductionTotals(rows: TaxDeductionRow[]): TaxDeductionTotals {
  return rows.reduce<TaxDeductionTotals>(
    (totals, row) => ({
      spent: roundMoney(totals.spent + row.spent),
      counted: roundMoney(totals.counted + row.counted),
      taxBack: roundMoney(totals.taxBack + row.taxBack),
    }),
    { spent: 0, counted: 0, taxBack: 0 }
  );
}

function categoryForRow(row: QuadroERow, matches: TaxMatchRow[]): string {
  const fromExpense = matches.find(item => item.ruleId === row.ruleId && item.category !== 'CU');
  return fromExpense?.category ?? row.label;
}

function expensesForRule(ruleId: string, matches: TaxMatchRow[]): TaxDeductionExpense[] {
  return matches
    .filter(item => item.ruleId === ruleId && item.transactionId != null)
    .map(item => ({
      date: item.date,
      description: item.description,
      amount: item.grossAmount,
    }));
}

function familyNote(row: QuadroERow): string | null {
  if (row.ruleId === 'healthcare' && row.grossAmount > row.eligibleAmount) {
    return 'Counted after the €129.11 medical franchise.';
  }
  if (row.ruleId === 'mortgage_principal') {
    return 'Only mortgage interest counts, not the full monthly payment.';
  }
  return row.warnings[0] ?? null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
