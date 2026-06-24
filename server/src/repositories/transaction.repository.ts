import type Database from 'better-sqlite3';
import { Transaction } from '../models/transaction.model';
import { CategoryRepository } from './category.repository';
import type { TransactionFilterCriteria } from '../validation/transaction-filter.validation';
import {
  CreateTransactionInput,
  validateTransactionInput,
} from '../validation/transaction.validation';

type TransactionRow = Transaction;

export class TransactionRepository {
  constructor(
    private readonly db: Database.Database,
    private readonly categoryRepository: CategoryRepository
  ) {}

  create(input: CreateTransactionInput): Transaction {
    validateTransactionInput(input, this.categoryRepository);

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
    return this.findFiltered({});
  }

  findFiltered(criteria: TransactionFilterCriteria): Transaction[] {
    const conditions: string[] = [];
    const params: Record<string, string> = {};

    if (criteria.startDate) {
      conditions.push('date >= @startDate');
      params.startDate = criteria.startDate;
    }

    if (criteria.endDate) {
      conditions.push('date <= @endDate');
      params.endDate = criteria.endDate;
    }

    if (criteria.categories && criteria.categories.length > 0) {
      const placeholders = criteria.categories.map((_, index) => `@category${index}`);
      conditions.push(`category IN (${placeholders.join(', ')})`);
      criteria.categories.forEach((category, index) => {
        params[`category${index}`] = category;
      });
    }

    if (criteria.type) {
      conditions.push('type = @type');
      params.type = criteria.type;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = this.db
      .prepare(`
        SELECT id, date, category, type, amount, description
        FROM transactions
        ${whereClause}
        ORDER BY date DESC, id DESC
      `)
      .all(params) as TransactionRow[];

    return rows;
  }
}
