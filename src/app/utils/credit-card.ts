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
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function resolveTransactionSettlement(
  input: { date: string; type: 'income' | 'expense'; account: string },
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

