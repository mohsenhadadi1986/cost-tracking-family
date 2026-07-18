const transactionTypeSchema = {
  type: 'string',
  enum: ['expense', 'income'],
};

const transactionCategorySchema = {
  type: 'string',
  description: 'Category name that exists for the transaction type',
};

const categoryTypeSchema = {
  type: 'string',
  enum: ['expense', 'income'],
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
    Category: {
      type: 'object',
      required: ['id', 'name', 'type'],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        type: categoryTypeSchema,
      },
    },
    CreateCategoryRequest: {
      type: 'object',
      required: ['name', 'type'],
      properties: {
        name: { type: 'string' },
        type: categoryTypeSchema,
      },
    },
    UpdateCategoryRequest: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
      },
    },
    ReceiptScanConfidence: {
      type: 'object',
      properties: {
        overall: {
          type: 'number',
          description: 'Overall OCR confidence score',
        },
        date: {
          type: 'number',
          description: 'Confidence for the extracted date',
        },
        amount: {
          type: 'number',
          description: 'Confidence for the extracted amount',
        },
        description: {
          type: 'number',
          description: 'Confidence for the extracted description',
        },
        suggestedCategory: {
          type: 'number',
          description: 'Confidence for the suggested category',
        },
      },
    },
    ReceiptScanResponse: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          format: 'date',
          description: 'Extracted transaction date (YYYY-MM-DD)',
        },
        amount: {
          type: 'number',
          minimum: 0,
          exclusiveMinimum: true,
          description: 'Extracted transaction amount',
        },
        description: {
          type: 'string',
          description: 'Extracted merchant or line-item description',
        },
        suggestedCategory: {
          type: 'string',
          description: 'Best-guess category based on receipt text',
        },
        confidence: {
          $ref: '#/components/schemas/ReceiptScanConfidence',
        },
      },
    },
  };
}
