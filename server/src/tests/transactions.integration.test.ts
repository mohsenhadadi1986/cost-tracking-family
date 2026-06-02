import assert from 'node:assert/strict';
import fs from 'fs';
import { afterEach, describe, it } from 'node:test';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { createApp } from '../app';
import { MOCK_TRANSACTIONS } from '../data/mock-transactions';
import type { TransactionFilterCriteria } from '../validation/transaction-filter.validation';
import type Database from 'better-sqlite3';

const openDatabases: Database.Database[] = [];
const dbPaths: string[] = [];

function tempDbPath(): string {
  return path.join(os.tmpdir(), `cost-tracking-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function createTestApp(seed = false) {
  const dbPath = tempDbPath();
  dbPaths.push(dbPath);
  const context = createApp(dbPath, { seed });
  openDatabases.push(context.db);
  return context;
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function filterMockTransactions(criteria: TransactionFilterCriteria) {
  return MOCK_TRANSACTIONS.filter(transaction => {
    if (criteria.startDate && transaction.date < criteria.startDate) {
      return false;
    }

    if (criteria.endDate && transaction.date > criteria.endDate) {
      return false;
    }

    if (criteria.categories && !criteria.categories.includes(transaction.category)) {
      return false;
    }

    if (criteria.type && transaction.type !== criteria.type) {
      return false;
    }

    return true;
  });
}

function expectedCategoryTotals(
  transactions: typeof MOCK_TRANSACTIONS = MOCK_TRANSACTIONS
): Record<string, number> {
  return transactions.reduce((acc, curr) => {
    if (curr.type === 'expense') {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    }
    return acc;
  }, {} as Record<string, number>);
}

function expectedDailyTotals(
  transactions: typeof MOCK_TRANSACTIONS = MOCK_TRANSACTIONS
): Array<{ date: string; income: number; expense: number }> {
  const last7Days = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i));

  return last7Days.map(date => {
    const dayTransactions = transactions.filter(t => t.date === date);
    return {
      date,
      income: dayTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
      expense: dayTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
    };
  });
}

afterEach(() => {
  while (openDatabases.length > 0) {
    openDatabases.pop()?.close();
  }

  while (dbPaths.length > 0) {
    const dbPath = dbPaths.pop();
    if (!dbPath) {
      continue;
    }

    for (const suffix of ['', '-wal', '-shm']) {
      const filePath = `${dbPath}${suffix}`;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
});

describe('Transaction API integration', () => {
  describe('POST /api/transactions', () => {
    it('creates a transaction and returns 201', async () => {
      const { app } = createTestApp(false);

      const payload = {
        date: '2026-05-30',
        category: 'Food',
        type: 'expense',
        amount: 12.5,
        description: 'Integration test transaction',
      };

      const response = await request(app).post('/api/transactions').send(payload);

      assert.equal(response.status, 201);
      assert.equal(response.body.description, payload.description);
      assert.equal(response.body.amount, payload.amount);
      assert.equal(typeof response.body.id, 'number');
    });

    it('returns 400 for invalid type', async () => {
      const { app } = createTestApp(false);

      const response = await request(app)
        .post('/api/transactions')
        .send({
          date: '2026-05-30',
          category: 'Food',
          type: 'invalid',
          amount: 10,
          description: 'Bad type',
        });

      assert.equal(response.status, 400);
      assert.match(response.body.error, /type must be either expense or income/);
    });

    it('returns 400 for non-positive amount', async () => {
      const { app } = createTestApp(false);

      const response = await request(app)
        .post('/api/transactions')
        .send({
          date: '2026-05-30',
          category: 'Food',
          type: 'expense',
          amount: 0,
          description: 'Bad amount',
        });

      assert.equal(response.status, 400);
      assert.match(response.body.error, /amount must be a positive number/);
    });

    it('returns 400 for invalid category', async () => {
      const { app } = createTestApp(false);

      const response = await request(app)
        .post('/api/transactions')
        .send({
          date: '2026-05-30',
          category: 'Unknown',
          type: 'expense',
          amount: 10,
          description: 'Bad category',
        });

      assert.equal(response.status, 400);
      assert.match(response.body.error, /category must be one of:/);
    });
  });

  describe('GET /api/transactions', () => {
    it('returns an empty array for an empty database', async () => {
      const { app } = createTestApp(false);

      const response = await request(app).get('/api/transactions');

      assert.equal(response.status, 200);
      assert.deepEqual(response.body, []);
    });

    it('returns seeded transactions ordered by date desc', async () => {
      const { app } = createTestApp(true);

      const response = await request(app).get('/api/transactions');

      assert.equal(response.status, 200);
      assert.equal(response.body.length, MOCK_TRANSACTIONS.length);

      for (let i = 1; i < response.body.length; i++) {
        const prev = response.body[i - 1];
        const curr = response.body[i];
        assert.ok(
          prev.date >= curr.date,
          'transactions should be ordered by date descending'
        );
      }
    });

    it('filters by date range', async () => {
      const { app } = createTestApp(true);
      const startDate = daysAgo(2);
      const endDate = daysAgo(1);
      const expected = filterMockTransactions({ startDate, endDate });

      const response = await request(app)
        .get('/api/transactions')
        .query({ startDate, endDate });

      assert.equal(response.status, 200);
      assert.equal(response.body.length, expected.length);
      assert.ok(response.body.every((transaction: { date: string }) =>
        transaction.date >= startDate && transaction.date <= endDate
      ));
    });

    it('filters by category', async () => {
      const { app } = createTestApp(true);
      const categories = ['Food', 'Transport'];
      const expected = filterMockTransactions({ categories });

      const response = await request(app)
        .get('/api/transactions')
        .query({ categories: categories.join(',') });

      assert.equal(response.status, 200);
      assert.equal(response.body.length, expected.length);
      assert.ok(response.body.every((transaction: { category: string }) =>
        categories.includes(transaction.category)
      ));
    });

    it('filters by type', async () => {
      const { app } = createTestApp(true);
      const expected = filterMockTransactions({ type: 'expense' });

      const response = await request(app)
        .get('/api/transactions')
        .query({ type: 'expense' });

      assert.equal(response.status, 200);
      assert.equal(response.body.length, expected.length);
      assert.ok(response.body.every((transaction: { type: string }) => transaction.type === 'expense'));
    });

    it('returns 400 for invalid filter type', async () => {
      const { app } = createTestApp(true);

      const response = await request(app)
        .get('/api/transactions')
        .query({ type: 'invalid' });

      assert.equal(response.status, 400);
      assert.match(response.body.error, /type must be either expense or income/);
    });
  });

  describe('GET /api/transactions/summary', () => {
    it('returns category and daily totals for seeded data', async () => {
      const { app } = createTestApp(true);

      const response = await request(app).get('/api/transactions/summary');

      assert.equal(response.status, 200);
      assert.deepEqual(response.body.categoryTotals, expectedCategoryTotals());
      assert.deepEqual(response.body.dailyTotals, expectedDailyTotals());
    });

    it('returns filtered category and daily totals that differ from unfiltered baseline', async () => {
      const { app } = createTestApp(true);
      const startDate = daysAgo(2);
      const endDate = daysAgo(1);
      const criteria = { startDate, endDate, categories: ['Food'], type: 'expense' as const };
      const filteredTransactions = filterMockTransactions(criteria);

      const baseline = await request(app).get('/api/transactions/summary');
      const filtered = await request(app)
        .get('/api/transactions/summary')
        .query({
          startDate,
          endDate,
          categories: 'Food',
          type: 'expense',
        });

      assert.equal(filtered.status, 200);
      assert.deepEqual(filtered.body.categoryTotals, expectedCategoryTotals(filteredTransactions));
      assert.deepEqual(filtered.body.dailyTotals, expectedDailyTotals(filteredTransactions));
      assert.notDeepEqual(filtered.body.categoryTotals, baseline.body.categoryTotals);
      assert.notDeepEqual(filtered.body.dailyTotals, baseline.body.dailyTotals);
    });

    it('returns 400 for invalid filter startDate', async () => {
      const { app } = createTestApp(true);

      const response = await request(app)
        .get('/api/transactions/summary')
        .query({ startDate: 'not-a-date' });

      assert.equal(response.status, 400);
      assert.match(response.body.error, /startDate must be a date in YYYY-MM-DD format/);
    });
  });
});
