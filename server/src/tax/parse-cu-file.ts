import { CuParseError, CuYearMismatchError, assertCuIncomeYear } from '../tax/parse-cu';
import type { CuDependent, CuOneriItem, ParsedCu } from '../models/tax-730.model';
import type { CursorDocumentAgent } from '../services/cursor-document-agent';
import { extractJsonObject } from '../services/cursor-document-agent';

export const ALLOWED_CU_MIME_TYPES = [
  'application/pdf',
  'application/xml',
  'text/xml',
  'text/plain',
  'image/jpeg',
  'image/png',
] as const;

export const MAX_CU_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type AllowedCuMimeType = (typeof ALLOWED_CU_MIME_TYPES)[number];

export function validateCuUpload(file: Express.Multer.File | undefined): Express.Multer.File {
  if (!file) {
    throw new Error('file is required');
  }

  const mime = normalizeMime(file.mimetype, file.originalname);
  if (!ALLOWED_CU_MIME_TYPES.includes(mime as AllowedCuMimeType)) {
    throw new Error('CU file must be a PDF, XML, TXT, JPEG, or PNG');
  }

  if (file.size > MAX_CU_FILE_SIZE_BYTES) {
    throw new Error('CU file must be 10 MB or smaller');
  }

  if (file.buffer.length === 0) {
    throw new Error('CU file is empty');
  }

  file.mimetype = mime;
  return file;
}

export async function parseCuFile(
  file: Express.Multer.File,
  expectedIncomeYear: number,
  documentAgent: CursorDocumentAgent
): Promise<ParsedCu> {
  const mime = normalizeMime(file.mimetype, file.originalname);
  const isImage = mime === 'image/jpeg' || mime === 'image/png';
  const prompt = [
    'Parse this Italian Certificazione Unica (CU) for a 730 commercialista worksheet.',
    `expectedIncomeYear=${expectedIncomeYear}`,
    'Return JSON only with keys: redditoYear, cuLabel, codiceFiscale, redditoLavoroDipendente, ritenute, dependents, oneri, oneriAlreadyDeductedTotal, confidence, warnings.',
    'dependents is an array of {name, codiceFiscale, relationship, age, aCarico}.',
    'oneri is an array of {point, codice, amount}.',
    'confidence must be high, medium, or low.',
    'Use Italian number formats if present. Do not invent missing figures.',
    isImage
      ? 'The CU is attached as an image. Read every numbered punto you can see.'
      : `The CU file is in the workspace as ${sanitizeFilename(file.originalname)}. Read that file.`,
  ].join('\n');

  try {
    const raw = await documentAgent.complete({
      kind: 'cu',
      prompt,
      images: isImage
        ? [{ data: file.buffer.toString('base64'), mimeType: mime === 'image/png' ? 'image/png' : 'image/jpeg' }]
        : undefined,
      file: isImage ? undefined : { filename: sanitizeFilename(file.originalname), buffer: file.buffer },
    });

    const parsed = normalizeParsedCu(extractJsonObject(raw), file.buffer.toString('utf8').slice(0, 4000));
    assertCuIncomeYear(parsed, expectedIncomeYear);
    return parsed;
  } catch (error) {
    if (error instanceof CuParseError || error instanceof CuYearMismatchError) {
      throw error;
    }
    throw new CuParseError(error instanceof Error ? error.message : 'Could not parse the CU with the Cursor agent');
  }
}

export function normalizeMime(mimetype: string, originalname: string): string {
  const lowerName = originalname.toLowerCase();
  if (lowerName.endsWith('.xml')) {
    return 'application/xml';
  }
  if (lowerName.endsWith('.pdf')) {
    return 'application/pdf';
  }
  if (lowerName.endsWith('.txt')) {
    return 'text/plain';
  }
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (lowerName.endsWith('.png')) {
    return 'image/png';
  }
  return mimetype;
}

export function normalizeParsedCu(value: Record<string, unknown>, rawText?: string): ParsedCu {
  const confidence = value.confidence === 'high' || value.confidence === 'medium' || value.confidence === 'low'
    ? value.confidence
    : 'medium';

  const parsed: ParsedCu = {
    redditoYear: toInteger(value.redditoYear) ?? 0,
    cuLabel: toOptionalString(value.cuLabel),
    codiceFiscale: toOptionalString(value.codiceFiscale),
    redditoLavoroDipendente: toOptionalNumber(value.redditoLavoroDipendente),
    ritenute: toOptionalNumber(value.ritenute),
    dependents: toDependents(value.dependents),
    oneri: toOneri(value.oneri),
    oneriAlreadyDeductedTotal: toOptionalNumber(value.oneriAlreadyDeductedTotal),
    rawText,
    confidence,
    warnings: toStringArray(value.warnings),
  };

  if (parsed.redditoYear <= 0) {
    throw new CuParseError('Cursor agent did not return redditoYear');
  }

  return parsed;
}

function toDependents(value: unknown): CuDependent[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(item => {
    if (typeof item !== 'object' || item === null) {
      return [];
    }
    const record = item as Record<string, unknown>;
    const name = toOptionalString(record.name);
    if (!name) {
      return [];
    }
    return [{
      name,
      codiceFiscale: toOptionalString(record.codiceFiscale),
      relationship: toOptionalString(record.relationship),
      age: toInteger(record.age),
      aCarico: record.aCarico !== false,
    }];
  });
}

function toOneri(value: unknown): CuOneriItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(item => {
    if (typeof item !== 'object' || item === null) {
      return [];
    }
    const record = item as Record<string, unknown>;
    const point = toInteger(record.point);
    const amount = toOptionalNumber(record.amount);
    if (point == null || amount == null) {
      return [];
    }
    return [{ point, codice: toInteger(record.codice), amount }];
  });
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function toInteger(value: unknown): number | undefined {
  const amount = toOptionalNumber(value);
  return amount == null ? undefined : Math.round(amount);
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value * 100) / 100;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : undefined;
  }
  return undefined;
}

function sanitizeFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop()?.replace(/[^a-zA-Z0-9._-]/g, '_') ?? 'document.bin';
  return base || 'document.bin';
}
