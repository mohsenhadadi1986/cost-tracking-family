import { Component, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterBannerComponent } from './filter-banner.component';
import { ButtonComponent } from './ui/button.component';
import { CategorySelectComponent } from './ui/category-select.component';
import { DateFieldComponent } from './ui/date-field.component';
import { GlyphComponent } from './ui/glyph.component';
import { TransactionTypeSelectComponent, TransactionEntryType } from './ui/transaction-type-select.component';
import { Account } from '../models/account.model';
import { AccountService } from '../services/account.service';
import { CategoryService } from '../services/category.service';
import { TransactionService } from '../services/transaction.service';
import { Transaction } from '../models/transaction.model';
import { creditCardSettlementDate } from '../utils/credit-card';
import {
  TABLE_PAGE_SIZES,
  TableSortKey,
  buildTableView,
  searchTransactions,
} from '../utils/table-view';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FilterBannerComponent,
    ButtonComponent,
    CategorySelectComponent,
    DateFieldComponent,
    GlyphComponent,
    TransactionTypeSelectComponent
  ],
  providers: [DatePipe],
  template: `
    <h2 class="page-title">Transactions</h2>
    <app-filter-banner title="Table reflects active filters" />
    <div *ngIf="loadError()" class="card status-banner status-error">
      {{ loadError() }}
    </div>
    <div *ngIf="submitError()" class="card status-banner status-error">
      {{ submitError() }}
    </div>

    <form *ngIf="editing()" class="card form-card table-edit-card" (ngSubmit)="saveEdit()">
      <h3 class="table-edit-card__title">Edit transaction</h3>
      <div class="form-group">
        <app-date-field
          label="Date"
          name="editDate"
          [(ngModel)]="editForm.date"
          [required]="true"
          [disabled]="submitting()">
        </app-date-field>
      </div>
      <div class="form-group">
        <app-transaction-type-select
          [ngModel]="editForm.type"
          (ngModelChange)="onEditTypeChange($event)"
          name="editType"
          required
          [disabled]="submitting()">
        </app-transaction-type-select>
      </div>
      <div class="form-group">
        <app-category-select
          label="Place"
          placeholder="Where the money is"
          [options]="accountOptions()"
          [(ngModel)]="editForm.account"
          name="editAccount"
          required
          iconSet="place"
          [disabled]="submitting()">
        </app-category-select>
        <p *ngIf="settlementHint()" class="form-hint">{{ settlementHint() }}</p>
      </div>
      <div class="form-group">
        <app-category-select
          label="Category"
          [options]="categoryOptions()"
          [(ngModel)]="editForm.category"
          name="editCategory"
          required
          [disabled]="submitting()">
        </app-category-select>
      </div>
      <div class="form-group">
        <label for="edit-amount">Amount</label>
        <input
          id="edit-amount"
          type="number"
          min="0.01"
          step="0.01"
          [(ngModel)]="editForm.amount"
          name="editAmount"
          required
          [disabled]="submitting()">
      </div>
      <div class="form-group">
        <label for="edit-description">Description</label>
        <input
          id="edit-description"
          type="text"
          [(ngModel)]="editForm.description"
          name="editDescription"
          required
          [disabled]="submitting()">
      </div>
      <div class="settings-actions">
        <app-button type="submit" variant="primary" [disabled]="submitting() || !canSaveEdit()">
          {{ submitting() ? 'Saving…' : 'Save' }}
        </app-button>
        <app-button type="button" variant="secondary" [disabled]="submitting()" (click)="cancelEdit()">
          Cancel
        </app-button>
        <app-button type="button" variant="secondary" [disabled]="submitting()" (click)="deleteEditing()">
          Delete
        </app-button>
      </div>
    </form>

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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="loading()">
                <td colspan="7" class="empty-state">Loading transactions…</td>
              </tr>
              <tr *ngIf="!loading() && !loadError() && allTransactions().length === 0">
                <td colspan="7" class="empty-state">
                  No transactions yet. Add one in the Insert Data tab.
                </td>
              </tr>
              <tr *ngIf="!loading() && !loadError() && allTransactions().length > 0 && tableView().filteredCount === 0">
                <td colspan="7" class="empty-state">
                  No transactions match these filters.
                </td>
              </tr>
              <tr
                *ngFor="let transaction of tableView().pageRows"
                [class.table-row--editing]="editing()?.id === transaction.id">
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
                <td data-label="Actions">
                  <app-button
                    type="button"
                    variant="secondary"
                    size="sm"
                    [disabled]="submitting()"
                    (click)="startEdit(transaction)">
                    Edit
                  </app-button>
                </td>
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
  `,
  styles: [`
    .table-edit-card {
      margin-bottom: var(--space-lg);
    }

    .table-edit-card__title {
      margin: 0 0 var(--space-md);
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
    }

    .form-hint {
      margin: var(--space-xs) 0 0;
      font-size: var(--font-size-sm);
      color: var(--color-muted);
    }

    .settings-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
    }

    .table-row--editing {
      outline: 2px solid var(--color-primary);
      outline-offset: -2px;
    }

    @media (max-width: 768px) {
      .settings-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }

      .settings-actions app-button:first-child {
        grid-column: 1 / -1;
      }
    }
  `]
})
export class TableComponent {
  readonly pageSizes = TABLE_PAGE_SIZES;

  allTransactions = this.transactionService.getTransactions();
  loading = this.transactionService.getLoading();
  loadError = this.transactionService.getLoadError();
  submitting = this.transactionService.getSubmitting();
  submitError = this.transactionService.getSubmitError();

  editing = signal<Transaction | null>(null);
  editType = signal<TransactionEntryType>('expense');
  editForm = {
    date: '',
    category: '',
    type: 'expense' as TransactionEntryType,
    amount: 0,
    description: '',
    account: '',
  };

  accountOptions = computed(() => this.accountService.getAccounts()().map(account => account.name));

  categoryOptions = computed(() =>
    this.categoryService
      .getCategories()()
      .filter(category => category.type === this.editType())
      .map(category => category.name)
  );

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

  constructor(
    private transactionService: TransactionService,
    private accountService: AccountService,
    private categoryService: CategoryService,
    private datePipe: DatePipe
  ) {}

  startEdit(transaction: Transaction) {
    this.transactionService.clearSubmitError();
    this.editing.set(transaction);
    this.editType.set(transaction.type);
    this.editForm = {
      date: transaction.date,
      category: transaction.category,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      account: transaction.account,
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.editing.set(null);
    this.transactionService.clearSubmitError();
  }

  onEditTypeChange(type: TransactionEntryType) {
    this.editForm.type = type;
    this.editType.set(type);
    if (this.editForm.category && !this.categoryOptions().includes(this.editForm.category)) {
      this.editForm.category = '';
    }
  }

  canSaveEdit(): boolean {
    return (
      this.editForm.date.trim() !== ''
      && this.editForm.account.trim() !== ''
      && this.editForm.category.trim() !== ''
      && this.editForm.description.trim() !== ''
      && this.editForm.amount > 0
    );
  }

  saveEdit() {
    const current = this.editing();
    if (!current || !this.canSaveEdit()) {
      return;
    }

    this.transactionService.updateTransaction(current.id, {
      date: this.editForm.date,
      category: this.editForm.category,
      type: this.editForm.type,
      amount: Number(this.editForm.amount),
      description: this.editForm.description.trim(),
      account: this.editForm.account,
    }).subscribe({
      next: () => this.cancelEdit()
    });
  }

  deleteEditing() {
    const current = this.editing();
    if (!current) {
      return;
    }

    this.deleteTransaction(current);
  }

  deleteTransaction(transaction: Transaction) {
    const confirmed = window.confirm(`Delete this ${transaction.type} of ${transaction.amount} (${transaction.description})?`);
    if (!confirmed) {
      return;
    }

    this.transactionService.deleteTransaction(transaction.id).subscribe({
      next: () => {
        if (this.editing()?.id === transaction.id) {
          this.cancelEdit();
        }
      }
    });
  }

  settlementHint(): string | null {
    if (this.editForm.type !== 'expense') {
      return null;
    }

    const place = this.selectedPlace();
    if (place?.kind !== 'credit') {
      return null;
    }

    const due = creditCardSettlementDate(this.editForm.date, place.billingDay ?? undefined);
    const dueLabel = this.datePipe.transform(due, 'mediumDate') ?? due;
    const bank = place.settlementAccount ?? 'your bank';
    return `Counts as an expense today. ${bank} will be charged on ${dueLabel}.`;
  }

  private selectedPlace(): Account | undefined {
    return this.accountService.getAccounts()().find(account => account.name === this.editForm.account);
  }

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
