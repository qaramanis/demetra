/** Mixes the bits of a 32-bit integer (the last step of MurmurHash3). */
export function mix32(value: number): number {
  let h = value | 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** FNV-1a hash of a text, as an unsigned 32-bit integer. */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return mix32(h);
}

/** A number in [0, 1) that depends only on the text. The same text always gives the same number. */
export function seeded01(text: string): number {
  return hashString(text) / 4_294_967_296;
}

function latticeValue(ix: number, iy: number, seed: number): number {
  return mix32(Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iy, 0x165667b1) ^ seed) / 4_294_967_296;
}

const fade = (t: number): number => t * t * (3 - 2 * t);

/** Smooth noise in [0, 1). Points that are near to each other get similar values. */
export function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = fade(x - x0);
  const ty = fade(y - y0);
  const a = latticeValue(x0, y0, seed);
  const b = latticeValue(x0 + 1, y0, seed);
  const c = latticeValue(x0, y0 + 1, seed);
  const d = latticeValue(x0 + 1, y0 + 1, seed);
  const lower = a + (b - a) * tx;
  const upper = c + (d - c) * tx;
  return lower + (upper - lower) * ty;
}

/** Two layers of smooth noise: large shapes with smaller detail. The result is in [0, 1). */
export function fractalNoise(x: number, y: number, seed: number): number {
  const large = valueNoise(x, y, seed);
  const detail = valueNoise(x * 2.3 + 17.1, y * 2.3 - 9.4, seed ^ 0x9e3779b9);
  return (2 * large + detail) / 3;
}
