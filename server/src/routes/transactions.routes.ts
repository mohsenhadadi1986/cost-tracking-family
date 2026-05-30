import { Router } from 'express';
import type { TransactionRepository } from '../repositories/transaction.repository';
import { TransactionSummaryService } from '../services/transaction-summary.service';

export function createTransactionsRouter(
  repository: TransactionRepository,
  summaryService: TransactionSummaryService
): Router {
  const router = Router();

  /**
   * GET /api/transactions
   * Returns all transactions for the Table tab.
   *
   * Response 200: Transaction[] — each item includes
   * { id, date, category, type, amount, description }.
   * Results are ordered by date descending, then id descending.
   * An empty database returns 200 with [].
   */
  router.get('/', (_req, res) => {
    res.status(200).json(repository.findAll());
  });

  /**
   * POST /api/transactions
   * Persists a new transaction (Insert Data tab).
   *
   * Request body: { date, category, type, amount, description }
   * Client-provided id is ignored.
   *
   * Response 201: Transaction { id, date, category, type, amount, description }
   * Response 400: { error: string }
   */
  router.post('/', (req, res) => {
    try {
      const { date, category, type, amount, description } = req.body;
      const input = {
        date,
        category,
        type,
        amount,
        description,
      };
      const created = repository.create(input);
      res.status(201).json(created);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid transaction',
      });
    }
  });

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
