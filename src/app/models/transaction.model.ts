export interface Transaction {
  id: number;
  date: string;
  category: string;
  type: 'expense' | 'income';
  amount: number;
  description: string;
}