import type { Express } from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { DEFAULT_PORT, getSwaggerJSDocOptions } from './openapi.config';

export {
  API_DESCRIPTION,
  API_TITLE,
  API_VERSION,
  DEFAULT_PORT,
  getServerUrl,
  getSwaggerDefinition,
} from './openapi.config';
export { getOpenApiSchemas } from './schemas';

export function createOpenApiSpec(port: number = DEFAULT_PORT): object {
  return swaggerJSDoc(getSwaggerJSDocOptions(port));
}

export function setupOpenApiDocs(app: Express, port: number = DEFAULT_PORT): void {
  const spec = createOpenApiSpec(port);

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
  app.get('/api/docs.json', (_req, res) => {
    res.json(spec);
  });
}
