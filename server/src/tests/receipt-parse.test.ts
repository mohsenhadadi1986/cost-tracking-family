import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_EXPENSE_CATEGORIES,
} from '../constants/categories';
import { parseCurrencyAmount, parseReceiptText } from '../services/receipt-scan.service';

describe('parseReceiptText', () => {
  const expenseCategories = [...DEFAULT_EXPENSE_CATEGORIES];

  it('parses Italian totals, DD/MM/YYYY dates, and merchant names', () => {
    const text = `
ENEL ENERGIA
Via Roma 12
15/03/2026
Energia elettrica
IVA 22,00
TOTALE 1.234,56
    `;

    const parsed = parseReceiptText(text, expenseCategories);

    assert.equal(parsed.date, '2026-03-15');
    assert.equal(parsed.amount, 1234.56);
    assert.equal(parsed.description, 'ENEL ENERGIA');
    assert.equal(parsed.suggestedCategory, 'Electricity');
    assert.ok(parsed.ocrText?.includes('TOTALE'));
  });

  it('parses euro amounts and TIM wifi bills', () => {
    const text = `
TIM
Bolletta fibra
Data 03/09/2026
IMPORTO DOVUTO € 29,90
    `;

    const parsed = parseReceiptText(text, expenseCategories);
    assert.equal(parsed.date, '2026-09-03');
    assert.equal(parsed.amount, 29.9);
    assert.equal(parsed.suggestedCategory, 'WiFi');
  });

  it('prefers day-first dates when month and day are both valid', () => {
    const parsed = parseReceiptText('Scontrino 05/03/2026 TOTALE 10,00', expenseCategories);
    assert.equal(parsed.date, '2026-03-05');
  });

  it('still understands US-style currency totals', () => {
    const parsed = parseReceiptText('FOOD MARKET\nDate: 07/15/2026\nTOTAL: $42.50', expenseCategories);
    assert.equal(parsed.date, '2026-07-15');
    assert.equal(parsed.amount, 42.5);
    assert.equal(parsed.suggestedCategory, 'Food');
  });
});

describe('parseCurrencyAmount', () => {
  it('handles EU and US thousand separators', () => {
    assert.equal(parseCurrencyAmount('1.234,56'), 1234.56);
    assert.equal(parseCurrencyAmount('1,234.56'), 1234.56);
    assert.equal(parseCurrencyAmount('42,50'), 42.5);
  });
});
