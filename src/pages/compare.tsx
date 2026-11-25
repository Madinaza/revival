import { useEffect, useState, type FormEvent } from 'react'
import { call, money, Problem, type Design } from '../api/client'
import { recent } from './recent'
import { mount, Still, swatch } from './shell'

type Side = 'a' | 'b'
function Compare() {
  const q = new URLSearchParams(location.search), [codes, setCodes] = useState({ a: (q.get('a') ?? '').toUpperCase(), b: (q.get('b') ?? '').toUpperCase() })
  const [cars, setCars] = useState<Record<string, Design>>({}), [bad, setBad] = useState<Record<string, string>>({})
  const set = (s: Side, code: string) => setCodes((c) => { const n = { ...c, [s]: code }; history.replaceState(null, '', `?a=${n.a}&b=${n.b}`); return n })
  useEffect(() => { for (const c of [codes.a, codes.b]) if (c && !cars[c] && !bad[c]) call<Design>('GET', `api/designs/${encodeURIComponent(c)}`).then((d) => setCars((x) => ({ ...x, [c]: d })), (e) => setBad((x) => ({ ...x, [c]: e instanceof Problem && e.status !== 404 ? e.message : 'No design has this code.' }))) }, [codes]) // eslint-disable-line
  const a = cars[codes.a], b = cars[codes.b], gap = a && b ? b.totalCents - a.totalCents : 0
  const rows: [string, (d: Design) => React.ReactNode, (d: Design) => string][] = [
    ['Paint', (d) => <>{swatch(d.paint)}{d.paint.name}</>, (d) => d.paint.code], ['Finish', (d) => d.finish.name, (d) => d.finish.code], ['Wheels', (d) => <>{swatch(d.wheels)}{d.wheels.name}</>, (d) => d.wheels.code],
    ['Headlights', (d) => (d.headlights ? 'On' : 'Off'), (d) => String(d.headlights)], ['Taillights', (d) => (d.taillights ? 'On' : 'Off'), (d) => String(d.taillights)], ['Total when saved', (d) => money(d.totalCents), (d) => String(d.totalCents)],
  ]
  const side = (s: Side) => {
    const code = codes[s], d = cars[code]
    return (
      <section key={s} aria-label={s === 'a' ? 'First design' : 'Second design'}>
        {d ? <><Still d={d} sizes="(max-width: 760px) 100vw, 50vw" /><p className="order-actions"><a className="chip" href={`car.html?code=${d.code}`}>{d.code}</a><button className="plain" onClick={() => set(s, '')}>Change</button></p></> : (
          <form className="box" onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const c = String(new FormData(e.currentTarget).get('code')).trim().toUpperCase(); if (c) { setBad((x) => ({ ...x, [c]: '' })); set(s, c) } }}>
            <label className="field"><span>{s === 'a' ? 'First' : 'Second'} design code</span><input name="code" defaultValue={code} maxLength={12} autoCapitalize="characters" aria-invalid={!!bad[code]} />{code && bad[code] && <em role="alert">{bad[code]}</em>}</label>
            <button className="chip is-main">Show</button>
            {!!recent().length && <div className="chips"><p className="fine">Saved in this browser</p>{recent().filter((c) => c !== codes[s === 'a' ? 'b' : 'a']).map((c) => <button type="button" key={c} onClick={() => set(s, c)}>{c}</button>)}</div>}
          </form>
        )}
      </section>
    )
  }
  return (
    <article>
      <h1>{a && b ? (gap === 0 ? 'The same price' : `${money(Math.abs(gap))} apart`) : 'Compare two designs'}</h1>
      <div className="two is-even">{side('a')}{side('b')}</div>
      {a && b && <div className="wide"><table className="versus">
        <thead><tr><th scope="col">Option</th><th scope="col">{a.code}</th><th scope="col">{b.code}</th><th scope="col">Difference</th></tr></thead>
        <tbody>{rows.map(([label, show, same]) => { const eq = same(a) === same(b); return <tr key={label} className={eq ? 'is-same' : ''}><th scope="row">{label}</th><td>{show(a)}</td><td>{show(b)}</td><td>{eq ? 'Same' : label.startsWith('Total') ? `${gap > 0 ? '+' : '−'}${money(Math.abs(gap))}` : 'Different'}</td></tr> })}</tbody>
      </table></div>}
    </article>
  )
}
mount('compare.html', <Compare />)
