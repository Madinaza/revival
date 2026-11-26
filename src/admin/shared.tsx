import { useCallback, useEffect, useState } from 'react'
import { call, Problem, type Design, type Paged } from '../api/client'

export type Status = 'NEW' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
export const STATUS: Record<Status, string> = { NEW: 'New', CONFIRMED: 'Confirmed', COMPLETED: 'Completed', CANCELLED: 'Cancelled' }
export interface Drive {
  id: number; reference: string; name: string; email: string; phone: string | null; preferredDate: string | null; slotAt: string | null; message: string | null
  designCode: string | null; status: Status; staffNote: string | null; version: number; createdAt: string; updatedAt: string
}
/** A session that ended is reported once, and the sign-in sheet opens over whatever was being edited. */
export const signedOut = new EventTarget()
export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  try { return await call<T>(method, path, body) } catch (e) {
    // With its cookies gone, a write is turned away as 403 before anyone asks who is signed in.
    const gone = e instanceof Problem && (e.status === 401 || (e.status === 403 && !(await call<{ username: string | null }>('GET', 'api/session').catch(() => null))?.username))
    if (gone) { signedOut.dispatchEvent(new Event('out')); throw new Problem(401, 'Your session ended. Sign in and try again.') }
    throw e
  }
}
export const message = (e: unknown) => (e instanceof Problem ? Object.values(e.fields)[0] ?? e.message : 'That did not work. Try again.')
export function useLoad<T>(path: string) {
  const [data, setData] = useState<T | null>(null), [error, setError] = useState(''), [n, setN] = useState(0)
  useEffect(() => {
    let on = true
    api<T>('GET', path).then((d) => { if (on) { setData(d); setError('') } }, (e) => { if (on) setError(message(e)) })
    return () => { on = false }
  }, [path, n])
  useEffect(() => { const f = () => setN((x) => x + 1); signedOut.addEventListener('in', f); return () => signedOut.removeEventListener('in', f) }, [])
  return { data, error, setData, reload: useCallback(() => setN((x) => x + 1), []) }
}
const D = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), T = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
export const day = (iso: string) => D.format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso))
export const moment = (iso: string) => T.format(new Date(iso))
const S = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })
export const drivesAt = (d: Pick<Drive, 'slotAt' | 'preferredDate'>) => (d.slotAt ? S.format(new Date(d.slotAt)) : d.preferredDate ? `${day(d.preferredDate)}, no time` : '')
export function Pager({ of, go }: { of: Paged<unknown>; go: (page: number) => void }) {
  const last = Math.max(0, Math.ceil(of.total / of.size) - 1)
  if (!last) return null
  return <nav className="pager" aria-label="Pages"><button disabled={of.page === 0} onClick={() => go(of.page - 1)}>Newer</button><span>{of.page + 1} of {last + 1}</span><button disabled={of.page >= last} onClick={() => go(of.page + 1)}>Older</button></nav>
}
export function Specimen({ d }: { d: Design }) {
  return (
    <span className="specimen">
      <i style={{ background: d.paint.color ?? '#888' }} aria-hidden /><i style={{ background: d.wheels.color ?? '#888' }} aria-hidden className="is-wheel" />
      <span>{d.paint.name}, {d.finish.name.toLowerCase()}, {d.wheels.name.toLowerCase()} wheels</span>
    </span>
  )
}
export const open3d = (code: string) => `./?design=${code}`
