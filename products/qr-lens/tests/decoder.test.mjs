import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import { PNG } from 'pngjs';
import { decodeAll } from '../app/decoder.js';
import { rectangle, contained } from '../app/geometry.js';

export async function fixture() {
  const image = new PNG({ width: 1100, height: 760 }); image.data.fill(255);
  const entries = [
    { text: 'https://example.com/?a=1&b=2', x: 60, y: 130 },
    { text: '中文内容\n第二行 <script>alert(1)</script>', x: 380, y: 130 },
    { text: 'https://example.com/?a=1&b=2', x: 60, y: 450 }
  ];
  for (const item of entries) {
    const qr = PNG.sync.read(await QRCode.toBuffer(item.text, { width: 220, margin: 4 }));
    PNG.bitblt(qr, image, 0, 0, qr.width, qr.height, item.x, item.y);
  }
  return { image, entries };
}

test('multiple QR codes retain Unicode, newlines, markup, and duplicate strings at distinct locations', async () => {
  const { image, entries } = await fixture();
  const decoded = decodeAll(image);
  assert.equal(decoded.limited, false);
  assert.equal(decoded.results.length, 3);
  assert.deepEqual(decoded.results.map(x => x.text).sort(), entries.map(x => x.text).sort());
  assert.equal(decoded.results.filter(x => contained(x, { x: 40, y: 100, width: 250, height: 270 })).length, 1);
});

test('blank images and scan budgets are distinguished', () => {
  const data = new Uint8ClampedArray(100 * 100 * 4).fill(255);
  assert.deepEqual(decodeAll({ width: 100, height: 100, data }), { results: [], limited: false });
  assert.equal(decodeAll({ width: 100, height: 100, data }, { budgetMs: -1 }).limited, true);
});

test('inverted and rotated symbols decode', async () => {
  const qr = PNG.sync.read(await QRCode.toBuffer('inverted / 旋转', { width: 240 }));
  const rotated = new Uint8ClampedArray(qr.data.length);
  for (let y = 0; y < qr.height; y++) for (let x = 0; x < qr.width; x++) {
    const from = (y * qr.width + x) * 4;
    const to = (x * qr.width + qr.width - 1 - y) * 4;
    for (let c = 0; c < 3; c++) rotated[to + c] = 255 - qr.data[from + c];
    rotated[to + 3] = 255;
  }
  assert.equal(decodeAll({ ...qr, data: rotated }).results[0].text, 'inverted / 旋转');
});

test('reverse drags normalize; partial intersection is excluded', () => {
  assert.deepEqual(rectangle({ x: 60, y: 50 }, { x: 10, y: 20 }), { x: 10, y: 20, width: 50, height: 30 });
  const code = { x: 20, y: 20, width: 30, height: 30 };
  assert.equal(contained(code, null), true);
  assert.equal(contained(code, { x: 30, y: 30, width: 50, height: 50 }), false);
  assert.equal(contained(code, { x: 20, y: 20, width: 30, height: 30 }), true);
});
