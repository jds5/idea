import { chromium } from 'playwright';
import { build } from 'esbuild';
import { mkdir, cp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';

// Test-only entry exposes the real action handler; only the test manifest grants hosts
// because automation cannot grant activeTab through a physical toolbar click.
await mkdir('artifacts/extension', { recursive: true });
await cp('dist', 'artifacts/extension', { recursive: true });
const manifest = JSON.parse(await readFile('dist/manifest.json', 'utf8'));
manifest.host_permissions = ['<all_urls>'];
await writeFile('artifacts/extension/manifest.json', JSON.stringify(manifest));
await build({ stdin: { contents: "import { scanTab } from './app/background.js'; globalThis.testScan = scanTab;", resolveDir: process.cwd() }, bundle: true, outfile: 'artifacts/extension/background.js', target: 'chrome109' });
// Open only the test build's shadow root so Playwright can inspect controls.
await build({ stdin: { contents: (await readFile('app/content.js', 'utf8')).replace("mode: 'closed'", "mode: 'open'"), resolveDir: resolve('app') }, bundle: true, outfile: 'artifacts/extension/content.js', target: 'chrome109' });
const values = ['https://example.com/?a=1&b=2', '中文内容\n第二行 <script>alert(1)</script>', 'https://example.com/?a=1&b=2'];
const pictures = await Promise.all(values.map(text => QRCode.toDataURL(text, { width: 220, margin: 4 })));
const html = `<!doctype html><meta charset="utf-8"><title>QR Lens fixture</title><style>body{margin:0;background:#f4f7fc;font-family:system-ui}h1{margin:25px 60px;color:#172844}img{position:absolute;width:220px;height:220px}button{position:absolute;top:710px;left:420px}</style><h1>QR Lens · 本地识别测试页</h1>${pictures.map((url, i) => `<img src="${url}" style="left:${i === 1 ? 380 : 60}px;top:${i === 2 ? 450 : 130}px">`).join('')}<button id="underlying" onclick="document.title='clicked'">背景页面按钮</button>`;
const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(req.url === '/empty' ? '<!doctype html><title>Empty</title><h1>No QR codes</h1>' : html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let context;
try {
  const extensionPath = resolve('artifacts/extension');
  context = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, viewport: { width: 1100, height: 760 }, args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`] });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
  const page = await context.newPage();
  await page.goto(origin); await page.bringToFront();
  // Existing pixels remain visible, but a newly inserted data: <img> would be blocked.
  await page.evaluate(() => {
    const policy = document.createElement('meta'); policy.httpEquiv = 'Content-Security-Policy'; policy.content = "img-src 'self'"; document.head.append(policy);
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const start = () => worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    await globalThis.testScan(tab);
  });
  await start();
  const overlay = page.locator('#qr-lens-overlay');
  const results = overlay.locator('textarea');
  await results.first().waitFor();
  assert.equal(await results.count(), 3);
  assert.deepEqual((await results.evaluateAll(items => items.map(x => x.value))).sort(), [...values].sort());
  assert.equal(await overlay.locator('canvas').evaluate(canvas => canvas.width), 1100);
  await page.screenshot({ path: 'artifacts/full.png' });
  await page.mouse.move(40, 110); await page.mouse.down(); await page.mouse.move(290, 370, { steps: 8 }); await page.mouse.up();
  assert.equal(await results.count(), 1);
  assert.equal(await results.first().inputValue(), values[0]);
  await overlay.getByRole('button', { name: '复制字符串', exact: true }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), values[0]);
  const selectionBefore = await overlay.locator('.selection').getAttribute('style');
  const textBox = await results.first().boundingBox();
  await page.mouse.move(textBox.x + 10, textBox.y + 15); await page.mouse.down();
  await page.mouse.move(textBox.x + 180, textBox.y + 40, { steps: 5 }); await page.mouse.up();
  assert.equal(await overlay.locator('.selection').getAttribute('style'), selectionBefore);
  assert.equal(await results.count(), 1);
  await page.screenshot({ path: 'artifacts/selection.png' });
  await overlay.getByRole('button', { name: '显示全部', exact: true }).click();
  assert.equal(await results.count(), 3);
  // Reverse drag, then a region without codes; the old results must not survive.
  await page.mouse.move(285, 690); await page.mouse.down(); await page.mouse.move(40, 430); await page.mouse.up();
  assert.equal(await results.count(), 1);
  await page.mouse.move(440, 460); await page.mouse.down(); await page.mouse.move(600, 620); await page.mouse.up();
  assert.equal(await results.count(), 0);
  assert.match(await overlay.locator('.empty').innerText(), /选区内没有/);
  await overlay.getByRole('button', { name: '键盘框选', exact: true }).click();
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Shift+ArrowRight'); await page.keyboard.press('Enter');
  assert.equal(await overlay.locator('.selection').isVisible(), true);
  await page.keyboard.press('Escape'); assert.equal(await overlay.count(), 0);
  // A second invocation closes rather than capturing its own overlay.
  await start(); assert.equal(await results.count(), 3); await start(); assert.equal(await overlay.count(), 0);
  await start(); await page.setViewportSize({ width: 1000, height: 700 });
  await overlay.waitFor({ state: 'detached' });
  assert.notEqual(await page.title(), 'clicked');
  await page.goto(`${origin}/empty`); await start();
  assert.equal(await results.count(), 0);
  assert.match(await overlay.locator('.empty').innerText(), /未识别到二维码/);
  await page.goto('chrome://version'); await start();
  const badge = await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return chrome.action.getBadgeText({ tabId: tab.id });
  });
  assert.equal(badge, '!');
  console.log(`PASS (${await context.browser().version()}): real extension screenshot/decode, multiple results, region filtering, clipboard, text-selection isolation, empty/reverse/keyboard selection, Escape, toggle, resize cleanup, empty page, restricted-page badge.`);
} finally {
  await context?.close(); server.close();
}
