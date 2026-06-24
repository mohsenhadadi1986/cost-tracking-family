import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from '../constants/categories';
import { MOCK_TRANSACTIONS } from '../data/mock-transactions';

const defaultDbPath = path.join(process.cwd(), 'data', 'transactions.db');

export function createDatabase(
  dbPath = process.env.DATABASE_PATH ?? defaultDbPath,
  options: { seed?: boolean } = {}
): Database.Database {
  const directory = path.dirname(dbPath);
  fs.mkdirSync(directory, { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
      UNIQUE (name, type)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
      amount REAL NOT NULL CHECK (amount > 0),
      description TEXT NOT NULL
    )
  `);

  seedCategoriesIfEmpty(db);

  if (options.seed !== false) {
    seedIfEmpty(db);
  }

  return db;
}

function seedCategoriesIfEmpty(db: Database.Database): void {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM categories').get() as { count: number };

  if (count > 0) {
    return;
  }

  const insert = db.prepare(`
    INSERT INTO categories (name, type)
    VALUES (@name, @type)
  `);

  const defaults = [
    ...DEFAULT_EXPENSE_CATEGORIES.map(name => ({ name, type: 'expense' as const })),
    ...DEFAULT_INCOME_CATEGORIES.map(name => ({ name, type: 'income' as const })),
  ];

  const insertMany = db.transaction((categories: typeof defaults) => {
    for (const category of categories) {
      insert.run(category);
    }
  });

  insertMany(defaults);
}

function seedIfEmpty(db: Database.Database): void {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM transactions').get() as { count: number };

  if (count > 0) {
    return;
  }

  const insert = db.prepare(`
    INSERT INTO transactions (date, category, type, amount, description)
    VALUES (@date, @category, @type, @amount, @description)
  `);

  const insertMany = db.transaction((transactions: typeof MOCK_TRANSACTIONS) => {
    for (const transaction of transactions) {
      insert.run(transaction);
    }
  });

  insertMany(MOCK_TRANSACTIONS);
}
