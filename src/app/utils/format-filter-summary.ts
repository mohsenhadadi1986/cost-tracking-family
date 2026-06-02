import { TransactionFilter } from '../models/transaction-filter.model';

export function formatFilterSummary(filter: TransactionFilter): string {
  const parts: string[] = [];

  if (filter.startDate || filter.endDate) {
    const format = (date: string) =>
      new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    const start = filter.startDate ? format(filter.startDate) : 'any';
    const end = filter.endDate ? format(filter.endDate) : 'any';
    parts.push(`Date: ${start} – ${end}`);
  }

  if (filter.categories.length > 0) {
    parts.push(`Categories: ${filter.categories.join(', ')}`);
  }

  if (filter.type !== 'all') {
    const label = filter.type.charAt(0).toUpperCase() + filter.type.slice(1);
    parts.push(`Type: ${label}`);
  }

  return parts.join(' · ');
}
