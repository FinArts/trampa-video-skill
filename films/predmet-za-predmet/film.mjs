// „Predmet za predmet" · 15.0 s · 9:16 · 120 BPM · no voice-over (type carries it, plays muted)
// One idea: things trade for things, money never enters. Muted 3-second read: a guitar gathering
// dust swaps places with a phone on an arc that draws the Trampa arrows.
//
// Beat map (s)                                         move / carrier → next
// 0.00  HOOK   „Gitara skuplja prašinu?" + guitar tile, dust drifting        frame 0 complete
// 0.50  HIT    guitar springs, dust puff, ring (B-impact 1)                  guitar
// 1.10  TURN   hook drops; „Zamijenite je / za ono što trebate." rises      key phrase lands 2.86
// 1.60         phone slides in on the stage                                  phone
// 2.30  Z1     swap arc 0.7 s, orange arrow trails (the logo's arrows)       guitar ↔ phone
// 4.55  Z4     dive into the phone's screen (log zoom ×30, expo.in)          phone screen
// 5.35  Z3     iris opens on the wall of items, camera pulls back            phone tile in the wall
// 6.30  Z1×3   three swaps across the wall; „Predmet za predmet."          tiles
// 7.95  Z7     the wall clears tile by tile; the ball flies to centre         ball tile
// 8.75  REST   the ball tile, a 49 € price tag swinging (1.05 s)             tag
// 9.80  Z2     the trade line slashes the string, the tag falls away         trade line
// 10.25 DAH    hard cut: dimmed, music dips (0.25 s)
// 10.50 PAYOFF hard cut: orange, „0 €" slams, camera punch, shockwave, burst (A-impact)
// 11.05        „Bez novca." rises, navy on orange; small item tiles drift behind
// 12.55 Z2     trade-line wipe to navy: the end card
// 12.90 SIGN   the two orange arrows swing in and lock: the mark; logo hit 13.35
// 13.35        TRAMPA tracks in 0.25 em → 0.06; trampa.app rises
// 14.55 LOOP   trade-line wipe back to frame 0
import { C, W, H, AXIS, doc, grid, stage, gameTile, wordmark, CATEGORY, uid } from "../../engine/brand.mjs"
import { E, ease, span, bump, lerp, clamp, track, camT, shake, logZoom, f, rng } from "../../engine/motion.mjs"
import { text, rise, drop, fit } from "../../engine/type.mjs"
import { swapPoses, swapTrails, tradeWipe, tradeBand, iris, ring, burst, dust, priceTag, hop, markAssemble, streaks } from "../../engine/fx.mjs"

export const meta = {
  title: "Trampa · Predmet za predmet",
  dur: 15.0,
  fps: 60,
  bpm: 120,
  phase: 0,
  cuts: [10.25, 10.5], //       the only hard cuts: into the Dah and onto the payoff
  crisp: [[10.5, 10.56]], //    the slam lands solid
  rest: [8.75, 9.8],
  dah: [10.25, 10.5],
  cues: { hook: 0.5, payoff: 10.5, portal: 5.35, sign: 13.35 },
  // Seamless transitions: cut detection may fire inside these windows (a cover or a match hides them).
  transitions: [[2.3, 3.0, "Z1 swap"], [4.55, 5.8, "Z4 dive + Z3 iris"], [7.95, 8.75, "Z7 clear + carry"], [9.8, 10.25, "Z2 slash"], [10.5, 10.85, "A-impact shockwave"], [12.55, 13.15, "Z2 wipe"], [14.55, 15.0, "Z2 loop"]],
  review: [[0, "frame 0 / hook"], [0.56, "hit"], [2.65, "Z1 swap"], [3.6, "key phrase"], [5.1, "Z4 dive"], [5.6, "Z3 iris"], [6.6, "wall swaps"], [8.3, "Z7 clear"], [9.3, "rest"], [9.98, "Z2 slash"], [10.35, "Dah"], [10.6, "payoff"], [11.9, "Bez novca."], [12.85, "Z2 wipe"], [13.4, "logo hit"], [14.4, "sign"]],
}

const T = { hit: 0.5, hookOut: 1.1, line1: 1.3, phoneIn: 1.6, line2: 2.0, swap: 2.3, swapDur: 0.7, keyOut: 4.68, dive: 4.55, iris: 5.35, wallText: 6.1, wallSwaps: [6.3, 6.8, 7.3], wallOut: 7.9, whip: 7.95, rest: 8.75, slash: 9.8, dah: 10.25, pay: 10.5, payLine: 11.05, wipe: 12.55, mark: 12.9, lock: 13.35, url: 13.75, loop: 14.55 }

// ─── Scene 1: hook, turn, swap, dive (0 → 5.35) ──────────────────────────────

const GUITAR = { glyph: "guitar", tone: "amber" }
const PHONE = { glyph: "phone", tone: "violet" }
const LEFT = [296, 1120], RIGHT = [790, 1120], TILE = 420
const SWAP = { a: LEFT, b: RIGHT, rise: 270, far: 0.76, near: 1.14 }
const HOOK = "Gitara skuplja\nprašinu?"
const HOOK_SIZE = fit(HOOK, "bricolage-800", 860, 168)
const KEY = "Zamijenite je\nza ono što trebate."
const KEY_SIZE = fit(KEY, "bricolage-800", 870, 140)
const KEY_N1 = [..."Zamijenite je"].length

/** A point of the phone glyph (64 grid, before the glyph's own -12° turn) in world px for a tile pose. */
function tilePoint(p, gx, gy, glyphRot = -12) {
  const g = 0.76 * p.size, s = p.scale ?? 1
  const r0 = (glyphRot * Math.PI) / 180
  const lx = 32 + (gx - 32) * Math.cos(r0) - (gy - 32) * Math.sin(r0), ly = 32 + (gx - 32) * Math.sin(r0) + (gy - 32) * Math.cos(r0)
  const x = (-g / 2 + (lx * g) / 64) * s, y = (-g / 2 - 0.035 * p.size + (ly * g) / 64) * s
  const r = ((p.rot ?? 0) * Math.PI) / 180
  return [p.cx + x * Math.cos(r) - y * Math.sin(r), p.cy + x * Math.sin(r) + y * Math.cos(r)]
}

function swapPhase(t) {
  const e = E.inOut(span(t, T.swap, T.swapDur))
  const { A, B } = swapPoses(e, SWAP)
  // Before the swap the phone slides in from the right edge on the stage.
  const inP = ease(t, T.phoneIn, 0.6, E.glide)
  if (t < T.swap) B.cx = lerp(W + 260, RIGHT[0], inP)
  return { e, A: { ...A, size: TILE, ...GUITAR }, B: { ...B, size: TILE, ...PHONE }, inP }
}

function scene1(t) {
  const { e, A, B, inP } = swapPhase(t)
  const h = hop(t, T.hit - 0.08, { height: 110 })
  if (t < T.swap) Object.assign(A, { cy: A.cy + h.dy, lift: h.lift, squash: h.squash })
  const h2 = hop(t, 3.7, { height: 70 }), h3 = hop(t, 4.05, { height: 50 })
  if (t > 3.5) { A.cy += h2.dy; A.lift = h2.lift; A.squash = h2.squash; B.cy += h3.dy; B.lift = h3.lift; B.squash = h3.squash }
  // Idle life before the swap: a slow sway; the phone leans in as it brakes.
  A.rot += 2 * Math.sin(t * 2.1) * (1 - span(t, T.swap - 0.2, 0.2))
  if (t < T.swap) B.rot += 8 * (1 - inP)
  // Camera: always drifting; a jolt on the hit; leans with the swap; then dives into the phone screen.
  const target = tilePoint(B, 30, 44)
  const d = ease(t, T.dive, T.iris - T.dive, E.expoIn)
  const settle = ease(t, T.swap + T.swapDur, 1.2, E.glide)
  const cam = {
    x: lerp(540 + 12 * Math.sin(t * 0.7), target[0], Math.max(d, 0.18 * settle)),
    y: lerp(960, target[1], Math.max(d, 0.1 * settle)),
    zoom: logZoom(1 + 0.012 * t + 0.1 * settle, 30, d),
    rot: 1.6 * bump(t, T.swap, T.swapDur) - 3 * d,
  }
  const sh = shake(t, [[T.hit, 3]])
  cam.shakeX = sh.x; cam.shakeY = sh.y
  const trails = swapTrails(e, ease(t, T.swap + T.swapDur, 0.4, E.inOut), SWAP, { width: 30 })
  const puff = dustPuff(t, T.hit, A.cx, A.cy + 140)
  const world = `<g transform="${camT(cam, 0.6)}">${grid()}</g><g transform="${camT(cam, 0.85)}">${stage({ x: 820, sweep: span(t, T.swap + T.swapDur - 0.1, 0.5) })}</g>
<g transform="${camT(cam, 1.15)}">${dust(t, { seed: 4 })}</g>
<g transform="${camT(cam, 1)}">${puff}${ring({ cx: A.cx, cy: A.cy + 40, p: span(t, T.hit, 0.5), r0: 120, r1: 420, w: 14 })}${trails}${gameTile(A)}${streaks({ cx: B.cx + 150, cy: B.cy, angle: 180, speed: t < T.swap ? (1 - inP) * span(t, T.phoneIn, 0.05) : 0, len: 260 })}${gameTile(B)}</g>`
  // Type in screen space: never moved by the camera, never blurred by it.
  const hookAnim = (i) => ({ dy: drop(t, T.hookOut, HOOK_SIZE)(i).dy + (i >= 15 ? -10 * bump(t, T.hit, 0.25) : 0) })
  const hook = t < T.hookOut + 0.5 ? text(HOOK, { x: AXIS, y: 520, size: HOOK_SIZE, color: [C.white, C.orange], slot: true, anim: hookAnim }) : ""
  const keyAnim = (i) => (t >= T.keyOut ? drop(t, T.keyOut, KEY_SIZE)(i) : i < KEY_N1 ? rise(t, T.line1, KEY_SIZE)(i) : rise(t, T.line2, KEY_SIZE)(i - KEY_N1))
  const key = t >= T.line1 && t < T.keyOut + 0.4 ? text(KEY, { x: AXIS, y: 430, size: KEY_SIZE, color: [C.white, C.orange], slot: true, anim: keyAnim }) : ""
  return world + hook + key
}

/** Dust shaken off the tile on the hit: navy-700 dots flying out and down, shrinking. */
function dustPuff(t, t0, cx, cy) {
  const p = span(t, t0, 0.7)
  if (p <= 0 || p >= 1) return ""
  const R = rng(21)
  let out = ""
  for (let i = 0; i < 16; i++) {
    const a = Math.PI * (1.05 + 0.9 * R()), d = lerp(30, 160 + 140 * R(), E.expoOut(p))
    out += `<circle cx="${f(cx + Math.cos(a) * d * 1.6)}" cy="${f(cy + Math.sin(a) * d * 0.5 + 120 * p * p)}" r="${f((6 + 10 * R()) * (1 - p))}" fill="${i % 3 ? "#2A3A6E" : "#3B4C82"}"/>`
  }
  return out
}

// ─── Scene 2: the wall of items, swaps, clear + carry, rest, slash (5.35 → 10.5)

const WALL_KEYS = ["vozila", "elektronika", "moda", "sport", "gaming", "glazba", "knjige", "djeca", "ljubimci", "dom", "alati", "nekretnine"]
const WT = 276, WG = 36, COLS = 3
const wallPos = (k) => [AXIS + ((k % COLS) - 1) * (WT + WG), 720 + Math.floor(k / COLS) * (WT + WG)]
const PHONE_SLOT = 1 // elektronika
const WALL_SWAPS = [[0, 4], [5, 7], [9, 11]] // pairs that trade places, one per beat
const REST = { x: AXIS, y: 1080 }
const BALL_SLOT = 3 // sport: the carrier into the rest
const WALL_SIZE = fit("Predmet za predmet.", "bricolage-800", 870, 130)
const TAG_TIE = [REST.x + 30, REST.y - 110]

function wallLayout(t) {
  const pos = WALL_KEYS.map((_, k) => ({ k, xy: wallPos(k), side: 0, e: 0 }))
  const draws = []
  WALL_SWAPS.forEach(([a, b], j) => {
    const t0 = T.wallSwaps[j]
    const e = E.inOut(span(t, t0, 0.55))
    const geo = { a: wallPos(a), b: wallPos(b), rise: 120, far: 0.8, near: 1.12, lean: 8 }
    const { A, B } = swapPoses(e, geo)
    pos[a].pose = A; pos[b].pose = B
    draws.push(swapTrails(e, ease(t, t0 + 0.55, 0.35, E.inOut), geo, { width: 18 }))
  })
  return { pos, trails: draws.join("") }
}

function scene2(t) {
  // Camera: starts close on the phone tile (continuing the dive), pulls back, drifts, then settles on the rest.
  const pull = ease(t, T.iris, 0.75, E.expoInOut)
  const whip = ease(t, T.whip, T.rest - T.whip, E.inOut)
  const [px, py] = wallPos(PHONE_SLOT)
  const restPush = span(t, T.rest, 2) * 0.05
  const cam = {
    x: lerp(lerp(px, 540, pull), REST.x + 36, whip) + 10 * Math.sin(t * 0.8) * (1 - whip),
    y: lerp(lerp(py, 1000, pull) + 26 * (t - T.iris) * (1 - whip), REST.y - 80, whip),
    zoom: lerp(logZoom(4.2, 1, pull) * (1 + 0.01 * (t - T.iris)), 1.1 + restPush, whip),
    rot: lerp(2.5, 0, pull),
  }
  const { pos, trails } = wallLayout(t)
  let tiles = ""
  // Z7: every tile but the ball shrinks away, nearest to the ball last (stagger 35 ms).
  const [bx, by] = wallPos(BALL_SLOT)
  const order = pos.filter((p) => p.k !== BALL_SLOT).sort((a, b) => Math.hypot(b.xy[0] - bx, b.xy[1] - by) - Math.hypot(a.xy[0] - bx, a.xy[1] - by))
  for (const p of pos) {
    if (p.k === BALL_SLOT) continue
    const out = ease(t, T.whip + order.indexOf(p) * 0.035, 0.32, E.exit)
    if (out >= 1) continue
    const cat = CATEGORY[WALL_KEYS[p.k]]
    const pose = p.pose ?? { cx: p.xy[0], cy: p.xy[1], rot: 0, scale: 1, lift: 0 }
    tiles += gameTile({ ...pose, cy: pose.cy + 3 * Math.sin(t * 2 + p.k), rot: (pose.rot ?? 0) + 2 * Math.sin(t * 1.3 + p.k * 1.7) + 20 * out, scale: (pose.scale ?? 1) * (1 - out), size: WT, glyph: cat.glyph, tone: cat.tone })
  }
  // The rest: the ball tile with a price tag; the slash cuts the string, the tag falls away.
  const swing = 6 * Math.sin((t - T.rest) * 2.4) * (1 - span(t, T.slash, 0.2)) + 4
  const fall = ease(t, T.slash + 0.13, 0.9, E.exit)
  // The carrier: the ball leaves its slot on an arc, grows to the rest size and lands with a squash.
  const fly = ease(t, T.whip + 0.2, 0.62, E.inOut)
  const land = hop(t, T.whip + 0.78, { height: 0, crouch: 0.01, up: 0.01, down: 0.01, land: 0.22 })
  const restTile = gameTile({ cx: lerp(bx, REST.x - 150, fly), cy: lerp(by, REST.y + 60, fly) - 160 * Math.sin(Math.PI * fly), size: lerp(WT, 400, fly), glyph: "ball", tone: "emerald", rot: lerp(0, -5, fly) + 1.5 * Math.sin(t * 1.7), lift: 0.6 * Math.sin(Math.PI * fly), squash: land.squash })
  const tagIn = E.slam(span(t, T.rest - 0.05, 0.3))
  const tag = tagIn <= 0 ? "" : `<g transform="translate(${f(TAG_TIE[0])} ${f(TAG_TIE[1])}) scale(${Math.max(0.001, tagIn).toFixed(4)}) translate(${f(-TAG_TIE[0])} ${f(-TAG_TIE[1])})">${priceTag({ ax: TAG_TIE[0], ay: TAG_TIE[1], label: "49 €", size: 1.25, swing, string: 170, cut: t >= T.slash + 0.12, fall })}</g>`
  const world = `<g transform="${camT(cam, 0.6)}">${grid()}</g><g transform="${camT(cam, 1.15)}">${dust(t, { seed: 9, area: [-400, -200, 1900, 4400] })}</g><g transform="${camT(cam, 1)}">${trails}${tiles}${restTile}${tag}</g>`
  // The slash: an orange band on the slant crosses the frame fast; it leaves the trade line behind.
  const slash = tradeBand(ease(t, T.slash, 0.32, E.morph), { band: 160 })
  const line = t >= T.slash + 0.32 ? stage({ x: 600, fill: "none", rule: 8 }) : ""
  const wallAnim = (i) => (t >= T.wallOut ? drop(t, T.wallOut, WALL_SIZE)(i) : rise(t, T.wallText, WALL_SIZE)(i))
  const label = t >= T.wallText && t < T.wallOut + 0.4 ? text("Predmet za predmet.", { x: AXIS, y: 480, size: WALL_SIZE, slot: true, anim: wallAnim }) : ""
  return world + slash + line + label
}

// ─── Scene 3: Dah and payoff (10.25 → 12.55) ─────────────────────────────────

function dah(t) {
  return `${scene2(T.dah)}<rect width="${W}" height="${H}" fill="${C.navy950}" fill-opacity="0.55"/>`
}

const PAY_DRIFT = [[140, 1650, "guitar", "amber", 150, 60], [930, 1500, "phone", "violet", 130, 80], [880, 420, "ball", "emerald", 120, 45], [170, 520, "teddy", "fuchsia", 110, 70]]
function payoff(t) {
  const u = t - T.pay
  const slam = E.slam(span(t, T.pay, 0.25))
  const sh = shake(t, [[T.pay, 5]], 0.07)
  // The A-impact: the whole card punches in from 1.45× (camera slam) and keeps easing in.
  const zoom = lerp(1.45, 1, E.glide(span(t, T.pay, 0.5))) * (1 + 0.04 * E.glide(span(t, T.pay + 0.4, 2)))
  const cx = AXIS, cy = 860
  const zero = text("0 €", { x: cx, y: cy + 150, size: 420, face: "bricolage-800", color: C.navy, track: -0.03 })
  const sc = lerp(1.35, 1, slam) * zoom
  const body = `<g transform="translate(${f(sh.x)} ${f(sh.y)})">
${ring({ cx, cy, p: span(t, T.pay, 0.6), r0: 160, r1: 760, w: 26, color: C.navy })}${ring({ cx, cy, p: span(t, T.pay + 0.12, 0.6), r0: 120, r1: 620, w: 14, color: C.white })}
${ring({ cx, cy, p: span(t, T.pay, 0.5), r0: 120, r1: 1250, w: 190, color: C.navy })}${ring({ cx, cy, p: span(t, T.pay + 0.24, 0.7), r0: 300, r1: 980, w: 40, color: C.navy })}
${burst({ cx, cy, p: span(t, T.pay + 0.02, 0.8), n: 16, r0: 220, r1: 620, size: 56, colors: [C.navy, C.white, C.navy800] })}
<g transform="translate(${cx} ${cy}) scale(${sc.toFixed(4)}) translate(${-cx} ${-cy})">${zero}</g>
${text("Bez novca.", { x: cx, y: 1210, size: 112, color: C.navy, slot: true, anim: rise(t, T.payLine, 112) })}</g>`
  // Life in the hold: small item tiles drift up behind the type (navy-on-orange stays the only colour pair).
  const drift = PAY_DRIFT.map(([x, y0, g, tone, sz, sp], i) => gameTile({ cx: x + 14 * Math.sin(u * 1.3 + i), cy: y0 - sp * u, size: sz, glyph: g, tone, rot: -8 + 16 * Math.sin(u * 0.9 + i * 2) })).join("")
  return `<rect width="${W}" height="${H}" fill="${C.orange}"/><g transform="translate(${W / 2} ${H / 2}) scale(${(1 + 0.03 * u).toFixed(4)}) translate(${-W / 2} ${-H / 2})">${drift}</g>${body}`
}

// ─── Scene 4: the sign (12.55 → 15) ──────────────────────────────────────────

function sign(t) {
  const k = ease(t, T.mark, T.lock - T.mark, (p) => p)
  const trackEm = lerp(0.25, 0, ease(t, T.lock - 0.05, 0.6, E.glide))
  const wmIn = span(t, T.lock - 0.05, 0.08)
  const cam = { x: 540, y: 960 + 20 * (1 - ease(t, T.wipe, 2.5, E.glide)), zoom: 1.04 - 0.03 * ease(t, T.wipe, 2.5, E.glide), rot: 0 }
  const mk = markAssemble(k, { cx: AXIS, cy: 690, width: 660 })
  const flare = ring({ cx: AXIS, cy: 690, p: span(t, T.lock, 0.45), r0: 240, r1: 330, w: 10, color: C.orange })
  return `<g transform="${camT(cam, 0.6)}">${grid()}</g><g transform="${camT(cam, 0.85)}">${stage({ x: 1010, sweep: span(t, T.lock, 0.6) })}</g><g transform="${camT(cam, 1)}">${flare}${mk}</g>
${wmIn > 0 ? wordmark({ cx: AXIS, y: 1150, size: 170, track: trackEm, opacity: wmIn }) : ""}
${t >= T.url ? text("trampa.app", { x: AXIS, y: 1262, size: 64, face: "figtree-700", track: 0.01, color: C.orange200, slot: true, anim: rise(t, T.url, 58), role: "label" }) : ""}`
}

// ─── Frame ───────────────────────────────────────────────────────────────────

export function frame(t) {
  if (t < T.iris) return doc(scene1(t))
  if (t < T.iris + 0.42) {
    // Z3: the dive lands inside the phone's screen (tone dark fills the frame); the wall opens through an iris.
    const p = E.glide(span(t, T.iris, 0.42))
    return iris(doc("", "#5B21B6"), doc(scene2(t)), { cx: 540, cy: 960, r: lerp(0, 1250, p), rim: 22 })
  }
  if (t < T.dah) return doc(scene2(t))
  if (t < T.pay) return doc(dah(t))
  if (t < T.wipe) return doc(payoff(t), C.orange)
  if (t < T.wipe + 0.6) return tradeWipe(E.morph(span(t, T.wipe, 0.6)), doc(payoff(t), C.orange), doc(sign(t)), { band: 240, color: C.orange200 })
  if (t < T.loop) return doc(sign(t))
  // Loop seam: the trade line wipes the end card off and frame 0 is back (the hook at its own t → 0).
  const p = E.morph(span(t, T.loop, meta.dur - T.loop))
  return tradeWipe(p, doc(sign(t)), doc(scene1(Math.min(0, t - meta.dur))), { dir: -1, band: 200 })
}

// ─── Score ───────────────────────────────────────────────────────────────────

export function score(S) {
  S.groove({
    to: meta.dur,
    chords: ["F", "Dm", "Bb", "C"],
    energy: [[0, 1], [T.hit, 2], [T.dive, 1], [T.iris, 2], [T.rest, 0], [T.pay, 2], [T.wipe + 0.4, 1], [T.lock - 0.3, 0]],
    dips: [[T.dah - 0.02, T.pay - T.dah]],
  })
  // Hook
  S.stamp(T.hit, 0.8); S.hit(T.hit, 0.8); S.pop(T.hit + 0.38, 79)
  S.swish(T.hookOut - 0.05, { g: 0.4 })
  S.tick(T.line1 + 0.6, 91); S.tick(T.line2 + 0.85, 96)
  // Phone in + swap
  S.whoosh(T.phoneIn - 0.1, { dur: 0.5, from: 0.8, to: 0.1, g: 0.6 })
  S.whoosh(T.swap, { dur: T.swapDur, from: -0.6, to: 0.6, g: 0.8 })
  S.swap(T.swap + T.swapDur - 0.04)
  S.pop(3.7 + 0.38, 76, 0.6); S.pop(4.05 + 0.38, 81, 0.5)
  // Dive → iris
  S.riser(T.iris, { dur: 0.8, g: 0.9 })
  S.whoosh(T.dive + 0.3, { dur: 0.55, lo: 200, hi: 2400, g: 0.7 })
  S.hit(T.iris, 0.7)
  // Wall swaps
  T.wallSwaps.forEach((t0, j) => { S.swish(t0, { from: -0.4 + j * 0.3, to: 0.4 - j * 0.2 }); S.swap(t0 + 0.51, { root: ["C5", "D5", "F5"][j], g: 0.7 }) })
  S.tick(T.wallText + 0.85, 98)
  // Whip and rest
  for (let k = 0; k < 11; k++) S.pop(T.whip + k * 0.035 + 0.1, 96 - k, 0.35, ((k % 3) - 1) * 0.5)
  S.whoosh(T.whip + 0.2, { dur: 0.62, from: -0.5, to: 0.1, g: 0.6 })
  S.pop(T.whip + 0.8, 67, 0.9); S.stamp(T.rest - 0.05, 0.4)
  // Slash, Dah, payoff
  S.swish(T.slash + 0.02, { g: 0.9, from: -0.7, to: 0.7 }); S.stamp(T.slash + 0.12, 0.6); S.pop(T.slash + 0.5, 60, 0.6)
  S.riser(T.pay, { dur: 0.25, g: 0.5 })
  S.impact(T.pay, 1); S.sparkle(T.pay + 0.05, 0.8)
  S.tick(T.payLine + 0.5, 96)
  // Sign
  S.whoosh(T.wipe, { dur: 0.6, from: -0.7, to: 0.7, g: 0.7 })
  S.logo(T.lock)
  S.tick(T.url + 0.5, 103, 0.7)
  S.swish(T.loop, { from: 0.7, to: -0.7, g: 0.5 })
}
