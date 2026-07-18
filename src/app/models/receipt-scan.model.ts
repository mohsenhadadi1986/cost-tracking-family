export interface ReceiptScanConfidence {
  overall?: number;
  date?: number;
  amount?: number;
  description?: number;
  suggestedCategory?: number;
}

export interface ReceiptScanResponse {
  date?: string;
  amount?: number;
  description?: string;
  suggestedCategory?: string;
  confidence?: ReceiptScanConfidence;
}
