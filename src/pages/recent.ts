/** Codes of designs saved in this browser, newest first. Only a convenience: the designs live on the server. */
const KEY = 'recent-designs'
export function recent(): string[] {
  try { const x: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(x) ? x.filter((c): c is string => typeof c === 'string' && /^[2-9A-Z]{8}$/.test(c)) : [] } catch { return [] }
}
export function remember(code: string) {
  try { localStorage.setItem(KEY, JSON.stringify([code, ...recent().filter((c) => c !== code)].slice(0, 8))) } catch { /* private mode */ }
}
