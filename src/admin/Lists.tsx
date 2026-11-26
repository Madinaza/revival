import { useState } from 'react'
import { money, type Design, type Paged } from '../api/client'
import { moment, open3d, Pager, Specimen, useLoad } from './shared'

export function Designs() {
  const [page, setPage] = useState(0), { data, error } = useLoad<Paged<Design>>(`api/admin/designs?page=${page}`)
  return (
    <>
      {error && <p className="bad" role="alert">{error}</p>}
      {data && !data.items.length && <p className="empty">No designs yet. They appear here when a visitor saves a car.</p>}
      {!!data?.items.length && <div className="wide"><table>
        <thead><tr><th>Code</th><th>Car</th><th className="num">Total when saved</th><th>Saved</th><th><span className="hush">Open</span></th></tr></thead>
        <tbody>{data.items.map((d) => <tr key={d.code}><td className="code">{d.code}</td><td><Specimen d={d} /></td><td className="num">{money(d.totalCents)}</td><td>{moment(d.createdAt)}</td><td><a href={open3d(d.code)} target="_blank" rel="noreferrer" aria-label={`See ${d.code} in 3D`}>See it in 3D</a></td></tr>)}</tbody>
      </table></div>}
      {data && <Pager of={data} go={setPage} />}
    </>
  )
}
interface Entry { at: string; actor: string; action: string; subject: string; detail: string }
const ACTION: Record<string, string> = { 'request.handled': 'handled', 'option.changed': 'changed', 'option.created': 'added' }
export function History() {
  const [page, setPage] = useState(0), { data, error } = useLoad<Paged<Entry>>(`api/admin/audit?page=${page}`)
  return (
    <>
      {error && <p className="bad" role="alert">{error}</p>}
      {data && !data.items.length && <p className="empty">Nothing yet. Every change made at the front desk is written down here.</p>}
      <ol className="log">{data?.items.map((e, i) => <li key={i}><time dateTime={e.at}>{moment(e.at)}</time><p><strong>{e.actor}</strong> {ACTION[e.action] ?? e.action} {e.subject.replace(/^[A-Z]+(?= )/, (k) => k.toLowerCase())}</p><p className="sub">{e.detail}</p></li>)}</ol>
      {data && <Pager of={data} go={setPage} />}
    </>
  )
}
