import { Router } from 'express';
import { TransactionRepository } from '../repositories/transaction.repository';
import { TransactionSummaryService } from '../services/transaction-summary.service';

export function createTransactionsRouter(
  repository: TransactionRepository,
  summaryService: TransactionSummaryService
): Router {
  const router = Router();

  router.post('/', (req, res) => {
    try {
      const { date, category, type, amount, description } = req.body;
      const created = repository.create({ date, category, type, amount, description });
      res.status(201).json(created);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid transaction',
      });
    }
  });

  router.get('/', (_req, res) => {
    res.status(200).json(repository.findAll());
  });

  router.get('/summary', (_req, res) => {
    res.status(200).json(summaryService.getSummary());
  });

  return router;
}
