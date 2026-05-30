import cors from 'cors';
import express from 'express';
import { createDatabase } from './db/database';

createDatabase();

const app = express();
const port = Number(process.env.PORT) || 3000;
const angularDevOrigin = 'http://localhost:4200';

app.use(cors({ origin: angularDevOrigin }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
