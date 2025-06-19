#!/usr/bin/env node
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createBundle() {
  // Ensure dist directory exists
  const distDir = path.join(__dirname, '../dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  try {
    console.log('Creating optimized production bundle...');
    
    await build({
      entryPoints: [path.join(__dirname, '../index.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node14',
      minify: true,
      external: ['commander', 'js-yaml', 'yargs', '@faker-js/faker', 'zod'],
      outfile: path.join(__dirname, '../dist/index.bundle.js'),
    });
    
    console.log('Bundle created successfully: dist/index.bundle.js');
  } catch (error) {
    console.error('Bundle creation failed:', error);
    process.exit(1);
  }
}

createBundle();
