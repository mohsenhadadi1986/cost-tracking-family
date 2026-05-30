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

  return router;
}
