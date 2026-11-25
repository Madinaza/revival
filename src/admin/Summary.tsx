import { money, type Kind } from '../api/client'
import { drivesAt, STATUS, useLoad, type Drive, type Status } from './shared'
import type { Paged } from '../api/client'

interface Report { weeks: { monday: string; requests: number; designs: number }[]; options: { kind: Kind; name: string; color: string | null; designs: number }[]; averageTotalCents: number | null }
const short = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00`))
const KIND: Partial<Record<Kind, string>> = { PAINT: 'Paint', FINISH: 'Finish', WHEELS: 'Wheels' }

export function Summary() {
  const report = useLoad<Report>('api/admin/report'), sum = useLoad<{ requests: Record<Status, number>; designs: number }>('api/admin/summary'), fresh = useLoad<Paged<Drive>>('api/admin/test-drives?status=NEW')
  const bad = report.error || sum.error || fresh.error, r = report.data, peak = Math.max(1, ...(r?.weeks.flatMap((w) => [w.requests, w.designs]) ?? []))
  const waiting = sum.data?.requests.NEW ?? 0
  return (
    <>
      {bad && <p className="bad" role="alert">{bad}</p>}
      <p className="lead">{waiting === 0 ? 'Nobody is waiting for an answer.' : waiting === 1 ? 'One request is waiting for an answer.' : `${waiting} requests are waiting for an answer.`}</p>
      {!!fresh.data?.items.length && <ul className="rows is-short">{fresh.data.items.slice(0, 5).map((d) => <li key={d.id}><a href={`#requests/${d.reference}`}><span className="who">{d.name}</span><span className="sub">{drivesAt(d)}</span></a></li>)}</ul>}
      {r && <>
        <section className="group"><h2>Last twelve weeks</h2>
          <div>
            <div className="bars" aria-hidden>{r.weeks.map((w) => <span key={w.monday}><i className="is-designs" style={{ height: `${(w.designs / peak) * 100}%` }} /><i className="is-requests" style={{ height: `${(w.requests / peak) * 100}%` }} /></span>)}</div>
            <div className="axis" aria-hidden><span>{short(r.weeks[0].monday)}</span><span>{short(r.weeks.at(-1)!.monday)}</span></div>
            <p className="key"><span><i className="is-designs" />Saved designs</span><span><i className="is-requests" />Requests</span><span className="sub">Tallest bar: {peak}</span></p>
            <details><summary>Show the numbers</summary><div className="wide"><table className="slim"><thead><tr><th>Week from</th><th className="num">Designs</th><th className="num">Requests</th></tr></thead><tbody>{[...r.weeks].reverse().map((w) => <tr key={w.monday}><td>{short(w.monday)}</td><td className="num">{w.designs}</td><td className="num">{w.requests}</td></tr>)}</tbody></table></div></details>
          </div>
        </section>
        <section className="group"><h2>What people choose</h2>
          <div className="picks">{(Object.keys(KIND) as Kind[]).map((k) => { const of = r.options.filter((o) => o.kind === k), top = Math.max(1, ...of.map((o) => o.designs)); return (
            <section key={k}><h3>{KIND[k]}</h3><ul>{of.map((o) => <li key={o.name}><span>{o.name}</span><span className="num">{o.designs}</span><i style={{ width: `${(o.designs / top) * 100}%`, background: o.color ?? 'var(--ink)' }} aria-hidden /></li>)}</ul></section>
          ) })}</div>
        </section>
        <section className="group"><h2>In total</h2>
          <dl className="totals"><div><dt>Saved designs</dt><dd>{sum.data?.designs ?? 0}</dd></div>{(Object.keys(STATUS) as Status[]).map((s) => <div key={s}><dt>{STATUS[s]} requests</dt><dd>{sum.data?.requests[s] ?? 0}</dd></div>)}<div><dt>Average design</dt><dd>{r.averageTotalCents === null ? 'None yet' : money(r.averageTotalCents)}</dd></div></dl>
        </section>
      </>}
    </>
  )
}
