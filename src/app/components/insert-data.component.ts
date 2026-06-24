import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from './ui/button.component';
import { CategorySelectComponent } from './ui/category-select.component';
import { TransactionTypeSelectComponent, TransactionEntryType } from './ui/transaction-type-select.component';
import { DateFieldComponent } from './ui/date-field.component';
import { CategoryService } from '../services/category.service';
import { TransactionService } from '../services/transaction.service';

@Component({
  selector: 'app-insert-data',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    DateFieldComponent,
    CategorySelectComponent,
    TransactionTypeSelectComponent
  ],
  template: `
    <h2 class="page-title">Add Transaction</h2>
    <div *ngIf="categoriesLoadError()" class="card status-banner status-error form-card">
      {{ categoriesLoadError() }}
    </div>
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
        <app-transaction-type-select
          [ngModel]="newTransaction.type"
          (ngModelChange)="onTypeChange($event)"
          name="type"
          required
          [disabled]="submitting()">
        </app-transaction-type-select>
      </div>

      <div class="form-group">
        <app-category-select
          label="Category"
          [options]="categoryOptions()"
          [(ngModel)]="newTransaction.category"
          name="category"
          required
          [disabled]="submitting() || categoriesLoading()">
        </app-category-select>
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
  private transactionType = signal<TransactionEntryType>('expense');

  categoryOptions = computed(() => {
    const type = this.transactionType();
    return this.categoryService
      .getCategories()()
      .filter(category => category.type === type)
      .map(category => category.name);
  });

  categoriesLoading = this.categoryService.getLoading();
  categoriesLoadError = this.categoryService.getLoadError();
  submitting = this.transactionService.getSubmitting();
  submitError = this.transactionService.getSubmitError();

  newTransaction: {
    date: string;
    category: string;
    type: TransactionEntryType;
    amount: number;
    description: string;
  } = {
    date: new Date().toISOString().split('T')[0],
    category: '',
    type: 'expense',
    amount: 0,
    description: ''
  };

  constructor(
    private categoryService: CategoryService,
    private transactionService: TransactionService
  ) {}

  onTypeChange(type: TransactionEntryType) {
    this.newTransaction.type = type;
    this.transactionType.set(type);

    if (
      this.newTransaction.category &&
      !this.categoryOptions().includes(this.newTransaction.category)
    ) {
      this.newTransaction.category = '';
    }
  }

  onSubmit() {
    this.transactionService.addTransaction(this.newTransaction).subscribe({
      next: () => {
        this.newTransaction = {
          date: new Date().toISOString().split('T')[0],
          category: '',
          type: 'expense',
          amount: 0,
          description: ''
        };
        this.transactionType.set('expense');
      }
    });
  }
}
