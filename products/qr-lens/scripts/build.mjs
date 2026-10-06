import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['app/background.js', 'app/content.js'], bundle: true, outdir: 'dist', target: 'chrome109', format: 'iife' });
await copyFile('app/manifest.json', 'dist/manifest.json');
await copyFile('node_modules/jsqr/LICENSE', 'dist/jsQR-LICENSE.txt');
console.log('Ready: dist/');
