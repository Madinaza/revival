import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer, MeshReflectorMaterial, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { damp } from '../lib/math'
import { useStore } from '../state/store'
import { QUALITY } from './quality'

function useConcrete(base: string, rx: number, ry: number) {
  const t = useTexture({ map: `textures/${base}_Diffuse.jpg`, normalMap: `textures/${base}_nor_gl.jpg`, roughnessMap: `textures/${base}_Rough.jpg` })
  return useMemo(() => {
    const o = { map: t.map.clone(), normalMap: t.normalMap.clone(), roughnessMap: t.roughnessMap.clone() }
    for (const x of Object.values(o)) { x.wrapS = x.wrapT = THREE.RepeatWrapping; x.repeat.set(rx, ry); x.anisotropy = 8; x.needsUpdate = true }
    o.map.colorSpace = THREE.SRGBColorSpace
    return o
  }, [t, rx, ry])
}

/** Key level shared by every light so a scene change is one number. */
const level = { key: 1 }

function Floor() {
  const q = QUALITY[useStore((s) => s.tier)], c = useConcrete('concrete_floor_worn_001', 9, 9)
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[36, 36]} />
      {q.reflections
        ? <MeshReflectorMaterial {...c} color="#57534c" resolution={768} mixBlur={1} mixStrength={5} blur={[260, 90]} roughness={0.75} depthScale={0.6} minDepthThreshold={0.2} maxDepthThreshold={1.2} metalness={0.15} mirror={0} normalScale={[0.35, 0.35] as never} />
        : <meshStandardMaterial {...c} color="#57524a" roughness={1.15} metalness={0} />}
    </mesh>
  )
}

function Walls() {
  const c = useConcrete('concrete_wall_007', 3, 1.6)
  const mat = <meshStandardMaterial {...c} color="#6a655d" roughness={1} />
  return (
    <group>
      <mesh position={[0, 3.6, -11]} receiveShadow><boxGeometry args={[32, 9, 0.6]} />{mat}</mesh>
      <mesh position={[-11.5, 3.6, -1]} rotation-y={Math.PI / 2 + 0.12} receiveShadow><boxGeometry args={[26, 9, 0.6]} />{mat}</mesh>
      <mesh position={[12, 3.6, 0]} rotation-y={-Math.PI / 2 - 0.1} receiveShadow><boxGeometry args={[26, 9, 0.6]} />{mat}</mesh>
      <mesh position={[0, 3.6, 13.5]} rotation-y={Math.PI} receiveShadow><boxGeometry args={[32, 9, 0.6]} />{mat}</mesh>
      {/* leaning monolith and a low plinth: the room's silhouette */}
      <mesh position={[-6.4, 2.4, -7.2]} rotation={[0.06, 0.5, -0.2]} castShadow receiveShadow><boxGeometry args={[3.4, 8, 0.9]} />{mat}</mesh>
      <mesh position={[6.8, 1.7, -8.2]} rotation={[0, -0.35, 0.08]} receiveShadow><boxGeometry args={[2.2, 6.5, 1]} />{mat}</mesh>
      <mesh position={[7.2, 0.22, 4.2]} receiveShadow><boxGeometry args={[2.6, 0.44, 6]} />{mat}</mesh>
    </group>
  )
}

/** Overhead rectangular light frame: draws one long line down the car. */
function Frame() {
  const m = useRef<THREE.MeshBasicMaterial>(null), b = useRef<THREE.MeshBasicMaterial>(null), r = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    m.current?.color.setRGB(1, 0.93, 0.82).multiplyScalar(0.25 + level.key * 4.2)
    b.current?.color.setRGB(1, 0.62, 0.24).multiplyScalar(0.4 + level.key * 1.6)
    r.current?.color.setRGB(0.9, 0.06, 0.05).multiplyScalar(0.5 + (1 - level.key) * 1.1)
  })
  const bars: [number, number, number, number][] = [[-1.5, 0, 0.07, 6.4], [1.5, 0, 0.07, 6.4], [0, -3.2, 3.07, 0.07], [0, 3.2, 3.07, 0.07]]
  const mat = <meshBasicMaterial ref={m} toneMapped={false} />
  return (
    <group>
      <group position={[0, 4.1, -0.2]} rotation-x={0.03}>
        {bars.map(([x, z, w, d], i) => <mesh key={i} position={[x, 0, z]}><boxGeometry args={[w, 0.05, d]} />{i === 0 ? mat : <SharedBasic src={m} />}</mesh>)}
        {[-1.5, 1.5].map((x) => [-2.4, 2.4].map((z) => <mesh key={`${x}${z}`} position={[x, 2, z]}><boxGeometry args={[0.012, 4, 0.012]} /><meshBasicMaterial color="#0c0c0c" /></mesh>))}
      </group>
      <mesh position={[-10.6, 2.6, -5.2]} rotation-y={0.1}><boxGeometry args={[0.05, 5.2, 0.16]} /><meshBasicMaterial ref={b} toneMapped={false} /></mesh>
      <mesh position={[0, 0.03, -10.6]}><boxGeometry args={[14, 0.03, 0.03]} /><meshBasicMaterial ref={r} toneMapped={false} /></mesh>
    </group>
  )
}
function SharedBasic({ src }: { src: React.RefObject<THREE.MeshBasicMaterial | null> }) {
  const r = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => { if (r.current && src.current) r.current.color.copy(src.current.color) })
  return <meshBasicMaterial ref={r} toneMapped={false} />
}

function Lights() {
  const q = QUALITY[useStore((s) => s.tier)]
  const key = useRef<THREE.SpotLight>(null), rim = useRef<THREE.SpotLight>(null), fill = useRef<THREE.SpotLight>(null)
  const wash = useRef<THREE.SpotLight>(null), wash2 = useRef<THREE.SpotLight>(null), hl = useRef<THREE.SpotLight>(null), tl = useRef<THREE.PointLight>(null)
  const t0 = useMemo(() => { const o = new THREE.Object3D(); o.position.set(0, 0.3, 0); return o }, [])
  const t1 = useMemo(() => { const o = new THREE.Object3D(); o.position.set(0, 0.0, 9); return o }, [])
  const t2 = useMemo(() => { const o = new THREE.Object3D(); o.position.set(-2, 1.5, -11); return o }, [])
  const t3 = useMemo(() => { const o = new THREE.Object3D(); o.position.set(-11, 1.5, -3); return o }, [])
  useFrame(({ scene }, dt) => {
    const s = useStore.getState(), d = Math.min(dt, 0.05)
    level.key = damp(level.key, 1, 5, d)
    const k = level.key
    scene.environmentIntensity = 0.12 + k * 0.85
    if (key.current) key.current.intensity = 300 * k
    if (rim.current) rim.current.intensity = 55 + 75 * k
    if (wash.current) wash.current.intensity = 10 + 46 * k
    if (wash2.current) wash2.current.intensity = 8 + 15 * k
    if (fill.current) fill.current.intensity = 34 * k
    const h = Number(s.head), tt = Number(s.tail)
    if (hl.current) hl.current.intensity = damp(hl.current.intensity, h * 60, 9, d)
    if (tl.current) tl.current.intensity = damp(tl.current.intensity, tt * 3.2, 9, d)
  })
  return (
    <>
      <primitive object={t0} /><primitive object={t2} /><primitive object={t3} /><primitive object={t1} />
      <spotLight ref={key} position={[-1.2, 6.6, 1.6]} target={t0} angle={0.62} penumbra={0.9} decay={2} color="#fff0da" castShadow={q.shadow > 0} shadow-mapSize={[q.shadow || 512, q.shadow || 512]} shadow-bias={-0.0004} shadow-normalBias={0.02} shadow-radius={7} shadow-camera-near={2} shadow-camera-far={12} />
      <spotLight ref={rim} position={[-7.5, 3.4, -6]} target={t0} angle={0.42} penumbra={1} decay={2} color="#ffb765" castShadow={q.shadow > 1024} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005} shadow-normalBias={0.03} shadow-camera-near={3} shadow-camera-far={16} />
      <spotLight ref={fill} position={[7, 2.6, 6.5]} target={t0} angle={0.55} penumbra={1} decay={2} color="#dfe3e6" />
      <spotLight ref={hl} position={[0, 0.59, 2.45]} target={t1} angle={0.62} penumbra={0.75} decay={1.6} distance={14} color="#ffdca8" intensity={0} />
      <spotLight ref={wash} position={[-3, 7.5, -5.5]} target={t2} angle={0.75} penumbra={1} decay={1.6} color="#e9d9bd" />
      <spotLight ref={wash2} position={[-8.2, 6.8, -1]} target={t3} angle={0.7} penumbra={1} decay={1.6} color="#ffbe78" />
      <pointLight position={[-10, 2.4, -5]} intensity={14} distance={9} decay={2} color="#ff9b3d" />
      <pointLight position={[1, 0.5, -9.8]} intensity={3.5} distance={7} decay={2} color="#e0231a" />
      <pointLight ref={tl} position={[0, 0.55, -3.3]} decay={2} distance={6} color="#ff2a18" intensity={0} />
    </>
  )
}

export function Studio() {
  return (
    <>
      <color attach="background" args={['#060605']} />
      <fogExp2 attach="fog" args={['#12100d', 0.034]} />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#020202']} />
        <Lightformer form="rect" intensity={7} color="#fff1dd" position={[-1.5, 4.2, 0]} rotation-x={Math.PI / 2} scale={[0.35, 7, 1]} />
        <Lightformer form="rect" intensity={7} color="#fff1dd" position={[1.5, 4.2, 0]} rotation-x={Math.PI / 2} scale={[0.35, 7, 1]} />
        <Lightformer form="rect" intensity={3} color="#fff1dd" position={[0, 4.2, 3.4]} rotation-x={Math.PI / 2} scale={[3, 0.3, 1]} />
        <Lightformer form="rect" intensity={4.5} color="#ffb061" position={[-9, 2.2, -4]} rotation-y={Math.PI / 2} scale={[1.2, 5, 1]} />
        <Lightformer form="rect" intensity={5} color="#eef0f0" position={[8, 1.7, 0]} rotation-y={-Math.PI / 2} scale={[11, 0.55, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#cfd4d8" position={[8.5, 3.6, 0]} rotation-y={-Math.PI / 2} scale={[12, 2, 1]} />
        <Lightformer form="rect" intensity={4} color="#ffd9a6" position={[-8, 1.5, 0]} rotation-y={Math.PI / 2} scale={[11, 0.45, 1]} />
        <Lightformer form="rect" intensity={2.6} color="#f3efe6" position={[0, 2.5, 10]} rotation-y={Math.PI} scale={[9, 0.7, 1]} />
        <Lightformer form="rect" intensity={2.4} color="#ffcf94" position={[0, 1.8, -10]} scale={[10, 0.6, 1]} />
      </Environment>
      <Lights /><Floor /><Walls /><Frame />
    </>
  )
}
