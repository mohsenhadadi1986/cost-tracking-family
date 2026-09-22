export type TransactionTypeFilter = 'all' | 'expense' | 'income' | 'transfer';

export interface TransactionFilter {
  startDate: string;
  endDate: string;
  categories: string[];
  type: TransactionTypeFilter;
}
