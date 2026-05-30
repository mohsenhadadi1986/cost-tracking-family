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
