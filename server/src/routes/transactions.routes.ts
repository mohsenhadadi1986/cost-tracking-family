import { Router } from 'express';
import { TransactionSummaryService } from '../services/transaction-summary.service';

export function createTransactionsRouter(summaryService: TransactionSummaryService): Router {
  const router = Router();

  /**
   * GET /api/transactions/summary
   * Returns chart aggregates for the Visualization tab.
   *
   * Response 200:
   * {
   *   categoryTotals: { [category: string]: number },
   *   dailyTotals: [{ date: string, income: number, expense: number }]
   * }
   */
  router.get('/summary', (_req, res) => {
    res.status(200).json(summaryService.getSummary());
  });

  return router;
}
