import { Component, forwardRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ButtonComponent } from './button.component';

export type TransactionEntryType = 'expense' | 'income';

let nextTransactionTypeSelectId = 0;

@Component({
  selector: 'app-transaction-type-select',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TransactionTypeSelectComponent),
      multi: true
    }
  ],
  template: `
    <div class="transaction-type-select">
      <label [attr.id]="labelId">{{ label }}</label>
      <div
        class="transaction-type-select__group"
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
    .transaction-type-select label {
      display: block;
      margin-bottom: var(--space-sm);
      font-weight: var(--font-weight-medium);
      font-size: var(--font-size-sm);
      color: var(--color-text);
    }

    .transaction-type-select__group {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
      padding: var(--space-xs);
      background: var(--color-surface);
      border: 1px solid var(--color-border-input);
      border-radius: var(--radius-sm);
    }

    .transaction-type-select__group app-button {
      flex: 1;
      min-width: fit-content;
    }

    @media (max-width: 768px) {
      .transaction-type-select__group app-button {
        min-height: 44px;
      }
    }
  `]
})
export class TransactionTypeSelectComponent implements ControlValueAccessor {
  @Input() label = 'Type';

  readonly options: { value: TransactionEntryType; label: string }[] = [
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' }
  ];

  value: TransactionEntryType = 'expense';
  disabled = false;

  readonly labelId = `transaction-type-select-label-${nextTransactionTypeSelectId}`;

  private onChange: (value: TransactionEntryType) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    nextTransactionTypeSelectId += 1;
  }

  writeValue(value: TransactionEntryType | null): void {
    this.value = value === 'income' ? 'income' : 'expense';
  }

  registerOnChange(fn: (value: TransactionEntryType) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  selectType(type: TransactionEntryType): void {
    if (this.disabled || this.value === type) {
      return;
    }

    this.value = type;
    this.onChange(type);
    this.onTouched();
  }
}
