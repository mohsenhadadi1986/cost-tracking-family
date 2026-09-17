import sharp from 'sharp';
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

const ITALIAN_MONTHS: Record<string, number> = {
  gennaio: 1,
  feb: 2,
  febbraio: 2,
  marzo: 3,
  aprile: 4,
  maggio: 5,
  giugno: 6,
  luglio: 7,
  agosto: 8,
  settembre: 9,
  ottobre: 10,
  novembre: 11,
  dicembre: 12,
};

const TOTAL_LINE_PATTERN =
  /\b(totale\s+complessivo|grand\s+total|amount\s+due|balance\s+due|importo\s+dovuto|importo\s+totale|totale\s+euro|totale|total\s+due|total|importo|da\s+pagare)\b[:\s.-]*([$€£]?\s*\d[\d.]*[.,]\d{2})/i;

const CATEGORY_KEYWORDS: Record<string, readonly string[]> = {
  Food: ['food', 'grocery', 'groceries', 'restaurant', 'cafe', 'coffee', 'market', 'bakery', 'deli', 'cibo', 'alimentari', 'supermercato', 'conad', 'esselunga', 'coop', 'lidl', 'eurospin'],
  'Baby school': ['asilo', 'scuola', 'nido', 'school', 'kindergarten', 'baby', 'mensa scolastica'],
  'Car maintenance': ['officina', 'meccanico', 'revision', 'gomme', 'mechanic', 'car maintenance', 'autoripar'],
  'Public transport': ['atm', 'trenitalia', 'italo', 'bus', 'metro', 'transit', 'biglietto', 'abbonamento', 'train'],
  Fuel: ['fuel', 'gasoline', 'petrol', 'diesel', 'carburante', 'benzina', 'enilive', 'q8', 'shell', 'ip station', 'esso', 'gas station'],
  Tolls: ['toll', 'pedaggio', 'telepass', 'autostrad', 'parking', 'parcheggio', 'sosta'],
  'Insurance home': ['home insurance', 'assicurazione casa', 'polizza casa', 'generali casa'],
  'Insurance car': ['car insurance', 'rc auto', 'assicurazione auto', 'polizza auto', 'unipol', 'generali auto'],
  WiFi: ['wifi', 'fiber', 'fibra', 'internet', 'tim', 'vodafone', 'windtre', 'fastweb', 'iliad'],
  'Telephone bill': ['telephone', 'telefono', 'bolletta cellulare', 'mobile bill', 'phone bill', 'tim mobile'],
  Gas: ['gas bill', 'bolletta gas', 'italgas', 'eni gas', 'gas naturale', 'metano casa'],
  Electricity: ['electric', 'electricity', 'enel', 'luce', 'energia elettrica', 'servizio elettrico', 'a2a luce'],
  Utilities: ['utility', 'utilities', 'acqua', 'water bill', 'rifiuti', 'tari', 'bolletta'],
  'Condominio charge': ['condominio', 'spese condominiali', 'amministratore', 'millesimi'],
  Mortgage: ['mortgage', 'mutuo', 'rata mutuo', 'prestito casa'],
  'Unexpected cost': ['unexpected', 'imprevisto', 'straordinario', 'urgente'],
  Entertainment: ['entertainment', 'movie', 'cinema', 'theater', 'game', 'concert', 'streaming', 'netflix', 'spotify'],
};

export interface ParsedReceiptFields {
  date?: string;
  amount?: number;
  description?: string;
  suggestedCategory?: string;
  ocrText?: string;
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
    ocrText: truncateOcrText(normalizedText),
    confidence,
  };
}

function extractDate(text: string): string | undefined {
  const isoMatch = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (isoMatch) {
    return normalizeDateParts(isoMatch[1], isoMatch[2], isoMatch[3]);
  }

  const namedMonthMatch = text.match(
    /\b(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:,|\s+)(20\d{2})\b/i
  );
  if (namedMonthMatch) {
    const monthToken = namedMonthMatch[1].toLowerCase();
    const italianMonth = ITALIAN_MONTHS[monthToken];
    if (italianMonth) {
      return normalizeDateParts(namedMonthMatch[3], String(italianMonth), namedMonthMatch[2]);
    }

    const monthIndex = MONTH_NAMES.findIndex(month => monthToken.startsWith(month));
    if (monthIndex >= 0) {
      return normalizeDateParts(namedMonthMatch[3], String(monthIndex + 1), namedMonthMatch[2]);
    }
  }

  const dayMonthYearNamed = text.match(
    /\b(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(20\d{2})\b/i
  );
  if (dayMonthYearNamed) {
    const italianMonth = ITALIAN_MONTHS[dayMonthYearNamed[2].toLowerCase()];
    if (italianMonth) {
      return normalizeDateParts(dayMonthYearNamed[3], String(italianMonth), dayMonthYearNamed[1]);
    }
  }

  const numericMatch = text.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/);
  if (numericMatch) {
    const first = Number.parseInt(numericMatch[1], 10);
    const second = Number.parseInt(numericMatch[2], 10);
    const yearPart = numericMatch[3];
    const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;

    if (second > 12 && first <= 12) {
      return normalizeDateParts(year, String(first), String(second));
    }

    return normalizeDateParts(year, String(second), String(first));
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
  for (const line of lines) {
    if (/\b(subtotal|subtotale|iva|tax|imponibile)\b/i.test(line)) {
      continue;
    }

    const totalMatch = line.match(TOTAL_LINE_PATTERN);
    if (totalMatch) {
      const parsed = parseCurrencyAmount(totalMatch[2]);
      if (parsed !== undefined) {
        return parsed;
      }
    }
  }

  const currencyMatches = [...text.matchAll(/[$€£]\s*(\d[\d.]*[.,]\d{2})/g)]
    .map(match => parseCurrencyAmount(match[1]))
    .filter((value): value is number => value !== undefined);

  if (currencyMatches.length > 0) {
    return Math.max(...currencyMatches);
  }

  const plainAmountMatches = [...text.matchAll(/\b(\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|\d+[.,]\d{2})\b/g)]
    .map(match => parseCurrencyAmount(match[1]))
    .filter((value): value is number => value !== undefined);

  return plainAmountMatches.length > 0 ? Math.max(...plainAmountMatches) : undefined;
}

export function parseCurrencyAmount(rawValue: string): number | undefined {
  const trimmed = rawValue.replace(/[$€£\s]/g, '');
  const lastComma = trimmed.lastIndexOf(',');
  const lastDot = trimmed.lastIndexOf('.');
  let normalized = trimmed;

  if (lastComma > lastDot) {
    normalized = trimmed.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    normalized = trimmed.replace(/,/g, '');
  }

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

    if (/[a-zA-Zàèéìòù]{3,}/.test(line) && line.length >= 3) {
      return line.slice(0, 120);
    }
  }

  return undefined;
}

function isLikelyMetadataLine(line: string, date?: string, amount?: number): boolean {
  const lowerLine = line.toLowerCase();

  if (
    /\b(total|subtotal|tax|change|cash|visa|mastercard|receipt|thank you|scontrino|documento|commerciale|grazie|iva|imponibile|contanti|carta|resto|p\.?\s*iva|codice fiscale|c\.f\.|operatore|cassa)\b/.test(
      lowerLine
    )
  ) {
    return true;
  }

  if (/\b(20\d{2}|date|data)\b/.test(lowerLine) && /\d/.test(line)) {
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
    const keywords = CATEGORY_KEYWORDS[categoryName] ?? categoryName.toLowerCase().split(/\s+/).filter(word => word.length >= 4);
    if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
      return categoryName;
    }
  }

  return undefined;
}

function truncateOcrText(text: string): string {
  const collapsed = text.replace(/\n{3,}/g, '\n\n').trim();
  if (collapsed.length <= 400) {
    return collapsed;
  }

  return `${collapsed.slice(0, 397).trimEnd()}...`;
}

async function preprocessReceiptImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(imageBuffer)
      .rotate()
      .resize({ width: 1800, withoutEnlargement: false })
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer();
  } catch {
    return imageBuffer;
  }
}

export class ReceiptScanService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async scanReceipt(imageBuffer: Buffer): Promise<ReceiptScanResponse> {
    const preparedImage = await preprocessReceiptImage(imageBuffer);
    const { text, confidence } = await recognizeReceiptText(preparedImage);
    const trimmedText = text.trim();

    if (trimmedText.length === 0) {
      throw new Error('Could not read text from receipt image');
    }

    const expenseCategories = this.categoryRepository.findNamesByType('expense');
    const parsed = parseReceiptText(trimmedText, expenseCategories, confidence);

    return {
      date: parsed.date,
      amount: parsed.amount,
      description: parsed.description,
      suggestedCategory: parsed.suggestedCategory,
      ocrText: parsed.ocrText,
      confidence: parsed.confidence,
    };
  }
}

async function recognizeReceiptText(
  imageBuffer: Buffer
): Promise<{ text: string; confidence?: number }> {
  const languages = process.env.TESSERACT_LANGS ?? 'ita+eng';

  try {
    return await recognizeWithLanguages(imageBuffer, languages);
  } catch (error) {
    if (languages !== 'eng') {
      return await recognizeWithLanguages(imageBuffer, 'eng');
    }

    throw error;
  }
}

async function recognizeWithLanguages(
  imageBuffer: Buffer,
  languages: string
): Promise<{ text: string; confidence?: number }> {
  const worker = await createWorker(languages);

  try {
    const { data } = await worker.recognize(imageBuffer);
    return { text: data.text, confidence: data.confidence };
  } finally {
    await worker.terminate();
  }
}
