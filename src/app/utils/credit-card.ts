export const FAMILY_TIMEZONE = 'Europe/Rome';

export function creditCardSettlementDate(
  purchaseDate: string,
  billingDay = 10
): string {
  const [yearText, monthText] = purchaseDate.split('-');
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const settleMonth = month === 12 ? 1 : month + 1;
  const settleYear = month === 12 ? year + 1 : year;
  const day = Math.min(Math.max(Math.trunc(billingDay) || 10, 1), 28);

  return `${settleYear}-${String(settleMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function todayIsoDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FAMILY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function creditCardStatementDescription(cardName: string): string {
  return `${cardName} statement`;
}

export type StatementPayoffInput = {
  date: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  account: string;
  toAccount?: string | null;
  settlementDate?: string;
  settlementAccount?: string;
};

export type AccountKindMeta = {
  name: string;
  kind?: 'wallet' | 'credit';
};

export type StatementPayoff = {
  date: string;
  amount: number;
  account: string;
  toAccount: string;
  description: string;
};

function roundCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function settlementDateOf(transaction: StatementPayoffInput): string {
  return transaction.settlementDate ?? transaction.date;
}

function settlementAccountOf(transaction: StatementPayoffInput): string {
  return transaction.settlementAccount ?? transaction.account;
}

export function buildCreditCardStatementPayoffs(
  transactions: StatementPayoffInput[],
  accounts: AccountKindMeta[],
  asOfDate: string
): StatementPayoff[] {
  const creditNames = new Set(
    accounts.filter(account => account.kind === 'credit').map(account => account.name)
  );
  if (creditNames.size === 0) {
    return [];
  }

  const grouped = new Map<string, StatementPayoff>();

  for (const transaction of transactions) {
    if (transaction.type !== 'expense' || !creditNames.has(transaction.account)) {
      continue;
    }

    const settlementDate = settlementDateOf(transaction);
    if (settlementDate > asOfDate) {
      continue;
    }

    const settlementAccount = settlementAccountOf(transaction);
    if (settlementAccount === transaction.account) {
      continue;
    }

    const key = `${transaction.account}|${settlementAccount}|${settlementDate}`;
    const current = grouped.get(key);
    if (current) {
      current.amount = roundCents(current.amount + transaction.amount);
    } else {
      grouped.set(key, {
        date: settlementDate,
        amount: roundCents(transaction.amount),
        account: settlementAccount,
        toAccount: transaction.account,
        description: creditCardStatementDescription(transaction.account),
      });
    }
  }

  return [...grouped.values()]
    .filter(payoff => payoff.amount > 0)
    .sort((left, right) => {
      if (left.date !== right.date) {
        return left.date.localeCompare(right.date);
      }
      return left.toAccount.localeCompare(right.toAccount);
    });
}

export function findStatementTransfer(
  transactions: StatementPayoffInput[],
  payoff: Pick<StatementPayoff, 'date' | 'account' | 'toAccount'>
): StatementPayoffInput | undefined {
  return transactions.find(transaction =>
    transaction.type === 'transfer'
    && transaction.date === payoff.date
    && transaction.account === payoff.account
    && transaction.toAccount === payoff.toAccount
  );
}

export function isExpenseCoveredByStatementTransfer(
  transaction: StatementPayoffInput,
  transactions: StatementPayoffInput[],
  accounts: AccountKindMeta[]
): boolean {
  if (transaction.type !== 'expense') {
    return false;
  }

  const creditNames = new Set(
    accounts.filter(account => account.kind === 'credit').map(account => account.name)
  );
  if (!creditNames.has(transaction.account)) {
    return false;
  }

  return Boolean(findStatementTransfer(transactions, {
    date: settlementDateOf(transaction),
    account: settlementAccountOf(transaction),
    toAccount: transaction.account,
  }));
}

export function resolveTransactionSettlement(
  input: { date: string; type: 'income' | 'expense' | 'transfer'; account: string },
  accounts: Array<{ name: string; kind?: 'wallet' | 'credit'; billingDay?: number | null; settlementAccount?: string | null }>
): { settlementDate: string; settlementAccount: string } {
  const place = accounts.find(account => account.name === input.account);
  if (input.type === 'expense' && place?.kind === 'credit') {
    return {
      settlementDate: creditCardSettlementDate(input.date, place.billingDay ?? undefined),
      settlementAccount: place.settlementAccount ?? input.account,
    };
  }

  return {
    settlementDate: input.date,
    settlementAccount: input.account,
  };
}
