import { AccountBreakdown, CreditCardDue, DailyTotal, TransactionSummaryResponse } from '../models/transaction-summary.model';
import { Transaction } from '../models/transaction.model';
import { todayIsoDate } from '../utils/credit-card';
import { markPlanOccurrences, plannedDuesBetween, PlanSchedule } from '../utils/plan-schedule';

const MONTHLY_BUCKET_THRESHOLD_DAYS = 62;

export type SummaryTransaction = Pick<
  Transaction,
  'date' | 'category' | 'type' | 'amount' | 'account'
> &
  Partial<Pick<Transaction, 'settlementDate' | 'settlementAccount' | 'toAccount'>>;

export type AccountSummaryMeta = {
  name: string;
  kind?: 'wallet' | 'credit';
};

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(part => Number.parseInt(part, 10));
  return new Date(year, month - 1, day);
}

export function addDays(value: string, days: number): string {
  const date = parseIsoDate(value);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function daysInclusive(startDate: string, endDate: string): number {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return diff + 1;
}

export function enumerateDays(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  let cursor = startDate;

  while (cursor <= endDate) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

export function monthStart(value: string): string {
  return `${value.slice(0, 7)}-01`;
}

export function enumerateMonths(startDate: string, endDate: string): string[] {
  const months: string[] = [];
  const start = parseIsoDate(monthStart(startDate));
  const end = parseIsoDate(monthStart(endDate));

  while (start <= end) {
    months.push(toIsoDate(start));
    start.setMonth(start.getMonth() + 1);
  }

  return months;
}

export function lastDayOfMonth(monthStartDate: string): string {
  const date = parseIsoDate(monthStartDate);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return toIsoDate(date);
}

export function resolveSummaryRange(
  transactions: SummaryTransaction[],
  startDate?: string,
  endDate?: string
): { startDate: string; endDate: string } | null {
  if (startDate && endDate) {
    return { startDate, endDate };
  }

  if (transactions.length === 0) {
    return startDate || endDate
      ? { startDate: startDate ?? endDate as string, endDate: endDate ?? startDate as string }
      : null;
  }

  const dates = transactions.map(transaction => transaction.date);
  const earliest = dates.reduce((min, date) => (date < min ? date : min));
  const latest = dates.reduce((max, date) => (date > max ? date : max));

  return {
    startDate: startDate ?? earliest,
    endDate: endDate ?? latest,
  };
}

export function getCategoryTotals(transactions: SummaryTransaction[]): Record<string, number> {
  return transactions.reduce((acc, curr) => {
    if (curr.type === 'expense') {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    }
    return acc;
  }, {} as Record<string, number>);
}

export function getIncomeByCategory(transactions: SummaryTransaction[]): Record<string, number> {
  return transactions.reduce((acc, curr) => {
    if (curr.type === 'income' && !isReceivableCategory(curr.category)) {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    }
    return acc;
  }, {} as Record<string, number>);
}

export function isReceivableCategory(name: string): boolean {
  return /^(lend|loan)\b/i.test(name.trim());
}

export function getTotals(transactions: SummaryTransaction[]): {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
} {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const transaction of transactions) {
    if (transaction.type === 'income') {
      if (!isReceivableCategory(transaction.category)) {
        totalIncome += transaction.amount;
      }
    } else if (transaction.type === 'expense') {
      totalExpense += transaction.amount;
    }
  }

  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
  };
}

export function getPeriodTotals(
  transactions: SummaryTransaction[],
  startDate?: string,
  endDate?: string
): DailyTotal[] {
  const range = resolveSummaryRange(transactions, startDate, endDate);
  if (!range) {
    return [];
  }

  const span = daysInclusive(range.startDate, range.endDate);

  if (span > MONTHLY_BUCKET_THRESHOLD_DAYS) {
    return enumerateMonths(range.startDate, range.endDate).map(month => {
      const bucketStart = month < range.startDate ? range.startDate : month;
      const monthEnd = lastDayOfMonth(month);
      const bucketEnd = monthEnd < range.endDate ? monthEnd : range.endDate;
      const inBucket = transactions.filter(
        transaction => transaction.date >= bucketStart && transaction.date <= bucketEnd
      );

      return {
        date: month,
        income: sumByType(inBucket, 'income'),
        expense: sumByType(inBucket, 'expense'),
      };
    });
  }

  return enumerateDays(range.startDate, range.endDate).map(date => {
    const dayTransactions = transactions.filter(transaction => transaction.date === date);
    return {
      date,
      income: sumByType(dayTransactions, 'income'),
      expense: sumByType(dayTransactions, 'expense'),
    };
  });
}

export function buildSummary(
  transactions: SummaryTransaction[],
  startDate?: string,
  endDate?: string,
  options: {
    lifetimeTransactions?: SummaryTransaction[];
    accountNames?: string[];
    accounts?: AccountSummaryMeta[];
    plans?: PlanSchedule[];
    asOfDate?: string;
  } = {}
): TransactionSummaryResponse {
  const totals = getTotals(transactions);
  const lifetime = options.lifetimeTransactions ?? transactions;
  const asOfDate = options.asOfDate ?? resolveAsOfDate(endDate);
  const dueMonth = resolveDueMonth(startDate, endDate, asOfDate);
  const asOfMonth = asOfDate.slice(0, 7);
  const reservedFromMonth = asOfMonth < dueMonth ? asOfMonth : dueMonth;
  const accounts = options.accounts ?? (options.accountNames ?? []).map(name => ({ name, kind: 'wallet' as const }));
  const accountBalances = getAccountBalances(lifetime, accounts, asOfDate);
  const receivableBalances = getReceivableBalances(lifetime, asOfDate);
  const currentBalance = accountBalances
    .filter(row => !isCreditAccount(row.account, accounts))
    .reduce((sum, row) => sum + row.amount, 0);
  const occurrences = markPlanOccurrences(options.plans ?? [], lifetime);
  const plannedDues = plannedDuesBetween(occurrences, dueMonth, dueMonth);
  const reservedPlanTotal = plannedDuesBetween(occurrences, reservedFromMonth, dueMonth)
    .reduce((sum, due) => sum + due.amount, 0);
  const creditCardDues = getCreditCardDues(lifetime, accounts, asOfDate, dueMonth, dueMonth);
  const reservedCardDueTotal = getCreditCardDues(
    lifetime,
    accounts,
    asOfDate,
    reservedFromMonth,
    dueMonth
  ).reduce((sum, due) => sum + due.amount, 0);
  const plannedDueTotal = plannedDues.reduce((sum, due) => sum + due.amount, 0);
  const creditCardDueTotal = creditCardDues.reduce((sum, due) => sum + due.amount, 0);
  const interveningReserved = reservedPlanTotal + reservedCardDueTotal - plannedDueTotal - creditCardDueTotal;
  const projectedBalance = currentBalance - interveningReserved;
  const receivableTotal = receivableBalances.reduce((sum, row) => sum + row.amount, 0);

  return {
    categoryTotals: getCategoryTotals(transactions),
    incomeByCategory: getIncomeByCategory(transactions),
    dailyTotals: getPeriodTotals(transactions, startDate, endDate),
    totalIncome: totals.totalIncome,
    totalExpense: totals.totalExpense,
    netBalance: totals.netBalance,
    currentBalance,
    projectedBalance,
    accountBalances,
    incomeByAccount: getIncomeByAccount(
      transactions.filter(transaction => !isReceivableCategory(transaction.category)),
      accounts.map(account => account.name)
    ).filter(row => row.amount !== 0),
    expenseByAccount: getExpenseByAccount(transactions, accounts.map(account => account.name))
      .filter(row => row.amount !== 0),
    creditCardDues,
    plannedDues,
    plannedDueTotal,
    availableThisMonth: projectedBalance - plannedDueTotal - creditCardDueTotal,
    receivableBalances,
    receivableTotal,
  };
}

export function getAccountBalances(
  transactions: SummaryTransaction[],
  accounts: AccountSummaryMeta[] = [],
  asOfDate: string = todayIsoDate()
): AccountBreakdown[] {
  const names = [
    ...new Set([
      ...accounts.map(account => account.name),
      ...transactions.map(transaction => transaction.account),
      ...transactions.map(transaction => settlementAccountOf(transaction)),
      ...transactions.flatMap(transaction => (transaction.toAccount ? [transaction.toAccount] : [])),
    ]),
  ];

  const rows = names.map(account => {
    const credit = isCreditAccount(account, accounts);
    let amount = 0;
    const related: SummaryTransaction[] = [];

    for (const transaction of transactions) {
      if (credit) {
        if (
          transaction.type === 'expense' &&
          transaction.account === account &&
          settlementDateOf(transaction) > asOfDate
        ) {
          amount -= transaction.amount;
          related.push(transaction);
        }
        continue;
      }

      if (
        transaction.type === 'income'
        && transaction.account === account
        && transaction.date <= asOfDate
      ) {
        if (isReceivableCategory(transaction.category)) {
          continue;
        }
        amount += transaction.amount;
        related.push(transaction);
      } else if (
        transaction.type === 'expense' &&
        settlementAccountOf(transaction) === account &&
        settlementDateOf(transaction) <= asOfDate
      ) {
        amount -= transaction.amount;
        related.push(transaction);
      } else if (transaction.type === 'transfer' && transaction.date <= asOfDate) {
        if (transaction.account === account) {
          amount -= transaction.amount;
          related.push(transaction);
        }
        if (transaction.toAccount === account) {
          amount += transaction.amount;
          related.push(transaction);
        }
      }
    }

    const latest = [...related].sort((left, right) => (left.date < right.date ? 1 : -1))[0];

    return {
      account,
      amount,
      lastDate: latest?.date,
      lastCategory: latest?.category,
    };
  });

  return sortBreakdown(rows);
}

export function getIncomeByAccount(
  transactions: SummaryTransaction[],
  accountNames: string[] = []
): AccountBreakdown[] {
  return buildAccountBreakdown(
    transactions.filter(transaction => transaction.type === 'income'),
    accountNames,
    'sum'
  );
}

export function getExpenseByAccount(
  transactions: SummaryTransaction[],
  accountNames: string[] = []
): AccountBreakdown[] {
  return buildAccountBreakdown(
    transactions.filter(transaction => transaction.type === 'expense'),
    accountNames,
    'sum'
  );
}

export function getCreditCardDues(
  transactions: SummaryTransaction[],
  accounts: AccountSummaryMeta[],
  asOfDate: string,
  fromMonth?: string,
  toMonth = fromMonth
): CreditCardDue[] {
  const creditNames = new Set(
    accounts.filter(account => account.kind === 'credit').map(account => account.name)
  );
  const grouped = new Map<string, CreditCardDue>();

  for (const transaction of transactions) {
    if (transaction.type !== 'expense' || !creditNames.has(transaction.account)) {
      continue;
    }

    const settlementDate = settlementDateOf(transaction);
    if (settlementDate <= asOfDate) {
      continue;
    }
    if (fromMonth && settlementDate.slice(0, 7) < fromMonth) {
      continue;
    }
    if (toMonth && settlementDate.slice(0, 7) > toMonth) {
      continue;
    }

    const settlementAccount = settlementAccountOf(transaction);
    const key = `${transaction.account}|${settlementAccount}|${settlementDate}`;
    const current = grouped.get(key);
    if (current) {
      current.amount += transaction.amount;
    } else {
      grouped.set(key, {
        account: transaction.account,
        settlementAccount,
        settlementDate,
        amount: transaction.amount,
      });
    }
  }

  return [...grouped.values()].sort((left, right) => {
    if (left.settlementDate !== right.settlementDate) {
      return left.settlementDate.localeCompare(right.settlementDate);
    }
    return left.account.localeCompare(right.account);
  });
}

export function getReceivableBalances(
  transactions: SummaryTransaction[],
  asOfDate: string = todayIsoDate()
): AccountBreakdown[] {
  const grouped = new Map<string, { amount: number; related: SummaryTransaction[] }>();

  for (const transaction of transactions) {
    if (!isReceivableCategory(transaction.category) || transaction.date > asOfDate) {
      continue;
    }

    const current = grouped.get(transaction.category) ?? { amount: 0, related: [] };
    current.amount += transaction.amount;
    current.related.push(transaction);
    grouped.set(transaction.category, current);
  }

  const rows = [...grouped.entries()]
    .filter(([, value]) => value.amount !== 0)
    .map(([account, value]) => {
      const latest = [...value.related].sort((left, right) => (left.date < right.date ? 1 : -1))[0];
      return {
        account,
        amount: value.amount,
        lastDate: latest?.date,
        lastCategory: latest?.account,
      };
    });

  return sortBreakdown(rows);
}

function resolveAsOfDate(endDate?: string): string {
  const today = todayIsoDate();
  if (endDate && endDate < today) {
    return endDate;
  }
  return today;
}

function resolveDueMonth(startDate: string | undefined, endDate: string | undefined, asOfDate: string): string {
  if (startDate && endDate && startDate.slice(0, 7) === endDate.slice(0, 7)) {
    return startDate.slice(0, 7);
  }
  return asOfDate.slice(0, 7);
}

function settlementDateOf(transaction: SummaryTransaction): string {
  return transaction.settlementDate ?? transaction.date;
}

function settlementAccountOf(transaction: SummaryTransaction): string {
  return transaction.settlementAccount ?? transaction.account;
}

function isCreditAccount(name: string, accounts: AccountSummaryMeta[]): boolean {
  return accounts.some(account => account.name === name && account.kind === 'credit');
}

function sortBreakdown(rows: AccountBreakdown[]): AccountBreakdown[] {
  return rows.sort((left, right) => {
    if (right.amount !== left.amount) {
      return Math.abs(right.amount) - Math.abs(left.amount);
    }
    return left.account.localeCompare(right.account);
  });
}

function buildAccountBreakdown(
  transactions: SummaryTransaction[],
  accountNames: string[],
  mode: 'net' | 'sum'
): AccountBreakdown[] {
  const names = [...new Set([...accountNames, ...transactions.map(transaction => transaction.account)])];
  const rows = names.map(account => {
    const inAccount = transactions.filter(transaction => transaction.account === account);
    let amount = 0;

    for (const transaction of inAccount) {
      if (mode === 'sum') {
        amount += transaction.amount;
      } else if (transaction.type === 'income') {
        amount += transaction.amount;
      } else {
        amount -= transaction.amount;
      }
    }

    const latest = [...inAccount].sort((left, right) => {
      if (left.date === right.date) {
        return 0;
      }
      return left.date < right.date ? 1 : -1;
    })[0];

    return {
      account,
      amount,
      lastDate: latest?.date,
      lastCategory: latest?.category,
    };
  });

  return rows.sort((left, right) => {
    if (right.amount !== left.amount) {
      return Math.abs(right.amount) - Math.abs(left.amount);
    }
    return left.account.localeCompare(right.account);
  });
}

function sumByType(transactions: SummaryTransaction[], type: 'income' | 'expense'): number {
  return transactions
    .filter(transaction => {
      if (transaction.type !== type) {
        return false;
      }
      return type === 'expense' || !isReceivableCategory(transaction.category);
    })
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}
