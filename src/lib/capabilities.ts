import type { Tier } from '../state/store'
export function hasWebGL2(): boolean {
  if (new URLSearchParams(location.search).has('nowebgl')) return false
  try { return !!document.createElement('canvas').getContext('webgl2') } catch { return false }
}
export function initialTier(): Tier {
  const q = new URLSearchParams(location.search).get('tier')
  if (q === 'high' || q === 'medium' || q === 'low') return q
  const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 8
  const coarse = matchMedia('(pointer: coarse)').matches
  if (mem <= 2) return 'low'
  return coarse || mem <= 4 || navigator.hardwareConcurrency <= 4 ? 'medium' : 'high'
}
export const tierLocked = () => new URLSearchParams(location.search).has('tier')
