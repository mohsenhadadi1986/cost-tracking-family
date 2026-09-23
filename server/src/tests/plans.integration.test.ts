import assert from 'node:assert/strict';
import fs from 'fs';
import { afterEach, describe, it } from 'node:test';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { createApp } from '../app';
import { DEFAULT_ACCOUNT } from '../constants/accounts';
import type Database from 'better-sqlite3';

const openDatabases: Database.Database[] = [];
const dbPaths: string[] = [];

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthStart(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

function billingDay(date = new Date()): number {
  return Math.min(date.getDate(), 28);
}

function monthEnd(date = new Date()): string {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

function reservedThisMonth(date = new Date()): { billingDay: number; startDate: string; rangeStart: string; rangeEnd: string } {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  if (date.getDate() < last) {
    const monthKey = monthStart(date).slice(0, 7);
    return {
      billingDay: date.getDate() + 1,
      startDate: `${monthKey}-01`,
      rangeStart: `${monthKey}-01`,
      rangeEnd: monthEnd(date),
    };
  }

  const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const monthKey = monthStart(next).slice(0, 7);
  return {
    billingDay: 1,
    startDate: `${monthKey}-01`,
    rangeStart: `${monthKey}-01`,
    rangeEnd: monthEnd(next),
  };
}

function tempDbPath(): string {
  return path.join(os.tmpdir(), `cost-tracking-plans-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
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

describe('Plan API integration', () => {
  it('starts with no plans on a fresh database', async () => {
    const { app } = createTestApp();

    const response = await request(app).get('/api/plans');

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, []);
  });

  it('creates a mortgage plan and shows it as reserved this month', async () => {
    const { app } = createTestApp();
    const reserved = reservedThisMonth();

    const created = await request(app).post('/api/plans').send({
      name: 'Mortgage',
      amount: 800,
      account: DEFAULT_ACCOUNT,
      billingDay: reserved.billingDay,
      startDate: reserved.startDate,
      paymentCount: 24,
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.name, 'Mortgage');
    assert.equal(created.body.totalCount, 24);
    assert.equal(created.body.remainingCount, 24);

    const summary = await request(app)
      .get('/api/transactions/summary')
      .query({ startDate: reserved.rangeStart, endDate: reserved.rangeEnd });

    assert.equal(summary.status, 200);
    const mortgage = summary.body.plannedDues.find((due: { name: string }) => due.name === 'Mortgage');
    assert.ok(mortgage);
    assert.equal(mortgage.amount, 800);
    assert.equal(summary.body.plannedDueTotal, 800);
    assert.equal(
      summary.body.availableThisMonth,
      summary.body.currentBalance - summary.body.plannedDueTotal
    );
  });

  it('drops this month from planned dues after the payment is logged', async () => {
    const { app } = createTestApp();

    const today = new Date();
    await request(app).post('/api/plans').send({
      name: 'Sofa',
      amount: 100,
      account: DEFAULT_ACCOUNT,
      billingDay: billingDay(today),
      startDate: monthStart(today),
      paymentCount: 12,
    });

    await request(app).post('/api/transactions').send({
      date: isoDate(today),
      category: 'Unexpected cost',
      type: 'expense',
      amount: 100,
      description: 'Sofa installment',
      account: DEFAULT_ACCOUNT,
    });

    const summary = await request(app)
      .get('/api/transactions/summary')
      .query({ startDate: '2026-09-01', endDate: '2026-09-30' });

    assert.equal(summary.body.plannedDues.length, 0);
    assert.equal(summary.body.plannedDueTotal, 0);

    const plans = await request(app).get('/api/plans');
    assert.equal(plans.body[0].remainingCount, 11);
  });

  it('updates and deletes a plan', async () => {
    const { app } = createTestApp();

    const created = await request(app).post('/api/plans').send({
      name: 'Phone',
      amount: 30,
      account: DEFAULT_ACCOUNT,
      startDate: monthStart(),
      paymentCount: 24,
    });

    const updated = await request(app)
      .patch(`/api/plans/${created.body.id}`)
      .send({ amount: 35, paymentCount: 18 });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.amount, 35);
    assert.equal(updated.body.paymentCount, 18);
    assert.equal(updated.body.totalCount, 18);

    const deleted = await request(app).delete(`/api/plans/${created.body.id}`);
    assert.equal(deleted.status, 204);

    const list = await request(app).get('/api/plans');
    assert.equal(list.body.length, 0);
  });

  it('saves a one-payment bill on day 30', async () => {
    const { app } = createTestApp();

    const created = await request(app).post('/api/plans').send({
      name: 'Gas bill',
      amount: 84,
      account: DEFAULT_ACCOUNT,
      billingDay: 30,
      startDate: '2026-09-30',
      endDate: null,
      paymentCount: 1,
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.billingDay, 30);
    assert.equal(created.body.remainingCount, 1);
  });

  it('saves a one-month bill dated after the billing day', async () => {
    const { app } = createTestApp();

    const created = await request(app).post('/api/plans').send({
      name: 'Electricity bill',
      amount: 121.25,
      account: DEFAULT_ACCOUNT,
      billingDay: 20,
      startDate: '2026-09-30',
      endDate: '2026-09-30',
      paymentCount: null,
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.remainingCount, 1);
    assert.equal(created.body.totalCount, 1);

    const summary = await request(app)
      .get('/api/transactions/summary')
      .query({ startDate: '2026-09-01', endDate: '2026-09-30' });

    const bill = summary.body.plannedDues.find((due: { name: string }) => due.name === 'Electricity bill');
    assert.ok(bill);
    assert.equal(bill.dueDate, '2026-09-30');
    assert.equal(bill.amount, 121.25);
  });

  it('logs a due installment, drops it from planned, and removes the plan when none are left', async () => {
    const { app } = createTestApp();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const created = await request(app).post('/api/plans').send({
      name: 'Gas bill',
      amount: 84.34,
      account: DEFAULT_ACCOUNT,
      billingDay: yesterday.getDate(),
      startDate: monthStart(yesterday),
      endDate: isoDate(yesterday),
      paymentCount: null,
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.remainingCount, 1);

    const summary = await request(app)
      .get('/api/transactions/summary')
      .query({ startDate: monthStart(yesterday), endDate: monthEnd(yesterday) });

    assert.equal(summary.status, 200);
    assert.equal(summary.body.plannedDues.length, 0);
    assert.equal(summary.body.plannedDueTotal, 0);
    assert.equal(summary.body.currentBalance, -84.34);

    const transactions = await request(app).get('/api/transactions');
    assert.equal(transactions.body.length, 1);
    assert.equal(transactions.body[0].type, 'expense');
    assert.equal(transactions.body[0].amount, 84.34);
    assert.equal(transactions.body[0].account, DEFAULT_ACCOUNT);
    assert.equal(transactions.body[0].category, 'Gas');
    assert.equal(transactions.body[0].description, 'Gas bill');
    assert.equal(transactions.body[0].date, isoDate(yesterday));

    const plans = await request(app).get('/api/plans');
    assert.equal(plans.body.length, 0);

    const again = await request(app).get('/api/transactions');
    assert.equal(again.body.length, 1);
  });

  it('logs only the installment whose day has arrived', async () => {
    const { app } = createTestApp();
    const today = new Date();

    await request(app).post('/api/plans').send({
      name: 'Mortgage',
      amount: 800,
      account: DEFAULT_ACCOUNT,
      billingDay: today.getDate(),
      startDate: monthStart(today),
      paymentCount: 3,
    });

    const summary = await request(app)
      .get('/api/transactions/summary')
      .query({ startDate: monthStart(today), endDate: monthEnd(today) });

    assert.equal(summary.body.plannedDueTotal, 0);
    assert.equal(summary.body.currentBalance, -800);

    const plans = await request(app).get('/api/plans');
    assert.equal(plans.body.length, 1);
    assert.equal(plans.body[0].remainingCount, 2);
    assert.equal(plans.body[0].totalCount, 3);

    const transactions = await request(app).get('/api/transactions');
    assert.equal(transactions.body.length, 1);
    assert.equal(transactions.body[0].category, 'Mortgage');
    assert.equal(transactions.body[0].date, isoDate(today));
  });

  it('does not charge a due installment that was already logged', async () => {
    const { app } = createTestApp();
    const today = new Date();

    await request(app).post('/api/plans').send({
      name: 'Mortgage',
      amount: 800,
      account: DEFAULT_ACCOUNT,
      billingDay: today.getDate(),
      startDate: monthStart(today),
      paymentCount: 2,
    });

    await request(app).post('/api/transactions').send({
      date: isoDate(today),
      category: 'Mortgage',
      type: 'expense',
      amount: 800,
      description: 'Mortgage',
      account: DEFAULT_ACCOUNT,
    });

    const summary = await request(app).get('/api/transactions/summary');
    assert.equal(summary.body.currentBalance, -800);

    const transactions = await request(app).get('/api/transactions');
    assert.equal(transactions.body.length, 1);

    const plans = await request(app).get('/api/plans');
    assert.equal(plans.body.length, 1);
    assert.equal(plans.body[0].remainingCount, 1);
  });

  it('rejects a plan for an unknown place', async () => {
    const { app } = createTestApp();

    const response = await request(app).post('/api/plans').send({
      name: 'Ghost',
      amount: 10,
      account: 'Not a place',
      startDate: monthStart(),
      paymentCount: 2,
    });

    assert.equal(response.status, 400);
    assert.match(response.body.error, /account must be one of/);
  });

  it('blocks deleting a place used by a plan', async () => {
    const { app } = createTestApp();

    const place = await request(app).post('/api/accounts').send({ name: 'Wise' });
    await request(app).post('/api/plans').send({
      name: 'Phone',
      amount: 20,
      account: 'Wise',
      startDate: monthStart(),
      paymentCount: 6,
    });

    const response = await request(app).delete(`/api/accounts/${place.body.id}`);
    assert.equal(response.status, 409);
  });
});
