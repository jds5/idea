import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { places } from './catalog.mjs';
import { readSnapshot } from './store.mjs';
import { cacheState } from './domain.mjs';

const page = new URL('../website/device-test.html', import.meta.url);
const script = new URL('../website/device-test.js', import.meta.url);
const css = new URL('../website/device-test.css', import.meta.url);
export async function handleLanRequest(path, res, { directory, apkDirectory, publicOrigin, clock }) {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
  const json = (status, body) => { res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
  if (path === '/test/status') {
    const cities = await Promise.all(places.map(async p => {
      try {
        const s = await readSnapshot(directory, p.id);
        return { id: p.id, name: p.name, state: cacheState(s, clock()), fetchedAt: s.fetchedAt, futureHours: Math.min(...s.models.map(m => m.hours.filter(h => h.start > clock()).length)) };
      } catch { return { id: p.id, name: p.name, state: 'unavailable', futureHours: 0 }; }
    }));
    let apk = null;
    try {
      const metadata = JSON.parse(await readFile(join(apkDirectory, 'build.json'), 'utf8'));
      const file = await stat(join(apkDirectory, 'dayward-debug.apk'));
      if (metadata.bytes === file.size && /^[a-f0-9]{64}$/i.test(metadata.sha256)) apk = metadata;
    } catch { /* Deployment page remains useful while the build is being prepared. */ }
    json(200, { serverTime: clock(), origin: publicOrigin, apk, cities, ready: cities.every(c => c.state === 'recent-fetch' && c.futureHours >= 2) });
    return true;
  }
  if (path === '/test/dayward-debug.apk') {
    const file = join(apkDirectory, 'dayward-debug.apk');
    let size;
    try { size = (await stat(file)).size; } catch { json(503, { error: 'APK is not prepared yet.' }); return true; }
    res.writeHead(200, { ...headers, 'Content-Type': 'application/vnd.android.package-archive', 'Content-Length': size, 'Content-Disposition': 'attachment; filename="dayward-debug.apk"' });
    try { await pipeline(createReadStream(file), res); } catch { res.destroy(); }
    return true;
  }
  const assets = { '/test': [page, 'text/html'], '/test/': [page, 'text/html'], '/test/client.js': [script, 'text/javascript'], '/test/style.css': [css, 'text/css'] };
  if (!assets[path]) return false;
  const [file, type] = assets[path];
  const body = await readFile(file);
  res.writeHead(200, { ...headers, 'Content-Type': `${type}; charset=utf-8`, 'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'" });
  res.end(body);
  return true;
}
