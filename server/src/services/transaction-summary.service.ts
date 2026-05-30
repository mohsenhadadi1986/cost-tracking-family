import { Transaction } from '../models/transaction.model';
import { DailyTotal, TransactionSummaryResponse } from '../models/transaction-summary.model';
import { TransactionRepository } from '../repositories/transaction.repository';

export class TransactionSummaryService {
  constructor(private readonly repository: TransactionRepository) {}

  getSummary(): TransactionSummaryResponse {
    const transactions = this.repository.findAll();

    return {
      categoryTotals: getCategoryTotals(transactions),
      dailyTotals: getDailyTotals(transactions),
    };
  }
}

function getCategoryTotals(transactions: Transaction[]): Record<string, number> {
  return transactions.reduce((acc, curr) => {
    if (curr.type === 'expense') {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    }
    return acc;
  }, {} as Record<string, number>);
}

function getDailyTotals(transactions: Transaction[]): DailyTotal[] {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  return last7Days.map(date => {
    const dayTransactions = transactions.filter(t => t.date === date);

    return {
      date,
      income: dayTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
      expense: dayTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
    };
  });
}
