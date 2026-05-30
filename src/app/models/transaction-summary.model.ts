export interface DailyTotal {
  date: string;
  income: number;
  expense: number;
}

export interface TransactionSummaryResponse {
  categoryTotals: Record<string, number>;
  dailyTotals: DailyTotal[];
}
