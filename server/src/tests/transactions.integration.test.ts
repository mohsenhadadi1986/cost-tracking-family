import assert from 'node:assert/strict';
import fs from 'fs';
import { afterEach, describe, it } from 'node:test';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { createApp } from '../app';
import { MOCK_TRANSACTIONS } from '../data/mock-transactions';
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

function expectedCategoryTotals(transactions = MOCK_TRANSACTIONS): Record<string, number> {
  return transactions.reduce((acc, curr) => {
    if (curr.type === 'expense') {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    }
    return acc;
  }, {} as Record<string, number>);
}

function expectedDailyTotals(
  transactions = MOCK_TRANSACTIONS
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

    it('filters by startDate and endDate', async () => {
      const { app } = createTestApp(true);
      const startDate = daysAgo(3);
      const endDate = daysAgo(1);

      const response = await request(app)
        .get('/api/transactions')
        .query({ startDate, endDate });

      assert.equal(response.status, 200);
      assert.ok(response.body.length > 0);
      assert.ok(
        response.body.every(
          (transaction: { date: string }) =>
            transaction.date >= startDate && transaction.date <= endDate
        )
      );
    });

    it('filters by comma-separated categories', async () => {
      const { app } = createTestApp(true);

      const response = await request(app)
        .get('/api/transactions')
        .query({ categories: 'Food,Transport' });

      assert.equal(response.status, 200);
      assert.ok(response.body.length > 0);
      assert.ok(
        response.body.every((transaction: { category: string }) =>
          ['Food', 'Transport'].includes(transaction.category)
        )
      );
    });

    it('filters by repeated categories and type', async () => {
      const { app } = createTestApp(true);

      const response = await request(app)
        .get('/api/transactions')
        .query({ categories: ['Food', 'Transport'], type: 'expense' });

      assert.equal(response.status, 200);
      assert.ok(response.body.length > 0);
      assert.ok(
        response.body.every(
          (transaction: { category: string; type: string }) =>
            transaction.type === 'expense' &&
            ['Food', 'Transport'].includes(transaction.category)
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
    it('returns category and daily totals for seeded data', async () => {
      const { app } = createTestApp(true);

      const response = await request(app).get('/api/transactions/summary');

      assert.equal(response.status, 200);
      assert.deepEqual(response.body.categoryTotals, expectedCategoryTotals());
      assert.deepEqual(response.body.dailyTotals, expectedDailyTotals());
    });

    it('returns aggregates computed from expense transactions only when type=expense', async () => {
      const { app } = createTestApp(true);
      const expenseTransactions = MOCK_TRANSACTIONS.filter(t => t.type === 'expense');

      const response = await request(app)
        .get('/api/transactions/summary')
        .query({ type: 'expense' });

      assert.equal(response.status, 200);
      assert.deepEqual(response.body.categoryTotals, expectedCategoryTotals(expenseTransactions));
      assert.deepEqual(response.body.dailyTotals, expectedDailyTotals(expenseTransactions));
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
