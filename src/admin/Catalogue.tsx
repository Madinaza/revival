import { useState, type FormEvent } from 'react'
import { Problem, type Kind, type OptionItem } from '../api/client'
import { api, message, useLoad } from './shared'

const GROUPS: readonly [Kind, string][] = [['BASE', 'The car'], ['PAINT', 'Paint'], ['FINISH', 'Finish'], ['WHEELS', 'Wheels']]
type Draft = { name: string; price: string; color: string; metalness: string; roughness: string; clearcoat: string; active: boolean }
const draftOf = (o: OptionItem | null): Draft => ({ name: o?.name ?? '', price: o ? (o.priceCents / 100).toFixed(2).replace(/\.00$/, '') : '0', color: o?.color ?? '#5a4632', metalness: String(o?.metalness ?? 0.2), roughness: String(o?.roughness ?? 0.35), clearcoat: String(o?.clearcoat ?? 1), active: o?.active ?? true })
export function cents(text: string): number | null {
  const t = text.trim().replace(/\s|€/g, '')
  return /^\d{1,7}([.,]\d{1,2})?$/.test(t) ? Math.round(Number(t.replace(',', '.')) * 100) : null
}
function body(kind: Kind, d: Draft, position: number, version: number) {
  const has = { color: kind === 'PAINT' || kind === 'WHEELS', rough: kind === 'PAINT' || kind === 'WHEELS', paint: kind === 'PAINT' }
  return { name: d.name, priceCents: cents(d.price), color: has.color ? d.color : null, roughness: has.rough ? Number(d.roughness) : null, metalness: has.paint ? Number(d.metalness) : null, clearcoat: has.paint ? Number(d.clearcoat) : null, active: d.active, position, version }
}
export function Catalogue() {
  const { data, error, setData, reload } = useLoad<OptionItem[]>('api/admin/options'), [edit, setEdit] = useState<number | null>(null), [add, setAdd] = useState<Kind | null>(null)
  return (
    <>
      {error && <p className="bad" role="alert">{error}</p>}
      {data && GROUPS.map(([kind, title]) => {
        const items = data.filter((o) => o.kind === kind)
        return (
          <section key={kind} className="group">
            <h2>{title}</h2>
            <ul>{items.map((o) => (
              <li key={o.id} className={o.active ? '' : 'is-off'}>
                <div className="line">
                  {o.color && <i style={{ background: o.color }} aria-hidden />}
                  <span className="who">{o.name}</span><span className="sub">{o.active ? '' : 'Hidden'}</span><span className="num">{new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(o.priceCents / 100)}</span>
                  <button className="inline" aria-expanded={edit === o.id} aria-label={`Edit ${o.name}`} onClick={() => { setEdit(edit === o.id ? null : o.id); setAdd(null) }}>{edit === o.id ? 'Close' : 'Edit'}</button>
                </div>
                {edit === o.id && <Form key={o.version} kind={kind} item={o} position={o.position} onDone={(x) => { setData((l) => l && l.map((y) => (y.id === x.id ? x : y))); setEdit(null) }} onReload={reload} />}
              </li>
            ))}</ul>
            {(kind === 'PAINT' || kind === 'WHEELS') && (add === kind
              ? <Form kind={kind} item={null} position={Math.max(0, ...items.map((o) => o.position)) + 1} onDone={() => { setAdd(null); reload() }} onReload={() => setAdd(null)} />
              : <button className="act is-plain" onClick={() => { setAdd(kind); setEdit(null) }}>Add {kind === 'PAINT' ? 'a paint' : 'wheels'}</button>)}
          </section>
        )
      })}
    </>
  )
}
function Form({ kind, item, position, onDone, onReload }: { kind: Kind; item: OptionItem | null; position: number; onDone: (o: OptionItem) => void; onReload: () => void }) {
  const [d, set] = useState(() => draftOf(item)), [code, setCode] = useState(''), [errors, setErrors] = useState<Record<string, string>>({}), [note, setNote] = useState(''), [stale, setStale] = useState(false), [busy, setBusy] = useState(false)
  const id = item?.id ?? `new-${kind}`, put = (p: Partial<Draft>) => set((x) => ({ ...x, ...p }))
  const save = async (e: FormEvent) => {
    e.preventDefault(); setErrors({}); setNote(''); setStale(false)
    if (cents(d.price) === null) { setErrors({ priceCents: 'Enter an amount like 1450 or 1450.50.' }); return }
    setBusy(true)
    const values = body(kind, d, position, item?.version ?? 0)
    try { onDone(item ? await api<OptionItem>('PUT', `api/admin/options/${item.id}`, values) : await api<OptionItem>('POST', 'api/admin/options', { kind, code, values })) }
    catch (x) { if (x instanceof Problem) { setErrors(Object.fromEntries(Object.entries(x.fields).map(([k, v]) => [k.replace('values.', ''), v]))); setStale(x.status === 409 && !!item && x.message.includes('meantime')) } setNote(message(x)) } finally { setBusy(false) }
  }
  const text = (key: 'name' | 'price', label: string, field: string) => <label><span>{label}</span><input value={d[key]} inputMode={key === 'price' ? 'decimal' : undefined} maxLength={60} aria-invalid={!!errors[field]} aria-describedby={`${id}-note`} onChange={(e) => put({ [key]: e.target.value })} />{errors[field] && <em>{errors[field]}</em>}</label>
  const slide = (key: 'metalness' | 'roughness' | 'clearcoat', label: string) => <label><span>{label} <output>{d[key]}</output></span><input type="range" min={0} max={1} step={0.01} value={d[key]} onChange={(e) => put({ [key]: e.target.value })} /></label>
  return (
    <form className="edit" noValidate onSubmit={(e) => void save(e)}>
      {!item && <label><span>Code, used in links</span><input value={code} placeholder="night-green" aria-invalid={!!errors.code} onChange={(e) => setCode(e.target.value)} />{errors.code && <em>{errors.code}</em>}</label>}
      {text('name', 'Name', 'name')}{text('price', 'Price in euros', 'priceCents')}
      {(kind === 'PAINT' || kind === 'WHEELS') && <><label><span>Colour</span><input type="color" value={d.color} onChange={(e) => put({ color: e.target.value })} /></label>{slide('roughness', 'Roughness')}</>}
      {kind === 'PAINT' && <>{slide('metalness', 'Metal')}{slide('clearcoat', 'Clear coat')}</>}
      {kind !== 'BASE' && <label className="tick"><input type="checkbox" checked={d.active} onChange={(e) => put({ active: e.target.checked })} /><span>Offered to visitors</span></label>}
      <p id={`${id}-note`} className="bad" role="alert">{note}{stale && <> <button type="button" className="inline" onClick={onReload}>Reload option</button></>}</p>
      <button className="act" disabled={busy}>{busy ? 'Saving' : 'Save'}</button>
    </form>
  )
}
