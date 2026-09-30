import { places } from './catalog.mjs';
import { fetchForecast } from './provider.mjs';
import { publish } from './store.mjs';

const ids = (process.env.PLACES || 'london').split(',');
if (ids.some(id => !places.some(p => p.id === id))) throw new Error('PLACES contains an unsupported ID');
const directory = process.env.DATA_DIR || new URL('./data/', import.meta.url).pathname.replace(/^\/(.:\/)/, '$1');
const interval = Number(process.env.COLLECT_INTERVAL_SECONDS || 0);
if (!Number.isFinite(interval) || (interval !== 0 && interval < 900)) throw new Error('Collection interval must be 0 (once) or at least 900 seconds');
async function collect() {
  let failures = 0;
  for (const id of [...new Set(ids)]) {
    try {
      const snapshot = await fetchForecast(places.find(p => p.id === id), process.env.SOURCE_URL || 'http://127.0.0.1:18089');
      await publish(directory, snapshot);
      console.log(JSON.stringify({ place: id, state: 'published', fetchedAt: snapshot.fetchedAt, hours: snapshot.models[0].hours.length }));
    } catch (error) {
      failures++;
      console.error(JSON.stringify({ place: id, state: 'kept-previous-snapshot', error: error.message }));
    }
  }
  return failures;
}
do {
  const failures = await collect();
  if (!interval) { process.exitCode = failures ? 1 : 0; break; }
  await new Promise(resolve => setTimeout(resolve, interval * 1000));
} while (true);
