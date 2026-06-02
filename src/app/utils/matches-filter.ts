import { Transaction } from '../models/transaction.model';
import { TransactionFilter } from '../models/transaction-filter.model';

/**
 * Returns whether a transaction satisfies the given filter criteria.
 *
 * Edge cases:
 * - Empty or omitted date bounds are treated as no limit (inclusive when set).
 * - An empty category list matches all categories.
 * - `type: 'all'` matches both expense and income.
 */
export function matchesFilter(transaction: Transaction, filter: TransactionFilter): boolean {
  if (filter.startDate && transaction.date < filter.startDate) {
    return false;
  }

  if (filter.endDate && transaction.date > filter.endDate) {
    return false;
  }

  if (filter.categories.length > 0 && !filter.categories.includes(transaction.category)) {
    return false;
  }

  if (filter.type !== 'all' && transaction.type !== filter.type) {
    return false;
  }

  return true;
}
