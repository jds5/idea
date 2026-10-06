// Only a complete web URL gets an open action; copying always preserves the raw text.
export function webUrl(text) {
  if (typeof text !== 'string') return null;
  const value = text.trim();
  if (!/^https?:\/\//i.test(value) || /[\s\u0000-\u001f\u007f]/u.test(value)) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname ? url.href : null;
  } catch {
    return null;
  }
}
