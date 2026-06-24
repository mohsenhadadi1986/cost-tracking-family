import { Category } from '../models/category.model';

export interface CreateCategoryInput {
  name: string;
  type: 'expense' | 'income';
}

export interface UpdateCategoryInput {
  name: string;
}

export function validateCreateCategoryInput(input: CreateCategoryInput): void {
  if (typeof input.name !== 'string' || input.name.trim() === '') {
    throw new Error('name is required');
  }

  if (input.type !== 'expense' && input.type !== 'income') {
    throw new Error('type must be either expense or income');
  }
}

export function validateUpdateCategoryInput(input: UpdateCategoryInput): void {
  if (typeof input.name !== 'string' || input.name.trim() === '') {
    throw new Error('name is required');
  }
}

export function normalizeCategoryName(name: string): string {
  return name.trim();
}

export function parseCategoryTypeFilter(value: unknown): 'expense' | 'income' | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('type must be either expense or income');
  }

  const type = value.trim();
  if (type === 'expense' || type === 'income') {
    return type;
  }

  throw new Error('type must be either expense or income');
}

export function parseCategoryIdParam(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('invalid category id');
  }

  return id;
}

export type CategoryRow = Category;
