import fs from 'fs';
import path from 'path';

function applyEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separator = line.indexOf('=');
    if (separator <= 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!value) {
      continue;
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export function loadServerEnv(): void {
  const serverRoot = path.resolve(__dirname, '..');
  applyEnvFile(path.join(serverRoot, '.env'));
  applyEnvFile(path.join(process.cwd(), '.env'));
  applyEnvFile(path.join(process.cwd(), 'server', '.env'));
}

loadServerEnv();
