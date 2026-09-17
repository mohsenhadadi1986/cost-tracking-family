import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Transaction } from '../models/transaction.model';
import {
  buildTableView,
  paginateTransactions,
  searchTransactions,
  sortTransactions,
} from './table-view';

const rows: Transaction[] = [
  { id: 1, date: '2026-09-01', category: 'Food', type: 'expense', amount: 10, description: 'Groceries', account: 'Satispay', settlementDate: '2026-09-01', settlementAccount: 'Satispay' },
  { id: 2, date: '2026-09-03', category: 'Fuel', type: 'expense', amount: 40, description: 'Shell station', account: 'Bank 2', settlementDate: '2026-09-03', settlementAccount: 'Bank 2' },
  { id: 3, date: '2026-09-02', category: 'Salary', type: 'income', amount: 1000, description: 'September pay', account: 'Bank 1', settlementDate: '2026-09-02', settlementAccount: 'Bank 1' },
  { id: 4, date: '2026-09-04', category: 'Food', type: 'expense', amount: 8, description: 'Coffee', account: 'Satispay', settlementDate: '2026-09-04', settlementAccount: 'Satispay' },
];

describe('table-view', () => {
  it('searches description and category', () => {
    assert.equal(searchTransactions(rows, 'food').length, 2);
    assert.equal(searchTransactions(rows, 'shell').length, 1);
    assert.equal(searchTransactions(rows, 'satispay').length, 2);
    assert.equal(searchTransactions(rows, '  ').length, 4);
  });

  it('sorts by amount and date', () => {
    const byAmount = sortTransactions(rows, 'amount', 'desc');
    assert.equal(byAmount[0].amount, 1000);
    assert.equal(byAmount[byAmount.length - 1].amount, 8);

    const byDate = sortTransactions(rows, 'date', 'desc');
    assert.equal(byDate[0].date, '2026-09-04');
  });

  it('paginates and keeps a safe page number', () => {
    const page1 = paginateTransactions(rows, 1, 2);
    assert.equal(page1.pageRows.length, 2);
    assert.equal(page1.totalPages, 2);

    const overflow = paginateTransactions(rows, 99, 2);
    assert.equal(overflow.page, 2);
  });

  it('builds a filtered sorted page with range labels', () => {
    const view = buildTableView(rows, {
      search: 'food',
      sortKey: 'amount',
      sortDirection: 'asc',
      page: 1,
      pageSize: 10,
    });

    assert.equal(view.filteredCount, 2);
    assert.equal(view.pageRows[0].description, 'Coffee');
    assert.equal(view.rangeStart, 1);
    assert.equal(view.rangeEnd, 2);
  });
});
