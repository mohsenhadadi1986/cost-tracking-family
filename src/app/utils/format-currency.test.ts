import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DISPLAY_CURRENCY, formatCurrency, formatCurrencyOrDash } from './format-currency';

function visible(value: string): string {
  return value.replace(/\u00a0/g, ' ');
}

describe('formatCurrency', () => {
  it('uses EUR in it-IT style with a trailing euro sign', () => {
    assert.equal(DISPLAY_CURRENCY, 'EUR');
    assert.equal(visible(formatCurrency(162.03)), '162,03 €');
    assert.equal(visible(formatCurrency(3695.67)), '3695,67 €');
    assert.equal(visible(formatCurrency(12345.67)), '12.345,67 €');
    assert.equal(visible(formatCurrency(-328.3)), '-328,30 €');
  });

  it('does not use a dollar sign', () => {
    assert.equal(formatCurrency(162.03).includes('$'), false);
    assert.equal(formatCurrency(162.03).includes('USD'), false);
  });

  it('renders a dash for missing values', () => {
    assert.equal(formatCurrencyOrDash(null), '—');
    assert.equal(formatCurrencyOrDash(undefined), '—');
    assert.equal(visible(formatCurrencyOrDash(0)), '0,00 €');
  });
});
