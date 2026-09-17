export type AccountKind = 'wallet' | 'credit';

export interface Account {
  id: number;
  name: string;
  kind: AccountKind;
  billingDay: number | null;
  settlementAccount: string | null;
}

export interface CreateAccountRequest {
  name: string;
  kind?: AccountKind;
  billingDay?: number | null;
  settlementAccount?: string | null;
}

export interface UpdateAccountRequest {
  name?: string;
  kind?: AccountKind;
  billingDay?: number | null;
  settlementAccount?: string | null;
}
