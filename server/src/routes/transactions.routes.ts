import { Router } from 'express';
import type { CategoryRepository } from '../repositories/category.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import { TransactionSummaryService } from '../services/transaction-summary.service';
import { parseTransactionFilterQuery } from '../validation/transaction-filter.validation';

export function createTransactionsRouter(
  repository: TransactionRepository,
  summaryService: TransactionSummaryService,
  categoryRepository: CategoryRepository
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
   *       Returns transactions for the Table tab, optionally filtered by query parameters.
   *       Results are ordered by date descending, then id descending.
   *       An empty database returns an empty array.
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Include transactions on or after this date (YYYY-MM-DD)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Include transactions on or before this date (YYYY-MM-DD)
   *       - in: query
   *         name: categories
   *         schema:
   *           type: array
   *           items:
   *             type: string
   *         style: form
   *         explode: true
   *         description: Filter by one or more categories (repeat the parameter or use comma-separated values)
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [expense, income]
   *         description: Filter by transaction type
   *     responses:
   *       200:
   *         description: List of transactions
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Transaction'
   *       400:
   *         description: Invalid filter parameters
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.get('/', (req, res) => {
    try {
      const criteria = parseTransactionFilterQuery(req.query, categoryRepository);
      res.status(200).json(repository.findFiltered(criteria));
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid filter parameters',
      });
    }
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
   *                   error: "category must be one of: Food, Fuel, Utilities, Entertainment, Salary, Investment"
   */
  router.post('/', (req, res) => {
    try {
      const { date, category, type, amount, description, account } = req.body;
      const input = {
        date,
        category,
        type,
        amount,
        description,
        account,
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
   *       Accepts the same filter query parameters as `GET /api/transactions`.
   *       `categoryTotals` sums expense amounts per category.
   *       `incomeByCategory` sums income amounts per source.
   *       `dailyTotals` zero-fills the requested date range (daily buckets, or
   *       monthly when the range is longer than 62 days). Without dates, buckets
   *       span the earliest to latest matching transaction.
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Include transactions on or after this date (YYYY-MM-DD)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Include transactions on or before this date (YYYY-MM-DD)
   *       - in: query
   *         name: categories
   *         schema:
   *           type: array
   *           items:
   *             type: string
   *         style: form
   *         explode: true
   *         description: Filter by one or more categories (repeat the parameter or use comma-separated values)
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [expense, income]
   *         description: Filter by transaction type
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
   *                 Fuel: 42
   *               incomeByCategory:
   *                 Salary: 4550
   *                 Investment: 445
   *               totalIncome: 4995
   *               totalExpense: 1137.3
   *               netBalance: 3857.7
   *               dailyTotals:
   *                 - date: "2026-09-01"
   *                   income: 4200
   *                   expense: 167.5
   *       400:
   *         description: Invalid filter parameters
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.get('/summary', (req, res) => {
    try {
      const criteria = parseTransactionFilterQuery(req.query, categoryRepository);
      res.status(200).json(summaryService.getSummary(criteria));
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid filter parameters',
      });
    }
  });

  return router;
}
