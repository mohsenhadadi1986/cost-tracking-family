import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionService } from '../services/transaction.service';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2 class="page-title">Transactions</h2>
    <div *ngIf="loadError()" class="card status-banner status-error">
      {{ loadError() }}
    </div>
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
  transactions = this.transactionService.getFilteredTransactions();
  allTransactions = this.transactionService.getTransactions();
  loading = this.transactionService.getLoading();
  loadError = this.transactionService.getLoadError();

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
