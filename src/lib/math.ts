export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a))
export const smooth = (t: number) => t * t * (3 - 2 * t)
export const ramp = (a: number, b: number, v: number) => smooth(invLerp(a, b, v))
/** Frame-rate independent damping. */
export const damp = (c: number, t: number, lambda: number, dt: number) => lerp(c, t, 1 - Math.exp(-lambda * dt))
export type V3 = readonly [number, number, number]
/** Catmull-Rom through keyed values with non-uniform times, clamped at both ends. */
export function spline(keys: readonly { t: number; v: V3 }[], t: number, out: [number, number, number]) {
  const n = keys.length
  let i = 0
  while (i < n - 2 && t > keys[i + 1].t) i++
  const u = smooth(invLerp(keys[i].t, keys[i + 1].t, t))
  const p0 = keys[Math.max(0, i - 1)].v, p1 = keys[i].v, p2 = keys[i + 1].v, p3 = keys[Math.min(n - 1, i + 2)].v
  for (let k = 0; k < 3; k++) {
    const m1 = (p2[k] - p0[k]) * 0.3, m2 = (p3[k] - p1[k]) * 0.3, u2 = u * u, u3 = u2 * u
    out[k] = (2 * u3 - 3 * u2 + 1) * p1[k] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[k] + (u3 - u2) * m2
  }
  return out
}
