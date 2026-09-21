import sharp from 'sharp';
import type { CategoryRepository } from '../repositories/category.repository';
import type { ReceiptScanConfidence, ReceiptScanResponse } from '../models/receipt-scan.model';
import type { CursorDocumentAgent } from './cursor-document-agent';
import { extractJsonObject } from './cursor-document-agent';

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
  Medical: ['farmacia', 'farmaco', 'ticket', 'visita', 'medico', 'ospedale', 'asl', 'sanitari', 'dental', 'dentist', 'clinic'],
  Sport: ['palestra', 'piscina', 'sport', 'calcio', 'nuoto', 'tennis', 'abbonamento sportivo'],
  Education: ['universit', 'tassa universitaria', 'master', 'afam', 'tuition'],
  'Home reconstruction': ['ristruttur', 'bonifico parlante', 'edilizia', 'impresa edile', 'cila', 'scia', 'superbonus'],
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
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly documentAgent: CursorDocumentAgent
  ) {}

  async scanReceipt(imageBuffer: Buffer): Promise<ReceiptScanResponse> {
    const preparedImage = await preprocessReceiptImage(imageBuffer);
    const expenseCategories = this.categoryRepository.findNamesByType('expense');
    const prompt = [
      'Parse this receipt or invoice image into a draft expense transaction.',
      `allowedCategories=${expenseCategories.join(',')}`,
      'Return JSON only with keys: date, amount, description, suggestedCategory, ocrText, confidence.',
      'date must be YYYY-MM-DD when visible. amount is the total due, not IVA or subtotal.',
      'suggestedCategory must be one of allowedCategories or omitted.',
      'confidence.overall is a number between 0 and 1.',
      'Do not invent a total or date that is not on the document.',
    ].join('\n');

    const raw = await this.documentAgent.complete({
      kind: 'receipt',
      prompt,
      images: [{ data: preparedImage.toString('base64'), mimeType: 'image/png' }],
    });

    return normalizeReceiptScan(extractJsonObject(raw), expenseCategories);
  }
}

export function normalizeReceiptScan(
  value: Record<string, unknown>,
  expenseCategories: string[]
): ReceiptScanResponse {
  const suggestedCategory = toOptionalString(value.suggestedCategory);
  const date = toOptionalString(value.date);
  const parsed: ReceiptScanResponse = {
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
    amount: toPositiveAmount(value.amount),
    description: toOptionalString(value.description)?.slice(0, 120),
    suggestedCategory: suggestedCategory && expenseCategories.includes(suggestedCategory)
      ? suggestedCategory
      : undefined,
    ocrText: toOptionalString(value.ocrText) ? truncateOcrText(String(value.ocrText)) : undefined,
    confidence: toConfidence(value.confidence),
  };

  if (!parsed.date && parsed.amount == null && !parsed.description) {
    throw new Error('Could not read text from receipt image');
  }

  return parsed;
}

function toConfidence(value: unknown): ReceiptScanConfidence | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { overall: clampConfidence(value) };
  }

  if (typeof value === 'string') {
    const mapped = mapLabelConfidence(value);
    return mapped == null ? undefined : { overall: mapped };
  }

  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  return {
    overall: toConfidenceScore(record.overall),
    date: toConfidenceScore(record.date),
    amount: toConfidenceScore(record.amount),
    description: toConfidenceScore(record.description),
    suggestedCategory: toConfidenceScore(record.suggestedCategory),
  };
}

function toConfidenceScore(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clampConfidence(value);
  }
  if (typeof value === 'string') {
    return mapLabelConfidence(value);
  }
  return undefined;
}

function mapLabelConfidence(value: string): number | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'high') {
    return 0.9;
  }
  if (normalized === 'medium') {
    return 0.6;
  }
  if (normalized === 'low') {
    return 0.3;
  }
  return undefined;
}

function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function toPositiveAmount(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value * 100) / 100;
  }
  if (typeof value === 'string') {
    return parseCurrencyAmount(value);
  }
  return undefined;
}
