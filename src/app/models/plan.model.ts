export interface Plan {
  id: number;
  name: string;
  amount: number;
  account: string;
  billingDay: number;
  startDate: string;
  endDate: string | null;
  paymentCount: number | null;
  remainingCount: number;
  totalCount: number;
}

export interface CreatePlanRequest {
  name: string;
  amount: number;
  account: string;
  billingDay?: number;
  startDate: string;
  endDate?: string | null;
  paymentCount?: number | null;
}

export interface UpdatePlanRequest {
  name?: string;
  amount?: number;
  account?: string;
  billingDay?: number;
  startDate?: string;
  endDate?: string | null;
  paymentCount?: number | null;
}
