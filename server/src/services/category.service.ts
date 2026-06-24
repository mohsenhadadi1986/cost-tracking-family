import { Category } from '../models/category.model';
import { CategoryRepository } from '../repositories/category.repository';
import {
  CreateCategoryInput,
  UpdateCategoryInput,
  validateCreateCategoryInput,
  validateUpdateCategoryInput,
} from '../validation/category.validation';

export class CategoryNotFoundError extends Error {
  constructor() {
    super('category not found');
    this.name = 'CategoryNotFoundError';
  }
}

export class CategoryInUseError extends Error {
  constructor() {
    super('category is referenced by one or more transactions');
    this.name = 'CategoryInUseError';
  }
}

export class CategoryService {
  constructor(private readonly repository: CategoryRepository) {}

  list(type?: 'expense' | 'income'): Category[] {
    return this.repository.findAll(type);
  }

  create(input: CreateCategoryInput): Category {
    validateCreateCategoryInput(input);
    return this.repository.create(input);
  }

  update(id: number, input: UpdateCategoryInput): Category {
    validateUpdateCategoryInput(input);

    const updated = this.repository.updateName(id, input.name);
    if (!updated) {
      throw new CategoryNotFoundError();
    }

    return updated;
  }

  delete(id: number): void {
    const category = this.repository.findById(id);
    if (!category) {
      throw new CategoryNotFoundError();
    }

    const referenceCount = this.repository.countTransactionsReferencing(
      category.name,
      category.type
    );
    if (referenceCount > 0) {
      throw new CategoryInUseError();
    }

    this.repository.delete(id);
  }
}
