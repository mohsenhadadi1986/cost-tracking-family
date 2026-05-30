# cost-tracking-family

Family expense tracking app with an Angular frontend and Express API.

## Local development

Install dependencies for the frontend and backend:

```bash
npm install
npm install --prefix server
```

Run the Angular app and API together:

```bash
npm run dev
```

This starts:

- Frontend at `http://localhost:4200`
- Backend at `http://localhost:3000` (override with `PORT`, e.g. `PORT=4000 npm run server:dev`)

Run them separately if needed:

```bash
npm start              # Angular dev server
npm run server:dev     # Express API with hot reload
```

Build and run the API for production-style local testing:

```bash
npm run server:build
npm run server:start
```

Health check: `GET http://localhost:3000/api/health`

### Transaction summary (charts)

`GET http://localhost:3000/api/transactions/summary`

Returns aggregated data for the Visualization tab. Response shape:

```json
{
  "categoryTotals": {
    "Food": 299.8,
    "Transport": 295.5
  },
  "dailyTotals": [
    { "date": "2026-05-24", "income": 220, "expense": 76.4 },
    { "date": "2026-05-25", "income": 75, "expense": 242 }
  ]
}
```

- `categoryTotals`: expense amounts summed by category (expenses only)
- `dailyTotals`: last 7 calendar days, oldest first, with per-day `income` and `expense` totals

Optional env var: `DATABASE_PATH` (default: `server/data/transactions.db`). The database is seeded with mock transactions when empty.
