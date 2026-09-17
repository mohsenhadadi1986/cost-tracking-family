import assert from 'node:assert/strict';
import fs from 'fs';
import { afterEach, describe, it } from 'node:test';
import os from 'os';
import path from 'path';
import { createDatabase } from '../db/database';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNT,
  DEFAULT_CREDIT_CARD,
} from '../constants/accounts';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from '../constants/categories';
import type Database from 'better-sqlite3';

const openDatabases: Database.Database[] = [];
const dbPaths: string[] = [];

function tempDbPath(): string {
  return path.join(os.tmpdir(), `cost-tracking-seed-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function closeAndCleanup(): void {
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
}

afterEach(closeAndCleanup);

describe('default category seed', () => {
  it('inserts every default category on a fresh database', () => {
    const dbPath = tempDbPath();
    dbPaths.push(dbPath);
    const db = createDatabase(dbPath, { seed: false });
    openDatabases.push(db);

    const rows = db
      .prepare('SELECT name, type FROM categories ORDER BY type, name')
      .all() as Array<{ name: string; type: string }>;

    assert.equal(
      rows.length,
      DEFAULT_EXPENSE_CATEGORIES.length + DEFAULT_INCOME_CATEGORIES.length
    );
    assert.ok(rows.some(row => row.name === 'Condominio charge' && row.type === 'expense'));
    assert.ok(rows.some(row => row.name === 'Salary' && row.type === 'income'));
  });

  it('adds missing defaults on later startups without removing custom categories', () => {
    const dbPath = tempDbPath();
    dbPaths.push(dbPath);

    const first = createDatabase(dbPath, { seed: false });
    first
      .prepare(`INSERT INTO categories (name, type) VALUES ('Healthcare', 'expense')`)
      .run();
    first.prepare(`DELETE FROM categories WHERE name = 'Mortgage' AND type = 'expense'`).run();
    first.close();

    const second = createDatabase(dbPath, { seed: false });
    openDatabases.push(second);

    const rows = second
      .prepare('SELECT name, type FROM categories')
      .all() as Array<{ name: string; type: string }>;

    assert.ok(rows.some(row => row.name === 'Healthcare' && row.type === 'expense'));
    assert.ok(rows.some(row => row.name === 'Mortgage' && row.type === 'expense'));
    assert.equal(
      rows.filter(row => row.name === 'Food' && row.type === 'expense').length,
      1
    );
  });
});

describe('default account seed', () => {
  it('inserts default banks, wallets, and the ING credit account', () => {
    const dbPath = tempDbPath();
    dbPaths.push(dbPath);
    const db = createDatabase(dbPath, { seed: false });
    openDatabases.push(db);

    const rows = db
      .prepare('SELECT name FROM accounts ORDER BY name')
      .all() as Array<{ name: string }>;

    assert.deepEqual(rows.map(row => row.name), [...DEFAULT_ACCOUNTS].sort());

    const creditCard = db
      .prepare(`SELECT kind, billing_day, settlement_account FROM accounts WHERE name = @name`)
      .get({ name: DEFAULT_CREDIT_CARD }) as { kind: string; billing_day: number; settlement_account: string };

    assert.equal(creditCard.kind, 'credit');
    assert.equal(creditCard.billing_day, 10);
    assert.equal(creditCard.settlement_account, DEFAULT_ACCOUNT);
  });

  it('moves Bank 1, 2, and 3 onto the new default places and deletes them', () => {
    const dbPath = tempDbPath();
    dbPaths.push(dbPath);

    const first = createDatabase(dbPath, { seed: false });
    first.prepare(`INSERT INTO accounts (name) VALUES ('Bank 1'), ('Bank 2'), ('Bank 3')`).run();
    first.prepare(`
      INSERT INTO transactions (date, category, type, amount, description, account, settlement_date, settlement_account)
      VALUES ('2026-09-01', 'Food', 'expense', 12, 'Legacy bank', 'Bank 1', '2026-09-01', 'Bank 1')
    `).run();
    first.close();

    const second = createDatabase(dbPath, { seed: false });
    openDatabases.push(second);

    const names = second
      .prepare('SELECT name FROM accounts ORDER BY name')
      .all() as Array<{ name: string }>;

    assert.ok(!names.some(row => row.name === 'Bank 1'));
    assert.ok(!names.some(row => row.name === 'Bank 2'));
    assert.ok(!names.some(row => row.name === 'Bank 3'));

    const moved = second
      .prepare(`SELECT account, settlement_account FROM transactions WHERE description = 'Legacy bank'`)
      .get() as { account: string; settlement_account: string };

    assert.equal(moved.account, DEFAULT_ACCOUNT);
    assert.equal(moved.settlement_account, DEFAULT_ACCOUNT);
  });
});

describe('plans table', () => {
  it('creates an empty plans table and does not seed mock plans', () => {
    const dbPath = tempDbPath();
    dbPaths.push(dbPath);
    const db = createDatabase(dbPath, { seed: true });
    openDatabases.push(db);

    const { count } = db.prepare('SELECT COUNT(*) AS count FROM plans').get() as { count: number };
    assert.equal(count, 0);
  });

  it('widens billing_day from 1-28 to 1-31 and keeps existing plans', () => {
    const dbPath = tempDbPath();
    dbPaths.push(dbPath);

    const first = createDatabase(dbPath, { seed: false });
    first.exec(`
      CREATE TABLE plans_old (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        amount REAL NOT NULL CHECK (amount > 0),
        account TEXT NOT NULL,
        billing_day INTEGER NOT NULL CHECK (billing_day BETWEEN 1 AND 28),
        start_date TEXT NOT NULL,
        end_date TEXT,
        payment_count INTEGER
      )
    `);
    first.exec(`DROP TABLE plans`);
    first.exec(`ALTER TABLE plans_old RENAME TO plans`);
    first.prepare(`
      INSERT INTO plans (name, amount, account, billing_day, start_date, end_date, payment_count)
      VALUES ('Mutuo', 550, @account, 1, '2026-10-01', NULL, 98)
    `).run({ account: DEFAULT_ACCOUNT });
    first.close();

    const second = createDatabase(dbPath, { seed: false });
    openDatabases.push(second);

    const schema = second.prepare(`
      SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'plans'
    `).get() as { sql: string };

    assert.match(schema.sql, /BETWEEN 1 AND 31/i);
    assert.doesNotMatch(schema.sql, /BETWEEN 1 AND 28/i);

    const existing = second.prepare(`SELECT name, billing_day FROM plans`).get() as {
      name: string;
      billing_day: number;
    };
    assert.equal(existing.name, 'Mutuo');
    assert.equal(existing.billing_day, 1);

    second.prepare(`
      INSERT INTO plans (name, amount, account, billing_day, start_date, end_date, payment_count)
      VALUES ('Gas bill', 84, @account, 30, '2026-09-30', '2026-09-30', NULL)
    `).run({ account: DEFAULT_ACCOUNT });

    const gas = second.prepare(`SELECT billing_day FROM plans WHERE name = 'Gas bill'`).get() as {
      billing_day: number;
    };
    assert.equal(gas.billing_day, 30);
  });
});
