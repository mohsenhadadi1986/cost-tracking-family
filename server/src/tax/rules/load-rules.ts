import fs from 'fs';
import path from 'path';
import {
  assertTaxChangelog,
  assertTaxRulesCatalog,
  type TaxChangelog,
  type TaxRulesCatalog,
} from './schema';

export class RulesNotFoundError extends Error {
  constructor(dichiarazioneYear: number) {
    super(`No 730 rules file for year ${dichiarazioneYear}`);
    this.name = 'RulesNotFoundError';
  }
}

export function incomeYearFor(dichiarazioneYear: number): number {
  return dichiarazioneYear - 1;
}

export function officialCuLabelFor(dichiarazioneYear: number): string {
  return `CU ${dichiarazioneYear}`;
}

export function listAvailableRuleYears(): number[] {
  const directory = rulesDirectory();
  const years = fs
    .readdirSync(directory)
    .map(fileName => fileName.match(/^730-(\d{4})\.json$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map(match => Number(match[1]))
    .filter(year => Number.isInteger(year))
    .sort((left, right) => left - right);

  return years;
}

export function loadRules(dichiarazioneYear: number): TaxRulesCatalog {
  const filePath = path.join(rulesDirectory(), `730-${dichiarazioneYear}.json`);
  if (!fs.existsSync(filePath)) {
    throw new RulesNotFoundError(dichiarazioneYear);
  }

  const catalog = assertTaxRulesCatalog(JSON.parse(fs.readFileSync(filePath, 'utf8')));
  if (catalog.dichiarazioneYear !== dichiarazioneYear) {
    throw new Error(`Rules file ${filePath} has dichiarazioneYear ${catalog.dichiarazioneYear}`);
  }

  return catalog;
}

export function loadChangelog(dichiarazioneYear: number): TaxChangelog {
  const filePath = path.join(rulesDirectory(), `730-${dichiarazioneYear}.changelog.json`);
  if (!fs.existsSync(filePath)) {
    return {
      dichiarazioneYear,
      comparedTo: dichiarazioneYear - 1,
      entries: [],
    };
  }

  return assertTaxChangelog(JSON.parse(fs.readFileSync(filePath, 'utf8')));
}

function rulesDirectory(): string {
  const candidates = [
    __dirname,
    path.join(process.cwd(), 'src', 'tax', 'rules'),
    path.join(process.cwd(), 'dist', 'tax', 'rules'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, '730-2026.json'))) {
      return candidate;
    }
  }

  throw new Error('Tax rules directory not found');
}
