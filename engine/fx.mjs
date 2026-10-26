// Trampa moves: the swap arc and its arrow trail, the trade-line wipe, the loop iris, the orange
// flood, rings, sparkle bursts, the price tag, dust. Every function is pure: (progress / t) → SVG.
import { E, clamp, lerp, f, rad, rng, span, ease, bump } from "./motion.mjs"
import { C, W, H, SLANT, uid, sparkle, gameTile, mark, MARK, composite } from "./brand.mjs"
import { text } from "./type.mjs"

// ─── Z1 Zamjena: the swap arc ────────────────────────────────────────────────

/**
 * Two items trade places on a half-ellipse around their midpoint: `a` goes over the top, `b` under
 * the bottom (they never overlap). e = eased progress 0..1 (use E.inOut over 0.6–0.8 s).
 * Returns poses for gameTile(): { cx, cy, rot, scale, lift } for A and B. `rise` = arc height px,
 * `far` = scale at the far point (0.74: depth without a 3D engine), `lean` = tilt along the orbit.
 */
export function swapPoses(e, { a, b, rise = 260, far = 0.8, near = 1.1, lean = 10, tiltA = -4, tiltB = 4 }) {
  const arc = Math.sin(Math.PI * e)
  // A goes over (left of the a → b direction, i.e. up for a left → right pair) and away: smaller,
  // draw it first. B goes the other way, towards the lens: bigger, draw it last. Any direction works.
  const pose = (side, tilt0, tilt1) => {
    const [cx, cy] = arcAt({ a, b, rise }, side, e)
    return {
      cx, cy,
      rot: lerp(tilt0, tilt1, e) + side * lean * arc,
      scale: side > 0 ? 1 - (1 - far) * arc : 1 + (near - 1) * arc,
      lift: 0.7 * arc,
    }
  }
  // A (side +1) travels a → b over the top; B (side -1) travels b → a under the bottom.
  const A = pose(1, tiltA, tiltB)
  const B = pose(-1, tiltB, tiltA)
  return { A, B, arc }
}

/** Position on the swap arc of side ±1 at progress e: half an ellipse whose bulge is perpendicular to a → b. */
function arcAt({ a, b, rise }, side, e) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
  const rx = (b[0] - a[0]) / 2, ry = (b[1] - a[1]) / 2
  const len = Math.hypot(rx, ry) || 1
  const nx = ry / len, ny = -rx / len // left normal of a → b (up for a left → right pair)
  const c = Math.cos(Math.PI * e), s = Math.sin(Math.PI * e)
  return [mx - side * rx * c + side * nx * rise * s, my - side * ry * c + side * ny * rise * s]
}

/** Points along the swap arc of side ±1 between progress e0 and e1 (for trails). */
function arcPoints(geo, side, e0, e1, n = 28) {
  const pts = []
  for (let i = 0; i <= n; i++) pts.push(arcAt(geo, side, lerp(e0, e1, i / n)))
  return pts
}

/**
 * A tapered stroke along points (thin tail → thick head) ending in the mark's arrowhead: the swap
 * draws the logo's arrows. width = head width px. Returns a filled path.
 */
export function arrowStroke(pts, { width = 34, tail = 0.08, color = C.markOrange, head = true }) {
  if (pts.length < 2) return ""
  const n = pts.length
  const L = [], R = []
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[Math.min(n - 1, i + 1)], o = pts[Math.max(0, i - 1)]
    let tx = q[0] - o[0], ty = q[1] - o[1]
    const len = Math.hypot(tx, ty) || 1
    tx /= len; ty /= len
    const w = (width / 2) * lerp(tail, 1, Math.pow(i / (n - 1), 0.7))
    L.push([p[0] - ty * w, p[1] + tx * w])
    R.push([p[0] + ty * w, p[1] - tx * w])
  }
  let d = `M${L.map((p) => `${f(p[0])} ${f(p[1])}`).join("L")}`
  if (head) {
    const p = pts[n - 1], o = pts[n - 2]
    let tx = p[0] - o[0], ty = p[1] - o[1]
    const len = Math.hypot(tx, ty) || 1
    tx /= len; ty /= len
    const hw = width * 1.05, hl = width * 1.25
    d += `L${f(p[0] - ty * hw)} ${f(p[1] + tx * hw)}L${f(p[0] + tx * hl)} ${f(p[1] + ty * hl)}L${f(p[0] + ty * hw)} ${f(p[1] - tx * hw)}`
  }
  d += `L${R.reverse().map((p) => `${f(p[0])} ${f(p[1])}`).join("L")}Z`
  return `<path d="${d}" fill="${color}"/>`
}

/**
 * The arrow trails of a swap: each item leaves an orange arrow along its arc that grows behind it
 * and retracts after it lands (head stays on the item, tail catches up). e = eased swap progress,
 * `out` 0..1 = retract progress after the landing. `gap` keeps the head off the tile's edge.
 */
export function swapTrails(e, out, geo, { width = 30, gap = 0.2, color = C.markOrange } = {}) {
  const head = clamp(e - gap)
  const tail = head * E.inOut(clamp(out))
  if (head - tail < 0.03) return ""
  const s = (side) => arrowStroke(arcPoints(geo, side, tail, head), { width, color })
  return s(1) + s(-1)
}

// ─── Z2 Kosa crta: the trade-line wipe ───────────────────────────────────────

/** Geometry of the slanted band at progress p: its four corners and the B side's polygon. */
function bandGeo(p, { dir = 1, band = 220, rule = 6 }) {
  const span0 = -H * SLANT - band, span1 = W + H * SLANT + band
  const x = dir > 0 ? lerp(span0, span1, p) : lerp(span1, span0, p)
  const wB = lerp(band, rule, Math.pow(clamp(p), 1.5))
  const at = (y, xm) => xm + (H / 2 - y) * SLANT
  const lead = x + (dir > 0 ? wB / 2 : -wB / 2), trail = x - (dir > 0 ? wB / 2 : -wB / 2)
  const la = at(-50, lead), lb = at(H + 50, lead), ta = at(-50, trail), tb = at(H + 50, trail)
  const far = dir > 0 ? -W * 4 : W * 4
  return { wB, la, lb, ta, tb, behind: `M${f(ta)} -50L${f(far)} -50L${f(far)} ${H + 50}L${f(tb)} ${H + 50}Z` }
}

/** The band itself (orange, with its orange-200 sweep): use inside a scene, e.g. a slash across a prop. */
export function tradeBand(p, { dir = 1, band = 220, rule = 6, color = C.orange, sweep = true } = {}) {
  if (p <= 0 || p >= 1) return ""
  const g = bandGeo(p, { dir, band, rule })
  const hl = sweep && g.wB > 30 ? `<path d="M${f((g.la + g.ta) / 2)} -50L${f((g.lb + g.tb) / 2)} ${H + 50}" stroke="${C.orange200}" stroke-width="${f(g.wB * 0.12)}"/>` : ""
  return `<path d="M${f(g.la)} -50L${f(g.lb)} ${H + 50}L${f(g.tb)} ${H + 50}L${f(g.ta)} -50Z" fill="${color}"/>${hl}`
}

/**
 * Z2 Kosa crta. Frame A → frame B behind a slanted orange band moving left → right (dir 1) or
 * right → left (-1) on the stage's slant: the leading edge covers A, the trailing edge reveals B,
 * and the band thins to the trade line as it leaves (the line "draws" the new stage edge).
 * p = eased progress (E.morph, 0.5–0.7 s). A and B are whole frames (doc() strings). Returns a
 * composite: return it from frame(t) as it is.
 */
export function tradeWipe(p, A, B, o = {}) {
  if (p <= 0) return A
  if (p >= 1) return B
  const g = bandGeo(p, { band: 220, rule: 6, ...o })
  return composite(A, B, `<path d="${g.behind}" fill="#fff"/>`, tradeBand(p, o))
}

// ─── Z3 Kroz petlju: iris through a round counter ────────────────────────────

/**
 * Frame B seen through a circle (cx, cy, r) inside frame A, with an orange rim (A and B: doc()
 * strings). Grow r past the frame corners to finish; the rim thins as it grows. Returns a composite.
 */
export function iris(A, B, { cx, cy, r, rim = 14, color = C.orange }) {
  if (r <= 0.5) return A
  const big = Math.hypot(W, H)
  const rw = r > big ? 0 : rim * clamp(1 - r / big, 0.15, 1)
  return composite(A, B, `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="#fff"/>`, rw > 0.5 ? `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="none" stroke="${color}" stroke-width="${f(rw)}"/>` : "")
}

// ─── Z9 Narančasta plima: the orange flood ───────────────────────────────────

/** Orange floods the frame along the slant (dir 1: from the left). p 0..1. Navy type goes on top. */
export function flood(p, { dir = 1, color = C.orange } = {}) {
  if (p <= 0) return ""
  const span0 = -H * SLANT, span1 = W + H * SLANT
  const x = lerp(span0, span1, clamp(p))
  const at = (y) => x + (H / 2 - y) * SLANT
  return dir > 0
    ? `<path d="M-10 -50L${f(at(-50))} -50L${f(at(H + 50))} ${H + 50}L-10 ${H + 50}Z" fill="${color}"/>`
    : `<path d="M${W + 10} -50L${f(W - at(-50))} -50L${f(W - at(H + 50))} ${H + 50}L${W + 10} ${H + 50}Z" fill="${color}"/>`
}

// ─── Impacts and accents ─────────────────────────────────────────────────────

/** One ring that grows and thins to nothing (flat, no opacity steps). */
export function ring({ cx, cy, p, r0 = 40, r1 = 420, w = 18, color = C.orange }) {
  if (p <= 0 || p >= 1) return ""
  const e = E.expoOut(p)
  return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(lerp(r0, r1, e))}" fill="none" stroke="${color}" stroke-width="${f(w * (1 - e))}"/>`
}

/**
 * Sparkle burst: n four-point sparkles fly out from (cx, cy), spin a little and shrink to nothing.
 * p 0..1 over ~0.6 s. Deterministic (seed). colors cycle orange / white.
 */
export function burst({ cx, cy, p, n = 10, r0 = 60, r1 = 360, size = 34, seed = 7, colors = [C.orange, C.white, C.orange200] }) {
  if (p <= 0 || p >= 1) return ""
  const R = rng(seed)
  let out = ""
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R() * 0.5
    const dist = lerp(r0, r1 * (0.7 + 0.5 * R()), E.expoOut(p))
    const s = size * (0.6 + 0.6 * R()) * (1 - E.power3In(p)) * Math.min(1, p * 8)
    out += sparkle({ cx: cx + Math.cos(a) * dist, cy: cy + Math.sin(a) * dist, size: s, rot: 25 * p * (i % 2 ? 1 : -1), color: colors[i % colors.length] })
  }
  return out
}

/** Short speed streaks behind a fast mover (direction angle deg), alpha by speed 0..1. */
export function streaks({ cx, cy, angle, len = 240, n = 4, spread = 90, speed = 1, color = C.white, seed = 3 }) {
  if (speed <= 0.05) return ""
  const R = rng(seed)
  const a = rad(angle + 180)
  let d = ""
  for (let i = 0; i < n; i++) {
    const off = (i / (n - 1) - 0.5) * spread
    const l = len * speed * (0.5 + 0.5 * R())
    const x0 = cx + Math.cos(a + Math.PI / 2) * off, y0 = cy + Math.sin(a + Math.PI / 2) * off
    d += `M${f(x0)} ${f(y0)}L${f(x0 + Math.cos(a) * l)} ${f(y0 + Math.sin(a) * l)}`
  }
  return `<path d="${d}" stroke="${color}" stroke-opacity="${f(0.5 * speed)}" stroke-width="6" stroke-linecap="round"/>`
}

/** Ambient dust motes (life inside holds). Deterministic drift; size px; draw inside a camera group. */
export function dust(t, { n = 26, seed = 11, color = "#22305E", size = 5, area = [-200, -200, W + 400, H + 400] } = {}) {
  const R = rng(seed)
  let out = ""
  for (let i = 0; i < n; i++) {
    const x = area[0] + R() * area[2], y = area[1] + R() * area[3]
    const sp = 6 + 14 * R(), ph = R() * 10
    const dx = Math.sin(t * 0.6 + ph) * 18, dy = -((t * sp + ph * 40) % area[3])
    const yy = ((y + dy - area[1]) % area[3] + area[3]) % area[3] + area[1]
    out += `<circle cx="${f(x + dx)}" cy="${f(yy)}" r="${f(size * (0.5 + R()))}" fill="${color}"/>`
  }
  return out
}

// ─── Props ───────────────────────────────────────────────────────────────────

/**
 * A white price tag hanging on a string (the thing Trampa removes). (ax, ay) = where the string is
 * tied (the item); the tag hangs `string` px below-right; `swing` deg. `label` e.g. "49 €"
 * (Figtree 800, navy). `cut` true: the string is cut (by the trade line) and `fall` 0..1 drops the
 * tag away, turning; the stub of string stays on the item.
 */
export function priceTag({ ax, ay, label = "49 €", size = 1, swing = 0, string = 150, cut = false, fall = 0 }) {
  const w = 300 * size, h = 150 * size, notch = 54 * size
  const body = `M0 0L${f(notch)} ${f(-h / 2)}H${f(w)}V${f(h / 2)}H${f(notch)}Z`
  const tag = `<path d="${body}" fill="${C.white}" stroke="${C.navy}" stroke-width="${f(6 * size)}" stroke-linejoin="round"/><circle cx="${f(notch * 0.62)}" cy="0" r="${f(11 * size)}" fill="${C.navy}"/>${text(label, { x: notch + (w - notch) / 2 + 4 * size, y: 30 * size, size: 84 * size, face: "figtree-800", color: C.navy, track: -0.01, role: "deco" })}`
  // The tag hangs from the end of the string; the hole sits on the string's end.
  const a = rad(60 + swing), hx = Math.cos(a) * string, hy = Math.sin(a) * string
  const sw = f(5 * size)
  if (!cut) return `<g transform="translate(${f(ax)} ${f(ay)})"><path d="M0 0L${f(hx)} ${f(hy)}" stroke="${C.white}" stroke-width="${sw}" stroke-linecap="round"/><g transform="translate(${f(hx)} ${f(hy)}) rotate(${f(swing * 1.6 + 25)})">${tag}</g></g>`
  const k = 0.45 // where the string was cut (share of its length)
  const fy = fall * fall * 1100, fr = fall * 70, fx = fall * 140
  return `<g transform="translate(${f(ax)} ${f(ay)})"><path d="M0 0L${f(hx * k)} ${f(hy * k)}" stroke="${C.white}" stroke-width="${sw}" stroke-linecap="round"/><g transform="translate(${f(fx)} ${f(fy)})"><path d="M${f(hx * (k + 0.06))} ${f(hy * (k + 0.06))}L${f(hx)} ${f(hy)}" stroke="${C.white}" stroke-width="${sw}" stroke-linecap="round"/><g transform="translate(${f(hx)} ${f(hy)}) rotate(${f(swing * 1.6 + 25 + fr)})">${tag}</g></g></g>`
}

// ─── Scene helpers ───────────────────────────────────────────────────────────

/**
 * A tile that hops in place: crouch, spring up `height` px, fall, squash on landing (the app's hop).
 * Timeline from `start`: crouch until start + crouch (0.08: the take-off, put the sound here),
 * peak at + up (0.30), landing at + down (0.46: the landing pop), squash settles by + land (0.66).
 * Returns { dy, lift, squash } to spread into gameTile().
 */
export function hop(t, start, { height = 120, crouch = 0.08, up = 0.22, down = 0.16, land = 0.2 } = {}) {
  const u = start + crouch, d = u + up, l = d + down
  const r = t < d ? E.glide(span(t, u, up)) : 1 - E.power3In(span(t, d, down))
  return { dy: -height * r, lift: r, squash: 0.45 * bump(t, start, crouch) + bump(t, l, land) }
}

/** The full mark assembling from two swap arrows: k 0..1 (0: arrows apart on their arcs, 1: locked). */
export function markAssemble(k, { cx, cy, width, variant = "light" }) {
  const e = E.expoInOut(clamp(k))
  const s = width / MARK.w
  // The orange arrows swing in from opposite sides on arcs (one over, one under) and lock.
  const dx = (1 - e) * 520, dy = (1 - e) * 260, rot = (1 - e) * 70
  const tl = `translate(${f(-dx / s)} ${f(-dy / s)}) rotate(${f(-rot)} ${MARK.loops[0].cx} ${MARK.loops[0].cy})`
  const tr = `translate(${f(dx / s)} ${f(dy / s)}) rotate(${f(-rot)} ${MARK.loops[1].cx} ${MARK.loops[1].cy})`
  return mark({ cx, cy, width, variant, parts: { accentL: { transform: tl }, inkL: true, accentR: { transform: tr }, inkR: true } })
}

export { gameTile }
