import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, switchMap, tap, throwError } from 'rxjs';
import { MOCK_TRANSACTIONS } from '../data/mock-transactions';
import { TransactionFilter } from '../models/transaction-filter.model';
import { DailyTotal, TransactionSummaryResponse } from '../models/transaction-summary.model';
import { Transaction } from '../models/transaction.model';
import { AccountService } from './account.service';
import { PlanService } from './plan.service';
import { matchesFilter } from '../utils/matches-filter';
import { hasCustomSidebarDates, OverviewInterval, resolveOverviewRange } from '../utils/overview-interval';
import { resolveTransactionSettlement } from '../utils/credit-card';
import { buildSummary } from '../utils/period-totals';
import { environment } from '../../environments/environment';

const EMPTY_SUMMARY: TransactionSummaryResponse = {
  categoryTotals: {},
  incomeByCategory: {},
  dailyTotals: [],
  totalIncome: 0,
  totalExpense: 0,
  netBalance: 0,
  currentBalance: 0,
  accountBalances: [],
  incomeByAccount: [],
  expenseByAccount: [],
  creditCardDues: [],
  plannedDues: [],
  plannedDueTotal: 0,
  availableThisMonth: 0,
};

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private readonly http = inject(HttpClient);
  private readonly accountService = inject(AccountService);
  private readonly planService = inject(PlanService);
  private readonly transactionsUrl = `${environment.apiBaseUrl}/api/transactions`;
  private readonly summaryUrl = `${this.transactionsUrl}/summary`;

  private transactions = signal<Transaction[]>([]);
  private activeFilter = signal<TransactionFilter | null>(null);
  private overviewInterval = signal<OverviewInterval>('month');
  private filteredTransactions = computed(() => {
    const filter = this.activeFilter();
    const all = this.transactions();
    if (filter === null || !this.isMockMode()) {
      return all;
    }
    return all.filter(transaction => matchesFilter(transaction, filter));
  });
  private summary = signal<TransactionSummaryResponse>(EMPTY_SUMMARY);
  private summaryRequestId = 0;
  private loading = signal(true);
  private loadError = signal<string | null>(null);
  private submitting = signal(false);
  private submitError = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.accountService.getAccounts()();
      this.planService.getPlans()();
      this.applySummaryFromTransactions();
    }, { allowSignalWrites: true });
    this.loadTransactions().subscribe();
  }

  loadTransactions(): Observable<Transaction[]> {
    this.loading.set(true);
    this.loadError.set(null);

    const source$ =
      this.isMockMode()
        ? this.loadMockTransactions()
        : this.http.get<Transaction[]>(this.transactionsUrl, this.httpOptionsWithFilter()).pipe(
            tap(transactions => this.transactions.set(transactions)),
            switchMap(transactions => this.refreshSummary().pipe(map(() => transactions)))
          );

    return source$.pipe(
      catchError(error => {
        this.loadError.set(toUserFriendlyMessage(error));
        return of([]);
      }),
      finalize(() => this.loading.set(false))
    );
  }

  addTransaction(
    transaction: Omit<Transaction, 'id' | 'settlementDate' | 'settlementAccount'>
  ): Observable<Transaction> {
    this.submitting.set(true);
    this.submitError.set(null);

    const source$ =
      this.isMockMode()
        ? (() => {
            const created: Transaction = {
              ...transaction,
              ...resolveTransactionSettlement(transaction, this.accountService.getAccounts()()),
              id: Date.now(),
            };
            this.transactions.update(prev => [created, ...prev]);
            this.applySummaryFromTransactions();
            return of(created);
          })()
        : this.http.post<Transaction>(this.transactionsUrl, transaction).pipe(
            tap(created => {
              if (this.hasActiveFilters()) {
                this.loadTransactions().subscribe();
              } else {
                this.transactions.update(prev => [created, ...prev]);
                this.refreshSummary().subscribe();
              }
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

  updateTransaction(
    id: number,
    transaction: Omit<Transaction, 'id' | 'settlementDate' | 'settlementAccount'>
  ): Observable<Transaction> {
    this.submitting.set(true);
    this.submitError.set(null);

    const source$ =
      this.isMockMode()
        ? (() => {
            const updated: Transaction = {
              ...transaction,
              ...resolveTransactionSettlement(transaction, this.accountService.getAccounts()()),
              id,
            };
            this.transactions.update(prev =>
              prev.map(row => (row.id === id ? updated : row))
            );
            this.applySummaryFromTransactions();
            return of(updated);
          })()
        : this.http.patch<Transaction>(`${this.transactionsUrl}/${id}`, transaction).pipe(
            tap(updated => {
              this.transactions.update(prev =>
                prev.map(row => (row.id === updated.id ? updated : row))
              );
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

  deleteTransaction(id: number): Observable<void> {
    this.submitting.set(true);
    this.submitError.set(null);

    const source$ =
      this.isMockMode()
        ? (() => {
            this.transactions.update(prev => prev.filter(row => row.id !== id));
            this.applySummaryFromTransactions();
            return of(undefined);
          })()
        : this.http.delete(`${this.transactionsUrl}/${id}`).pipe(
            map(() => undefined),
            tap(() => {
              this.transactions.update(prev => prev.filter(row => row.id !== id));
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

  getOverviewInterval() {
    return this.overviewInterval.asReadonly();
  }

  setOverviewInterval(interval: OverviewInterval): void {
    this.overviewInterval.set(interval);
    this.applySummaryFromTransactions();
    if (!this.isMockMode()) {
      this.refreshSummary().subscribe();
    }
  }

  usesSidebarDateRange(): boolean {
    return hasCustomSidebarDates(this.activeFilter());
  }

  setFilters(filter: TransactionFilter): void {
    this.activeFilter.set(filter);
    if (!this.isMockMode()) {
      this.loadTransactions().subscribe();
    } else {
      this.applySummaryFromTransactions();
    }
  }

  clearFilters(): void {
    this.activeFilter.set(null);
    if (!this.isMockMode()) {
      this.loadTransactions().subscribe();
    } else {
      this.applySummaryFromTransactions();
    }
  }

  hasActiveFilters(): boolean {
    return this.activeFilter() !== null;
  }

  getSummary() {
    return this.summary.asReadonly();
  }

  getCategoryTotals() {
    return this.summary().categoryTotals;
  }

  getDailyTotals(): DailyTotal[] {
    return this.summary().dailyTotals;
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

  clearSubmitError() {
    this.submitError.set(null);
  }

  private isMockMode(): boolean {
    return environment.useMockTransactions && !environment.production;
  }

  private httpOptionsWithFilter(): { params?: HttpParams } {
    const params = buildFilterParams(this.activeFilter());
    return params ? { params } : {};
  }

  private overviewSummaryParams(): { params: HttpParams } {
    const filter = this.activeFilter();
    const range = resolveOverviewRange(this.overviewInterval(), filter);
    let params = new HttpParams()
      .set('startDate', range.startDate)
      .set('endDate', range.endDate);

    if (filter) {
      for (const category of filter.categories) {
        params = params.append('categories', category);
      }

      if (filter.type !== 'all') {
        params = params.set('type', filter.type);
      }
    }

    return { params };
  }

  private loadMockTransactions(): Observable<Transaction[]> {
    const mockTransactions = MOCK_TRANSACTIONS.map((transaction, index) => ({
      ...transaction,
      settlementDate: transaction.settlementDate ?? transaction.date,
      settlementAccount: transaction.settlementAccount ?? transaction.account,
      id: index + 1
    }));

    this.transactions.set(mockTransactions);
    this.applySummaryFromTransactions();

    return of(mockTransactions);
  }

  private refreshSummary(): Observable<void> {
    const requestId = ++this.summaryRequestId;

    if (this.isMockMode()) {
      this.applySummaryFromTransactions();
      return of(undefined);
    }

    return this.http.get<TransactionSummaryResponse>(this.summaryUrl, this.overviewSummaryParams()).pipe(
      tap(summary => {
        if (requestId === this.summaryRequestId) {
          this.summary.set(summary);
        }
      }),
      map(() => undefined),
      catchError(() => {
        if (requestId === this.summaryRequestId) {
          this.applySummaryFromTransactions();
        }
        return of(undefined);
      })
    );
  }

  private applySummaryFromTransactions(): void {
    const filter = this.activeFilter();
    const range = resolveOverviewRange(this.overviewInterval(), filter);
    const rows = this.filteredTransactions().filter(transaction =>
      transaction.date >= range.startDate && transaction.date <= range.endDate
    );
    this.summary.set(buildSummary(rows, range.startDate, range.endDate, {
      lifetimeTransactions: this.transactions(),
      accounts: this.accountService.getAccounts()().map(account => ({
        name: account.name,
        kind: account.kind,
      })),
      plans: this.planService.getPlans()(),
    }));
  }
}

function buildFilterParams(filter: TransactionFilter | null): HttpParams | undefined {
  if (filter === null) {
    return undefined;
  }

  let params = new HttpParams();

  if (filter.startDate) {
    params = params.set('startDate', filter.startDate);
  }

  if (filter.endDate) {
    params = params.set('endDate', filter.endDate);
  }

  for (const category of filter.categories) {
    params = params.append('categories', category);
  }

  if (filter.type !== 'all') {
    params = params.set('type', filter.type);
  }

  return params.keys().length > 0 ? params : undefined;
}

function toUserFriendlyMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Unable to reach the server. Check your connection and try again.';
    }

    const body = error.error;
    if (body && typeof body === 'object') {
      if ('error' in body && typeof body.error === 'string') {
        return body.error;
      }
      if ('message' in body && typeof body.message === 'string') {
        return body.message;
      }
    }

    if (typeof body === 'string' && body.length > 0) {
      return body;
    }

    return `Something went wrong (${error.status}). Please try again.`;
  }

  return 'Something went wrong. Please try again.';
}
