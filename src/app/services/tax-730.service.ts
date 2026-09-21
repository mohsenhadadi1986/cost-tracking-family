import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Tax730Filing,
  Tax730YearOption,
  TaxFilingOverrides,
} from '../models/tax-730.model';

@Injectable({
  providedIn: 'root',
})
export class Tax730Service {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/tax/730`;

  private years = signal<Tax730YearOption[]>([]);
  private filing = signal<Tax730Filing | null>(null);
  private loading = signal(false);
  private uploading = signal(false);
  private exporting = signal(false);
  private error = signal<string | null>(null);

  getYears() {
    return this.years.asReadonly();
  }

  getFiling() {
    return this.filing.asReadonly();
  }

  getLoading() {
    return this.loading.asReadonly();
  }

  getUploading() {
    return this.uploading.asReadonly();
  }

  getExporting() {
    return this.exporting.asReadonly();
  }

  getError() {
    return this.error.asReadonly();
  }

  clearError(): void {
    this.error.set(null);
  }

  loadYears(): Observable<Tax730YearOption[]> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<Tax730YearOption[]>(`${this.baseUrl}/years`).pipe(
      tap(years => this.years.set(years)),
      catchError(error => {
        this.error.set(toUserFriendlyMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.loading.set(false))
    );
  }

  loadFiling(year: number): Observable<Tax730Filing> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<Tax730Filing>(`${this.baseUrl}/${year}`).pipe(
      tap(filing => this.filing.set(filing)),
      catchError(error => {
        this.error.set(toUserFriendlyMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.loading.set(false))
    );
  }

  uploadCu(year: number, file: File): Observable<Tax730Filing> {
    this.uploading.set(true);
    this.error.set(null);

    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<Tax730Filing>(`${this.baseUrl}/${year}/cu`, formData).pipe(
      tap(filing => this.filing.set(filing)),
      catchError(error => {
        this.error.set(toUserFriendlyMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.uploading.set(false))
    );
  }

  updateOverrides(year: number, overrides: TaxFilingOverrides): Observable<Tax730Filing> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.patch<Tax730Filing>(`${this.baseUrl}/${year}`, overrides).pipe(
      tap(filing => this.filing.set(filing)),
      catchError(error => {
        this.error.set(toUserFriendlyMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.loading.set(false))
    );
  }

  rematch(year: number): Observable<Tax730Filing> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.post<Tax730Filing>(`${this.baseUrl}/${year}/match`, {}).pipe(
      tap(filing => this.filing.set(filing)),
      catchError(error => {
        this.error.set(toUserFriendlyMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.loading.set(false))
    );
  }

  downloadExport(year: number, format: 'json' | 'xlsx' | 'pdf'): Observable<Blob> {
    this.exporting.set(true);
    this.error.set(null);

    return this.http.get(`${this.baseUrl}/${year}/export.${format}`, {
      responseType: 'blob',
    }).pipe(
      catchError(error => {
        this.error.set(toUserFriendlyMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.exporting.set(false))
    );
  }
}

function toUserFriendlyMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Unable to reach the server. Check your connection and try again.';
    }

    const body = error.error;
    if (body instanceof Blob) {
      return `Something went wrong (${error.status}). Upload the CU before exporting.`;
    }
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
