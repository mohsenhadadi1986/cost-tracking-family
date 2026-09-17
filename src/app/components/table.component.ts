import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterBannerComponent } from './filter-banner.component';
import { ButtonComponent } from './ui/button.component';
import { GlyphComponent } from './ui/glyph.component';
import { TransactionService } from '../services/transaction.service';
import { Transaction } from '../models/transaction.model';
import {
  TABLE_PAGE_SIZES,
  TableSortKey,
  buildTableView,
  searchTransactions,
} from '../utils/table-view';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule, FormsModule, FilterBannerComponent, ButtonComponent, GlyphComponent],
  template: `
    <h2 class="page-title">Transactions</h2>
    <app-filter-banner title="Table reflects active filters" />
    <div *ngIf="loadError()" class="card status-banner status-error">
      {{ loadError() }}
    </div>
    <div class="table-shell">
      <div class="table-toolbar" *ngIf="!loading() && !loadError()">
        <label class="table-search">
          <span class="table-toolbar__label">Search</span>
          <input
            type="search"
            [ngModel]="search()"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Place, category, or description"
            aria-label="Search transactions">
        </label>
        <label class="table-sort">
          <span class="table-toolbar__label">Sort</span>
          <select
            [ngModel]="sortKey()"
            (ngModelChange)="onSortKeyChange($event)"
            aria-label="Sort column">
            <option value="date">Date</option>
            <option value="account">Place</option>
            <option value="category">Category</option>
            <option value="type">Type</option>
            <option value="amount">Amount</option>
            <option value="description">Description</option>
          </select>
        </label>
        <app-button
          type="button"
          variant="secondary"
          size="sm"
          (click)="toggleSortDirection()">
          {{ sortDirection() === 'asc' ? 'Ascending' : 'Descending' }}
        </app-button>
        <label class="table-page-size">
          <span class="table-toolbar__label">Per page</span>
          <select
            [ngModel]="pageSize()"
            (ngModelChange)="onPageSizeChange($event)"
            aria-label="Rows per page">
            <option *ngFor="let size of pageSizes" [ngValue]="size">{{ size }}</option>
          </select>
        </label>
      </div>
      <div class="table-scroll">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>
                  <button type="button" class="table-sort-button" (click)="sortBy('date')">
                    Date <span class="table-sort-indicator">{{ sortIndicator('date') }}</span>
                  </button>
                </th>
                <th>
                  <button type="button" class="table-sort-button" (click)="sortBy('account')">
                    Place <span class="table-sort-indicator">{{ sortIndicator('account') }}</span>
                  </button>
                </th>
                <th>
                  <button type="button" class="table-sort-button" (click)="sortBy('category')">
                    Category <span class="table-sort-indicator">{{ sortIndicator('category') }}</span>
                  </button>
                </th>
                <th>
                  <button type="button" class="table-sort-button" (click)="sortBy('type')">
                    Type <span class="table-sort-indicator">{{ sortIndicator('type') }}</span>
                  </button>
                </th>
                <th>
                  <button type="button" class="table-sort-button" (click)="sortBy('amount')">
                    Amount <span class="table-sort-indicator">{{ sortIndicator('amount') }}</span>
                  </button>
                </th>
                <th>
                  <button type="button" class="table-sort-button" (click)="sortBy('description')">
                    Description <span class="table-sort-indicator">{{ sortIndicator('description') }}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="loading()">
                <td colspan="6" class="empty-state">Loading transactions…</td>
              </tr>
              <tr *ngIf="!loading() && !loadError() && allTransactions().length === 0">
                <td colspan="6" class="empty-state">
                  No transactions yet. Add one in the Insert Data tab.
                </td>
              </tr>
              <tr *ngIf="!loading() && !loadError() && allTransactions().length > 0 && tableView().filteredCount === 0">
                <td colspan="6" class="empty-state">
                  No transactions match these filters.
                </td>
              </tr>
              <tr *ngFor="let transaction of tableView().pageRows">
                <td data-label="Date">{{transaction.date | date:'mediumDate'}}</td>
                <td data-label="Place">
                  <span class="name-with-icon">
                    <app-glyph set="place" [name]="transaction.account"></app-glyph>
                    {{transaction.account}}
                  </span>
                  <p *ngIf="showsSettlement(transaction)" class="table-settlement">
                    Charged from {{ transaction.settlementAccount }} on {{ transaction.settlementDate | date:'mediumDate' }}
                  </p>
                </td>
                <td data-label="Category">
                  <span class="name-with-icon">
                    <app-glyph set="category" [name]="transaction.category"></app-glyph>
                    {{transaction.category}}
                  </span>
                </td>
                <td data-label="Type">
                  <span class="type-badge" [class.income]="transaction.type === 'income'" [class.expense]="transaction.type === 'expense'">
                    {{transaction.type}}
                  </span>
                </td>
                <td data-label="Amount" [class.amount-income]="transaction.type === 'income'" [class.amount-expense]="transaction.type === 'expense'">
                  {{transaction.amount | currency}}
                </td>
                <td data-label="Description">{{transaction.description}}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="table-pagination" *ngIf="showPagination()">
        <span class="table-pagination__status">
          Showing {{ tableView().rangeStart }}–{{ tableView().rangeEnd }} of {{ tableView().filteredCount }}
        </span>
        <div class="table-pagination__controls">
          <app-button
            type="button"
            variant="secondary"
            size="sm"
            [disabled]="tableView().page <= 1"
            (click)="goToPage(tableView().page - 1)">
            Previous
          </app-button>
          <span class="table-pagination__page">Page {{ tableView().page }} of {{ tableView().totalPages }}</span>
          <app-button
            type="button"
            variant="secondary"
            size="sm"
            [disabled]="tableView().page >= tableView().totalPages"
            (click)="goToPage(tableView().page + 1)">
            Next
          </app-button>
        </div>
      </div>
      <div
        *ngIf="showFooter()"
        class="table-footer"
        role="status"
        aria-live="polite">
        <span class="table-footer__item">
          <span class="table-footer__label">Transactions</span>
          <span class="table-footer__value">{{ footerSummary().count }}</span>
        </span>
        <span class="table-footer__item">
          <span class="table-footer__label">Income</span>
          <span class="table-footer__value amount-income">{{ footerSummary().totalIncome | currency }}</span>
        </span>
        <span class="table-footer__item">
          <span class="table-footer__label">Expense</span>
          <span class="table-footer__value amount-expense">{{ footerSummary().totalExpense | currency }}</span>
        </span>
        <span class="table-footer__item">
          <span class="table-footer__label">Net</span>
          <span
            class="table-footer__value"
            [class.amount-income]="footerSummary().netBalance >= 0"
            [class.amount-expense]="footerSummary().netBalance < 0">
            {{ footerSummary().netBalance | currency }}
          </span>
        </span>
      </div>
    </div>
  `
})
export class TableComponent {
  readonly pageSizes = TABLE_PAGE_SIZES;

  allTransactions = this.transactionService.getTransactions();
  loading = this.transactionService.getLoading();
  loadError = this.transactionService.getLoadError();

  search = signal('');
  sortKey = signal<TableSortKey>('date');
  sortDirection = signal<'asc' | 'desc'>('desc');
  page = signal(1);
  pageSize = signal<(typeof TABLE_PAGE_SIZES)[number]>(10);

  tableView = computed(() =>
    buildTableView(this.transactionService.getFilteredTransactions()(), {
      search: this.search(),
      sortKey: this.sortKey(),
      sortDirection: this.sortDirection(),
      page: this.page(),
      pageSize: this.pageSize(),
    })
  );

  footerSummary = computed(() => {
    const rows = searchTransactions(
      this.transactionService.getFilteredTransactions()(),
      this.search()
    );
    let totalIncome = 0;
    let totalExpense = 0;

    for (const transaction of rows) {
      if (transaction.type === 'income') {
        totalIncome += transaction.amount;
      } else {
        totalExpense += transaction.amount;
      }
    }

    return {
      count: rows.length,
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense
    };
  });

  showFooter = computed(
    () => !this.loading() && !this.loadError() && this.footerSummary().count > 0
  );

  showPagination = computed(
    () => !this.loading() && !this.loadError() && this.tableView().filteredCount > 0
  );

  constructor(private transactionService: TransactionService) {}

  showsSettlement(transaction: Transaction): boolean {
    return (
      transaction.type === 'expense' &&
      (transaction.settlementDate !== transaction.date ||
        transaction.settlementAccount !== transaction.account)
    );
  }

  onSearchChange(value: string) {
    this.search.set(value);
    this.page.set(1);
  }

  onSortKeyChange(value: TableSortKey) {
    this.sortKey.set(value);
    this.page.set(1);
  }

  onPageSizeChange(value: number) {
    this.pageSize.set(value as (typeof TABLE_PAGE_SIZES)[number]);
    this.page.set(1);
  }

  sortBy(key: TableSortKey) {
    if (this.sortKey() === key) {
      this.toggleSortDirection();
      return;
    }

    this.sortKey.set(key);
    this.sortDirection.set(key === 'date' ? 'desc' : 'asc');
    this.page.set(1);
  }

  toggleSortDirection() {
    this.sortDirection.update(direction => (direction === 'asc' ? 'desc' : 'asc'));
    this.page.set(1);
  }

  sortIndicator(key: TableSortKey): string {
    if (this.sortKey() !== key) {
      return '';
    }

    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  goToPage(page: number) {
    this.page.set(page);
  }
}
