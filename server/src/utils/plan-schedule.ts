export type PlanSchedule = {
  id: number;
  name: string;
  amount: number;
  account: string;
  billingDay: number;
  startDate: string;
  endDate: string | null;
  paymentCount: number | null;
};

export type PlanExpense = {
  date: string;
  type: 'expense' | 'income';
  amount: number;
  account: string;
};

export type PlanOccurrence = {
  planId: number;
  name: string;
  account: string;
  amount: number;
  dueDate: string;
  index: number;
  total: number;
  paid: boolean;
};

export type PlannedDue = {
  planId: number;
  name: string;
  account: string;
  dueDate: string;
  amount: number;
  remainingCount: number;
};

const MAX_PAYMENTS = 600;

export function firstDueDate(
  startDate: string,
  billingDay: number,
  endDate: string | null = null
): string {
  const [year, month] = splitIso(startDate);
  const dueThisMonth = dueOnBillingDay(year, month, billingDay);
  if (startDate <= dueThisMonth && (!endDate || dueThisMonth <= endDate)) {
    return dueThisMonth;
  }

  const [nextYear, nextMonth] = shiftMonth(year, month, 1);
  const next = dueOnBillingDay(nextYear, nextMonth, billingDay);
  if (!endDate || next <= endDate) {
    return next;
  }

  return startDate;
}

export function enumeratePlanDueDates(plan: PlanSchedule): string[] {
  const first = firstDueDate(plan.startDate, plan.billingDay, plan.endDate);
  const limit = plan.paymentCount && plan.paymentCount > 0
    ? Math.min(plan.paymentCount, MAX_PAYMENTS)
    : MAX_PAYMENTS;
  const dates: string[] = [];
  let [year, month] = splitIso(first);

  for (let index = 0; index < limit; index += 1) {
    const due = index === 0 ? first : dueOnBillingDay(year, month, plan.billingDay);
    if (plan.endDate && due > plan.endDate) {
      break;
    }

    dates.push(due);
    [year, month] = shiftMonth(year, month, 1);
  }

  return dates;
}

export function markPlanOccurrences(
  plans: PlanSchedule[],
  transactions: PlanExpense[]
): PlanOccurrence[] {
  const expenses = transactions
    .filter(transaction => transaction.type === 'expense')
    .map(transaction => ({ ...transaction, used: false }));

  const occurrences: PlanOccurrence[] = [];

  for (const plan of plans) {
    const dues = enumeratePlanDueDates(plan);

    for (let index = 0; index < dues.length; index += 1) {
      const dueDate = dues[index];
      const month = dueDate.slice(0, 7);
      const amountCents = toCents(plan.amount);
      const match = expenses.find(transaction =>
        !transaction.used
        && transaction.account === plan.account
        && toCents(transaction.amount) === amountCents
        && transaction.date.slice(0, 7) === month
      );

      if (match) {
        match.used = true;
      }

      occurrences.push({
        planId: plan.id,
        name: plan.name,
        account: plan.account,
        amount: plan.amount,
        dueDate,
        index: index + 1,
        total: dues.length,
        paid: Boolean(match),
      });
    }
  }

  return occurrences;
}

export function remainingUnpaidCount(occurrences: PlanOccurrence[], planId: number): number {
  return occurrences.filter(occurrence => occurrence.planId === planId && !occurrence.paid).length;
}

export function plannedDuesBetween(
  occurrences: PlanOccurrence[],
  fromMonth: string,
  toMonth: string
): PlannedDue[] {
  return occurrences
    .filter(occurrence => {
      if (occurrence.paid) {
        return false;
      }
      const month = occurrence.dueDate.slice(0, 7);
      return month >= fromMonth && month <= toMonth;
    })
    .map(occurrence => ({
      planId: occurrence.planId,
      name: occurrence.name,
      account: occurrence.account,
      dueDate: occurrence.dueDate,
      amount: occurrence.amount,
      remainingCount: remainingUnpaidCount(occurrences, occurrence.planId),
    }))
    .sort((left, right) => {
      if (left.dueDate !== right.dueDate) {
        return left.dueDate.localeCompare(right.dueDate);
      }
      return left.name.localeCompare(right.name);
    });
}

export function plannedDuesThisMonth(
  occurrences: PlanOccurrence[],
  asOfDate: string
): PlannedDue[] {
  const month = asOfDate.slice(0, 7);
  return plannedDuesBetween(occurrences, month, month);
}

export function addCalendarMonths(isoDate: string, months: number): string {
  const [year, month, day] = splitIso(isoDate);
  const [nextYear, nextMonth] = shiftMonth(year, month, months);
  return dueOnBillingDay(nextYear, nextMonth, day);
}

function dueOnBillingDay(year: number, month: number, billingDay: number): string {
  const last = lastDayOfMonth(year, month);
  const day = Math.min(Math.max(Math.trunc(billingDay) || 1, 1), last);
  return toIso(year, month, day);
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function shiftMonth(year: number, month: number, months: number): [number, number] {
  const monthIndex = month - 1 + months;
  const nextYear = year + Math.floor(monthIndex / 12);
  const nextMonth = (monthIndex % 12 + 12) % 12 + 1;
  return [nextYear, nextMonth];
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function splitIso(value: string): [number, number, number] {
  const [year, month, day] = value.split('-').map(part => Number.parseInt(part, 10));
  return [year, month, day];
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
