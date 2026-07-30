/**
 * Crop SKUPA logos tightly to the circular emblem and regenerate all favicon sizes.
 * Usage: node scripts/crop-skupa-icons.mjs
 */
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const ICONS = path.join(ROOT, 'public', 'icons')
const PUBLIC = path.join(ROOT, 'public')

const SIZES = [
  { name: 'android-chrome-512x512.png', size: 512 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-16x16.png', size: 16 },
]

async function findCircleBounds(pngPath) {
  const { data, info } = await sharp(pngPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const w = info.width
  const h = info.height
  const ch = info.channels
  const get = (x, y) => {
    const i = (y * w + x) * ch
    return [data[i], data[i + 1], data[i + 2], data[i + 3]]
  }
  const isDarkStroke = (r, g, b, a) => a > 200 && (r + g + b) / 3 < 45

  const midY = Math.floor(h / 2)
  const midX = Math.floor(w / 2)
  const xs = []
  for (let x = 0; x < w; x++) {
    const [r, g, b, a] = get(x, midY)
    if (isDarkStroke(r, g, b, a)) xs.push(x)
  }
  const ys = []
  for (let y = 0; y < h; y++) {
    const [r, g, b, a] = get(midX, y)
    if (isDarkStroke(r, g, b, a)) ys.push(y)
  }
  if (!xs.length || !ys.length) {
    throw new Error(`Could not find circle stroke in ${pngPath}`)
  }

  const left = xs[0]
  const right = xs[xs.length - 1]
  const top = ys[0]
  const bottom = ys[ys.length - 1]
  const cx = (left + right) / 2
  const cy = (top + bottom) / 2
  // +2px padding so the black ring isn't clipped
  const diameter = Math.ceil(Math.max(right - left, bottom - top) + 2)
  const leftCrop = Math.max(0, Math.round(cx - diameter / 2))
  const topCrop = Math.max(0, Math.round(cy - diameter / 2))
  const size = Math.min(diameter, w - leftCrop, h - topCrop)

  return { left: leftCrop, top: topCrop, size, cx, cy, diameter }
}

async function circleMaskedPng(input, size) {
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/>
    </svg>`,
  )
  return sharp(input)
    .resize(size, size, { fit: 'cover' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

async function processTheme(theme) {
  const srcPath = path.join(ICONS, theme, 'android-chrome-512x512.png')
  const backupPath = path.join(ICONS, theme, 'android-chrome-512x512.source.png')
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(srcPath, backupPath)
  }

  const bounds = await findCircleBounds(backupPath)
  console.log(theme, bounds)

  const cropped = await sharp(backupPath)
    .extract({
      left: bounds.left,
      top: bounds.top,
      width: bounds.size,
      height: bounds.size,
    })
    .png()
    .toBuffer()

  const outDir = path.join(ICONS, theme)
  fs.mkdirSync(outDir, { recursive: true })

  for (const { name, size } of SIZES) {
    const buf = await circleMaskedPng(cropped, size)
    fs.writeFileSync(path.join(outDir, name), buf)
  }

  // Multi-size favicon.ico
  const pngToIco = require('png-to-ico').default || require('png-to-ico')
  const ico = await pngToIco([
    path.join(outDir, 'favicon-16x16.png'),
    path.join(outDir, 'favicon-32x32.png'),
  ])
  fs.writeFileSync(path.join(outDir, 'favicon.ico'), ico)

  // Keep public root defaults = dark theme (app default)
  if (theme === 'dark') {
    for (const { name } of SIZES) {
      fs.copyFileSync(path.join(outDir, name), path.join(PUBLIC, name))
    }
    fs.copyFileSync(
      path.join(outDir, 'favicon.ico'),
      path.join(PUBLIC, 'favicon.ico'),
    )
  }

  return bounds
}

;(async () => {
  await processTheme('light')
  await processTheme('dark')
  console.log('Done — icons cropped to circle.')
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
