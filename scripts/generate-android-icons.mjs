import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const source = path.join(root, 'public/icons/dark/android-chrome-512x512.source.png')
const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
const image = sharp(source).ensureAlpha()
const metadata = await image.metadata()
if (metadata.width !== 512 || metadata.height !== 512) {
  throw new Error(`Expected 512x512 SKUPA source icon, got ${metadata.width}x${metadata.height}`)
}

for (const [density, size] of Object.entries(sizes)) {
  const dir = path.join(root, 'android/app/src/main/res', `mipmap-${density}`)
  await fs.mkdir(dir, { recursive: true })
  const full = await sharp(source).resize(size, size, { fit: 'contain' }).webp({ quality: 92 }).toBuffer()
  await fs.writeFile(path.join(dir, 'ic_launcher.webp'), full)
  await fs.writeFile(path.join(dir, 'ic_launcher_round.webp'), full)
  const foregroundSize = Math.round(size * 0.6667)
  const foreground = await sharp(source)
    .resize(foregroundSize, foregroundSize, { fit: 'contain' })
    .extend({
      top: Math.floor((size - foregroundSize) / 2),
      bottom: Math.ceil((size - foregroundSize) / 2),
      left: Math.floor((size - foregroundSize) / 2),
      right: Math.ceil((size - foregroundSize) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 92 }).toBuffer()
  await fs.writeFile(path.join(dir, 'ic_launcher_foreground.webp'), foreground)
}
console.log('Generated SKUPA launcher icons for all Android densities.')
