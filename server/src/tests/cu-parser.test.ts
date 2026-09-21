import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CuYearMismatchError, parseCuText, parseCuXml, parseItalianAmount } from '../tax/parse-cu';

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<CertificazioneUnica anno="2025" cuLabel="CU 2026">
  <Percipiente codiceFiscale="RSSMRA80A01H501U"/>
  <Redditi>
    <Punto n="1">45.000,00</Punto>
    <Punto n="21">8.500,00</Punto>
  </Redditi>
  <Familiari>
    <Familiare nome="Giulia Rossi" aCarico="true" eta="8"/>
  </Familiari>
  <Oneri>
    <Onero punto="341" codice="7">1.200,00</Onero>
  </Oneri>
</CertificazioneUnica>
`;

const SAMPLE_OCR = `
Certificazione Unica CU 2026
Anno d'imposta 2025
Codice fiscale RSSMRA80A01H501U
Punto 1  45.000,00
Reddito di lavoro dipendente 45.000,00
Punto 21 8.500,00
Punto 341 codice 7 1.200,00
Familiare Giulia Rossi eta 8
`;

describe('CU parsers', () => {
  it('parses Italian amounts', () => {
    assert.equal(parseItalianAmount('45.000,00'), 45000);
    assert.equal(parseItalianAmount('1.200,50'), 1200.5);
    assert.equal(parseItalianAmount('129,11'), 129.11);
  });

  it('reads reddito, ritenute, dependents, and oneri from XML', () => {
    const parsed = parseCuXml(SAMPLE_XML, 2025);

    assert.equal(parsed.redditoYear, 2025);
    assert.equal(parsed.cuLabel, 'CU 2026');
    assert.equal(parsed.codiceFiscale, 'RSSMRA80A01H501U');
    assert.equal(parsed.redditoLavoroDipendente, 45000);
    assert.equal(parsed.ritenute, 8500);
    assert.equal(parsed.dependents[0]?.name, 'Giulia Rossi');
    assert.equal(parsed.dependents[0]?.age, 8);
    assert.equal(parsed.oneri[0]?.amount, 1200);
    assert.equal(parsed.oneri[0]?.codice, 7);
    assert.equal(parsed.confidence, 'high');
  });

  it('reads the same fields from OCR text', () => {
    const parsed = parseCuText(SAMPLE_OCR, 2025);

    assert.equal(parsed.redditoYear, 2025);
    assert.equal(parsed.redditoLavoroDipendente, 45000);
    assert.equal(parsed.ritenute, 8500);
    assert.equal(parsed.oneri[0]?.point, 341);
    assert.equal(parsed.oneri[0]?.amount, 1200);
  });

  it('rejects a CU whose reddito year does not match the 730 year', () => {
    assert.throws(
      () => parseCuXml(SAMPLE_XML.replace('anno="2025"', 'anno="2024"'), 2025),
      error => error instanceof CuYearMismatchError
    );
  });
});
