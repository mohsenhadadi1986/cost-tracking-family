import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Transaction } from '../models/transaction.model';
import { TransactionFilter } from '../models/transaction-filter.model';
import { matchesFilter } from './matches-filter';

const sampleTransaction: Transaction = {
  id: 1,
  date: '2024-06-15',
  category: 'Food',
  type: 'expense',
  amount: 42,
  description: 'Groceries',
};

const emptyFilter: TransactionFilter = {
  startDate: '',
  endDate: '',
  categories: [],
  type: 'all',
};

describe('matchesFilter', () => {
  it('matches every transaction when all filter fields are open', () => {
    assert.equal(matchesFilter(sampleTransaction, emptyFilter), true);
    assert.equal(
      matchesFilter({ ...sampleTransaction, type: 'income', category: 'Salary' }, emptyFilter),
      true,
    );
  });

  it('applies inclusive start and end date bounds when set', () => {
    assert.equal(
      matchesFilter(sampleTransaction, { ...emptyFilter, startDate: '2024-06-15', endDate: '2024-06-15' }),
      true,
    );
    assert.equal(
      matchesFilter(sampleTransaction, { ...emptyFilter, startDate: '2024-06-16' }),
      false,
    );
    assert.equal(
      matchesFilter(sampleTransaction, { ...emptyFilter, endDate: '2024-06-14' }),
      false,
    );
  });

  it('supports partial date ranges with only one bound set', () => {
    assert.equal(
      matchesFilter(sampleTransaction, { ...emptyFilter, startDate: '2024-06-01' }),
      true,
    );
    assert.equal(
      matchesFilter(sampleTransaction, { ...emptyFilter, endDate: '2024-06-30' }),
      true,
    );
    assert.equal(
      matchesFilter(sampleTransaction, { ...emptyFilter, startDate: '2024-06-01', endDate: '2024-06-10' }),
      false,
    );
  });

  it('filters by category membership when categories are selected', () => {
    assert.equal(
      matchesFilter(sampleTransaction, { ...emptyFilter, categories: ['Food', 'Transport'] }),
      true,
    );
    assert.equal(
      matchesFilter(sampleTransaction, { ...emptyFilter, categories: ['Transport'] }),
      false,
    );
  });

  it('filters by type when not set to all', () => {
    assert.equal(
      matchesFilter(sampleTransaction, { ...emptyFilter, type: 'expense' }),
      true,
    );
    assert.equal(
      matchesFilter(sampleTransaction, { ...emptyFilter, type: 'income' }),
      false,
    );
    assert.equal(
      matchesFilter({ ...sampleTransaction, type: 'income' }, { ...emptyFilter, type: 'all' }),
      true,
    );
  });
});
