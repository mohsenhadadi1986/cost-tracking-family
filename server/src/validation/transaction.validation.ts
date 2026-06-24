import { Transaction } from '../models/transaction.model';
import { CategoryRepository } from '../repositories/category.repository';

export type CreateTransactionInput = Omit<Transaction, 'id'>;

export function validateTransactionInput(
  input: CreateTransactionInput,
  categoryRepository: CategoryRepository
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
}
