import { Component, computed, effect, OnDestroy, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from './ui/button.component';
import { CategorySelectComponent } from './ui/category-select.component';
import { TransactionTypeSelectComponent, TransactionEntryType } from './ui/transaction-type-select.component';
import { DateFieldComponent } from './ui/date-field.component';
import { Account } from '../models/account.model';
import { AccountService } from '../services/account.service';
import { CategoryService } from '../services/category.service';
import { ReceiptScanResponse } from '../models/receipt-scan.model';
import { ReceiptScanService } from '../services/receipt-scan.service';
import { TransactionService } from '../services/transaction.service';
import { DEFAULT_ACCOUNT } from '../constants/accounts';
import { TRANSFER_CATEGORY } from '../models/transaction.model';
import { creditCardSettlementDate } from '../utils/credit-card';

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
  providers: [DatePipe],
  template: `
    <h2 class="page-title">Add Transaction</h2>
    <div *ngIf="categoriesLoadError()" class="card status-banner status-error form-card">
      {{ categoriesLoadError() }}
    </div>
    <div *ngIf="accountsLoadError()" class="card status-banner status-error form-card">
      {{ accountsLoadError() }}
    </div>
    <div *ngIf="scanError()" class="card status-banner status-error form-card">
      {{ scanError() }}
    </div>
    <div *ngIf="scanHint()" class="card status-banner status-info form-card">
      {{ scanHint() }}
    </div>
    <div *ngIf="submitError()" class="card status-banner status-error form-card">
      {{ submitError() }}
    </div>
    <div class="card form-card receipt-scan-card" *ngIf="newTransaction.type !== 'transfer'">
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
          [label]="newTransaction.type === 'transfer' ? 'From' : 'Place'"
          [placeholder]="newTransaction.type === 'transfer' ? 'Money leaves this place' : 'Where the money is'"
          [options]="placeOptions()"
          [(ngModel)]="newTransaction.account"
          name="account"
          required
          iconSet="place"
          [disabled]="formDisabled() || accountsLoading()">
        </app-category-select>
        <p *ngIf="settlementHint()" class="form-hint">{{ settlementHint() }}</p>
        <p *ngIf="newTransaction.type === 'transfer'" class="form-hint">
          Moves cash between places. It is not income or an expense.
        </p>
      </div>

      <div class="form-group" *ngIf="newTransaction.type === 'transfer'">
        <app-category-select
          label="To"
          placeholder="Money arrives here"
          [options]="placeOptions()"
          [(ngModel)]="newTransaction.toAccount"
          name="toAccount"
          required
          iconSet="place"
          [disabled]="formDisabled() || accountsLoading()">
        </app-category-select>
        <p *ngIf="samePlace()" class="form-hint">Choose a different place.</p>
      </div>

      <div class="form-group" *ngIf="newTransaction.type !== 'transfer'">
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
        <input
          type="text"
          [(ngModel)]="newTransaction.description"
          name="description"
          required
          [placeholder]="newTransaction.type === 'transfer' ? 'For example, moved savings' : ''"
          [disabled]="formDisabled()">
      </div>

      <app-button type="submit" variant="primary" [disabled]="formDisabled() || samePlace()">
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

    .form-hint {
      margin: var(--space-xs) 0 0;
      font-size: var(--font-size-sm);
      color: var(--color-muted);
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

  accountOptions = computed(() => this.accountService.getAccounts()().map(account => account.name));

  walletOptions = computed(() =>
    this.accountService
      .getAccounts()()
      .filter(account => account.kind !== 'credit')
      .map(account => account.name)
  );

  placeOptions = computed(() =>
    this.transactionType() === 'transfer' ? this.walletOptions() : this.accountOptions()
  );

  formDisabled = computed(() => this.submitting() || this.scanning());

  categoriesLoading = this.categoryService.getLoading();
  categoriesLoadError = this.categoryService.getLoadError();
  accountsLoading = this.accountService.getLoading();
  accountsLoadError = this.accountService.getLoadError();
  submitting = this.transactionService.getSubmitting();
  submitError = this.transactionService.getSubmitError();
  scanning = this.receiptScanService.getScanning();
  scanError = this.receiptScanService.getScanError();
  scanHint = signal<string | null>(null);

  newTransaction: {
    date: string;
    category: string;
    type: TransactionEntryType;
    amount: number;
    description: string;
    account: string;
    toAccount: string;
  } = {
    date: new Date().toISOString().split('T')[0],
    category: '',
    type: 'expense',
    amount: 0,
    description: '',
    account: '',
    toAccount: ''
  };

  constructor(
    private categoryService: CategoryService,
    private accountService: AccountService,
    private receiptScanService: ReceiptScanService,
    private transactionService: TransactionService,
    private datePipe: DatePipe
  ) {
    effect(() => {
      const type = this.transactionType();
      const names = type === 'transfer' ? this.walletOptions() : this.accountOptions();
      if (names.length === 0) {
        return;
      }

      if (!this.newTransaction.account || !names.includes(this.newTransaction.account)) {
        this.newTransaction.account = names.includes(DEFAULT_ACCOUNT) ? DEFAULT_ACCOUNT : names[0];
      }

      if (type === 'transfer') {
        this.ensureTransferDestination(names);
      }
    });
  }

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

    this.scanHint.set(null);

    this.receiptScanService.scanReceipt(file).subscribe({
      next: result => this.applyScanResult(result)
    });

    input.value = '';
  }

  onTypeChange(type: TransactionEntryType) {
    this.newTransaction.type = type;
    this.transactionType.set(type);

    if (type === 'transfer') {
      this.newTransaction.category = TRANSFER_CATEGORY;
      const wallets = this.walletOptions();
      if (!wallets.includes(this.newTransaction.account)) {
        this.newTransaction.account = wallets.includes(DEFAULT_ACCOUNT) ? DEFAULT_ACCOUNT : (wallets[0] ?? '');
      }
      this.ensureTransferDestination(wallets);
      return;
    }

    this.newTransaction.toAccount = '';
    if (
      this.newTransaction.category === TRANSFER_CATEGORY ||
      (this.newTransaction.category && !this.categoryOptions().includes(this.newTransaction.category))
    ) {
      this.newTransaction.category = '';
    }
  }

  samePlace(): boolean {
    return (
      this.newTransaction.type === 'transfer' &&
      this.newTransaction.account !== '' &&
      this.newTransaction.account === this.newTransaction.toAccount
    );
  }

  settlementHint(): string | null {
    if (this.newTransaction.type !== 'expense') {
      return null;
    }

    const place = this.selectedPlace();
    if (place?.kind !== 'credit') {
      return null;
    }

    const due = creditCardSettlementDate(this.newTransaction.date, place.billingDay ?? undefined);
    const dueLabel = this.datePipe.transform(due, 'mediumDate') ?? due;
    const bank = place.settlementAccount ?? 'your bank';
    return `Counts as an expense today. ${bank} will be charged on ${dueLabel}.`;
  }

  private selectedPlace(): Account | undefined {
    return this.accountService
      .getAccounts()()
      .find(account => account.name === this.newTransaction.account);
  }

  onSubmit() {
    if (this.samePlace()) {
      return;
    }

    const type = this.newTransaction.type;
    this.transactionService.addTransaction({
      date: this.newTransaction.date,
      category: type === 'transfer' ? TRANSFER_CATEGORY : this.newTransaction.category,
      type,
      amount: Number(this.newTransaction.amount),
      description: this.newTransaction.description,
      account: this.newTransaction.account,
      toAccount: type === 'transfer' ? this.newTransaction.toAccount : null,
    }).subscribe({
      next: () => {
        this.newTransaction = {
          date: new Date().toISOString().split('T')[0],
          category: '',
          type: 'expense',
          amount: 0,
          description: '',
          account: this.newTransaction.account,
          toAccount: ''
        };
        this.transactionType.set('expense');
        this.clearReceiptPreview();
        this.scanHint.set(null);
      }
    });
  }

  private ensureTransferDestination(wallets: string[]) {
    if (
      !this.newTransaction.toAccount ||
      this.newTransaction.toAccount === this.newTransaction.account ||
      !wallets.includes(this.newTransaction.toAccount)
    ) {
      this.newTransaction.toAccount = wallets.find(name => name !== this.newTransaction.account) ?? '';
    }
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

    this.scanHint.set(buildScanHint(result));
  }
}

function buildScanHint(result: ReceiptScanResponse): string {
  const parts: string[] = [];

  if (result.date) {
    parts.push(`date ${result.date}`);
  }

  if (typeof result.amount === 'number') {
    parts.push(`amount ${result.amount}`);
  }

  if (result.description) {
    parts.push(`“${result.description}”`);
  }

  if (result.suggestedCategory) {
    parts.push(`category ${result.suggestedCategory}`);
  }

  if (parts.length === 0) {
    const snippet = result.ocrText?.replace(/\s+/g, ' ').trim();
    return snippet
      ? `Could not extract fields. Text read: ${snippet.slice(0, 180)}`
      : 'Could not extract date, amount, or merchant. Check the image and fill the form manually.';
  }

  return `Scanned ${parts.join(', ')}. Review and correct before saving.`;
}
