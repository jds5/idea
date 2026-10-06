export function rectangle(a, b) {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}

export function contained(code, region) {
  if (!region) return true;
  return code.x >= region.x && code.y >= region.y &&
    code.x + code.width <= region.x + region.width && code.y + code.height <= region.y + region.height;
}

export function sameLocation(a, b) {
  const overlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return overlap / Math.min(a.width * a.height, b.width * b.height) > 0.65;
}
