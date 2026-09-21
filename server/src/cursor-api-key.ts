import './env';
import { loadServerEnv } from './env';

const CURSOR_API_KEY_HELP =
  'Set CURSOR_API_KEY in server/.env. Create a user or service-account key at https://cursor.com/dashboard/integrations';

export class MissingCursorApiKeyError extends Error {
  constructor() {
    super(`CURSOR_API_KEY is missing. ${CURSOR_API_KEY_HELP}`);
    this.name = 'MissingCursorApiKeyError';
  }
}

export function getCursorApiKey(): string {
  loadServerEnv();
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    throw new MissingCursorApiKeyError();
  }

  return apiKey;
}
