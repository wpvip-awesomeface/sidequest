// Stand-ins for node:crypto, which the Zero runner does not provide.
// Game IDs and dice rolls only; nothing here is security-sensitive.
export function randomInt(min, max) {
  if (max === undefined) { max = min; min = 0; }
  return min + Math.floor(Math.random() * (max - min));
}
export function randomUUID() {
  const h = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${h()}${h()}-${h()}-4${h().slice(1)}-${(8 + randomInt(4)).toString(16)}${h().slice(1)}-${h()}${h()}${h()}`;
}
export function createHash() {
  let data = '';
  const api = {
    update(value) { data += String(value); return api; },
    digest() {
      // Two FNV-1a passes give a stable 16-hex-char id for calendar occurrences.
      let a = 0x811c9dc5, b = 0x01000193;
      for (let i = 0; i < data.length; i++) {
        a = Math.imul(a ^ data.charCodeAt(i), 16777619) >>> 0;
        b = Math.imul(b ^ data.charCodeAt(data.length - 1 - i), 16777619) >>> 0;
      }
      return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
    },
  };
  return api;
}
