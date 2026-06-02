import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from './ui/button.component';
import { DateFieldComponent } from './ui/date-field.component';
import { TRANSACTION_CATEGORIES } from '../constants/categories';
import { TransactionService } from '../services/transaction.service';

@Component({
  selector: 'app-insert-data',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, DateFieldComponent],
  template: `
    <h2 class="page-title">Add Transaction</h2>
    <div *ngIf="submitError()" class="card status-banner status-error form-card">
      {{ submitError() }}
    </div>
    <form class="card form-card" (ngSubmit)="onSubmit()">
      <div class="form-group">
        <app-date-field
          label="Date"
          name="date"
          [(ngModel)]="newTransaction.date"
          [required]="true"
          [disabled]="submitting()">
        </app-date-field>
      </div>

      <div class="form-group">
        <label>Category</label>
        <select [(ngModel)]="newTransaction.category" name="category" required [disabled]="submitting()">
          <option *ngFor="let category of categories" [value]="category">
            {{category}}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>Type</label>
        <select [(ngModel)]="newTransaction.type" name="type" required [disabled]="submitting()">
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>

      <div class="form-group">
        <label>Amount</label>
        <input type="number" [(ngModel)]="newTransaction.amount" name="amount" required min="0" [disabled]="submitting()">
      </div>

      <div class="form-group">
        <label>Description</label>
        <input type="text" [(ngModel)]="newTransaction.description" name="description" required [disabled]="submitting()">
      </div>

      <app-button type="submit" variant="primary" [disabled]="submitting()">
        {{ submitting() ? 'Adding…' : 'Add Transaction' }}
      </app-button>
    </form>
  `
})
export class InsertDataComponent {
  categories = [...TRANSACTION_CATEGORIES];
  submitting = this.transactionService.getSubmitting();
  submitError = this.transactionService.getSubmitError();
  
  newTransaction = {
    date: new Date().toISOString().split('T')[0],
    category: '',
    type: 'expense' as const,
    amount: 0,
    description: ''
  };

  constructor(private transactionService: TransactionService) {}

  onSubmit() {
    this.transactionService.addTransaction(this.newTransaction).subscribe({
      next: () => {
        this.newTransaction = {
          date: new Date().toISOString().split('T')[0],
          category: '',
          type: 'expense' as const,
          amount: 0,
          description: ''
        };
      }
    });
  }
}
