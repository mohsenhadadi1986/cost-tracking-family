import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type { TaxChangelog } from './rules/schema';
import type { ParsedCu, TaxFilingResponse, TaxMatchResult } from '../models/tax-730.model';

export function buildExportPayload(filing: TaxFilingResponse) {
  return {
    dichiarazioneYear: filing.dichiarazioneYear,
    incomeYear: filing.incomeYear,
    officialForm: filing.officialForm,
    officialCuLabel: filing.officialCuLabel,
    rulesVersion: filing.rulesVersion,
    status: filing.status,
    cu: filing.cu,
    overrides: filing.overrides,
    match: filing.match,
    changelog: filing.changelog,
    disclaimer: 'Worksheet for the commercialista. This is not a telematic 730 filing with Agenzia delle Entrate.',
  };
}

export async function buildExcelWorkbook(filing: TaxFilingResponse): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'cost-tracking-family';
  workbook.created = new Date();

  addCuSheet(workbook, filing.cu ?? null, filing);
  addQuadroSheet(workbook, filing.match);
  addTransactionsSheet(workbook, filing.match, 'Transactions', filing.match?.matches ?? []);
  addTransactionsSheet(workbook, filing.match, 'Excluded', [
    ...(filing.match?.excluded ?? []),
    ...(filing.match?.needsReview ?? []),
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildPdfSummary(filing: TaxFilingResponse, changelog: TaxChangelog): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).text(`${filing.officialForm} worksheet`, { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#444')
      .text('For the commercialista. This file does not submit a 730 to Agenzia delle Entrate.');
    doc.fillColor('#000').moveDown();

    doc.fontSize(12).text(`Year: ${filing.dichiarazioneYear}  •  Redditi ${filing.incomeYear}  •  ${filing.officialCuLabel}`);
    doc.fontSize(11).text(`Rules version: ${filing.rulesVersion}`);
    doc.moveDown();

    const cu = filing.cu;
    if (cu) {
      doc.fontSize(13).text('Certificazione Unica');
      doc.fontSize(11);
      doc.text(`Codice fiscale: ${cu.codiceFiscale ?? '—'}`);
      doc.text(`Reddito lavoro dipendente: ${money(cu.redditoLavoroDipendente)}`);
      doc.text(`Ritenute: ${money(cu.ritenute)}`);
      doc.text(`Familiari a carico: ${cu.dependents.filter(item => item.aCarico).length}`);
      if (cu.dependents.length > 0) {
        for (const dependent of cu.dependents) {
          doc.text(`  - ${dependent.name}${dependent.age != null ? `, age ${dependent.age}` : ''}`);
        }
      }
      doc.moveDown();
    }

    doc.fontSize(13).text('Quadro E');
    doc.fontSize(10);
    for (const row of filing.match?.quadroE ?? []) {
      const code = row.codice != null ? ` code ${row.codice}` : '';
      doc.text(`${row.rigo}${code}  ${row.label}`);
      doc.text(`  Eligible ${money(row.eligibleAmount)}  •  estimated detrazione ${money(row.estimatedDetrazione)}`);
      for (const warning of row.warnings) {
        doc.fillColor('#7c2d12').text(`  ${warning}`).fillColor('#000');
      }
    }

    if ((filing.match?.warnings.length ?? 0) > 0) {
      doc.moveDown();
      doc.fontSize(13).text('Warnings');
      doc.fontSize(10);
      for (const warning of filing.match?.warnings ?? []) {
        doc.text(`• ${warning}`);
      }
    }

    if (changelog.entries.length > 0) {
      doc.moveDown();
      doc.fontSize(13).text(`Rule updates vs 730/${changelog.comparedTo}`);
      doc.fontSize(10);
      for (const entry of changelog.entries) {
        doc.text(`• [${entry.kind}] ${entry.summary}`);
      }
    }

    doc.end();
  });
}

function addCuSheet(workbook: ExcelJS.Workbook, cu: ParsedCu | null, filing: TaxFilingResponse): void {
  const sheet = workbook.addWorksheet('CU');
  sheet.columns = [
    { header: 'Field', key: 'field', width: 32 },
    { header: 'Value', key: 'value', width: 48 },
  ];
  sheet.addRows([
    { field: 'Dichiarazione year', value: filing.dichiarazioneYear },
    { field: 'Income year', value: filing.incomeYear },
    { field: 'Official CU', value: filing.officialCuLabel },
    { field: 'Codice fiscale', value: cu?.codiceFiscale ?? '' },
    { field: 'Reddito lavoro dipendente', value: cu?.redditoLavoroDipendente ?? '' },
    { field: 'Ritenute', value: cu?.ritenute ?? '' },
    { field: 'Confidence', value: cu?.confidence ?? '' },
    { field: 'Dependents', value: (cu?.dependents ?? []).map(item => `${item.name}${item.age != null ? ` (${item.age})` : ''}`).join(', ') },
  ]);
}

function addQuadroSheet(workbook: ExcelJS.Workbook, match: TaxMatchResult | null | undefined): void {
  const sheet = workbook.addWorksheet('Quadro E');
  sheet.columns = [
    { header: 'Rigo', key: 'rigo', width: 12 },
    { header: 'Codice', key: 'codice', width: 10 },
    { header: 'Label', key: 'label', width: 44 },
    { header: 'Rate', key: 'rate', width: 10 },
    { header: 'Gross', key: 'gross', width: 12 },
    { header: 'Eligible', key: 'eligible', width: 12 },
    { header: 'Estimated detrazione', key: 'detrazione', width: 20 },
    { header: 'Warnings', key: 'warnings', width: 50 },
  ];

  for (const row of match?.quadroE ?? []) {
    sheet.addRow({
      rigo: row.rigo,
      codice: row.codice,
      label: row.label,
      rate: row.rate,
      gross: row.grossAmount,
      eligible: row.eligibleAmount,
      detrazione: row.estimatedDetrazione,
      warnings: row.warnings.join(' | '),
    });
  }
}

function addTransactionsSheet(
  workbook: ExcelJS.Workbook,
  _match: TaxMatchResult | null | undefined,
  name: string,
  rows: TaxMatchResult['matches']
): void {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = [
    { header: 'Transaction id', key: 'transactionId', width: 14 },
    { header: 'Rule', key: 'ruleId', width: 24 },
    { header: 'Rigo', key: 'rigo', width: 12 },
    { header: 'Codice', key: 'codice', width: 10 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Gross', key: 'grossAmount', width: 12 },
    { header: 'Eligible', key: 'eligibleAmount', width: 12 },
    { header: 'Skip reason', key: 'skipReason', width: 40 },
    { header: 'Review', key: 'reviewFlag', width: 40 },
  ];

  for (const row of rows) {
    sheet.addRow(row);
  }
}

function money(value: number | undefined): string {
  if (value == null) {
    return '—';
  }
  return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
