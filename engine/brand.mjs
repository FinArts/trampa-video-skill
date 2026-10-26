// Trampa brand in SVG: tokens, the mark, the TRAMPA wordmark, game tiles with the app's glyphs, the
// hero grid and the slanted orange trade line. Values come from the Trampa app (DESIGN.md,
// tailwind.config.ts, lib/brand-mark.ts, components/game/*). Never invent a colour.
import { readFileSync } from "node:fs"
import { f, mix, clamp } from "./motion.mjs"

export const W = 1080
export const H = 1920

export const C = {
  navy: "#071337", //      ink, structure, brand surfaces: the ground of every brand film
  navy700: "#132A63",
  navy800: "#0D1E4D", //   the hero's lifted stage
  navy950: "#040A20", //   footer, hard drop shadows
  orange: "#FF9F1C", //    the one accent (UI orange-500). As a background it carries NAVY text, never white
  orange50: "#FFF8F0",
  orange100: "#FFEED8",
  orange200: "#FFDCAD", // the sweep highlight on the trade line
  orange800: "#AA5F00", // orange text on light surfaces
  markOrange: "#FF900B", // the mark's arrows (logo only)
  markInk: "#050620", //   the mark's strokes on light grounds
  white: "#FFFFFF",
  paper: "#F8F9FD", //     page canvas oklch(0.985 0.004 265)
  muted: "#EFF1F8", //     oklch(0.962 0.007 265)
  border: "#DDE1EC", //    oklch(0.905 0.012 265)
  mutedInk: "#566079", //  oklch(0.46 0.03 265), secondary text on light
  grid: "#182345", //      the hero hairline grid: white 7 % premixed on navy (one flat colour, never a fade)
  gold: "#F5B820", silver: "#C9D3E1", bronze: "#DE9A62", // podium 1-3 (/ljestvica)
}

/** GAME_TONES (components/game/game-icon.tsx): tile face, lip/shading, highlight. */
export const TONES = {
  blue: { base: "#3B82F6", dark: "#1E40AF", light: "#BFDBFE" },
  violet: { base: "#8B5CF6", dark: "#5B21B6", light: "#DDD6FE" },
  rose: { base: "#F43F5E", dark: "#9F1239", light: "#FECDD3" },
  emerald: { base: "#10B981", dark: "#065F46", light: "#A7F3D0" },
  indigo: { base: "#6366F1", dark: "#3730A3", light: "#C7D2FE" },
  amber: { base: "#F59E0B", dark: "#92400E", light: "#FDE68A" },
  teal: { base: "#14B8A6", dark: "#115E59", light: "#99F6E4" },
  fuchsia: { base: "#D946EF", dark: "#86198F", light: "#F5D0FE" },
  orange: { base: "#FF9F1C", dark: "#A85A00", light: "#FFDCAD" },
  lime: { base: "#84CC16", dark: "#3F6212", light: "#D9F99D" },
  yellow: { base: "#EAB308", dark: "#854D0E", light: "#FEF08A" },
  cyan: { base: "#06B6D4", dark: "#155E75", light: "#A5F3FC" },
  navy: { base: "#2A4291", dark: "#071337", light: "#BFD0F5" },
  slate: { base: "#64748B", dark: "#1E293B", light: "#CBD5E1" },
  red: { base: "#EF4444", dark: "#991B1B", light: "#FECACA" },
  green: { base: "#22C55E", dark: "#166534", light: "#BBF7D0" },
  sky: { base: "#0EA5E9", dark: "#075985", light: "#BAE6FD" },
}

/** Category → glyph + tone, exactly as the app pairs them (lib/categories/icons.tsx, DESIGN.md). */
export const CATEGORY = {
  vozila: { glyph: "car", tone: "blue", label: "Vozila" },
  elektronika: { glyph: "phone", tone: "violet", label: "Elektronika" },
  moda: { glyph: "shirt", tone: "rose", label: "Moda" },
  sport: { glyph: "ball", tone: "emerald", label: "Sport" },
  gaming: { glyph: "gamepad", tone: "indigo", label: "Gaming" },
  glazba: { glyph: "guitar", tone: "amber", label: "Glazba" },
  knjige: { glyph: "book", tone: "teal", label: "Knjige" },
  djeca: { glyph: "teddy", tone: "fuchsia", label: "Za djecu" },
  ljubimci: { glyph: "paw", tone: "orange", label: "Ljubimci" },
  dom: { glyph: "sofa", tone: "lime", label: "Dom" },
  alati: { glyph: "hammer", tone: "yellow", label: "Alati" },
  nekretnine: { glyph: "house", tone: "cyan", label: "Nekretnine" },
  ostalo: { glyph: "mysteryBox", tone: "navy", label: "Ostalo" },
}

/** Glyphs of components/game/glyphs.tsx (64 × 64 grid, sticker style), colours as #P #B #D #L placeholders. */
export const GLYPHS = JSON.parse(readFileSync(new URL("./glyphs.json", import.meta.url), "utf8"))

/** The frame's safe areas (9:16 Reels/TikTok/Shorts UI). Readable type and the logo stay inside SAFE. */
export const SAFE = { x0: 72, x1: 936, y0: 260, y1: 1300 }
export const AXIS = (SAFE.x0 + SAFE.x1) / 2 // 504: the column every centred line sits on
export const CAPTION_BAND = { y0: 1150, y1: 1290 }

// ─── Document ────────────────────────────────────────────────────────────────

/** One frame: an SVG document W × H on `bg`. Every frame is built from scratch: no state between frames. */
export const doc = (body, bg = C.navy) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${bg}"/>${body}</svg>`

/**
 * A frame made of two whole frames mixed through a mask (composited in raster by the renderer):
 * white in `mask` shows B, black shows A; `over` (a body on a transparent layer) goes on top.
 * A and B are doc() strings or composites themselves. Use this for every scene → scene transition
 * instead of an SVG clip-path around a whole scene (resvg panics when a clip-path group holds
 * content that lies fully outside the clip, e.g. a world that has scrolled off-frame).
 */
export const composite = (A, B, mask, over = "") => ({ mix: [A, B], mask, over })

let idSeq = 0
/** Unique ids per frame for clipPaths (the renderer and QC reset them before every frame). */
export const uid = (p = "c") => `${p}${idSeq++}`
export const resetIds = () => { idSeq = 0 }

// ─── The mark (lib/brand-mark.ts) ────────────────────────────────────────────

export const MARK = {
  w: 1133.86,
  h: 581.86,
  /** tight ink box, measured */
  box: { x0: 31, y0: 26, x1: 1101, y1: 556 },
  centre: [566.93, 290.93],
  /** the two loop counters (circle fits of the inner arcs): use them as portals / iris targets */
  loops: [{ cx: 296.3, cy: 291.6, r: 180.7 }, { cx: 836.4, cy: 291.1, r: 180.7 }],
  paths: [
    { tone: "accent", d: "M442.72,185.74c-72.07-99.73-211.35-122.15-311.08-50.08l0,0C33.46,206.61,10.2,342.68,78.24,442.04C-3.43,323.8,24.07,161.39,141.11,76.81l0,0c118.6-85.71,284.23-59.05,369.94,59.56l7.05,9.76l-68.33,49.38L442.72,185.74z" },
    { tone: "ink", d: "M615.32,259.8c-3.84-0.32-6,4.32-3.29,7.06l11.22,11.3l-6.39,4.62l-68.33,49.38L434,414.93l-31.89,23.04c-80.87,58.44-193.79,40.26-252.23-40.61s-40.26-193.79,40.61-252.23c78.34-56.61,186.76-41.32,246.59,33.21c-73.5-93.38-208.24-112.93-305.45-42.68v0C33.46,206.61,10.2,342.68,78.24,442.04c1.09,1.57,2.18,3.15,3.31,4.7c1.13,1.56,2.28,3.09,3.43,4.62c86.63,114.65,249.47,139.52,366.51,54.94l214.74-155.19l6.4-4.62l7.21,14.2c1.75,3.44,6.83,2.84,7.74-0.9l22.29-92.21L615.32,259.8z" },
    { tone: "accent", d: "M689.95,396.9c72.07,99.73,211.35,122.15,311.08,50.08l0,0c98.17-70.95,121.43-207.01,53.39-306.38c81.67,118.24,54.18,280.65-62.87,365.23l0,0c-118.6,85.71-284.23,59.05-369.94-59.56l-7.05-9.76l68.33-49.38L689.95,396.9z" },
    { tone: "ink", d: "M1054.43,140.6c-1.09-1.57-2.18-3.15-3.31-4.71c-1.12-1.56-2.27-3.09-3.43-4.62C961.05,16.62,798.22-8.24,681.18,76.34L466.43,231.53l-6.39,4.62l-7.21-14.2c-1.74-3.44-6.83-2.85-7.73,0.9l-22.3,92.21l94.55,7.77c3.84,0.32,6-4.32,3.29-7.06l-11.22-11.3l6.4-4.62l68.33-49.38l114.53-82.77l31.88-23.04c80.87-58.44,193.79-40.26,252.23,40.61c58.44,80.86,40.26,193.79-40.6,252.23v0c-78.34,56.61-186.76,41.32-246.59-33.21c73.5,93.38,208.24,112.93,305.45,42.68l0,0C1099.21,376.03,1122.47,239.97,1054.43,140.6z" },
    { tone: "ink", d: "M695.59,404.3c-1.91-2.43-3.81-4.87-5.64-7.4C691.78,399.43,693.66,401.89,695.59,404.3z" },
  ],
}

/**
 * The mark centred on (cx, cy), `width` px wide (of the full viewBox). variant: "light" on navy
 * (white strokes + orange arrows), "dark" on light grounds (ink + orange), "mono" one colour.
 * `parts` draws a subset (e.g. accents only) for assembly animations: { accentL, inkL, accentR, inkR }.
 */
export function mark({ cx, cy, width, variant = "light", color, rot = 0, opacity = 1, parts }) {
  const s = width / MARK.w
  const ink = color ?? (variant === "dark" ? C.markInk : C.white)
  const accent = variant === "mono" ? (color ?? C.white) : C.markOrange
  const keys = ["accentL", "inkL", "accentR", "inkR", "inkR"]
  const body = MARK.paths
    .map((p, i) => {
      if (parts && !parts[keys[i]]) return ""
      const tr = parts?.[keys[i]]?.transform ?? ""
      return `<path${tr ? ` transform="${tr}"` : ""} fill="${p.tone === "accent" ? accent : ink}"${opacity < 1 ? ` fill-opacity="${f(opacity)}"` : ""} d="${p.d}"/>`
    })
    .join("")
  return `<g transform="translate(${f(cx)} ${f(cy)}) rotate(${f(rot)}) scale(${s.toFixed(5)}) translate(${-MARK.centre[0]} ${-MARK.centre[1]})">${body}</g>`
}

/** World position of a mark loop counter for a mark drawn with mark({cx, cy, width}). */
export function markLoop(i, { cx, cy, width }) {
  const s = width / MARK.w
  const L = MARK.loops[i]
  return { x: cx + (L.cx - MARK.centre[0]) * s, y: cy + (L.cy - MARK.centre[1]) * s, r: L.r * s }
}

// ─── The wordmark: TRAMPA, Figtree 700, tracking 0.06em (components/main-header.tsx) ─────────

/** Outlines in em/1000 units, baseline y = 0, cap height 700, advance 4423 (incl. tracking). */
export const WORDMARK = JSON.parse(readFileSync(new URL("./wordmark.json", import.meta.url), "utf8"))

/** TRAMPA centred on (cx, baseline y). `size` = font size in px. `track` adds extra em between letters (settle to 0). */
export function wordmark({ cx, y, size, color = C.white, track = 0, opacity = 1 }) {
  const s = size / 1000
  if (!track) {
    return `<path fill-opacity="${f(opacity)}" transform="translate(${f(cx - (WORDMARK.advance * s) / 2)} ${f(y)}) scale(${s.toFixed(5)})" fill="${color}" d="${WORDMARK.d}"/>`
  }
  // Tracking animation: one outline per letter, spread by the extra tracking.
  const letters = WORDMARK.letters
  const extra = track * 1000
  const total = WORDMARK.advance + extra * (letters.length - 1)
  return `<g fill-opacity="${f(opacity)}" transform="translate(${f(cx - (total * s) / 2)} ${f(y)}) scale(${s.toFixed(5)})" fill="${color}">${letters
    .map((d, i) => `<path transform="translate(${f(extra * i)} 0)" d="${d}"/>`)
    .join("")}</g>`
}

// ─── Game tiles (components/game/game-icon.tsx) ──────────────────────────────

/** A glyph's markup in its 64 grid. variant "tile": white faces; "solo": faces in the tone's light step. */
export function glyph(name, toneName, variant = "tile") {
  const t = TONES[toneName] ?? TONES.orange
  const src = GLYPHS[name]
  if (!src) throw new Error(`no glyph "${name}" (have: ${Object.keys(GLYPHS).join(", ")})`)
  const body = src
    .replaceAll('"#P"', `"${variant === "tile" ? C.white : t.light}"`)
    .replaceAll('"#B"', `"${t.base}"`)
    .replaceAll('"#D"', `"${t.dark}"`)
    .replaceAll('"#L"', `"${t.light}"`)
  return `<g stroke-linejoin="round" stroke-linecap="round">${body}</g>`
}

/**
 * The glyph again in one solid colour: its navy drop at 28 % premixed over `bg` (never a group
 * opacity: resvg panics on an opacity layer whose content is fully off-canvas, and solids are faster).
 */
const silhouette = (markup, bg) => {
  const col = mix(bg, C.navy, 0.28)
  return markup.replace(/\b(fill|stroke)="(?!none")[^"]*"/g, `$1="${col}"`).replace(/ (fill|stroke)-opacity="[^"]*"/g, "")
}

/**
 * The beveled GameTile: the tone's face, navy outline, darker lip, lighter top band and half, gloss
 * spot, the glyph at 76 % with its navy drop, and a hard navy-950 drop under the tile that deepens
 * while it is lifted. Built from shapes that stay inside the tile (no clip-path, no opacity layer).
 * Pose: cx, cy (centre), size (px), rot (deg), lift 0..1, squash 0..1 (landing: flattens from the
 * base), scale, flip (-1..1: scaleX for card flips; the tone's dark step shows as the edge).
 */
export function gameTile({ cx, cy, size, tone, glyph: name, rot = 0, lift = 0, squash = 0, scale = 1, flip = 1, content }) {
  const t = TONES[tone] ?? TONES.orange
  const s = size, h = s / 2, r = 0.3 * s
  const border = Math.max(2.5, 0.045 * s), lip = 0.1 * s, band = 0.07 * s, g = 0.76 * s
  const body = content ?? glyph(name, tone, "tile")
  const halfH = 0.46 * s, crx = 0.4 * s, cry = 0.4 * halfH
  // The lighter top half: the tile's rounded top corners, an elliptical bottom edge.
  const topHalf = `M${-h} ${f(-h + r)}A${f(r)} ${f(r)} 0 0 1 ${f(-h + r)} ${-h}H${f(h - r)}A${f(r)} ${f(r)} 0 0 1 ${h} ${f(-h + r)}V${f(-h + halfH - cry)}A${f(crx)} ${f(cry)} 0 0 1 ${f(h - crx)} ${f(-h + halfH)}H${f(-h + crx)}A${f(crx)} ${f(cry)} 0 0 1 ${-h} ${f(-h + halfH - cry)}Z`
  const gx = -h + 0.27 * s, gy = -h + 0.165 * s
  const sx = scale * (1 + 0.06 * lift + 0.06 * squash) * flip
  const sy = scale * (1 + 0.06 * lift - 0.08 * squash)
  const dy = 0.04 * size * squash * scale
  const drop = 0.06 * s * (1 + lift)
  const rr = (y, hh, fill) => `<rect x="${f(-h)}" y="${f(y)}" width="${f(s)}" height="${f(hh)}" rx="${f(r)}" fill="${fill}"/>`
  // Edge-on during a flip: the face narrows, the tone's dark step shows as the tile's thickness.
  const edge = Math.abs(flip) < 0.999 ? `<rect x="${f(-h)}" y="${f(-h)}" width="${f(s)}" height="${f(s)}" rx="${f(r)}" fill="${t.dark}" transform="translate(${f(Math.sign(flip || 1) * -0.05 * s * (1 - Math.abs(flip)))} 0)"/>` : ""
  return `<g transform="translate(${f(cx)} ${f(cy + dy)}) rotate(${f(rot)}) scale(${(sx).toFixed(4)} ${(sy).toFixed(4)})">
${rr(-h + drop, s, C.navy950)}${edge}${rr(-h, s, t.dark)}${rr(-h, s - lip, mix(t.base, C.white, 0.4))}${rr(-h + band, s - lip - band, t.base)}<path d="${topHalf}" fill="${C.white}" fill-opacity="0.14"/><ellipse cx="${f(gx)}" cy="${f(gy)}" rx="${f(0.14 * s)}" ry="${f(0.065 * s)}" transform="rotate(-18 ${f(gx)} ${f(gy)})" fill="${mix(t.base, C.white, 0.55)}"/>
<rect x="${f(-h + border / 2)}" y="${f(-h + border / 2)}" width="${f(s - border)}" height="${f(s - border)}" rx="${f(r - border / 2)}" fill="none" stroke="${C.navy}" stroke-width="${f(border)}"/>
<g transform="translate(${f(-g / 2)} ${f(-g / 2 - 0.035 * s)}) scale(${(g / 64).toFixed(4)})"><g transform="translate(0 ${f((0.06 * s * 64) / g)})">${silhouette(body, t.base)}</g>${body}</g></g>`
}

/** A glyph alone (no tile), `size` px, with the navy drop the app gives it (premixed over `bg`). */
export function stickerGlyph({ cx, cy, size, tone, glyph: name, rot = 0, scale = 1, variant = "solo", bg = C.navy }) {
  const body = glyph(name, tone, variant)
  const s = (size * scale) / 64
  return `<g transform="translate(${f(cx)} ${f(cy)}) rotate(${f(rot)}) scale(${s.toFixed(4)}) translate(-32 -32)"><g transform="translate(0 3.8)">${silhouette(body, bg)}</g>${body}</g>`
}

// ─── Brand surfaces ──────────────────────────────────────────────────────────

/**
 * The hero hairline grid as one flat colour (never a fade: fades band in H.264 and GIF). `step` px,
 * `width` px lines, origin (ox, oy). Draw it inside a camera group with parallax ≈ 0.6 for depth.
 * `extent` (× the frame) covers a world area larger than the frame so camera moves never show its
 * edge: raise it when the camera zooms out below 1 or travels far. Lines thin as the camera zooms
 * out (width × zoom): pass width = 2 / zoom for a constant hairline.
 */
export function grid({ step = 112, width = 2, color = C.grid, ox = AXIS % 112, oy = 0, extent = 4 } = {}) {
  const d = []
  const x0 = -W * (extent - 1) / 2, x1 = W * (extent + 1) / 2
  const y0 = -H * (extent - 1) / 2, y1 = H * (extent + 1) / 2
  for (let x = Math.ceil((x0 - ox) / step) * step + ox; x <= x1; x += step) d.push(`M${f(x)} ${f(y0)}V${f(y1)}`)
  for (let y = Math.ceil((y0 - oy) / step) * step + oy; y <= y1; y += step) d.push(`M${f(x0)} ${f(y)}H${f(x1)}`)
  return `<path d="${d.join("")}" stroke="${color}" stroke-width="${width}" fill="none"/>`
}

/** The slant of the hero stage's left edge (and of every trade line): dx/dy. */
export const SLANT = 208 / 480

/**
 * The lifted stage: a navy-800 panel whose straight slanted left edge carries the orange trade line.
 * `x` = the edge's x at frame mid-height; `rule` = line width px (6 at 1080 wide; the web's 3px).
 */
export function stage({ x, y0 = -2 * H, y1 = 3 * H, rule = 6, fill = C.navy800, line = C.orange, sweep = null }) {
  const at = (y) => x + (H / 2 - y) * SLANT
  const body = `<path d="M${f(at(y0))} ${f(y0)}H${f(W * 5)}V${f(y1)}H${f(at(y1))}Z" fill="${fill}"/><path d="M${f(at(y0))} ${f(y0)}L${f(at(y1))} ${f(y1)}" stroke="${line}" stroke-width="${rule}"/>`
  return body + (sweep === null ? "" : lineSweep({ at, p: sweep, rule }))
}

/** A bright stretch running up a trade line once (bottom → top): the line "swipes" as an action lands. */
export function lineSweep({ at, p, rule = 6, y0 = 0, y1 = H, len = 0.3 }) {
  if (p <= 0 || p >= 1) return ""
  const a = Math.max(0, p * (1 + len) - len), b = Math.min(1, p * (1 + len))
  const y = (k) => y1 - (y1 - y0) * k
  return `<path d="M${f(at(y(a)))} ${f(y(a))}L${f(at(y(b)))} ${f(y(b))}" stroke="${C.orange200}" stroke-width="${rule * 2}" stroke-linecap="round"/>`
}

/** A four-point sparkle (the app's sparkle), `size` px centre → tip. */
export function sparkle({ cx, cy, size, color = C.orange, rot = 0 }) {
  if (size <= 0.5) return ""
  return `<path transform="translate(${f(cx)} ${f(cy)}) rotate(${f(rot)}) scale(${f(size)})" fill="${color}" d="M0 -1C.1 -.32 .32 -.1 1 0C.32 .1 .1 .32 0 1C-.1 .32 -.32 .1 -1 0C-.32 -.1 -.1 -.32 0 -1Z"/>`
}

/** A pill like the app's chips/CTAs: rounded-full, `fill`, text drawn by the caller on top. */
export const pill = ({ x, y, w, h, fill = C.white, stroke = "none", sw = 0 }) =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
