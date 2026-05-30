import { Router } from 'express';
import type { TransactionRepository } from '../repositories/transaction.repository';

export function createTransactionsRouter(
  repository: TransactionRepository
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

  return router;
}
