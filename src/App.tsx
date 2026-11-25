import { Component, Suspense, lazy, useCallback, useEffect, type ReactNode } from 'react'
import { hasWebGL2, initialTier, tierLocked } from './lib/capabilities'
import { useStore } from './state/store'
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
