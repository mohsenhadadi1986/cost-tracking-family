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
const fixturePath = path.join(__dirname, 'fixtures', 'sample-receipt.png');

function tempDbPath(): string {
  return path.join(os.tmpdir(), `cost-tracking-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function createTestApp(seed = false) {
  const dbPath = tempDbPath();
  dbPaths.push(dbPath);
  const context = createApp(dbPath, { seed });
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

describe('POST /api/receipts/scan', () => {
  it('returns 400 when no image is uploaded', async () => {
    const { app } = createTestApp(false);

    const response = await request(app).post('/api/receipts/scan');

    assert.equal(response.status, 400);
    assert.match(response.body.error, /image is required/i);
  });

  it('returns 400 for unsupported file types', async () => {
    const { app } = createTestApp(false);

    const response = await request(app)
      .post('/api/receipts/scan')
      .attach('image', Buffer.from('plain text'), {
        filename: 'receipt.txt',
        contentType: 'text/plain',
      });

    assert.equal(response.status, 400);
    assert.match(response.body.error, /jpeg or png/i);
  });

  it('extracts draft fields from a receipt fixture image', async () => {
    const { app } = createTestApp(true);

    const response = await request(app)
      .post('/api/receipts/scan')
      .attach('image', fixturePath, {
        filename: 'sample-receipt.png',
        contentType: 'image/png',
      });

    assert.equal(response.status, 200);
    assert.ok(
      response.body.date || typeof response.body.amount === 'number',
      'expected at least date or amount to be extracted'
    );

    if (response.body.date) {
      assert.match(response.body.date, /^\d{4}-\d{2}-\d{2}$/);
    }

    if (typeof response.body.amount === 'number') {
      assert.ok(response.body.amount > 0);
    }

    if (response.body.confidence) {
      assert.equal(typeof response.body.confidence.overall, 'number');
    }
  });
});
