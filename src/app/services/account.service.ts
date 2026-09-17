import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Account, CreateAccountRequest, UpdateAccountRequest } from '../models/account.model';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly accountsUrl = `${environment.apiBaseUrl}/api/accounts`;

  private accounts = signal<Account[]>([]);
  private loading = signal(true);
  private loadError = signal<string | null>(null);
  private submitting = signal(false);
  private submitError = signal<string | null>(null);

  constructor() {
    this.loadAccounts().subscribe();
  }

  loadAccounts(): Observable<Account[]> {
    this.loading.set(true);
    this.loadError.set(null);

    return this.http.get<Account[]>(this.accountsUrl).pipe(
      tap(accounts => this.accounts.set(accounts)),
      catchError(error => {
        this.loadError.set(toUserFriendlyMessage(error));
        return of([]);
      }),
      finalize(() => this.loading.set(false))
    );
  }

  createAccount(request: CreateAccountRequest): Observable<Account> {
    this.submitting.set(true);
    this.submitError.set(null);

    return this.http.post<Account>(this.accountsUrl, request).pipe(
      tap(created => {
        this.accounts.update(prev => [...prev, created].sort(compareAccounts));
      }),
      catchError(error => {
        this.submitError.set(toUserFriendlyMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.submitting.set(false))
    );
  }

  updateAccount(id: number, request: UpdateAccountRequest): Observable<Account> {
    this.submitting.set(true);
    this.submitError.set(null);

    return this.http.patch<Account>(`${this.accountsUrl}/${id}`, request).pipe(
      tap(updated => {
        this.accounts.update(prev =>
          prev.map(account => (account.id === updated.id ? updated : account)).sort(compareAccounts)
        );
      }),
      catchError(error => {
        this.submitError.set(toUserFriendlyMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.submitting.set(false))
    );
  }

  deleteAccount(id: number): Observable<void> {
    this.submitting.set(true);
    this.submitError.set(null);

    return this.http.delete(`${this.accountsUrl}/${id}`).pipe(
      map(() => undefined),
      tap(() => {
        this.accounts.update(prev => prev.filter(account => account.id !== id));
      }),
      catchError(error => {
        this.submitError.set(toUserFriendlyMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.submitting.set(false))
    );
  }

  getAccounts() {
    return this.accounts.asReadonly();
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
}

function toUserFriendlyMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Unable to reach the server. Check your connection and try again.';
    }

    const body = error.error;
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
      return body.error;
    }

    if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
      return body.message;
    }

    return `Something went wrong (${error.status}). Please try again.`;
  }

  return 'Something went wrong. Please try again.';
}

function compareAccounts(left: Account, right: Account): number {
  return left.name.localeCompare(right.name);
}
