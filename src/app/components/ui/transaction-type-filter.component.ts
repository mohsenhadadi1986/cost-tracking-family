import { Component, forwardRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ButtonComponent } from './button.component';
import { TransactionTypeFilter } from '../../models/transaction-filter.model';

let nextTypeFilterId = 0;

@Component({
  selector: 'app-transaction-type-filter',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TransactionTypeFilterComponent),
      multi: true
    }
  ],
  template: `
    <div class="transaction-type-filter">
      <span class="transaction-type-filter__label" [id]="labelId">{{ label }}</span>
      <div
        class="transaction-type-filter__group"
        role="group"
        [attr.aria-labelledby]="labelId">
        <app-button
          *ngFor="let option of options"
          type="button"
          variant="ghost"
          size="sm"
          [disabled]="disabled"
          [active]="value === option.value"
          [attr.aria-pressed]="value === option.value"
          (click)="selectType(option.value)">
          {{ option.label }}
        </app-button>
      </div>
    </div>
  `,
  styles: [`
    .transaction-type-filter__label {
      display: block;
      margin-bottom: var(--space-sm);
      font-weight: var(--font-weight-medium);
      font-size: var(--font-size-sm);
      color: var(--color-text);
    }

    .transaction-type-filter__group {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
      padding: var(--space-xs);
      background: var(--color-surface);
      border: 1px solid var(--color-border-input);
      border-radius: var(--radius-sm);
    }

    .transaction-type-filter__group app-button {
      flex: 1;
      min-width: fit-content;
    }

    @media (max-width: 768px) {
      .transaction-type-filter__group app-button {
        min-height: 44px;
      }
    }
  `]
})
export class TransactionTypeFilterComponent implements ControlValueAccessor {
  @Input() label = 'Type';

  readonly options: { value: TransactionTypeFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' }
  ];

  value: TransactionTypeFilter = 'all';
  disabled = false;

  readonly labelId = `transaction-type-filter-label-${nextTypeFilterId++}`;

  private onChange: (value: TransactionTypeFilter) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: TransactionTypeFilter | null): void {
    this.value = value === 'expense' || value === 'income' ? value : 'all';
  }

  registerOnChange(fn: (value: TransactionTypeFilter) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  selectType(type: TransactionTypeFilter): void {
    if (this.disabled || this.value === type) {
      return;
    }

    this.value = type;
    this.onChange(type);
    this.onTouched();
  }
}
