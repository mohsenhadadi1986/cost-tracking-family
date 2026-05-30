import path from 'path';
import { getOpenApiSchemas } from './schemas';

export const API_TITLE = 'Cost Tracking Family API';
export const API_VERSION = '1.0.0';
export const API_DESCRIPTION =
  'REST API for family expense tracking — transactions, summaries, and health checks.';

export const DEFAULT_PORT = 3000;

export function getServerUrl(port: number = DEFAULT_PORT): string {
  return `http://localhost:${port}`;
}

export function getSwaggerDefinition(port: number = DEFAULT_PORT) {
  return {
    openapi: '3.0.0',
    info: {
      title: API_TITLE,
      version: API_VERSION,
      description: API_DESCRIPTION,
    },
    servers: [
      {
        url: getServerUrl(port),
        description: 'Local development server',
      },
    ],
    tags: [
      { name: 'Health', description: 'Service health checks' },
      { name: 'Transactions', description: 'Transaction CRUD and summaries' },
    ],
    components: {
      schemas: getOpenApiSchemas(),
    },
    paths: {},
  };
}

export function getSwaggerJSDocOptions(port: number = DEFAULT_PORT) {
  const srcDir = path.join(__dirname, '../../src');
  return {
    definition: getSwaggerDefinition(port),
    apis: [
      path.join(srcDir, 'routes/*.ts'),
      path.join(srcDir, 'app.ts'),
    ],
  };
}
