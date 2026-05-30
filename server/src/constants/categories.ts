export const TRANSACTION_CATEGORIES = [
  'Food',
  'Transport',
  'Utilities',
  'Entertainment',
  'Salary',
  'Investment'
] as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];
