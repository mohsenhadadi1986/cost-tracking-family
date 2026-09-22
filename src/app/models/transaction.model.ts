export type TransactionType = 'expense' | 'income' | 'transfer';

export const TRANSFER_CATEGORY = 'Transfer';

export interface Transaction {
  id: number;
  date: string;
  category: string;
  type: TransactionType;
  amount: number;
  description: string;
  account: string;
  toAccount: string | null;
  settlementDate: string;
  settlementAccount: string;
}