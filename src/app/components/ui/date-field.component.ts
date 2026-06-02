import { Component, forwardRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextId = 0;

@Component({
  selector: 'app-date-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateFieldComponent),
      multi: true
    }
  ],
  template: `
    <div class="date-field" [class.date-field--error]="error">
      <label *ngIf="label" class="date-field__label" [attr.for]="inputId">
        {{ label }}
        <span *ngIf="required" class="date-field__required" aria-hidden="true">*</span>
      </label>

      <div class="date-field__control">
        <input
          type="date"
          class="date-field__input"
          [id]="inputId"
          [attr.name]="name || null"
          [attr.aria-invalid]="error || null"
          [attr.aria-describedby]="ariaDescribedBy"
          [required]="required"
          [disabled]="disabled"
          [value]="value"
          (input)="onInput($event)"
          (blur)="onBlur()" />
        <span class="date-field__icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </span>
      </div>

      <p
        *ngIf="hint"
        class="date-field__hint"
        [class.date-field__hint--error]="error"
        [id]="hintId">
        {{ hint }}
      </p>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .date-field__label {
      display: block;
      margin-bottom: var(--space-sm);
      font-weight: var(--font-weight-medium);
      font-size: var(--font-size-sm);
      color: var(--color-text);
    }

    .date-field__required {
      margin-left: var(--space-xs);
      color: var(--color-error-text);
    }

    .date-field__control {
      position: relative;
    }

    .date-field__input {
      width: 100%;
      min-height: var(--input-height);
      margin: 0;
      padding: var(--input-padding-y) calc(var(--input-padding-x) * 2 + 18px) var(--input-padding-y) var(--input-padding-x);
      border: 1px solid var(--color-border-input);
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: var(--font-size-base);
      line-height: var(--line-height-base);
      color: var(--color-text);
      background-color: var(--color-surface);
      transition:
        border-color var(--transition-fast),
        box-shadow var(--transition-fast),
        background-color var(--transition-fast);
    }

    .date-field__input:hover:not(:disabled) {
      border-color: var(--color-border-strong);
    }

    .date-field__input:focus {
      outline: none;
    }

    .date-field__input:focus-visible {
      border-color: var(--color-primary);
      box-shadow: var(--focus-ring);
    }

    .date-field__input:disabled {
      background-color: var(--color-secondary-light);
      color: var(--color-muted);
      cursor: not-allowed;
      opacity: 0.85;
    }

    .date-field__input::-webkit-calendar-picker-indicator {
      position: absolute;
      top: 0;
      right: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      opacity: 0;
      cursor: pointer;
    }

    .date-field__icon {
      position: absolute;
      top: 50%;
      right: var(--input-padding-x);
      display: flex;
      color: var(--color-muted);
      pointer-events: none;
      transform: translateY(-50%);
    }

    .date-field--error .date-field__input {
      border-color: var(--color-error-text);
    }

    .date-field--error .date-field__input:focus-visible {
      border-color: var(--color-error-text);
      box-shadow: 0 0 0 var(--focus-ring-width) rgba(185, 28, 28, 0.25);
    }

    .date-field__hint {
      margin: var(--space-sm) 0 0;
      font-size: var(--font-size-xs);
      color: var(--color-muted);
    }

    .date-field__hint--error {
      color: var(--color-error-text);
    }
  `]
})
export class DateFieldComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() name = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() hint = '';
  @Input() error = false;
  @Input() describedBy = '';

  readonly inputId = `date-field-${nextId++}`;

  get hintId(): string {
    return this.hint ? `date-field-hint-${this.inputId}` : '';
  }

  get ariaDescribedBy(): string | null {
    const ids = [this.describedBy, this.hintId].filter(Boolean);
    return ids.length > 0 ? ids.join(' ') : null;
  }

  value = '';

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }

  onBlur(): void {
    this.onTouched();
  }
}
