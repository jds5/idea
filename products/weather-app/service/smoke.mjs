// Read-only real-gateway check. It never substitutes test data or calls a public weather API.
const base = process.argv[2] || 'http://127.0.0.1:8787';
async function get(path) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}
const catalog = await get('/v1/catalog');
const results = [];
for (const place of catalog.places) {
  const snapshot = await get(`/v1/forecast?place=${place.id}`);
  const now = Math.floor(Date.now() / 1000);
  const first = snapshot.models[0].hours.find(h => h.start > now);
  if (!first) throw new Error(`${place.id}: no future window`);
  const assessment = await get(`/v1/window?place=${place.id}&start=${first.start}&duration=2&profile=leisure`);
  if (assessment.status !== 'insufficient' || snapshot.models.some(m => m.runAt !== null || m.nativeHourly !== false)) throw new Error('Unverified provenance was incorrectly promoted to a recommendation.');
  if (!assessment.models.every(m => m.hours?.length === 2)) throw new Error('Selected-hour baseline records were not retained.');
  results.push({ place: place.id, cacheState: snapshot.cacheState, fetchedAt: snapshot.fetchedAt,
    models: snapshot.models.map(m => ({ id: m.id, hours: m.hours.length, completeHours: m.hours.filter(h => ['temperature', 'rain', 'wind', 'gust'].every(k => h[k] !== null)).length })),
    assessment: assessment.status, retainedHourlyBaseline: assessment.models.every(m => m.hours?.length === 2) });
}
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), gateway: base, results }, null, 2));
