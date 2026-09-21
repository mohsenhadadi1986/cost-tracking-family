import { TransactionRepository } from '../repositories/transaction.repository';
import { Tax730Repository } from '../repositories/tax-730.repository';
import {
  incomeYearFor,
  listAvailableRuleYears,
  loadChangelog,
  loadRules,
  officialCuLabelFor,
  RulesNotFoundError,
} from '../tax/rules/load-rules';
import { match730 } from '../tax/match-730';
import { parseCuFile, validateCuUpload } from '../tax/parse-cu-file';
import { buildExcelWorkbook, buildExportPayload, buildPdfSummary } from '../tax/export-730';
import { CuParseError, CuYearMismatchError } from '../tax/parse-cu';
import type { TaxFilingOverrides, TaxFilingResponse, TaxMatchResult } from '../models/tax-730.model';
import type { CursorDocumentAgent } from './cursor-document-agent';

export class CuRequiredError extends Error {
  constructor(dichiarazioneYear: number) {
    super(`Upload ${officialCuLabelFor(dichiarazioneYear)} (redditi ${incomeYearFor(dichiarazioneYear)}) before matching or exporting`);
    this.name = 'CuRequiredError';
  }
}

export class InvalidTaxYearError extends Error {
  constructor(year: number) {
    super(`Invalid 730 year ${year}`);
    this.name = 'InvalidTaxYearError';
  }
}

export class Tax730Service {
  constructor(
    private readonly filings: Tax730Repository,
    private readonly transactions: TransactionRepository,
    private readonly documentAgent: CursorDocumentAgent
  ) {}

  listYears() {
    return listAvailableRuleYears().map(dichiarazioneYear => {
      const catalog = loadRules(dichiarazioneYear);
      return {
        dichiarazioneYear,
        incomeYear: catalog.incomeYear,
        officialForm: catalog.officialForm,
        officialCuLabel: catalog.officialCuLabel,
      };
    });
  }

  getFiling(dichiarazioneYear: number): TaxFilingResponse {
    const catalog = this.loadCatalog(dichiarazioneYear);
    const changelog = loadChangelog(dichiarazioneYear);
    const record = this.filings.findFiling(dichiarazioneYear);

    return {
      dichiarazioneYear,
      incomeYear: catalog.incomeYear,
      officialForm: catalog.officialForm,
      officialCuLabel: catalog.officialCuLabel,
      status: record?.status ?? 'awaiting_cu',
      hasCu: Boolean(record?.cu),
      cu: record?.cu ?? null,
      overrides: record?.overrides ?? {},
      match: record?.cu ? this.storedMatch(dichiarazioneYear) : null,
      changelog: changelog.entries,
      rulesVersion: catalog.version,
    };
  }

  async uploadCu(dichiarazioneYear: number, file: Express.Multer.File | undefined): Promise<TaxFilingResponse> {
    const catalog = this.loadCatalog(dichiarazioneYear);
    const uploaded = validateCuUpload(file);
    const parsed = await parseCuFile(uploaded, catalog.incomeYear, this.documentAgent);

    this.filings.upsertFiling({
      dichiarazioneYear,
      incomeYear: catalog.incomeYear,
      status: 'cu_parsed',
      cu: parsed,
    });
    this.filings.saveDocument({
      dichiarazioneYear,
      originalFilename: uploaded.originalname,
      mime: uploaded.mimetype,
      bytes: uploaded.buffer,
    });

    this.rebuildMatch(dichiarazioneYear);
    return this.getFiling(dichiarazioneYear);
  }

  updateOverrides(dichiarazioneYear: number, overrides: TaxFilingOverrides): TaxFilingResponse {
    const catalog = this.loadCatalog(dichiarazioneYear);
    const existing = this.filings.findFiling(dichiarazioneYear);
    if (!existing?.cu) {
      throw new CuRequiredError(dichiarazioneYear);
    }

    this.filings.upsertFiling({
      dichiarazioneYear,
      incomeYear: catalog.incomeYear,
      status: existing.status,
      cu: existing.cu,
      overrides: {
        ...existing.overrides,
        ...overrides,
      },
    });

    this.rebuildMatch(dichiarazioneYear);
    return this.getFiling(dichiarazioneYear);
  }

  match(dichiarazioneYear: number): TaxFilingResponse {
    this.rebuildMatch(dichiarazioneYear);
    return this.getFiling(dichiarazioneYear);
  }

  exportJson(dichiarazioneYear: number) {
    return buildExportPayload(this.requireMatchedFiling(dichiarazioneYear));
  }

  async exportXlsx(dichiarazioneYear: number): Promise<Buffer> {
    return buildExcelWorkbook(this.requireMatchedFiling(dichiarazioneYear));
  }

  async exportPdf(dichiarazioneYear: number): Promise<Buffer> {
    const filing = this.requireMatchedFiling(dichiarazioneYear);
    return buildPdfSummary(filing, loadChangelog(dichiarazioneYear));
  }

  private rebuildMatch(dichiarazioneYear: number): TaxMatchResult {
    const catalog = this.loadCatalog(dichiarazioneYear);
    const existing = this.filings.findFiling(dichiarazioneYear);
    if (!existing?.cu) {
      throw new CuRequiredError(dichiarazioneYear);
    }

    const transactions = this.transactions.findFiltered({
      startDate: `${catalog.incomeYear}-01-01`,
      endDate: `${catalog.incomeYear}-12-31`,
      type: 'expense',
    });

    const result = match730({
      catalog,
      cu: existing.cu,
      transactions,
      overrides: existing.overrides,
    });

    this.filings.replaceMatches(dichiarazioneYear, result);
    this.filings.upsertFiling({
      dichiarazioneYear,
      incomeYear: catalog.incomeYear,
      status: 'matched',
      cu: existing.cu,
      overrides: existing.overrides,
    });

    return result;
  }

  private storedMatch(dichiarazioneYear: number): TaxMatchResult | null {
    const filing = this.getFilingWithoutMatch(dichiarazioneYear);
    if (filing.status !== 'matched' && filing.status !== 'cu_parsed') {
      return null;
    }

    const rows = this.filings.listMatches(dichiarazioneYear);
    if (rows.length === 0 && filing.status !== 'matched') {
      return null;
    }

    const record = this.filings.findFiling(dichiarazioneYear);
    if (!record?.cu) {
      return null;
    }

    const catalog = loadRules(dichiarazioneYear);
    const transactions = this.transactions.findFiltered({
      startDate: `${catalog.incomeYear}-01-01`,
      endDate: `${catalog.incomeYear}-12-31`,
      type: 'expense',
    });

    return match730({
      catalog,
      cu: record.cu,
      transactions,
      overrides: record.overrides,
    });
  }

  private getFilingWithoutMatch(dichiarazioneYear: number) {
    const catalog = this.loadCatalog(dichiarazioneYear);
    const record = this.filings.findFiling(dichiarazioneYear);
    return {
      status: record?.status ?? 'awaiting_cu',
    };
  }

  private requireMatchedFiling(dichiarazioneYear: number): TaxFilingResponse {
    const filing = this.getFiling(dichiarazioneYear);
    if (!filing.hasCu) {
      throw new CuRequiredError(dichiarazioneYear);
    }
    return filing;
  }

  private loadCatalog(dichiarazioneYear: number) {
    if (!Number.isInteger(dichiarazioneYear) || dichiarazioneYear < 2000 || dichiarazioneYear > 2100) {
      throw new InvalidTaxYearError(dichiarazioneYear);
    }
    return loadRules(dichiarazioneYear);
  }
}

export { CuParseError, CuYearMismatchError, RulesNotFoundError };
