/** Records the demo video from the running site, in real Chrome.
 *  PW=<path to playwright-core> node tools/demo.mjs <out.mp4> [baseUrl]   (needs ffmpeg)
 *  Film part: the scroll is stepped and captured frame by frame, so it is smooth regardless of machine speed.
 *  Realtime part: streamed by Chrome with real timestamps, so its pace is true. No sound. */
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const { chromium } = createRequire(import.meta.url)(process.env.PW ?? 'playwright-core'), out = process.argv[2] ?? 'demo.mp4', base = process.argv[3] ?? 'http://localhost:4173/'
const FPS = 30, LEN = 11, FILM_SECONDS = 30, dir = mkdtempSync(join(tmpdir(), 'demo-')), list = []
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'] })
const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage()
await p.goto(base); await p.waitForSelector('.loader.is-done', { state: 'attached' })
await p.waitForFunction(() => __film.stats.loaded >= 320, null, { timeout: 120000 }); await p.waitForTimeout(800)
let n = 0
const shot = async (dur) => { const f = join(dir, `${String(n++).padStart(5, '0')}.jpg`); await p.screenshot({ path: f, quality: 92, type: 'jpeg' }); list.push([f, dur]) }
// The film player eases towards the scroll position in wall time, so wait for it to settle on each step.
const total = FILM_SECONDS * FPS
for (let i = 0; i < total; i++) {
  await p.evaluate(([t, l]) => scrollTo({ top: t * l * innerHeight, behavior: 'instant' }), [i / (total - 1), LEN])
  await p.waitForTimeout(90); await shot(1 / FPS)
}
await p.locator('.bar .link').click(); await p.waitForSelector('.explore'); await p.waitForTimeout(1500)
const press = (label) => p.locator('.panel label, .panel button', { hasText: new RegExp(`^${label}$`) }).first().click()
const steps = [[1.5, () => press('Oxblood')], [4, () => press('Brass')], [6.5, () => press('Ivory')], [9, () => press('Headlights')], [11, () => press('Taillights')], [13, () => press('Hood scoop')]]
// Chrome streams its own frames here, each with a timestamp.
const cdp = await p.context().newCDPSession(p), cast = []
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => { const f = join(dir, `c${String(cast.length).padStart(5, '0')}.jpg`); writeFileSync(f, Buffer.from(data, 'base64')); cast.push([f, metadata.timestamp]); void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {}) })
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1600, maxHeight: 900 })
const t0 = Date.now(); let at = 0, x = 520
await p.mouse.move(x, 420); await p.mouse.down()
while (Date.now() - t0 < 17000) {
  const s = (Date.now() - t0) / 1000
  if (at < steps.length && s > steps[at][0]) { await p.mouse.up(); await steps[at++][1](); await p.mouse.move(x = 520, 420); await p.mouse.down() }
  await p.mouse.move((x -= 0.55), 420); await p.waitForTimeout(12)
}
await p.mouse.up(); await cdp.send('Page.stopScreencast'); await b.close()
cast.forEach(([f, t], i) => list.push([f, i + 1 < cast.length ? cast[i + 1][1] - t : 1]))
console.log(`film ${total} frames, realtime ${cast.length} frames, ${(cast.length / 17).toFixed(1)} fps captured`)
writeFileSync(join(dir, 'l.txt'), list.map(([f, d]) => `file '${f}'\nduration ${d.toFixed(5)}`).join('\n') + `\nfile '${list.at(-1)[0]}'\n`)
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(dir, 'l.txt'), '-vf', `fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-crf', '20', '-preset', 'slow', '-movflags', '+faststart', out])
rmSync(dir, { recursive: true }); console.log('wrote', out)
