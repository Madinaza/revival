import { clamp } from './math'
/** Portrait screens keep the same horizontal framing as a 16:10 window, up to a limit. */
export function fitFov(fov: number, aspect: number) {
  if (aspect >= 1.5) return fov
  const h = 2 * Math.atan(Math.tan((fov * Math.PI) / 360) * 1.5)
  return clamp((2 * Math.atan(Math.tan(h / 2) / aspect) * 180) / Math.PI, fov, 66)
}

