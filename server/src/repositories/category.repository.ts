import type Database from 'better-sqlite3';
import { Category } from '../models/category.model';
import {
  CreateCategoryInput,
  normalizeCategoryName,
  validateCreateCategoryInput,
  validateUpdateCategoryInput,
} from '../validation/category.validation';

type CategoryRow = Category;

export class CategoryRepository {
  constructor(private readonly db: Database.Database) {}

  findAll(type?: 'expense' | 'income'): Category[] {
    if (type) {
      return this.db
        .prepare(`
          SELECT id, name, type
          FROM categories
          WHERE type = @type
          ORDER BY name ASC, id ASC
        `)
        .all({ type }) as CategoryRow[];
    }

    return this.db
      .prepare(`
        SELECT id, name, type
        FROM categories
        ORDER BY type ASC, name ASC, id ASC
      `)
      .all() as CategoryRow[];
  }

  findById(id: number): Category | undefined {
    return this.db
      .prepare(`
        SELECT id, name, type
        FROM categories
        WHERE id = @id
      `)
      .get({ id }) as CategoryRow | undefined;
  }

  existsByNameAndType(name: string, type: 'expense' | 'income'): boolean {
    const row = this.db
      .prepare(`
        SELECT 1 AS found
        FROM categories
        WHERE name = @name AND type = @type
      `)
      .get({ name, type }) as { found: number } | undefined;

    return row !== undefined;
  }

  existsByName(name: string): boolean {
    const row = this.db
      .prepare(`
        SELECT 1 AS found
        FROM categories
        WHERE name = @name
      `)
      .get({ name }) as { found: number } | undefined;

    return row !== undefined;
  }

  findNamesByType(type: 'expense' | 'income'): string[] {
    const rows = this.db
      .prepare(`
        SELECT name
        FROM categories
        WHERE type = @type
        ORDER BY name ASC, id ASC
      `)
      .all({ type }) as Array<{ name: string }>;

    return rows.map(row => row.name);
  }

  findAllNames(): string[] {
    const rows = this.db
      .prepare(`
        SELECT name
        FROM categories
        ORDER BY name ASC, id ASC
      `)
      .all() as Array<{ name: string }>;

    return rows.map(row => row.name);
  }

  create(input: CreateCategoryInput): Category {
    validateCreateCategoryInput(input);

    const name = normalizeCategoryName(input.name);

    try {
      const row = this.db
        .prepare(`
          INSERT INTO categories (name, type)
          VALUES (@name, @type)
          RETURNING id, name, type
        `)
        .get({ name, type: input.type }) as CategoryRow;

      return row;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error(`category "${name}" already exists for type ${input.type}`);
      }

      throw error;
    }
  }

  updateName(id: number, name: string): Category | undefined {
    validateUpdateCategoryInput({ name });

    const normalizedName = normalizeCategoryName(name);
    const existing = this.findById(id);
    if (!existing) {
      return undefined;
    }

    if (existing.name === normalizedName) {
      return existing;
    }

    if (this.existsByNameAndType(normalizedName, existing.type)) {
      throw new Error(`category "${normalizedName}" already exists for type ${existing.type}`);
    }

    const updateCategory = this.db.transaction(() => {
      this.db
        .prepare(`
          UPDATE categories
          SET name = @name
          WHERE id = @id
        `)
        .run({ id, name: normalizedName });

      this.db
        .prepare(`
          UPDATE transactions
          SET category = @newName
          WHERE category = @oldName AND type = @type
        `)
        .run({
          oldName: existing.name,
          newName: normalizedName,
          type: existing.type,
        });
    });

    updateCategory();

    return this.findById(id);
  }

  delete(id: number): boolean {
    const result = this.db
      .prepare(`
        DELETE FROM categories
        WHERE id = @id
      `)
      .run({ id });

    return result.changes > 0;
  }

  countTransactionsReferencing(name: string, type: 'expense' | 'income'): number {
    const row = this.db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM transactions
        WHERE category = @name AND type = @type
      `)
      .get({ name, type }) as { count: number };

    return row.count;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as { code: string }).code === 'SQLITE_CONSTRAINT_UNIQUE'
  );
}
