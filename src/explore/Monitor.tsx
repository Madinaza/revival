import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useStore, type Tier } from '../state/store'
import { QUALITY } from './quality'
const NEXT: Record<Tier, Tier> = { high: 'medium', medium: 'low', low: 'low' }
export interface Stats { frames: number[]; calls: number; triangles: number; geometries: number; textures: number; programs: number; tier: Tier; dpr: number; gpu: string }
declare global { interface Window { __revival?: Stats } }

/** Steps quality down after sustained slow frames. Never steps up, so it cannot oscillate. */
export function Monitor() {
  const gl = useThree((s) => s.gl), setDpr = useThree((s) => s.setDpr), tier = useStore((s) => s.tier)
  const win = useRef<number[]>([]), slow = useRef(0), t0 = useRef(0)
  useEffect(() => { setDpr(Math.min(devicePixelRatio, QUALITY[tier].dpr)); win.current = []; slow.current = 0; t0.current = performance.now() }, [tier, setDpr])
  useEffect(() => {
    gl.info.autoReset = false
    const ext = gl.getContext().getExtension('WEBGL_debug_renderer_info')
    window.__revival = { frames: [], calls: 0, triangles: 0, geometries: 0, textures: 0, programs: 0, tier, dpr: 1, gpu: ext ? String(gl.getContext().getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'n/a' }
  }, [gl]) // eslint-disable-line
  useFrame((_, dt) => {
    const st = window.__revival
    if (st) {
      st.frames.push(dt * 1000); if (st.frames.length > 600) st.frames.shift()
      Object.assign(st, { calls: gl.info.render.calls, triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, programs: gl.info.programs?.length ?? 0, tier, dpr: gl.getPixelRatio() })
    }
    gl.info.reset()
    if (useStore.getState().tierLocked || document.hidden || performance.now() - t0.current < 2500) return
    win.current.push(dt)
    if (win.current.length < 60) return
    const med = win.current.sort((a, b) => a - b)[30]; win.current = []
    slow.current = med > 0.024 ? slow.current + 1 : 0
    if (slow.current >= 2) useStore.getState().set({ tier: NEXT[tier] })
  }, -100)
  return null
}
