import type Database from 'better-sqlite3';
import { Account, AccountKind } from '../models/account.model';
import { AccountWriteInput } from '../validation/account.validation';

type AccountRow = {
  id: number;
  name: string;
  kind: AccountKind;
  billing_day: number | null;
  settlement_account: string | null;
};

export class AccountRepository {
  constructor(private readonly db: Database.Database) {}

  findAll(): Account[] {
    const rows = this.db
      .prepare(`
        SELECT id, name, kind, billing_day, settlement_account
        FROM accounts
        ORDER BY name ASC, id ASC
      `)
      .all() as AccountRow[];

    return rows.map(mapAccount);
  }

  findAllNames(): string[] {
    return this.findAll().map(account => account.name);
  }

  findById(id: number): Account | undefined {
    const row = this.db
      .prepare(`
        SELECT id, name, kind, billing_day, settlement_account
        FROM accounts
        WHERE id = @id
      `)
      .get({ id }) as AccountRow | undefined;

    return row ? mapAccount(row) : undefined;
  }

  findByName(name: string): Account | undefined {
    const row = this.db
      .prepare(`
        SELECT id, name, kind, billing_day, settlement_account
        FROM accounts
        WHERE name = @name
      `)
      .get({ name }) as AccountRow | undefined;

    return row ? mapAccount(row) : undefined;
  }

  existsByName(name: string): boolean {
    return this.findByName(name) !== undefined;
  }

  create(input: AccountWriteInput): Account {
    if (this.existsByName(input.name)) {
      throw new Error(`account already exists: ${input.name}`);
    }

    if (input.kind === 'credit' && !this.existsByName(input.settlementAccount ?? '')) {
      throw new Error('settlementAccount must be an existing place');
    }

    if (input.kind === 'credit') {
      const payFrom = this.findByName(input.settlementAccount ?? '');
      if (payFrom?.kind === 'credit') {
        throw new Error('credit card must be charged from a bank or wallet');
      }
    }

    const row = this.db
      .prepare(`
        INSERT INTO accounts (name, kind, billing_day, settlement_account)
        VALUES (@name, @kind, @billingDay, @settlementAccount)
        RETURNING id, name, kind, billing_day, settlement_account
      `)
      .get({
        name: input.name,
        kind: input.kind,
        billingDay: input.billingDay,
        settlementAccount: input.settlementAccount,
      }) as AccountRow;

    return mapAccount(row);
  }

  update(id: number, input: AccountWriteInput): Account | undefined {
    const existing = this.findById(id);
    if (!existing) {
      return undefined;
    }

    if (existing.name !== input.name && this.existsByName(input.name)) {
      throw new Error(`account already exists: ${input.name}`);
    }

    if (input.kind === 'credit') {
      if (!input.settlementAccount || !this.existsByName(input.settlementAccount)) {
        throw new Error('settlementAccount must be an existing place');
      }

      const payFrom = this.findByName(input.settlementAccount);
      if (payFrom?.kind === 'credit') {
        throw new Error('credit card must be charged from a bank or wallet');
      }
    }

    const rename = this.db.transaction(() => {
      this.db
        .prepare(`
          UPDATE accounts
          SET name = @name,
              kind = @kind,
              billing_day = @billingDay,
              settlement_account = @settlementAccount
          WHERE id = @id
        `)
        .run({
          id,
          name: input.name,
          kind: input.kind,
          billingDay: input.billingDay,
          settlementAccount: input.settlementAccount,
        });

      if (existing.name !== input.name) {
        this.db
          .prepare(`
            UPDATE transactions
            SET account = @newName
            WHERE account = @oldName
          `)
          .run({
            oldName: existing.name,
            newName: input.name,
          });

        this.db
          .prepare(`
            UPDATE transactions
            SET settlement_account = @newName
            WHERE settlement_account = @oldName
          `)
          .run({
            oldName: existing.name,
            newName: input.name,
          });

        this.db
          .prepare(`
            UPDATE accounts
            SET settlement_account = @newName
            WHERE settlement_account = @oldName
          `)
          .run({
            oldName: existing.name,
            newName: input.name,
          });

        this.db
          .prepare(`
            UPDATE plans
            SET account = @newName
            WHERE account = @oldName
          `)
          .run({
            oldName: existing.name,
            newName: input.name,
          });
      }
    });

    rename();

    return this.findById(id);
  }

  delete(id: number): boolean {
    const result = this.db
      .prepare(`
        DELETE FROM accounts
        WHERE id = @id
      `)
      .run({ id });

    return result.changes > 0;
  }

  countTransactionsReferencing(name: string): number {
    const row = this.db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM transactions
        WHERE account = @name OR settlement_account = @name
      `)
      .get({ name }) as { count: number };

    return row.count;
  }

  countCreditCardsChargedFrom(name: string): number {
    const row = this.db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM accounts
        WHERE kind = 'credit' AND settlement_account = @name
      `)
      .get({ name }) as { count: number };

    return row.count;
  }

  countPlansReferencing(name: string): number {
    const row = this.db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM plans
        WHERE account = @name
      `)
      .get({ name }) as { count: number };

    return row.count;
  }
}

function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    billingDay: row.billing_day,
    settlementAccount: row.settlement_account,
  };
}
