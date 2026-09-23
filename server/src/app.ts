import cors from 'cors';
import express, { Express } from 'express';
import type Database from 'better-sqlite3';
import { createDatabase } from './db/database';
import { AccountRepository } from './repositories/account.repository';
import { CategoryRepository } from './repositories/category.repository';
import { PlanRepository } from './repositories/plan.repository';
import { Tax730Repository } from './repositories/tax-730.repository';
import { TransactionRepository } from './repositories/transaction.repository';
import { setupOpenApiDocs } from './openapi';
import { createAccountsRouter } from './routes/accounts.routes';
import { createCategoriesRouter } from './routes/categories.routes';
import { createPlansRouter } from './routes/plans.routes';
import { createReceiptsRouter } from './routes/receipts.routes';
import { createTax730Router } from './routes/tax-730.routes';
import { createTransactionsRouter } from './routes/transactions.routes';
import { AccountService } from './services/account.service';
import { CategoryService } from './services/category.service';
import { PlanService } from './services/plan.service';
import { createCursorDocumentAgent, type CursorDocumentAgent } from './services/cursor-document-agent';
import { createOfflineDocumentAgent } from './services/offline-document-agent';
import { ReceiptScanService } from './services/receipt-scan.service';
import { Tax730Service } from './services/tax-730.service';
import { TransactionSummaryService } from './services/transaction-summary.service';

export interface AppContext {
  app: Express;
  db: Database.Database;
}

export interface CreateAppOptions {
  seed?: boolean;
  enableOpenApi?: boolean;
  documentAgent?: CursorDocumentAgent;
}

export function createApp(
  dbPath?: string,
  options: CreateAppOptions = {}
): AppContext {
  const isProduction = process.env.NODE_ENV === 'production';
  const shouldSeed = options.seed ?? !isProduction;
  const shouldEnableOpenApi = options.enableOpenApi ?? !isProduction;
  const documentAgent =
    options.documentAgent ??
    (process.env.NODE_TEST_CONTEXT ? createOfflineDocumentAgent() : createCursorDocumentAgent());

  const db = createDatabase(dbPath, { seed: shouldSeed });
  const categoryRepository = new CategoryRepository(db);
  const accountRepository = new AccountRepository(db);
  const planRepository = new PlanRepository(db);
  const categoryService = new CategoryService(categoryRepository);
  const accountService = new AccountService(accountRepository);
  const repository = new TransactionRepository(db, categoryRepository, accountRepository);
  const planService = new PlanService(planRepository, accountRepository, repository, categoryRepository);
  const summaryService = new TransactionSummaryService(repository, accountRepository, planRepository, planService);
  const receiptScanService = new ReceiptScanService(categoryRepository, documentAgent);
  const tax730Service = new Tax730Service(new Tax730Repository(db), repository, documentAgent);

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
  app.use('/api/plans', createPlansRouter(planService));
  app.use('/api/transactions', createTransactionsRouter(repository, summaryService, categoryRepository, planService));
  app.use('/api/receipts', createReceiptsRouter(receiptScanService));
  app.use('/api/tax/730', createTax730Router(tax730Service));

  return { app, db };
}
