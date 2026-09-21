# Express API + SQLite (better-sqlite3) + Cursor SDK document parsing
FROM node:22-bookworm-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build \
  && npm prune --omit=dev

FROM node:22-bookworm-slim

WORKDIR /app

# Runtime needs for native better-sqlite3 and sharp
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates libvips42 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/transactions.db

EXPOSE 3000

CMD ["node", "dist/index.js"]
