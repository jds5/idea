import jsQR from 'jsqr';
import { sameLocation } from './geometry.js';

// Run in the extension service worker, never on the page's UI thread.
export function decodeAll(image, { maxCodes = 64, budgetMs = 10000 } = {}) {
  const started = performance.now();
  const results = [];
  let limited = false;
  const { width, height, data } = image;
  const regions = [{ x: 0, y: 0, width, height }];
  // Overlapping windows avoid unrelated finder patterns confusing a full-frame scan.
  const size = Math.min(800, Math.max(width, height));
  if (width > size || height > size) {
    for (let y = 0; y < height; y += Math.floor(size * 0.7)) {
      for (let x = 0; x < width; x += Math.floor(size * 0.7)) {
        regions.push({ x, y, width: Math.min(size, width - x), height: Math.min(size, height - y) });
      }
    }
  }
  outer: for (const region of regions) {
    const pixels = new Uint8ClampedArray(region.width * region.height * 4);
    for (let y = 0; y < region.height; y++) {
      const start = ((region.y + y) * width + region.x) * 4;
      pixels.set(data.subarray(start, start + region.width * 4), y * region.width * 4);
    }
    for (;;) {
      if (results.length >= maxCodes || performance.now() - started > budgetMs) { limited = true; break outer; }
      const code = jsQR(pixels, region.width, region.height, { inversionAttempts: 'attemptBoth' });
      if (!code) break;
      const points = ['topLeftCorner', 'topRightCorner', 'bottomLeftCorner', 'bottomRightCorner'].map(k => code.location[k]);
      const left = Math.max(0, Math.floor(Math.min(...points.map(p => p.x))));
      const top = Math.max(0, Math.floor(Math.min(...points.map(p => p.y))));
      const right = Math.min(region.width, Math.ceil(Math.max(...points.map(p => p.x))));
      const bottom = Math.min(region.height, Math.ceil(Math.max(...points.map(p => p.y))));
      const result = { text: code.data, x: region.x + left, y: region.y + top, width: right - left, height: bottom - top };
      if (!results.some(previous => sameLocation(previous, result))) results.push(result);
      // Remove only the decoded symbol. Identical strings at different positions remain separate.
      for (let y = top; y < bottom; y++) pixels.fill(255, (y * region.width + left) * 4, (y * region.width + right) * 4);
    }
  }
  results.sort((a, b) => a.y - b.y || a.x - b.x);
  return { results, limited };
}
