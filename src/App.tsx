import { Component, Suspense, lazy, useCallback, useEffect, type ReactNode } from 'react'
import { hasWebGL2, initialTier, tierLocked } from './lib/capabilities'
import { applyCatalog, applyDesign, useStore } from './state/store'
import { API, call, type Catalog, type Design } from './api/client'
import { Film } from './ui/Film'
import { Explore } from './ui/Explore'
// three.js is only downloaded when someone heads for the realtime view.
const load = () => import('./explore/Scene')
const Scene = lazy(load)
let asked = false
class Boundary extends Component<{ children: ReactNode }, { bad: boolean }> {
  state = { bad: false }
  static getDerivedStateFromError() { return { bad: true } }
  componentDidCatch() { useStore.getState().set({ webgl: false, mode: 'film' }) }
  render() { return this.state.bad ? null : this.props.children }
}
export function App() {
  const mode = useStore((s) => s.mode), live = useStore((s) => s.live)
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)'), f = () => useStore.getState().set({ reduced: m.matches })
    f(); m.addEventListener('change', f)
    useStore.getState().set({ tier: initialTier(), tierLocked: tierLocked(), webgl: hasWebGL2() })
    if (API) void (async () => {
      // Without the API the film and the car still work, only unpriced.
      try { applyCatalog(await call<Catalog>('GET', 'api/catalog')) } catch { return }
      const code = new URLSearchParams(location.search).get('design')
      if (!code) return
      try { applyDesign(await call<Design>('GET', `api/designs/${encodeURIComponent(code)}`)); if (useStore.getState().webgl) useStore.getState().set({ mode: 'explore' }) } catch { /* an unknown code opens the film */ }
    })()
    return () => m.removeEventListener('change', f)
  }, [])
  const preload = useCallback(() => { if (asked || !useStore.getState().webgl) return; asked = true; void load(); void fetch('models/car.glb').catch(() => {}) }, [])
  const enter = useCallback(() => { preload(); useStore.getState().set({ mode: 'explore', hotspot: null }) }, [preload])
  return (
    <>
      <Film onEnter={enter} preload={preload} />
      {mode === 'explore' && <Boundary><Suspense fallback={null}><Scene /></Suspense>{live ? <Explore /> : <p className="wait" role="status">Bringing the car into the room</p>}</Boundary>}
    </>
  )
}
