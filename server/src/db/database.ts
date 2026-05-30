import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { MOCK_TRANSACTIONS } from '../data/mock-transactions';

const defaultDbPath = path.join(process.cwd(), 'data', 'transactions.db');

export function createDatabase(dbPath = process.env.DATABASE_PATH ?? defaultDbPath): Database.Database {
  const directory = path.dirname(dbPath);
  fs.mkdirSync(directory, { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

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

  seedIfEmpty(db);

  return db;
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
