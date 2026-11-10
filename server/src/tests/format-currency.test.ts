import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DISPLAY_CURRENCY, formatCurrency, formatCurrencyOrDash } from '../utils/format-currency';

function visible(value: string): string {
  return value.replace(/\u00a0/g, ' ');
}

describe('server formatCurrency', () => {
  it('uses EUR in it-IT style with a trailing euro sign', () => {
    assert.equal(DISPLAY_CURRENCY, 'EUR');
    assert.equal(visible(formatCurrency(162.03)), '162,03 €');
    assert.equal(formatCurrency(162.03).includes('$'), false);
  });

  it('renders a dash for missing values', () => {
    assert.equal(formatCurrencyOrDash(undefined), '—');
    assert.equal(visible(formatCurrencyOrDash(0)), '0,00 €');
  });
});
