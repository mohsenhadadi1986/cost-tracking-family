import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DateFieldComponent } from './date-field.component';

@Component({
  selector: 'app-date-range-field',
  standalone: true,
  imports: [CommonModule, FormsModule, DateFieldComponent],
  template: `
    <fieldset class="date-range-field">
      <legend *ngIf="label" class="date-range-field__legend">{{ label }}</legend>

      <app-date-field
        class="date-range-field__field"
        label="Start"
        [ngModel]="startDate"
        (ngModelChange)="onStartDateChange($event)"
        [error]="dateRangeInvalid">
      </app-date-field>

      <app-date-field
        class="date-range-field__field"
        label="End"
        [ngModel]="endDate"
        (ngModelChange)="onEndDateChange($event)"
        [error]="dateRangeInvalid">
      </app-date-field>

      <p *ngIf="dateRangeInvalid" class="date-range-field__hint" role="alert">
        Start date must be on or before end date.
      </p>
    </fieldset>
  `,
  styles: [`
    :host {
      display: block;
    }

    .date-range-field {
      margin: 0;
      padding: 0;
      border: 0;
    }

    .date-range-field__legend {
      display: block;
      width: 100%;
      margin-bottom: var(--space-sm);
      padding: 0;
      font-weight: var(--font-weight-medium);
      font-size: var(--font-size-sm);
      color: var(--color-text);
    }

    .date-range-field__field {
      margin-bottom: var(--space-sm);
    }

    .date-range-field__field:last-of-type {
      margin-bottom: 0;
    }

    .date-range-field__hint {
      margin: var(--space-sm) 0 0;
      font-size: var(--font-size-xs);
      color: var(--color-expense);
    }
  `]
})
export class DateRangeFieldComponent {
  @Input() label = 'Date Range';
  @Input() startDate = '';
  @Output() startDateChange = new EventEmitter<string>();
  @Input() endDate = '';
  @Output() endDateChange = new EventEmitter<string>();

  get dateRangeInvalid(): boolean {
    return !!(this.startDate && this.endDate && this.startDate > this.endDate);
  }

  onStartDateChange(value: string): void {
    this.startDate = value;
    this.startDateChange.emit(value);
  }

  onEndDateChange(value: string): void {
    this.endDate = value;
    this.endDateChange.emit(value);
  }
}
