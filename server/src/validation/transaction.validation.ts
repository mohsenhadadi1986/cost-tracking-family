import { TRANSACTION_CATEGORIES } from '../constants/categories';
import { Transaction } from '../models/transaction.model';

export type CreateTransactionInput = Omit<Transaction, 'id'>;

export function validateTransactionInput(input: CreateTransactionInput): void {
  if (input.type !== 'expense' && input.type !== 'income') {
    throw new Error('type must be either expense or income');
  }

  if (typeof input.amount !== 'number' || !Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('amount must be a positive number');
  }

  if (!(TRANSACTION_CATEGORIES as readonly string[]).includes(input.category)) {
    throw new Error(`category must be one of: ${TRANSACTION_CATEGORIES.join(', ')}`);
  }
}
