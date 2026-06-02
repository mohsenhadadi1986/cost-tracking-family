import { Component } from '@angular/core';
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
          <tr *ngIf="!loading() && !loadError() && transactions().length === 0">
            <td colspan="5" class="empty-state">
              No transactions yet. Add one in the Insert Data tab.
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
  `
})
export class TableComponent {
  transactions = this.transactionService.getFilteredTransactions();
  loading = this.transactionService.getLoading();
  loadError = this.transactionService.getLoadError();

  constructor(private transactionService: TransactionService) {}
}
