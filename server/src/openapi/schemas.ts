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
  account: {
    type: 'string',
    description: 'Place used for the purchase or deposit (bank, Satispay, PayPal, or credit card)',
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
      required: ['id', 'date', 'category', 'type', 'amount', 'description', 'account', 'settlementDate', 'settlementAccount'],
      properties: {
        id: { type: 'integer' },
        ...createTransactionRequestProperties,
        settlementDate: {
          type: 'string',
          format: 'date',
          description: 'Date the bank is charged. Credit-card expenses settle on the next month billing day.',
        },
        settlementAccount: {
          type: 'string',
          description: 'Place the money leaves. For credit-card expenses this is the pay-from bank.',
        },
      },
    },
    CreateTransactionRequest: {
      type: 'object',
      required: ['date', 'category', 'type', 'amount', 'description', 'account'],
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
    AccountBreakdown: {
      type: 'object',
      required: ['account', 'amount'],
      properties: {
        account: { type: 'string' },
        amount: { type: 'number' },
        lastDate: {
          type: 'string',
          format: 'date',
          description: 'Most recent transaction date for this place',
        },
        lastCategory: {
          type: 'string',
          description: 'Category of the most recent movement',
        },
      },
    },
    CreditCardDue: {
      type: 'object',
      required: ['account', 'settlementAccount', 'settlementDate', 'amount'],
      properties: {
        account: { type: 'string', description: 'Credit card place' },
        settlementAccount: { type: 'string', description: 'Bank that will be charged' },
        settlementDate: {
          type: 'string',
          format: 'date',
          description: 'Date the bank withdrawal happens',
        },
        amount: { type: 'number' },
      },
    },
    PlannedDue: {
      type: 'object',
      required: ['planId', 'name', 'account', 'dueDate', 'amount', 'remainingCount'],
      properties: {
        planId: { type: 'integer' },
        name: { type: 'string' },
        account: { type: 'string', description: 'Place the payment leaves' },
        dueDate: {
          type: 'string',
          format: 'date',
        },
        amount: { type: 'number' },
        remainingCount: {
          type: 'integer',
          description: 'Unpaid remaining payments on this plan',
        },
      },
    },
    TransactionSummaryResponse: {
      type: 'object',
      required: [
        'categoryTotals',
        'incomeByCategory',
        'dailyTotals',
        'totalIncome',
        'totalExpense',
        'netBalance',
        'currentBalance',
        'accountBalances',
        'incomeByAccount',
        'expenseByAccount',
        'creditCardDues',
        'plannedDues',
        'plannedDueTotal',
        'availableThisMonth',
      ],
      properties: {
        categoryTotals: {
          type: 'object',
          additionalProperties: { type: 'number' },
          description: 'Expense totals grouped by category',
        },
        incomeByCategory: {
          type: 'object',
          additionalProperties: { type: 'number' },
          description: 'Income totals grouped by source category',
        },
        dailyTotals: {
          type: 'array',
          items: { $ref: '#/components/schemas/DailyTotal' },
          description: 'Zero-filled day or month buckets for the requested range',
        },
        totalIncome: { type: 'number' },
        totalExpense: { type: 'number' },
        netBalance: {
          type: 'number',
          description: 'Income minus expenses in the selected range',
        },
        currentBalance: {
          type: 'number',
          description: 'Cash on hand today across banks and wallets. Credit-card spend leaves the bank on settlement day.',
        },
        accountBalances: {
          type: 'array',
          items: { $ref: '#/components/schemas/AccountBreakdown' },
        },
        incomeByAccount: {
          type: 'array',
          items: { $ref: '#/components/schemas/AccountBreakdown' },
        },
        expenseByAccount: {
          type: 'array',
          items: { $ref: '#/components/schemas/AccountBreakdown' },
        },
        creditCardDues: {
          type: 'array',
          items: { $ref: '#/components/schemas/CreditCardDue' },
        },
        plannedDues: {
          type: 'array',
          items: { $ref: '#/components/schemas/PlannedDue' },
        },
        plannedDueTotal: {
          type: 'number',
          description: 'Unpaid planned withdrawals remaining this calendar month',
        },
        availableThisMonth: {
          type: 'number',
          description: 'Cash on hand minus this month’s unpaid plans and upcoming card dues',
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
    Account: {
      type: 'object',
      required: ['id', 'name', 'kind'],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        kind: {
          type: 'string',
          enum: ['wallet', 'credit'],
        },
        billingDay: {
          type: 'integer',
          minimum: 1,
          maximum: 28,
          nullable: true,
        },
        settlementAccount: {
          type: 'string',
          nullable: true,
          description: 'Bank or wallet charged on the billing day for a credit card',
        },
      },
    },
    CreateAccountRequest: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        kind: {
          type: 'string',
          enum: ['wallet', 'credit'],
        },
        billingDay: {
          type: 'integer',
          minimum: 1,
          maximum: 28,
          nullable: true,
        },
        settlementAccount: {
          type: 'string',
          nullable: true,
        },
      },
    },
    UpdateAccountRequest: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        kind: {
          type: 'string',
          enum: ['wallet', 'credit'],
        },
        billingDay: {
          type: 'integer',
          minimum: 1,
          maximum: 28,
          nullable: true,
        },
        settlementAccount: {
          type: 'string',
          nullable: true,
        },
      },
    },
    Plan: {
      type: 'object',
      required: [
        'id',
        'name',
        'amount',
        'account',
        'billingDay',
        'startDate',
        'remainingCount',
        'totalCount',
      ],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        amount: { type: 'number' },
        account: { type: 'string' },
        billingDay: {
          type: 'integer',
          minimum: 1,
          maximum: 28,
        },
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date', nullable: true },
        paymentCount: { type: 'integer', nullable: true },
        remainingCount: { type: 'integer' },
        totalCount: { type: 'integer' },
      },
    },
    CreatePlanRequest: {
      type: 'object',
      required: ['name', 'amount', 'account', 'startDate'],
      properties: {
        name: { type: 'string' },
        amount: { type: 'number', exclusiveMinimum: true },
        account: { type: 'string' },
        billingDay: { type: 'integer', minimum: 1, maximum: 28 },
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date', nullable: true },
        paymentCount: { type: 'integer', nullable: true },
      },
    },
    UpdatePlanRequest: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        amount: { type: 'number', exclusiveMinimum: true },
        account: { type: 'string' },
        billingDay: { type: 'integer', minimum: 1, maximum: 28 },
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date', nullable: true },
        paymentCount: { type: 'integer', nullable: true },
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
        ocrText: {
          type: 'string',
          description: 'Truncated OCR text to help the user correct missed fields',
        },
        confidence: {
          $ref: '#/components/schemas/ReceiptScanConfidence',
        },
      },
    },
  };
}
