import assert from 'node:assert/strict';
import fs from 'fs';
import { afterEach, describe, it } from 'node:test';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { createApp } from '../app';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from '../constants/categories';
import type Database from 'better-sqlite3';

const openDatabases: Database.Database[] = [];
const dbPaths: string[] = [];

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

describe('Category API integration', () => {
  describe('GET /api/categories', () => {
    it('returns default seeded categories', async () => {
      const { app } = createTestApp(false);

      const response = await request(app).get('/api/categories');

      assert.equal(response.status, 200);
      assert.equal(response.body.length, DEFAULT_EXPENSE_CATEGORIES.length + DEFAULT_INCOME_CATEGORIES.length);
      assert.ok(response.body.every((category: { type: string }) => ['expense', 'income'].includes(category.type)));
    });

    it('filters categories by type', async () => {
      const { app } = createTestApp(false);

      const response = await request(app).get('/api/categories').query({ type: 'expense' });

      assert.equal(response.status, 200);
      assert.equal(response.body.length, DEFAULT_EXPENSE_CATEGORIES.length);
      assert.ok(response.body.every((category: { type: string }) => category.type === 'expense'));
      assert.deepEqual(
        response.body.map((category: { name: string }) => category.name).sort(),
        [...DEFAULT_EXPENSE_CATEGORIES].sort()
      );
    });

    it('returns 400 for invalid type filter', async () => {
      const { app } = createTestApp(false);

      const response = await request(app).get('/api/categories').query({ type: 'invalid' });

      assert.equal(response.status, 400);
      assert.match(response.body.error, /type must be either expense or income/);
    });
  });

  describe('POST /api/categories', () => {
    it('creates a category and returns 201', async () => {
      const { app } = createTestApp(false);

      const payload = { name: 'Healthcare', type: 'expense' };
      const response = await request(app).post('/api/categories').send(payload);

      assert.equal(response.status, 201);
      assert.equal(response.body.name, payload.name);
      assert.equal(response.body.type, payload.type);
      assert.equal(typeof response.body.id, 'number');
    });

    it('returns 400 for missing name', async () => {
      const { app } = createTestApp(false);

      const response = await request(app).post('/api/categories').send({ type: 'expense' });

      assert.equal(response.status, 400);
      assert.match(response.body.error, /name is required/);
    });

    it('returns 400 for invalid type', async () => {
      const { app } = createTestApp(false);

      const response = await request(app)
        .post('/api/categories')
        .send({ name: 'Bonus', type: 'invalid' });

      assert.equal(response.status, 400);
      assert.match(response.body.error, /type must be either expense or income/);
    });

    it('returns 400 for duplicate category name and type', async () => {
      const { app } = createTestApp(false);

      const response = await request(app)
        .post('/api/categories')
        .send({ name: 'Food', type: 'expense' });

      assert.equal(response.status, 400);
      assert.match(response.body.error, /already exists for type expense/);
    });
  });

  describe('PATCH /api/categories/:id', () => {
    it('renames a category and updates linked transactions', async () => {
      const { app } = createTestApp(true);

      const categories = await request(app).get('/api/categories').query({ type: 'expense' });
      const food = categories.body.find((category: { name: string }) => category.name === 'Food');
      assert.ok(food);

      const renameResponse = await request(app)
        .patch(`/api/categories/${food.id}`)
        .send({ name: 'Groceries' });

      assert.equal(renameResponse.status, 200);
      assert.equal(renameResponse.body.name, 'Groceries');

      const transactions = await request(app)
        .get('/api/transactions')
        .query({ categories: 'Groceries', type: 'expense' });

      assert.equal(transactions.status, 200);
      assert.ok(transactions.body.length > 0);
      assert.ok(transactions.body.every((transaction: { category: string }) => transaction.category === 'Groceries'));
    });

    it('returns 404 for unknown category id', async () => {
      const { app } = createTestApp(false);

      const response = await request(app).patch('/api/categories/9999').send({ name: 'Missing' });

      assert.equal(response.status, 404);
      assert.match(response.body.error, /category not found/);
    });

    it('returns 400 for invalid category id', async () => {
      const { app } = createTestApp(false);

      const response = await request(app).patch('/api/categories/abc').send({ name: 'Bad id' });

      assert.equal(response.status, 400);
      assert.match(response.body.error, /invalid category id/);
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('deletes an unused category and returns 204', async () => {
      const { app } = createTestApp(false);

      const created = await request(app)
        .post('/api/categories')
        .send({ name: 'Temporary', type: 'income' });

      const response = await request(app).delete(`/api/categories/${created.body.id}`);

      assert.equal(response.status, 204);

      const list = await request(app).get('/api/categories').query({ type: 'income' });
      assert.ok(!list.body.some((category: { name: string }) => category.name === 'Temporary'));
    });

    it('returns 409 when category is referenced by transactions', async () => {
      const { app } = createTestApp(true);

      const categories = await request(app).get('/api/categories').query({ type: 'expense' });
      const food = categories.body.find((category: { name: string }) => category.name === 'Food');
      assert.ok(food);

      const response = await request(app).delete(`/api/categories/${food.id}`);

      assert.equal(response.status, 409);
      assert.match(response.body.error, /referenced by one or more transactions/);
    });

    it('returns 404 for unknown category id', async () => {
      const { app } = createTestApp(false);

      const response = await request(app).delete('/api/categories/9999');

      assert.equal(response.status, 404);
      assert.match(response.body.error, /category not found/);
    });
  });
});
