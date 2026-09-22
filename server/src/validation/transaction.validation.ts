import { TRANSFER_CATEGORY, TransactionType } from '../models/transaction.model';
import { AccountRepository } from '../repositories/account.repository';
import { CategoryRepository } from '../repositories/category.repository';

export type CreateTransactionInput = Omit<Transaction, 'id' | 'settlementDate' | 'settlementAccount' | 'toAccount'> & {
  toAccount?: string | null;
};

const TRANSACTION_TYPES: TransactionType[] = ['expense', 'income', 'transfer'];

export class TransactionNotFoundError extends Error {
  constructor() {
    super('transaction not found');
    this.name = 'TransactionNotFoundError';
  }
}

export function parseTransactionIdParam(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('invalid transaction id');
  }

  return id;
}

export function parseTransactionWriteInput(body: unknown): CreateTransactionInput {
  const record = isRecord(body) ? body : {};
  const amountValue = typeof record.amount === 'number' ? record.amount : Number(record.amount);

  return {
    date: typeof record.date === 'string' ? record.date : '',
    category: typeof record.category === 'string' ? record.category.trim() : '',
    type: record.type as CreateTransactionInput['type'],
    amount: amountValue,
    description: typeof record.description === 'string' ? record.description : '',
    account: typeof record.account === 'string' ? record.account : '',
    toAccount: typeof record.toAccount === 'string' ? record.toAccount.trim() : null,
  };
}

export function validateTransactionInput(
  input: CreateTransactionInput,
  categoryRepository: CategoryRepository,
  accountRepository: AccountRepository
): void {
  if (typeof input.date !== 'string' || input.date.trim() === '') {
    throw new Error('date is required');
  }

  if (typeof input.description !== 'string') {
    throw new Error('description is required');
  }

  if (!TRANSACTION_TYPES.includes(input.type)) {
    throw new Error('type must be expense, income, or transfer');
  }

  if (typeof input.amount !== 'number' || !Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('amount must be a positive number');
  }

  if (input.type === 'transfer') {
    validateTransfer(input, accountRepository);
    return;
  }

  if (typeof input.category !== 'string' || input.category.trim() === '') {
    throw new Error('category is required');
  }

  if (!categoryRepository.existsByNameAndType(input.category, input.type)) {
    const names = categoryRepository.findNamesByType(input.type);
    throw new Error(`category must be one of: ${names.join(', ')}`);
  }

  assertKnownPlace(input.account, accountRepository, 'account');
}

function validateTransfer(input: CreateTransactionInput, accountRepository: AccountRepository): void {
  const source = assertCashPlace(input.account, accountRepository, 'account');
  const destinationName = typeof input.toAccount === 'string' ? input.toAccount.trim() : '';
  if (!destinationName) {
    throw new Error('toAccount is required');
  }

  const destination = assertCashPlace(destinationName, accountRepository, 'toAccount');
  if (source.name === destination.name) {
    throw new Error('transfer must use two different places');
  }
}

function assertKnownPlace(name: string, accountRepository: AccountRepository, field: 'account' | 'toAccount') {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) {
    throw new Error(`${field} is required`);
  }

  const place = accountRepository.findByName(trimmed);
  if (!place) {
    const names = accountRepository.findAllNames();
    throw new Error(`${field} must be one of: ${names.join(', ')}`);
  }

  return place;
}

function assertCashPlace(name: string, accountRepository: AccountRepository, field: 'account' | 'toAccount') {
  const place = assertKnownPlace(name, accountRepository, field);
  if (place.kind === 'credit') {
    throw new Error('transfers move cash between places, not credit cards');
  }

  return place;
}

export function normalizeTransactionWrite(input: CreateTransactionInput): CreateTransactionInput {
  const account = input.account.trim();
  if (input.type === 'transfer') {
    return {
      ...input,
      account,
      category: TRANSFER_CATEGORY,
      toAccount: (input.toAccount ?? '').trim(),
    };
  }

  return {
    ...input,
    account,
    toAccount: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
