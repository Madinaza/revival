import { clamp, invLerp, lerp } from '../lib/math'
export const FRAMES = 320
export const LENGTH = 11 // viewport heights of scroll travel
export const REVEAL_END = 0.34
/** First frame of each shot after a hard cut. These must never be interpolated across. */
export const CUTS = [281, 305]
/** Which shot a (fractional) frame belongs to. */
export const shot = (f: number) => CUTS.filter((c) => f >= c - 0.5).length
/** Scroll position to 0..1. A page opened in a hidden tab can report a viewport height of 0. */
export const progress = (y: number, vh: number) => (vh > 0 ? clamp(y / (LENGTH * vh)) : 0)
/** Scroll (0..1) to frame. Flat stretches are where a chapter holds. */
const MAP: readonly [number, number][] = [[0, 0], [0.34, 150], [0.455, 186], [0.505, 190], [0.6, 230], [0.645, 234], [0.765, 266], [0.838, 280], [0.841, 281], [0.89, 300], [0.925, 304], [0.928, 305], [1, 319]]
export function frameAt(s: number): number {
  const t = clamp(s)
  let i = 0
  while (i < MAP.length - 2 && t > MAP[i + 1][0]) i++
  return lerp(MAP[i][1], MAP[i + 1][1], invLerp(MAP[i][0], MAP[i + 1][0], t))
}
/** Upright screens: height of the film band as a share of its width, per frame, so the car's ends stay in view. A full 16:9 frame is 0.5625. */
const BAND: readonly [number, number][] = [[0, 0.74], [60, 0.8], [150, 0.86], [186, 0.95], [190, 0.95], [226, 0.68], [236, 0.68], [266, 0.95], [280, 0.95], [281, 0.68], [304, 0.8], [305, 0.86], [319, 0.86]]
export function band(f: number): number {
  let i = 0
  while (i < BAND.length - 2 && f >= BAND[i + 1][0]) i++
  return lerp(BAND[i][1], BAND[i + 1][1], invLerp(BAND[i][0], BAND[i + 1][0], f))
}
/** Coarse-to-fine download order: the film is scrubbable after ~20 frames and sharpens in time as the rest arrive. */
export function loadOrder(n = FRAMES): number[] {
  const seen = new Set<number>(), out: number[] = []
  const add = (f: number) => { if (f < n && !seen.has(f)) { seen.add(f); out.push(f) } }
  add(0); add(n - 1)
  for (const step of [16, 8, 4, 2, 1]) for (let f = 0; f < n; f += step) add(f)
  return out
}
export function nearest(has: (f: number) => boolean, f: number, n = FRAMES): number {
  const c = clamp(Math.round(f), 0, n - 1)
  for (let d = 0; d < n; d++) { if (c - d >= 0 && has(c - d)) return c - d; if (c + d < n && has(c + d)) return c + d }
  return -1
}
