import assert from 'node:assert/strict';
import fs from 'fs';
import { afterEach, describe, it } from 'node:test';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { createApp } from '../app';
import { DEFAULT_ACCOUNT, DEFAULT_CREDIT_CARD } from '../constants/accounts';
import { MOCK_TRANSACTIONS } from '../data/mock-transactions';
import { buildSummary } from '../services/period-totals';
import { creditCardSettlementDate } from '../utils/credit-card';
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

function expectedSummary(
  transactions = MOCK_TRANSACTIONS,
  startDate?: string,
  endDate?: string
) {
  return buildSummary(transactions, startDate, endDate);
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
        account: DEFAULT_ACCOUNT,
      };

      const response = await request(app).post('/api/transactions').send(payload);

      assert.equal(response.status, 201);
      assert.equal(response.body.description, payload.description);
      assert.equal(response.body.amount, payload.amount);
      assert.equal(typeof response.body.id, 'number');
    });

    it('settles credit-card expenses on the 10th of next month without a second bank expense', async () => {
      const { app } = createTestApp(false);
      const purchaseDate = daysAgo(0);
      const dueDate = creditCardSettlementDate(purchaseDate);

      const created = await request(app).post('/api/transactions').send({
        date: purchaseDate,
        category: 'Food',
        type: 'expense',
        amount: 40,
        description: 'Card groceries',
        account: DEFAULT_CREDIT_CARD,
      });

      assert.equal(created.status, 201);
      assert.equal(created.body.account, DEFAULT_CREDIT_CARD);
      assert.equal(created.body.settlementDate, dueDate);
      assert.equal(created.body.settlementAccount, DEFAULT_ACCOUNT);

      const summary = await request(app)
        .get('/api/transactions/summary')
        .query({ startDate: purchaseDate, endDate: purchaseDate });

      assert.equal(summary.status, 200);
      assert.equal(summary.body.totalExpense, 40);
      assert.equal(
        summary.body.accountBalances.find((row: { account: string }) => row.account === DEFAULT_ACCOUNT)?.amount,
        0
      );
      assert.equal(
        summary.body.accountBalances.find((row: { account: string }) => row.account === DEFAULT_CREDIT_CARD)?.amount,
        -40
      );
      assert.equal(summary.body.creditCardDues.length, 1);
      assert.equal(summary.body.creditCardDues[0].settlementDate, dueDate);
      assert.equal(summary.body.creditCardDues[0].amount, 40);
      assert.equal(summary.body.currentBalance, 0);
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

    it('returns 400 for missing place', async () => {
      const { app } = createTestApp(false);

      const response = await request(app)
        .post('/api/transactions')
        .send({
          date: '2026-05-30',
          category: 'Food',
          type: 'expense',
          amount: 10,
          description: 'Missing place',
        });

      assert.equal(response.status, 400);
      assert.match(response.body.error, /account is required/);
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

    it('filters by startDate and endDate', async () => {
      const { app } = createTestApp(true);
      const startDate = daysAgo(3);
      const endDate = daysAgo(1);
      const expected = filterMockTransactions({ startDate, endDate });

      const response = await request(app)
        .get('/api/transactions')
        .query({ startDate, endDate });

      assert.equal(response.status, 200);
      assert.equal(response.body.length, expected.length);
      assert.ok(
        response.body.every(
          (transaction: { date: string }) =>
            transaction.date >= startDate && transaction.date <= endDate
        )
      );
    });

    it('filters by comma-separated categories', async () => {
      const { app } = createTestApp(true);
      const categories = ['Food', 'Fuel'];
      const expected = filterMockTransactions({ categories });

      const response = await request(app)
        .get('/api/transactions')
        .query({ categories: 'Food,Fuel' });

      assert.equal(response.status, 200);
      assert.equal(response.body.length, expected.length);
      assert.ok(
        response.body.every((transaction: { category: string }) =>
          categories.includes(transaction.category)
        )
      );
    });

    it('filters by repeated categories and type', async () => {
      const { app } = createTestApp(true);
      const categories = ['Food', 'Fuel'];
      const expected = filterMockTransactions({ categories, type: 'expense' });

      const response = await request(app)
        .get('/api/transactions')
        .query({ categories: ['Food', 'Fuel'], type: 'expense' });

      assert.equal(response.status, 200);
      assert.equal(response.body.length, expected.length);
      assert.ok(
        response.body.every(
          (transaction: { category: string; type: string }) =>
            transaction.type === 'expense' &&
            categories.includes(transaction.category)
        )
      );
    });

    it('returns 400 for invalid startDate', async () => {
      const { app } = createTestApp(true);

      const response = await request(app)
        .get('/api/transactions')
        .query({ startDate: 'not-a-date' });

      assert.equal(response.status, 400);
      assert.match(response.body.error, /startDate must be a date in YYYY-MM-DD format/);
    });

    it('returns 400 when startDate is after endDate', async () => {
      const { app } = createTestApp(true);

      const response = await request(app)
        .get('/api/transactions')
        .query({ startDate: daysAgo(1), endDate: daysAgo(5) });

      assert.equal(response.status, 400);
      assert.match(response.body.error, /startDate must be on or before endDate/);
    });

    it('returns 400 for invalid category', async () => {
      const { app } = createTestApp(true);

      const response = await request(app)
        .get('/api/transactions')
        .query({ categories: 'Unknown' });

      assert.equal(response.status, 400);
      assert.match(response.body.error, /categories must be one or more of:/);
    });

    it('returns 400 for invalid type', async () => {
      const { app } = createTestApp(true);

      const response = await request(app)
        .get('/api/transactions')
        .query({ type: 'invalid' });

      assert.equal(response.status, 400);
      assert.match(response.body.error, /type must be either expense or income/);
    });
  });

  describe('GET /api/transactions/summary', () => {
    it('returns category, income, and period totals for seeded data', async () => {
      const { app } = createTestApp(true);
      const expected = expectedSummary();

      const response = await request(app).get('/api/transactions/summary');

      assert.equal(response.status, 200);
      assert.deepEqual(response.body.categoryTotals, expected.categoryTotals);
      assert.deepEqual(response.body.incomeByCategory, expected.incomeByCategory);
      assert.equal(response.body.totalIncome, expected.totalIncome);
      assert.equal(response.body.totalExpense, expected.totalExpense);
      assert.equal(response.body.netBalance, expected.netBalance);
      assert.deepEqual(response.body.dailyTotals, expected.dailyTotals);
    });

    it('returns aggregates computed from expense transactions only when type=expense', async () => {
      const { app } = createTestApp(true);
      const expenseTransactions = MOCK_TRANSACTIONS.filter(t => t.type === 'expense');
      const expected = expectedSummary(expenseTransactions);

      const response = await request(app)
        .get('/api/transactions/summary')
        .query({ type: 'expense' });

      assert.equal(response.status, 200);
      assert.deepEqual(response.body.categoryTotals, expected.categoryTotals);
      assert.deepEqual(response.body.incomeByCategory, expected.incomeByCategory);
      assert.deepEqual(response.body.dailyTotals, expected.dailyTotals);
    });

    it('returns filtered category and daily totals that differ from unfiltered baseline', async () => {
      const { app } = createTestApp(true);
      const startDate = daysAgo(2);
      const endDate = daysAgo(1);
      const criteria = { startDate, endDate, categories: ['Food'], type: 'expense' as const };
      const filteredTransactions = filterMockTransactions(criteria);
      const expected = expectedSummary(filteredTransactions, startDate, endDate);

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
      assert.deepEqual(filtered.body.categoryTotals, expected.categoryTotals);
      assert.deepEqual(filtered.body.dailyTotals, expected.dailyTotals);
      assert.notDeepEqual(filtered.body.categoryTotals, baseline.body.categoryTotals);
      assert.notDeepEqual(filtered.body.dailyTotals, baseline.body.dailyTotals);
    });

    it('uses monthly buckets when the requested range is longer than 62 days', async () => {
      const { app } = createTestApp(true);
      const startDate = daysAgo(80);
      const endDate = daysAgo(0);

      const response = await request(app)
        .get('/api/transactions/summary')
        .query({ startDate, endDate });

      assert.equal(response.status, 200);
      assert.ok(response.body.dailyTotals.length >= 2);
      assert.ok(
        response.body.dailyTotals.every((bucket: { date: string }) => bucket.date.endsWith('-01')),
        'long ranges should use first-of-month bucket dates'
      );
    });

    it('returns 400 for invalid filter parameters', async () => {
      const { app } = createTestApp(true);

      const response = await request(app)
        .get('/api/transactions/summary')
        .query({ type: 'invalid' });

      assert.equal(response.status, 400);
      assert.match(response.body.error, /type must be either expense or income/);
    });
  });
});
