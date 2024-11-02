import { Injectable, signal } from '@angular/core';
import { Transaction } from '../models/transaction.model';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private transactions = signal<Transaction[]>([]);

  addTransaction(transaction: Omit<Transaction, 'id'>) {
    const newTransaction = {
      ...transaction,
      id: Date.now()
    };
    this.transactions.update(prev => [...prev, newTransaction]);
  }

  getTransactions() {
    return this.transactions;
  }

  getCategoryTotals() {
    return this.transactions().reduce((acc, curr) => {
      if (curr.type === 'expense') {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      }
      return acc;
    }, {} as Record<string, number>);
  }

  getDailyTotals() {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyTotals = last7Days.map(date => {
      const dayTransactions = this.transactions().filter(t => t.date === date);
      return {
        date,
        income: dayTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0),
        expense: dayTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0)
      };
    });

    return dailyTotals;
  }
}