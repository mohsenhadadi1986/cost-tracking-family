import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreatePlanRequest, Plan, UpdatePlanRequest } from '../models/plan.model';

@Injectable({
  providedIn: 'root'
})
export class PlanService {
  private readonly http = inject(HttpClient);
  private readonly plansUrl = `${environment.apiBaseUrl}/api/plans`;

  private plans = signal<Plan[]>([]);
  private loading = signal(true);
  private loadError = signal<string | null>(null);
  private submitting = signal(false);
  private submitError = signal<string | null>(null);

  constructor() {
    this.loadPlans().subscribe();
  }

  loadPlans(): Observable<Plan[]> {
    this.loading.set(true);
    this.loadError.set(null);

    return this.http.get<Plan[]>(this.plansUrl).pipe(
      tap(plans => this.plans.set(plans)),
      catchError(error => {
        this.loadError.set(toUserFriendlyMessage(error));
        return of([]);
      }),
      finalize(() => this.loading.set(false))
    );
  }

  createPlan(request: CreatePlanRequest): Observable<Plan> {
    this.submitting.set(true);
    this.submitError.set(null);

    return this.http.post<Plan>(this.plansUrl, request).pipe(
      tap(created => {
        this.plans.update(prev => [...prev, created].sort(comparePlans));
      }),
      catchError(error => {
        this.submitError.set(toUserFriendlyMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.submitting.set(false))
    );
  }

  updatePlan(id: number, request: UpdatePlanRequest): Observable<Plan> {
    this.submitting.set(true);
    this.submitError.set(null);

    return this.http.patch<Plan>(`${this.plansUrl}/${id}`, request).pipe(
      tap(updated => {
        this.plans.update(prev =>
          prev.map(plan => (plan.id === updated.id ? updated : plan)).sort(comparePlans)
        );
      }),
      catchError(error => {
        this.submitError.set(toUserFriendlyMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.submitting.set(false))
    );
  }

  deletePlan(id: number): Observable<void> {
    this.submitting.set(true);
    this.submitError.set(null);

    return this.http.delete(`${this.plansUrl}/${id}`).pipe(
      map(() => undefined),
      tap(() => {
        this.plans.update(prev => prev.filter(plan => plan.id !== id));
      }),
      catchError(error => {
        this.submitError.set(toUserFriendlyMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.submitting.set(false))
    );
  }

  getPlans() {
    return this.plans.asReadonly();
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

function comparePlans(left: Plan, right: Plan): number {
  return left.name.localeCompare(right.name);
}
