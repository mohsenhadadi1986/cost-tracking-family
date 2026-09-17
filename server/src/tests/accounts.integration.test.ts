import assert from 'node:assert/strict';
import fs from 'fs';
import { afterEach, describe, it } from 'node:test';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { createApp } from '../app';
import { DEFAULT_ACCOUNT, DEFAULT_CREDIT_CARD, DEFAULT_ACCOUNTS } from '../constants/accounts';
import type Database from 'better-sqlite3';

const openDatabases: Database.Database[] = [];
const dbPaths: string[] = [];

function tempDbPath(): string {
  return path.join(os.tmpdir(), `cost-tracking-accounts-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
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

describe('Account API integration', () => {
  describe('GET /api/accounts', () => {
    it('returns default seeded places', async () => {
      const { app } = createTestApp(false);

      const response = await request(app).get('/api/accounts');

      assert.equal(response.status, 200);
      assert.deepEqual(
        response.body.map((account: { name: string }) => account.name),
        [...DEFAULT_ACCOUNTS].sort()
      );
      const creditCard = response.body.find((account: { name: string }) => account.name === DEFAULT_CREDIT_CARD);
      assert.ok(creditCard);
      assert.equal(creditCard.kind, 'credit');
      assert.equal(creditCard.billingDay, 10);
      assert.equal(creditCard.settlementAccount, DEFAULT_ACCOUNT);
    });
  });

  describe('POST /api/accounts', () => {
    it('creates a place and returns 201', async () => {
      const { app } = createTestApp(false);

      const response = await request(app).post('/api/accounts').send({ name: 'Wise' });

      assert.equal(response.status, 201);
      assert.equal(response.body.name, 'Wise');
      assert.equal(response.body.kind, 'wallet');
      assert.equal(typeof response.body.id, 'number');
    });

    it('creates a credit card billed from an existing bank', async () => {
      const { app } = createTestApp(false);

      const response = await request(app).post('/api/accounts').send({
        name: 'ING Card',
        kind: 'credit',
        billingDay: 10,
        settlementAccount: DEFAULT_ACCOUNT,
      });

      assert.equal(response.status, 201);
      assert.equal(response.body.kind, 'credit');
      assert.equal(response.body.billingDay, 10);
      assert.equal(response.body.settlementAccount, DEFAULT_ACCOUNT);
    });

    it('returns 400 when a credit card has no pay-from place', async () => {
      const { app } = createTestApp(false);

      const response = await request(app).post('/api/accounts').send({
        name: 'ING Card',
        kind: 'credit',
      });

      assert.equal(response.status, 400);
      assert.match(response.body.error, /settlementAccount is required/);
    });

    it('returns 400 for missing name', async () => {
      const { app } = createTestApp(false);

      const response = await request(app).post('/api/accounts').send({});

      assert.equal(response.status, 400);
      assert.match(response.body.error, /name is required/);
    });

    it('returns 400 for duplicate place name', async () => {
      const { app } = createTestApp(false);

      const response = await request(app).post('/api/accounts').send({ name: DEFAULT_ACCOUNTS[0] });

      assert.equal(response.status, 400);
      assert.match(response.body.error, /already exists/);
    });
  });

  describe('PATCH /api/accounts/:id', () => {
    it('renames a place and updates linked transactions', async () => {
      const { app } = createTestApp(true);

      const accounts = await request(app).get('/api/accounts');
      const current = accounts.body.find((account: { name: string }) => account.name === DEFAULT_ACCOUNT);
      assert.ok(current);

      const renameResponse = await request(app)
        .patch(`/api/accounts/${current.id}`)
        .send({ name: 'Intesa' });

      assert.equal(renameResponse.status, 200);
      assert.equal(renameResponse.body.name, 'Intesa');

      const transactions = await request(app).get('/api/transactions');
      assert.ok(transactions.body.some((transaction: { account: string }) => transaction.account === 'Intesa'));
      assert.ok(transactions.body.every((transaction: { account: string }) => transaction.account !== DEFAULT_ACCOUNT));
    });

    it('returns 404 for unknown account id', async () => {
      const { app } = createTestApp(false);

      const response = await request(app).patch('/api/accounts/9999').send({ name: 'Missing' });

      assert.equal(response.status, 404);
      assert.match(response.body.error, /account not found/);
    });

    it('returns 400 for invalid account id', async () => {
      const { app } = createTestApp(false);

      const response = await request(app).patch('/api/accounts/abc').send({ name: 'Bad id' });

      assert.equal(response.status, 400);
      assert.match(response.body.error, /invalid account id/);
    });
  });

  describe('DELETE /api/accounts/:id', () => {
    it('deletes an unused place and returns 204', async () => {
      const { app } = createTestApp(false);

      const created = await request(app).post('/api/accounts').send({ name: 'Wise' });
      const response = await request(app).delete(`/api/accounts/${created.body.id}`);

      assert.equal(response.status, 204);

      const list = await request(app).get('/api/accounts');
      assert.ok(!list.body.some((account: { name: string }) => account.name === 'Wise'));
    });

    it('returns 409 when place is referenced by transactions', async () => {
      const { app } = createTestApp(true);

      const accounts = await request(app).get('/api/accounts');
      const current = accounts.body.find((account: { name: string }) => account.name === DEFAULT_ACCOUNT);
      assert.ok(current);

      const response = await request(app).delete(`/api/accounts/${current.id}`);

      assert.equal(response.status, 409);
      assert.match(response.body.error, /referenced by one or more transactions/);
    });

    it('returns 404 for unknown account id', async () => {
      const { app } = createTestApp(false);

      const response = await request(app).delete('/api/accounts/9999');

      assert.equal(response.status, 404);
      assert.match(response.body.error, /account not found/);
    });
  });
});
