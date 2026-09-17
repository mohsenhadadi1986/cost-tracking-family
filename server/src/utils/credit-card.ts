import { DEFAULT_CREDIT_BILLING_DAY } from '../constants/accounts';

export function creditCardSettlementDate(
  purchaseDate: string,
  billingDay: number = DEFAULT_CREDIT_BILLING_DAY
): string {
  const [yearText, monthText] = purchaseDate.split('-');
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const settleMonth = month === 12 ? 1 : month + 1;
  const settleYear = month === 12 ? year + 1 : year;
  const day = Math.min(Math.max(Math.trunc(billingDay) || DEFAULT_CREDIT_BILLING_DAY, 1), 28);

  return `${settleYear}-${String(settleMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function todayIsoDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
