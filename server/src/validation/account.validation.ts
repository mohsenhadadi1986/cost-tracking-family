import { Account, AccountKind } from '../models/account.model';
import { DEFAULT_CREDIT_BILLING_DAY } from '../constants/accounts';

export interface AccountWriteInput {
  name: string;
  kind: AccountKind;
  billingDay: number | null;
  settlementAccount: string | null;
}

export function validateAccountName(name: unknown): string {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error('name is required');
  }

  return name.trim();
}

export function parseAccountIdParam(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('invalid account id');
  }

  return id;
}

export function parseAccountWriteInput(
  body: unknown,
  existing?: Account
): AccountWriteInput {
  const record = isRecord(body) ? body : {};
  const name = typeof record.name === 'string' || record.name === undefined
    ? validateAccountName(record.name ?? existing?.name)
    : validateAccountName(undefined);

  const kind = parseKind(record.kind, existing?.kind ?? 'wallet');

  if (kind === 'wallet') {
    return {
      name,
      kind,
      billingDay: null,
      settlementAccount: null,
    };
  }

  const billingDay = parseBillingDay(record.billingDay ?? existing?.billingDay);
  const settlementAccount = parseSettlementAccount(
    record.settlementAccount ?? existing?.settlementAccount
  );

  if (settlementAccount === name) {
    throw new Error('credit card cannot be charged from itself');
  }

  return {
    name,
    kind,
    billingDay,
    settlementAccount,
  };
}

function parseKind(value: unknown, fallback: AccountKind): AccountKind {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (value === 'wallet' || value === 'credit') {
    return value;
  }

  throw new Error('kind must be wallet or credit');
}

function parseBillingDay(value: unknown): number {
  const day = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(day) || day < 1 || day > 28) {
    return DEFAULT_CREDIT_BILLING_DAY;
  }

  return day;
}

function parseSettlementAccount(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('settlementAccount is required for a credit card');
  }

  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
