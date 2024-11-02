import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../services/transaction.service';

@Component({
  selector: 'app-insert-data',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form (submit)="onSubmit()">
      <div class="form-group">
        <label>Date</label>
        <input type="date" [(ngModel)]="newTransaction.date" name="date" required>
      </div>

      <div class="form-group">
        <label>Category</label>
        <select [(ngModel)]="newTransaction.category" name="category" required>
          <option *ngFor="let category of categories" [value]="category">
            {{category}}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>Type</label>
        <select [(ngModel)]="newTransaction.type" name="type" required>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>

      <div class="form-group">
        <label>Amount</label>
        <input type="number" [(ngModel)]="newTransaction.amount" name="amount" required min="0">
      </div>

      <div class="form-group">
        <label>Description</label>
        <input type="text" [(ngModel)]="newTransaction.description" name="description" required>
      </div>

      <button type="submit">Add Transaction</button>
    </form>
  `
})
export class InsertDataComponent {
  categories = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Salary', 'Investment'];
  
  newTransaction = {
    date: new Date().toISOString().split('T')[0],
    category: '',
    type: 'expense' as const,
    amount: 0,
    description: ''
  };

  constructor(private transactionService: TransactionService) {}

  onSubmit() {
    this.transactionService.addTransaction(this.newTransaction);
    
    // Reset form
    this.newTransaction = {
      date: new Date().toISOString().split('T')[0],
      category: '',
      type: 'expense' as const,
      amount: 0,
      description: ''
    };
  }
}