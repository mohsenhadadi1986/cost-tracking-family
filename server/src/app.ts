import cors from 'cors';
import express, { Express } from 'express';
import type Database from 'better-sqlite3';
import { createDatabase } from './db/database';
import { CategoryRepository } from './repositories/category.repository';
import { TransactionRepository } from './repositories/transaction.repository';
import { setupOpenApiDocs } from './openapi';
import { createCategoriesRouter } from './routes/categories.routes';
import { createTransactionsRouter } from './routes/transactions.routes';
import { CategoryService } from './services/category.service';
import { TransactionSummaryService } from './services/transaction-summary.service';

export interface AppContext {
  app: Express;
  db: Database.Database;
}

export function createApp(
  dbPath?: string,
  options: { seed?: boolean } = {}
): AppContext {
  const db = createDatabase(dbPath, options);
  const categoryRepository = new CategoryRepository(db);
  const categoryService = new CategoryService(categoryRepository);
  const repository = new TransactionRepository(db, categoryRepository);
  const summaryService = new TransactionSummaryService(repository);

  const app = express();
  const angularDevOrigin = 'http://localhost:4200';

  app.use(cors({ origin: angularDevOrigin }));
  app.use(express.json());

  const port = Number(process.env.PORT) || 3000;
  setupOpenApiDocs(app, port);

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
  app.use('/api/transactions', createTransactionsRouter(repository, summaryService, categoryRepository));

  return { app, db };
}
