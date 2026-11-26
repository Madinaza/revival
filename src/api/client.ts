/** Only a build made with VITE_API=1 talks to the Java API. The GitHub Pages build never does. */
export const API = import.meta.env.VITE_API === '1'

export type Kind = 'BASE' | 'PAINT' | 'FINISH' | 'WHEELS'
export interface OptionItem {
  id: number; kind: Kind; code: string; name: string; priceCents: number; color: string | null
  metalness: number | null; roughness: number | null; clearcoat: number | null; active: boolean; position: number; version: number
}
export type Catalog = Record<Kind, OptionItem[]>
export interface Design { code: string; paint: OptionItem; finish: OptionItem; wheels: OptionItem; headlights: boolean; taillights: boolean; totalCents: number; createdAt: string }
export interface Paged<T> { items: T[]; page: number; size: number; total: number }

export class Problem extends Error {
  constructor(readonly status: number, message: string, readonly fields: Record<string, string> = {}) { super(message) }
}
export async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = /(?:^|; )XSRF-TOKEN=([^;]+)/.exec(document.cookie)?.[1], form = body instanceof URLSearchParams
  let r: Response
  try {
    r = await fetch(path, {
      method, credentials: 'same-origin',
      headers: { ...(body !== undefined && !form && { 'content-type': 'application/json' }), ...(token && method !== 'GET' && { 'X-XSRF-TOKEN': decodeURIComponent(token) }) },
      body: body === undefined ? undefined : form ? body : JSON.stringify(body),
    })
  } catch { throw new Problem(0, 'The studio cannot be reached right now. Check your connection and try again.') }
  if (r.ok) return (r.status === 204 ? undefined : await r.json()) as T
  const p = (await r.json().catch(() => ({}))) as { detail?: string; fields?: Record<string, string> }
  throw new Problem(r.status, p.detail ?? (r.status >= 500 ? 'Something failed on our side. Try again in a moment.' : 'That did not work. Try again.'), p.fields)
}
const eur = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
export const money = (cents: number) => eur.format(cents / 100)
