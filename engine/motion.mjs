// Timing, eases, camera and deterministic randomness. Every value is a pure f(t): no clock, no Math.random.

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const lerp = (a, b, k) => a + (b - a) * k
/** 0 before `start`, 1 after `start + dur`, linear in between. */
export const span = (t, start, dur) => clamp((t - start) / dur)
/** sin(pi * span): 0 → 1 → 0 over the window. */
export const bump = (t, start, dur) => Math.sin(Math.PI * span(t, start, dur))
export const rad = (deg) => (deg * Math.PI) / 180
export const f = (n) => Number(n.toFixed(2))

/** CSS cubic-bezier(x1, y1, x2, y2) as an ease function (Newton + bisection). */
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  const sx = (u) => ((ax * u + bx) * u + cx) * u
  const sy = (u) => ((ay * u + by) * u + cy) * u
  const dx = (u) => (3 * ax * u + 2 * bx) * u + cx
  return (p) => {
    if (p <= 0) return 0
    if (p >= 1) return 1
    let u = p
    for (let i = 0; i < 8; i++) {
      const e = sx(u) - p
      if (Math.abs(e) < 1e-6) return sy(u)
      const d = dx(u)
      if (Math.abs(d) < 1e-6) break
      u -= e / d
    }
    let lo = 0, hi = 1
    u = p
    for (let i = 0; i < 30; i++) {
      const x = sx(u)
      if (Math.abs(x - p) < 1e-6) break
      if (x < p) lo = u
      else hi = u
      u = (lo + hi) / 2
    }
    return sy(u)
  }
}

/**
 * The ease vocabulary. Nothing visible moves linearly; no bounce, no elastic, no back.
 * SLAM is the only overshoot (2.5 %): impacts only.
 */
export const E = {
  glide: bezier(0.16, 1, 0.3, 1), //   default arrival
  settle: bezier(0.22, 1, 0.36, 1), // Trampa UI ease-out (DESIGN.md), per-word rise
  exit: bezier(0.5, 0, 0.75, 0), //    leaving frame
  inOut: bezier(0.65, 0, 0.35, 1), //  swaps, camera keys
  expoInOut: bezier(0.87, 0, 0.13, 1), // locks, pull-backs, flips
  morph: bezier(0.83, 0, 0.17, 1), //  wipes, morphs
  whip: bezier(0.75, 0, 0.15, 1), //   whip pans, slides
  sway: bezier(0.37, 0, 0.63, 1), //   ambient sway only
  expoOut: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(p))), // draws, rings
  expoIn: (p) => (p <= 0 ? 0 : Math.pow(2, 10 * (clamp(p) - 1))), //  dives into a cut
  power3In: (p) => clamp(p) ** 3, //   drop back through a slot
  power4In: (p) => clamp(p) ** 4, //   suck into an iris
  /** 2.5 % overshoot slam (M0,0 C.06,.62 .13,1.06 .28,1.025 C.42,.995 .62,1 1,1): impacts only. */
  slam: (p) => pathEase(p, [[0, 0, 0.06, 0.62, 0.13, 1.06, 0.28, 1.025], [0.28, 1.025, 0.42, 0.995, 0.62, 1, 1, 1]]),
}

/** An ease drawn as cubic segments [x0,y0,x1,y1,x2,y2,x3,y3] in (progress, value) space. */
function pathEase(p, segs) {
  p = clamp(p)
  const s = segs.find((g) => p <= g[6]) ?? segs[segs.length - 1]
  const cub = (a, b, c, d, u) => ((1 - u) ** 3) * a + 3 * (1 - u) ** 2 * u * b + 3 * (1 - u) * u * u * c + u ** 3 * d
  let lo = 0, hi = 1, u = 0.5
  for (let i = 0; i < 40; i++) {
    u = (lo + hi) / 2
    if (cub(s[0], s[2], s[4], s[6], u) < p) lo = u
    else hi = u
  }
  return cub(s[1], s[3], s[5], s[7], u)
}

/** Eased progress of a window: ease(span(t, start, dur)). */
export const ease = (t, start, dur, fn = E.glide) => fn(span(t, start, dur))

/**
 * Keyframe track: keys = [[time, value], ...] (value: number or array of numbers), each segment
 * eased with `fn` (or the key's own third element). Holds before the first and after the last key.
 * Keep keys at shot boundaries: a key in the middle of a hold is a dead stop (reads as a quiet window).
 */
export function track(t, keys, fn = E.inOut) {
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, f1] = keys[i]
    const [t0, v0] = keys[i - 1]
    if (t <= t1) {
      const k = (f1 || fn)((t - t0) / (t1 - t0))
      return Array.isArray(v0) ? v0.map((a, j) => lerp(a, v1[j], k)) : lerp(v0, v1, k)
    }
  }
  return keys[keys.length - 1][1]
}

/**
 * Integrated spin: angle = w*t + sum of kicks that decay smoothly (never a tweened stop).
 * kicks = [[time, degrees], ...]; tau in seconds.
 */
export function spin(t, w = 0, kicks = [], tau = 0.18) {
  let a = w * t
  for (const [tk, deg] of kicks) if (t > tk) a += deg * (1 - Math.exp(-(t - tk) / tau))
  return a
}

/** Deterministic shake on impacts: [[time, px], ...] → {x, y}. 22 Hz, tau 0.06 s. Impacts only, ≤ 3 per film. */
export function shake(t, hits, tau = 0.06) {
  let x = 0, y = 0
  for (const [th, amp] of hits) {
    const dt = t - th
    if (dt < 0 || dt > tau * 6) continue
    const a = amp * Math.exp(-dt / tau)
    x += a * Math.sin(2 * Math.PI * 22 * dt + 0.7)
    y += a * Math.sin(2 * Math.PI * 22 * dt + 2.3) * 0.8
  }
  return { x, y }
}

/** Seeded PRNG (mulberry32). Use for scatter layouts, never per-frame noise on positions. */
export function rng(seed = 0x7a4d9a) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let r = Math.imul(s ^ (s >>> 15), 1 | s)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** Mixes two #rrggbb colours (k = 0 → a, 1 → b). */
export function mix(a, b, k) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * clamp(k)).toString(16).padStart(2, "0")).join("")}`
}

/**
 * The 2.5D camera. cam = { x, y, zoom, rot } looks at world point (x, y); a layer with parallax p
 * (0.6 far grid … 1 subject … 1.3 foreground) gets the camera's move scaled by p, so depth reads on
 * every move. Returns an SVG transform string for a <g>.
 */
export function camT(cam, p = 1, W = 1080, H = 1920) {
  const z = Math.pow(cam.zoom ?? 1, p)
  const sx = cam.shakeX ?? 0, sy = cam.shakeY ?? 0
  return `translate(${f(W / 2 + sx)} ${f(H / 2 + sy)}) rotate(${f((cam.rot ?? 0) * p)}) scale(${(z).toFixed(5)}) translate(${f(-cam.x * p - (W / 2) * (1 - p))} ${f(-cam.y * p - (H / 2) * (1 - p))})`
}

/** The screen position of world point (x, y) on a layer with parallax p: the exact inverse of camT's mapping. */
export function worldToScreen(cam, p, x, y, W = 1080, H = 1920) {
  const z = Math.pow(cam.zoom ?? 1, p), r = ((cam.rot ?? 0) * p * Math.PI) / 180
  const lx = (x - cam.x * p - (W / 2) * (1 - p)) * z, ly = (y - cam.y * p - (H / 2) * (1 - p)) * z
  return [W / 2 + (cam.shakeX ?? 0) + lx * Math.cos(r) - ly * Math.sin(r), H / 2 + (cam.shakeY ?? 0) + lx * Math.sin(r) + ly * Math.cos(r)]
}

/** A camera's screen mapping as a function, for text({ screen }) inside camT(cam, p). */
export const screenOf = (cam, p = 1) => (x, y) => worldToScreen(cam, p, x, y)

/**
 * Scale a group about a point (slams, punches): { transform, screen } — put `transform` on the <g>
 * and pass `screen` to text() inside it, so QC measures the size the viewer sees.
 */
export function about(cx, cy, s) {
  return { transform: `translate(${f(cx)} ${f(cy)}) scale(${s.toFixed(4)}) translate(${f(-cx)} ${f(-cy)})`, screen: (x, y) => [cx + (x - cx) * s, cy + (y - cy) * s] }
}

/** Log-space zoom between z0 and z1 (dives feel constant-speed in the eye, not linear in scale). */
export const logZoom = (z0, z1, k) => Math.exp(lerp(Math.log(z0), Math.log(z1), k))

/** Beat grid: time of beat n (0-based) at bpm with phase offset (s). */
export const beat = (n, bpm, phase = 0) => phase + (n * 60) / bpm
