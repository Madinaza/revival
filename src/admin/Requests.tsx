import { useEffect, useState } from 'react'
import { call, money, Problem, type Design, type Paged } from '../api/client'
import { api, day, message, moment, open3d, Pager, Specimen, STATUS, useLoad, type Drive, type Status } from './shared'

const NEXT: Record<Status, readonly [Status, string][]> = {
  NEW: [['CONFIRMED', 'Confirm'], ['CANCELLED', 'Cancel request']], CONFIRMED: [['COMPLETED', 'Mark as completed'], ['CANCELLED', 'Cancel request']], CANCELLED: [['NEW', 'Reopen']], COMPLETED: [],
}
export function Requests() {
  const [status, setStatus] = useState<Status | ''>(''), [typed, setTyped] = useState(''), [q, setQ] = useState(''), [page, setPage] = useState(0), [id, setId] = useState<number | null>(null)
  useEffect(() => { const t = setTimeout(() => { setQ(typed); setPage(0) }, 250); return () => clearTimeout(t) }, [typed])
  const sum = useLoad<{ requests: Record<Status, number>; designs: number }>('api/admin/summary')
  const list = useLoad<Paged<Drive>>(`api/admin/test-drives?page=${page}${status && `&status=${status}`}${q && `&q=${encodeURIComponent(q)}`}`)
  const open = list.data?.items.find((d) => d.id === id) ?? null
  const all = sum.data ? Object.values(sum.data.requests).reduce((a, b) => a + b, 0) : null
  const tab = (k: Status | '', label: string, n: number | null) => <button key={k} aria-pressed={status === k} onClick={() => { setStatus(k); setPage(0) }}><strong>{n ?? '·'}</strong>{label}</button>
  return (
    <>
      <div className="tabs" role="group" aria-label="Filter by status">{tab('', 'All', all)}{(Object.keys(STATUS) as Status[]).map((k) => tab(k, STATUS[k], sum.data?.requests[k] ?? null))}</div>
      <label className="search"><span>Search name, email or reference</span><input type="search" value={typed} onChange={(e) => setTyped(e.target.value)} /></label>
      {list.error && <p className="bad" role="alert">{list.error}</p>}
      <div className={`split ${open ? 'has-open' : ''}`}>
        <div>
          {list.data && !list.data.items.length && <p className="empty">{q || status ? 'Nothing matches. Clear the search or choose another status.' : 'No requests yet. They appear here when a visitor asks for a test drive.'}</p>}
          <ul className="rows">{list.data?.items.map((d) => (
            <li key={d.id}><button aria-current={d.id === id || undefined} onClick={() => setId(d.id)}>
              <span className="who">{d.name}</span><span className={`mark is-${d.status.toLowerCase()}`}>{STATUS[d.status]}</span>
              <span className="sub">Wants {day(d.preferredDate)}</span><span className="sub">{moment(d.createdAt)}</span>
            </button></li>
          ))}</ul>
          {list.data && <Pager of={list.data} go={setPage} />}
        </div>
        {open && <Detail key={open.id} drive={open} onClose={() => setId(null)} onChange={(d) => { list.setData((l) => l && { ...l, items: l.items.map((x) => (x.id === d.id ? d : x)) }); sum.reload() }} onReload={list.reload} />}
      </div>
    </>
  )
}
function Detail({ drive, onClose, onChange, onReload }: { drive: Drive; onClose: () => void; onChange: (d: Drive) => void; onReload: () => void }) {
  const [note, setNote] = useState(drive.staffNote ?? ''), [said, setSaid] = useState<{ bad: boolean; text: string } | null>(null), [stale, setStale] = useState(false), [busy, setBusy] = useState(false), [design, setDesign] = useState<Design | null>(null)
  useEffect(() => { if (drive.designCode) call<Design>('GET', `api/designs/${drive.designCode}`).then(setDesign, () => {}) }, [drive.designCode])
  const put = async (status: Status) => {
    setBusy(true); setSaid(null)
    try { onChange(await api<Drive>('PATCH', `api/admin/test-drives/${drive.id}`, { status, staffNote: note, version: drive.version })); setStale(false); setSaid({ bad: false, text: status === drive.status ? 'Note saved.' : `${STATUS[status]}.` }) }
    catch (e) { setStale(e instanceof Problem && e.status === 409); setSaid({ bad: true, text: message(e) }) } finally { setBusy(false) }
  }
  return (
    <article className="detail" aria-label={`Request ${drive.reference}`}>
      <button className="back" onClick={onClose}>Close</button>
      <h2>{drive.name}</h2>
      <p><span className={`mark is-${drive.status.toLowerCase()}`}>{STATUS[drive.status]}</span> <span className="sub">Reference {drive.reference}, received {moment(drive.createdAt)}</span></p>
      <dl><div><dt>Preferred date</dt><dd>{day(drive.preferredDate)}</dd></div><div><dt>Email</dt><dd><a href={`mailto:${drive.email}`}>{drive.email}</a></dd></div>{drive.phone && <div><dt>Phone</dt><dd><a href={`tel:${drive.phone.replace(/[^+\d]/g, '')}`}>{drive.phone}</a></dd></div>}</dl>
      {drive.message && <blockquote>{drive.message}</blockquote>}
      {design && <p className="car"><Specimen d={design} /><span>{money(design.totalCents)}</span><a href={open3d(design.code)} target="_blank" rel="noreferrer">See it in 3D</a></p>}
      <label className="area"><span>Staff note</span><textarea rows={4} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <div className="acts">
        {NEXT[drive.status].map(([s, label], i) => <button key={s} className={i ? 'act is-plain' : 'act'} disabled={busy} onClick={() => void put(s)}>{label}</button>)}
        <button className="act is-plain" disabled={busy || note === (drive.staffNote ?? '')} onClick={() => void put(drive.status)}>Save note</button>
      </div>
      <p className={said?.bad ? 'bad' : 'good'} role="status">{said?.text}{stale && <> <button className="inline" onClick={() => { setStale(false); setSaid(null); onReload() }}>Reload request</button></>}</p>
    </article>
  )
}
