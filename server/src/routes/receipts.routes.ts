import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import type { ReceiptScanService } from '../services/receipt-scan.service';
import {
  ALLOWED_RECEIPT_MIME_TYPES,
  MAX_RECEIPT_FILE_SIZE_BYTES,
  validateReceiptUpload,
} from '../validation/receipt.validation';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RECEIPT_FILE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_RECEIPT_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_RECEIPT_MIME_TYPES)[number])) {
      callback(new Error('image must be a JPEG or PNG file'));
      return;
    }

    callback(null, true);
  },
});

function uploadReceiptImage(req: Request, res: Response): Promise<Express.Multer.File | undefined> {
  return new Promise((resolve, reject) => {
    upload.single('image')(req, res, error => {
      if (error) {
        reject(error instanceof Error ? error : new Error('Invalid receipt upload'));
        return;
      }

      resolve(req.file);
    });
  });
}

export function createReceiptsRouter(receiptScanService: ReceiptScanService): Router {
  const router = Router();

  /**
   * @openapi
   * /api/receipts/scan:
   *   post:
   *     tags:
   *       - Receipts
   *     summary: Scan a receipt image
   *     description: |
   *       Accepts a receipt image, runs OCR server-side, and returns draft transaction
   *       fields for client pre-fill. Does not persist transactions or store images.
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - image
   *             properties:
   *               image:
   *                 type: string
   *                 format: binary
   *                 description: JPEG or PNG receipt image up to 5 MB
   *     responses:
   *       200:
   *         description: Parsed draft transaction fields
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ReceiptScanResponse'
   *       400:
   *         description: Invalid file or unreadable receipt
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.post('/scan', async (req, res) => {
    try {
      const uploadedFile = await uploadReceiptImage(req, res);
      const file = validateReceiptUpload(uploadedFile);
      const result = await receiptScanService.scanReceipt(file.buffer);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid receipt scan request',
      });
    }
  });

  return router;
}
