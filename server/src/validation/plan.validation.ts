import { PlanRecord } from '../models/plan.model';
import { DEFAULT_CREDIT_BILLING_DAY } from '../constants/accounts';
import { firstDueDate } from '../utils/plan-schedule';

export interface PlanWriteInput {
  name: string;
  amount: number;
  account: string;
  billingDay: number;
  startDate: string;
  endDate: string | null;
  paymentCount: number | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PAYMENTS = 600;

export function parsePlanIdParam(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('invalid plan id');
  }

  return id;
}

export function parsePlanWriteInput(body: unknown, existing?: PlanRecord): PlanWriteInput {
  const record = isRecord(body) ? body : {};
  const name = validateName(record.name ?? existing?.name);
  const amount = validateAmount(record.amount ?? existing?.amount);
  const account = validateName(record.account ?? existing?.account, 'account');
  const billingDay = parseBillingDay(record.billingDay ?? existing?.billingDay);
  const startDate = parseIsoDate(record.startDate ?? existing?.startDate, 'startDate');
  const endDate = parseOptionalIsoDate(
    hasOwn(record, 'endDate') ? record.endDate : existing?.endDate,
    'endDate'
  );
  const paymentCount = parseOptionalCount(
    hasOwn(record, 'paymentCount') ? record.paymentCount : existing?.paymentCount
  );

  if (!endDate && !paymentCount) {
    throw new Error('endDate or paymentCount is required');
  }

  if (endDate && endDate < startDate) {
    throw new Error('endDate must be on or after startDate');
  }

  const firstDue = firstDueDate(startDate, billingDay, endDate);
  if (endDate && endDate < firstDue) {
    throw new Error('endDate is before the first payment');
  }

  return {
    name,
    amount,
    account,
    billingDay,
    startDate,
    endDate,
    paymentCount,
  };
}

function validateName(value: unknown, field = 'name'): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} is required`);
  }

  return value.trim();
}

function validateAmount(value: unknown): number {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('amount must be a positive number');
  }

  return Math.round(amount * 100) / 100;
}

function parseBillingDay(value: unknown): number {
  const day = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return DEFAULT_CREDIT_BILLING_DAY;
  }

  return day;
}

function parseIsoDate(value: unknown, field: string): string {
  if (typeof value !== 'string' || !ISO_DATE.test(value.trim())) {
    throw new Error(`${field} must be YYYY-MM-DD`);
  }

  const trimmed = value.trim();
  const [year, month, day] = trimmed.split('-').map(part => Number.parseInt(part, 10));
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`${field} must be YYYY-MM-DD`);
  }

  return trimmed;
}

function parseOptionalIsoDate(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return parseIsoDate(value, field);
}

function parseOptionalCount(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const count = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(count) || count < 1 || count > MAX_PAYMENTS) {
    throw new Error('paymentCount must be between 1 and 600');
  }

  return count;
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
