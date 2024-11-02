import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionService } from '../services/transaction.service';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule],
  template: `
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
        <tr *ngFor="let transaction of transactions()">
          <td>{{transaction.date | date:'mediumDate'}}</td>
          <td>{{transaction.category}}</td>
          <td>{{transaction.type}}</td>
          <td>{{transaction.amount | currency}}</td>
          <td>{{transaction.description}}</td>
        </tr>
      </tbody>
    </table>
  `
})
export class TableComponent {
  transactions = this.transactionService.getTransactions();

  constructor(private transactionService: TransactionService) {}
}