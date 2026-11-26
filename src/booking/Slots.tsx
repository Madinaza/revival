import { useEffect, useRef, useState } from 'react'
import { call, Problem } from '../api/client'

interface Free { startsAt: string; time: string; free: boolean }
export interface Availability { zone: string; first: string; last: string; days: { date: string; slots: Free[] }[] }
const shift = (iso: string, days: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10) }
const part = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...o }).format(new Date(`${iso}T12:00:00Z`))
export const placeOf = (zone: string) => zone.split('/').pop()!.replace(/_/g, ' ')
export function when(iso: string, zone = 'Europe/Berlin') {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: zone }).format(new Date(iso))
}
/** A day, then a time. Two weeks at a time. Bump `refresh` to load the calendar again. */
export function Slots({ value, onChange, error, refresh = 0 }: { value: string; onChange: (startsAt: string) => void; error?: string; refresh?: number }) {
  const [from, setFrom] = useState(''), [a, setA] = useState<Availability | null>(null), [day, setDay] = useState(''), [bad, setBad] = useState(''), group = useRef<HTMLFieldSetElement>(null)
  useEffect(() => {
    let on = true
    call<Availability>('GET', `api/availability${from && `?from=${from}`}`).then((x) => {
      if (!on) return
      setA(x); setBad('')
      setDay((d) => (x.days.some((y) => y.date === d && y.slots.some((s) => s.free)) ? d : x.days.find((y) => y.slots.some((s) => s.free))?.date ?? ''))
    }, (e) => { if (on) setBad(e instanceof Problem ? e.message : 'The calendar did not load.') })
    return () => { on = false }
  }, [from, refresh])
  if (bad) return <p className="order-note" role="alert">{bad}</p>
  if (!a) return <p className="order-note" aria-busy>Loading the calendar</p>
  const first = a.days[0].date, next = shift(first, 14), prev = shift(first, -14), times = a.days.find((d) => d.date === day)?.slots ?? []
  return (
    <fieldset ref={group} className="slots" aria-describedby={error ? 'slotAt-error' : undefined}>
      <legend>Day and time <span className="fine">in {placeOf(a.zone)}</span></legend>
      <div className="days">
        {a.days.map((d) => {
          const free = d.slots.filter((s) => s.free).length
          return <button type="button" key={d.date} disabled={!free} aria-pressed={d.date === day} aria-label={`${part(d.date, { weekday: 'long', day: 'numeric', month: 'long' })}, ${free ? `${free} free` : 'nothing free'}`} onClick={() => setDay(d.date)}><small>{part(d.date, { weekday: 'short' })}</small><b>{part(d.date, { day: 'numeric' })}</b><small>{part(d.date, { month: 'short' })}</small></button>
        })}
      </div>
      <div className="weeks"><button type="button" disabled={first <= a.first} onClick={() => setFrom(prev < a.first ? a.first : prev)}>Earlier</button><button type="button" disabled={next > a.last} onClick={() => setFrom(next)}>Later</button></div>
      <div className="chips times">
        {times.map((s) => <label key={s.startsAt} className={s.free ? '' : 'is-taken'}><input type="radio" name="slotAt" value={s.startsAt} disabled={!s.free} checked={value === s.startsAt} aria-invalid={!!error} onChange={() => onChange(s.startsAt)} /><span>{s.time.slice(0, 5)}</span></label>)}
        {!day && <p className="fine">Nothing is free in these two weeks. Look at later dates.</p>}
      </div>
      {error && <em id="slotAt-error">{error}</em>}
    </fieldset>
  )
}
