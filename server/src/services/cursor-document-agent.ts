import fs from 'fs';
import os from 'os';
import path from 'path';
import { Agent, CursorAgentError } from '@cursor/sdk';
import { getCursorApiKey } from '../cursor-api-key';

export type DocumentParseKind = 'cu' | 'receipt';

export interface DocumentParseImage {
  data: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
}

export interface DocumentParseFile {
  filename: string;
  buffer: Buffer;
}

export interface DocumentParseRequest {
  kind: DocumentParseKind;
  prompt: string;
  images?: DocumentParseImage[];
  file?: DocumentParseFile;
}

export interface CursorDocumentAgent {
  complete(request: DocumentParseRequest): Promise<string>;
}

export function createCursorDocumentAgent(): CursorDocumentAgent {
  return {
    async complete(request) {
      const apiKey = getCursorApiKey();
      const cwd = fs.mkdtempSync(path.join(os.tmpdir(), `cursor-${request.kind}-`));

      try {
        if (request.file) {
          fs.writeFileSync(path.join(cwd, sanitizeFilename(request.file.filename)), request.file.buffer);
        }

        const agent = await Agent.create({
          apiKey,
          model: { id: 'composer-2.5' },
          name: `cost-tracking-${request.kind}-parse`,
          local: {
            cwd,
            settingSources: [],
          },
          tools: request.file ? ['read'] : [],
        });

        try {
          const run = await agent.send({
            text: request.prompt,
            images: request.images,
          });
          const result = await run.wait();

          if (result.status !== 'finished' || !result.result?.trim()) {
            throw new Error(result.error?.message ?? `Cursor agent failed to parse the ${request.kind} document`);
          }

          return result.result;
        } finally {
          await agent[Symbol.asyncDispose]();
        }
      } catch (error) {
        if (error instanceof CursorAgentError) {
          throw new Error(`Cursor agent could not start: ${error.message}`);
        }
        throw error;
      } finally {
        fs.rmSync(cwd, { recursive: true, force: true });
      }
    },
  };
}

export function extractJsonObject(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('Cursor agent did not return JSON');
  }

  const parsed = JSON.parse(candidate.slice(start, end + 1)) as unknown;
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Cursor agent JSON must be an object');
  }

  return parsed as Record<string, unknown>;
}

function sanitizeFilename(filename: string): string {
  const base = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base || 'document.bin';
}
