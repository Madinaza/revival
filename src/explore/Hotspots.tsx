import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../state/store'
import { HOTSPOTS } from '../ui/content'
const v = new THREE.Vector3(), n = new THREE.Vector3(), els: (HTMLButtonElement | null)[] = []
/** Pins the DOM markers to the car. Plain DOM rather than drei's Html: its nested React roots threw on unmount after a second visit. */
export function HotspotPins() {
  useFrame(({ camera, size }) => HOTSPOTS.forEach((h, i) => {
    const el = els[i]
    if (!el) return
    const facing = v.copy(camera.position).sub(n.fromArray(h.pos)).normalize().dot(n.fromArray(h.facing).normalize()) >= 0.15
    v.fromArray(h.pos).project(camera)
    el.style.visibility = facing && v.z < 1 ? 'visible' : 'hidden'
    el.style.transform = `translate3d(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px, 0) translate(-50%, -50%)`
  }))
  return null
}
/** Pointer shortcuts only: the same notes are reachable by keyboard from the panel. Points facing away are hidden. */
export function HotspotMarkers() {
  const hotspot = useStore((s) => s.hotspot), set = useStore((s) => s.set)
  return <>{HOTSPOTS.map((h, i) => (
    <button key={h.id} ref={(el) => { els[i] = el }} className="spot" style={{ visibility: 'hidden' }} aria-label={h.title} tabIndex={-1} aria-pressed={hotspot === h.id}
      onClick={() => set({ hotspot: hotspot === h.id ? null : h.id })} />
  ))}</>
}
