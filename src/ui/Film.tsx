import { useEffect, useRef, useState, type ReactNode } from 'react'
import { clamp } from '../lib/math'
import { useStore } from '../state/store'
import { FilmPlayer } from '../film/player'
import { FRAMES, LENGTH, REVEAL_END, progress } from '../film/timeline'
import { CREDIT } from './content'

declare global { interface Window { __film?: FilmPlayer } }
const CHAPTERS = [0, REVEAL_END, 0.48, 0.62, 0.78, 0.905, 1]
const toY = (t: number) => t * LENGTH * innerHeight
function Chapter({ t, className = '', children }: { t: number; className?: string; children: ReactNode }) {
  return <section className={`chapter ${className}`} style={{ top: `${t * LENGTH * 100}lvh` }}>{children}</section>
}
/** Where the film was left, so returning from the realtime view lands on the same frame. */
let savedScroll = 0

export function Film({ onEnter, preload }: { onEnter: () => void; preload: () => void }) {
  const reduced = useStore((s) => s.reduced), webgl = useStore((s) => s.webgl), leaving = useStore((s) => s.mode === 'explore')
  const canvas = useRef<HTMLCanvasElement>(null), slider = useRef<HTMLInputElement>(null), root = useRef<HTMLElement>(null), cut = useRef<HTMLDivElement>(null), player = useRef<FilmPlayer>(null)
  const [ready, setReady] = useState(false), [n, setN] = useState(0)

  useEffect(() => {
    // phones take the 6 MB set: the band is under 500 CSS pixels tall there
    const iw = innerWidth || screen.width, ih = innerHeight || screen.height
    const small = (iw < 760 && matchMedia('(pointer: coarse)').matches) || Math.max(iw, ih * 0.9) * Math.min(devicePixelRatio, 2) < 1300
    const p = new FilmPlayer(canvas.current!, small ? 'film/960' : 'film/1600', { window: small ? 28 : 40, smooth: !reduced, onFirst: () => setReady(true), onProgress: (k) => { if (k % 16 === 0 || k === FRAMES) setN(k) } })
    player.current = p; window.__film = p
    return () => p.dispose()
  }, [reduced])
  // Re-runs on return from the realtime view: the page was one screen tall there, so the scroll position has to be put back.
  useEffect(() => {
    if (leaving) return
    scrollTo({ top: savedScroll, behavior: 'instant' })
    let last = -1
    const on = () => {
      if (useStore.getState().mode === 'explore') return
      savedScroll = scrollY
      const t = progress(scrollY, innerHeight), p = player.current
      if (p) {
        if (!reduced) p.target = t
        else {
          const c = CHAPTERS.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a))
          if (c !== last) { if (last >= 0) cut.current?.animate([{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }], { duration: 520 }); setTimeout(() => { p.target = c }, last < 0 ? 0 : 200); last = c }
        }
      }
      if (slider.current) slider.current.value = String(Math.round(clamp(t / REVEAL_END) * 100))
      root.current?.style.setProperty('--hero', String(clamp(1 - t / 0.09)))
      if (t > 0.55) preload()
    }
    on(); addEventListener('scroll', on, { passive: true }); addEventListener('resize', on)
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on) }
  }, [reduced, preload, leaving])
  // Entering the realtime view: run the film to its last frame, which shares the realtime camera.
  useEffect(() => { if (leaving && player.current) player.current.target = 1 }, [leaving])

  return (
    <main ref={root} className={`film ${leaving ? 'is-leaving' : ''}`} style={{ height: leaving ? '100lvh' : `${(LENGTH + 1) * 100}lvh` }} inert={leaving}>
      <div className="screen" aria-hidden><canvas ref={canvas} /></div>
      <div ref={cut} className="cut" aria-hidden />
      {!leaving && <>
        <header className="bar">
          <a className="mark" href="#top">Revival</a>
          {webgl && <button className="link" onClick={onEnter} onPointerEnter={preload} onFocus={preload}>Walk around it</button>}
        </header>
        <Chapter t={0} className="hero">
          <h1 id="top"><span>Revival</span></h1>
          <p className="lede">Thirty-seven square metres of silk, and one car underneath.</p>
          <label className="pull">
            <span>Pull the silk</span>
            <input ref={slider} type="range" min={0} max={100} defaultValue={0} aria-label="Pull the silk off the car"
              onInput={(e) => scrollTo({ top: toY((Number(e.currentTarget.value) / 100) * REVEAL_END), behavior: 'instant' })} />
          </label>
        </Chapter>
        <Chapter t={0.48} className="low split"><h2>Four lamps, set back</h2><div><p>The face is one dark opening. Nothing breaks it except the light.</p></div></Chapter>
        <Chapter t={0.62} className="profile">
          <h2 className="vast">Long hood, short deck</h2>
          <dl className="dims"><div><dt>Length</dt><dd>4.86 m</dd></div><div><dt>Width</dt><dd>1.95 m</dd></div><div><dt>Height</dt><dd>1.24 m</dd></div></dl>
        </Chapter>
        <Chapter t={0.78} className="low left"><h2>The hood breathes</h2><p>One wide scoop, split in two, set back towards the glass.</p></Chapter>
        <Chapter t={0.905} className="low right"><h2>Last seen in red</h2><p>Room lights down. One band of light, from edge to edge.</p></Chapter>
        <Chapter t={1} className="finale">
          <h2 className="vast">{webgl ? 'Now it is yours to light' : 'Back where it started'}</h2>
          {webgl ? <button className="cta" onClick={onEnter} onPointerEnter={preload} onFocus={preload}>Walk around it</button> : <p>This browser cannot run the realtime view, so the film is the whole experience here.</p>}
          <footer>
            <p>Revival is a fictional studio and a personal portfolio project. It is not affiliated with or endorsed by any car maker.</p>
            <p>Car: “{CREDIT.name}” by {CREDIT.author}, <a href="https://creativecommons.org/licenses/by/4.0/">{CREDIT.license}</a>, modified. Concrete: Poly Haven, CC0.</p>
          </footer>
        </Chapter>
      </>}
      <div className={`loader ${ready ? 'is-done' : ''}`} role="status"><span>{ready ? '' : 'Opening the studio'}</span></div>
      {!leaving && ready && n < FRAMES && <progress className="reel" max={FRAMES} value={n} aria-label="Loading the rest of the film" />}
    </main>
  )
}
