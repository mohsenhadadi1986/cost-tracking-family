import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiHealthService {
  private readonly http = inject(HttpClient);
  private readonly healthUrl = `${environment.apiBaseUrl}/api/health`;

  check() {
    return this.http.get<{ status: string }>(this.healthUrl);
  }
}
