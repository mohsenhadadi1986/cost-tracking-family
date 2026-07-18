import { createWorker } from 'tesseract.js';
import type { CategoryRepository } from '../repositories/category.repository';
import type { ReceiptScanConfidence, ReceiptScanResponse } from '../models/receipt-scan.model';

const MONTH_NAMES = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const;

const CATEGORY_KEYWORDS: Record<string, readonly string[]> = {
  Food: ['food', 'grocery', 'groceries', 'restaurant', 'cafe', 'coffee', 'market', 'bakery', 'deli'],
  Transport: ['transport', 'gas', 'fuel', 'uber', 'lyft', 'taxi', 'parking', 'transit', 'metro'],
  Utilities: ['utility', 'utilities', 'electric', 'water', 'internet', 'phone', 'power', 'energy'],
  Entertainment: ['entertainment', 'movie', 'cinema', 'theater', 'game', 'concert', 'streaming'],
};

export interface ParsedReceiptFields {
  date?: string;
  amount?: number;
  description?: string;
  suggestedCategory?: string;
  confidence: ReceiptScanConfidence;
}

export function parseReceiptText(
  text: string,
  expenseCategoryNames: string[],
  ocrConfidence?: number
): ParsedReceiptFields {
  const normalizedText = text.replace(/\r/g, '\n');
  const lines = normalizedText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const date = extractDate(normalizedText);
  const amount = extractAmount(normalizedText, lines);
  const description = extractDescription(lines, date, amount);
  const suggestedCategory = suggestCategory(normalizedText, expenseCategoryNames);

  const confidence: ReceiptScanConfidence = {
    overall: ocrConfidence,
    date: date ? 0.85 : undefined,
    amount: amount !== undefined ? 0.85 : undefined,
    description: description ? 0.7 : undefined,
    suggestedCategory: suggestedCategory ? 0.75 : undefined,
  };

  return {
    date,
    amount,
    description,
    suggestedCategory,
    confidence,
  };
}

function extractDate(text: string): string | undefined {
  const isoMatch = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (isoMatch) {
    return normalizeDateParts(isoMatch[1], isoMatch[2], isoMatch[3]);
  }

  const namedMonthMatch = text.match(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:,|\s+)(20\d{2})\b/i
  );
  if (namedMonthMatch) {
    const monthIndex = MONTH_NAMES.findIndex(month =>
      namedMonthMatch[1].toLowerCase().startsWith(month)
    );
    if (monthIndex >= 0) {
      return normalizeDateParts(namedMonthMatch[3], String(monthIndex + 1), namedMonthMatch[2]);
    }
  }

  const numericMatch = text.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/);
  if (numericMatch) {
    const first = Number.parseInt(numericMatch[1], 10);
    const second = Number.parseInt(numericMatch[2], 10);
    const yearPart = numericMatch[3];
    const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;

    if (first > 12 && second <= 12) {
      return normalizeDateParts(year, String(second), String(first));
    }

    return normalizeDateParts(year, String(first), String(second));
  }

  return undefined;
}

function normalizeDateParts(year: string, month: string, day: string): string | undefined {
  const monthNumber = Number.parseInt(month, 10);
  const dayNumber = Number.parseInt(day, 10);
  const yearNumber = Number.parseInt(year, 10);

  if (
    !Number.isFinite(monthNumber) ||
    !Number.isFinite(dayNumber) ||
    !Number.isFinite(yearNumber) ||
    monthNumber < 1 ||
    monthNumber > 12 ||
    dayNumber < 1 ||
    dayNumber > 31
  ) {
    return undefined;
  }

  return `${String(yearNumber).padStart(4, '0')}-${String(monthNumber).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
}

function extractAmount(text: string, lines: string[]): number | undefined {
  const totalLinePattern = /\b(total|amount due|balance due|grand total|total due)\b[:.]?\s*([$€£]?\s*\d[\d,]*[.,]\d{2})/i;
  for (const line of lines) {
    const totalMatch = line.match(totalLinePattern);
    if (totalMatch) {
      const parsed = parseCurrencyAmount(totalMatch[2]);
      if (parsed !== undefined) {
        return parsed;
      }
    }
  }

  const currencyMatches = [...text.matchAll(/[$€£]\s*(\d[\d,]*[.,]\d{2})/g)].map(match =>
    parseCurrencyAmount(match[1])
  );
  const numericMatches = currencyMatches.filter((value): value is number => value !== undefined);

  if (numericMatches.length > 0) {
    return Math.max(...numericMatches);
  }

  const plainAmountMatches = [...text.matchAll(/\b(\d[\d,]*[.,]\d{2})\b/g)]
    .map(match => parseCurrencyAmount(match[1]))
    .filter((value): value is number => value !== undefined);

  return plainAmountMatches.length > 0 ? Math.max(...plainAmountMatches) : undefined;
}

function parseCurrencyAmount(rawValue: string): number | undefined {
  const normalized = rawValue.replace(/,/g, '.').replace(/\.(?=.*\.)/g, '');
  const amount = Number.parseFloat(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    return undefined;
  }

  return Math.round(amount * 100) / 100;
}

function extractDescription(
  lines: string[],
  date?: string,
  amount?: number
): string | undefined {
  for (const line of lines) {
    if (isLikelyMetadataLine(line, date, amount)) {
      continue;
    }

    if (line.length >= 3) {
      return line.slice(0, 120);
    }
  }

  return undefined;
}

function isLikelyMetadataLine(line: string, date?: string, amount?: number): boolean {
  const lowerLine = line.toLowerCase();

  if (/\b(total|subtotal|tax|change|cash|visa|mastercard|receipt|thank you)\b/.test(lowerLine)) {
    return true;
  }

  if (/\b(20\d{2}|date)\b/.test(lowerLine)) {
    return true;
  }

  if (/\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}/.test(line)) {
    return true;
  }

  if (amount !== undefined) {
    const amountPattern = amount.toFixed(2).replace('.', '[.,]');
    if (new RegExp(amountPattern).test(line)) {
      return true;
    }
  }

  if (date && line.includes(date)) {
    return true;
  }

  return false;
}

function suggestCategory(text: string, expenseCategoryNames: string[]): string | undefined {
  const lowerText = text.toLowerCase();

  for (const categoryName of expenseCategoryNames) {
    if (lowerText.includes(categoryName.toLowerCase())) {
      return categoryName;
    }
  }

  for (const categoryName of expenseCategoryNames) {
    const keywords = CATEGORY_KEYWORDS[categoryName] ?? [];
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return categoryName;
    }
  }

  return undefined;
}

export class ReceiptScanService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async scanReceipt(imageBuffer: Buffer): Promise<ReceiptScanResponse> {
    const worker = await createWorker('eng');

    try {
      const { data } = await worker.recognize(imageBuffer);
      const trimmedText = data.text.trim();

      if (trimmedText.length === 0) {
        throw new Error('Could not read text from receipt image');
      }

      const expenseCategories = this.categoryRepository.findNamesByType('expense');
      const parsed = parseReceiptText(trimmedText, expenseCategories, data.confidence);

      if (!parsed.date && parsed.amount === undefined && !parsed.description) {
        throw new Error('Could not extract transaction details from receipt');
      }

      return {
        date: parsed.date,
        amount: parsed.amount,
        description: parsed.description,
        suggestedCategory: parsed.suggestedCategory,
        confidence: parsed.confidence,
      };
    } finally {
      await worker.terminate();
    }
  }
}
