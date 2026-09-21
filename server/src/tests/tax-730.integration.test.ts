import assert from 'node:assert/strict';
import fs from 'fs';
import { afterEach, describe, it } from 'node:test';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { createApp } from '../app';
import { createOfflineDocumentAgent } from '../services/offline-document-agent';
import type Database from 'better-sqlite3';

const openDatabases: Database.Database[] = [];
const dbPaths: string[] = [];

const CU_XML = `<?xml version="1.0" encoding="UTF-8"?>
<CertificazioneUnica anno="2025" cuLabel="CU 2026">
  <Percipiente codiceFiscale="RSSMRA80A01H501U"/>
  <Punto n="1">45000</Punto>
  <Punto n="21">8500</Punto>
  <Familiare nome="Giulia Rossi" aCarico="true" eta="8"/>
  <Onero punto="341" codice="7">1200</Onero>
</CertificazioneUnica>
`;

function tempDbPath(): string {
  return path.join(os.tmpdir(), `cost-tracking-tax-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function createTestApp(seed = false) {
  const dbPath = tempDbPath();
  dbPaths.push(dbPath);
  const context = createApp(dbPath, { seed, documentAgent: createOfflineDocumentAgent() });
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

describe('730 tax API', () => {
  it('lists 2026 as an available year', async () => {
    const { app } = createTestApp();
    const response = await request(app).get('/api/tax/730/years');

    assert.equal(response.status, 200);
    assert.ok(response.body.some((year: { dichiarazioneYear: number }) => year.dichiarazioneYear === 2026));
  });

  it('blocks export until a CU is uploaded', async () => {
    const { app } = createTestApp();

    const response = await request(app).get('/api/tax/730/2026/export.json');

    assert.equal(response.status, 409);
    assert.match(response.body.error, /Upload CU 2026/i);
  });

  it('uploads CU XML, matches 2025 transactions, and exports JSON, XLSX, and PDF', async () => {
    const { app } = createTestApp(false);

    await request(app).post('/api/transactions').send({
      date: '2025-03-12',
      category: 'Medical',
      type: 'expense',
      amount: 200,
      description: 'Visita specialistica',
      account: 'ING Current Account',
    });

    await request(app).post('/api/transactions').send({
      date: '2025-04-01',
      category: 'Mortgage',
      type: 'expense',
      amount: 850,
      description: 'Rata mutuo',
      account: 'ING Current Account',
    });

    const upload = await request(app)
      .post('/api/tax/730/2026/cu')
      .attach('file', Buffer.from(CU_XML), {
        filename: 'CU-2026.xml',
        contentType: 'application/xml',
      });

    assert.equal(upload.status, 200, upload.body.error);
    assert.equal(upload.body.hasCu, true);
    assert.equal(upload.body.incomeYear, 2025);
    assert.equal(upload.body.cu.redditoLavoroDipendente, 45000);

    const healthcare = upload.body.match.quadroE.find((row: { ruleId: string }) => row.ruleId === 'healthcare');
    const mortgage = upload.body.match.quadroE.find((row: { ruleId: string }) => row.ruleId === 'mortgage_principal');
    assert.equal(healthcare.eligibleAmount, 70.89);
    assert.equal(mortgage.eligibleAmount, 1200);

    const json = await request(app).get('/api/tax/730/2026/export.json');
    assert.equal(json.status, 200);
    assert.equal(json.body.dichiarazioneYear, 2026);
    assert.match(json.body.disclaimer, /commercialista/i);

    const xlsx = await request(app).get('/api/tax/730/2026/export.xlsx');
    assert.equal(xlsx.status, 200);
    assert.match(xlsx.headers['content-type'], /spreadsheetml/);

    const pdf = await request(app).get('/api/tax/730/2026/export.pdf');
    assert.equal(pdf.status, 200);
    assert.equal(pdf.headers['content-type'], 'application/pdf');
    assert.equal(pdf.body.toString('utf8', 0, 4), '%PDF');
  });

  it('rejects a CU for the wrong income year', async () => {
    const { app } = createTestApp();
    const wrongYear = CU_XML.replace('anno="2025"', 'anno="2024"');

    const response = await request(app)
      .post('/api/tax/730/2026/cu')
      .attach('file', Buffer.from(wrongYear), {
        filename: 'CU-2025.xml',
        contentType: 'application/xml',
      });

    assert.equal(response.status, 400);
    assert.match(response.body.error, /does not match expected 2025/);
  });
});
