import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { places, profiles } from './catalog.mjs';
import { readSnapshot } from './store.mjs';
import { evaluate, cacheState } from './domain.mjs';
import { handleLanRequest } from './lan-testing.mjs';

const website = new URL('../website/', import.meta.url);
const staticFiles = { '/': ['index.html', 'text/html'], '/styles.css': ['styles.css', 'text/css'], '/privacy': ['privacy.html', 'text/html'], '/sources': ['sources.html', 'text/html'], '/mark.svg': ['mark.svg', 'image/svg+xml'] };
export function createServer({ directory = fileURLToPath(new URL('./data/', import.meta.url)), clock = () => Math.floor(Date.now() / 1000), lanTesting = false, apkDirectory, publicOrigin } = {}) {
  return http.createServer(async (req, res) => {
    const json = (status, payload, maxAge = 0) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': maxAge ? `public, max-age=${maxAge}` : 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(JSON.stringify(payload));
    };
    try {
      if (req.method !== 'GET') return json(405, { error: 'Only GET is supported.' });
      const url = new URL(req.url, 'http://localhost');
      if (lanTesting && (url.pathname === '/test' || url.pathname.startsWith('/test/')) && await handleLanRequest(url.pathname, res, { directory, clock, apkDirectory, publicOrigin })) return;
      if (staticFiles[url.pathname]) {
        const [file, type] = staticFiles[url.pathname];
        const body = await readFile(new URL(file, website));
        res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'public, max-age=300', 'Content-Security-Policy': "default-src 'self'; style-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'", 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
        return res.end(body);
      }
      if (url.pathname === '/health') return json(200, { status: 'ok', scope: 'gateway-process-only' });
      if (url.pathname === '/v1/catalog') return json(200, { places, profiles, scope: 'Internal build: fixed city samples, manual plans, no automatic recommendations, warnings or weekly outlook.' }, 300);
      if (!['/v1/forecast', '/v1/window'].includes(url.pathname)) return json(404, { error: 'Not found' });
      const id = url.searchParams.get('place');
      if (!places.some(p => p.id === id)) return json(400, { error: 'Choose a supported place.' });
      let snapshot;
      try { snapshot = await readSnapshot(directory, id); }
      catch { return json(503, { error: 'Forecast has not been collected, or the stored snapshot is unavailable. Try again after collection.', place: id }); }
      if (url.pathname === '/v1/forecast') return json(200, { ...snapshot, cacheState: cacheState(snapshot, clock()), servedAt: clock() }, 60);
      const options = { start: Number(url.searchParams.get('start')), duration: Number(url.searchParams.get('duration')), profile: url.searchParams.get('profile') };
      let assessment;
      try { assessment = evaluate(snapshot, options, clock()); }
      catch (error) { return json(400, { error: error.message }); }
      return json(200, assessment); // Windows depend on now; do not cache evaluations.
    } catch { return json(500, { error: 'The gateway could not complete this request.' }); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createServer({ directory: process.env.DATA_DIR || undefined, lanTesting: process.env.LAN_TESTING === '1', apkDirectory: process.env.APK_DIR, publicOrigin: process.env.PUBLIC_ORIGIN });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  server.listen(Number(process.env.PORT || 8787), process.env.HOST || '127.0.0.1', () => console.log('Dayward gateway ready'));
}
