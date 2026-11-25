import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { damp } from '../lib/math'
import { useStore } from '../state/store'
import { QUALITY } from './quality'

const beamVert = /* glsl */ `varying vec3 vP; varying vec3 vN; varying vec3 vV; varying float vL; varying float vD;
void main(){ vL = uv.y; vec4 w = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-w.xyz); vP = (modelMatrix*vec4(position,1.0)).xyz; vD = -w.z; gl_Position = projectionMatrix * w; }`
const beamFrag = /* glsl */ `varying vec3 vP; varying vec3 vN; varying vec3 vV; varying float vL; varying float vD; uniform float uI, uT; uniform vec3 uC;
float h(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
float n(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
void main(){ float edge = pow(abs(dot(vN, vV)), 2.2); float fall = pow(vL, 2.0);
 float s = 0.55 + 0.6 * n(vP * 1.3 + vec3(0., -uT * .12, uT * .2)); gl_FragColor = vec4(uC * uI * edge * fall * s * smoothstep(0.8, 3.2, vD), 1.0); }`

/** Headlight shafts: open cones with view-dependent falloff, cheaper than raymarching and stable on mobile. */
function Beams() {
  const uniforms = useMemo(() => ({ uI: { value: 0 }, uT: { value: 0 }, uC: { value: new THREE.Color('#ffd29a') } }), [])
  const geo = useMemo(() => { const g = new THREE.ConeGeometry(0.75, 3.4, 48, 1, true); g.translate(0, -1.7, 0); g.rotateX(-Math.PI / 2); return g }, [])
  const grp = useRef<THREE.Group>(null)
  useFrame(({ clock }, dt) => {
    const s = useStore.getState()
    uniforms.uT.value = s.reduced ? 0 : clock.elapsedTime
    uniforms.uI.value = damp(uniforms.uI.value, Number(s.head) * 0.12, 8, Math.min(dt, 0.05))
    if (grp.current) grp.current.visible = uniforms.uI.value > 0.003
  })
  return (
    <group ref={grp}>
      {[-0.58, 0.58].map((x) => (
        <mesh key={x} geometry={geo} position={[x, 0.59, 2.3]} rotation-x={0.035}>
          <shaderMaterial vertexShader={beamVert} fragmentShader={beamFrag} uniforms={uniforms} transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  )
}

function Dust({ count }: { count: number }) {
  const uniforms = useMemo(() => ({ uT: { value: 0 }, uPx: { value: 1 } }), [])
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry(), p = new Float32Array(count * 3), s = new Float32Array(count)
    let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < count; i++) { p.set([(r() - 0.5) * 11, r() * 4, (r() - 0.5) * 13], i * 3); s[i] = r() }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aS', new THREE.BufferAttribute(s, 1))
    return g
  }, [count])
  useFrame(({ clock, gl }) => { uniforms.uT.value = useStore.getState().reduced ? 0 : clock.elapsedTime; uniforms.uPx.value = gl.getPixelRatio() })
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending}
        vertexShader={/* glsl */ `attribute float aS; uniform float uT, uPx; varying float vA;
          void main(){ vec3 p = position; float t = uT * (.03 + aS * .05); p.x += sin(t*2.+aS*40.)*.5; p.y = mod(p.y + t*.6, 4.0); p.z += cos(t*1.7+aS*70.)*.5;
          vec4 v = modelViewMatrix * vec4(p,1.); vA = (.25+.75*aS) * smoothstep(0.,.6,p.y) * smoothstep(4.,2.6,p.y) * smoothstep(.6,2.2,-v.z); gl_PointSize = uPx * (1.2 + aS*2.2) * 5.0 / -v.z; gl_Position = projectionMatrix * v; }`}
        fragmentShader={/* glsl */ `varying float vA; void main(){ float d = length(gl_PointCoord-.5); gl_FragColor = vec4(vec3(1.,.88,.68) * smoothstep(.5,.0,d) * vA * .22, 1.); }`} />
    </points>
  )
}
export function Atmosphere() {
  const q = QUALITY[useStore((s) => s.tier)]
  return <>{q.beams && <Beams />}{q.dust > 0 && <Dust count={q.dust} />}</>
}
