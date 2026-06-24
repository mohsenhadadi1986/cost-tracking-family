export const DEFAULT_EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Utilities',
  'Entertainment',
] as const;

export const DEFAULT_INCOME_CATEGORIES = ['Salary', 'Investment'] as const;

export const DEFAULT_CATEGORIES = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
] as const;

/** @deprecated Use persisted categories from the database instead. */
export const TRANSACTION_CATEGORIES = DEFAULT_CATEGORIES;

export type TransactionCategory = (typeof DEFAULT_CATEGORIES)[number];
