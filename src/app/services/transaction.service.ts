import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, tap, throwError } from 'rxjs';
import { MOCK_TRANSACTIONS } from '../data/mock-transactions';
import { TransactionFilter } from '../models/transaction-filter.model';
import { DailyTotal, TransactionSummaryResponse } from '../models/transaction-summary.model';
import { Transaction } from '../models/transaction.model';
import { matchesFilter } from '../utils/matches-filter';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private readonly http = inject(HttpClient);
  private readonly transactionsUrl = `${environment.apiBaseUrl}/api/transactions`;
  private readonly summaryUrl = `${this.transactionsUrl}/summary`;

  private transactions = signal<Transaction[]>([]);
  private activeFilter = signal<TransactionFilter | null>(null);
  private filteredTransactions = computed(() => {
    const filter = this.activeFilter();
    const all = this.transactions();
    if (filter === null) {
      return all;
    }
    return all.filter(transaction => matchesFilter(transaction, filter));
  });
  private categoryTotals = signal<Record<string, number>>({});
  private dailyTotals = signal<DailyTotal[]>([]);
  private loading = signal(true);
  private loadError = signal<string | null>(null);
  private submitting = signal(false);
  private submitError = signal<string | null>(null);

  constructor() {
    this.loadTransactions().subscribe();
  }

  loadTransactions(): Observable<Transaction[]> {
    this.loading.set(true);
    this.loadError.set(null);

    const source$ =
      environment.useMockTransactions && !environment.production
        ? this.loadMockTransactions()
        : this.http.get<Transaction[]>(this.transactionsUrl).pipe(
            tap(transactions => {
              this.transactions.set(transactions);
              this.refreshSummary().subscribe();
            })
          );

    return source$.pipe(
      catchError(error => {
        this.loadError.set(toUserFriendlyMessage(error));
        return of([]);
      }),
      finalize(() => this.loading.set(false))
    );
  }

  addTransaction(transaction: Omit<Transaction, 'id'>): Observable<Transaction> {
    this.submitting.set(true);
    this.submitError.set(null);

    const source$ =
      environment.useMockTransactions && !environment.production
        ? (() => {
            const created: Transaction = { ...transaction, id: Date.now() };
            this.transactions.update(prev => [created, ...prev]);
            this.applySummaryFromTransactions();
            return of(created);
          })()
        : this.http.post<Transaction>(this.transactionsUrl, transaction).pipe(
            tap(created => {
              this.transactions.update(prev => [created, ...prev]);
              this.refreshSummary().subscribe();
            })
          );

    return source$.pipe(
      catchError(error => {
        this.submitError.set(toUserFriendlyMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.submitting.set(false))
    );
  }

  getTransactions() {
    return this.transactions;
  }

  getFilteredTransactions() {
    return this.filteredTransactions;
  }

  getActiveFilter() {
    return this.activeFilter.asReadonly();
  }

  setFilters(filter: TransactionFilter): void {
    this.activeFilter.set(filter);
  }

  clearFilters(): void {
    this.activeFilter.set(null);
  }

  hasActiveFilters(): boolean {
    return this.activeFilter() !== null;
  }

  getCategoryTotals() {
    this.activeFilter();
    return computeCategoryTotals(this.filteredTransactions());
  }

  getDailyTotals() {
    this.activeFilter();
    return computeDailyTotals(this.filteredTransactions());
  }

  getLoading() {
    return this.loading.asReadonly();
  }

  getLoadError() {
    return this.loadError.asReadonly();
  }

  getSubmitting() {
    return this.submitting.asReadonly();
  }

  getSubmitError() {
    return this.submitError.asReadonly();
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

function toUserFriendlyMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Unable to reach the server. Check your connection and try again.';
    }

    const body = error.error;
    if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
      return body.message;
    }

    if (typeof body === 'string' && body.length > 0) {
      return body;
    }

    return `Something went wrong (${error.status}). Please try again.`;
  }

  return 'Something went wrong. Please try again.';
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
