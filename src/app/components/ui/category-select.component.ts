import {
  Component,
  ElementRef,
  forwardRef,
  HostListener,
  Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextCategorySelectId = 0;

@Component({
  selector: 'app-category-select',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CategorySelectComponent),
      multi: true
    }
  ],
  template: `
    <div class="category-select">
      <label [attr.id]="labelId" [attr.for]="triggerId">{{ label }}</label>

      <div class="category-select__control">
        <button
          #trigger
          type="button"
          class="category-select__trigger"
          [id]="triggerId"
          [attr.aria-labelledby]="labelId"
          [attr.aria-expanded]="open"
          aria-haspopup="listbox"
          [attr.aria-controls]="listboxId"
          [disabled]="disabled"
          (click)="toggleOpen()"
          (keydown)="onTriggerKeydown($event)">
          <span
            class="category-select__summary"
            [class.category-select__summary--placeholder]="!value">
            {{ displayText }}
          </span>
          <span class="category-select__chevron" aria-hidden="true"></span>
        </button>

        <div
          *ngIf="open"
          class="category-select__panel"
          [id]="listboxId"
          role="listbox"
          [attr.aria-labelledby]="labelId">
          <button
            *ngFor="let category of options; let index = index"
            type="button"
            role="option"
            class="category-select__option"
            [class.category-select__option--focused]="focusedOptionIndex === index"
            [class.category-select__option--selected]="value === category"
            [attr.aria-selected]="value === category"
            [attr.id]="optionId(index)"
            (click)="selectCategory(category)"
            (keydown)="onOptionKeydown($event, category, index)">
            <span>{{ category }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .category-select {
      position: relative;
    }

    .category-select label {
      display: block;
      margin-bottom: var(--space-sm);
      font-weight: var(--font-weight-medium);
      font-size: var(--font-size-sm);
      color: var(--color-text);
    }

    .category-select__control {
      position: relative;
    }

    .category-select__trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      min-height: var(--input-height);
      padding: var(--input-padding-y) var(--input-padding-x);
      margin: 0;
      border: 1px solid var(--color-border-input);
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: var(--font-size-base);
      line-height: var(--line-height-base);
      color: var(--color-text);
      background-color: var(--color-surface);
      cursor: pointer;
      text-align: left;
      transition:
        border-color var(--transition-fast),
        box-shadow var(--transition-fast),
        background-color var(--transition-fast);
    }

    .category-select__trigger:hover:not(:disabled) {
      border-color: var(--color-border-strong);
    }

    .category-select__trigger:focus {
      outline: none;
    }

    .category-select__trigger:focus-visible {
      border-color: var(--color-primary);
      box-shadow: var(--focus-ring);
    }

    .category-select__trigger:disabled {
      background-color: var(--color-secondary-light);
      color: var(--color-muted);
      cursor: not-allowed;
      opacity: 0.85;
    }

    .category-select__summary {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .category-select__summary--placeholder {
      color: var(--color-muted);
    }

    .category-select__chevron {
      flex-shrink: 0;
      width: 12px;
      height: 12px;
      margin-left: var(--space-sm);
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: center;
      transition: transform var(--transition-fast);
    }

    .category-select__trigger[aria-expanded='true'] .category-select__chevron {
      transform: rotate(180deg);
    }

    .category-select__panel {
      position: absolute;
      z-index: 20;
      top: calc(100% + var(--space-xs));
      left: 0;
      right: 0;
      max-height: 240px;
      overflow-y: auto;
      padding: var(--space-xs);
      border: 1px solid var(--color-border-input);
      border-radius: var(--radius-sm);
      background-color: var(--color-surface);
      box-shadow: var(--shadow-md);
    }

    .category-select__option {
      display: flex;
      align-items: center;
      width: 100%;
      padding: var(--space-sm);
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--color-text);
      font-family: inherit;
      font-size: var(--font-size-sm);
      text-align: left;
      cursor: pointer;
    }

    .category-select__option:hover,
    .category-select__option--focused,
    .category-select__option--selected {
      background-color: var(--color-neutral-hover);
    }

    .category-select__option:focus {
      outline: none;
    }

    .category-select__option:focus-visible {
      box-shadow: var(--focus-ring);
    }

    @media (max-width: 768px) {
      .category-select__trigger,
      .category-select__option {
        min-height: 44px;
      }
    }
  `]
})
export class CategorySelectComponent implements ControlValueAccessor {
  @Input() options: readonly string[] = [];
  @Input() label = 'Category';
  @Input() placeholder = 'Select a category';

  value = '';
  open = false;
  disabled = false;
  focusedOptionIndex = -1;

  readonly labelId = `category-select-label-${nextCategorySelectId}`;
  readonly triggerId = `category-select-trigger-${nextCategorySelectId}`;
  readonly listboxId = `category-select-listbox-${nextCategorySelectId}`;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private elementRef: ElementRef<HTMLElement>) {
    nextCategorySelectId += 1;
  }

  get displayText(): string {
    return this.value || this.placeholder;
  }

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
    if (isDisabled) {
      this.close();
    }
  }

  toggleOpen(): void {
    if (this.disabled) {
      return;
    }

    if (this.open) {
      this.close();
      return;
    }

    this.open = true;
    this.focusedOptionIndex = this.value
      ? Math.max(this.options.indexOf(this.value), 0)
      : this.options.length > 0 ? 0 : -1;
  }

  close(): void {
    if (!this.open) {
      return;
    }

    this.open = false;
    this.focusedOptionIndex = -1;
    this.onTouched();
  }

  selectCategory(category: string): void {
    if (this.disabled) {
      return;
    }

    this.value = category;
    this.onChange(category);
    this.close();
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (this.disabled) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!this.open) {
          this.open = true;
          this.focusedOptionIndex = event.key === 'ArrowUp'
            ? this.options.length - 1
            : 0;
          this.focusOption(this.focusedOptionIndex);
        }
        break;
      case 'Escape':
        if (this.open) {
          event.preventDefault();
          this.close();
        }
        break;
    }
  }

  onOptionKeydown(event: KeyboardEvent, category: string, index: number): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusedOptionIndex = Math.min(index + 1, this.options.length - 1);
        this.focusOption(this.focusedOptionIndex);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusedOptionIndex = Math.max(index - 1, 0);
        this.focusOption(this.focusedOptionIndex);
        break;
      case 'Home':
        event.preventDefault();
        this.focusedOptionIndex = 0;
        this.focusOption(0);
        break;
      case 'End':
        event.preventDefault();
        this.focusedOptionIndex = this.options.length - 1;
        this.focusOption(this.focusedOptionIndex);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectCategory(category);
        break;
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
  }

  optionId(index: number): string {
    return `${this.listboxId}-option-${index}`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.open) {
      event.preventDefault();
      this.close();
    }
  }

  private focusOption(index: number): void {
    const option = this.elementRef.nativeElement.querySelector<HTMLElement>(
      `#${this.optionId(index)}`
    );
    option?.focus();
  }
}
