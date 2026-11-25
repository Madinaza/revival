import { useEffect, useMemo, useState } from 'react'
import { FRAMES, loadOrder, nearest, shot } from '../film/timeline'
import CAMERA from './camera.json'
import { mount } from './shell'

const pad = (f: number) => String(f).padStart(4, '0')
const SHOTS = ['The silk comes off, the lamps light, the hood', 'A cut, and around the back', 'A cut, and the wide view the realtime scene takes over']
/** Plan view. Blender's y runs away from the nose, so the car points down the page. */
const px = (x: number) => 150 + x * 17, py = (y: number) => 170 - y * 17

function Plan({ f }: { f: number }) {
  const lines = useMemo(() => [0, 1, 2].map((s) => CAMERA.map((c, i) => [c, i] as const).filter(([, i]) => shot(i) === s).map(([c]) => `${px(c[0])},${py(c[1])}`).join(' ')), [])
  const [x, y, z, lx, ly, fov] = CAMERA[f], a = Math.atan2(py(ly) - py(y), px(lx) - px(x)), half = Math.atan(Math.tan((fov * Math.PI) / 360) * 1.78), ray = (d: number) => `${px(x) + Math.cos(a + d) * 70},${py(y) + Math.sin(a + d) * 70}`
  return (
    <svg className="plan" viewBox="0 0 300 330" role="img" aria-label={`Plan of the studio. At frame ${f} the camera is ${Math.hypot(x, y).toFixed(1)} metres from the middle of the car and ${z.toFixed(2)} metres up.`}>
      <rect x={px(-0.975)} y={py(2.43)} width={33.2} height={82.6} rx={9} className="plan-car" /><text x={150} y={173} textAnchor="middle">car</text>
      {lines.map((l, i) => <polyline key={i} points={l} className={i === shot(f) ? 'is-now' : ''} />)}
      <polygon points={`${px(x)},${py(y)} ${ray(-half)} ${ray(half)}`} className="plan-view" /><circle cx={px(x)} cy={py(y)} r={5} />
    </svg>
  )
}
function Film() {
  const [f, setF] = useState(0), [x, y, z, , , fov] = CAMERA[f]
  useEffect(() => { for (const d of [1, 2, 3, 4, 8, 16]) if (f + d < FRAMES) new Image().src = `film/960/${pad(f + d)}.webp` }, [f])
  return (
    <figure className="film-figure">
      <img src={`film/960/${pad(f)}.webp`} width={960} height={540} alt={`Frame ${f} of the film`} />
      <Plan f={f} />
      <figcaption>
        <label><span>Frame {f}</span><input type="range" min={0} max={FRAMES - 1} value={f} onChange={(e) => setF(Number(e.target.value))} aria-valuetext={`Frame ${f}`} /></label>
        <p aria-live="off">{SHOTS[shot(f)]}. {Math.hypot(x, y).toFixed(1)} m away, {z.toFixed(2)} m up, a {fov.toFixed(0)}° lens.</p>
      </figcaption>
    </figure>
  )
}
function Loading() {
  const order = useMemo(() => loadOrder(), []), [n, setN] = useState(21)
  const here = useMemo(() => new Set(order.slice(0, n)), [order, n])
  const worst = useMemo(() => { let w = 0; for (let f = 0; f < FRAMES; f++) w = Math.max(w, Math.abs(nearest((x) => here.has(x), f) - f)); return w }, [here])
  return (
    <figure className="load-figure">
      <div className="cells" role="img" aria-label={`${n} of ${FRAMES} frames have arrived`}>{Array.from({ length: FRAMES }, (_, f) => <i key={f} className={here.has(f) ? 'is-here' : ''} />)}</div>
      <figcaption>
        <label><span>{n} frames have arrived</span><input type="range" min={2} max={FRAMES} value={n} onChange={(e) => setN(Number(e.target.value))} /></label>
        <p>{worst === 0 ? 'Every frame is here.' : `The film can be scrubbed, and is never more than ${worst} ${worst === 1 ? 'frame' : 'frames'} off.`}</p>
      </figcaption>
    </figure>
  )
}
function Handover() {
  const [v, setV] = useState(50)
  return (
    <figure className="hand" style={{ '--v': `${v}%` } as React.CSSProperties}>
      <div><img src="making/film.webp" width={1280} height={720} alt="Last frame of the film, path traced" /><img src="making/realtime.webp" width={1280} height={720} alt="The realtime scene from the same camera" className="over" /><span aria-hidden>Film</span><span aria-hidden>Realtime</span></div>
      <figcaption><label><span>Film to realtime</span><input type="range" min={0} max={100} value={v} onChange={(e) => setV(Number(e.target.value))} /></label></figcaption>
    </figure>
  )
}
function Making() {
  return (
    <article className="making">
      <h1>How it was made</h1>
      <p className="big">A film that cannot be touched, and a car that can. The work was in making them one thing.</p>
      <section><h2>320 frames, and a camera that keeps its word</h2><p>The silk is 37 square metres of simulated cloth: 34,881 points over 280 steps, hung, hoisted by its front edge and dragged back over the roof. Every frame was path traced in Blender on a laptop. Scroll position picks the frame, so you are the one pulling.</p><Film /></section>
      <section><h2>Useful before it has loaded</h2><p>The frames weigh 12.5 MB, or 6.1 MB on a phone. They arrive coarse to fine: every sixteenth first, then the gaps between them, halved each time. Move the slider to see what that buys. The grid is computed by the same code the player uses.</p><Loading /></section>
      <section><h2>The handover</h2><p>The last frame of the film and the first of the realtime scene share one camera. A unit test reads the Blender script and fails if the two ever disagree. The light is not identical: the film bounces it around the room, and the realtime scene cannot afford to.</p><Handover /></section>
      <section><h2>What was thrown away</h2>
        <dl className="scrap">
          <div><dt>The first car</dt><dd>A concept model rendered entirely in realtime. It looked like an animation, so it was replaced by a detailed 1970 coupe with its badges removed, and the reveal became a path-traced film.</dd></div>
          <div><dt>Compressing the cloth</dt><dd>Principal components made the silk small, but the worst point was 304 mm out of place. Keyframes with delta coding fixed that, and then the film made all of it unnecessary.</dd></div>
          <div><dt>A swoop over the hood</dt><dd>Twelve frames carried the camera from nose to tail. Under a scroll wheel it read as a jump, so it became a cut. 54 frames were rendered again.</dd></div>
          <div><dt>A tray under the car</dt><dd>It was meant to hide a small reflection below the nose. It was visible from the side and did not hide it. The reflection is still there, in the last shot.</dd></div>
        </dl>
      </section>
      <section><h2>What testing found</h2>
        <dl className="scrap">
          <div><dt>One visit only</dt><dd>Leaving the realtime view released its graphics context, which the site mistook for a crash. The button to go back never returned.</dd></div>
          <div><dt>A film that would not start</dt><dd>Opened in a hidden tab the window is zero pixels high. One division later, the frame number was not a number, for good.</dd></div>
          <div><dt>Silk inside the wheels</dt><dd>The simulation let cloth slip into the hollow wheels. It is lifted back out when each frame is rendered.</dd></div>
        </dl>
        <p>The source, the measurements and what has not been tested are <a href="https://github.com/Madinaza/revival">on GitHub</a>. Built by Madina Aghazada with AI assistance.</p>
      </section>
    </article>
  )
}
mount('making.html', <Making />)
