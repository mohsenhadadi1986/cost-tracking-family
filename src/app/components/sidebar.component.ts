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
      <summary class="sidebar-toggle">Filters</summary>

      <h2 class="sidebar-title">Family Expenses</h2>
      <p class="sidebar-subtitle">Filter transactions</p>

      <div class="select-container">
        <app-date-range-field
          label="Date Range"
          [(startDate)]="startDate"
          [(endDate)]="endDate">
        </app-date-range-field>
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
        <label>Type</label>
        <select [(ngModel)]="selectedType">
          <option value="all">All</option>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>

      <app-button type="button" variant="primary" (click)="applyFilters()" [disabled]="dateRangeInvalid">Apply Filters</app-button>
      <app-button type="button" variant="secondary" (click)="clearFilters()">Clear Filters</app-button>
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
