import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionFilter } from '../models/transaction-filter.model';
import { TransactionService } from '../services/transaction.service';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2 class="page-title">Transactions</h2>
    <div *ngIf="showFilterBanner()" class="card status-banner status-info">
      <p class="filter-banner-title">Table reflects active filters</p>
      <p *ngIf="filterSummary()" class="filter-banner-detail">{{ filterSummary() }}</p>
    </div>
    <div *ngIf="loadError()" class="card status-banner status-error">
      {{ loadError() }}
    </div>
    <div class="table-shell">
      <div class="table-scroll">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="loading()">
                <td colspan="5" class="empty-state">Loading transactions…</td>
              </tr>
              <tr *ngIf="!loading() && !loadError() && allTransactions().length === 0">
                <td colspan="5" class="empty-state">
                  No transactions yet. Add one in the Insert Data tab.
                </td>
              </tr>
              <tr *ngIf="!loading() && !loadError() && allTransactions().length > 0 && transactions().length === 0">
                <td colspan="5" class="empty-state">
                  No transactions match these filters.
                </td>
              </tr>
              <tr *ngFor="let transaction of transactions()">
                <td data-label="Date">{{transaction.date | date:'mediumDate'}}</td>
                <td data-label="Category">{{transaction.category}}</td>
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
  `,
  styles: [`
    .filter-banner-title {
      margin: 0;
      font-weight: 600;
    }

    .filter-banner-detail {
      margin: var(--space-sm) 0 0;
      font-size: 0.875rem;
    }
  `]
})
export class TableComponent {
  transactions = this.transactionService.getFilteredTransactions();
  allTransactions = this.transactionService.getTransactions();
  loading = this.transactionService.getLoading();
  loadError = this.transactionService.getLoadError();
  activeFilter = this.transactionService.getActiveFilter();

  showFilterBanner = computed(() => this.activeFilter() !== null);

  filterSummary = computed(() => {
    const filter = this.activeFilter();
    return filter ? formatFilterSummary(filter) : '';
  });

  footerSummary = computed(() => {
    const rows = this.transactions();
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

  constructor(private transactionService: TransactionService) {}
}

function formatFilterSummary(filter: TransactionFilter): string {
  const parts: string[] = [];

  if (filter.startDate || filter.endDate) {
    const format = (date: string) =>
      new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    const start = filter.startDate ? format(filter.startDate) : 'any';
    const end = filter.endDate ? format(filter.endDate) : 'any';
    parts.push(`Date: ${start} – ${end}`);
  }

  if (filter.categories.length > 0) {
    parts.push(`Categories: ${filter.categories.join(', ')}`);
  }

  if (filter.type !== 'all') {
    const label = filter.type.charAt(0).toUpperCase() + filter.type.slice(1);
    parts.push(`Type: ${label}`);
  }

  return parts.join(' · ');
}
