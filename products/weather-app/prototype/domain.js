(function (root) {
  'use strict';
  const DAY = 24 * 60 * 60 * 1000;
  const places = [
    { id: 'brighton', name: 'Brighton', region: 'East Sussex, UK', temp: 18, low: 13, wind: 19, rain: 15, desc: 'A little sun. A sea breeze.', tag: 'Coastal escape', x: 37, y: 72 },
    { id: 'lewes', name: 'Lewes', region: 'East Sussex, UK', temp: 20, low: 11, wind: 10, rain: 10, desc: 'Soft sunshine, calmer skies.', tag: 'Countryside walks', x: 60, y: 31 },
    { id: 'eastbourne', name: 'Eastbourne', region: 'East Sussex, UK', temp: 17, low: 12, wind: 23, rain: 20, desc: 'Clouds drifting along the coast.', tag: 'Clifftop views', x: 83, y: 63 },
  ];
  const profiles = { outdoors: { label: 'Outdoor time', min: 10, max: 28, rain: .2, wind: 20, gust: 30 }, cycling: { label: 'Leisure cycling', min: 8, max: 26, rain: .2, wind: 15, gust: 25 } };
  function classify(models, limits) {
    const complete = models.filter(m => m.hours.length && m.hours.every(h => ['temp', 'rain', 'wind', 'gust'].every(k => Number.isFinite(h[k]))));
    if (complete.length < 2) return { kind: 'unknown', label: 'Not enough data', supported: 0, total: complete.length };
    const supported = complete.filter(m => m.hours.every(h => h.temp >= limits.min && h.temp <= limits.max && h.rain <= limits.rain && h.wind <= limits.wind && h.gust <= limits.gust)).length;
    return { kind: supported === complete.length ? 'good' : supported === 0 ? 'poor' : 'mixed', label: supported === complete.length ? 'Fits your preferences' : supported === 0 ? 'Outside your preferences' : 'Forecasts disagree', supported, total: complete.length };
  }
  function scenario(placeId, day = 3, activity = 'outdoors', duration = 2, changed = false, customWind = 20) {
    const place = places.find(p => p.id === placeId) || places[0];
    const limits = activity === 'custom' ? { ...profiles.outdoors, wind: customWind } : (profiles[activity] || profiles.outdoors);
    const baseGust = place.id === 'brighton' ? [24, 27, 34] : [17, 18, 22];
    const models = ['ECMWF', 'GFS', 'ICON'].map((name, n) => ({ name, hours: Array.from({ length: duration }, (_, hour) => ({
      temp: place.temp + (n - 1) + (hour % 2),
      rain: day === 4 ? .4 + n * .1 : 0,
      wind: place.wind + (n - 1) * 3 + (changed && place.id === 'brighton' ? 12 : 0),
      gust: place.id === 'eastbourne' ? null : baseGust[n] + (changed && place.id === 'brighton' ? 12 : 0),
    })) }));
    const status = classify(models, limits);
    const reason = status.kind === 'unknown' ? 'Gust data is missing. We cannot recommend a window.' : day === 4 ? 'Rain exceeds your preference in every model.' : status.kind === 'mixed' ? 'The models disagree on wind. Check again before leaving.' : status.kind === 'poor' ? 'Wind exceeds your preference. Try a calmer place or another day.' : 'All three example models meet your rain, wind and temperature preferences.';
    return { ...status, place, models, limits, reason, window: `10:00–${10 + Number(duration)}:00` };
  }
  function hasAccess(grant, now = Date.now()) { return !!grant && Number.isFinite(grant.until) && grant.until > now; }
  function grantAccess(existing, reason, now = Date.now()) { return hasAccess(existing, now) ? existing : { reason, from: now, until: now + DAY }; }
  function makePlan(result, day, activity, kind = 'short', now = Date.now()) {
    return { id: `plan-${now}-${result.place.id}`, placeId: result.place.id, placeName: result.place.name, day, activity, duration: result.models[0].hours.length, wind: result.limits.wind, kind, window: kind === 'weekly' ? '19–25 October' : result.window, status: kind === 'weekly' ? 'Weekly outlook' : result.label, reason: kind === 'weekly' ? 'No clear advantage yet. Check again closer to your trip.' : result.reason, savedAt: now, baseline: result.kind };
  }
  const api = { DAY, places, profiles, classify, scenario, hasAccess, grantAccess, makePlan };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WeatherDemo = api;
})(typeof window !== 'undefined' ? window : this);
