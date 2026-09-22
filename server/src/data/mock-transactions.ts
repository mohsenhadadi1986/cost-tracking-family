import { Transaction } from '../models/transaction.model';
import { creditCardSettlementDate } from '../utils/credit-card';

const Food = 'Food';
const Fuel = 'Fuel';
const Tolls = 'Tolls';
const PublicTransport = 'Public transport';
const CarMaintenance = 'Car maintenance';
const Electricity = 'Electricity';
const WiFi = 'WiFi';
const Utilities = 'Utilities';
const Entertainment = 'Entertainment';
const Salary = 'Salary';
const Investment = 'Investment';
const Bank1 = 'ING Current Account';
const Bank2 = 'ING Orange Account';
const Satispay = 'Satispay';
const PayPal = 'PayPal';
const CreditCard = 'ING Credit Account';

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

type MockTransaction = Omit<Transaction, 'id' | 'settlementDate' | 'settlementAccount' | 'toAccount'> &
  Partial<Pick<Transaction, 'settlementDate' | 'settlementAccount' | 'toAccount'>>;

const cardPurchaseDate = daysAgo(2);

export const MOCK_TRANSACTIONS: MockTransaction[] = [
  { date: daysAgo(0), category: Food, type: 'expense', amount: 125.5, description: 'Weekly groceries', account: Satispay },
  { date: daysAgo(0), category: Fuel, type: 'expense', amount: 42, description: 'Gas', account: Bank2 },
  { date: daysAgo(0), category: Salary, type: 'income', amount: 4200, description: 'Monthly salary', account: Bank1 },

  { date: daysAgo(1), category: Electricity, type: 'expense', amount: 185, description: 'Electric bill', account: Bank1 },
  { date: daysAgo(1), category: Entertainment, type: 'expense', amount: 55, description: 'Movie night', account: PayPal },
  { date: daysAgo(1), category: Food, type: 'expense', amount: 18.75, description: 'Coffee shop', account: Satispay },

  { date: daysAgo(2), category: Food, type: 'expense', amount: 68.25, description: 'Restaurant dinner', account: Satispay },
  {
    date: cardPurchaseDate,
    category: Food,
    type: 'expense',
    amount: 86.4,
    description: 'Supermarket (credit card)',
    account: CreditCard,
    settlementDate: creditCardSettlementDate(cardPurchaseDate),
    settlementAccount: Bank1,
  },
  { date: daysAgo(2), category: Tolls, type: 'expense', amount: 15, description: 'Parking fee', account: Bank2 },
  { date: daysAgo(2), category: Investment, type: 'income', amount: 150, description: 'Dividends', account: PayPal },

  { date: daysAgo(3), category: PublicTransport, type: 'expense', amount: 28.5, description: 'Bus pass', account: Satispay },
  { date: daysAgo(3), category: Utilities, type: 'expense', amount: 62, description: 'Water bill', account: Bank1 },
  { date: daysAgo(3), category: Entertainment, type: 'expense', amount: 89, description: 'Concert tickets', account: PayPal },

  { date: daysAgo(4), category: WiFi, type: 'expense', amount: 95, description: 'Internet', account: Bank1 },
  { date: daysAgo(4), category: Food, type: 'expense', amount: 34.9, description: 'Farmers market', account: Satispay },
  { date: daysAgo(4), category: Salary, type: 'income', amount: 350, description: 'Freelance project', account: Bank2 },

  { date: daysAgo(5), category: Entertainment, type: 'expense', amount: 32, description: 'Streaming subscription', account: PayPal },
  { date: daysAgo(5), category: CarMaintenance, type: 'expense', amount: 210, description: 'Car maintenance', account: Bank2 },
  { date: daysAgo(5), category: Investment, type: 'income', amount: 75, description: 'Bond interest', account: PayPal },

  { date: daysAgo(6), category: Food, type: 'expense', amount: 52.4, description: 'Takeout', account: Satispay },
  { date: daysAgo(6), category: Entertainment, type: 'expense', amount: 24, description: 'Board game', account: PayPal },
  { date: daysAgo(6), category: Investment, type: 'income', amount: 220, description: 'Stock sale profit', account: PayPal },
];
