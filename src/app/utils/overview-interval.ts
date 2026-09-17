import { lastDayOfMonth, toIsoDate } from './period-totals';

export type OverviewInterval = 'week' | 'month' | 'year';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export function currentMonthKey(today = new Date()): string {
  return toIsoDate(today).slice(0, 7);
}

export function shiftMonthKey(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(part => Number.parseInt(part, 10));
  const date = new Date(year, monthNumber - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthRange(month: string): DateRange {
  const startDate = `${month}-01`;
  return { startDate, endDate: lastDayOfMonth(startDate) };
}

export function getIntervalRange(
  interval: OverviewInterval,
  today = new Date(),
  monthKey = currentMonthKey(today)
): DateRange {
  const endDate = toIsoDate(today);

  if (interval === 'week') {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const weekday = start.getDay();
    const mondayOffset = weekday === 0 ? 6 : weekday - 1;
    start.setDate(start.getDate() - mondayOffset);
    return { startDate: toIsoDate(start), endDate };
  }

  if (interval === 'month') {
    return monthRange(monthKey);
  }

  return {
    startDate: toIsoDate(new Date(today.getFullYear(), 0, 1)),
    endDate,
  };
}

export function resolveOverviewRange(
  interval: OverviewInterval,
  filter: { startDate?: string; endDate?: string } | null,
  today = new Date(),
  monthKey = currentMonthKey(today)
): DateRange {
  const intervalRange = getIntervalRange(interval, today, monthKey);
  const filterStart = filter?.startDate?.trim() ?? '';
  const filterEnd = filter?.endDate?.trim() ?? '';

  if (!filterStart && !filterEnd) {
    return intervalRange;
  }

  return {
    startDate: filterStart || intervalRange.startDate,
    endDate: filterEnd || intervalRange.endDate,
  };
}

export function hasCustomSidebarDates(filter: { startDate?: string; endDate?: string } | null): boolean {
  return Boolean(filter?.startDate?.trim() || filter?.endDate?.trim());
}
