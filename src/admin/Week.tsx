import { useState } from 'react'
import { placeOf } from '../booking/Slots'
import { api, message, STATUS, useLoad, type Status } from './shared'

interface Slot { startsAt: string; time: string; open: boolean; booked: boolean; past: boolean }
interface Data { zone: string; days: { date: string; slots: Slot[] }[] }
interface Booked { slotAt: string; id: number; reference: string; name: string; status: Status }
interface Hour { weekday: number; at: string }
const add = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...o }).format(new Date(`${iso}T12:00:00Z`))
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function Week() {
  const [from, setFrom] = useState(''), [note, setNote] = useState(''), [hours, setHours] = useState(false)
  const week = useLoad<Data>(`api/admin/calendar${from && `?from=${from}`}`), monday = week.data?.days[0].date
  const who = useLoad<Booked[]>(`api/admin/bookings?from=${monday ? add(monday, -1) : '2000-01-01'}T00:00:00Z`)
  const toggle = async (s: Slot) => {
    setNote('')
    try { await api('PUT', 'api/admin/calendar', { startsAt: s.startsAt, closed: s.open }) } catch (e) { setNote(message(e)) }
    week.reload(); who.reload()
  }
  if (!week.data) return <p className={week.error ? 'bad' : 'sub'} role="status">{week.error || 'Loading the week'}</p>
  const { days, zone } = week.data
  return (
    <>
      <div className="weekbar">
        <button className="act is-plain" onClick={() => setFrom(add(days[0].date, -7))}>Earlier week</button>
        <h2>{fmt(days[0].date, { day: 'numeric', month: 'short' })} to {fmt(days[6].date, { day: 'numeric', month: 'short', year: 'numeric' })}</h2>
        <button className="act is-plain" onClick={() => setFrom(add(days[0].date, 7))}>Later week</button>
        {from && <button className="inline" onClick={() => setFrom('')}>This week</button>}
      </div>
      <p className="sub">Times in {placeOf(zone)}. Press a free time to close it for visitors.</p>
      <p className="bad" role="alert">{note}</p>
      <div className="week">{days.map((d) => (
        <section key={d.date} aria-label={fmt(d.date, { weekday: 'long', day: 'numeric', month: 'long' })}>
          <h3>{fmt(d.date, { weekday: 'short' })} <b>{fmt(d.date, { day: 'numeric' })}</b></h3>
          {!d.slots.length && <p className="sub">Closed</p>}
          {d.slots.map((s) => {
            const t = s.time.slice(0, 5), b = who.data?.find((x) => x.slotAt === s.startsAt)
            if (s.booked) return <a key={s.startsAt} className={`cell is-booked ${s.past ? 'is-past' : ''}`} href={b ? `#requests/${b.reference}` : '#requests'}><b>{t}</b><span>{b?.name ?? 'Booked'}</span>{b && <small className={`is-${b.status.toLowerCase()}`}>{STATUS[b.status]}</small>}</a>
            if (s.past) return <p key={s.startsAt} className="cell is-past"><b>{t}</b></p>
            return <button key={s.startsAt} className={`cell ${s.open ? '' : 'is-closed'}`} aria-pressed={!s.open} aria-label={`${t}, ${s.open ? 'free, close it' : 'closed, open it'}`} onClick={() => void toggle(s)}><b>{t}</b><span>{s.open ? 'Free' : 'Closed'}</span></button>
          })}
        </section>
      ))}</div>
      <section className="group"><h2>Weekly hours</h2><div><button className="act is-plain" aria-expanded={hours} onClick={() => setHours(!hours)}>{hours ? 'Done' : 'Change weekly hours'}</button>{hours && <Hours onChange={week.reload} />}</div></section>
    </>
  )
}
function Hours({ onChange }: { onChange: () => void }) {
  const { data, error, reload } = useLoad<Hour[]>('api/admin/opening-times'), [note, setNote] = useState(''), [time, setTime] = useState('17:00'), [extra, setExtra] = useState<string[]>([])
  if (!data) return <p className="bad">{error}</p>
  const times = [...new Set([...data.map((h) => h.at.slice(0, 5)), ...extra])].sort()
  const put = async (weekday: number, at: string, open: boolean) => { setNote(''); try { await api('PUT', 'api/admin/opening-times', { weekday, at, open }) } catch (e) { setNote(message(e)) } reload(); onChange() }
  return (
    <div className="hours">
      <p className="sub">Changes apply to every week. Times that are already booked keep their booking.</p>
      <p className="bad" role="alert">{note}</p>
      <div className="wide"><table><thead><tr><th>Time</th>{DAYS.map((d) => <th key={d}>{d.slice(0, 3)}</th>)}</tr></thead>
        <tbody>{times.map((t) => <tr key={t}><th scope="row">{t}</th>{DAYS.map((d, i) => { const on = data.some((h) => h.weekday === i + 1 && h.at.startsWith(t)); return <td key={d}><input type="checkbox" checked={on} aria-label={`${d} ${t}`} onChange={() => void put(i + 1, t, !on)} /></td> })}</tr>)}</tbody></table></div>
      <form className="addtime" onSubmit={(e) => { e.preventDefault(); if (time) setExtra((x) => [...x, time]) }}><label><span className="sub">Another time</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label><button className="act is-plain">Add row</button></form>
    </div>
  )
}
