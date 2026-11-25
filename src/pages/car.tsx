import { useEffect, useState } from 'react'
import { call, money, Problem, type Design } from '../api/client'
import { remember } from './recent'
import { mount, priceOf, Still, swatch } from './shell'

function Car() {
  const code = (new URLSearchParams(location.search).get('code') ?? '').toUpperCase()
  const [d, setD] = useState<Design | null>(null), [bad, setBad] = useState(''), [note, setNote] = useState('')
  useEffect(() => { call<Design>('GET', `api/designs/${encodeURIComponent(code || '-')}`).then((x) => { setD(x); remember(x.code); document.title = `${x.paint.name}, ${x.code}, Revival` }, (e) => setBad(e instanceof Problem && e.status === 404 ? 'No design has this code.' : e instanceof Problem ? e.message : 'The design did not load.')) }, [code])
  if (bad) return <div className="narrow"><h1>Not found</h1><p role="alert">{bad}</p><a className="chip is-main" href="./">Start a design</a></div>
  if (!d) return <div className="narrow" aria-busy><p>Opening the design</p></div>
  const copy = () => navigator.clipboard?.writeText(location.href).then(() => setNote('The link is copied.'), () => setNote('Copy the link from the address bar.'))
  const p = d.prices
  return (
    <article className="sheet-page">
      <Still d={d} sizes="100vw" />
      <div className="sheet-head"><h1>{d.paint.name}<span>{d.finish.name.toLowerCase()}, {d.wheels.name.toLowerCase()} wheels</span></h1><p className="big">{money(d.totalCents)}</p></div>
      <div className="two">
        <section aria-labelledby="price"><h2 id="price">Price when saved</h2>
          {p ? <table><tbody>
            <tr><th scope="row">Revival coupe</th><td>{money(p.base)}</td></tr>
            <tr><th scope="row">{swatch(d.paint)}{d.paint.name} paint</th><td>{priceOf(p.paint)}</td></tr>
            <tr><th scope="row">{d.finish.name} finish</th><td>{priceOf(p.finish)}</td></tr>
            <tr><th scope="row">{swatch(d.wheels)}{d.wheels.name} wheels</th><td>{priceOf(p.wheels)}</td></tr>
            <tr className="sum"><th scope="row">Total</th><td>{money(d.totalCents)}</td></tr>
          </tbody></table> : <p>{money(d.totalCents)} in total. Single prices were not kept for this older design.</p>}
          <p className="fine">Invented prices for a fictional studio.</p>
        </section>
        <section aria-labelledby="spec"><h2 id="spec">The car</h2>
          <dl className="facts"><div><dt>Length</dt><dd>4.86 m</dd></div><div><dt>Width</dt><dd>1.95 m</dd></div><div><dt>Height</dt><dd>1.24 m</dd></div><div><dt>Headlights</dt><dd>{d.headlights ? 'On' : 'Off'}</dd></div><div><dt>Taillights</dt><dd>{d.taillights ? 'On' : 'Off'}</dd></div><div><dt>Code</dt><dd>{d.code}</dd></div><div><dt>Saved</dt><dd>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date(d.createdAt))}</dd></div></dl>
        </section>
      </div>
      <div className="order-actions no-print"><a className="chip is-main" href={`./?design=${d.code}`}>Open in 3D</a><a className="chip" href={`compare.html?a=${d.code}`}>Compare</a><button className="chip" onClick={() => void copy()}>Copy link</button><button className="chip" onClick={() => print()}>Print or save as PDF</button></div>
      <p className="order-note no-print" role="status">{note}</p>
    </article>
  )
}
mount('car.html', <Car />)
