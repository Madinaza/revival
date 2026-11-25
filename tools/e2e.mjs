/** End-to-end check of the running stack (docker compose up) in real Chrome. Leaves one test request behind, and restores the prices it changes.
 *  PW=<path to playwright-core> node tools/e2e.mjs [baseUrl] [screenshotDir] */
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync } from 'node:fs'
const require = createRequire(import.meta.url), { chromium } = require(process.env.PW ?? 'playwright-core'), base = process.argv[2] ?? 'http://localhost:8090/', out = process.argv[3]
if (out) mkdirSync(out, { recursive: true })
const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter(Boolean).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'] })
let failed = 0
const check = (name, ok, info = '') => { if (!ok) failed++; console.log(ok ? 'PASS' : 'FAIL', name, info) }
const open = async (path = '', o = {}) => { const c = await b.newContext({ viewport: { width: 1440, height: 900 }, ...o }), p = await c.newPage(); p.errors = []; p.on('pageerror', (e) => p.errors.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/status of 4\d\d/.test(m.text()) && p.errors.push(m.text())); p.setDefaultTimeout(20000); await p.goto(base + path); return p }
const shot = (p, n) => out && p.screenshot({ path: `${out}/${n}.jpg`, quality: 84 })
const runAxe = async (p, n) => { await p.waitForTimeout(400); await p.evaluate(axe); const r = await p.evaluate(() => axe.run({ runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })); check(`axe ${n}`, !r.violations.length, r.violations.map((v) => `${v.id}: ${v.nodes[0].target}`).join(' | ')) }
const wide = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth)
const num = (t) => Number(t.replace(/[^\d]/g, ''))

// Visitor
let p = await open(''); await p.waitForSelector('.loader.is-done', { state: 'attached' })
await p.locator('.bar .link').click(); await p.waitForSelector('.order .total'); await p.waitForTimeout(3000)
const before = num(await p.locator('.total strong').textContent())
await p.locator('.panel label', { hasText: /^Oxblood$/ }).click()
check('choosing a paint changes the total', num(await p.locator('.total strong').textContent()) === before + 2400, `${before} -> ${await p.locator('.total strong').textContent()}`)
await p.locator('.order button', { hasText: 'Save and copy link' }).click(); const link = await p.locator('.order-note a').getAttribute('href'); check('saving gives a link', /\?design=[2-9A-Z]{8}$/.test(link)); await shot(p, 'site-saved')
await p.locator('.order button', { hasText: 'Request a test drive' }).click(); await p.waitForSelector('dialog[open]'); await runAxe(p, 'test-drive form')
await p.locator('dialog button', { hasText: 'Send request' }).click(); await p.waitForSelector('dialog em')
check('an empty form names the wrong fields and moves there', (await p.locator('dialog em').count()) >= 3 && (await p.evaluate(() => document.activeElement.getAttribute('aria-invalid'))) === 'true'); await shot(p, 'site-form-errors')
await p.keyboard.press('Escape'); await p.waitForTimeout(400); check('Escape closes the form, not the car', !(await p.locator('dialog[open]').count()) && (await p.locator('.explore').count()) === 1)
await p.locator('.order button', { hasText: 'Request a test drive' }).click()
const name = `E2E ${Date.now()}`, soon = new Date(Date.now() + 9 * 864e5).toISOString().slice(0, 10)
await p.fill('[name=name]', name); await p.fill('[name=email]', 'e2e@example.com'); await p.fill('[name=preferredDate]', soon); await p.fill('[name=message]', '<b>Bold</b> & quiet, please'); await p.locator('dialog button', { hasText: 'Send request' }).click()
await p.waitForSelector('#drive-title:has-text("Request received")'); const ref = await p.locator('dialog strong').textContent(); check('a request gets a reference', /^[2-9A-Z]{6}$/.test(ref)); await shot(p, 'site-received'); check('no console errors on the site', !p.errors.length, p.errors.join(' | '))
p = await open(link.slice(link.indexOf('?'))); await p.waitForSelector('.order .total'); check('the link opens the saved car', await p.locator('.panel label', { hasText: /^Oxblood$/ }).locator('input').isChecked())
p = await open('?design=NOTHERE2'); await p.waitForSelector('.loader.is-done', { state: 'attached' }); await p.waitForTimeout(800); check('an unknown link opens the film', (await p.locator('h1').count()) === 1 && !(await p.locator('.explore').count()))
const c = await b.newContext({ viewport: { width: 1440, height: 900 } }); p = await c.newPage(); await p.route('**/api/**', (r) => r.abort()); await p.goto(base); await p.waitForSelector('.loader.is-done', { state: 'attached' }); await p.locator('.bar .link').click(); await p.waitForSelector('.order')
check('without the API the car still works, unpriced', !(await p.locator('.total').count())); await p.locator('.order button', { hasText: 'Save and copy link' }).click(); await p.waitForSelector('.order-note:has-text("cannot be reached")'); check('and saving says why it failed', true)

// Front desk
p = await open('admin.html'); await p.waitForSelector('.signin'); await runAxe(p, 'sign in'); await shot(p, 'desk-signin')
const sign = async (q, pw = env.ADMIN_PASSWORD) => { await q.fill('[name=username]', env.ADMIN_USERNAME); await q.fill('[name=password]', pw); await q.locator('.signin .act').click() }
await sign(p, 'not-the-password'); await p.waitForSelector('.signin .bad:has-text("do not match")'); check('a wrong password is refused', true)
await sign(p); await p.waitForSelector('.rows li'); check('signing in opens the desk', true); await runAxe(p, 'requests')
await p.fill('.search input', name); await p.waitForFunction(() => document.querySelectorAll('.rows li').length === 1); await p.locator('.rows button').click(); await p.waitForSelector('.detail .car')
check('the request shows its message as text', (await p.locator('.detail blockquote').textContent()) === '<b>Bold</b> & quiet, please'); check('and the car it was made for', (await p.locator('.detail .specimen').textContent()).startsWith('Oxblood')); await runAxe(p, 'request detail'); await shot(p, 'desk-request')
const second = await p.context().newPage(); await second.goto(base + 'admin.html'); await second.fill('.search input', name); await second.waitForFunction(() => document.querySelectorAll('.rows li').length === 1); await second.locator('.rows button').click()
await p.locator('.detail .act', { hasText: /^Confirm$/ }).click(); await p.waitForSelector('.detail .mark.is-confirmed'); check('a request can be confirmed', true)
await second.locator('.detail .act', { hasText: 'Cancel request' }).click(); await second.waitForSelector('.detail .bad:has-text("Someone else")'); await second.locator('.detail .inline').click(); await second.waitForSelector('.detail .mark.is-confirmed'); check('a second tab cannot overwrite it, and can reload', true); await second.close()
await p.fill('.detail textarea', 'typed before the session ended'); const keep = await p.context().cookies(); await p.context().clearCookies(); await p.locator('.detail .act', { hasText: 'Save note' }).click(); await p.waitForSelector('.signin.is-over')
check('an ended session asks to sign in over the page', (await p.locator('.desk').getAttribute('inert')) !== null); await shot(p, 'desk-session'); await sign(p); await p.waitForSelector('.signin', { state: 'detached' })
check('and keeps what was typed', (await p.locator('.detail textarea').inputValue()) === 'typed before the session ended'); await p.locator('.detail .act', { hasText: 'Save note' }).click(); await p.waitForSelector('.detail .good:has-text("Note saved")'); check('which can then be saved', keep.length > 0)
await p.goto(base + 'admin.html#catalogue'); await p.waitForSelector('.group'); await runAxe(p, 'catalogue')
const edit = async (label, price) => { const li = p.locator('.group li', { hasText: label }); await li.locator('.inline').first().click(); await li.locator('input[inputmode=decimal]').fill(price); await li.locator('.act').click() }
await edit('Ivory', 'abc'); await p.waitForSelector('.edit em'); check('a bad price is explained', true); await p.locator('.group li', { hasText: 'Ivory' }).locator('.inline').first().click()
await edit('Ivory', '2500,50'); await p.waitForSelector('.line:has-text("2,500.50")'); await shot(p, 'desk-catalogue'); check('a price can be changed', true); await edit('Ivory', '1800'); await p.waitForSelector('.line:has-text("1,800.00")')
await p.locator('.group button', { hasText: 'Add a paint' }).click(); await p.waitForSelector('.edit'); await runAxe(p, 'catalogue form')
await p.goto(base + 'admin.html#history'); await p.waitForSelector('.log li'); check('changes are in the history', (await p.locator('.log').textContent()).includes('2500.50 EUR')); await runAxe(p, 'history'); await shot(p, 'desk-history')
await p.goto(base + 'admin.html#designs'); await p.waitForSelector('table'); await runAxe(p, 'designs'); await shot(p, 'desk-designs')
for (const w of [320, 390, 768, 1024]) { await p.setViewportSize({ width: w, height: 800 }); for (const h of ['requests', 'designs', 'catalogue', 'history']) { await p.goto(base + `admin.html#${h}`); await p.waitForTimeout(500); const o = await wide(p); if (o > 0) check(`no sideways scroll on ${h} at ${w}`, false, `${o}px`); if (w === 390) await shot(p, `desk-${h}-390`) } }
check('no console errors at the desk', !p.errors.length, p.errors.join(' | '))
await p.setViewportSize({ width: 1440, height: 900 }); await p.locator('.me button').click(); await p.waitForSelector('.signin'); check('signing out closes the desk', !(await p.locator('.desk').count()))
await b.close(); console.log(failed ? `${failed} check(s) failed` : 'all checks passed'); process.exit(failed ? 1 : 0)
