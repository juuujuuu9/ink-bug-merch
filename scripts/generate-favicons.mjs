#!/usr/bin/env node
/**
 * Generates favicon files from public/logo.png into public/favicon/
 * Run: node scripts/generate-favicons.mjs
 */
import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const logoPath = join(root, 'public', 'logo.png');
const outDir = join(root, 'public', 'favicon');

await mkdir(outDir, { recursive: true });

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size } of sizes) {
  await sharp(logoPath).resize(size, size).png().toFile(join(outDir, name));
  console.log(`Created ${name}`);
}
