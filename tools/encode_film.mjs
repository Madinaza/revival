/** Grade rendered PNG frames (two-radius bloom, light sharpen) and encode two WebP sizes.
 *  node tools/encode_film.mjs <pngDir> [quality] [outDir] */
import { mkdirSync, readdirSync, statSync } from 'node:fs'
import sharp from 'sharp'
const [dir, q = '86', out = 'public/film'] = process.argv.slice(2), quality = Number(q)
for (const s of [1600, 960]) mkdirSync(`${out}/${s}`, { recursive: true })
const files = readdirSync(dir).filter((f) => /^f\d{4}\.png$/.test(f)).sort()
async function glow(src, w, h, cut, sigma, gain) {
  const small = Math.round(w / 4)
  // linear(a, b): keep only what is brighter than the cut
  return sharp(await sharp(src).resize(small).linear(gain / (1 - cut), (-255 * cut * gain) / (1 - cut)).blur(sigma).png().toBuffer()).resize(w, h, { fit: 'fill' }).png().toBuffer()
}
async function one(f) {
  const src = await sharp(`${dir}/${f}`).removeAlpha().toBuffer(), { width: w, height: h } = await sharp(src).metadata()
  const [a, b] = await Promise.all([glow(src, w, h, 0.66, 2.4, 0.42), glow(src, w, h, 0.72, 11, 0.5)])
  const img = await sharp(src).composite([{ input: a, blend: 'screen' }, { input: b, blend: 'screen' }]).sharpen({ sigma: 0.7, m1: 0.3, m2: 0.8 }).png().toBuffer(), n = f.slice(1, 5)
  for (const s of [1600, 960]) await sharp(img).resize(s).webp({ quality, effort: 5, smartSubsample: true }).toFile(`${out}/${s}/${n}.webp`)
}
let i = 0
await Promise.all(Array.from({ length: 5 }, async () => { while (i < files.length) await one(files[i++]) }))
for (const s of [1600, 960]) { const L = readdirSync(`${out}/${s}`); console.log(s, L.length, 'frames', (L.reduce((x, f) => x + statSync(`${out}/${s}/${f}`).size, 0) / 1e6).toFixed(1), 'MB') }
