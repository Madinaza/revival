import { useEffect, useRef, useState } from 'react'
import { FINISHES, PAINTS, TRIMS, useStore } from '../state/store'
import { HOTSPOTS } from './content'
import { engine } from '../audio/engine'

function Radios({ name, legend, items, value, onChange, swatch }: { name: string; legend: string; items: readonly { name: string; color?: string }[]; value: number; onChange: (i: number) => void; swatch?: boolean }) {
  return (
    <fieldset className={swatch ? 'swatches' : 'chips'}>
      <legend>{legend}</legend>
      {items.map((it, i) => (
        <label key={it.name}>
          <input type="radio" name={name} checked={value === i} onChange={() => onChange(i)} />
          {swatch && <i style={{ background: it.color }} aria-hidden />}<span>{it.name}</span>
        </label>
      ))}
    </fieldset>
  )
}
export function Explore() {
  const s = useStore(), close = useRef<HTMLButtonElement>(null), [open, setOpen] = useState(() => innerWidth > 760 && innerHeight > 500 && innerWidth > innerHeight), panel = useRef<HTMLElement>(null)
  const exit = () => { engine.stop(); s.set({ mode: 'film', sound: false, hotspot: null }) }
  useEffect(() => {
    close.current?.focus({ preventScroll: true })
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (useStore.getState().hotspot) useStore.getState().set({ hotspot: null }); else exit() } }
    addEventListener('keydown', k)
    return () => { removeEventListener('keydown', k) }
  }, []) // eslint-disable-line
  // Tell the camera how much of the view the panel covers, so the car moves into the free part.
  useEffect(() => {
    const el = panel.current!
    const on = () => { const r = el.getBoundingClientRect(), sheet = r.width > innerWidth * 0.7; useStore.getState().set({ inset: !open ? [0, 0] : sheet ? [0, innerHeight - r.top] : [innerWidth - r.left, 0] }) }
    const o = new ResizeObserver(on); o.observe(el); addEventListener('resize', on); on()
    return () => { o.disconnect(); removeEventListener('resize', on); useStore.getState().set({ inset: [0, 0] }) }
  }, [open])
  const spot = HOTSPOTS.find((h) => h.id === s.hotspot)
  const sound = async () => { if (s.sound) { engine.stop(); s.set({ sound: false }) } else { await engine.start(); s.set({ sound: true }) } }
  return (
    <div className="explore" role="region" aria-label="Explore the car">
      <header className="bar">
        <span className="mark">Revival</span>
        <button ref={close} className="link" onClick={exit}>Back to the film</button>
      </header>
      <p className="hint">Drag to orbit. Scroll or pinch to move closer.</p>
      {spot && (
        <aside className="note" aria-live="polite">
          <h2>{spot.title}</h2><p>{spot.body}</p>
          <button className="link" onClick={() => s.set({ hotspot: null })}>Close note</button>
        </aside>
      )}
      <section ref={panel} className={`panel ${open ? 'is-open' : ''}`} aria-label="Specification">
        <button className="panel-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Hide specification' : 'Specify the car'}</button>
        {open && <div className="panel-body">
          <Radios swatch name="paint" legend="Paint" items={PAINTS} value={s.paint} onChange={(i) => s.set({ paint: i })} />
          <Radios name="finish" legend="Finish" items={FINISHES.map((name) => ({ name }))} value={s.finish} onChange={(i) => s.set({ finish: i })} />
          <Radios name="trim" legend="Wheels" items={TRIMS} value={s.trim} onChange={(i) => s.set({ trim: i })} />
          <fieldset className="chips"><legend>Electrics</legend>
            <button aria-pressed={s.head} onClick={() => s.set({ head: !s.head })}>Headlights</button>
            <button aria-pressed={s.tail} onClick={() => s.set({ tail: !s.tail })}>Taillights</button>
            <button aria-pressed={s.sound} onClick={() => void sound()}>Engine sound</button>
            <button disabled={!s.sound} onClick={() => engine.rev()}>Rev</button>
          </fieldset>
          <fieldset className="chips notes"><legend>Details</legend>
            {HOTSPOTS.map((h) => <button key={h.id} aria-pressed={s.hotspot === h.id} onClick={() => s.set({ hotspot: s.hotspot === h.id ? null : h.id })}>{h.title}</button>)}
          </fieldset>
        </div>}
      </section>
    </div>
  )
}
