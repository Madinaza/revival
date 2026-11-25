import { useEffect, useRef, useState, type FormEvent } from 'react'
import { call, Problem, type Design } from '../api/client'
import { Slots, when } from '../booking/Slots'
import { mount } from './shell'

interface Mine { reference: string; name: string; status: 'NEW' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'; slotAt: string | null; preferredDate: string | null; changeable: boolean; design: Design | null; version: number }
const SAYS = { NEW: 'Waiting for the studio to confirm.', CONFIRMED: 'Confirmed. The car will be ready.', COMPLETED: 'This drive has taken place.', CANCELLED: 'This request is cancelled.' }
interface Key { reference: string; email: string }

function MyRequest() {
  const [key, setKey] = useState<Key | null>(null), [mine, setMine] = useState<Mine | null>(null), [errors, setErrors] = useState<Record<string, string>>({}), [note, setNote] = useState(''), [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'' | 'move' | 'cancel'>(''), [slot, setSlot] = useState(''), [tries, setTries] = useState(0), head = useRef<HTMLHeadingElement>(null)
  const run = async (f: () => Promise<Mine>) => {
    setBusy(true); setErrors({}); setNote('')
    try { setMine(await f()); setMode(''); setSlot(''); requestAnimationFrame(() => head.current?.focus()); return true }
    catch (e) { if (e instanceof Problem) { setErrors(e.fields); setNote(Object.keys(e.fields).length ? '' : e.message); if (e.fields.slotAt) { setSlot(''); setTries((n) => n + 1) } } else setNote('That did not work. Try again.'); return false } finally { setBusy(false) }
  }
  const look = (k: Key) => run(() => call<Mine>('POST', 'api/my-request', k)).then((ok) => { if (ok) setKey(k) })
  useEffect(() => { const reference = sessionStorage.getItem('request-reference'), email = sessionStorage.getItem('request-email'); if (reference && email) void look({ reference, email }) }, []) // eslint-disable-line
  if (!mine || !key) return (
    <form className="narrow" noValidate onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); void look({ reference: String(f.get('reference')), email: String(f.get('email')) }) }}>
      <h1>My request</h1>
      <p>See, move or cancel a test drive. The reference was shown when you sent the request.</p>
      {(['reference', 'email'] as const).map((n) => <label key={n} className="field"><span>{n === 'email' ? 'Email' : 'Reference'}</span><input name={n} type={n === 'email' ? 'email' : 'text'} autoComplete={n === 'email' ? 'email' : 'off'} autoCapitalize={n === 'email' ? 'off' : 'characters'} aria-invalid={!!errors[n]} aria-describedby={errors[n] ? `${n}-error` : undefined} />{errors[n] && <em id={`${n}-error`}>{errors[n]}</em>}</label>)}
      <p className="order-note" role="alert">{note}</p>
      <button className="chip is-main" disabled={busy}>{busy ? 'Looking' : 'Open my request'}</button>
    </form>
  )
  const shown = mine.slotAt ? when(mine.slotAt) : mine.preferredDate ? `${new Intl.DateTimeFormat('en-GB', { dateStyle: 'full' }).format(new Date(`${mine.preferredDate}T12:00:00`))}, time not set` : ''
  return (
    <article className="narrow">
      <h1 ref={head} tabIndex={-1}>{shown.split(/ at |, (?=\d)/)[0]}</h1>
      {mine.slotAt && <p className="big">{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }).format(new Date(mine.slotAt))} in Berlin</p>}
      <p className={`state is-${mine.status.toLowerCase()}`} role="status">{SAYS[mine.status]}</p>
      <dl className="facts"><div><dt>Reference</dt><dd>{mine.reference}</dd></div><div><dt>Name</dt><dd>{mine.name}</dd></div>{mine.design && <div><dt>Car</dt><dd><a href={`car.html?code=${mine.design.code}`}>{mine.design.paint.name}, {mine.design.finish.name.toLowerCase()}</a></dd></div>}</dl>
      {note && <p className="order-note" role="alert">{note}</p>}
      {mine.changeable && mode === '' && <div className="order-actions"><button className="chip is-main" onClick={() => setMode('move')}>Choose another time</button><button className="chip" onClick={() => setMode('cancel')}>Cancel request</button></div>}
      {!mine.changeable && (mine.status === 'NEW' || mine.status === 'CONFIRMED') && <p className="fine">Less than twelve hours before the drive, changes are no longer possible here.</p>}
      {mode === 'move' && <form className="box" onSubmit={(e) => { e.preventDefault(); if (!slot) { setErrors({ slotAt: 'Choose a time.' }); return } void run(() => call<Mine>('POST', 'api/my-request/move', { key, slotAt: slot, version: mine.version })) }}>
        <Slots value={slot} onChange={setSlot} error={errors.slotAt} refresh={tries} />
        <div className="order-actions"><button type="button" className="chip" onClick={() => setMode('')}>Keep the old time</button><button className="chip is-main" disabled={busy}>Move here</button></div>
      </form>}
      {mode === 'cancel' && <div className="box"><p>Cancel this test drive? The time is given to someone else.</p><div className="order-actions"><button className="chip" onClick={() => setMode('')}>Keep it</button><button className="chip is-main" disabled={busy} onClick={() => void run(() => call<Mine>('POST', 'api/my-request/cancel', { key, version: mine.version }))}>Cancel request</button></div></div>}
      <button className="plain" onClick={() => { sessionStorage.clear(); setKey(null); setMine(null); setNote('') }}>Look up another request</button>
    </article>
  )
}
mount('my-request.html', <MyRequest />)
