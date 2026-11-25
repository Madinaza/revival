/** Real-browser verification: screenshots, frame timings, console errors.
 *  PW=<path to playwright-core> node tools/capture.mjs <outDir> [baseUrl] */
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
const { chromium } = createRequire(import.meta.url)(process.env.PW ?? 'playwright-core'), out = process.argv[2], base = process.argv[3] ?? 'http://localhost:4173/'
mkdirSync(out, { recursive: true })
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'] })
const CASES = { desktop: { viewport: { width: 1440, height: 810 } }, mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } }
const T = [0, 0.16, 0.3, 0.48, 0.62, 0.7, 0.78, 0.905, 1], LEN = 11, q = (a, k) => +[...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * k)].toFixed(1), report = {}
for (const [name, c] of Object.entries(CASES)) {
  const ctx = await b.newContext(c), p = await ctx.newPage(), errors = []
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160))); p.on('pageerror', (e) => errors.push('PAGE ' + e.message.slice(0, 300)))
  await p.goto(base); await p.waitForSelector('.loader.is-done', { timeout: 60000, state: 'attached' }); const first = Math.round(await p.evaluate(() => performance.now()))
  const total = await p.evaluate(async () => { for (let i = 0; i < 600 && __film.stats.loaded < 320; i++) await new Promise((r) => setTimeout(r, 100)); return { ms: Math.round(performance.now()), n: __film.stats.loaded, mb: +(__film.stats.bytes / 1e6).toFixed(1) } })
  for (const t of T) { await p.evaluate(([t, l]) => scrollTo(0, t * l * innerHeight), [t, LEN]); await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/${name}_${t}.jpg`, quality: 84 }) }
  // continuous scrub, top to bottom in 12 s, as a reader would
  const scrub = await p.evaluate(async (l) => { __film.stats.ticks.length = 0; __film.stats.drawMs.length = 0; const shown = new Set(), t0 = performance.now(); await new Promise((r) => { const f = () => { const t = (performance.now() - t0) / 12000; scrollTo(0, Math.min(1, t) * l * innerHeight); shown.add(__film.frame); t < 1 ? requestAnimationFrame(f) : r() }; f() }); return { ticks: [...__film.stats.ticks], draw: [...__film.stats.drawMs], shown: shown.size } }, LEN)
  await p.evaluate(() => document.querySelector('.bar .link').click()); const t1 = Date.now(); await p.waitForSelector('.explore', { timeout: 60000 }); const enter = Date.now() - t1; await p.waitForTimeout(2600)
  await p.screenshot({ path: `${out}/${name}_explore.jpg`, quality: 84 })
  const live = await p.evaluate(async () => { __revival.frames.length = 0; await new Promise((r) => setTimeout(r, 4000)); return { f: [...__revival.frames], calls: __revival.calls, tris: __revival.triangles, tier: __revival.tier, dpr: __revival.dpr, gpu: __revival.gpu } })
  report[name] = { firstFrameMs: first, filmLoaded: total, scrub: { framesShown: scrub.shown, tickP50: q(scrub.ticks, 0.5), tickP95: q(scrub.ticks, 0.95), tickMax: q(scrub.ticks, 1), drawP95: q(scrub.draw, 0.95) }, enterMs: enter, live: { p50: q(live.f, 0.5), p95: q(live.f, 0.95), max: q(live.f, 1), calls: live.calls, tris: live.tris, tier: live.tier, dpr: live.dpr, gpu: live.gpu }, errors: [...new Set(errors)], overflow: await p.evaluate(() => document.documentElement.scrollWidth > innerWidth) }
  console.log(name, JSON.stringify(report[name])); await ctx.close()
}
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1)); await b.close()
