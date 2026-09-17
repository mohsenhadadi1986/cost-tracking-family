import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from './ui/button.component';
import { CategorySelectComponent } from './ui/category-select.component';
import { DateFieldComponent } from './ui/date-field.component';
import { TransactionTypeSelectComponent } from './ui/transaction-type-select.component';
import { Category, CategoryType } from '../models/category.model';
import { DEFAULT_ACCOUNT } from '../constants/accounts';
import { Account, CreateAccountRequest, UpdateAccountRequest } from '../models/account.model';
import { CreatePlanRequest, Plan, UpdatePlanRequest } from '../models/plan.model';
import { AccountService } from '../services/account.service';
import { CategoryService } from '../services/category.service';
import { PlanService } from '../services/plan.service';
import { TransactionService } from '../services/transaction.service';
import { todayIsoDate } from '../utils/credit-card';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    CategorySelectComponent,
    DateFieldComponent,
    TransactionTypeSelectComponent
  ],
  template: `
    <h2 class="page-title">Settings</h2>

    <div *ngIf="loadError()" class="card status-banner status-error">
      {{ loadError() }}
    </div>

    <div *ngIf="accountsLoadError()" class="card status-banner status-error">
      {{ accountsLoadError() }}
    </div>

    <div *ngIf="submitError()" class="card status-banner status-error">
      {{ submitError() }}
    </div>

    <div *ngIf="accountSubmitError()" class="card status-banner status-error">
      {{ accountSubmitError() }}
    </div>

    <div *ngIf="plansLoadError()" class="card status-banner status-error">
      {{ plansLoadError() }}
    </div>

    <div *ngIf="planSubmitError()" class="card status-banner status-error">
      {{ planSubmitError() }}
    </div>

    <section class="card form-card settings-card">
      <h3 class="categories-section-title">Places</h3>
      <p class="categories-section-copy">
        Banks, wallets, or a credit card billed on the 10th of next month.
      </p>

      <div class="form-group">
        <app-category-select
          label="Place"
          [options]="placePickerOptions()"
          [(ngModel)]="placePicker"
          (ngModelChange)="onPlacePickerChange($event)"
          name="placePicker"
          iconSet="place"
          [disabled]="accountSubmitting() || accountsLoading()">
        </app-category-select>
      </div>

      <form *ngIf="!selectedPlace(); else editPlaceForm" (ngSubmit)="onCreatePlace()">
        <div class="form-group">
          <label for="new-place-name">Name</label>
          <input
            id="new-place-name"
            type="text"
            [(ngModel)]="newPlaceName"
            name="newPlaceName"
            required
            [disabled]="accountSubmitting()"
            placeholder="N26, Wise…">
        </div>

        <div class="form-group">
          <label class="form-check">
            <input
              type="checkbox"
              [(ngModel)]="newPlaceCredit"
              (ngModelChange)="onNewPlaceCreditChange($event)"
              name="newPlaceCredit"
              [disabled]="accountSubmitting()">
            Credit card — spend now, bank charged next month
          </label>
        </div>

        <ng-container *ngIf="newPlaceCredit">
          <div class="form-group">
            <label for="new-place-billing-day">Billing day</label>
            <input
              id="new-place-billing-day"
              type="number"
              min="1"
              max="28"
              [(ngModel)]="newPlaceBillingDay"
              name="newPlaceBillingDay"
              [disabled]="accountSubmitting()">
          </div>

          <div class="form-group">
            <label for="new-place-settlement">Charged from</label>
            <select
              id="new-place-settlement"
              [(ngModel)]="newPlaceSettlementAccount"
              name="newPlaceSettlementAccount"
              required
              [disabled]="accountSubmitting() || walletPlaces().length === 0">
              <option value="" disabled>Select a bank or wallet</option>
              <option *ngFor="let wallet of walletPlaces()" [value]="wallet.name">{{ wallet.name }}</option>
            </select>
          </div>
        </ng-container>

        <app-button type="submit" variant="primary" [disabled]="accountSubmitting() || !newPlaceName.trim() || createPlaceDisabled()">
          {{ accountSubmitting() ? 'Saving…' : 'Add Place' }}
        </app-button>
      </form>

      <ng-template #editPlaceForm>
        <form *ngIf="selectedPlace() as place" (ngSubmit)="savePlaceEdit(place)">
          <div class="form-group">
            <label for="edit-place-name">Name</label>
            <input
              id="edit-place-name"
              type="text"
              [(ngModel)]="editingPlaceName"
              name="editPlaceName"
              required
              [disabled]="accountSubmitting()">
          </div>

          <div class="form-group">
            <label class="form-check">
              <input
                type="checkbox"
                [(ngModel)]="editingPlaceCredit"
                name="editPlaceCredit"
                [disabled]="accountSubmitting()">
              Credit card — spend now, bank charged next month
            </label>
          </div>

          <ng-container *ngIf="editingPlaceCredit">
            <div class="form-group">
              <label for="edit-place-billing-day">Billing day</label>
              <input
                id="edit-place-billing-day"
                type="number"
                min="1"
                max="28"
                [(ngModel)]="editingPlaceBillingDay"
                name="editPlaceBillingDay"
                [disabled]="accountSubmitting()">
            </div>

            <div class="form-group">
              <label for="edit-place-settlement">Charged from</label>
              <select
                id="edit-place-settlement"
                [(ngModel)]="editingPlaceSettlementAccount"
                name="editPlaceSettlement"
                [disabled]="accountSubmitting() || walletPlacesFor(place).length === 0">
                <option *ngFor="let wallet of walletPlacesFor(place)" [value]="wallet.name">
                  {{ wallet.name }}
                </option>
              </select>
            </div>
          </ng-container>

          <div class="settings-actions">
            <app-button type="submit" variant="primary" [disabled]="accountSubmitting() || !editingPlaceName.trim()">
              {{ accountSubmitting() ? 'Saving…' : 'Save Place' }}
            </app-button>
            <app-button
              type="button"
              variant="secondary"
              [disabled]="accountSubmitting()"
              (click)="onDeletePlace(place)">
              Delete
            </app-button>
          </div>
        </form>
      </ng-template>
    </section>

    <section class="card form-card settings-card">
      <h3 class="categories-section-title">Plans</h3>
      <p class="categories-section-copy">
        Mortgage or installments. Overview reserves this month until you log the payment.
      </p>

      <div class="form-group">
        <app-category-select
          label="Plan"
          [options]="planPickerOptions()"
          [(ngModel)]="planPicker"
          (ngModelChange)="onPlanPickerChange($event)"
          name="planPicker"
          iconSet="category"
          [disabled]="planSubmitting() || plansLoading()">
        </app-category-select>
      </div>

      <form *ngIf="!selectedPlan(); else editPlanForm" (ngSubmit)="onCreatePlan()">
        <div class="form-group">
          <label for="new-plan-name">Name</label>
          <input
            id="new-plan-name"
            type="text"
            [(ngModel)]="newPlanName"
            name="newPlanName"
            required
            [disabled]="planSubmitting()"
            placeholder="Mortgage, sofa…">
        </div>

        <div class="form-group">
          <label for="new-plan-amount">Amount each payment</label>
          <input
            id="new-plan-amount"
            type="number"
            min="0.01"
            step="0.01"
            [(ngModel)]="newPlanAmount"
            name="newPlanAmount"
            required
            [disabled]="planSubmitting()">
        </div>

        <div class="form-group">
          <app-category-select
            label="Paid from"
            [options]="planPlaceNames()"
            [(ngModel)]="newPlanAccount"
            name="newPlanAccount"
            iconSet="place"
            [disabled]="planSubmitting() || planPlaceNames().length === 0">
          </app-category-select>
        </div>

        <div class="form-group">
          <label for="new-plan-billing-day">Day of month</label>
          <input
            id="new-plan-billing-day"
            type="number"
            min="1"
            max="28"
            [(ngModel)]="newPlanBillingDay"
            name="newPlanBillingDay"
            [disabled]="planSubmitting()">
        </div>

        <div class="form-group">
          <app-date-field
            label="Starts"
            name="newPlanStartDate"
            [(ngModel)]="newPlanStartDate"
            [required]="true"
            [disabled]="planSubmitting()">
          </app-date-field>
        </div>

        <div class="form-group">
          <p class="categories-section-copy">Ends after</p>
          <div class="settings-end-mode" role="group" aria-label="Plan end">
            <label class="form-check">
              <input
                type="radio"
                name="newPlanEndMode"
                value="count"
                [(ngModel)]="newPlanEndMode"
                [disabled]="planSubmitting()">
              Number of payments
            </label>
            <label class="form-check">
              <input
                type="radio"
                name="newPlanEndMode"
                value="date"
                [(ngModel)]="newPlanEndMode"
                [disabled]="planSubmitting()">
              End date
            </label>
          </div>
        </div>

        <div class="form-group" *ngIf="newPlanEndMode === 'count'">
          <label for="new-plan-count">Payments</label>
          <input
            id="new-plan-count"
            type="number"
            min="1"
            max="600"
            [(ngModel)]="newPlanPaymentCount"
            name="newPlanPaymentCount"
            required
            [disabled]="planSubmitting()"
            placeholder="12">
        </div>

        <div class="form-group" *ngIf="newPlanEndMode === 'date'">
          <app-date-field
            label="Last month"
            name="newPlanEndDate"
            [(ngModel)]="newPlanEndDate"
            [required]="true"
            [disabled]="planSubmitting()">
          </app-date-field>
        </div>

        <app-button type="submit" variant="primary" [disabled]="planSubmitting() || createPlanDisabled()">
          {{ planSubmitting() ? 'Saving…' : 'Add Plan' }}
        </app-button>
      </form>

      <ng-template #editPlanForm>
        <form *ngIf="selectedPlan() as plan" (ngSubmit)="savePlanEdit(plan)">
          <p class="categories-section-copy" *ngIf="plan.totalCount > 0">
            {{ plan.remainingCount }} of {{ plan.totalCount }} payments left
          </p>

          <div class="form-group">
            <label for="edit-plan-name">Name</label>
            <input
              id="edit-plan-name"
              type="text"
              [(ngModel)]="editingPlanName"
              name="editPlanName"
              required
              [disabled]="planSubmitting()">
          </div>

          <div class="form-group">
            <label for="edit-plan-amount">Amount each payment</label>
            <input
              id="edit-plan-amount"
              type="number"
              min="0.01"
              step="0.01"
              [(ngModel)]="editingPlanAmount"
              name="editPlanAmount"
              required
              [disabled]="planSubmitting()">
          </div>

          <div class="form-group">
            <app-category-select
              label="Paid from"
              [options]="planPlaceNames()"
              [(ngModel)]="editingPlanAccount"
              name="editPlanAccount"
              iconSet="place"
              [disabled]="planSubmitting() || planPlaceNames().length === 0">
            </app-category-select>
          </div>

          <div class="form-group">
            <label for="edit-plan-billing-day">Day of month</label>
            <input
              id="edit-plan-billing-day"
              type="number"
              min="1"
              max="28"
              [(ngModel)]="editingPlanBillingDay"
              name="editPlanBillingDay"
              [disabled]="planSubmitting()">
          </div>

          <div class="form-group">
            <app-date-field
              label="Starts"
              name="editPlanStartDate"
              [(ngModel)]="editingPlanStartDate"
              [required]="true"
              [disabled]="planSubmitting()">
            </app-date-field>
          </div>

          <div class="form-group">
            <p class="categories-section-copy">Ends after</p>
            <div class="settings-end-mode" role="group" aria-label="Plan end">
              <label class="form-check">
                <input
                  type="radio"
                  name="editPlanEndMode"
                  value="count"
                  [(ngModel)]="editingPlanEndMode"
                  [disabled]="planSubmitting()">
                Number of payments
              </label>
              <label class="form-check">
                <input
                  type="radio"
                  name="editPlanEndMode"
                  value="date"
                  [(ngModel)]="editingPlanEndMode"
                  [disabled]="planSubmitting()">
                End date
              </label>
            </div>
          </div>

          <div class="form-group" *ngIf="editingPlanEndMode === 'count'">
            <label for="edit-plan-count">Payments</label>
            <input
              id="edit-plan-count"
              type="number"
              min="1"
              max="600"
              [(ngModel)]="editingPlanPaymentCount"
              name="editPlanPaymentCount"
              required
              [disabled]="planSubmitting()">
          </div>

          <div class="form-group" *ngIf="editingPlanEndMode === 'date'">
            <app-date-field
              label="Last month"
              name="editPlanEndDate"
              [(ngModel)]="editingPlanEndDate"
              [required]="true"
              [disabled]="planSubmitting()">
            </app-date-field>
          </div>

          <div class="settings-actions">
            <app-button type="submit" variant="primary" [disabled]="planSubmitting() || savePlanDisabled()">
              {{ planSubmitting() ? 'Saving…' : 'Save Plan' }}
            </app-button>
            <app-button
              type="button"
              variant="secondary"
              [disabled]="planSubmitting()"
              (click)="onDeletePlan(plan)">
              Delete
            </app-button>
          </div>
        </form>
      </ng-template>
    </section>

    <section class="card form-card settings-card">
      <h3 class="categories-section-title">Categories</h3>
      <p class="categories-section-copy">
        Choose a category to rename or delete, or add a new one.
      </p>

      <div class="form-group">
        <app-category-select
          label="Category"
          [options]="categoryPickerOptions()"
          [(ngModel)]="categoryPicker"
          (ngModelChange)="onCategoryPickerChange($event)"
          name="categoryPicker"
          iconSet="category"
          [disabled]="submitting() || loading()">
        </app-category-select>
      </div>

      <form *ngIf="!selectedCategory(); else editCategoryForm" (ngSubmit)="onCreate()">
        <div class="form-group">
          <label for="new-category-name">Name</label>
          <input
            id="new-category-name"
            type="text"
            [(ngModel)]="newCategory.name"
            name="newCategoryName"
            required
            [disabled]="submitting()"
            placeholder="Category name">
        </div>

        <div class="form-group">
          <app-transaction-type-select
            [(ngModel)]="newCategory.type"
            name="newCategoryType"
            [disabled]="submitting()">
          </app-transaction-type-select>
        </div>

        <app-button type="submit" variant="primary" [disabled]="submitting() || !newCategory.name.trim()">
          {{ submitting() ? 'Saving…' : 'Add Category' }}
        </app-button>
      </form>

      <ng-template #editCategoryForm>
        <form *ngIf="selectedCategory() as category" (ngSubmit)="saveEdit(category)">
          <div class="form-group">
            <label for="edit-category-name">Name</label>
            <input
              id="edit-category-name"
              type="text"
              [(ngModel)]="editingName"
              name="editCategoryName"
              required
              [disabled]="submitting()">
          </div>

          <p class="categories-section-copy">{{ category.type === 'income' ? 'Income' : 'Expense' }} category</p>

          <div class="settings-actions">
            <app-button type="submit" variant="primary" [disabled]="submitting() || !editingName.trim()">
              {{ submitting() ? 'Saving…' : 'Save Category' }}
            </app-button>
            <app-button
              type="button"
              variant="secondary"
              [disabled]="submitting()"
              (click)="onDelete(category)">
              Delete
            </app-button>
          </div>
        </form>
      </ng-template>
    </section>
  `,
  styles: [`
    .settings-card {
      margin-bottom: var(--space-lg);
    }

    .categories-section-title {
      margin: 0 0 var(--space-md);
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
    }

    .categories-section-copy {
      margin: 0 0 var(--space-md);
      font-size: var(--font-size-sm);
      color: var(--color-muted);
    }

    .settings-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
    }

    .form-check {
      display: flex;
      align-items: flex-start;
      gap: var(--space-sm);
      font-weight: var(--font-weight-medium);
      font-size: var(--font-size-sm);
    }

    .form-check input {
      margin-top: 0.15rem;
    }

    .settings-end-mode {
      display: grid;
      gap: var(--space-sm);
    }

    @media (max-width: 768px) {
      .settings-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
    }
  `]
})
export class CategoriesComponent {
  readonly addPlaceOption = 'Add place';
  readonly addCategoryOption = 'Add category';
  readonly addPlanOption = 'Add plan';

  loading = this.categoryService.getLoading();
  loadError = this.categoryService.getLoadError();
  submitting = this.categoryService.getSubmitting();
  submitError = this.categoryService.getSubmitError();

  accountsLoading = this.accountService.getLoading();
  accountsLoadError = this.accountService.getLoadError();
  accountSubmitting = this.accountService.getSubmitting();
  accountSubmitError = this.accountService.getSubmitError();

  plansLoading = this.planService.getLoading();
  plansLoadError = this.planService.getLoadError();
  planSubmitting = this.planService.getSubmitting();
  planSubmitError = this.planService.getSubmitError();

  places = this.accountService.getAccounts();
  plans = this.planService.getPlans();

  walletPlaces = computed(() => this.places().filter(place => place.kind !== 'credit'));

  planPlaceNames = computed(() => this.places().map(place => place.name));

  placePickerOptions = computed(() => [
    this.addPlaceOption,
    ...this.places().map(place => place.name),
  ]);

  categoryPickerOptions = computed(() => [
    this.addCategoryOption,
    ...this.categoryService.getCategories()().map(category => this.categoryLabel(category)),
  ]);

  planPickerOptions = computed(() => [
    this.addPlanOption,
    ...this.plans().map(plan => this.planLabel(plan)),
  ]);

  placePicker = this.addPlaceOption;
  categoryPicker = this.addCategoryOption;
  planPicker = this.addPlanOption;

  newCategory = {
    name: '',
    type: 'expense' as CategoryType
  };

  newPlaceName = '';
  newPlaceCredit = false;
  newPlaceBillingDay = 10;
  newPlaceSettlementAccount = '';

  newPlanName = '';
  newPlanAmount: number | null = null;
  newPlanAccount = DEFAULT_ACCOUNT;
  newPlanBillingDay = 10;
  newPlanStartDate = todayIsoDate();
  newPlanEndMode: 'count' | 'date' = 'count';
  newPlanPaymentCount: number | null = null;
  newPlanEndDate = '';

  editingId: number | null = null;
  editingName = '';
  editingPlaceId: number | null = null;
  editingPlaceName = '';
  editingPlaceCredit = false;
  editingPlaceBillingDay = 10;
  editingPlaceSettlementAccount = '';

  editingPlanId: number | null = null;
  editingPlanName = '';
  editingPlanAmount: number | null = null;
  editingPlanAccount = '';
  editingPlanBillingDay = 10;
  editingPlanStartDate = '';
  editingPlanEndMode: 'count' | 'date' = 'count';
  editingPlanPaymentCount: number | null = null;
  editingPlanEndDate = '';

  constructor(
    private categoryService: CategoryService,
    private accountService: AccountService,
    private planService: PlanService,
    private transactionService: TransactionService
  ) {}

  selectedPlace(): Account | undefined {
    if (this.placePicker === this.addPlaceOption) {
      return undefined;
    }

    return this.places().find(place => place.name === this.placePicker);
  }

  selectedCategory(): Category | undefined {
    if (this.categoryPicker === this.addCategoryOption) {
      return undefined;
    }

    return this.categoryService.getCategories()().find(
      category => this.categoryLabel(category) === this.categoryPicker
    );
  }

  categoryLabel(category: Category): string {
    return `${category.name} · ${category.type === 'income' ? 'Income' : 'Expense'}`;
  }

  planLabel(plan: Plan): string {
    return `${plan.name} · ${plan.account}`;
  }

  selectedPlan(): Plan | undefined {
    if (this.planPicker === this.addPlanOption) {
      return undefined;
    }

    return this.plans().find(plan => this.planLabel(plan) === this.planPicker);
  }

  onPlanPickerChange(value: string) {
    if (value === this.addPlanOption) {
      this.cancelPlanEdit();
      return;
    }

    const plan = this.plans().find(candidate => this.planLabel(candidate) === value);
    if (plan) {
      this.startPlanEdit(plan);
    }
  }

  onCreatePlan() {
    const request = this.buildPlanRequest(
      this.newPlanName,
      this.newPlanAmount,
      this.newPlanAccount,
      this.newPlanBillingDay,
      this.newPlanStartDate,
      this.newPlanEndMode,
      this.newPlanPaymentCount,
      this.newPlanEndDate
    );
    if (!request) {
      return;
    }

    this.planService.clearSubmitError();
    this.planService.createPlan(request).subscribe({
      next: created => {
        this.resetNewPlanForm();
        this.planPicker = this.planLabel(created);
        this.startPlanEdit(created);
        this.transactionService.loadTransactions().subscribe();
      }
    });
  }

  createPlanDisabled(): boolean {
    return this.planFormDisabled(
      this.newPlanName,
      this.newPlanAmount,
      this.newPlanAccount,
      this.newPlanStartDate,
      this.newPlanEndMode,
      this.newPlanPaymentCount,
      this.newPlanEndDate
    );
  }

  savePlanDisabled(): boolean {
    return this.planFormDisabled(
      this.editingPlanName,
      this.editingPlanAmount,
      this.editingPlanAccount,
      this.editingPlanStartDate,
      this.editingPlanEndMode,
      this.editingPlanPaymentCount,
      this.editingPlanEndDate
    );
  }

  startPlanEdit(plan: Plan) {
    this.planService.clearSubmitError();
    this.planPicker = this.planLabel(plan);
    this.editingPlanId = plan.id;
    this.editingPlanName = plan.name;
    this.editingPlanAmount = plan.amount;
    this.editingPlanAccount = plan.account;
    this.editingPlanBillingDay = plan.billingDay;
    this.editingPlanStartDate = plan.startDate;
    this.editingPlanEndMode = plan.paymentCount != null ? 'count' : 'date';
    this.editingPlanPaymentCount = plan.paymentCount;
    this.editingPlanEndDate = plan.endDate ?? '';
  }

  cancelPlanEdit() {
    this.editingPlanId = null;
    this.editingPlanName = '';
    this.editingPlanAmount = null;
    this.editingPlanAccount = '';
    this.editingPlanBillingDay = 10;
    this.editingPlanStartDate = todayIsoDate();
    this.editingPlanEndMode = 'count';
    this.editingPlanPaymentCount = null;
    this.editingPlanEndDate = '';
    this.planPicker = this.addPlanOption;
  }

  savePlanEdit(plan: Plan) {
    const request = this.buildPlanRequest(
      this.editingPlanName,
      this.editingPlanAmount,
      this.editingPlanAccount,
      this.editingPlanBillingDay,
      this.editingPlanStartDate,
      this.editingPlanEndMode,
      this.editingPlanPaymentCount,
      this.editingPlanEndDate
    );
    if (!request || !this.planChanged(plan, request)) {
      return;
    }

    this.planService.updatePlan(plan.id, request).subscribe({
      next: updated => {
        this.planPicker = this.planLabel(updated);
        this.startPlanEdit(updated);
        this.transactionService.loadTransactions().subscribe();
      }
    });
  }

  onDeletePlan(plan: Plan) {
    const confirmed = window.confirm(`Delete "${plan.name}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    this.planService.clearSubmitError();
    this.planService.deletePlan(plan.id).subscribe({
      next: () => {
        this.cancelPlanEdit();
        this.transactionService.loadTransactions().subscribe();
      }
    });
  }

  private resetNewPlanForm() {
    this.newPlanName = '';
    this.newPlanAmount = null;
    this.newPlanAccount = this.defaultWalletName();
    this.newPlanBillingDay = 10;
    this.newPlanStartDate = todayIsoDate();
    this.newPlanEndMode = 'count';
    this.newPlanPaymentCount = null;
    this.newPlanEndDate = '';
  }

  private planFormDisabled(
    name: string,
    amount: number | null,
    account: string,
    startDate: string,
    endMode: 'count' | 'date',
    paymentCount: number | null,
    endDate: string
  ): boolean {
    if (!name.trim() || !account || !startDate || amount == null || amount <= 0) {
      return true;
    }

    if (endMode === 'count') {
      return paymentCount == null || paymentCount < 1;
    }

    return !endDate;
  }

  private buildPlanRequest(
    name: string,
    amount: number | null,
    account: string,
    billingDay: number,
    startDate: string,
    endMode: 'count' | 'date',
    paymentCount: number | null,
    endDate: string
  ): CreatePlanRequest | null {
    if (this.planFormDisabled(name, amount, account, startDate, endMode, paymentCount, endDate)) {
      return null;
    }

    return {
      name: name.trim(),
      amount: amount as number,
      account,
      billingDay,
      startDate,
      endDate: endMode === 'date' ? endDate : null,
      paymentCount: endMode === 'count' ? paymentCount : null,
    };
  }

  private planChanged(plan: Plan, request: UpdatePlanRequest): boolean {
    return (
      request.name !== plan.name
      || request.amount !== plan.amount
      || request.account !== plan.account
      || request.billingDay !== plan.billingDay
      || request.startDate !== plan.startDate
      || (request.endDate ?? null) !== (plan.endDate ?? null)
      || (request.paymentCount ?? null) !== (plan.paymentCount ?? null)
    );
  }


  onPlacePickerChange(value: string) {
    if (value === this.addPlaceOption) {
      this.cancelPlaceEdit();
      return;
    }

    const place = this.places().find(candidate => candidate.name === value);
    if (place) {
      this.startPlaceEdit(place);
    }
  }

  onCategoryPickerChange(value: string) {
    if (value === this.addCategoryOption) {
      this.cancelEdit();
      return;
    }

    const category = this.categoryService.getCategories()().find(
      candidate => this.categoryLabel(candidate) === value
    );
    if (category) {
      this.startEdit(category);
    }
  }

  onCreatePlace() {
    const name = this.newPlaceName.trim();
    if (!name || this.createPlaceDisabled()) {
      return;
    }

    const request: CreateAccountRequest = this.newPlaceCredit
      ? {
          name,
          kind: 'credit',
          billingDay: this.newPlaceBillingDay,
          settlementAccount: this.newPlaceSettlementAccount || this.defaultWalletName(),
        }
      : { name, kind: 'wallet' };

    this.accountService.clearSubmitError();
    this.accountService.createAccount(request).subscribe({
      next: created => {
        this.newPlaceName = '';
        this.newPlaceCredit = false;
        this.newPlaceBillingDay = 10;
        this.newPlaceSettlementAccount = this.defaultWalletName();
        this.placePicker = created.name;
        this.startPlaceEdit(created);
        this.transactionService.loadTransactions().subscribe();
      }
    });
  }

  createPlaceDisabled(): boolean {
    return this.newPlaceCredit && (this.walletPlaces().length === 0 || !this.newPlaceSettlementAccount);
  }

  onNewPlaceCreditChange(checked: boolean) {
    if (checked && !this.newPlaceSettlementAccount) {
      this.newPlaceSettlementAccount = this.defaultWalletName();
    }
  }

  startPlaceEdit(place: Account) {
    this.accountService.clearSubmitError();
    this.placePicker = place.name;
    this.editingPlaceId = place.id;
    this.editingPlaceName = place.name;
    this.editingPlaceCredit = place.kind === 'credit';
    this.editingPlaceBillingDay = place.billingDay ?? 10;
    this.editingPlaceSettlementAccount = place.settlementAccount ?? this.defaultWalletName();
  }

  cancelPlaceEdit() {
    this.editingPlaceId = null;
    this.editingPlaceName = '';
    this.editingPlaceCredit = false;
    this.editingPlaceBillingDay = 10;
    this.editingPlaceSettlementAccount = '';
    this.placePicker = this.addPlaceOption;
  }

  savePlaceEdit(place: Account) {
    const name = this.editingPlaceName.trim();
    if (!name) {
      return;
    }

    const request: UpdateAccountRequest = this.editingPlaceCredit
      ? {
          name,
          kind: 'credit',
          billingDay: this.editingPlaceBillingDay,
          settlementAccount: this.editingPlaceSettlementAccount || this.defaultWalletName(place.id),
        }
      : { name, kind: 'wallet' };

    if (!this.placeChanged(place, request)) {
      return;
    }

    this.accountService.updateAccount(place.id, request).subscribe({
      next: updated => {
        this.placePicker = updated.name;
        this.startPlaceEdit(updated);
        this.transactionService.loadTransactions().subscribe();
      }
    });
  }

  walletPlacesFor(place: Account): Account[] {
    return this.places().filter(candidate => candidate.kind !== 'credit' && candidate.id !== place.id);
  }

  private defaultWalletName(excludeId?: number): string {
    const wallets = this.places().filter(
      place => place.kind !== 'credit' && place.id !== excludeId
    );
    const preferred = wallets.find(place => place.name === DEFAULT_ACCOUNT);
    return preferred?.name ?? wallets[0]?.name ?? '';
  }

  private placeChanged(place: Account, request: UpdateAccountRequest): boolean {
    if (request.name !== place.name || request.kind !== place.kind) {
      return true;
    }

    if (request.kind === 'credit') {
      return (
        (request.billingDay ?? 10) !== (place.billingDay ?? 10) ||
        (request.settlementAccount ?? '') !== (place.settlementAccount ?? '')
      );
    }

    return false;
  }

  onDeletePlace(place: Account) {
    const confirmed = window.confirm(
      `Delete "${place.name}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    this.accountService.clearSubmitError();
    this.accountService.deleteAccount(place.id).subscribe({
      next: () => {
        this.cancelPlaceEdit();
        this.transactionService.loadTransactions().subscribe();
      }
    });
  }

  onCreate() {
    const name = this.newCategory.name.trim();
    if (!name) {
      return;
    }

    this.categoryService.clearSubmitError();
    this.categoryService.createCategory({ name, type: this.newCategory.type }).subscribe({
      next: created => {
        this.newCategory = { name: '', type: 'expense' };
        this.categoryPicker = this.categoryLabel(created);
        this.startEdit(created);
      }
    });
  }

  startEdit(category: Category) {
    this.categoryService.clearSubmitError();
    this.categoryPicker = this.categoryLabel(category);
    this.editingId = category.id;
    this.editingName = category.name;
  }

  cancelEdit() {
    this.editingId = null;
    this.editingName = '';
    this.categoryPicker = this.addCategoryOption;
  }

  saveEdit(category: Category) {
    const name = this.editingName.trim();
    if (!name) {
      return;
    }

    if (name === category.name) {
      return;
    }

    this.categoryService.updateCategory(category.id, { name }).subscribe({
      next: updated => {
        this.categoryPicker = this.categoryLabel(updated);
        this.startEdit(updated);
      }
    });
  }

  onDelete(category: Category) {
    const confirmed = window.confirm(
      `Delete "${category.name}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    this.categoryService.clearSubmitError();
    this.categoryService.deleteCategory(category.id).subscribe({
      next: () => this.cancelEdit()
    });
  }
}
