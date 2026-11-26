/** Encodes the specification photographs for the car pages. node tools/encode_stills.mjs [render/stills] [public/stills] */
import { createRequire } from 'node:module'
import { mkdirSync, readdirSync } from 'node:fs'
const sharp = createRequire(import.meta.url)('sharp'), [src = 'render/stills', out = 'public/stills'] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
let bytes = 0, n = 0
for (const f of readdirSync(src).filter((x) => x.endsWith('.png'))) {
  const base = f.slice(0, -4)
  for (const w of [1600, 800]) bytes += (await sharp(`${src}/${f}`).removeAlpha().resize(w).sharpen({ sigma: 0.6, m1: 0.3, m2: 0.7 }).webp({ quality: 84, effort: 5, smartSubsample: true }).toFile(`${out}/${base}-${w}.webp`)).size
  n++
}
console.log(n, 'photographs,', (bytes / 1e6).toFixed(1), 'MB')
