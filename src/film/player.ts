import { damp } from '../lib/math'
import { frameAt, shot, loadOrder, nearest } from './timeline'

/** Draws a scroll-scrubbed image sequence. Compressed frames stay in memory; only a small window is decoded. */
export class FilmPlayer {
  target = 0
  private cur = 0
  private blobs = new Map<number, Blob>()
  private bitmaps = new Map<number, ImageBitmap>()
  private decoding = new Set<number>()
  private drawn = -1
  private raf = 0
  private last = 0
  private abort = new AbortController()
  private g: CanvasRenderingContext2D
  readonly stats = { loaded: 0, bytes: 0, decodes: 0, drawMs: [] as number[], ticks: [] as number[] }
  constructor(private canvas: HTMLCanvasElement, private dir: string, private o: { window: number; smooth: boolean; onFirst: () => void; onProgress: (n: number) => void }) {
    this.g = canvas.getContext('2d', { alpha: false })!
    void this.load(); this.raf = requestAnimationFrame(this.tick)
  }
  private async load() {
    const q = loadOrder(); let i = 0
    const worker = async () => {
      while (i < q.length && !this.abort.signal.aborted) {
        const f = q[i++]
        try {
          const r = await fetch(`${this.dir}/${String(f).padStart(4, '0')}.webp`, { signal: this.abort.signal })
          if (!r.ok || !r.headers.get('content-type')?.startsWith('image/')) continue
          const b = await r.blob(); this.blobs.set(f, b); this.stats.loaded++; this.stats.bytes += b.size
          this.o.onProgress(this.stats.loaded)
        } catch { if (this.abort.signal.aborted) return }
      }
    }
    await Promise.all(Array.from({ length: 6 }, worker))
  }
  private decode(f: number) {
    const b = this.blobs.get(f)
    if (!b || this.bitmaps.has(f) || this.decoding.has(f) || this.decoding.size >= 6) return
    this.decoding.add(f)
    createImageBitmap(b).then((m) => { if (this.abort.signal.aborted) m.close(); else { this.bitmaps.set(f, m); this.stats.decodes++; this.trim() } }, () => this.blobs.delete(f)).finally(() => this.decoding.delete(f))
  }
  private trim() {
    if (this.bitmaps.size <= this.o.window) return
    const c = this.cur, far = [...this.bitmaps.keys()].sort((a, b) => Math.abs(b - c) - Math.abs(a - c))
    for (const f of far.slice(0, this.bitmaps.size - this.o.window)) { this.bitmaps.get(f)!.close(); this.bitmaps.delete(f) }
  }
  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick)
    const dt = Math.min(0.05, (now - this.last) / 1000); if (this.last) { this.stats.ticks.push(now - this.last); if (this.stats.ticks.length > 600) this.stats.ticks.shift() } this.last = now
    const goal = frameAt(this.target), prev = this.cur
    const crossesCut = shot(prev) !== shot(goal)
    this.cur = !this.o.smooth || crossesCut ? goal : damp(prev, goal, 7, dt)
    const f = Math.round(this.cur), dir = Math.sign(goal - this.cur) || 1
    for (const d of [0, 1, 2, 3, 4, 5, -1, -2]) { const k = nearest((x) => this.blobs.has(x), f + d * dir); if (k >= 0) this.decode(k) }
    const show = nearest((x) => this.bitmaps.has(x), f)
    if (show >= 0 && show !== this.drawn) {
      const t = performance.now(), b = this.bitmaps.get(show)!
      if (this.canvas.width !== b.width) { this.canvas.width = b.width; this.canvas.height = b.height }
      this.g.drawImage(b, 0, 0); if (this.drawn < 0) this.o.onFirst(); this.drawn = show
      this.stats.drawMs.push(performance.now() - t); if (this.stats.drawMs.length > 300) this.stats.drawMs.shift()
    }
  }
  get frame() { return this.drawn }
  dispose() { cancelAnimationFrame(this.raf); this.abort.abort(); this.bitmaps.forEach((b) => b.close()); this.bitmaps.clear(); this.blobs.clear() }
}
