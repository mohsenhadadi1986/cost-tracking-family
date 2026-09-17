import { Component, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FilterBannerComponent } from './filter-banner.component';
import { ButtonComponent } from './ui/button.component';
import { GlyphComponent } from './ui/glyph.component';
import { AccountBreakdown, CreditCardDue, PlannedDue } from '../models/transaction-summary.model';
import { AccountService } from '../services/account.service';
import { TransactionService } from '../services/transaction.service';
import { hasCustomSidebarDates, OverviewInterval, currentMonthKey } from '../utils/overview-interval';

@Component({
  selector: 'app-visualization',
  standalone: true,
  imports: [CommonModule, FilterBannerComponent, ButtonComponent, GlyphComponent],
  providers: [DatePipe],
  template: `
    <h2 class="page-title">Overview</h2>
    <app-filter-banner title="Overview reflects active filters" />
    <div *ngIf="loadError()" class="card status-banner status-error">
      {{ loadError() }}
    </div>
    <div *ngIf="loading()" class="card empty-state">Loading overview…</div>
    <ng-container *ngIf="!loading() && !loadError()">
      <div class="overview-interval">
        <p class="overview-interval__label">Month</p>
        <div class="overview-month" role="group" aria-label="Overview month">
          <app-button
            type="button"
            size="sm"
            variant="secondary"
            [disabled]="usesSidebarDates()"
            (click)="shiftMonth(-1)">
            Previous
          </app-button>
          <p class="overview-month__label">{{ monthLabel() }}</p>
          <app-button
            type="button"
            size="sm"
            variant="secondary"
            [disabled]="usesSidebarDates()"
            (click)="shiftMonth(1)">
            Next
          </app-button>
        </div>
        <p class="overview-interval__label">Time range</p>
        <div class="overview-interval__chips" role="group" aria-label="Overview time range">
          <app-button
            *ngFor="let option of intervals"
            type="button"
            size="sm"
            [variant]="interval() === option.id ? 'primary' : 'secondary'"
            [disabled]="usesSidebarDates()"
            (click)="setInterval(option.id)">
            {{ option.label }}
          </app-button>
        </div>
        <p *ngIf="usesSidebarDates()" class="overview-interval__hint">
          Using the sidebar date range. Clear filters to switch Week / Month / Year.
        </p>
      </div>

      <div class="overview-cards overview-cards--places">
        <article class="overview-card overview-card--detail">
          <h3 class="overview-card__label">Current balance</h3>
          <p
            class="overview-card__value"
            [class.amount-income]="displayBalance() >= 0"
            [class.amount-expense]="displayBalance() < 0">
            {{ displayBalance() | currency }}
          </p>
          <p class="overview-card__hint">{{ balanceHint() }}</p>
          <ul class="place-list" *ngIf="accountBalances().length > 0">
            <li class="place-list__item" *ngFor="let place of accountBalances()">
              <div class="place-list__row">
                <span class="place-list__name">
                  <app-glyph set="place" [name]="place.account"></app-glyph>
                  {{ place.account }}
                  <span *ngIf="isCreditPlace(place.account)" class="place-list__badge">Card</span>
                </span>
                <span
                  class="place-list__amount"
                  [class.amount-income]="place.amount >= 0"
                  [class.amount-expense]="place.amount < 0">
                  {{ place.amount | currency }}
                </span>
              </div>
              <p class="place-list__meta">{{ placeMeta(place) }}</p>
            </li>
          </ul>
          <p *ngIf="accountBalances().length === 0" class="overview-card__empty">
            No places yet. Add Revolut, a bank, Satispay, or a credit card on the Settings tab.
          </p>
        </article>

        <article class="overview-card overview-card--detail" *ngIf="receivableBalances().length > 0">
          <h3 class="overview-card__label">Lent out</h3>
          <p class="overview-card__value amount-income">{{ receivableTotal() | currency }}</p>
          <p class="overview-card__hint">Still yours, but not in a wallet until they pay you back.</p>
          <ul class="place-list">
            <li class="place-list__item" *ngFor="let row of receivableBalances()">
              <div class="place-list__row">
                <span class="place-list__name">
                  <app-glyph set="category" [name]="row.account"></app-glyph>
                  {{ row.account }}
                </span>
                <span class="place-list__amount amount-income">{{ row.amount | currency }}</span>
              </div>
              <p class="place-list__meta">{{ receivableMeta(row) }}</p>
            </li>
          </ul>
        </article>

        <article class="overview-card overview-card--detail">
          <h3 class="overview-card__label">Available {{ monthPhrase() }}</h3>
          <p
            class="overview-card__value"
            [class.amount-income]="availableThisMonth() >= 0"
            [class.amount-expense]="availableThisMonth() < 0">
            {{ availableThisMonth() | currency }}
          </p>
          <p class="overview-card__hint">
            Projected cash minus unpaid plans and card charges {{ monthPhrase() }}.
          </p>
        </article>

        <article class="overview-card overview-card--detail">
          <h3 class="overview-card__label">Income</h3>
          <p class="overview-card__value amount-income">{{ summary().totalIncome | currency }}</p>
          <p class="overview-card__hint">Received in this range, by place</p>
          <ul class="place-list" *ngIf="incomeByAccount().length > 0">
            <li class="place-list__item" *ngFor="let place of incomeByAccount()">
              <div class="place-list__row">
                <span class="place-list__name">
                  <app-glyph set="place" [name]="place.account"></app-glyph>
                  {{ place.account }}
                </span>
                <span class="place-list__amount amount-income">{{ place.amount | currency }}</span>
              </div>
              <p class="place-list__meta">{{ placeMeta(place, 'income') }}</p>
            </li>
          </ul>
          <p *ngIf="incomeByAccount().length === 0" class="overview-card__empty">
            No income in this range yet.
          </p>
        </article>

        <article class="overview-card overview-card--detail">
          <h3 class="overview-card__label">Expenses</h3>
          <p class="overview-card__value amount-expense">{{ summary().totalExpense | currency }}</p>
          <p class="overview-card__hint">Counted on the purchase date, including credit-card spend</p>
          <ul class="place-list" *ngIf="expenseByAccount().length > 0">
            <li class="place-list__item" *ngFor="let place of expenseByAccount()">
              <div class="place-list__row">
                <span class="place-list__name">
                  <app-glyph set="place" [name]="place.account"></app-glyph>
                  {{ place.account }}
                </span>
                <span class="place-list__amount amount-expense">{{ place.amount | currency }}</span>
              </div>
              <p class="place-list__meta">{{ placeMeta(place, 'expense') }}</p>
            </li>
          </ul>
          <p *ngIf="expenseByAccount().length === 0" class="overview-card__empty">
            No expenses in this range yet.
          </p>
        </article>

        <article class="overview-card overview-card--detail">
          <h3 class="overview-card__label">Planned {{ monthPhrase() }}</h3>
          <p class="overview-card__value amount-expense">{{ plannedDueTotal() | currency }}</p>
          <p class="overview-card__hint">Reserved withdrawals. A logged payment of the same amount drops out.</p>
          <ul class="place-list" *ngIf="plannedDues().length > 0">
            <li class="place-list__item" *ngFor="let due of plannedDues()">
              <div class="place-list__row">
                <span class="place-list__name">
                  <app-glyph set="category" [name]="due.name"></app-glyph>
                  {{ due.name }}
                </span>
                <span class="place-list__amount amount-expense">{{ due.amount | currency }}</span>
              </div>
              <p class="place-list__meta">{{ planMeta(due) }}</p>
            </li>
          </ul>
          <p *ngIf="plannedDues().length === 0" class="overview-card__empty">
            No unpaid plans {{ monthPhrase() }}. Add a mortgage or installment on the Settings tab.
          </p>
        </article>

        <article class="overview-card overview-card--detail">
          <h3 class="overview-card__label">Credit card due</h3>
          <p class="overview-card__value amount-expense">{{ creditCardDueTotal() | currency }}</p>
          <p class="overview-card__hint">Next bank withdrawal. Do not add this as a second expense.</p>
          <ul class="place-list" *ngIf="creditCardDues().length > 0">
            <li class="place-list__item" *ngFor="let due of creditCardDues()">
              <div class="place-list__row">
                <span class="place-list__name">
                  <app-glyph set="place" [name]="due.account"></app-glyph>
                  {{ due.account }}
                </span>
                <span class="place-list__amount amount-expense">{{ due.amount | currency }}</span>
              </div>
              <p class="place-list__meta">{{ dueMeta(due) }}</p>
            </li>
          </ul>
          <p *ngIf="creditCardDues().length === 0" class="overview-card__empty">
            No upcoming card charges.
          </p>
        </article>
      </div>

      <section class="overview-sources" *ngIf="incomeSources().length > 0">
        <h3 class="overview-sources__title">Income by category</h3>
        <div class="overview-sources__grid">
          <article class="overview-card overview-card--source" *ngFor="let source of incomeSources()">
            <h4 class="overview-card__label name-with-icon">
              <app-glyph set="category" [name]="source.name"></app-glyph>
              {{ source.name }}
            </h4>
            <p class="overview-card__value amount-income">{{ source.amount | currency }}</p>
          </article>
        </div>
      </section>
    </ng-container>
  `
})
export class VisualizationComponent {
  readonly intervals: Array<{ id: OverviewInterval; label: string }> = [
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
  ];

  activeFilter = this.transactionService.getActiveFilter();
  interval = this.transactionService.getOverviewInterval();
  overviewMonth = this.transactionService.getOverviewMonth();
  summary = this.transactionService.getSummary();
  loading = this.transactionService.getLoading();
  loadError = this.transactionService.getLoadError();

  usesSidebarDates = computed(() => hasCustomSidebarDates(this.activeFilter()));

  monthLabel = computed(() => {
    const date = `${this.overviewMonth()}-01`;
    return this.datePipe.transform(date, 'MMMM y') ?? date;
  });

  monthPhrase = computed(() => {
    if (this.overviewMonth() === currentMonthKey() && this.interval() === 'month' && !this.usesSidebarDates()) {
      return 'this month';
    }
    return `in ${this.monthLabel()}`;
  });

  accountBalances = computed(() => this.summary().accountBalances);

  receivableBalances = computed(() => this.summary().receivableBalances ?? []);

  receivableTotal = computed(() => this.summary().receivableTotal ?? 0);

  displayBalance = computed(() => this.summary().projectedBalance ?? this.summary().currentBalance);

  incomeByAccount = computed(() => this.summary().incomeByAccount);

  expenseByAccount = computed(() => this.summary().expenseByAccount ?? []);

  creditCardDues = computed(() => this.summary().creditCardDues ?? []);

  creditCardDueTotal = computed(() =>
    this.creditCardDues().reduce((sum, due) => sum + due.amount, 0)
  );

  plannedDues = computed(() => this.summary().plannedDues ?? []);

  plannedDueTotal = computed(() => this.summary().plannedDueTotal ?? 0);

  availableThisMonth = computed(() => this.summary().availableThisMonth ?? this.summary().currentBalance);

  incomeSources = computed(() =>
    Object.entries(this.summary().incomeByCategory)
      .map(([name, amount]) => ({ name, amount }))
      .sort((left, right) => right.amount - left.amount)
  );

  constructor(
    private transactionService: TransactionService,
    private accountService: AccountService,
    private datePipe: DatePipe
  ) {}

  isCreditPlace(name: string): boolean {
    return this.accountService.getAccounts()().some(account => account.name === name && account.kind === 'credit');
  }

  placeMeta(place: AccountBreakdown, kind: 'balance' | 'income' | 'expense' = 'balance'): string {
    if (!place.lastDate) {
      if (kind === 'income') {
        return 'No income yet';
      }
      if (kind === 'expense') {
        return 'No expenses yet';
      }
      return this.isCreditPlace(place.account) ? 'No unpaid card charges' : 'No activity yet';
    }

    const date = this.datePipe.transform(place.lastDate, 'mediumDate') ?? place.lastDate;
    if (kind === 'balance' && this.isCreditPlace(place.account)) {
      return place.lastCategory ? `Unpaid · last ${date} · ${place.lastCategory}` : `Unpaid · last ${date}`;
    }

    return place.lastCategory ? `${date} · ${place.lastCategory}` : date;
  }

  dueMeta(due: CreditCardDue): string {
    const date = this.datePipe.transform(due.settlementDate, 'mediumDate') ?? due.settlementDate;
    return `Withdrawn from ${due.settlementAccount} on ${date}`;
  }

  planMeta(due: PlannedDue): string {
    const date = this.datePipe.transform(due.dueDate, 'mediumDate') ?? due.dueDate;
    const left = due.remainingCount === 1 ? '1 left' : `${due.remainingCount} left`;
    return `${date} · ${due.account} · ${left}`;
  }

  receivableMeta(row: AccountBreakdown): string {
    const date = row.lastDate ? this.datePipe.transform(row.lastDate, 'mediumDate') ?? row.lastDate : '';
    if (row.lastCategory && date) {
      return `From ${row.lastCategory} · ${date}`;
    }
    if (row.lastCategory) {
      return `From ${row.lastCategory}`;
    }
    return date || 'Outstanding';
  }

  balanceHint(): string {
    if (this.overviewMonth() === currentMonthKey() && !this.usesSidebarDates()) {
      return 'Cash in banks and wallets today. Money you lent is listed separately.';
    }
    if (this.overviewMonth() > currentMonthKey() && !this.usesSidebarDates()) {
      return 'Cash after unpaid plans and card charges before this month. Money you lent is listed separately.';
    }
    return 'Cash in banks and wallets as of this date. Money you lent is listed separately.';
  }

  setInterval(interval: OverviewInterval) {
    if (this.usesSidebarDates()) {
      return;
    }

    this.transactionService.setOverviewInterval(interval);
  }

  shiftMonth(delta: number) {
    if (this.usesSidebarDates()) {
      return;
    }

    this.transactionService.shiftOverviewMonth(delta);
  }
}
