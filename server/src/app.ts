import cors from 'cors';
import express, { Express } from 'express';
import type Database from 'better-sqlite3';
import { createDatabase } from './db/database';
import { AccountRepository } from './repositories/account.repository';
import { CategoryRepository } from './repositories/category.repository';
import { TransactionRepository } from './repositories/transaction.repository';
import { setupOpenApiDocs } from './openapi';
import { createAccountsRouter } from './routes/accounts.routes';
import { createCategoriesRouter } from './routes/categories.routes';
import { createReceiptsRouter } from './routes/receipts.routes';
import { createTransactionsRouter } from './routes/transactions.routes';
import { AccountService } from './services/account.service';
import { CategoryService } from './services/category.service';
import { ReceiptScanService } from './services/receipt-scan.service';
import { TransactionSummaryService } from './services/transaction-summary.service';

export interface AppContext {
  app: Express;
  db: Database.Database;
}

export function createApp(
  dbPath?: string,
  options: { seed?: boolean; enableOpenApi?: boolean } = {}
): AppContext {
  const isProduction = process.env.NODE_ENV === 'production';
  const shouldSeed = options.seed ?? !isProduction;
  const shouldEnableOpenApi = options.enableOpenApi ?? !isProduction;

  const db = createDatabase(dbPath, { seed: shouldSeed });
  const categoryRepository = new CategoryRepository(db);
  const accountRepository = new AccountRepository(db);
  const categoryService = new CategoryService(categoryRepository);
  const accountService = new AccountService(accountRepository);
  const repository = new TransactionRepository(db, categoryRepository, accountRepository);
  const summaryService = new TransactionSummaryService(repository, accountRepository);
  const receiptScanService = new ReceiptScanService(categoryRepository);

  const app = express();

  // Dev: Angular CLI on :4200. Prod: same-origin behind nginx — no CORS needed.
  if (!isProduction) {
    app.use(cors({ origin: 'http://localhost:4200' }));
  }
  app.use(express.json());

  const port = Number(process.env.PORT) || 3000;
  if (shouldEnableOpenApi) {
    setupOpenApiDocs(app, port);
  }

  /**
   * @openapi
   * /api/health:
   *   get:
   *     tags:
   *       - Health
   *     summary: Health check
   *     description: Returns service health status.
   *     responses:
   *       200:
   *         description: Service is healthy
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/HealthResponse'
   */
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/categories', createCategoriesRouter(categoryService));
  app.use('/api/accounts', createAccountsRouter(accountService));
  app.use('/api/transactions', createTransactionsRouter(repository, summaryService, categoryRepository));
  app.use('/api/receipts', createReceiptsRouter(receiptScanService));

  return { app, db };
}
