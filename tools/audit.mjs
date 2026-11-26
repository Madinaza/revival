/** Accessibility, keyboard, reduced-motion and no-WebGL checks in real Chrome.
 *  PW=<path to playwright-core> node tools/audit.mjs [baseUrl] [screenshotDir]. Exits 1 if any check fails. */
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync } from 'node:fs'
const require = createRequire(import.meta.url), { chromium } = require(process.env.PW ?? 'playwright-core')
const base = process.argv[2] ?? 'http://localhost:4173/', out = process.argv[3], LEN = 11
if (out) mkdirSync(out, { recursive: true })
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
let failed = 0
const check = (name, ok, info = '') => { if (!ok) failed++; console.log(ok ? 'PASS' : 'FAIL', name, info) }
async function page(q = '', o = {}) {
  const c = await b.newContext({ viewport: { width: 1280, height: 800 }, ...o }), p = await c.newPage()
  p.errors = []
  p.on('pageerror', (e) => p.errors.push(e.message)); p.on('console', (m) => m.type() === 'error' && p.errors.push(m.text()))
  await p.goto(base + q); await p.waitForSelector('.loader.is-done', { timeout: 60000, state: 'attached' }); await p.waitForTimeout(1000)
  return p
}
const runAxe = async (p, n) => {
  await p.evaluate(axe)
  const r = await p.evaluate(() => axe.run({ runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }))
  check(`axe ${n}`, !r.violations.length, `${r.passes.length} rules pass; violations: ${r.violations.map((v) => `${v.id} ${v.nodes[0].target}`).join(', ') || 'none'}; needs manual review: ${r.incomplete.map((v) => `${v.id}(${v.nodes.length})`).join(', ') || 'none'}`)
}
const to = (p, t) => p.evaluate(([t, l]) => scrollTo(0, t * l * innerHeight), [t, LEN])
const pixels = (p) => p.evaluate(() => document.querySelector('.screen canvas').toDataURL()).then((x) => createHash('sha1').update(x).digest('hex'))
const pressed = (p, label) => p.locator('button', { hasText: new RegExp(`^${label}$`) }).first().getAttribute('aria-pressed')

let p = await page()
await runAxe(p, 'film, top'); await to(p, 1); await p.waitForTimeout(1500); await runAxe(p, 'film, end'); await to(p, 0); await p.waitForTimeout(500)
await p.focus('.pull input'); for (let i = 0; i < 30; i++) await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400)
check('arrow keys on the slider scroll the film', (await p.evaluate(() => scrollY)) > 0)
await to(p, 0.62); await p.waitForTimeout(900); const y0 = await p.evaluate(() => scrollY)
await p.locator('.bar .link').focus(); await p.keyboard.press('Enter'); await p.waitForSelector('.explore', { timeout: 60000 }); await p.waitForTimeout(1500)
check('focus moves into the realtime view', (await p.evaluate(() => document.activeElement.textContent)) === 'Back to the film')
await runAxe(p, 'explore')
const seen = []; for (let i = 0; i < 24; i++) { await p.keyboard.press('Tab'); seen.push(await p.evaluate(() => ({ t: (document.activeElement.closest('label') ?? document.activeElement).textContent.trim().slice(0, 18), film: !!document.activeElement.closest('main.film') }))) }
check('Tab never reaches the hidden film', !seen.some((s) => s.film), seen.slice(0, 18).map((s) => s.t).join(' > '))
for (const label of ['Headlights', 'Taillights', 'Engine sound']) { const a = await pressed(p, label); await p.locator('button', { hasText: new RegExp(`^${label}$`) }).first().click(); await p.waitForTimeout(400); const z = await pressed(p, label); check(`${label} toggles`, a !== z, `${a} -> ${z}`) }
check('Rev is available once sound is on', await p.locator('button', { hasText: /^Rev$/ }).isEnabled())
const spot = await p.evaluate(() => { const e = [...document.querySelectorAll('.spot')].find((x) => x.style.visibility === 'visible' && document.elementFromPoint(x.getBoundingClientRect().x + 22, x.getBoundingClientRect().y + 22) === x); const r = e?.getBoundingClientRect(); return r && [r.x + 22, r.y + 22] })
if (spot) await p.mouse.click(...spot); await p.waitForTimeout(400); if (out) await p.screenshot({ path: `${out}/explore.jpg`, quality: 84 })
check('a marker on the car opens its note', (await p.locator('.note').count()) === 1)
await p.keyboard.press('Escape'); await p.waitForTimeout(300); check('Escape closes the note first', !(await p.locator('.note').count()) && (await p.locator('.explore').count()) === 1)
await p.keyboard.press('Escape'); await p.waitForTimeout(900)
check('Escape returns to the film', !(await p.locator('.explore').count()))
check('the film resumes at the same scroll position', Math.abs((await p.evaluate(() => scrollY)) - y0) < 3, `${y0} -> ${await p.evaluate(() => scrollY)}`)
await to(p, 0); await p.waitForTimeout(1500); const top = await pixels(p)
await p.locator('.bar .link').click(); await p.waitForSelector('.explore'); await p.waitForTimeout(1200); await p.keyboard.press('Escape'); await p.waitForTimeout(1800)
check('the realtime view can be entered again', (await p.locator('.bar .link').count()) === 1)
check('returning at the very top shows the opening frame again', (await pixels(p)) === top)
check('no console errors', !p.errors.length, p.errors.slice(0, 3).join(' | '))

p = await page('', { reducedMotion: 'reduce' })
await to(p, 0.5); await p.waitForTimeout(1200); const a = await pixels(p); await to(p, 0.53); await p.waitForTimeout(1200); const c = await pixels(p); await to(p, 0.78); await p.waitForTimeout(1200); const d = await pixels(p)
check('reduced motion: frame holds within a chapter', a === c); check('reduced motion: frame changes between chapters', a !== d)
if (out) await p.screenshot({ path: `${out}/reduced.jpg`, quality: 84 })

p = await page('?nowebgl'); await to(p, 1); await p.waitForTimeout(1500)
check('no WebGL: film works without the realtime entry', !(await p.locator('.bar .link, .cta').count()) && (await p.locator('h1').count()) === 1)
check('no WebGL: three.js is not downloaded', !(await p.evaluate(() => performance.getEntriesByType('resource').some((r) => /Scene-|car\.glb/.test(r.name)))))
await runAxe(p, 'no WebGL')
if (out) await p.screenshot({ path: `${out}/fallback.jpg`, quality: 84 })
await b.close()
console.log(failed ? `${failed} check(s) failed` : 'all checks passed'); process.exit(failed ? 1 : 0)
