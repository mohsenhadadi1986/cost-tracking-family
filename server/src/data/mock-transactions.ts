import { Transaction } from '../models/transaction.model';
import { TRANSACTION_CATEGORIES } from '../constants/categories';

const [Food, Transport, Utilities, Entertainment, Salary, Investment] =
  TRANSACTION_CATEGORIES;

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

export const MOCK_TRANSACTIONS: Omit<Transaction, 'id'>[] = [
  { date: daysAgo(0), category: Food, type: 'expense', amount: 125.5, description: 'Weekly groceries' },
  { date: daysAgo(0), category: Transport, type: 'expense', amount: 42, description: 'Gas' },
  { date: daysAgo(0), category: Salary, type: 'income', amount: 4200, description: 'Monthly salary' },

  { date: daysAgo(1), category: Utilities, type: 'expense', amount: 185, description: 'Electric bill' },
  { date: daysAgo(1), category: Entertainment, type: 'expense', amount: 55, description: 'Movie night' },
  { date: daysAgo(1), category: Food, type: 'expense', amount: 18.75, description: 'Coffee shop' },

  { date: daysAgo(2), category: Food, type: 'expense', amount: 68.25, description: 'Restaurant dinner' },
  { date: daysAgo(2), category: Transport, type: 'expense', amount: 15, description: 'Parking fee' },
  { date: daysAgo(2), category: Investment, type: 'income', amount: 150, description: 'Dividends' },

  { date: daysAgo(3), category: Transport, type: 'expense', amount: 28.5, description: 'Bus pass' },
  { date: daysAgo(3), category: Utilities, type: 'expense', amount: 62, description: 'Water bill' },
  { date: daysAgo(3), category: Entertainment, type: 'expense', amount: 89, description: 'Concert tickets' },

  { date: daysAgo(4), category: Utilities, type: 'expense', amount: 95, description: 'Internet' },
  { date: daysAgo(4), category: Food, type: 'expense', amount: 34.9, description: 'Farmers market' },
  { date: daysAgo(4), category: Salary, type: 'income', amount: 350, description: 'Freelance project' },

  { date: daysAgo(5), category: Entertainment, type: 'expense', amount: 32, description: 'Streaming subscription' },
  { date: daysAgo(5), category: Transport, type: 'expense', amount: 210, description: 'Car maintenance' },
  { date: daysAgo(5), category: Investment, type: 'income', amount: 75, description: 'Bond interest' },

  { date: daysAgo(6), category: Food, type: 'expense', amount: 52.4, description: 'Takeout' },
  { date: daysAgo(6), category: Entertainment, type: 'expense', amount: 24, description: 'Board game' },
  { date: daysAgo(6), category: Investment, type: 'income', amount: 220, description: 'Stock sale profit' },
];
