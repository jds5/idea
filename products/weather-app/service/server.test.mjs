import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from './server.mjs';
import { publish, readSnapshot } from './store.mjs';
import { fetchForecast } from './provider.mjs';
import { places, sources } from './catalog.mjs';

function cached(fetchedAt = 1) {
  return { schema: 1, place: places[0], fetchedAt, models: [{ ...sources[0], hours: [], runAt: null, cycleHours: null, nativeHourly: false }], alerts: { status: 'unavailable' }, product: 'deterministic', transform: 'test' };
}

test('gateway serves published snapshots independently, reports staleness, rejects invalid requests', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'dayward-'));
  const server = createServer({ directory, clock: () => 30000 });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base + '/v1/forecast?place=london')).status, 503);
  const snapshot = cached();
  await publish(directory, snapshot);
  assert.equal((await readSnapshot(directory, 'london')).fetchedAt, 1);
  const response = await fetch(base + '/v1/forecast?place=london'); assert.equal((await response.json()).cacheState, 'stale');
  assert.equal(response.headers.get('cache-control'), 'public, max-age=60');
  assert.equal((await fetch(base + '/v1/forecast?place=../../secret')).status, 400);
  assert.equal((await fetch(base + '/v1/window?place=london&start=36000&duration=99&profile=leisure')).status, 400);
  assert.equal((await fetch(base + '/health', { method: 'POST' })).status, 405);
  assert.equal((await fetch(base + '/missing')).status, 404);
  const a = await fetch(base + '/v1/window?place=london&start=36000&duration=2&profile=leisure');
  assert.equal(a.headers.get('cache-control'), 'no-store'); assert.equal((await a.json()).status, 'insufficient');
  await writeFile(join(directory, 'london.json'), '{broken');
  assert.equal((await fetch(base + '/v1/forecast?place=london')).status, 503);
});
test('a failed collection cannot replace the previous persisted snapshot', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'dayward-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await publish(directory, cached(100));
  await assert.rejects(async () => publish(directory, await fetchForecast(places[0], 'http://localhost:1', async () => { throw new Error('offline'); })));
  assert.equal((await readSnapshot(directory, 'london')).fetchedAt, 100);
  await assert.rejects(() => publish(directory, { ...cached(200), models: [] }));
  assert.equal((await readSnapshot(directory, 'london')).fetchedAt, 100);
  await assert.rejects(() => fetchForecast(places[0], 'https://api.open-meteo.com'));
});
