import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import {
  CuParseError,
  CuRequiredError,
  CuYearMismatchError,
  InvalidTaxYearError,
  RulesNotFoundError,
  Tax730Service,
} from '../services/tax-730.service';
import { MissingCursorApiKeyError } from '../cursor-api-key';
import { ALLOWED_CU_MIME_TYPES, MAX_CU_FILE_SIZE_BYTES } from '../tax/parse-cu-file';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CU_FILE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    const name = file.originalname.toLowerCase();
    const allowedByName = ['.pdf', '.xml', '.txt', '.jpg', '.jpeg', '.png'].some(ext => name.endsWith(ext));
    if (ALLOWED_CU_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_CU_MIME_TYPES)[number]) || allowedByName) {
      callback(null, true);
      return;
    }
    callback(new Error('CU file must be a PDF, XML, TXT, JPEG, or PNG'));
  },
});

function uploadCuFile(req: Request, res: Response): Promise<Express.Multer.File | undefined> {
  return new Promise((resolve, reject) => {
    upload.single('file')(req, res, error => {
      if (error) {
        reject(error instanceof Error ? error : new Error('Invalid CU upload'));
        return;
      }
      resolve(req.file);
    });
  });
}

export function createTax730Router(service: Tax730Service): Router {
  const router = Router();

  /**
   * @openapi
   * /api/tax/730/years:
   *   get:
   *     tags:
   *       - Tax730
   *     summary: List 730 years that have a rules file
   *     responses:
   *       200:
   *         description: Available dichiarazione years
   */
  router.get('/years', (_req, res) => {
    res.status(200).json(service.listYears());
  });

  /**
   * @openapi
   * /api/tax/730/{year}:
   *   get:
   *     tags:
   *       - Tax730
   *     summary: Get the 730 filing, parsed CU, and matched deductions
   *     parameters:
   *       - in: path
   *         name: year
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Filing snapshot
   *       404:
   *         description: No rules for that year
   */
  router.get('/:year', (req, res) => {
    try {
      res.status(200).json(service.getFiling(parseYear(req.params.year)));
    } catch (error) {
      sendTaxError(res, error);
    }
  });

  /**
   * @openapi
   * /api/tax/730/{year}:
   *   patch:
   *     tags:
   *       - Tax730
   *     summary: Update mortgage interest override or dependents, then rematch
   */
  router.patch('/:year', (req, res) => {
    try {
      res.status(200).json(service.updateOverrides(parseYear(req.params.year), req.body ?? {}));
    } catch (error) {
      sendTaxError(res, error);
    }
  });

  /**
   * @openapi
   * /api/tax/730/{year}/cu:
   *   post:
   *     tags:
   *       - Tax730
   *     summary: Upload CU PDF or XML for the selected 730 year
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - file
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   */
  router.post('/:year/cu', async (req, res) => {
    try {
      const file = await uploadCuFile(req, res);
      const filing = await service.uploadCu(parseYear(req.params.year), file);
      res.status(200).json(filing);
    } catch (error) {
      sendTaxError(res, error);
    }
  });

  /**
   * @openapi
   * /api/tax/730/{year}/match:
   *   post:
   *     tags:
   *       - Tax730
   *     summary: Rebuild quadro E matches from CU plus income-year transactions
   */
  router.post('/:year/match', (req, res) => {
    try {
      res.status(200).json(service.match(parseYear(req.params.year)));
    } catch (error) {
      sendTaxError(res, error);
    }
  });

  /**
   * @openapi
   * /api/tax/730/{year}/export.json:
   *   get:
   *     tags:
   *       - Tax730
   *     summary: Download the 730 worksheet as JSON
   */
  router.get('/:year/export.json', (req, res) => {
    try {
      const year = parseYear(req.params.year);
      const payload = service.exportJson(year);
      const filename = `730-${year}-worksheet.json`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).json(payload);
    } catch (error) {
      sendTaxError(res, error);
    }
  });

  /**
   * @openapi
   * /api/tax/730/{year}/export.xlsx:
   *   get:
   *     tags:
   *       - Tax730
   *     summary: Download the 730 worksheet as Excel
   */
  router.get('/:year/export.xlsx', async (req, res) => {
    try {
      const year = parseYear(req.params.year);
      const buffer = await service.exportXlsx(year);
      const filename = `730-${year}-worksheet.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(buffer);
    } catch (error) {
      sendTaxError(res, error);
    }
  });

  /**
   * @openapi
   * /api/tax/730/{year}/export.pdf:
   *   get:
   *     tags:
   *       - Tax730
   *     summary: Download a printable 730 PDF summary
   */
  router.get('/:year/export.pdf', async (req, res) => {
    try {
      const year = parseYear(req.params.year);
      const buffer = await service.exportPdf(year);
      const filename = `730-${year}-worksheet.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(buffer);
    } catch (error) {
      sendTaxError(res, error);
    }
  });

  return router;
}

function parseYear(value: string): number {
  const year = Number(value);
  if (!Number.isInteger(year)) {
    throw new InvalidTaxYearError(Number.NaN);
  }
  return year;
}

function sendTaxError(res: Response, error: unknown): void {
  if (error instanceof MissingCursorApiKeyError) {
    res.status(503).json({ error: error.message });
    return;
  }
  if (error instanceof RulesNotFoundError || error instanceof InvalidTaxYearError) {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof CuRequiredError) {
    res.status(409).json({ error: error.message });
    return;
  }
  if (error instanceof CuYearMismatchError || error instanceof CuParseError) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(400).json({
    error: error instanceof Error ? error.message : 'Invalid 730 request',
  });
}
