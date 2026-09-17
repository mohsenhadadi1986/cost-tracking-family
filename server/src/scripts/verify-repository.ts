import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createDatabase } from '../db/database';
import { AccountRepository } from '../repositories/account.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { PlanRepository } from '../repositories/plan.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import { TransactionSummaryService } from '../services/transaction-summary.service';
import { MOCK_TRANSACTIONS } from '../data/mock-transactions';
import { buildSummary } from '../services/period-totals';

const dbPath = path.join(os.tmpdir(), `cost-tracking-verify-${Date.now()}.db`);

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

try {
  const db = createDatabase(dbPath);
  const categoryRepository = new CategoryRepository(db);
  const accountRepository = new AccountRepository(db);
  const planRepository = new PlanRepository(db);
  const repository = new TransactionRepository(db, categoryRepository, accountRepository);
  const summaryService = new TransactionSummaryService(repository, accountRepository, planRepository);

  const seeded = repository.findAll();
  assert.equal(seeded.length, MOCK_TRANSACTIONS.length, 'seed should load mock transactions');

  const summary = summaryService.getSummary();
  const expected = buildSummary(MOCK_TRANSACTIONS);
  assert.deepEqual(summary.categoryTotals, expected.categoryTotals);
  assert.deepEqual(summary.incomeByCategory, expected.incomeByCategory);
  assert.equal(summary.netBalance, expected.netBalance);
  assert.deepEqual(summary.dailyTotals, expected.dailyTotals);

  const created = repository.create({
    date: daysAgo(0),
    category: 'Food',
    type: 'expense',
    amount: 12.5,
    description: 'Verification transaction',
    account: 'ING Current Account',
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
        account: 'ING Current Account',
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
        account: 'ING Current Account',
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
