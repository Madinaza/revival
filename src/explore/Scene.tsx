import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../state/store'
import { Studio } from './Studio'
import { Car } from './Car'
import { Atmosphere } from './Atmosphere'
import { CameraRig } from './CameraRig'
import { START } from './start'
import { Effects } from './Effects'
import { Monitor } from './Monitor'
import { HotspotMarkers, HotspotPins } from './Hotspots'
function Live() { useEffect(() => { const t = setTimeout(() => useStore.getState().set({ live: true }), 350); return () => { clearTimeout(t); useStore.getState().set({ live: false }) } }, []); return null }
export default function Scene() {
  const live = useStore((s) => s.live)
  return (
    <div className={`stage ${live ? 'is-live' : ''}`}>
      <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={1} gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }} camera={{ fov: START.fov, near: 0.1, far: 60, position: [...START.pos] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.AgXToneMapping; gl.domElement.addEventListener('webglcontextlost', (e) => { if (!gl.domElement.isConnected) return; /* fiber releases the context on unmount */ e.preventDefault(); useStore.getState().set({ webgl: false, mode: 'film' }) }) }}>
        <Suspense fallback={null}><Studio /><Car /><Atmosphere /><Live /></Suspense>
        <CameraRig /><HotspotPins /><Monitor /><Effects />
      </Canvas>
      <HotspotMarkers />
    </div>
  )
}
