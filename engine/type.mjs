// Type as vector outlines (opentype.js): exact brand fonts, per-letter animation, no system fonts.
// Faces: "bricolage-800" / "bricolage-700" (display: hero lines, slams), "figtree-700" / "figtree-800" /
// "figtree-600" / "figtree-400" (labels, captions, URL). Croatian letters č ć đ š ž are in every face.
import { fileURLToPath } from "node:url"
import opentype from "opentype.js"
import { E, ease, f, span } from "./motion.mjs"
import { C, SAFE, W, H, uid } from "./brand.mjs"

const fonts = new Map()
export function font(face) {
  if (!fonts.has(face)) fonts.set(face, opentype.loadSync(fileURLToPath(new URL(`./fonts/${face}.ttf`, import.meta.url))))
  return fonts.get(face)
}

const shapes = new Map()
/**
 * One line shaped with kerning: glyph outlines at the origin plus their x positions.
 * `track` in em (Bricolage display ≥ -0.03; the TRAMPA wordmark is 0.06).
 */
export function shape(str, face, size, track = 0) {
  const key = `${face}|${size}|${track}|${str}`
  if (shapes.has(key)) return shapes.get(key)
  const fnt = font(face)
  const glyphs = []
  let i = 0
  const adv = fnt.forEachGlyph(str, 0, 0, size, { kerning: true }, (g, x) => {
    const p = g.getPath(0, 0, size)
    const bb = p.getBoundingBox()
    glyphs.push({ d: p.toPathData(2), x: x + i * track * size, w: (g.advanceWidth / fnt.unitsPerEm) * size, bb, ch: g.unicode ? String.fromCodePoint(g.unicode) : "" })
    i++
  })
  const width = adv + Math.max(0, i - 1) * track * size
  const res = { glyphs, width, asc: (fnt.ascender / fnt.unitsPerEm) * size, desc: (-fnt.descender / fnt.unitsPerEm) * size, cap: ((fnt.tables.os2?.sCapHeight || 700) / fnt.unitsPerEm) * size }
  shapes.set(key, res)
  return res
}

export const measure = (str, face, size, track = 0) => shape(str, face, size, track).width

/** Largest size ≤ max that fits `str` (longest line) into `width`. */
export function fit(str, face, width, max, track = 0) {
  const longest = str.split("\n").reduce((a, b) => (measure(b, face, 100, track) > measure(a, face, 100, track) ? b : a))
  return Math.min(max, Math.floor((width / measure(longest, face, 100, track)) * 100))
}

/** Text boxes drawn this frame (screen px) for the QC gates. The renderer resets it per frame. */
export const REGISTRY = []
export const resetRegistry = () => { REGISTRY.length = 0 }

/**
 * A block of text as SVG paths. `str` may hold "\n" line breaks. Baseline of line 0 at `y`.
 * align: "center" (on x) | "left" | "right". `color` per line: string or array (e.g. the hero's
 * white line + orange line). `anim(i, n, line, j, lineLen)` → { dx, dy, s, rot, o, fill } per glyph
 * (i counts glyphs across all lines, j inside the line: rise line by line with j). See rise/drop.
 * `slot`: clip each line at baseline + descender, so letters rise out of / drop into a slot without
 * ever cutting diacritics. `screen(x, y)` maps the block's box to screen px when it is drawn inside a
 * camera group or a scaled group (motion.mjs worldToScreen / about), so QC measures what is seen.
 * `role`: "hero" | "label" | "caption" | "deco" (deco is not checked). QC records the box of the
 * glyphs actually visible this frame (animation and slot included), so a rise or drop never counts
 * as a hold.
 */
export function text(str, { x, y, size, face = "bricolage-800", color = C.white, align = "center", track = -0.02, leading = 1.02, anim, slot = false, opacity = 1, screen, role = "hero" }) {
  const lines = str.split("\n")
  const total = lines.reduce((n, l) => n + [...l].length, 0)
  let gi = 0
  let out = ""
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity
  lines.forEach((line, li) => {
    const sh = shape(line, face, size, track)
    const base = y + li * size * leading
    const x0 = align === "center" ? x - sh.width / 2 : align === "right" ? x - sh.width : x
    const fill = Array.isArray(color) ? color[li] ?? color[color.length - 1] : color
    let body = ""
    let minX = Infinity, minY = Infinity
    const slotBottom = base + sh.desc + size * 0.06
    sh.glyphs.forEach((g, j) => {
      const a = anim ? anim(gi, total, li, j, sh.glyphs.length) : null
      gi++
      if (a && a.o !== undefined && a.o <= 0.001) return
      const gx = x0 + g.x + (a?.dx ?? 0), gy = base + (a?.dy ?? 0)
      // Cull glyphs wholly inside the slot: resvg panics on clip groups whose content lies fully outside the clip.
      if (slot && gy + g.bb.y1 >= slotBottom - 0.5) return
      if (!g.d) return
      minX = Math.min(minX, gx + g.bb.x1); minY = Math.min(minY, gy + g.bb.y1)
      const s = a?.s ?? 1, r = a?.rot ?? 0
      const cx = g.w / 2
      // The visible ink box of this glyph (scale about its centre; the slot cuts its bottom).
      bx0 = Math.min(bx0, gx + cx + (g.bb.x1 - cx) * s); bx1 = Math.max(bx1, gx + cx + (g.bb.x2 - cx) * s)
      by0 = Math.min(by0, gy + g.bb.y1 * s); by1 = Math.max(by1, slot ? Math.min(slotBottom, gy + g.bb.y2 * s) : gy + g.bb.y2 * s)
      const tr = s !== 1 || r !== 0 ? `translate(${f(gx + cx)} ${f(gy)}) rotate(${f(r)}) scale(${s.toFixed(4)}) translate(${f(-cx)} 0)` : `translate(${f(gx)} ${f(gy)})`
      body += `<path transform="${tr}" d="${g.d}"${a?.fill ? ` fill="${a.fill}"` : ""}${a?.o !== undefined && a.o < 1 ? ` fill-opacity="${f(a.o)}"` : ""}/>`
    })
    // resvg panics on a clip group whose content lies wholly past the right or bottom frame edge.
    const [sx0, sy0] = screen ? screen(minX, minY) : [minX, minY]
    if (slot && (sx0 >= W || sy0 >= H)) body = ""
    if (slot && body) {
      const id = uid("slot")
      body = `<clipPath id="${id}"><rect x="${f(x0 - size)}" y="${f(base - size * 2.2)}" width="${f(sh.width + 2 * size)}" height="${f(size * 2.2 + sh.desc + size * 0.06)}"/></clipPath><g clip-path="url(#${id})">${body}</g>`
    }
    out += `<g fill="${fill}"${opacity < 1 ? ` fill-opacity="${f(opacity)}"` : ""}>${body}</g>`
  })
  if (role !== "deco" && opacity > 0.05 && bx1 > bx0) {
    const [ax, ay] = screen ? screen(bx0, by0) : [bx0, by0]
    const [cx, cy] = screen ? screen(bx1, by1) : [bx1, by1]
    REGISTRY.push({ str, role, size: screen ? size * Math.abs((cx - ax) / (bx1 - bx0 || 1)) : size, x0: ax, y0: ay, x1: cx, y1: cy })
  }
  return out
}

// ─── Letter animations (pass as `anim`) ──────────────────────────────────────

/** Letters rise out of the slot: expo-ish glide 0.42 s, stagger 26 ms; the last letter lands on start + stagger*n + dur. Use with slot: true. */
export const rise = (t, start, size, { stagger = 0.026, dur = 0.42, fn = E.glide } = {}) => (i) => {
  const e = ease(t, start + i * stagger, dur, fn)
  return { dy: (1 - e) * size * 1.32 }
}

/** Letters drop back into the slot (exit): power3.in 0.22 s, stagger 8 ms. Use with slot: true. */
export const drop = (t, start, size, { stagger = 0.008, dur = 0.22 } = {}) => (i) => {
  const e = ease(t, start + i * stagger, dur, E.power3In)
  return { dy: e * size * 1.32 }
}

/** rise then drop in one anim: in at `tin`, out at `tout`. */
export const riseDrop = (t, tin, tout, size, o = {}) => (i, n, li) => (t < tout ? rise(t, tin, size, o)(i, n, li) : drop(t, tout, size, o)(i, n, li))

/** Letters pop up one after another with a small scale settle (labels, counts). */
export const pop = (t, start, { stagger = 0.03, dur = 0.32 } = {}) => (i) => {
  const p = span(t, start + i * stagger, dur)
  return { s: p <= 0 ? 0.001 : E.slam(p), o: p <= 0 ? 0 : 1 }
}

/** Colour wave: letters turn `to` left → right (a highlight running across a word). */
export const wave = (t, start, to, { stagger = 0.03, dur = 0.12 } = {}) => (i) => (t >= start + i * stagger + dur / 2 ? { fill: to } : {})

/** Compose letter anims: later ones override fields of earlier ones (dy values add). */
export const both = (...anims) => (i, n, li) => {
  const out = {}
  for (const a of anims) {
    if (!a) continue
    const r = a(i, n, li)
    for (const [k, v] of Object.entries(r)) out[k] = k === "dy" || k === "dx" ? (out[k] ?? 0) + v : v
  }
  return out
}

/**
 * Burned-in captions for a voice-over (reels autoplay muted). timings = timings.json from
 * engine/voice.mjs. Groups of ≤ 4 words (breaks after , . ? and before „i/a/ali" never after them),
 * two lines max in the caption band, Figtree 700 56 px, the word being spoken in orange-200, the
 * rest white. `hide(text)` → true hides a group while hero type shows the same words.
 */
export function captions(t, timings, { y = 1236, size = 56, hide = () => false } = {}) {
  const off = timings.offset ?? 0
  const words = timings.words
  const groups = []
  let cur = []
  words.forEach((w, i) => {
    cur.push(w)
    const next = words[i + 1]
    const weak = /^(i|a|u|na|za|s|sa|do|od|iz|ili|ali|da|je|se|ne)$/i.test(w.text)
    if (!next || (!weak && (/[,.?!:]$/.test(w.text) || cur.length >= 4 || next.start - w.end > 0.35))) { groups.push(cur); cur = [] }
  })
  const g = groups.find((gr) => t >= off + gr[0].start - 0.05 && t < off + gr[gr.length - 1].end + 0.25)
  if (!g) return ""
  const str = g.map((w) => w.text).join(" ")
  if (hide(str)) return ""
  const now = g.findIndex((w) => t >= off + w.start && t < off + w.end + 0.05)
  const one = measure(str, "figtree-700", size) <= SAFE.x1 - SAFE.x0
  const split = one ? g.length : Math.ceil(g.length / 2)
  const rows = one ? [g] : [g.slice(0, split), g.slice(split)]
  // Glyph index range of the word being spoken (text() counts glyphs line by line, spaces included).
  let idx = 0, on = null
  rows.forEach((row) => row.forEach((w, k) => {
    const n = [...w.text].length
    if (w === g[now]) on = [idx, idx + n]
    idx += n + (k < row.length - 1 ? 1 : 0)
  }))
  const lines = rows.map((row) => row.map((w) => w.text).join(" ")).join("\n")
  return text(lines, { x: (SAFE.x0 + SAFE.x1) / 2, y: one ? y : y - size * 1.1, size, face: "figtree-700", track: 0, leading: 1.1, role: "caption", anim: (i) => (on && i >= on[0] && i < on[1] ? { fill: C.orange200 } : {}) })
}

/** Is a box inside the safe area? (for QC) */
export const inSafe = (b, m = 0) => b.x0 >= SAFE.x0 - m && b.x1 <= SAFE.x1 + m && b.y0 >= SAFE.y0 - m && b.y1 <= SAFE.y1 + m
