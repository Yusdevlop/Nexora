// Tətbiq ikonlarını (PNG) yaradır. İkonu dəyişmək üçün aşağıdakı SVG-ni redaktə edib
// "npm run icons" işlədin.
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const BG = '#0D1320'
const bars = (scale = 1, offset = 0) => {
  const s = (v) => Math.round(v * scale + offset)
  const w = Math.round(80 * scale)
  return `
    <rect x="${s(112)}" y="${s(272)}" width="${w}" height="${Math.round(128 * scale)}" rx="${w / 2}" fill="url(#g)" opacity=".7"/>
    <rect x="${s(216)}" y="${s(208)}" width="${w}" height="${Math.round(192 * scale)}" rx="${w / 2}" fill="url(#g)" opacity=".88"/>
    <rect x="${s(320)}" y="${s(112)}" width="${w}" height="${Math.round(288 * scale)}" rx="${w / 2}" fill="url(#g)"/>`
}
const defs = `<defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#9DB0FF"/><stop offset="1" stop-color="#5BE3C0"/></linearGradient></defs>`

// "any": yumru künclü kvadrat, "maskable": tam dolu fon + mərkəzdə təhlükəsiz zona (~60%)
const any = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}<rect width="512" height="512" rx="128" fill="#131C30"/>${bars()}</svg>`
const scale = 0.72
const off = (512 - 512 * scale) / 2
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}<rect width="512" height="512" fill="#131C30"/>${bars(scale, off)}</svg>`
const apple = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}<rect width="512" height="512" fill="#131C30"/>${bars(0.8, 51)}</svg>`

mkdirSync('public/icons', { recursive: true })
const out = (svg, size, file) => sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icons/${file}`)
await Promise.all([
  out(any, 192, 'icon-192.png'),
  out(any, 512, 'icon-512.png'),
  out(maskable, 512, 'icon-maskable-512.png'),
  out(apple, 180, 'apple-touch-icon.png')
])
console.log('İkonlar yaradıldı: public/icons/')
