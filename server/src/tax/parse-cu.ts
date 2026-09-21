import type { ParsedCu, CuDependent, CuOneriItem } from '../models/tax-730.model';

export class CuParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CuParseError';
  }
}

export class CuYearMismatchError extends Error {
  constructor(expectedYear: number, actualYear: number) {
    super(`CU reddito year ${actualYear} does not match expected ${expectedYear}`);
    this.name = 'CuYearMismatchError';
  }
}

export function parseItalianAmount(value: string): number | undefined {
  const cleaned = value.trim().replace(/\s/g, '').replace(/€/g, '');
  if (!cleaned) {
    return undefined;
  }

  let normalized = cleaned;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, '');
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) ? roundMoney(amount) : undefined;
}

export function parseCuXml(xml: string, expectedIncomeYear: number): ParsedCu {
  const redditoYear =
    parseYear(attributeValue(xml, 'anno') ?? tagText(xml, 'AnnoImposta') ?? tagText(xml, 'anno')) ??
    parseYearFromLabel(xml);

  const parsed: ParsedCu = {
    redditoYear: redditoYear ?? expectedIncomeYear,
    cuLabel: attributeValue(xml, 'cuLabel') ?? tagText(xml, 'CuLabel') ?? extractCuLabel(xml),
    codiceFiscale:
      attributeValue(xml, 'codiceFiscale') ??
      tagText(xml, 'CodiceFiscale') ??
      tagText(xml, 'codiceFiscale'),
    redditoLavoroDipendente: firstDefined(
      puntoFromXml(xml, 1),
      parseItalianAmount(tagText(xml, 'RedditoLavoroDipendente') ?? '')
    ),
    ritenute: firstDefined(
      puntoFromXml(xml, 21),
      parseItalianAmount(tagText(xml, 'Ritenute') ?? '')
    ),
    dependents: parseXmlDependents(xml),
    oneri: parseXmlOneri(xml),
    oneriAlreadyDeductedTotal: firstDefined(
      puntoFromXml(xml, 431),
      parseItalianAmount(tagText(xml, 'OneriGiaDedotti') ?? '')
    ),
    rawText: xml.slice(0, 4000),
    confidence: 'high',
    warnings: [],
  };

  if (parsed.redditoLavoroDipendente == null) {
    parsed.confidence = 'medium';
    parsed.warnings.push('Could not read reddito di lavoro dipendente from the CU XML.');
  }

  assertIncomeYear(parsed, expectedIncomeYear);
  return parsed;
}

export function parseCuText(text: string, expectedIncomeYear: number): ParsedCu {
  const redditoYear = parseYearFromLabel(text) ?? expectedIncomeYear;
  const parsed: ParsedCu = {
    redditoYear,
    cuLabel: extractCuLabel(text),
    codiceFiscale: extractCodiceFiscale(text),
    redditoLavoroDipendente: firstDefined(
      extractPuntoAmount(text, 1),
      extractLabeledAmount(text, /reddito\s+di\s+lavoro\s+dipendente/i)
    ),
    ritenute: firstDefined(
      extractPuntoAmount(text, 21),
      extractLabeledAmount(text, /ritenute(?:\s+operate)?/i)
    ),
    dependents: parseTextDependents(text),
    oneri: parseTextOneri(text),
    oneriAlreadyDeductedTotal: extractPuntoAmount(text, 431),
    rawText: text.slice(0, 4000),
    confidence: 'medium',
    warnings: [],
  };

  if (parsed.redditoLavoroDipendente == null) {
    parsed.confidence = 'low';
    parsed.warnings.push('Could not read reddito di lavoro dipendente. Confirm the CU fields before exporting.');
  } else if (!extractPuntoAmount(text, 1)) {
    parsed.confidence = 'medium';
  } else {
    parsed.confidence = 'high';
  }

  assertIncomeYear(parsed, expectedIncomeYear);
  return parsed;
}

export function assertCuIncomeYear(parsed: ParsedCu, expectedIncomeYear: number): void {
  if (parsed.redditoYear !== expectedIncomeYear) {
    throw new CuYearMismatchError(expectedIncomeYear, parsed.redditoYear);
  }
}

function assertIncomeYear(parsed: ParsedCu, expectedIncomeYear: number): void {
  assertCuIncomeYear(parsed, expectedIncomeYear);
}

function parseXmlDependents(xml: string): CuDependent[] {
  const blocks = collectXmlBlocks(xml, 'Familiare');
  return blocks.map(block => ({
    name: attributeValue(block, 'nome') ?? tagText(block, 'Nome') ?? 'Familiare',
    codiceFiscale: attributeValue(block, 'codiceFiscale') ?? tagText(block, 'CodiceFiscale'),
    relationship: attributeValue(block, 'rapporto') ?? tagText(block, 'Rapporto'),
    age: parseOptionalInteger(attributeValue(block, 'eta') ?? tagText(block, 'Eta')),
    aCarico: parseBoolean(attributeValue(block, 'aCarico') ?? tagText(block, 'ACarico') ?? 'true'),
  }));
}

function parseXmlOneri(xml: string): CuOneriItem[] {
  const blocks = collectXmlBlocks(xml, 'Onero');
  const fromBlocks = blocks.flatMap(block => {
    const amount = parseItalianAmount(
      attributeValue(block, 'importo') ??
      tagText(block, 'Importo') ??
      (block.includes('</') ? block.replace(/<[^>]+>/g, '') : '')
    );
    const point = parseOptionalInteger(attributeValue(block, 'punto') ?? tagText(block, 'Punto'));
    if (amount == null || point == null) {
      return [];
    }

    return [{
      point,
      codice: parseOptionalInteger(attributeValue(block, 'codice') ?? tagText(block, 'Codice')),
      amount,
    }];
  });

  if (fromBlocks.length > 0) {
    return fromBlocks;
  }

  const points: CuOneriItem[] = [];
  for (const point of [341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 431, 432, 433, 434, 435, 436, 437]) {
    const amount = puntoFromXml(xml, point);
    if (amount != null && amount > 0) {
      points.push({ point, amount });
    }
  }
  return points;
}

function parseTextDependents(text: string): CuDependent[] {
  const dependents: CuDependent[] = [];
  const pattern = /familiare[^\n]*?([A-Z][a-zA-Zàèéìòù' -]+).*?(?:eta[^\d]{0,6}(\d{1,2}))?/gi;
  for (const match of text.matchAll(pattern)) {
    dependents.push({
      name: match[1].trim(),
      age: match[2] ? Number(match[2]) : undefined,
      aCarico: true,
    });
  }
  return dependents;
}

function parseTextOneri(text: string): CuOneriItem[] {
  const oneri: CuOneriItem[] = [];
  for (const point of [341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 431, 432, 433, 434, 435, 436, 437]) {
    const amount = extractPuntoAmount(text, point);
    if (amount != null && amount > 0) {
      const codice = extractCodiceNearPunto(text, point);
      oneri.push({ point, codice, amount });
    }
  }
  return oneri;
}

function extractPuntoAmount(text: string, point: number): number | undefined {
  const pattern = new RegExp(
    `(?:punto|pt)\\.?\\s*${point}\\b(?:[^\\n]{0,40}?cod(?:ice)?\\s*\\d{1,2})?[^\\d€]{0,20}(\\d{1,3}(?:[.\\s]\\d{3})*(?:,\\d{2})|\\d+[.,]\\d{2}|\\d{4,})`,
    'i'
  );
  const match = text.match(pattern);
  return match ? parseItalianAmount(match[1]) : undefined;
}

function extractCodiceNearPunto(text: string, point: number): number | undefined {
  const pattern = new RegExp(`(?:punto|pt)\\.?\\s*${point}\\b[\\s\\S]{0,80}cod(?:ice)?\\s*(\\d{1,2})`, 'i');
  const match = text.match(pattern);
  return match ? Number(match[1]) : undefined;
}

function extractLabeledAmount(text: string, label: RegExp): number | undefined {
  const pattern = new RegExp(
    `${label.source}[^\\d€]{0,40}(\\d{1,3}(?:[.\\s]\\d{3})*(?:,\\d{2})?|\\d+(?:[.,]\\d{2})?)`,
    'i'
  );
  const match = text.match(pattern);
  return match ? parseItalianAmount(match[1]) : undefined;
}

function extractCuLabel(text: string): string | undefined {
  const match = text.match(/\bCU\s*20\d{2}\b/i);
  return match ? match[0].toUpperCase().replace(/\s+/g, ' ') : undefined;
}

function extractCodiceFiscale(text: string): string | undefined {
  const match = text.match(/\b([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])\b/i);
  return match ? match[1].toUpperCase() : undefined;
}

function parseYearFromLabel(text: string): number | undefined {
  const anno = text.match(/anno(?:\s+d['’]imposta)?[^\d]{0,12}(20\d{2})/i);
  if (anno) {
    return Number(anno[1]);
  }

  const reddito = text.match(/redditi\s+(20\d{2})/i);
  if (reddito) {
    return Number(reddito[1]);
  }

  const cu = text.match(/\bCU\s*(20\d{2})\b/i);
  if (cu) {
    return Number(cu[1]) - 1;
  }

  return parseYear(attributeValue(text, 'anno'));
}

function puntoFromXml(xml: string, point: number): number | undefined {
  const match = xml.match(new RegExp(`<Punto[^>]*n=["']${point}["'][^>]*>([\\s\\S]*?)</Punto>`, 'i'));
  return match ? parseItalianAmount(match[1]) : undefined;
}

function collectXmlBlocks(xml: string, tag: string): string[] {
  const selfClosing = xml.match(new RegExp(`<${tag}\\b[^>]*/>`, 'gi')) ?? [];
  const paired = xml.match(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`, 'gi')) ?? [];
  return [...selfClosing, ...paired];
}

function tagText(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? match[1].trim() : undefined;
}

function attributeValue(xml: string, name: string): string | undefined {
  const match = xml.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match ? match[1].trim() : undefined;
}

function parseYear(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const match = value.match(/20\d{2}/);
  return match ? Number(match[0]) : undefined;
}

function parseOptionalInteger(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) ? parsed : undefined;
}

function parseBoolean(value: string): boolean {
  return !['false', '0', 'no'].includes(value.trim().toLowerCase());
}

function firstDefined(...values: Array<number | undefined>): number | undefined {
  return values.find(value => value != null);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
