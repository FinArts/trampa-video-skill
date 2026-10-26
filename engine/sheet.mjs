// Labelled contact sheet of still PNGs (from render.mjs --stills) for reviewing frames side by side.
//   node engine/sheet.mjs films/<slug>/out/stills [cols=6] [width=270]  →  <dir>/sheet.png
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { Resvg } from "@resvg/resvg-js"
import { C } from "./brand.mjs"
import { text } from "./type.mjs"

const dir = process.argv[2]
const cols = Number(process.argv[3] ?? 6), w = Number(process.argv[4] ?? 270), h = Math.round((w * 16) / 9), pad = 14, lab = 40
const files = readdirSync(dir).filter((f) => f.endsWith(".png") && f !== "sheet.png").sort((a, b) => parseFloat(a.match(/(\d+\.\d+)s\.png$/)?.[1] ?? 0) - parseFloat(b.match(/(\d+\.\d+)s\.png$/)?.[1] ?? 0))
const rows = Math.ceil(files.length / cols)
const SW = cols * w + (cols + 1) * pad, SH = rows * (h + lab) + (rows + 1) * pad
let body = ""
files.forEach((file, i) => {
  const x = pad + (i % cols) * (w + pad), y = pad + Math.floor(i / cols) * (h + lab + pad)
  body += `<image x="${x}" y="${y}" width="${w}" height="${h}" href="data:image/png;base64,${readFileSync(path.join(dir, file)).toString("base64")}"/>`
  body += text(file.match(/(\d+\.\d+s)\.png$/)?.[1] ?? file, { x: x + 2, y: y + h + 30, size: 24, face: "figtree-700", align: "left", track: 0, role: "deco" })
})
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}"><rect width="${SW}" height="${SH}" fill="${C.navy950}"/>${body}</svg>`
writeFileSync(path.join(dir, "sheet.png"), new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng())
console.log(path.join(dir, "sheet.png"))
