import { create } from 'zustand'
export type Tier = 'high' | 'medium' | 'low'
export type Mode = 'film' | 'explore'
export interface Paint { name: string; color: string; metal: number; rough: number; coat: number }
export const PAINTS: readonly Paint[] = [
  { name: 'Obsidian', color: '#0d0e11', metal: 0.2, rough: 0.34, coat: 1 },
  { name: 'Ivory', color: '#cfc4ac', metal: 0, rough: 0.4, coat: 1 },
  { name: 'Oxblood', color: '#3a0508', metal: 0.4, rough: 0.34, coat: 1 },
  { name: 'Bare steel', color: '#70757a', metal: 1, rough: 0.42, coat: 0.25 },
  { name: 'Aged brass', color: '#7a5a26', metal: 1, rough: 0.36, coat: 0.6 },
]
export const FINISHES = ['Gloss', 'Satin'] as const
export const TRIMS = [
  { name: 'Gunmetal', color: '#2a2b2d', rough: 0.34 }, { name: 'Brass', color: '#b08a48', rough: 0.26 }, { name: 'Polished steel', color: '#b8babd', rough: 0.14 },
] as const
interface S {
  mode: Mode; tier: Tier; tierLocked: boolean; live: boolean; reduced: boolean; webgl: boolean
  paint: number; finish: number; trim: number; head: boolean; tail: boolean; hotspot: string | null; sound: boolean
  set: (p: Partial<S>) => void
}
export const useStore = create<S>((set) => ({
  mode: 'film', tier: 'high', tierLocked: false, live: false, reduced: false, webgl: true,
  paint: 0, finish: 0, trim: 0, head: true, tail: true, hotspot: null, sound: false, set: (p) => set(p),
}))
