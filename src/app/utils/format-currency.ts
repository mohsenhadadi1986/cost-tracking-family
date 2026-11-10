/** Display-only euro formatting. Stored amounts stay numeric and are not converted. */
export const DISPLAY_CURRENCY = 'EUR';
export const DISPLAY_CURRENCY_LOCALE = 'it-IT';

const euroFormatter = new Intl.NumberFormat(DISPLAY_CURRENCY_LOCALE, {
  style: 'currency',
  currency: DISPLAY_CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats a number as Italian euro, e.g. `162,03 €`. */
export function formatCurrency(value: number): string {
  return euroFormatter.format(value);
}

export function formatCurrencyOrDash(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  return formatCurrency(value);
}
