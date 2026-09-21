import type Database from 'better-sqlite3';
import type {
  ParsedCu,
  TaxFilingOverrides,
  TaxFilingStatus,
  TaxMatchResult,
  TaxMatchRow,
} from '../models/tax-730.model';

type FilingRow = {
  dichiarazione_year: number;
  income_year: number;
  status: TaxFilingStatus;
  cu_parsed_json: string | null;
  overrides_json: string | null;
  created_at: string;
  updated_at: string;
};

export interface TaxFilingRecord {
  dichiarazioneYear: number;
  incomeYear: number;
  status: TaxFilingStatus;
  cu: ParsedCu | null;
  overrides: TaxFilingOverrides;
  createdAt: string;
  updatedAt: string;
}

export class Tax730Repository {
  constructor(private readonly db: Database.Database) {}

  upsertFiling(input: {
    dichiarazioneYear: number;
    incomeYear: number;
    status: TaxFilingStatus;
    cu?: ParsedCu | null;
    overrides?: TaxFilingOverrides;
  }): TaxFilingRecord {
    const now = new Date().toISOString();
    const existing = this.findFiling(input.dichiarazioneYear);
    const overrides = input.overrides ?? existing?.overrides ?? {};
    const cu = input.cu === undefined ? existing?.cu ?? null : input.cu;

    this.db.prepare(`
      INSERT INTO tax_filings (
        dichiarazione_year, income_year, status, cu_parsed_json, overrides_json, created_at, updated_at
      ) VALUES (
        @dichiarazioneYear, @incomeYear, @status, @cuJson, @overridesJson, @createdAt, @updatedAt
      )
      ON CONFLICT(dichiarazione_year) DO UPDATE SET
        income_year = excluded.income_year,
        status = excluded.status,
        cu_parsed_json = excluded.cu_parsed_json,
        overrides_json = excluded.overrides_json,
        updated_at = excluded.updated_at
    `).run({
      dichiarazioneYear: input.dichiarazioneYear,
      incomeYear: input.incomeYear,
      status: input.status,
      cuJson: cu ? JSON.stringify(cu) : null,
      overridesJson: JSON.stringify(overrides),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    const saved = this.findFiling(input.dichiarazioneYear);
    if (!saved) {
      throw new Error('Failed to save tax filing');
    }
    return saved;
  }

  findFiling(dichiarazioneYear: number): TaxFilingRecord | undefined {
    const row = this.db.prepare(`
      SELECT dichiarazione_year, income_year, status, cu_parsed_json, overrides_json, created_at, updated_at
      FROM tax_filings
      WHERE dichiarazione_year = @dichiarazioneYear
    `).get({ dichiarazioneYear }) as FilingRow | undefined;

    return row ? mapFiling(row) : undefined;
  }

  saveDocument(input: {
    dichiarazioneYear: number;
    originalFilename: string;
    mime: string;
    bytes: Buffer;
  }): void {
    this.db.prepare(`
      DELETE FROM tax_documents
      WHERE dichiarazione_year = @dichiarazioneYear AND kind = 'cu'
    `).run({ dichiarazioneYear: input.dichiarazioneYear });

    this.db.prepare(`
      INSERT INTO tax_documents (dichiarazione_year, kind, original_filename, mime, bytes, created_at)
      VALUES (@dichiarazioneYear, 'cu', @originalFilename, @mime, @bytes, @createdAt)
    `).run({
      dichiarazioneYear: input.dichiarazioneYear,
      originalFilename: input.originalFilename,
      mime: input.mime,
      bytes: input.bytes,
      createdAt: new Date().toISOString(),
    });
  }

  replaceMatches(dichiarazioneYear: number, result: TaxMatchResult): void {
    const insert = this.db.prepare(`
      INSERT INTO tax_matches (
        dichiarazione_year, transaction_id, rule_id, rigo, codice, category, date, description,
        gross_amount, eligible_amount, skip_reason, review_flag
      ) VALUES (
        @dichiarazioneYear, @transactionId, @ruleId, @rigo, @codice, @category, @date, @description,
        @grossAmount, @eligibleAmount, @skipReason, @reviewFlag
      )
    `);

    const write = this.db.transaction(() => {
      this.db.prepare(`DELETE FROM tax_matches WHERE dichiarazione_year = @dichiarazioneYear`)
        .run({ dichiarazioneYear });

      for (const row of [...result.matches, ...result.excluded, ...result.needsReview]) {
        insert.run(toMatchParams(dichiarazioneYear, row));
      }
    });

    write();
  }

  listMatches(dichiarazioneYear: number): TaxMatchRow[] {
    const rows = this.db.prepare(`
      SELECT transaction_id, rule_id, rigo, codice, category, date, description,
             gross_amount, eligible_amount, skip_reason, review_flag
      FROM tax_matches
      WHERE dichiarazione_year = @dichiarazioneYear
      ORDER BY id
    `).all({ dichiarazioneYear }) as Array<{
      transaction_id: number | null;
      rule_id: string;
      rigo: string;
      codice: number | null;
      category: string;
      date: string;
      description: string;
      gross_amount: number;
      eligible_amount: number;
      skip_reason: string | null;
      review_flag: string | null;
    }>;

    return rows.map(row => ({
      transactionId: row.transaction_id,
      ruleId: row.rule_id,
      rigo: row.rigo,
      codice: row.codice,
      category: row.category,
      date: row.date,
      description: row.description,
      grossAmount: row.gross_amount,
      eligibleAmount: row.eligible_amount,
      skipReason: row.skip_reason,
      reviewFlag: row.review_flag,
    }));
  }
}

function mapFiling(row: FilingRow): TaxFilingRecord {
  return {
    dichiarazioneYear: row.dichiarazione_year,
    incomeYear: row.income_year,
    status: row.status,
    cu: row.cu_parsed_json ? JSON.parse(row.cu_parsed_json) as ParsedCu : null,
    overrides: row.overrides_json ? JSON.parse(row.overrides_json) as TaxFilingOverrides : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMatchParams(dichiarazioneYear: number, row: TaxMatchRow) {
  return {
    dichiarazioneYear,
    transactionId: row.transactionId,
    ruleId: row.ruleId,
    rigo: row.rigo,
    codice: row.codice,
    category: row.category,
    date: row.date,
    description: row.description,
    grossAmount: row.grossAmount,
    eligibleAmount: row.eligibleAmount,
    skipReason: row.skipReason,
    reviewFlag: row.reviewFlag,
  };
}
