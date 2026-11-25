import { describe, expect, it } from 'vitest'
import { CUTS, FRAMES, REVEAL_END, frameAt, loadOrder, nearest, progress, shot } from '../src/film/timeline'
import { fitFov } from '../src/lib/fov'
import { START } from '../src/explore/start'
import { readFileSync } from 'node:fs'

describe('timeline', () => {
  it('spans the whole film and never runs backwards', () => {
    expect(frameAt(0)).toBe(0); expect(frameAt(1)).toBe(FRAMES - 1); expect(frameAt(-3)).toBe(0); expect(frameAt(9)).toBe(FRAMES - 1)
    for (let s = 0, p = -1; s <= 1; s += 0.001) { const f = frameAt(s); expect(f).toBeGreaterThanOrEqual(p); p = f }
  })
  it('survives a viewport with no height', () => { expect(progress(0, 0)).toBe(0); expect(progress(500, 0)).toBe(0); expect(progress(4400, 800)).toBeCloseTo(0.5); expect(progress(1e9, 800)).toBe(1) })
  it('finishes the reveal exactly where the slider ends', () => { expect(frameAt(REVEAL_END)).toBe(150) })
  it('passes over the camera cuts in a sliver of scroll', () => { expect(frameAt(0.838)).toBe(280); expect(frameAt(0.841)).toBe(281); expect(frameAt(0.925)).toBe(304); expect(frameAt(0.928)).toBe(305) })
  it('agrees with Blender on where the cuts are', () => { const py = readFileSync('blender/film.py', 'utf8'); expect(CUTS).toEqual([Number(/k\[0\]<(\d+)\)==/.exec(py)![1]), Number(/^CUT=(\d+)/m.exec(py)![1])]); expect(shot(280)).toBe(0); expect(shot(281)).toBe(1); expect(shot(305)).toBe(2) })
})
describe('loading', () => {
  it('requests every frame once, coarse first', () => {
    const o = loadOrder(); expect(new Set(o).size).toBe(FRAMES); expect(o.length).toBe(FRAMES); expect(o[0]).toBe(0)
    expect([...o.slice(0, 21)].sort((a, b) => a - b).every((f) => f % 16 === 0 || f === FRAMES - 1)).toBe(true)
  })
  it('falls back to the closest available frame', () => {
    const have = new Set([0, 16, 32]); expect(nearest((f) => have.has(f), 17)).toBe(16); expect(nearest((f) => have.has(f), 25)).toBe(32); expect(nearest(() => false, 5)).toBe(-1); expect(nearest((f) => have.has(f), 9999)).toBe(32)
  })
})
describe('handover', () => {
  it('starts the realtime camera where the path-traced film ends', () => {
    const py = readFileSync('blender/film.py', 'utf8'), m = /\(319,\(([^)]+)\),\(([^)]+)\),(\d+)/.exec(py)!
    const [px, pyy, pz] = m[1].split(',').map(Number), [lx, ly, lz] = m[2].split(',').map(Number)
    expect([px, pz, -pyy]).toEqual([...START.pos]); expect([lx, lz, -ly].map((v) => v + 0)).toEqual([...START.look]); expect(Number(m[3])).toBe(START.fov)
  })
  it('widens the lens on portrait screens only', () => { expect(fitFov(36, 1.78)).toBe(36); expect(fitFov(36, 0.46)).toBeGreaterThan(50) })
})
