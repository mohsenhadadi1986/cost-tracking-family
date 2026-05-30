export interface DailyTotal {
  date: string;
  income: number;
  expense: number;
}

/**
 * Response shape for GET /api/transactions/summary.
 * Used by the Visualization tab for pie and line charts.
 */
export interface TransactionSummaryResponse {
  categoryTotals: Record<string, number>;
  dailyTotals: DailyTotal[];
}
