import cors from 'cors';
import express, { Express } from 'express';
import type Database from 'better-sqlite3';
import { createDatabase } from './db/database';
import { TransactionRepository } from './repositories/transaction.repository';
import { createTransactionsRouter } from './routes/transactions.routes';
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
  const repository = new TransactionRepository(db);
  const summaryService = new TransactionSummaryService(repository);

  const app = express();
  const angularDevOrigin = 'http://localhost:4200';

  app.use(cors({ origin: angularDevOrigin }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/transactions', createTransactionsRouter(repository, summaryService));

  return { app, db };
}
