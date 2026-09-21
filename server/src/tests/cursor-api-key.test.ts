import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getCursorApiKey, MissingCursorApiKeyError } from '../cursor-api-key';

describe('getCursorApiKey', () => {
  it('throws when CURSOR_API_KEY is missing', () => {
    const previous = process.env.CURSOR_API_KEY;
    delete process.env.CURSOR_API_KEY;

    try {
      assert.throws(() => getCursorApiKey(), MissingCursorApiKeyError);
    } finally {
      if (previous == null) {
        delete process.env.CURSOR_API_KEY;
      } else {
        process.env.CURSOR_API_KEY = previous;
      }
    }
  });

  it('returns the explicit env value', () => {
    const previous = process.env.CURSOR_API_KEY;
    process.env.CURSOR_API_KEY = 'test-cursor-api-key';

    try {
      assert.equal(getCursorApiKey(), 'test-cursor-api-key');
    } finally {
      if (previous == null) {
        delete process.env.CURSOR_API_KEY;
      } else {
        process.env.CURSOR_API_KEY = previous;
      }
    }
  });
});
