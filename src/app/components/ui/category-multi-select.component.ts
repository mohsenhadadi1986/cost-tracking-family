import {
  Component,
  ElementRef,
  forwardRef,
  HostListener,
  Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextCategoryMultiSelectId = 0;

@Component({
  selector: 'app-category-multi-select',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CategoryMultiSelectComponent),
      multi: true
    }
  ],
  template: `
    <div class="category-multi-select">
      <label [attr.id]="labelId">{{ label }}</label>

      <div class="category-multi-select__control">
        <button
          #trigger
          type="button"
          class="category-multi-select__trigger"
          [id]="triggerId"
          [attr.aria-labelledby]="labelId"
          [attr.aria-describedby]="summaryId"
          [attr.aria-expanded]="open"
          aria-haspopup="listbox"
          [attr.aria-controls]="listboxId"
          [disabled]="disabled"
          (click)="toggleOpen()"
          (keydown)="onTriggerKeydown($event)">
          <span
            class="category-multi-select__summary"
            [class.category-multi-select__summary--placeholder]="selectedValues.length === 0"
            [id]="summaryId">
            {{ displayText }}
          </span>
          <span class="category-multi-select__chevron" aria-hidden="true"></span>
        </button>

        <div
          *ngIf="open"
          class="category-multi-select__panel"
          [id]="listboxId"
          role="listbox"
          aria-multiselectable="true"
          [attr.aria-labelledby]="labelId"
          (keydown)="onListboxKeydown($event)">
          <button
            *ngFor="let category of options; let index = index"
            type="button"
            role="option"
            class="category-multi-select__option"
            [class.category-multi-select__option--focused]="focusedOptionIndex === index"
            [class.category-multi-select__option--selected]="isSelected(category)"
            [attr.aria-selected]="isSelected(category)"
            [attr.id]="optionId(index)"
            [attr.tabindex]="focusedOptionIndex === index ? 0 : -1"
            (click)="toggleCategory(category)"
            (focus)="focusedOptionIndex = index">
            <span>{{ category }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .category-multi-select {
      position: relative;
    }

    .category-multi-select label {
      display: block;
      margin-bottom: var(--space-sm);
      font-weight: var(--font-weight-medium);
      font-size: var(--font-size-sm);
      color: var(--color-text);
    }

    .category-multi-select__control {
      position: relative;
    }

    .category-multi-select__trigger {
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

    .category-multi-select__trigger:hover:not(:disabled) {
      border-color: var(--color-border-strong);
    }

    .category-multi-select__trigger:focus {
      outline: none;
    }

    .category-multi-select__trigger:focus-visible {
      border-color: var(--color-primary);
      box-shadow: var(--focus-ring);
    }

    .category-multi-select__trigger:disabled {
      background-color: var(--color-secondary-light);
      color: var(--color-muted);
      cursor: not-allowed;
      opacity: 0.85;
    }

    .category-multi-select__summary {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .category-multi-select__summary--placeholder {
      color: var(--color-muted);
    }

    .category-multi-select__chevron {
      flex-shrink: 0;
      width: 12px;
      height: 12px;
      margin-left: var(--space-sm);
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%23475569' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: center;
      transition: transform var(--transition-fast);
    }

    .category-multi-select__trigger[aria-expanded='true'] .category-multi-select__chevron {
      transform: rotate(180deg);
    }

    .category-multi-select__panel {
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

    .category-multi-select__option {
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

    .category-multi-select__option:hover,
    .category-multi-select__option--focused,
    .category-multi-select__option--selected {
      background-color: var(--color-neutral-hover);
    }

    .category-multi-select__option--selected {
      font-weight: var(--font-weight-medium);
    }

    .category-multi-select__option:focus {
      outline: none;
    }

    .category-multi-select__option:focus-visible {
      box-shadow: var(--focus-ring);
    }

    @media (max-width: 768px) {
      .category-multi-select__trigger,
      .category-multi-select__option {
        min-height: 44px;
      }
    }
  `]
})
export class CategoryMultiSelectComponent implements ControlValueAccessor {
  @Input() options: readonly string[] = [];
  @Input() label = 'Categories';
  @Input() placeholder = 'All categories';

  selectedValues: string[] = [];
  open = false;
  disabled = false;
  focusedOptionIndex = -1;

  readonly labelId = `category-multi-select-label-${nextCategoryMultiSelectId}`;
  readonly triggerId = `category-multi-select-trigger-${nextCategoryMultiSelectId}`;
  readonly listboxId = `category-multi-select-listbox-${nextCategoryMultiSelectId}`;
  readonly summaryId = `category-multi-select-summary-${nextCategoryMultiSelectId}`;

  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private elementRef: ElementRef<HTMLElement>) {
    nextCategoryMultiSelectId += 1;
  }

  get displayText(): string {
    if (this.selectedValues.length === 0) {
      return this.placeholder;
    }

    if (this.selectedValues.length === 1) {
      return this.selectedValues[0];
    }

    return `${this.selectedValues.length} categories selected`;
  }

  writeValue(value: string[] | null): void {
    this.selectedValues = value ? [...value] : [];
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.close(false);
    }
  }

  isSelected(category: string): boolean {
    return this.selectedValues.includes(category);
  }

  toggleOpen(): void {
    if (this.disabled) {
      return;
    }

    if (this.open) {
      this.close(true);
      return;
    }

    this.open = true;
    this.focusedOptionIndex = this.options.length > 0 ? 0 : -1;
    queueMicrotask(() => this.focusOption(this.focusedOptionIndex));
  }

  close(markTouched = true): void {
    if (!this.open) {
      return;
    }

    this.open = false;
    this.focusedOptionIndex = -1;

    if (markTouched) {
      this.onTouched();
    }

    this.focusTrigger();
  }

  toggleCategory(category: string): void {
    if (this.disabled) {
      return;
    }

    if (this.isSelected(category)) {
      this.selectedValues = this.selectedValues.filter(value => value !== category);
    } else {
      this.selectedValues = [...this.selectedValues, category];
    }

    this.onChange([...this.selectedValues]);
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
          queueMicrotask(() => this.focusOption(this.focusedOptionIndex));
        }
        break;
      case 'Escape':
        if (this.open) {
          event.preventDefault();
          this.close(true);
        }
        break;
    }
  }

  onListboxKeydown(event: KeyboardEvent): void {
    const index = this.focusedOptionIndex;

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
        if (index >= 0) {
          this.toggleCategory(this.options[index]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.close(true);
        break;
      case 'Tab':
        this.close(true);
        break;
    }
  }

  optionId(index: number): string {
    return `${this.listboxId}-option-${index}`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.close(true);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.open) {
      event.preventDefault();
      this.close(true);
    }
  }

  private focusOption(index: number): void {
    if (index < 0) {
      return;
    }

    const option = this.elementRef.nativeElement.querySelector<HTMLElement>(
      `#${this.optionId(index)}`
    );
    option?.focus();
  }

  private focusTrigger(): void {
    this.elementRef.nativeElement.querySelector<HTMLElement>(`#${this.triggerId}`)?.focus();
  }
}
