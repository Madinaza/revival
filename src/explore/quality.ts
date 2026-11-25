import type { Tier } from '../state/store'
export interface Quality { dpr: number; shadow: number; reflections: boolean; post: boolean; dust: number; beams: boolean }
export const QUALITY: Record<Tier, Quality> = {
  high: { dpr: 2, shadow: 2048, reflections: true, post: true, dust: 520, beams: true },
  medium: { dpr: 1.5, shadow: 1024, reflections: false, post: true, dust: 220, beams: true },
  low: { dpr: 1, shadow: 0, reflections: false, post: false, dust: 0, beams: false },
}
