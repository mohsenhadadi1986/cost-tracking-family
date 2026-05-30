import { TRANSACTION_CATEGORIES } from '../constants/categories';

const transactionTypeSchema = {
  type: 'string',
  enum: ['expense', 'income'],
};

const transactionCategorySchema = {
  type: 'string',
  enum: [...TRANSACTION_CATEGORIES],
};

const createTransactionRequestProperties = {
  date: {
    type: 'string',
    format: 'date',
    description: 'ISO date string (YYYY-MM-DD)',
  },
  category: transactionCategorySchema,
  type: transactionTypeSchema,
  amount: {
    type: 'number',
    minimum: 0,
    exclusiveMinimum: true,
    description: 'Positive transaction amount',
  },
  description: {
    type: 'string',
  },
};

export function getOpenApiSchemas() {
  return {
    HealthResponse: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['ok'],
        },
      },
    },
    Transaction: {
      type: 'object',
      required: ['id', 'date', 'category', 'type', 'amount', 'description'],
      properties: {
        id: { type: 'integer' },
        ...createTransactionRequestProperties,
      },
    },
    CreateTransactionRequest: {
      type: 'object',
      required: ['date', 'category', 'type', 'amount', 'description'],
      properties: createTransactionRequestProperties,
    },
    DailyTotal: {
      type: 'object',
      required: ['date', 'income', 'expense'],
      properties: {
        date: {
          type: 'string',
          format: 'date',
          description: 'ISO date string (YYYY-MM-DD)',
        },
        income: {
          type: 'number',
          description: 'Total income for the day',
        },
        expense: {
          type: 'number',
          description: 'Total expense for the day',
        },
      },
    },
    TransactionSummaryResponse: {
      type: 'object',
      required: ['categoryTotals', 'dailyTotals'],
      properties: {
        categoryTotals: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
        dailyTotals: {
          type: 'array',
          items: { $ref: '#/components/schemas/DailyTotal' },
        },
      },
    },
    ErrorResponse: {
      type: 'object',
      required: ['error'],
      properties: {
        error: { type: 'string' },
      },
    },
  };
}
