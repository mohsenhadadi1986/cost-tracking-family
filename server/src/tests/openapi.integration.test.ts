import assert from 'node:assert/strict';
import fs from 'fs';
import { afterEach, describe, it } from 'node:test';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { createApp } from '../app';
import type Database from 'better-sqlite3';

const openDatabases: Database.Database[] = [];
const dbPaths: string[] = [];

function tempDbPath(): string {
  return path.join(os.tmpdir(), `cost-tracking-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function createTestApp() {
  const dbPath = tempDbPath();
  dbPaths.push(dbPath);
  const context = createApp(dbPath, { seed: false });
  openDatabases.push(context.db);
  return context;
}

afterEach(() => {
  while (openDatabases.length > 0) {
    openDatabases.pop()?.close();
  }

  while (dbPaths.length > 0) {
    const dbPath = dbPaths.pop();
    if (!dbPath) {
      continue;
    }

    for (const suffix of ['', '-wal', '-shm']) {
      const filePath = `${dbPath}${suffix}`;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
});

describe('OpenAPI and Swagger integration', () => {
  describe('GET /api/openapi.json', () => {
    it('returns 200 with a valid OpenAPI spec', async () => {
      const { app } = createTestApp();

      const response = await request(app).get('/api/openapi.json');

      assert.equal(response.status, 200);
      assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');

      const spec = response.body;
      assert.equal(spec.openapi, '3.0.0');
      assert.ok(spec.info?.title);
      assert.ok(spec.paths);

      assert.ok(spec.paths['/api/health']);
      assert.ok(spec.paths['/api/categories']);
      assert.ok(spec.paths['/api/transactions']);
      assert.ok(spec.paths['/api/transactions/summary']);

      assert.ok(spec.paths['/api/health'].get);
      assert.ok(spec.paths['/api/categories'].get);
      assert.ok(spec.paths['/api/categories'].post);
      assert.ok(spec.paths['/api/categories/{id}'].patch);
      assert.ok(spec.paths['/api/categories/{id}'].delete);
      assert.ok(spec.paths['/api/transactions'].get);
      assert.ok(spec.paths['/api/transactions'].post);
      assert.ok(spec.paths['/api/transactions/summary'].get);
    });
  });

  describe('GET /api/docs', () => {
    it('returns 200 with Swagger UI HTML', async () => {
      const { app } = createTestApp();

      const response = await request(app).get('/api/docs').redirects(1);

      assert.equal(response.status, 200);
      assert.match(response.headers['content-type'] ?? '', /text\/html/);
      assert.match(response.text, /swagger/i);
    });
  });
});
