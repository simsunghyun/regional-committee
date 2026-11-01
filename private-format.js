export const CHUNK_SIZE = 512 * 1024;
export const fileId = path => encodeURIComponent(path);
export function parseData(text) {
  const match = text.match(/^window\.(REGION_DATA|MINISTRY_INDEX|REGION_SOURCES)\s*=([\s\S]*);\s*$/);
  if (match) return JSON.parse(match[2]);
  const packet = text.match(/^window\.REGION_PROJECT\(([\s\S]*)\);\s*$/);
  if (packet) return JSON.parse(packet[1]);
  throw Error('자료 형식을 확인할 수 없습니다.');
}
export function toBase64(bytes) {
  let value = '';
  for (let i = 0; i < bytes.length; i += 8192) value += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(value);
}
export const fromBase64 = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
export async function digest(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
}
