export type TransactionTypeFilter = 'all' | 'expense' | 'income';

export interface TransactionFilter {
  startDate: string;
  endDate: string;
  categories: string[];
  type: TransactionTypeFilter;
}
