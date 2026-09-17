export const DEFAULT_ACCOUNTS = [
  'Revolut',
  'Post Bank',
  'ING Current Account',
  'ING Orange Account',
  'ING Credit Account',
  'Satispay',
  'PayPal',
  'Cash',
] as const;

export const DEFAULT_ACCOUNT = 'ING Current Account';
export const DEFAULT_CREDIT_CARD = 'ING Credit Account';
export const DEFAULT_CREDIT_BILLING_DAY = 10;

export type AccountName = (typeof DEFAULT_ACCOUNTS)[number];
export type AccountKind = 'wallet' | 'credit';
