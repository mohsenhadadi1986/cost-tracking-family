import { Component, computed, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from './ui/button.component';
import { CategorySelectComponent } from './ui/category-select.component';
import { TransactionTypeSelectComponent, TransactionEntryType } from './ui/transaction-type-select.component';
import { DateFieldComponent } from './ui/date-field.component';
import { CategoryService } from '../services/category.service';
import { ReceiptScanResponse } from '../models/receipt-scan.model';
import { ReceiptScanService } from '../services/receipt-scan.service';
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
    <div *ngIf="scanError()" class="card status-banner status-error form-card">
      {{ scanError() }}
    </div>
    <div *ngIf="submitError()" class="card status-banner status-error form-card">
      {{ submitError() }}
    </div>
    <div class="card form-card receipt-scan-card">
      <input
        #receiptInput
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        (change)="onReceiptSelected($event)">
      <app-button
        type="button"
        variant="secondary"
        [disabled]="scanning() || submitting()"
        (click)="receiptInput.click()">
        {{ scanning() ? 'Scanning…' : 'Scan receipt' }}
      </app-button>
      <div *ngIf="scanning()" class="card status-banner status-info receipt-scan-status">
        Scanning receipt…
      </div>
      <div *ngIf="receiptPreviewUrl()" class="receipt-preview">
        <img [src]="receiptPreviewUrl()" alt="Receipt preview">
      </div>
    </div>
    <form class="card form-card" (ngSubmit)="onSubmit()">
      <div class="form-group">
        <app-date-field
          label="Date"
          name="date"
          [(ngModel)]="newTransaction.date"
          [required]="true"
          [disabled]="formDisabled()">
        </app-date-field>
      </div>

      <div class="form-group">
        <app-transaction-type-select
          [ngModel]="newTransaction.type"
          (ngModelChange)="onTypeChange($event)"
          name="type"
          required
          [disabled]="formDisabled()">
        </app-transaction-type-select>
      </div>

      <div class="form-group">
        <app-category-select
          label="Category"
          [options]="categoryOptions()"
          [(ngModel)]="newTransaction.category"
          name="category"
          required
          [disabled]="formDisabled() || categoriesLoading()">
        </app-category-select>
      </div>

      <div class="form-group">
        <label>Amount</label>
        <input type="number" [(ngModel)]="newTransaction.amount" name="amount" required min="0" [disabled]="formDisabled()">
      </div>

      <div class="form-group">
        <label>Description</label>
        <input type="text" [(ngModel)]="newTransaction.description" name="description" required [disabled]="formDisabled()">
      </div>

      <app-button type="submit" variant="primary" [disabled]="formDisabled()">
        {{ submitting() ? 'Adding…' : 'Add Transaction' }}
      </app-button>
    </form>
  `,
  styles: [`
    .receipt-scan-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      margin-bottom: var(--space-md);
    }

    .receipt-scan-status {
      margin-bottom: 0;
    }

    .receipt-preview img {
      display: block;
      width: 100%;
      max-height: 240px;
      object-fit: contain;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background-color: var(--color-bg);
    }
  `]
})
export class InsertDataComponent implements OnDestroy {
  private transactionType = signal<TransactionEntryType>('expense');
  private previewObjectUrl: string | null = null;

  receiptPreviewUrl = signal<string | null>(null);

  categoryOptions = computed(() => {
    const type = this.transactionType();
    return this.categoryService
      .getCategories()()
      .filter(category => category.type === type)
      .map(category => category.name);
  });

  formDisabled = computed(() => this.submitting() || this.scanning());

  categoriesLoading = this.categoryService.getLoading();
  categoriesLoadError = this.categoryService.getLoadError();
  submitting = this.transactionService.getSubmitting();
  submitError = this.transactionService.getSubmitError();
  scanning = this.receiptScanService.getScanning();
  scanError = this.receiptScanService.getScanError();

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
    private receiptScanService: ReceiptScanService,
    private transactionService: TransactionService
  ) {}

  ngOnDestroy(): void {
    this.clearReceiptPreview();
  }

  onReceiptSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.setReceiptPreview(file);

    this.receiptScanService.scanReceipt(file).subscribe({
      next: result => this.applyScanResult(result)
    });

    input.value = '';
  }

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
        this.clearReceiptPreview();
      }
    });
  }

  private setReceiptPreview(file: File) {
    this.clearReceiptPreview();
    this.previewObjectUrl = URL.createObjectURL(file);
    this.receiptPreviewUrl.set(this.previewObjectUrl);
  }

  private clearReceiptPreview() {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    this.receiptPreviewUrl.set(null);
  }

  private applyScanResult(result: ReceiptScanResponse) {
    if (result.date) {
      this.newTransaction.date = result.date;
    }

    if (typeof result.amount === 'number') {
      this.newTransaction.amount = result.amount;
    }

    if (result.description) {
      this.newTransaction.description = result.description;
    }

    if (
      result.suggestedCategory &&
      this.categoryOptions().includes(result.suggestedCategory)
    ) {
      this.newTransaction.category = result.suggestedCategory;
    }
  }
}
