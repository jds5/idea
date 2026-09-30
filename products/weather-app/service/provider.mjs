import { sources, TRANSFORM_VERSION } from './catalog.mjs';

const value = v => typeof v === 'number' && Number.isFinite(v) ? v : null;
export function normalize(raw, place, fetchedAt) {
  const h = raw.hourly;
  if (!h || !Array.isArray(h.time) || h.time.length < 2 || h.time.some((t, i) => !Number.isInteger(t) || (i && t !== h.time[i - 1] + 3600))) {
    throw new Error('Provider returned invalid or discontinuous hourly timestamps.');
  }
  for (const s of sources) for (const [variable, unit] of Object.entries({ temperature_2m: '°C', precipitation: 'mm', wind_speed_10m: 'km/h', wind_gusts_10m: 'km/h' })) {
    const key = `${variable}_${s.id}`;
    if (!Array.isArray(h[key]) || h[key].length !== h.time.length || raw.hourly_units?.[key] !== unit) throw new Error(`Provider schema or units changed: ${key}`);
  }
  const models = sources.map(s => ({
    ...s, runAt: null, cycleHours: null, nativeHourly: false,
    provenance: 'Stitched series; per-point model run and native step are not supplied by this adapter.',
    hours: h.time.slice(0, -1).map((start, i) => ({
      start, temperature: value(h[`temperature_2m_${s.id}`][i]),
      // Open-Meteo rain and gust describe the preceding hour. Align t+1 with [t,t+1).
      rain: value(h[`precipitation_${s.id}`][i + 1]),
      wind: value(h[`wind_speed_10m_${s.id}`][i]), gust: value(h[`wind_gusts_10m_${s.id}`][i + 1])
    }))
  }));
  if (models.every(m => m.hours.every(h => h.temperature === null))) throw new Error('Provider returned no temperature data.');
  return {
    schema: 1, product: 'deterministic', transform: TRANSFORM_VERSION, place, fetchedAt,
    grid: { latitude: raw.latitude, longitude: raw.longitude, elevation: raw.elevation },
    alerts: { status: 'unavailable', severe: null }, models,
    attribution: 'Weather data: NOAA, DWD; processed by Open-Meteo (CC BY 4.0). Forecasts, not observations.',
    licenseUrl: 'https://open-meteo.com/en/license',
    intervalNote: 'Temperature/wind are samples at the start; rain total/gust maximum cover the following hour. Interpolation and source-run provenance are unverified.'
  };
}

export async function fetchForecast(place, base, fetcher = fetch) {
  const url = new URL('/v1/forecast', base);
  // This worker must target the operator's self-hosted query service.
  if (url.hostname === 'open-meteo.com' || url.hostname.endsWith('.open-meteo.com')) throw new Error('Use a self-hosted source; the public free API is not a commercial production dependency.');
  url.search = new URLSearchParams({ latitude: place.latitude, longitude: place.longitude, timezone: 'UTC', timeformat: 'unixtime', forecast_days: '3', models: sources.map(s => s.id).join(','), hourly: 'temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m', temperature_unit: 'celsius', wind_speed_unit: 'kmh', precipitation_unit: 'mm' });
  const response = await fetcher(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`Weather source returned HTTP ${response.status}`);
  return normalize(await response.json(), place, Math.floor(Date.now() / 1000));
}
