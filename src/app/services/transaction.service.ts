import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { MOCK_TRANSACTIONS } from '../data/mock-transactions';
import { DailyTotal, TransactionSummaryResponse } from '../models/transaction-summary.model';
import { Transaction } from '../models/transaction.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private readonly http = inject(HttpClient);
  private readonly transactionsUrl = `${environment.apiBaseUrl}/api/transactions`;
  private readonly summaryUrl = `${this.transactionsUrl}/summary`;

  private transactions = signal<Transaction[]>([]);
  private categoryTotals = signal<Record<string, number>>({});
  private dailyTotals = signal<DailyTotal[]>([]);

  constructor() {
    this.loadTransactions().subscribe();
  }

  loadTransactions(): Observable<Transaction[]> {
    if (environment.useMockTransactions && !environment.production) {
      return this.loadMockTransactions();
    }

    return this.http.get<Transaction[]>(this.transactionsUrl).pipe(
      tap(transactions => {
        this.transactions.set(transactions);
        this.refreshSummary().subscribe();
      }),
      catchError(error => throwError(() => error))
    );
  }

  addTransaction(transaction: Omit<Transaction, 'id'>): Observable<Transaction> {
    if (environment.useMockTransactions && !environment.production) {
      const created: Transaction = { ...transaction, id: Date.now() };
      this.transactions.update(prev => [created, ...prev]);
      this.applySummaryFromTransactions();
      return of(created);
    }

    return this.http.post<Transaction>(this.transactionsUrl, transaction).pipe(
      tap(created => {
        this.transactions.update(prev => [created, ...prev]);
        this.refreshSummary().subscribe();
      }),
      catchError(error => throwError(() => error))
    );
  }

  getTransactions() {
    return this.transactions;
  }

  getCategoryTotals() {
    this.transactions();
    return this.categoryTotals();
  }

  getDailyTotals() {
    this.transactions();
    return this.dailyTotals();
  }

  private loadMockTransactions(): Observable<Transaction[]> {
    const mockTransactions = MOCK_TRANSACTIONS.map((transaction, index) => ({
      ...transaction,
      id: index + 1
    }));

    this.transactions.set(mockTransactions);
    this.applySummaryFromTransactions();

    return of(mockTransactions);
  }

  private refreshSummary(): Observable<void> {
    return this.http.get<TransactionSummaryResponse>(this.summaryUrl).pipe(
      tap(summary => {
        this.categoryTotals.set(summary.categoryTotals);
        this.dailyTotals.set(summary.dailyTotals);
      }),
      map(() => undefined),
      catchError(() => {
        this.applySummaryFromTransactions();
        return of(undefined);
      })
    );
  }

  private applySummaryFromTransactions(): void {
    this.categoryTotals.set(computeCategoryTotals(this.transactions()));
    this.dailyTotals.set(computeDailyTotals(this.transactions()));
  }
}

function computeCategoryTotals(transactions: Transaction[]): Record<string, number> {
  return transactions.reduce((acc, curr) => {
    if (curr.type === 'expense') {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    }
    return acc;
  }, {} as Record<string, number>);
}

function computeDailyTotals(transactions: Transaction[]): DailyTotal[] {
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
        .reduce((sum, t) => sum + t.amount, 0)
    };
  });
}
