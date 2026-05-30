import type Database from 'better-sqlite3';
import { Transaction } from '../models/transaction.model';
import {
  CreateTransactionInput,
  validateTransactionInput,
} from '../validation/transaction.validation';

type TransactionRow = Transaction;

export class TransactionRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: CreateTransactionInput): Transaction {
    validateTransactionInput(input);

    const row = this.db
      .prepare(`
        INSERT INTO transactions (date, category, type, amount, description)
        VALUES (@date, @category, @type, @amount, @description)
        RETURNING id, date, category, type, amount, description
      `)
      .get(input) as TransactionRow;

    return row;
  }

  findAll(): Transaction[] {
    const rows = this.db
      .prepare(`
        SELECT id, date, category, type, amount, description
        FROM transactions
        ORDER BY date DESC, id DESC
      `)
      .all() as TransactionRow[];

    return rows;
  }
}
