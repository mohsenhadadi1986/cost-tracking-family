import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractJsonObject } from '../services/cursor-document-agent';
import { createOfflineDocumentAgent } from '../services/offline-document-agent';
import { parseCuFile } from '../tax/parse-cu-file';

const CU_XML = `<?xml version="1.0" encoding="UTF-8"?>
<CertificazioneUnica anno="2025" cuLabel="CU 2026">
  <Percipiente codiceFiscale="RSSMRA80A01H501U"/>
  <Punto n="1">45000</Punto>
  <Punto n="21">8500</Punto>
  <Familiare nome="Giulia Rossi" aCarico="true" eta="8"/>
  <Onero punto="341" codice="7">1200</Onero>
</CertificazioneUnica>
`;

describe('extractJsonObject', () => {
  it('reads a fenced JSON object from agent text', () => {
    const parsed = extractJsonObject('Here you go:\n```json\n{"date":"2026-03-15","amount":10}\n```\n');
    assert.equal(parsed.date, '2026-03-15');
    assert.equal(parsed.amount, 10);
  });
});

describe('parseCuFile with Cursor document agent', () => {
  it('parses CU XML through the document agent', async () => {
    const parsed = await parseCuFile(
      {
        originalname: 'CU-2026.xml',
        mimetype: 'application/xml',
        buffer: Buffer.from(CU_XML),
        size: CU_XML.length,
      } as Express.Multer.File,
      2025,
      createOfflineDocumentAgent()
    );

    assert.equal(parsed.redditoYear, 2025);
    assert.equal(parsed.redditoLavoroDipendente, 45000);
    assert.equal(parsed.oneri[0]?.amount, 1200);
  });
});
