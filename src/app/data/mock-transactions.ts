import { Transaction } from '../models/transaction.model';

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

export const MOCK_TRANSACTIONS: Omit<Transaction, 'id'>[] = [
  { date: daysAgo(0), category: 'Food', type: 'expense', amount: 125.5, description: 'Weekly groceries' },
  { date: daysAgo(0), category: 'Transport', type: 'expense', amount: 42, description: 'Gas' },
  { date: daysAgo(1), category: 'Utilities', type: 'expense', amount: 185, description: 'Electric bill' },
  { date: daysAgo(1), category: 'Entertainment', type: 'expense', amount: 55, description: 'Movie night' },
  { date: daysAgo(2), category: 'Food', type: 'expense', amount: 68.25, description: 'Restaurant' },
  { date: daysAgo(3), category: 'Transport', type: 'expense', amount: 28.5, description: 'Bus pass' },
  { date: daysAgo(4), category: 'Utilities', type: 'expense', amount: 95, description: 'Internet' },
  { date: daysAgo(5), category: 'Entertainment', type: 'expense', amount: 32, description: 'Streaming subscription' },
  { date: daysAgo(0), category: 'Salary', type: 'income', amount: 4200, description: 'Monthly salary' },
  { date: daysAgo(3), category: 'Investment', type: 'income', amount: 150, description: 'Dividends' },
];
