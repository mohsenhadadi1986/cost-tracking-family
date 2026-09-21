import { parseCuText, parseCuXml } from '../tax/parse-cu';
import { parseReceiptText } from './receipt-scan.service';
import type { CursorDocumentAgent } from './cursor-document-agent';

export function createOfflineDocumentAgent(): CursorDocumentAgent {
  return {
    async complete(request) {
      if (request.kind === 'cu') {
        const expectedIncomeYear = Number(request.prompt.match(/expectedIncomeYear=(\d{4})/)?.[1] ?? '2025');
        const text = request.file?.buffer.toString('utf8') ?? '';
        const parsed = looksLikeXml(text) ? parseCuXml(text, expectedIncomeYear) : parseCuText(text, expectedIncomeYear);
        return JSON.stringify(parsed);
      }

      const text = request.file?.buffer.toString('utf8') ?? '';
      if (text.trim() && !text.includes('\0')) {
        return JSON.stringify(parseReceiptText(text, extractAllowedCategories(request.prompt)));
      }

      return JSON.stringify({
        date: '2026-03-15',
        amount: 42.5,
        description: 'Sample receipt',
        suggestedCategory: 'Food',
        ocrText: 'Cursor agent stub receipt parse',
        confidence: {
          overall: 0.9,
          date: 0.9,
          amount: 0.9,
          description: 0.8,
          suggestedCategory: 0.8,
        },
      });
    },
  };
}

function looksLikeXml(text: string): boolean {
  return text.includes('<') && /certificazione|punto|onero|familiare/i.test(text);
}

function extractAllowedCategories(prompt: string): string[] {
  const match = prompt.match(/allowedCategories=(.+)$/m);
  if (!match) {
    return [];
  }

  return match[1]
    .split(',')
    .map(name => name.trim())
    .filter(Boolean);
}
