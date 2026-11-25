import { useEffect, useRef, useState, type FormEvent } from 'react'
import { call, money, Problem, type Design } from '../api/client'
import { total, useStore } from '../state/store'

async function save(): Promise<Design> {
  const s = useStore.getState()
  return call<Design>('POST', 'api/designs', { paint: s.paint.code, finish: s.finish.code, wheels: s.trim.code, headlights: s.head, taillights: s.tail })
}
const linkTo = (code: string) => `${location.origin}${location.pathname}?design=${code}`
const said = (e: unknown) => (e instanceof Problem ? Object.values(e.fields)[0] ?? e.message : 'That did not work. Try again.')

/** Price, saving and the test-drive form. Only rendered when there is an API. */
export function Order() {
  const s = useStore(), sum = total(s), key = [s.paint.code, s.finish.code, s.trim.code, s.head, s.tail].join()
  const [saved, setSaved] = useState<{ key: string; code: string } | null>(null), [busy, setBusy] = useState(false), [note, setNote] = useState(''), [asking, setAsking] = useState(false)
  const current = saved?.key === key ? saved.code : null
  useEffect(() => setNote(''), [key])
  const keep = async () => {
    if (current) return current
    const d = await save(); setSaved({ key, code: d.code }); return d.code
  }
  const share = async () => {
    setBusy(true); setNote('')
    try { const code = await keep(); await navigator.clipboard?.writeText(linkTo(code)).then(() => setNote('Saved. The link is copied.'), () => setNote('Saved. Copy the link below.')) } catch (e) { setNote(said(e)) } finally { setBusy(false) }
  }
  return (
    <div className="order">
      {sum !== null && <p className="total"><span>Total</span><strong>{money(sum)}</strong></p>}
      <div className="order-actions">
        <button className="chip" disabled={busy} onClick={() => void share()}>{busy ? 'Saving' : 'Save and copy link'}</button>
        <button className="chip is-main" onClick={() => setAsking(true)}>Request a test drive</button>
      </div>
      <p className="order-note" role="status">{note}{current && <> <a href={linkTo(current)}>{current}</a></>}</p>
      {asking && <TestDrive design={keep} onClose={() => setAsking(false)} />}
    </div>
  )
}

function TestDrive({ design, onClose }: { design: () => Promise<string>; onClose: () => void }) {
  const box = useRef<HTMLDialogElement>(null), [errors, setErrors] = useState<Record<string, string>>({}), [note, setNote] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState('')
  useEffect(() => { const d = box.current!; d.showModal(); return () => d.close() }, [])
  const send = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget, v = Object.fromEntries(new FormData(form)) as Record<string, string>
    setBusy(true); setErrors({}); setNote('')
    try {
      const designCode = await design()
      setDone((await call<{ reference: string }>('POST', 'api/test-drives', { ...v, preferredDate: v.preferredDate || null, designCode })).reference)
    } catch (x) {
      if (x instanceof Problem) { setErrors(x.fields); setNote(x.message); const first = Object.keys(x.fields)[0]; if (first) (form.elements.namedItem(first) as HTMLElement | null)?.focus() } else setNote(said(x))
    } finally { setBusy(false) }
  }
  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className="field"><span>{label}</span>
      <input name={name} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} {...props} />
      {errors[name] && <em id={`${name}-error`}>{errors[name]}</em>}
    </label>
  )
  const today = new Date(), iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  return (
    <dialog ref={box} className="sheet" aria-labelledby="drive-title" onClose={onClose} onKeyDown={(e) => e.stopPropagation()}>
      {done ? (
        <div className="sheet-body" role="status">
          <h2 id="drive-title">Request received</h2>
          <p>Your reference is <strong>{done}</strong>. This is a fictional studio, so nobody will call.</p>
          <button className="chip is-main" autoFocus onClick={onClose}>Back to the car</button>
        </div>
      ) : (
        <form className="sheet-body" noValidate onSubmit={(e) => void send(e)}>
          <h2 id="drive-title">Request a test drive</h2>
          <p className="fine">A demonstration form for a fictional studio. Please do not enter real personal details.</p>
          {field('name', 'Name', { autoComplete: 'name', maxLength: 80, autoFocus: true })}
          {field('email', 'Email', { type: 'email', autoComplete: 'email', maxLength: 160 })}
          <div className="pair">{field('phone', 'Phone (optional)', { type: 'tel', autoComplete: 'tel', maxLength: 30 })}{field('preferredDate', 'Preferred date', { type: 'date', min: iso(today) })}</div>
          <label className="field"><span>Anything we should know (optional)</span><textarea name="message" rows={3} maxLength={1000} aria-invalid={!!errors.message} />{errors.message && <em>{errors.message}</em>}</label>
          <input className="trap" name="website" tabIndex={-1} autoComplete="off" aria-hidden />
          <p className="order-note" role="alert">{note}</p>
          <div className="order-actions"><button type="button" className="chip" onClick={onClose}>Cancel</button><button className="chip is-main" disabled={busy}>{busy ? 'Sending' : 'Send request'}</button></div>
        </form>
      )}
    </dialog>
  )
}
