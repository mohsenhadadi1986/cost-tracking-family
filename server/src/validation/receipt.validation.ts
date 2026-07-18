import type { Express } from 'express';

export const ALLOWED_RECEIPT_MIME_TYPES = ['image/jpeg', 'image/png'] as const;

export const MAX_RECEIPT_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export type AllowedReceiptMimeType = (typeof ALLOWED_RECEIPT_MIME_TYPES)[number];

export function validateReceiptUpload(
  file: Express.Multer.File | undefined
): Express.Multer.File {
  if (!file) {
    throw new Error('image is required');
  }

  if (!ALLOWED_RECEIPT_MIME_TYPES.includes(file.mimetype as AllowedReceiptMimeType)) {
    throw new Error('image must be a JPEG or PNG file');
  }

  if (file.size > MAX_RECEIPT_FILE_SIZE_BYTES) {
    throw new Error('image must be 5 MB or smaller');
  }

  if (file.buffer.length === 0) {
    throw new Error('image file is empty');
  }

  return file;
}
