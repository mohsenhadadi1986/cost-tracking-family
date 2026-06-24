import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../models/category.model';
import { TransactionService } from './transaction.service';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly transactionService = inject(TransactionService);
  private readonly categoriesUrl = `${environment.apiBaseUrl}/api/categories`;

  private categories = signal<Category[]>([]);
  private loading = signal(true);
  private loadError = signal<string | null>(null);
  private submitting = signal(false);
  private submitError = signal<string | null>(null);

  private expenseCategoryNames = computed(() =>
    this.categories()
      .filter(category => category.type === 'expense')
      .map(category => category.name)
  );

  private incomeCategoryNames = computed(() =>
    this.categories()
      .filter(category => category.type === 'income')
      .map(category => category.name)
  );

  private allCategoryNames = computed(() => this.categories().map(category => category.name));

  constructor() {
    this.loadCategories().subscribe();
  }

  loadCategories(): Observable<Category[]> {
    this.loading.set(true);
    this.loadError.set(null);

    return this.http.get<Category[]>(this.categoriesUrl).pipe(
      tap(categories => this.categories.set(categories)),
      catchError(error => {
        this.loadError.set(toUserFriendlyMessage(error));
        return of([]);
      }),
      finalize(() => this.loading.set(false))
    );
  }

  createCategory(request: CreateCategoryRequest): Observable<Category> {
    this.submitting.set(true);
    this.submitError.set(null);

    return this.http.post<Category>(this.categoriesUrl, request).pipe(
      tap(created => {
        this.categories.update(prev => [...prev, created].sort(compareCategories));
      }),
      catchError(error => {
        this.submitError.set(toUserFriendlyMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.submitting.set(false))
    );
  }

  updateCategory(id: number, request: UpdateCategoryRequest): Observable<Category> {
    this.submitting.set(true);
    this.submitError.set(null);

    return this.http.patch<Category>(`${this.categoriesUrl}/${id}`, request).pipe(
      tap(updated => {
        this.categories.update(prev =>
          prev.map(category => (category.id === updated.id ? updated : category)).sort(compareCategories)
        );
        this.transactionService.loadTransactions().subscribe();
      }),
      catchError(error => {
        this.submitError.set(toUserFriendlyMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.submitting.set(false))
    );
  }

  deleteCategory(id: number): Observable<void> {
    this.submitting.set(true);
    this.submitError.set(null);

    return this.http.delete(`${this.categoriesUrl}/${id}`).pipe(
      map(() => undefined),
      tap(() => {
        this.categories.update(prev => prev.filter(category => category.id !== id));
        this.transactionService.loadTransactions().subscribe();
      }),
      catchError(error => {
        this.submitError.set(toUserFriendlyMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.submitting.set(false))
    );
  }

  getCategories() {
    return this.categories.asReadonly();
  }

  getExpenseCategoryNames() {
    return this.expenseCategoryNames;
  }

  getIncomeCategoryNames() {
    return this.incomeCategoryNames;
  }

  getAllCategoryNames() {
    return this.allCategoryNames;
  }

  getCategoryNamesForType(type: Category['type']) {
    return type === 'income' ? this.incomeCategoryNames() : this.expenseCategoryNames();
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

  clearSubmitError(): void {
    this.submitError.set(null);
  }
}

function compareCategories(a: Category, b: Category): number {
  if (a.type !== b.type) {
    return a.type === 'expense' ? -1 : 1;
  }

  return a.name.localeCompare(b.name);
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
