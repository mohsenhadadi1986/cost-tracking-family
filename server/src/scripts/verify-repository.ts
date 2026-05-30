import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createDatabase } from '../db/database';
import { TransactionRepository } from '../repositories/transaction.repository';
import { MOCK_TRANSACTIONS } from '../data/mock-transactions';

const dbPath = path.join(os.tmpdir(), `cost-tracking-verify-${Date.now()}.db`);

try {
  const db = createDatabase(dbPath);
  const repository = new TransactionRepository(db);

  const seeded = repository.findAll();
  assert.equal(seeded.length, MOCK_TRANSACTIONS.length, 'seed should load mock transactions');

  const created = repository.create({
    date: '2026-05-30',
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
        date: '2026-05-30',
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
        date: '2026-05-30',
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
