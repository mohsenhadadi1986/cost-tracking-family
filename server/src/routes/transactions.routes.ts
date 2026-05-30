import { Router } from 'express';
import type { TransactionRepository } from '../repositories/transaction.repository';
import { TransactionSummaryService } from '../services/transaction-summary.service';

export function createTransactionsRouter(
  repository: TransactionRepository,
  summaryService: TransactionSummaryService
): Router {
  const router = Router();

  /**
   * @openapi
   * /api/transactions:
   *   get:
   *     tags:
   *       - Transactions
   *     summary: List all transactions
   *     description: |
   *       Returns all transactions for the Table tab.
   *       Results are ordered by date descending, then id descending.
   *       An empty database returns an empty array.
   *     responses:
   *       200:
   *         description: List of transactions
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Transaction'
   */
  router.get('/', (_req, res) => {
    res.status(200).json(repository.findAll());
  });

  /**
   * @openapi
   * /api/transactions:
   *   post:
   *     tags:
   *       - Transactions
   *     summary: Create a transaction
   *     description: |
   *       Persists a new transaction (Insert Data tab).
   *       Client-provided id is ignored; the server assigns the id.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateTransactionRequest'
   *     responses:
   *       201:
   *         description: Transaction created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Transaction'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               missingDate:
   *                 summary: Missing date
   *                 value:
   *                   error: date is required
   *               missingDescription:
   *                 summary: Missing description
   *                 value:
   *                   error: description is required
   *               missingCategory:
   *                 summary: Missing category
   *                 value:
   *                   error: category is required
   *               invalidType:
   *                 summary: Invalid type
   *                 value:
   *                   error: type must be either expense or income
   *               invalidAmount:
   *                 summary: Invalid amount
   *                 value:
   *                   error: amount must be a positive number
   *               invalidCategory:
   *                 summary: Invalid category
   *                 value:
   *                   error: "category must be one of: Food, Transport, Utilities, Entertainment, Salary, Investment"
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
   * @openapi
   * /api/transactions/summary:
   *   get:
   *     tags:
   *       - Transactions
   *     summary: Get transaction summary aggregates
   *     description: |
   *       Returns chart aggregates for the Visualization tab.
   *       `categoryTotals` sums expense amounts per category.
   *       `dailyTotals` covers the last 7 calendar days (oldest to newest),
   *       with zero-filled days when there is no activity.
   *     responses:
   *       200:
   *         description: Category and daily aggregates
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/TransactionSummaryResponse'
   *             example:
   *               categoryTotals:
   *                 Food: 299.8
   *                 Transport: 295.5
   *                 Utilities: 342
   *                 Entertainment: 200
   *               dailyTotals:
   *                 - date: "2026-05-24"
   *                   income: 220
   *                   expense: 76.4
   *                 - date: "2026-05-25"
   *                   income: 75
   *                   expense: 242
   *                 - date: "2026-05-26"
   *                   income: 350
   *                   expense: 129.9
   *                 - date: "2026-05-27"
   *                   income: 0
   *                   expense: 179.5
   *                 - date: "2026-05-28"
   *                   income: 150
   *                   expense: 83.25
   *                 - date: "2026-05-29"
   *                   income: 0
   *                   expense: 258.75
   *                 - date: "2026-05-30"
   *                   income: 4200
   *                   expense: 167.5
   */
  router.get('/summary', (_req, res) => {
    res.status(200).json(summaryService.getSummary());
  });

  return router;
}
