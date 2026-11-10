import { Pipe, PipeTransform } from '@angular/core';
import { formatCurrency } from '../utils/format-currency';

@Pipe({
  name: 'eur',
  standalone: true,
})
export class EurPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    if (value == null || value === '') {
      return '';
    }
    const amount = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(amount)) {
      return '';
    }
    return formatCurrency(amount);
  }
}
