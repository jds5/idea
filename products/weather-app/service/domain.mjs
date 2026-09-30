import { profiles, RULE_VERSION, CACHE_MAX_AGE } from './catalog.mjs';

export function cacheState(snapshot, now) {
  const age = now - snapshot.fetchedAt;
  return age < -300 || age > CACHE_MAX_AGE ? 'stale' : 'recent-fetch';
}
const valid = n => typeof n === 'number' && Number.isFinite(n);

export function evaluate(snapshot, { start, duration, profile }, now = Math.floor(Date.now() / 1000)) {
  if (!Number.isInteger(start) || start % 3600 !== 0 || !Number.isInteger(duration) || duration < 1 || duration > 6 || !profiles[profile]) {
    throw new Error('Choose an hourly start, 1–6 hours and a supported profile.');
  }
  const preference = profiles[profile];
  const reasons = [];
  const end = start + duration * 3600;
  if (start < now) reasons.push('This window has already started.');
  if (cacheState(snapshot, now) === 'stale') reasons.push('The saved source fetch is stale.');
  const models = snapshot.models.map(model => {
    const rows = Array.from({ length: duration }, (_, i) => model.hours.find(h => h.start === start + i * 3600));
    const complete = rows.every(h => h && ['temperature', 'rain', 'wind', 'gust'].every(k => valid(h[k])));
    const issues = [];
    if (!complete) issues.push('Some required hourly values are missing.');
    if (!model.nativeHourly) issues.push('Native hourly resolution is unverified.');
    if (!valid(model.runAt) || !valid(model.cycleHours) || model.cycleHours <= 0) issues.push('Forecast run time is unknown.');
    else if (model.runAt > now + 300 || now - model.runAt > (2 * model.cycleHours + 2) * 3600) issues.push('The forecast run is stale or invalid.');
    const limits = new Set();
    for (const h of rows.filter(Boolean)) {
      if (valid(h.temperature) && (h.temperature < preference.minTemp || h.temperature > preference.maxTemp)) limits.add('temperature');
      if (valid(h.rain) && h.rain > preference.rain) limits.add('rain');
      if (valid(h.wind) && h.wind > preference.wind) limits.add('wind');
      if (valid(h.gust) && h.gust > preference.gust) limits.add('gust');
    }
    const values = key => rows.filter(h => h && valid(h[key])).map(h => h[key]);
    const metric = (key, fn) => values(key).length === duration ? fn(values(key)) : null;
    return {
      id: model.id, family: model.family, name: model.name, eligible: issues.length === 0,
      issues, supports: complete ? limits.size === 0 : null, limits: [...limits],
      hours: rows.map(h => h ?? null),
      provenance: { runAt: model.runAt, cycleHours: model.cycleHours, nativeHourly: model.nativeHourly, credit: model.credit },
      metrics: {
        minTemp: metric('temperature', a => Math.min(...a)), maxTemp: metric('temperature', a => Math.max(...a)),
        rain: metric('rain', a => Math.round(a.reduce((x, y) => x + y, 0) * 100) / 100),
        wind: metric('wind', a => Math.max(...a)), gust: metric('gust', a => Math.max(...a))
      }
    };
  });
  const eligible = models.filter(m => m.eligible);
  if (new Set(eligible.map(m => m.family)).size !== eligible.length) reasons.push('Duplicate model families cannot count as independent forecasts.');
  if (new Set(eligible.map(m => m.family)).size < 2) reasons.push('Two traceable, complete hourly models are required for a recommendation.');
  if (snapshot.alerts.status !== 'available') reasons.push('Official warning coverage is not connected.');
  else if (snapshot.alerts.severe) reasons.push('An official severe warning affects this place.');
  let status = 'insufficient';
  if (!reasons.length) {
    const yes = eligible.filter(m => m.supports).length;
    status = yes === eligible.length ? 'fits' : yes === 0 ? 'outside' : 'mixed';
  }
  return {
    place: snapshot.place, start, end, duration, profile, preference, status, reasons, models,
    basis: { rule: RULE_VERSION, transform: snapshot.transform, product: snapshot.product, models: models.map(m => m.id).sort() },
    fetchedAt: snapshot.fetchedAt, evaluatedAt: now,
    attribution: snapshot.attribution ?? null, licenseUrl: snapshot.licenseUrl ?? null, grid: snapshot.grid ?? null
  };
}
