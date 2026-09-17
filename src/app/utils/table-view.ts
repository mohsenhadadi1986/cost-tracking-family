import { Transaction } from '../models/transaction.model';

export type TableSortKey = 'date' | 'category' | 'type' | 'amount' | 'description' | 'account';
export type SortDirection = 'asc' | 'desc';

export const TABLE_PAGE_SIZES = [10, 25, 50] as const;

export interface TableViewState {
  search: string;
  sortKey: TableSortKey;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
}

export function searchTransactions(rows: Transaction[], query: string): Transaction[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return rows;
  }

  return rows.filter(row =>
    row.description.toLowerCase().includes(normalized) ||
    row.category.toLowerCase().includes(normalized) ||
    row.account.toLowerCase().includes(normalized) ||
    row.type.toLowerCase().includes(normalized)
  );
}

export function sortTransactions(
  rows: Transaction[],
  sortKey: TableSortKey,
  sortDirection: SortDirection
): Transaction[] {
  const direction = sortDirection === 'asc' ? 1 : -1;

  return [...rows].sort((left, right) => {
    const comparison = compareValues(left[sortKey], right[sortKey]);
    if (comparison !== 0) {
      return comparison * direction;
    }

    return (right.id - left.id);
  });
}

export function paginateTransactions<T>(
  rows: T[],
  page: number,
  pageSize: number
): { pageRows: T[]; page: number; pageSize: number; total: number; totalPages: number } {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    pageRows: rows.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}

export function buildTableView(rows: Transaction[], state: TableViewState) {
  const searched = searchTransactions(rows, state.search);
  const sorted = sortTransactions(searched, state.sortKey, state.sortDirection);
  const paged = paginateTransactions(sorted, state.page, state.pageSize);

  return {
    ...paged,
    filteredCount: searched.length,
    rangeStart: searched.length === 0 ? 0 : (paged.page - 1) * paged.pageSize + 1,
    rangeEnd: Math.min(paged.page * paged.pageSize, searched.length),
  };
}

function compareValues(left: string | number, right: string | number): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, { sensitivity: 'base' });
}
