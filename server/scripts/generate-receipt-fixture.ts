import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const fixturePath = path.join(__dirname, '../src/tests/fixtures/sample-receipt.png');

const receiptSvg = `
<svg width="600" height="800" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="40" y="80" font-family="DejaVu Sans, Arial, sans-serif" font-size="36" fill="#000000">FOOD MARKET</text>
  <text x="40" y="150" font-family="DejaVu Sans, Arial, sans-serif" font-size="28" fill="#000000">Date: 07/15/2026</text>
  <text x="40" y="220" font-family="DejaVu Sans, Arial, sans-serif" font-size="28" fill="#000000">Bread and milk</text>
  <text x="40" y="320" font-family="DejaVu Sans, Arial, sans-serif" font-size="34" fill="#000000">TOTAL: $42.50</text>
</svg>
`;

async function main(): Promise<void> {
  fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
  await sharp(Buffer.from(receiptSvg)).png().toFile(fixturePath);
  console.log(`Wrote ${fixturePath}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
