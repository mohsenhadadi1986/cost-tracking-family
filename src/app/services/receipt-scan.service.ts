import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ReceiptScanResponse } from '../models/receipt-scan.model';

@Injectable({
  providedIn: 'root'
})
export class ReceiptScanService {
  private readonly http = inject(HttpClient);
  private readonly scanUrl = `${environment.apiBaseUrl}/api/receipts/scan`;

  private scanning = signal(false);
  private scanError = signal<string | null>(null);

  scanReceipt(file: File): Observable<ReceiptScanResponse> {
    this.scanning.set(true);
    this.scanError.set(null);

    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<ReceiptScanResponse>(this.scanUrl, formData).pipe(
      catchError(error => {
        this.scanError.set(toUserFriendlyMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.scanning.set(false))
    );
  }

  getScanning() {
    return this.scanning.asReadonly();
  }

  getScanError() {
    return this.scanError.asReadonly();
  }
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
