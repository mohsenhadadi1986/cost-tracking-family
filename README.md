# cost-tracking-family

Family expense tracking app with an Angular frontend and Express API backed by SQLite.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later (LTS recommended)
- npm (included with Node.js)

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port for the Express API |
| `DATABASE_PATH` | `server/data/transactions.db` | Absolute or relative path to the SQLite database file |

Set variables inline when starting the server, for example:

```bash
PORT=4000 DATABASE_PATH=/tmp/transactions.db npm run server:dev
```

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
- Backend at `http://localhost:3000`

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

## Branding

Logo and favicon files live in [`src/assets/branding/`](src/assets/branding/). The Angular build copies everything under `src/assets/` to `/assets/` at deploy time (see [`angular.json`](angular.json)).

| File | Purpose |
|------|---------|
| `logo.svg` | Full lockup (mark + wordmark) |
| `logo-mark.svg` | Icon-only mark |
| `favicon-32.png` | Browser tab favicon (32×32) |
| `favicon-180.png` | Apple touch icon (180×180) |

**Canonical display name:** use **Family Expense Manager** in the HTML `<title>` ([`src/index.html`](src/index.html)) and anywhere the app name appears in the UI (including logo `alt` text).

**In-app logos:** prefer [`AppLogoComponent`](src/app/components/ui/app-logo.component.ts) (`<app-logo>`) over raw `<img>` tags. It maps variants to the correct asset, applies consistent sizing (`sm` / `md` / `lg`), and supports accessibility via `alt` and `decorative` inputs.

| Use | When |
|-----|------|
| `<app-logo variant="full" …>` | Headers and primary branding (wordmark lockup) |
| `<app-logo variant="mark" …>` | Compact spaces (e.g. mobile filter toggle) |
| Raw SVG/PNG paths | Only outside Angular templates (e.g. static HTML, external docs) |

Set `[decorative]="true"` when visible text beside the logo already names the app; otherwise provide a meaningful `alt` (default: `Family Expenses`).

**Updating favicons:** replace the PNG files in `src/assets/branding/`, then confirm the `<link rel="icon">` and `<link rel="apple-touch-icon">` entries in [`src/index.html`](src/index.html) still point at `/assets/branding/favicon-32.png` and `/assets/branding/favicon-180.png`. Hard-refresh the browser to verify.

## API documentation (OpenAPI / Swagger UI)

Interactive API documentation is served by the Express backend:

| Resource | Path | Direct API URL (`npm run dev` → port 3000) |
|----------|------|---------------------------------------------|
| Swagger UI | `/api/docs` | http://localhost:3000/api/docs |
| OpenAPI spec (JSON) | `/api/openapi.json` | http://localhost:3000/api/openapi.json |

When you use `npm run dev`, the Angular dev server proxies every `/api` request (including docs) to the backend. Open the same paths on port **4200**:

- Swagger UI: http://localhost:4200/api/docs
- OpenAPI JSON: http://localhost:4200/api/openapi.json

The proxy rule in [`proxy.conf.json`](proxy.conf.json) matches all `/api` subpaths, so no separate proxy entries are required for these routes.

Swagger UI and the OpenAPI spec are the canonical, up-to-date API reference. The [REST API](#rest-api) section below keeps curl-oriented examples for quick manual testing.

## SQLite data storage

When the API starts, it creates a SQLite database if one does not exist and seeds it with mock transactions when the table is empty.

- **Default location:** `server/data/transactions.db` (relative to the repository root; the file is gitignored)
- **Override:** set `DATABASE_PATH` to use a different file
- **WAL files:** SQLite may also create `transactions.db-wal` and `transactions.db-shm` alongside the main file

### Reset local data

1. Stop the API server.
2. Delete the database file and any WAL sidecar files:

   ```bash
   rm -f server/data/transactions.db server/data/transactions.db-wal server/data/transactions.db-shm
   ```

3. Start the server again. A fresh database is created and re-seeded with mock data.

## Data model

The frontend `Transaction` shape is defined in [`src/app/models/transaction.model.ts`](src/app/models/transaction.model.ts):

```typescript
interface Transaction {
  id: number;
  date: string;           // ISO date, e.g. "2026-05-30"
  category: string;       // one of the allowed categories below
  type: 'expense' | 'income';
  amount: number;         // positive number
  description: string;
}
```

Allowed categories: `Food`, `Transport`, `Utilities`, `Entertainment`, `Salary`, `Investment`.

## REST API

Base URL: `http://localhost:3000` (or your `PORT`). With `npm run dev`, use `http://localhost:4200/api/...` instead — the dev-server proxy forwards to the backend.

For full endpoint schemas, request/response models, and try-it-out requests, use [Swagger UI](#api-documentation-openapi--swagger-ui) (`/api/docs`) or download the spec from `/api/openapi.json`.

All request and response bodies are JSON. The API enables CORS for `http://localhost:4200` during local development.

### `GET /api/health`

Health check.

| | |
|---|---|
| **Request body** | none |
| **Response `200`** | `{ "status": "ok" }` |

```bash
curl -s http://localhost:3000/api/health
```

### `POST /api/transactions`

Create a transaction (Insert Data tab).

| | |
|---|---|
| **Request body** | `{ "date", "category", "type", "amount", "description" }` — client-provided `id` is ignored |
| **Response `201`** | Created `Transaction` with server-assigned `id` |
| **Response `400`** | `{ "error": "<validation message>" }` |

Validation rules:

- `type` must be `expense` or `income`
- `amount` must be a finite number greater than `0`
- `category` must be one of the allowed categories listed above

```bash
curl -s -X POST http://localhost:3000/api/transactions \
  -H 'Content-Type: application/json' \
  -d '{
    "date": "2026-05-30",
    "category": "Food",
    "type": "expense",
    "amount": 12.5,
    "description": "Weekly groceries"
  }'
```

Example `201` response:

```json
{
  "id": 22,
  "date": "2026-05-30",
  "category": "Food",
  "type": "expense",
  "amount": 12.5,
  "description": "Weekly groceries"
}
```

### `GET /api/transactions`

List all transactions (Table tab).

| | |
|---|---|
| **Request body** | none |
| **Response `200`** | `Transaction[]`, ordered by `date` descending, then `id` descending. Empty database returns `[]`. |

```bash
curl -s http://localhost:3000/api/transactions
```

Example `200` response (truncated):

```json
[
  {
    "id": 1,
    "date": "2026-05-30",
    "category": "Food",
    "type": "expense",
    "amount": 125.5,
    "description": "Weekly groceries"
  }
]
```

### `GET /api/transactions/summary`

Aggregates for charts (Visualization tab).

| | |
|---|---|
| **Request body** | none |
| **Response `200`** | `{ "categoryTotals": { [category: string]: number }, "dailyTotals": DailyTotal[] }` |

`categoryTotals` sums **expense** amounts per category. `dailyTotals` covers the last 7 calendar days (oldest to newest), with zero-filled days when there is no activity:

```typescript
interface DailyTotal {
  date: string;
  income: number;
  expense: number;
}
```

```bash
curl -s http://localhost:3000/api/transactions/summary
```

Example `200` response:

```json
{
  "categoryTotals": {
    "Food": 299.8,
    "Transport": 295.5,
    "Utilities": 342,
    "Entertainment": 200
  },
  "dailyTotals": [
    { "date": "2026-05-24", "income": 220, "expense": 76.4 },
    { "date": "2026-05-25", "income": 75, "expense": 242 },
    { "date": "2026-05-26", "income": 350, "expense": 129.9 },
    { "date": "2026-05-27", "income": 0, "expense": 179.5 },
    { "date": "2026-05-28", "income": 150, "expense": 83.25 },
    { "date": "2026-05-29", "income": 0, "expense": 258.75 },
    { "date": "2026-05-30", "income": 4200, "expense": 167.5 }
  ]
}
```

Note: exact totals depend on the seeded mock data and any transactions you add locally.
