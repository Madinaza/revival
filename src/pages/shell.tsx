import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/bodoni-moda/opsz-italic.css'
import '@fontsource-variable/bodoni-moda/opsz.css'
import '../styles.css'
import './pages.css'
import { useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { API, money, type Design, type OptionItem } from '../api/client'

const LINKS = [['./', 'The film'], ['making.html', 'How it was made'], ...(API ? [['compare.html', 'Compare'], ['my-request.html', 'My request']] : [])] as const
export function mount(here: string, body: ReactNode) {
  createRoot(document.getElementById('page')!).render(
    <>
      <header className="top"><a className="mark" href="./">Revival</a><nav aria-label="Pages">{LINKS.map(([href, label]) => <a key={href} href={href} aria-current={href === here ? 'page' : undefined}>{label}</a>)}</nav></header>
      <main>{body}</main>
      <footer className="foot"><p>Revival is a fictional studio and a personal portfolio project. It is not affiliated with or endorsed by any car maker.</p><p>Car: “Dodge Challenger 1970” by Artem P, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>, modified. Concrete: Poly Haven, CC0.</p></footer>
    </>,
  )
}
/** The studio photograph of a specification, or its colours when staff added an option nobody has photographed. */
export function Still({ d, sizes }: { d: Design; sizes: string }) {
  const [none, setNone] = useState(false), name = `${d.paint.code}-${d.finish.code}-${d.wheels.code}`
  if (none) return <div className="no-still" style={{ background: `linear-gradient(115deg, ${d.paint.color ?? '#222'} 62%, ${d.wheels.color ?? '#555'} 62.2%)` }}><p>No photograph of this combination yet. Open it in 3D to see it.</p></div>
  return <img className="still" src={`stills/${name}-1600.webp`} srcSet={`stills/${name}-800.webp 800w, stills/${name}-1600.webp 1600w`} sizes={sizes} width={1600} height={900} alt={`The car in ${d.paint.name.toLowerCase()}, ${d.finish.name.toLowerCase()} finish, with ${d.wheels.name.toLowerCase()} wheels`} onError={() => setNone(true)} />
}
export const priceOf = (cents: number | null | undefined) => (cents == null ? '' : cents === 0 ? 'Included' : money(cents))
export const swatch = (o: OptionItem) => <i className="dot" style={{ background: o.color ?? 'transparent' }} aria-hidden />
