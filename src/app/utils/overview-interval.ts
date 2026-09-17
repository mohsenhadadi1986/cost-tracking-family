import { toIsoDate } from './period-totals';

export type OverviewInterval = 'week' | 'month' | 'year';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export function getIntervalRange(interval: OverviewInterval, today = new Date()): DateRange {
  const endDate = toIsoDate(today);

  if (interval === 'week') {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const weekday = start.getDay();
    const mondayOffset = weekday === 0 ? 6 : weekday - 1;
    start.setDate(start.getDate() - mondayOffset);
    return { startDate: toIsoDate(start), endDate };
  }

  if (interval === 'month') {
    return {
      startDate: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      endDate,
    };
  }

  return {
    startDate: toIsoDate(new Date(today.getFullYear(), 0, 1)),
    endDate,
  };
}

export function resolveOverviewRange(
  interval: OverviewInterval,
  filter: { startDate?: string; endDate?: string } | null,
  today = new Date()
): DateRange {
  const intervalRange = getIntervalRange(interval, today);
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
