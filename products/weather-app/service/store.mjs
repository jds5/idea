import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { places, sources } from './catalog.mjs';

function pathFor(directory, id) {
  if (!places.some(p => p.id === id)) throw new Error('Unsupported place');
  return join(directory, `${id}.json`);
}
export async function readSnapshot(directory, id) {
  const item = JSON.parse(await readFile(pathFor(directory, id), 'utf8'));
  validateSnapshot(item, id);
  return item;
}
function validateSnapshot(item, id) {
  const numericOrNull = n => n === null || (typeof n === 'number' && Number.isFinite(n));
  if (item.schema !== 1 || item.place?.id !== id || item.place?.timezone !== places.find(p => p.id === id)?.timezone || !Number.isInteger(item.fetchedAt) ||
      typeof item.transform !== 'string' || item.product !== 'deterministic' || !['available', 'unavailable'].includes(item.alerts?.status) ||
      !Array.isArray(item.models) || item.models.length === 0 || new Set(item.models.map(m => m.id)).size !== item.models.length ||
      !item.models.every(m => sources.some(s => s.id === m.id && s.family === m.family) && typeof m.name === 'string' &&
        Array.isArray(m.hours) && m.hours.every((h, i) => Number.isInteger(h.start) && (!i || h.start === m.hours[i - 1].start + 3600) &&
          ['temperature', 'rain', 'wind', 'gust'].every(k => numericOrNull(h[k]))))) throw new Error('Invalid cached snapshot');
}
export async function publish(directory, snapshot) {
  const target = pathFor(directory, snapshot.place.id);
  validateSnapshot(snapshot, snapshot.place.id);
  await mkdir(directory, { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(snapshot), { flag: 'wx' });
    await rename(temporary, target);
  } finally { await unlink(temporary).catch(() => {}); }
}
