import type Database from 'better-sqlite3';
import { Transaction } from '../models/transaction.model';
import { AccountRepository } from './account.repository';
import { CategoryRepository } from './category.repository';
import type { TransactionFilterCriteria } from '../validation/transaction-filter.validation';
import { creditCardSettlementDate } from '../utils/credit-card';
import {
  CreateTransactionInput,
  validateTransactionInput,
} from '../validation/transaction.validation';

type TransactionRow = {
  id: number;
  date: string;
  category: string;
  type: 'expense' | 'income';
  amount: number;
  description: string;
  account: string;
  settlement_date: string;
  settlement_account: string;
};

export class TransactionRepository {
  constructor(
    private readonly db: Database.Database,
    private readonly categoryRepository: CategoryRepository,
    private readonly accountRepository: AccountRepository
  ) {}

  create(input: CreateTransactionInput): Transaction {
    const normalized = {
      ...input,
      account: typeof input.account === 'string' ? input.account.trim() : input.account,
    };
    validateTransactionInput(normalized, this.categoryRepository, this.accountRepository);

    const settlement = resolveSettlement(normalized, this.accountRepository);

    const row = this.db
      .prepare(`
        INSERT INTO transactions (date, category, type, amount, description, account, settlement_date, settlement_account)
        VALUES (@date, @category, @type, @amount, @description, @account, @settlementDate, @settlementAccount)
        RETURNING id, date, category, type, amount, description, account, settlement_date, settlement_account
      `)
      .get({
        ...normalized,
        settlementDate: settlement.settlementDate,
        settlementAccount: settlement.settlementAccount,
      }) as TransactionRow;

    return mapTransaction(row);
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
        SELECT id, date, category, type, amount, description, account, settlement_date, settlement_account
        FROM transactions
        ${whereClause}
        ORDER BY date DESC, id DESC
      `)
      .all(params) as TransactionRow[];

    return rows.map(mapTransaction);
  }
}

function resolveSettlement(
  input: CreateTransactionInput,
  accountRepository: AccountRepository
): Pick<Transaction, 'settlementDate' | 'settlementAccount'> {
  const place = accountRepository.findByName(input.account.trim());
  if (input.type === 'expense' && place?.kind === 'credit') {
    return {
      settlementDate: creditCardSettlementDate(input.date, place.billingDay ?? undefined),
      settlementAccount: place.settlementAccount ?? input.account.trim(),
    };
  }

  return {
    settlementDate: input.date,
    settlementAccount: input.account.trim(),
  };
}

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    date: row.date,
    category: row.category,
    type: row.type,
    amount: row.amount,
    description: row.description,
    account: row.account,
    settlementDate: row.settlement_date ?? row.date,
    settlementAccount: row.settlement_account ?? row.account,
  };
}
