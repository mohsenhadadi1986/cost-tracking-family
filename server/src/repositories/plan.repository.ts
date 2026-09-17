import type Database from 'better-sqlite3';
import { PlanRecord } from '../models/plan.model';
import { PlanWriteInput } from '../validation/plan.validation';

type PlanRow = {
  id: number;
  name: string;
  amount: number;
  account: string;
  billing_day: number;
  start_date: string;
  end_date: string | null;
  payment_count: number | null;
};

export class PlanRepository {
  constructor(private readonly db: Database.Database) {}

  findAll(): PlanRecord[] {
    const rows = this.db
      .prepare(`
        SELECT id, name, amount, account, billing_day, start_date, end_date, payment_count
        FROM plans
        ORDER BY name ASC, id ASC
      `)
      .all() as PlanRow[];

    return rows.map(mapPlan);
  }

  findById(id: number): PlanRecord | undefined {
    const row = this.db
      .prepare(`
        SELECT id, name, amount, account, billing_day, start_date, end_date, payment_count
        FROM plans
        WHERE id = @id
      `)
      .get({ id }) as PlanRow | undefined;

    return row ? mapPlan(row) : undefined;
  }

  existsByName(name: string): boolean {
    const row = this.db
      .prepare(`SELECT 1 FROM plans WHERE name = @name`)
      .get({ name }) as { 1: number } | undefined;

    return row !== undefined;
  }

  create(input: PlanWriteInput): PlanRecord {
    if (this.existsByName(input.name)) {
      throw new Error(`plan already exists: ${input.name}`);
    }

    const row = this.db
      .prepare(`
        INSERT INTO plans (name, amount, account, billing_day, start_date, end_date, payment_count)
        VALUES (@name, @amount, @account, @billingDay, @startDate, @endDate, @paymentCount)
        RETURNING id, name, amount, account, billing_day, start_date, end_date, payment_count
      `)
      .get(input) as PlanRow;

    return mapPlan(row);
  }

  update(id: number, input: PlanWriteInput): PlanRecord | undefined {
    const existing = this.findById(id);
    if (!existing) {
      return undefined;
    }

    if (existing.name !== input.name && this.existsByName(input.name)) {
      throw new Error(`plan already exists: ${input.name}`);
    }

    this.db
      .prepare(`
        UPDATE plans
        SET name = @name,
            amount = @amount,
            account = @account,
            billing_day = @billingDay,
            start_date = @startDate,
            end_date = @endDate,
            payment_count = @paymentCount
        WHERE id = @id
      `)
      .run({ id, ...input });

    return this.findById(id);
  }

  delete(id: number): boolean {
    const result = this.db
      .prepare(`DELETE FROM plans WHERE id = @id`)
      .run({ id });

    return result.changes > 0;
  }
}

function mapPlan(row: PlanRow): PlanRecord {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    account: row.account,
    billingDay: row.billing_day,
    startDate: row.start_date,
    endDate: row.end_date,
    paymentCount: row.payment_count,
  };
}
