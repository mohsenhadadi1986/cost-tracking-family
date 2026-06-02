import type { ParsedQs } from 'qs';
import { TRANSACTION_CATEGORIES } from '../constants/categories';

export interface TransactionFilterCriteria {
  startDate?: string;
  endDate?: string;
  categories?: string[];
  type?: 'expense' | 'income';
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDateParam(value: unknown, paramName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${paramName} must be a date in YYYY-MM-DD format`);
  }

  const date = value.trim();
  if (!DATE_PATTERN.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error(`${paramName} must be a date in YYYY-MM-DD format`);
  }

  return date;
}

function parseCategoriesParam(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  const rawValues = Array.isArray(value)
    ? value.flatMap(item => (typeof item === 'string' ? item.split(',') : []))
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const categories = rawValues.map(category => category.trim()).filter(category => category.length > 0);

  if (categories.length === 0) {
    return undefined;
  }

  const invalidCategory = categories.find(
    category => !(TRANSACTION_CATEGORIES as readonly string[]).includes(category)
  );
  if (invalidCategory) {
    throw new Error(`categories must be one or more of: ${TRANSACTION_CATEGORIES.join(', ')}`);
  }

  return categories;
}

function parseTypeParam(value: unknown): 'expense' | 'income' | undefined {
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

export function parseTransactionFilterQuery(query: ParsedQs): TransactionFilterCriteria {
  const startDate = parseDateParam(query.startDate, 'startDate');
  const endDate = parseDateParam(query.endDate, 'endDate');
  const categories = parseCategoriesParam(query.categories);
  const type = parseTypeParam(query.type);

  if (startDate && endDate && startDate > endDate) {
    throw new Error('startDate must be on or before endDate');
  }

  return {
    startDate,
    endDate,
    categories,
    type,
  };
}
