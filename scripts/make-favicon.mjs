import sharp from 'sharp'
import path from 'node:path'

const src = path.resolve('public/j4f-emblem.png')
const out = path.resolve('public/j4f-icon.png')

// 1) Decupează spațiul transparent din jurul scutului.
const trimmed = await sharp(src).trim({ threshold: 10 }).toBuffer()
const meta = await sharp(trimmed).metadata()
const w = meta.width ?? 0
const h = meta.height ?? 0

// 2) Fă imaginea pătrată adăugând padding transparent pe laturile mai scurte,
//    plus un padding mic uniform (~6%) ca scutul să respire în favicon.
const side = Math.max(w, h)
const pad = Math.round(side * 0.06)
const target = side + pad * 2

const extendLR = Math.round((target - w) / 2)
const extendTB = Math.round((target - h) / 2)

await sharp(trimmed)
  .extend({
    top: extendTB,
    bottom: target - h - extendTB,
    left: extendLR,
    right: target - w - extendLR,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(out)

console.log('[v0] favicon scris:', out)
