import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from './ui/button.component';
import { CategoryMultiSelectComponent } from './ui/category-multi-select.component';
import { DateRangeFieldComponent } from './ui/date-range-field.component';
import { TransactionTypeFilterComponent } from './ui/transaction-type-filter.component';
import { AppLogoComponent } from './ui/app-logo.component';
import { TRANSACTION_CATEGORIES } from '../constants/categories';
import { TransactionFilter, TransactionTypeFilter } from '../models/transaction-filter.model';
import { TransactionService } from '../services/transaction.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    CategoryMultiSelectComponent,
    DateRangeFieldComponent,
    TransactionTypeFilterComponent,
    AppLogoComponent
  ],
  template: `
    <details
      class="sidebar sidebar-panel"
      [open]="filtersOpen"
      (toggle)="onFiltersToggle($event)">
      <summary class="sidebar-toggle" aria-label="Toggle transaction filters">
        <app-logo
          class="sidebar-toggle-mark"
          variant="mark"
          size="md"
          alt="Family Expense Manager">
        </app-logo>
        <span class="sidebar-toggle-label">Filters</span>
        <span class="sidebar-toggle-icon" aria-hidden="true"></span>
      </summary>

      <header class="sidebar-header">
        <div class="sidebar-brand">
          <app-logo variant="full" size="lg" alt="Family Expense Manager"></app-logo>
        </div>
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
          <div class="sidebar-fields">
            <app-category-multi-select
              label="Categories"
              [options]="categories"
              [(ngModel)]="selectedCategories">
            </app-category-multi-select>
          </div>
        </section>

        <section class="sidebar-section">
          <div class="sidebar-fields">
            <app-transaction-type-filter
              [(ngModel)]="selectedType">
            </app-transaction-type-filter>
          </div>
        </section>
      </div>

      <div class="sidebar-actions">
        <app-button type="button" variant="primary" (click)="applyFilters()" [disabled]="dateRangeInvalid">Apply Filters</app-button>
        <app-button type="button" variant="secondary" (click)="clearFilters()">Clear Filters</app-button>
      </div>
    </details>
  `
})
export class SidebarComponent implements OnInit, OnDestroy {
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
