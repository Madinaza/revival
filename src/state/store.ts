import { create } from 'zustand'
import type { Catalog, Design, OptionItem } from '../api/client'
export type Tier = 'high' | 'medium' | 'low'
export type Mode = 'film' | 'explore'
export interface Choice { code: string; name: string; price: number; gone?: boolean }
export interface Paint extends Choice { color: string; metal: number; rough: number; coat: number }
export interface Trim extends Choice { color: string; rough: number }
/** Used as they are when there is no API, and until its catalogue arrives. */
export const PAINTS: readonly Paint[] = [
  { code: 'obsidian', name: 'Obsidian', price: 0, color: '#0d0e11', metal: 0.2, rough: 0.34, coat: 1 },
  { code: 'ivory', name: 'Ivory', price: 0, color: '#cfc4ac', metal: 0, rough: 0.4, coat: 1 },
  { code: 'oxblood', name: 'Oxblood', price: 0, color: '#3a0508', metal: 0.4, rough: 0.34, coat: 1 },
  { code: 'bare-steel', name: 'Bare steel', price: 0, color: '#70757a', metal: 1, rough: 0.42, coat: 0.25 },
  { code: 'aged-brass', name: 'Aged brass', price: 0, color: '#7a5a26', metal: 1, rough: 0.36, coat: 0.6 },
]
export const FINISHES: readonly Choice[] = [{ code: 'gloss', name: 'Gloss', price: 0 }, { code: 'satin', name: 'Satin', price: 0 }]
export const TRIMS: readonly Trim[] = [
  { code: 'gunmetal', name: 'Gunmetal', price: 0, color: '#2a2b2d', rough: 0.34 }, { code: 'brass', name: 'Brass', price: 0, color: '#b08a48', rough: 0.26 }, { code: 'polished-steel', name: 'Polished steel', price: 0, color: '#b8babd', rough: 0.14 },
]
interface S {
  mode: Mode; tier: Tier; tierLocked: boolean; live: boolean; reduced: boolean; webgl: boolean
  paints: readonly Paint[]; finishes: readonly Choice[]; trims: readonly Trim[]
  /** Price of the car without options, in cents. Null when prices are unknown. */
  base: number | null
  paint: Paint; finish: Choice; trim: Trim; head: boolean; tail: boolean; hotspot: string | null; sound: boolean
  /** Pixels of the realtime view covered by the open panel: from the right edge, and from the bottom. */
  inset: readonly [number, number]
  /** Bumped to start the realtime view again from scratch. */
  attempt: number
  /** Why the realtime view gave up, shown in the film. */
  failure: string | null
  set: (p: Partial<S>) => void
}
export const useStore = create<S>((set) => ({
  mode: 'film', tier: 'high', tierLocked: false, live: false, reduced: false, webgl: true,
  paints: PAINTS, finishes: FINISHES, trims: TRIMS, base: null,
  paint: PAINTS[0], finish: FINISHES[0], trim: TRIMS[0], head: true, tail: true, hotspot: null, sound: false, inset: [0, 0], attempt: 0, failure: null, set: (p) => set(p),
}))

/** The realtime view failed. The first time it starts again at the lightest setting; after that the film carries on alone and says why. */
export function realtimeFailed(reason: string) {
  const s = useStore.getState()
  console.error('Realtime view failed:', reason)
  if (s.tier !== 'low') s.set({ tier: 'low', tierLocked: true, live: false, attempt: s.attempt + 1 })
  else s.set({ webgl: false, mode: 'film', live: false, failure: reason })
}
const choice = (o: OptionItem): Choice => ({ code: o.code, name: o.name, price: o.priceCents })
const paint = (o: OptionItem): Paint => ({ ...choice(o), color: o.color ?? '#808080', metal: o.metalness ?? 0, rough: o.roughness ?? 0.4, coat: o.clearcoat ?? 1 })
const trim = (o: OptionItem): Trim => ({ ...choice(o), color: o.color ?? '#808080', rough: o.roughness ?? 0.3 })
const keep = <T extends Choice>(list: readonly T[], now: T) => list.find((x) => x.code === now.code) ?? list[0]
export function applyCatalog(c: Catalog) {
  const s = useStore.getState(), paints = c.PAINT.map(paint), finishes = c.FINISH.map(choice), trims = c.WHEELS.map(trim)
  if (!paints.length || !finishes.length || !trims.length) return
  s.set({ paints, finishes, trims, base: c.BASE?.[0]?.priceCents ?? null, paint: keep(paints, s.paint), finish: keep(finishes, s.finish), trim: keep(trims, s.trim) })
}
/** Shows a saved design. An option that has since been withdrawn is still shown, but marked. */
export function applyDesign(d: Design) {
  const s = useStore.getState()
  const pick = <T extends Choice>(list: readonly T[], x: T): [readonly T[], T] => { const now = list.find((y) => y.code === x.code); return now ? [list, now] : [[...list, { ...x, gone: true }], { ...x, gone: true }] }
  const [paints, p] = pick(s.paints, paint(d.paint)), [finishes, f] = pick(s.finishes, choice(d.finish)), [trims, t] = pick(s.trims, trim(d.wheels))
  s.set({ paints, finishes, trims, paint: p, finish: f, trim: t, head: d.headlights, tail: d.taillights })
}
export const total = (s: Pick<S, 'base' | 'paint' | 'finish' | 'trim'>) => (s.base === null ? null : s.base + s.paint.price + s.finish.price + s.trim.price)
