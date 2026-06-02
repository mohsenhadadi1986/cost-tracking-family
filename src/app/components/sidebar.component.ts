import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from './ui/button.component';
import { TRANSACTION_CATEGORIES } from '../constants/categories';
import { TransactionFilter, TransactionTypeFilter } from '../models/transaction-filter.model';
import { TransactionService } from '../services/transaction.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <details
      class="sidebar sidebar-panel"
      [open]="filtersOpen"
      (toggle)="onFiltersToggle($event)">
      <summary class="sidebar-toggle">Filters</summary>

      <h2 class="sidebar-title">Family Expenses</h2>
      <p class="sidebar-subtitle">Filter transactions</p>

      <div class="select-container">
        <label>Date Range</label>
        <input type="date" [(ngModel)]="startDate">
        <input type="date" [(ngModel)]="endDate">
        <p *ngIf="dateRangeInvalid" class="filter-hint">Start date must be on or before end date.</p>
      </div>

      <div class="select-container">
        <label>Categories</label>
        <select multiple [(ngModel)]="selectedCategories">
          <option *ngFor="let category of categories" [value]="category">
            {{category}}
          </option>
        </select>
      </div>

      <div class="select-container">
        <label id="type-filter-label">Type</label>
        <div class="type-filter" role="group" aria-labelledby="type-filter-label">
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

      <app-button type="button" variant="primary" (click)="applyFilters()" [disabled]="dateRangeInvalid">Apply Filters</app-button>
      <app-button type="button" variant="secondary" (click)="clearFilters()">Clear Filters</app-button>
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

    .filter-hint {
      margin: var(--space-sm) 0 0;
      font-size: 0.8125rem;
      color: var(--color-expense);
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
