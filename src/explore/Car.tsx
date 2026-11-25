import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { damp } from '../lib/math'
import { FINISHES, PAINTS, TRIMS, useStore } from '../state/store'

const SET: Record<string, THREE.MeshPhysicalMaterialParameters> = {
  paint: { clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.4 }, chrome: { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6, color: '#e6e6e8', metalness: 1, roughness: 0.05, envMapIntensity: 1.25 },
  glass: { color: '#050505', metalness: 0, roughness: 0.02, clearcoat: 1, envMapIntensity: 1.4 }, lens: { color: '#ffffff', roughness: 0.02, metalness: 0, transparent: true, opacity: 0.2, depthWrite: false, clearcoat: 1 },
  lampFront: { color: '#e9e4d8', metalness: 1, roughness: 0.12, emissive: '#ffd9a0', emissiveIntensity: 0 }, lampRear: { color: '#4a0306', roughness: 0.1, clearcoat: 1, emissive: '#ff0804', emissiveIntensity: 0 },
  amber: { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -8, color: '#8a2a05', roughness: 0.14, clearcoat: 1 }, tyre: { color: '#0c0c0c', roughness: 0.8 }, vinyl: { color: '#0b0b0c', roughness: 0.6, sheen: 0.4, sheenRoughness: 0.5 }, gunmetal: { metalness: 1, roughness: 0.34 },
}
export function Car() {
  const { scene } = useGLTF('models/car.glb', false, true), lit = useRef({ head: 0, tail: 0 })
  const rig = useMemo(() => {
    const root = scene.clone(true), mats: Record<string, THREE.MeshPhysicalMaterial> = {}
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial, n = src.name
      mats[n] ??= Object.assign(new THREE.MeshPhysicalMaterial({ color: src.color, metalness: src.metalness, roughness: src.roughness, side: THREE.DoubleSide, shadowSide: THREE.DoubleSide, ...SET[n] }), { name: n })
      m.material = mats[n]; m.castShadow = n !== 'lens'; m.receiveShadow = true
    })
    const p = PAINTS[useStore.getState().paint]; mats.paint?.color.set(p.color)
    return { root, mats }
  }, [scene])
  useEffect(() => () => Object.values(rig.mats).forEach((m) => m.dispose()), [rig])
  useFrame((_, dt) => {
    const s = useStore.getState(), m = rig.mats, d = Math.min(dt, 0.05), k = 1 - Math.exp(-6 * d), p = PAINTS[s.paint], t = TRIMS[s.trim], satin = FINISHES[s.finish] === 'Satin'
    lit.current.head = damp(lit.current.head, Number(s.head), 9, d); lit.current.tail = damp(lit.current.tail, Number(s.tail), 9, d)
    if (m.lampFront) m.lampFront.emissiveIntensity = lit.current.head * 7
    if (m.lampRear) m.lampRear.emissiveIntensity = lit.current.tail * 1.5
    if (m.paint) {
      m.paint.color.lerp(tmp.set(p.color), k); m.paint.metalness = damp(m.paint.metalness, p.metal, 6, d); m.paint.roughness = damp(m.paint.roughness, satin ? Math.max(0.46, p.rough) : p.rough, 6, d)
      m.paint.clearcoat = damp(m.paint.clearcoat, satin ? 0.12 : p.coat, 6, d); m.paint.clearcoatRoughness = satin ? 0.5 : 0.03
    }
    if (m.gunmetal) { m.gunmetal.color.lerp(tmp.set(t.color), k); m.gunmetal.roughness = damp(m.gunmetal.roughness, t.rough, 6, d) }
  })
  return <primitive object={rig.root} />
}
const tmp = new THREE.Color()
