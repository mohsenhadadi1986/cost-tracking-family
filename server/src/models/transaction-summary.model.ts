export interface DailyTotal {
  date: string;
  income: number;
  expense: number;
}

export interface AccountBreakdown {
  account: string;
  amount: number;
  lastDate?: string;
  lastCategory?: string;
}

export interface CreditCardDue {
  account: string;
  settlementAccount: string;
  settlementDate: string;
  amount: number;
}

/**
 * Response shape for GET /api/transactions/summary.
 * Used by the Visualization tab for balance cards and charts.
 */
export interface TransactionSummaryResponse {
  categoryTotals: Record<string, number>;
  incomeByCategory: Record<string, number>;
  dailyTotals: DailyTotal[];
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  currentBalance: number;
  accountBalances: AccountBreakdown[];
  incomeByAccount: AccountBreakdown[];
  expenseByAccount: AccountBreakdown[];
  creditCardDues: CreditCardDue[];
}
