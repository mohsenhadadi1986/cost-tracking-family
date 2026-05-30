import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sidebar">
      <h2 class="sidebar-title">Family Expenses</h2>
      <p class="sidebar-subtitle">Filter transactions</p>

      <details
        class="sidebar-panel"
        [open]="filtersOpen"
        (toggle)="onFiltersToggle($event)">
        <summary class="sidebar-toggle">Filters</summary>

        <div class="select-container">
        <label>Date Range</label>
        <input type="date" [(ngModel)]="startDate">
        <input type="date" [(ngModel)]="endDate">
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

        <button (click)="applyFilters()">Apply Filters</button>
      </details>
    </div>
  `
})
export class SidebarComponent implements OnInit, OnDestroy {
  categories = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Salary', 'Investment'];
  startDate = '';
  endDate = '';
  selectedCategories: string[] = [];
  selectedType = 'all';
  filtersOpen = true;

  private mobileQuery = window.matchMedia('(max-width: 768px)');
  private readonly onMobileChange = (event: MediaQueryListEvent) => {
    this.filtersOpen = !event.matches;
  };

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
    // TODO: Implement filtering logic
    console.log('Filters:', {
      startDate: this.startDate,
      endDate: this.endDate,
      categories: this.selectedCategories,
      type: this.selectedType
    });
  }
}
