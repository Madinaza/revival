import { describe, expect, it } from 'vitest'
import { cents } from '../src/admin/Catalogue'
import { applyCatalog, applyDesign, total, useStore } from '../src/state/store'
import type { Catalog, Design, OptionItem } from '../src/api/client'

const item = (kind: OptionItem['kind'], code: string, priceCents: number): OptionItem => ({ id: 1, kind, code, name: code, priceCents, color: '#112233', metalness: 0, roughness: 0.4, clearcoat: 1, active: true, position: 0, version: 0 })
const catalog: Catalog = { BASE: [item('BASE', 'coupe', 1000)], PAINT: [item('PAINT', 'a', 10), item('PAINT', 'b', 20)], FINISH: [item('FINISH', 'gloss', 1)], WHEELS: [item('WHEELS', 'w', 2)] }
describe('prices', () => {
  it('reads amounts the way people type them', () => { expect(cents('1450')).toBe(145000); expect(cents('1450,50')).toBe(145050); expect(cents(' €1 450.5 ')).toBe(145050); for (const x of ['', 'abc', '-1', '1.234', '1e9', '99999999']) expect(cents(x)).toBeNull() })
  it('are unknown until the catalogue arrives, and add up after', () => { expect(total(useStore.getState())).toBeNull(); applyCatalog(catalog); expect(total(useStore.getState())).toBe(1000 + 10 + 1 + 2) })
  it('ignores a catalogue with nothing to choose from', () => { applyCatalog({ ...catalog, PAINT: [] }); expect(useStore.getState().paints).toHaveLength(2) })
  it('shows a withdrawn paint of a saved design, marked', () => {
    applyDesign({ code: 'X', paint: item('PAINT', 'old', 5), finish: catalog.FINISH[0], wheels: catalog.WHEELS[0], headlights: false, taillights: true, totalCents: 1, createdAt: '' } satisfies Design)
    const s = useStore.getState(); expect(s.paint).toMatchObject({ code: 'old', gone: true }); expect(s.paints).toHaveLength(3); expect(s.head).toBe(false)
  })
})
