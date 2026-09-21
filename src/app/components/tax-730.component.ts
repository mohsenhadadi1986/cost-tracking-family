import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from './ui/button.component';
import { GlyphComponent } from './ui/glyph.component';
import { Tax730Service } from '../services/tax-730.service';
import { Tax730YearOption } from '../models/tax-730.model';
import { buildDeductionRows, deductionTotals } from '../utils/tax-730-view';

@Component({
  selector: 'app-tax-730',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, GlyphComponent],
  providers: [DatePipe],
  template: `
    <section class="card form-card settings-card tax-730-card">
      <h3 class="categories-section-title">730 tax check</h3>
      <p class="categories-section-copy">
        Upload last year’s Certificazione Unica. We read it, then check your
        {{ selectedOption()?.incomeYear ?? 'previous year' }} expenses against Italian tax rules
        and the CU. The table shows what can lower your tax. Nothing is sent to Agenzia delle Entrate.
      </p>

      <div *ngIf="error()" class="card status-banner status-error">
        {{ error() }}
      </div>

      <div class="form-group">
        <label for="tax-730-year">Year</label>
        <select
          id="tax-730-year"
          name="taxYear"
          [(ngModel)]="selectedYear"
          [disabled]="busy()"
          (ngModelChange)="onYearChange($event)">
          <option *ngFor="let year of years()" [ngValue]="year.dichiarazioneYear">
            {{ year.officialForm }} · expenses from {{ year.incomeYear }}
          </option>
        </select>
      </div>

      <p class="categories-section-copy" *ngIf="selectedOption() as option">
        Start with {{ option.officialCuLabel }} (income year {{ option.incomeYear }}).
      </p>

      <input
        #cuInput
        type="file"
        accept=".pdf,.xml,.txt,application/pdf,application/xml,text/xml,image/jpeg,image/png"
        hidden
        (change)="onCuSelected($event)">

      <div class="settings-actions">
        <app-button
          type="button"
          variant="secondary"
          [disabled]="busy() || !selectedYear"
          (click)="cuInput.click()">
          {{ cuFileName() || 'Choose CU file' }}
        </app-button>
        <app-button
          type="button"
          variant="primary"
          [disabled]="busy() || !selectedFile()"
          (click)="uploadCu()">
          {{ uploading() ? 'Reading CU…' : 'Read CU' }}
        </app-button>
      </div>

      <ng-container *ngIf="filing() as current">
        <div *ngIf="current.hasCu && current.cu" class="overview-cards tax-730-stats">
          <article class="overview-card">
            <h4 class="overview-card__label">Employment income</h4>
            <p class="overview-card__value">{{ euro(current.cu.redditoLavoroDipendente) }}</p>
            <p class="overview-card__hint">From the CU for {{ current.incomeYear }}</p>
          </article>
          <article class="overview-card">
            <h4 class="overview-card__label">Tax already withheld</h4>
            <p class="overview-card__value">{{ euro(current.cu.ritenute) }}</p>
            <p class="overview-card__hint" *ngIf="current.cu.codiceFiscale">{{ current.cu.codiceFiscale }}</p>
          </article>
          <article class="overview-card">
            <h4 class="overview-card__label">Estimated tax back</h4>
            <p class="overview-card__value amount-income">{{ euro(totals().taxBack) }}</p>
            <p class="overview-card__hint">From deductible expenses below</p>
          </article>
        </div>

        <div *ngIf="current.hasCu" class="table-wrapper tax-730-table">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Spent</th>
                <th>Counted</th>
                <th>Tax back</th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngFor="let row of deductionRows()">
                <tr>
                  <td data-label="Category">
                    <button
                      type="button"
                      class="tax-730-category"
                      [attr.aria-expanded]="expandedRuleId() === row.ruleId"
                      (click)="toggleRow(row.ruleId)">
                      <span class="name-with-icon">
                        <app-glyph set="category" [name]="row.category"></app-glyph>
                        {{ row.category }}
                      </span>
                    </button>
                    <p *ngIf="row.note" class="table-settlement">{{ row.note }}</p>
                  </td>
                  <td data-label="Spent">{{ euro(row.spent) }}</td>
                  <td data-label="Counted">{{ euro(row.counted) }}</td>
                  <td data-label="Tax back" class="amount-income">{{ euro(row.taxBack) }}</td>
                </tr>
                <tr *ngIf="expandedRuleId() === row.ruleId" class="tax-730-detail-row">
                  <td colspan="4">
                    <p *ngIf="row.expenses.length === 0" class="categories-section-copy">
                      Amount comes from the CU, not from a logged expense.
                    </p>
                    <ul *ngIf="row.expenses.length" class="tax-730-expenses">
                      <li *ngFor="let expense of row.expenses">
                        <span>{{ expense.date | date:'mediumDate' }} · {{ expense.description }}</span>
                        <span>{{ euro(expense.amount) }}</span>
                      </li>
                    </ul>
                  </td>
                </tr>
              </ng-container>
              <tr *ngIf="deductionRows().length === 0">
                <td colspan="4" class="empty-state">
                  No deductible {{ current.incomeYear }} expenses yet. Medical, school, sport,
                  education, mortgage interest, and home work can appear here.
                </td>
              </tr>
            </tbody>
          </table>
          <div *ngIf="deductionRows().length" class="table-footer" role="status">
            <span class="table-footer__item">
              <span class="table-footer__label">Spent</span>
              <span class="table-footer__value">{{ euro(totals().spent) }}</span>
            </span>
            <span class="table-footer__item">
              <span class="table-footer__label">Counted</span>
              <span class="table-footer__value">{{ euro(totals().counted) }}</span>
            </span>
            <span class="table-footer__item">
              <span class="table-footer__label">Tax back</span>
              <span class="table-footer__value amount-income">{{ euro(totals().taxBack) }}</span>
            </span>
          </div>
        </div>

        <div *ngIf="current.match?.needsReview?.length" class="tax-730-aside">
          <h4 class="tax-subtitle">Needs a look</h4>
          <p *ngFor="let row of current.match?.needsReview" class="categories-section-copy">
            {{ row.date | date:'mediumDate' }} · {{ row.category }} · {{ euro(row.grossAmount) }}
            — {{ row.reviewFlag }}
          </p>
        </div>

        <div *ngIf="current.match?.excluded?.length" class="tax-730-aside">
          <h4 class="tax-subtitle">Not counted</h4>
          <p *ngFor="let row of current.match?.excluded" class="categories-section-copy">
            {{ row.date | date:'mediumDate' }} · {{ row.category }} · {{ euro(row.grossAmount) }}
            — {{ row.skipReason }}
          </p>
        </div>

        <div class="settings-actions" *ngIf="current.hasCu">
          <app-button
            type="button"
            variant="secondary"
            [disabled]="!canExport() || busy()"
            (click)="download('xlsx')">
            Download Excel
          </app-button>
          <app-button
            type="button"
            variant="primary"
            [disabled]="!canExport() || busy()"
            (click)="download('pdf')">
            Download PDF
          </app-button>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }

    .tax-730-card {
      max-width: none;
      margin-bottom: var(--space-lg);
    }

    .categories-section-title {
      margin: 0 0 var(--space-md);
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
    }

    .categories-section-copy {
      margin: 0 0 var(--space-md);
      font-size: var(--font-size-sm);
      color: var(--color-muted);
    }

    .settings-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
      margin: var(--space-md) 0 0;
    }

    .tax-730-stats {
      margin-top: var(--space-lg);
    }

    .tax-730-table {
      margin-top: var(--space-md);
    }

    .tax-730-table table {
      min-width: 0;
    }

    .tax-730-category {
      display: block;
      margin: 0;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    .tax-730-category:focus-visible {
      outline: var(--focus-outline-width) solid var(--focus-outline-color);
      outline-offset: var(--focus-outline-offset);
      border-radius: var(--radius-sm);
    }

    .tax-730-detail-row td {
      background: var(--color-bg);
      padding-top: var(--space-sm);
      padding-bottom: var(--space-md);
    }

    .tax-730-expenses {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--space-xs);
    }

    .tax-730-expenses li {
      display: flex;
      justify-content: space-between;
      gap: var(--space-md);
      font-size: var(--font-size-sm);
    }

    .tax-subtitle {
      margin: var(--space-lg) 0 var(--space-sm);
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-semibold);
    }

    .tax-730-aside .categories-section-copy {
      margin-bottom: var(--space-xs);
    }

    @media (max-width: 768px) {
      .settings-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }

      .tax-730-table table {
        min-width: 100%;
      }
    }
  `]
})
export class Tax730Component implements OnInit {
  private readonly tax730 = inject(Tax730Service);

  selectedYear = 2026;

  readonly years = this.tax730.getYears();
  readonly filing = this.tax730.getFiling();
  readonly error = this.tax730.getError();
  readonly uploading = this.tax730.getUploading();
  readonly deductionRows = computed(() => buildDeductionRows(this.filing()));
  readonly totals = computed(() => deductionTotals(this.deductionRows()));

  private selectedFileSignal = signal<File | null>(null);
  private cuFileNameSignal = signal<string | null>(null);
  private expandedRuleIdSignal = signal<string | null>(null);

  selectedFile = this.selectedFileSignal.asReadonly();
  cuFileName = this.cuFileNameSignal.asReadonly();
  expandedRuleId = this.expandedRuleIdSignal.asReadonly();

  ngOnInit(): void {
    this.tax730.loadYears().subscribe({
      next: years => {
        const preferred = years.find(year => year.dichiarazioneYear === 2026) ?? years[0];
        if (preferred) {
          this.selectedYear = preferred.dichiarazioneYear;
          this.tax730.loadFiling(this.selectedYear).subscribe();
        }
      },
    });
  }

  busy(): boolean {
    return this.tax730.getLoading()() || this.uploading() || this.tax730.getExporting()();
  }

  selectedOption(): Tax730YearOption | undefined {
    return this.years().find(year => year.dichiarazioneYear === this.selectedYear);
  }

  canExport(): boolean {
    return Boolean(this.filing()?.hasCu);
  }

  onYearChange(year: number): void {
    this.selectedFileSignal.set(null);
    this.cuFileNameSignal.set(null);
    this.expandedRuleIdSignal.set(null);
    this.tax730.loadFiling(year).subscribe();
  }

  onCuSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFileSignal.set(file);
    this.cuFileNameSignal.set(file?.name ?? null);
    this.tax730.clearError();
  }

  uploadCu(): void {
    const file = this.selectedFile();
    if (!file || !this.selectedYear) {
      return;
    }

    this.tax730.uploadCu(this.selectedYear, file).subscribe();
  }

  toggleRow(ruleId: string): void {
    this.expandedRuleIdSignal.update(current => current === ruleId ? null : ruleId);
  }

  download(format: 'xlsx' | 'pdf'): void {
    if (!this.selectedYear) {
      return;
    }

    this.tax730.downloadExport(this.selectedYear, format).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `730-${this.selectedYear}.${format}`;
        link.click();
        URL.revokeObjectURL(url);
      },
    });
  }

  euro(value: number | undefined | null): string {
    if (value == null) {
      return '—';
    }
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
  }
}
