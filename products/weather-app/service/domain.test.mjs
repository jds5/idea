import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, cacheState } from './domain.mjs';
import { normalize } from './provider.mjs';
import { places, sources } from './catalog.mjs';

const start = 1790812800; // deterministic fixture; never shown as real current weather
const now = start - 3600;
export function snapshot() {
  return { schema: 1, place: places[0], product: 'deterministic', transform: 'test-v1', fetchedAt: now, alerts: { status: 'available', severe: false }, models: sources.map(s => ({ ...s, runAt: now - 3600, cycleHours: 6, nativeHourly: true, hours: Array.from({ length: 6 }, (_, i) => ({ start: start + i * 3600, temperature: 18, rain: 0, wind: 10, gust: 15 })) })) };
}
const options = { start, duration: 2, profile: 'leisure' };
test('two complete independent models can fit; comparisons retain a versioned basis', () => {
  const a = evaluate(snapshot(), options, now);
  assert.equal(a.status, 'fits'); assert.equal(a.models.length, 2); assert.equal(a.basis.rule, 'window-v1');
});
test('threshold disagreement is mixed, not a probability', () => {
  const s = snapshot(); s.models[1].hours[0].wind = 25;
  const a = evaluate(s, options, now); assert.equal(a.status, 'mixed'); assert.deepEqual(a.models[1].limits, ['wind']);
});
test('all models outside the threshold do not fit', () => {
  const s = snapshot(); s.models.forEach(m => m.hours[0].rain = 2); assert.equal(evaluate(s, options, now).status, 'outside');
});
test('null gust disqualifies a model and is not treated as calm', () => {
  const s = snapshot(); s.models[0].hours[0].gust = null; const a = evaluate(s, options, now);
  assert.equal(a.status, 'insufficient'); assert.equal(a.models[0].metrics.gust, null); assert.equal(a.models[0].supports, null);
});
test('unverified native steps and run times cannot recommend', () => {
  const s = snapshot(); s.models[0].runAt = null; s.models[1].nativeHourly = false;
  assert.equal(evaluate(s, options, now).status, 'insufficient');
});
test('stale source run or stale collection cannot recommend', () => {
  const s = snapshot(); s.models[0].runAt = now - 15 * 3600;
  assert.equal(evaluate(s, options, now).status, 'insufficient');
  s.fetchedAt = now - 7 * 3600; assert.equal(cacheState(s, now), 'stale');
});
test('duplicated upstream family does not count as two models', () => {
  const s = snapshot(); s.models[1].family = s.models[0].family;
  assert.equal(evaluate(s, options, now).status, 'insufficient');
});
test('missing absolute hour cannot be bridged, including DST transitions', () => {
  const s = snapshot(); s.models.forEach(m => m.hours.splice(1, 1));
  assert.equal(evaluate(s, options, now).status, 'insufficient');
  assert.equal(evaluate(snapshot(), options, now).end - start, 7200);
});
test('past windows do not recommend and invalid inputs reject', () => {
  assert.equal(evaluate(snapshot(), options, start + 1).status, 'insufficient');
  for (const invalid of [{ duration: 0 }, { duration: 2.5 }, { duration: 7 }, { start: start + 1 }, { profile: 'unknown' }]) assert.throws(() => evaluate(snapshot(), { ...options, ...invalid }, now));
});
test('official warning unknown and severe both block positive advice', () => {
  const s = snapshot(); s.alerts.status = 'unavailable'; assert.equal(evaluate(s, options, now).status, 'insufficient');
  s.alerts = { status: 'available', severe: true }; assert.equal(evaluate(s, options, now).status, 'insufficient');
});
function raw() {
  const hourly = { time: [start, start + 3600, start + 7200] }, hourly_units = {};
  for (const s of sources) for (const [v, unit] of Object.entries({ temperature_2m: '°C', precipitation: 'mm', wind_speed_10m: 'km/h', wind_gusts_10m: 'km/h' })) {
    hourly[`${v}_${s.id}`] = [1, 2, null]; hourly_units[`${v}_${s.id}`] = unit;
  }
  return { hourly, hourly_units, latitude: 51.5, longitude: 0, elevation: 10 };
}
test('normalization aligns preceding-hour rain/gust to following interval and preserves nulls', () => {
  const result = normalize(raw(), places[0], now); const h = result.models[0].hours;
  assert.equal(h.length, 2); assert.equal(h[0].temperature, 1); assert.equal(h[0].rain, 2); assert.equal(h[0].gust, 2); assert.equal(h[1].rain, null);
  assert.equal(result.models[0].runAt, null); assert.equal(result.models[0].nativeHourly, false);
});
test('unit changes and discontinuous source time fail closed', () => {
  const r = raw(); r.hourly_units.temperature_2m_gfs_global = '°F'; assert.throws(() => normalize(r, places[0], now));
  const r2 = raw(); r2.hourly.time[1] += 3600; assert.throws(() => normalize(r2, places[0], now));
});
