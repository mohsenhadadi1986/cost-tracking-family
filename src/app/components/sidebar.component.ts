import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from './ui/button.component';
import { DateRangeFieldComponent } from './ui/date-range-field.component';
import { TRANSACTION_CATEGORIES } from '../constants/categories';
import { TransactionFilter, TransactionTypeFilter } from '../models/transaction-filter.model';
import { TransactionService } from '../services/transaction.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, DateRangeFieldComponent],
  template: `
    <details
      class="sidebar sidebar-panel"
      [open]="filtersOpen"
      (toggle)="onFiltersToggle($event)">
      <summary class="sidebar-toggle">
        <span class="sidebar-toggle-icon" aria-hidden="true"></span>
        <span class="sidebar-toggle-label">Filters</span>
      </summary>

      <header class="sidebar-header">
        <h2 class="sidebar-title">Family Expenses</h2>
        <p class="sidebar-subtitle">Filter transactions</p>
      </header>

      <div class="sidebar-body">
        <section class="sidebar-section">
          <h3 class="sidebar-section-label">Date Range</h3>
          <div class="sidebar-fields">
            <app-date-range-field
              [label]="''"
              [(startDate)]="startDate"
              [(endDate)]="endDate">
            </app-date-range-field>
          </div>
        </section>

        <section class="sidebar-section">
          <h3 class="sidebar-section-label">Categories</h3>
          <div class="sidebar-fields">
            <select multiple [(ngModel)]="selectedCategories" aria-label="Categories">
              <option *ngFor="let category of categories" [value]="category">
                {{category}}
              </option>
            </select>
          </div>
        </section>

        <section class="sidebar-section">
          <h3 class="sidebar-section-label">Type</h3>
          <div class="sidebar-fields">
            <div class="type-filter" role="group" aria-label="Transaction type">
              <app-button
                *ngFor="let option of typeOptions"
                type="button"
                variant="ghost"
                size="sm"
                [active]="selectedType === option.value"
                [attr.aria-pressed]="selectedType === option.value"
                (click)="selectedType = option.value">
                {{ option.label }}
              </app-button>
            </div>
          </div>
        </section>
      </div>

      <div class="sidebar-actions">
        <app-button type="button" variant="primary" (click)="applyFilters()" [disabled]="dateRangeInvalid">Apply Filters</app-button>
        <app-button type="button" variant="secondary" (click)="clearFilters()">Clear Filters</app-button>
      </div>
    </details>
  `,
  styles: [`
    .type-filter {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
      padding: var(--space-xs);
      background: var(--color-surface);
      border: 1px solid var(--color-border-input);
      border-radius: var(--radius-sm);
    }

    .type-filter app-button {
      flex: 1;
      min-width: fit-content;
    }
  `]
})
export class SidebarComponent implements OnInit, OnDestroy {
  readonly typeOptions: { value: TransactionTypeFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' },
  ];

  categories = [...TRANSACTION_CATEGORIES];
  startDate = '';
  endDate = '';
  selectedCategories: string[] = [];
  selectedType: TransactionTypeFilter = 'all';
  filtersOpen = true;

  private mobileQuery = window.matchMedia('(max-width: 768px)');
  private readonly onMobileChange = (event: MediaQueryListEvent) => {
    this.filtersOpen = !event.matches;
  };

  constructor(private transactionService: TransactionService) {}

  get dateRangeInvalid(): boolean {
    return !!(this.startDate && this.endDate && this.startDate > this.endDate);
  }

  ngOnInit() {
    this.filtersOpen = !this.mobileQuery.matches;
    this.mobileQuery.addEventListener('change', this.onMobileChange);
  }

  ngOnDestroy() {
    this.mobileQuery.removeEventListener('change', this.onMobileChange);
  }

  onFiltersToggle(event: Event) {
    this.filtersOpen = (event.target as HTMLDetailsElement).open;
  }

  applyFilters() {
    if (this.dateRangeInvalid) {
      return;
    }

    const filter: TransactionFilter = {
      startDate: this.startDate,
      endDate: this.endDate,
      categories: [...this.selectedCategories],
      type: this.selectedType
    };

    this.transactionService.setFilters(filter);
  }

  clearFilters() {
    this.startDate = '';
    this.endDate = '';
    this.selectedCategories = [];
    this.selectedType = 'all';
    this.transactionService.clearFilters();
  }
}
