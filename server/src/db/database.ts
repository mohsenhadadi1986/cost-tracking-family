import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { DEFAULT_ACCOUNTS, DEFAULT_ACCOUNT, DEFAULT_CREDIT_CARD, DEFAULT_CREDIT_BILLING_DAY } from '../constants/accounts';
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
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
      amount REAL NOT NULL CHECK (amount > 0),
      description TEXT NOT NULL,
      account TEXT NOT NULL DEFAULT '${DEFAULT_ACCOUNT}',
      settlement_date TEXT,
      settlement_account TEXT,
      to_account TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      amount REAL NOT NULL CHECK (amount > 0),
      account TEXT NOT NULL,
      billing_day INTEGER NOT NULL CHECK (billing_day BETWEEN 1 AND 31),
      start_date TEXT NOT NULL,
      end_date TEXT,
      payment_count INTEGER
    )
  `);

  ensurePlanBillingDayRange(db);
  ensureAccountColumn(db);
  ensureAccountKindColumns(db);
  ensureSettlementColumns(db);
  ensureTransferSupport(db);
  ensureTaxTables(db);
  seedMissingDefaultCategories(db);
  seedMissingDefaultAccounts(db);
  seedCreditCardAccount(db);
  retireLegacyBankPlaces(db);

  if (options.seed !== false) {
    seedIfEmpty(db);
  }

  return db;
}

function seedMissingDefaultCategories(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO categories (name, type)
    VALUES (@name, @type)
  `);

  const defaults = [
    ...DEFAULT_EXPENSE_CATEGORIES.map(name => ({ name, type: 'expense' as const })),
    ...DEFAULT_INCOME_CATEGORIES.map(name => ({ name, type: 'income' as const })),
  ];

  const insertMissing = db.transaction((categories: typeof defaults) => {
    for (const category of categories) {
      insert.run(category);
    }
  });

  insertMissing(defaults);
}

function seedIfEmpty(db: Database.Database): void {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM transactions').get() as { count: number };

  if (count > 0) {
    return;
  }

  const insert = db.prepare(`
    INSERT INTO transactions (date, category, type, amount, description, account, settlement_date, settlement_account)
    VALUES (@date, @category, @type, @amount, @description, @account, @settlementDate, @settlementAccount)
  `);

  const insertMany = db.transaction((transactions: typeof MOCK_TRANSACTIONS) => {
    for (const transaction of transactions) {
      insert.run({
        ...transaction,
        settlementDate: transaction.settlementDate ?? transaction.date,
        settlementAccount: transaction.settlementAccount ?? transaction.account,
      });
    }
  });

  insertMany(MOCK_TRANSACTIONS);
}

function ensureAccountColumn(db: Database.Database): void {
  const columns = db.prepare(`PRAGMA table_info(transactions)`).all() as Array<{ name: string }>;
  if (columns.some(column => column.name === 'account')) {
    return;
  }

  db.exec(`ALTER TABLE transactions ADD COLUMN account TEXT NOT NULL DEFAULT '${DEFAULT_ACCOUNT}'`);
}

function seedMissingDefaultAccounts(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO accounts (name)
    VALUES (@name)
  `);

  const insertMissing = db.transaction((names: readonly string[]) => {
    for (const name of names) {
      insert.run({ name });
    }
  });

  insertMissing(DEFAULT_ACCOUNTS);
}

function ensureAccountKindColumns(db: Database.Database): void {
  const columns = tableColumns(db, 'accounts');

  if (!columns.has('kind')) {
    db.exec(`ALTER TABLE accounts ADD COLUMN kind TEXT NOT NULL DEFAULT 'wallet'`);
  }

  if (!columns.has('billing_day')) {
    db.exec(`ALTER TABLE accounts ADD COLUMN billing_day INTEGER`);
  }

  if (!columns.has('settlement_account')) {
    db.exec(`ALTER TABLE accounts ADD COLUMN settlement_account TEXT`);
  }
}

function ensureTransferSupport(db: Database.Database): void {
  const table = db.prepare(`
    SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'transactions'
  `).get() as { sql: string } | undefined;
  const columns = tableColumns(db, 'transactions');
  const allowsTransfer = Boolean(table?.sql && /'transfer'/i.test(table.sql));

  if (allowsTransfer && columns.has('to_account')) {
    return;
  }

  const migrate = db.transaction(() => {
    db.exec(`
      CREATE TABLE transactions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
        amount REAL NOT NULL CHECK (amount > 0),
        description TEXT NOT NULL,
        account TEXT NOT NULL DEFAULT '${DEFAULT_ACCOUNT}',
        settlement_date TEXT,
        settlement_account TEXT,
        to_account TEXT
      )
    `);
    db.exec(`
      INSERT INTO transactions_new (
        id, date, category, type, amount, description, account, settlement_date, settlement_account, to_account
      )
      SELECT
        id,
        date,
        category,
        type,
        amount,
        description,
        COALESCE(account, '${DEFAULT_ACCOUNT}'),
        settlement_date,
        settlement_account,
        NULL
      FROM transactions
    `);
    db.exec(`DROP TABLE transactions`);
    db.exec(`ALTER TABLE transactions_new RENAME TO transactions`);
    db.exec(`DELETE FROM sqlite_sequence WHERE name IN ('transactions', 'transactions_new')`);
    db.exec(`
      INSERT INTO sqlite_sequence (name, seq)
      SELECT 'transactions', IFNULL(MAX(id), 0) FROM transactions
    `);
  });

  migrate();
}

function ensureSettlementColumns(db: Database.Database): void {
  const columns = tableColumns(db, 'transactions');

  if (!columns.has('settlement_date')) {
    db.exec(`ALTER TABLE transactions ADD COLUMN settlement_date TEXT`);
    db.exec(`UPDATE transactions SET settlement_date = date WHERE settlement_date IS NULL`);
  }

  if (!columns.has('settlement_account')) {
    db.exec(`ALTER TABLE transactions ADD COLUMN settlement_account TEXT`);
    db.exec(`UPDATE transactions SET settlement_account = account WHERE settlement_account IS NULL`);
  }
}

function ensurePlanBillingDayRange(db: Database.Database): void {
  const table = db.prepare(`
    SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'plans'
  `).get() as { sql: string } | undefined;

  if (!table?.sql || !/BETWEEN 1 AND 28/i.test(table.sql)) {
    return;
  }

  const migrate = db.transaction(() => {
    db.exec(`
      CREATE TABLE plans_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        amount REAL NOT NULL CHECK (amount > 0),
        account TEXT NOT NULL,
        billing_day INTEGER NOT NULL CHECK (billing_day BETWEEN 1 AND 31),
        start_date TEXT NOT NULL,
        end_date TEXT,
        payment_count INTEGER
      )
    `);
    db.exec(`
      INSERT INTO plans_new (id, name, amount, account, billing_day, start_date, end_date, payment_count)
      SELECT id, name, amount, account, billing_day, start_date, end_date, payment_count
      FROM plans
    `);
    db.exec(`DROP TABLE plans`);
    db.exec(`ALTER TABLE plans_new RENAME TO plans`);
    db.exec(`DELETE FROM sqlite_sequence WHERE name IN ('plans', 'plans_new')`);
    db.exec(`
      INSERT INTO sqlite_sequence (name, seq)
      SELECT 'plans', IFNULL(MAX(id), 0) FROM plans
    `);
  });

  migrate();
}

function ensureTaxTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tax_filings (
      dichiarazione_year INTEGER PRIMARY KEY,
      income_year INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('awaiting_cu', 'cu_parsed', 'matched')),
      cu_parsed_json TEXT,
      overrides_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tax_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dichiarazione_year INTEGER NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('cu')),
      original_filename TEXT NOT NULL,
      mime TEXT NOT NULL,
      bytes BLOB NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (dichiarazione_year) REFERENCES tax_filings(dichiarazione_year)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tax_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dichiarazione_year INTEGER NOT NULL,
      transaction_id INTEGER,
      rule_id TEXT NOT NULL,
      rigo TEXT NOT NULL,
      codice INTEGER,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      gross_amount REAL NOT NULL,
      eligible_amount REAL NOT NULL,
      skip_reason TEXT,
      review_flag TEXT,
      FOREIGN KEY (dichiarazione_year) REFERENCES tax_filings(dichiarazione_year)
    )
  `);
}

function tableColumns(db: Database.Database, table: string): Set<string> {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return new Set(columns.map(column => column.name));
}

function seedCreditCardAccount(db: Database.Database): void {
  db.prepare(`
    INSERT OR IGNORE INTO accounts (name, kind, billing_day, settlement_account)
    VALUES (@name, 'credit', @billingDay, @settlementAccount)
  `).run({
    name: DEFAULT_CREDIT_CARD,
    billingDay: DEFAULT_CREDIT_BILLING_DAY,
    settlementAccount: DEFAULT_ACCOUNT,
  });

  db.prepare(`
    UPDATE accounts
    SET kind = 'credit',
        billing_day = COALESCE(billing_day, @billingDay),
        settlement_account = COALESCE(settlement_account, @settlementAccount)
    WHERE name = @name AND kind = 'wallet'
  `).run({
    name: DEFAULT_CREDIT_CARD,
    billingDay: DEFAULT_CREDIT_BILLING_DAY,
    settlementAccount: DEFAULT_ACCOUNT,
  });
}

function retireLegacyBankPlaces(db: Database.Database): void {
  const replacements: Array<{ from: string; to: string }> = [
    { from: 'Bank 1', to: DEFAULT_ACCOUNT },
    { from: 'Bank 2', to: 'ING Orange Account' },
    { from: 'Bank 3', to: 'Post Bank' },
  ];

  const retire = db.transaction(() => {
    for (const { from, to } of replacements) {
      const exists = db.prepare(`SELECT 1 FROM accounts WHERE name = @from`).get({ from });
      if (!exists) {
        continue;
      }

      db.prepare(`UPDATE transactions SET account = @to WHERE account = @from`).run({ from, to });
      db.prepare(`
        UPDATE transactions
        SET settlement_account = @to
        WHERE settlement_account = @from
      `).run({ from, to });
      db.prepare(`
        UPDATE accounts
        SET settlement_account = @to
        WHERE settlement_account = @from
      `).run({ from, to });
      db.prepare(`DELETE FROM accounts WHERE name = @from`).run({ from });
    }
  });

  retire();
}
