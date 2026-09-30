import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from './server.mjs';

async function setup(t, enabled) {
  const directory = await mkdtemp(join(tmpdir(), 'dayward-lan-'));
  const server = createServer({ directory, apkDirectory: directory, lanTesting: enabled, publicOrigin: 'http://192.168.1.10:8790' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  return { directory, base: `http://127.0.0.1:${server.address().port}` };
}
test('test page and APK stay unavailable unless LAN mode is explicitly enabled', async t => {
  const { base } = await setup(t, false);
  for (const path of ['/test', '/test/status', '/test/dayward-debug.apk']) assert.equal((await fetch(base + path)).status, 404);
});
test('readiness distinguishes missing data and APK; downloads serve only the fixed package', async t => {
  const { base, directory } = await setup(t, true);
  const initial = await (await fetch(base + '/test/status')).json();
  assert.equal(initial.ready, false); assert.equal(initial.apk, null); assert.equal(initial.cities.length, 6);
  assert.ok(initial.cities.every(c => c.state === 'unavailable'));
  assert.equal((await fetch(base + '/test/dayward-debug.apk')).status, 503);
  const apk = Buffer.from('synthetic package for transport tests only');
  const sha256 = createHash('sha256').update(apk).digest('hex');
  await writeFile(join(directory, 'dayward-debug.apk'), apk);
  await writeFile(join(directory, 'build.json'), JSON.stringify({ bytes: apk.length, sha256 }));
  const status = await (await fetch(base + '/test/status')).json();
  assert.equal(status.apk.sha256, sha256);
  const response = await fetch(base + '/test/dayward-debug.apk');
  assert.equal(response.headers.get('content-type'), 'application/vnd.android.package-archive');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(Number(response.headers.get('content-length')), apk.length);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), apk);
  assert.equal((await fetch(base + '/test/build.json')).status, 404);
  assert.equal((await fetch(base + '/test/%2e%2e%2fbuild.json')).status, 404);
  const page = await fetch(base + '/test');
  assert.equal(page.status, 200); assert.match(page.headers.get('content-security-policy'), /script-src 'self'/);
});
