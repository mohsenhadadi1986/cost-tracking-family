import { Transaction } from '../models/transaction.model';
import { AccountRepository } from '../repositories/account.repository';
import { CategoryRepository } from '../repositories/category.repository';

export type CreateTransactionInput = Omit<Transaction, 'id' | 'settlementDate' | 'settlementAccount'>;

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

  if (typeof input.category !== 'string' || input.category.trim() === '') {
    throw new Error('category is required');
  }

  if (input.type !== 'expense' && input.type !== 'income') {
    throw new Error('type must be either expense or income');
  }

  if (typeof input.amount !== 'number' || !Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('amount must be a positive number');
  }

  if (!categoryRepository.existsByNameAndType(input.category, input.type)) {
    const names = categoryRepository.findNamesByType(input.type);
    throw new Error(`category must be one of: ${names.join(', ')}`);
  }

  if (typeof input.account !== 'string' || input.account.trim() === '') {
    throw new Error('account is required');
  }

  if (!accountRepository.existsByName(input.account.trim())) {
    const names = accountRepository.findAllNames();
    throw new Error(`account must be one of: ${names.join(', ')}`);
  }
}
