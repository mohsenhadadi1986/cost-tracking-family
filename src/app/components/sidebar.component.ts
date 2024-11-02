import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sidebar">
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
    </div>
  `
})
export class SidebarComponent {
  categories = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Salary', 'Investment'];
  startDate = '';
  endDate = '';
  selectedCategories: string[] = [];
  selectedType = 'all';

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