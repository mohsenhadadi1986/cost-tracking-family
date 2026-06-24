import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createDatabase } from '../db/database';
import { CategoryRepository } from '../repositories/category.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import { TransactionSummaryService } from '../services/transaction-summary.service';
import { MOCK_TRANSACTIONS } from '../data/mock-transactions';
import { Transaction } from '../models/transaction.model';

const dbPath = path.join(os.tmpdir(), `cost-tracking-verify-${Date.now()}.db`);

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function expectedCategoryTotals(transactions: Omit<Transaction, 'id'>[]): Record<string, number> {
  return transactions.reduce((acc, curr) => {
    if (curr.type === 'expense') {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    }
    return acc;
  }, {} as Record<string, number>);
}

function expectedDailyTotals(transactions: Omit<Transaction, 'id'>[]) {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

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

try {
  const db = createDatabase(dbPath);
  const categoryRepository = new CategoryRepository(db);
  const repository = new TransactionRepository(db, categoryRepository);
  const summaryService = new TransactionSummaryService(repository);

  const seeded = repository.findAll();
  assert.equal(seeded.length, MOCK_TRANSACTIONS.length, 'seed should load mock transactions');

  const summary = summaryService.getSummary();
  assert.deepEqual(summary.categoryTotals, expectedCategoryTotals(MOCK_TRANSACTIONS));
  assert.equal(summary.dailyTotals.length, 7, 'dailyTotals should cover the last 7 days');
  assert.deepEqual(summary.dailyTotals, expectedDailyTotals(MOCK_TRANSACTIONS));

  const created = repository.create({
    date: daysAgo(0),
    category: 'Food',
    type: 'expense',
    amount: 12.5,
    description: 'Verification transaction',
  });

  assert.equal(created.id, seeded.length + 1);
  assert.equal(created.description, 'Verification transaction');

  const all = repository.findAll();
  assert.equal(all.length, seeded.length + 1);
  assert.equal(all[0].id, created.id, 'newest transaction should appear first');

  assert.throws(
    () =>
      repository.create({
        date: daysAgo(0),
        category: 'Food',
        type: 'invalid' as 'expense',
        amount: 10,
        description: 'Bad type',
      }),
    /type must be either expense or income/
  );

  assert.throws(
    () =>
      repository.create({
        date: daysAgo(0),
        category: 'Food',
        type: 'expense',
        amount: 0,
        description: 'Bad amount',
      }),
    /amount must be a positive number/
  );

  db.close();
  console.log('Repository verification passed.');
} finally {
  for (const suffix of ['', '-wal', '-shm']) {
    const filePath = `${dbPath}${suffix}`;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
