// The Trampa score, made in code: synth instruments, SFX, a lively groove, the sonic logo, a master
// at -14 LUFS / -1.5 dBTP. Deterministic (seeded noise). No samples, no libraries, no stock music.
// A film defines score(S) and calls the methods below with times from its cue table.
import { spawnSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { rng } from "./motion.mjs"

export const SR = 48000
const TAU = Math.PI * 2
const mtof = (m) => 440 * 2 ** ((m - 69) / 12)
const NOTE = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 }
/** "F3" → midi */
export const midi = (n) => { const m = /^([A-G][#b]?)(-?\d)$/.exec(n); return 12 * (Number(m[2]) + 1) + NOTE[m[1]] }
/** Chord name → midi notes in a mid register: F, Dm, Bb, C, Am, Gm, Fmaj7, Csus4 … */
export function chord(name, root = 3) {
  const m = /^([A-G][#b]?)(m|maj7|7|sus4|sus2|add9)?$/.exec(name)
  const r = 12 * (root + 1) + NOTE[m[1]]
  const iv = { undefined: [0, 4, 7], m: [0, 3, 7], maj7: [0, 4, 7, 11], 7: [0, 4, 7, 10], sus4: [0, 5, 7], sus2: [0, 2, 7], add9: [0, 4, 7, 14] }[m[2]]
  return iv.map((i) => r + i)
}

class Biquad {
  constructor() { this.x1 = this.x2 = this.y1 = this.y2 = 0 }
  set(type, f, q = 0.707, gainDb = 0) {
    const w = (TAU * Math.min(f, SR * 0.45)) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q), A = 10 ** (gainDb / 40)
    let b0, b1, b2, a0, a1, a2
    if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al }
    else if (type === "hp") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al }
    else if (type === "bp") { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al }
    else { b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A } // peaking
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0
    return this
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y
    return y
  }
}

/** Equal-power pan: p -1 (left) … 1 (right). */
const panLR = (p) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)]

export class Score {
  constructor(meta) {
    this.meta = meta
    this.dur = meta.dur
    this.n = Math.ceil((meta.dur + 0.02) * SR)
    const bus = () => [new Float32Array(this.n), new Float32Array(this.n)]
    this.music = bus(); this.sfx = bus(); this.verb = bus(); this.voiceBus = bus()
    this.seed = 1
    this.bpm = meta.bpm ?? 118
    this.phase = meta.phase ?? 0
    this.events = []
    this.dipList = []
    this.voiceSpan = null
  }
  beat(n) { return this.phase + (n * 60) / this.bpm }
  noise() { return rng(this.seed++ * 7919) }

  /** Adds a mono signal gen(i, tt) at time t for dur seconds into a bus with pan and reverb send. */
  _add(bus, t, dur, gen, { pan = 0, gain = 1, send = 0 } = {}) {
    const i0 = Math.max(0, Math.round(t * SR)), n = Math.round(dur * SR)
    const [l, r] = panLR(pan)
    const B = this[bus]
    for (let k = 0; k < n && i0 + k < this.n; k++) {
      const v = gen(k, k / SR) * gain
      B[0][i0 + k] += v * l; B[1][i0 + k] += v * r
      if (send) { this.verb[0][i0 + k] += v * l * send; this.verb[1][i0 + k] += v * r * send }
    }
  }

  // ─── Instruments ───────────────────────────────────────────────────────────
  kick(t, g = 1, bus = "music") {
    let ph = 0
    const R = this.noise()
    this._add(bus, t, 0.5, (k, tt) => {
      ph += (TAU * (46 + 120 * Math.exp(-tt / 0.028))) / SR
      const click = tt < 0.002 ? (R() * 2 - 1) * (1 - tt / 0.002) * 0.4 : 0
      return Math.tanh(1.6 * Math.sin(ph) * Math.exp(-tt / 0.26) * Math.min(1, tt / 0.0015)) + click
    }, { gain: 0.9 * g })
  }
  clap(t, g = 1, bus = "music") {
    const R = this.noise(), bp = new Biquad().set("bp", 1500, 0.8)
    this._add(bus, t, 0.35, (k, tt) => {
      const e = [0, 0.009, 0.019].reduce((a, o) => a + (tt >= o ? Math.exp(-(tt - o) / 0.006) : 0), 0) * 0.6 + (tt > 0.019 ? Math.exp(-(tt - 0.019) / 0.11) : 0)
      return bp.run((R() * 2 - 1) * e) * 2.2
    }, { gain: 0.5 * g, send: 0.25, pan: 0.05 })
  }
  hat(t, g = 1, open = false, bus = "music") {
    const R = this.noise(), hp = new Biquad().set("hp", 7800, 0.7)
    this._add(bus, t, open ? 0.3 : 0.08, (k, tt) => hp.run((R() * 2 - 1)) * Math.exp(-tt / (open ? 0.12 : 0.025)), { gain: 0.22 * g, pan: 0.25 })
  }
  shaker(t, g = 1, bus = "music") {
    const R = this.noise(), bp = new Biquad().set("bp", 6000, 1.2)
    this._add(bus, t, 0.07, (k, tt) => bp.run(R() * 2 - 1) * Math.sin(Math.PI * Math.min(1, tt / 0.05)), { gain: 0.16 * g, pan: -0.3 })
  }
  bass(t, m, dur, g = 1, bus = "music") {
    const fr = mtof(m), lp = new Biquad().set("lp", 700, 0.8)
    this._add(bus, t, dur + 0.08, (k, tt) => {
      const env = Math.min(1, tt / 0.004) * (tt < dur ? 0.65 + 0.35 * Math.exp(-tt / 0.08) : 0.65 * Math.exp(-(tt - dur) / 0.03))
      return lp.run(Math.tanh(1.8 * (Math.sin(TAU * fr * tt) + 0.3 * Math.sin(TAU * 2 * fr * tt)))) * env
    }, { gain: 0.42 * g })
  }
  /** Marimba-like mallet: fundamental + 4th partial + a click. The lively Trampa lead. */
  marimba(t, m, g = 1, pan = 0, bus = "music") {
    const fr = mtof(m)
    this._add(bus, t, 0.9, (k, tt) => {
      const a = Math.min(1, tt / 0.002)
      return a * (Math.sin(TAU * fr * tt) * Math.exp(-tt / 0.32) + 0.32 * Math.sin(TAU * fr * 3.93 * tt) * Math.exp(-tt / 0.045) + 0.08 * Math.sin(TAU * fr * 9.2 * tt) * Math.exp(-tt / 0.012))
    }, { gain: 0.3 * g, pan, send: 0.22 })
  }
  /** Electric-piano stab (FM, ratio 1): chords. */
  keys(t, notes, dur, g = 1, bus = "music") {
    for (const [j, m] of notes.entries()) {
      const fr = mtof(m)
      this._add(bus, t, dur + 0.5, (k, tt) => {
        const idx = 1.6 * Math.exp(-tt / 0.35) + 0.25
        const env = Math.min(1, tt / 0.003) * Math.exp(-tt / 1.4) * (tt < dur ? 1 : Math.exp(-(tt - dur) / 0.12))
        return Math.sin(TAU * fr * tt + idx * Math.sin(TAU * fr * tt)) * env
      }, { gain: (0.16 * g) / Math.sqrt(notes.length), pan: (j / Math.max(1, notes.length - 1) - 0.5) * 0.5, send: 0.3 })
    }
  }
  /** Soft pad: detuned saws, low-passed, slow attack. */
  pad(t, notes, dur, g = 1, bus = "music") {
    for (const m of notes) {
      for (const det of [-0.08, 0.0, 0.09]) {
        const fr = mtof(m + det), lp = new Biquad().set("lp", 1300, 0.6)
        let ph = Math.abs(det) * 3
        this._add(bus, t, dur + 0.6, (k, tt) => {
          ph += fr / SR; ph -= Math.floor(ph)
          const env = Math.min(1, tt / 0.35) * (tt < dur ? 1 : Math.max(0, 1 - (tt - dur) / 0.6))
          return lp.run(2 * ph - 1) * env
        }, { gain: (0.05 * g) / notes.length, pan: det * 6, send: 0.35 })
      }
    }
  }
  bell(t, m, g = 1, pan = 0, bus = "sfx") {
    const fr = mtof(m)
    this._add(bus, t, 2.2, (k, tt) => Math.sin(TAU * fr * tt + 2.2 * Math.exp(-tt / 0.25) * Math.sin(TAU * fr * 3.5 * tt)) * Math.exp(-tt / 0.9) * Math.min(1, tt / 0.002), { gain: 0.12 * g, pan, send: 0.4 })
  }
  sub(t, f0, f1, dur, g = 1, bus = "sfx") {
    let ph = 0
    this._add(bus, t, dur, (k, tt) => {
      ph += (TAU * (f1 + (f0 - f1) * Math.exp(-tt / (dur * 0.35)))) / SR
      return Math.sin(ph) * Math.min(1, tt / 0.004) * Math.exp(-tt / (dur * 0.45))
    }, { gain: 0.7 * g })
  }

  // ─── SFX (additive on their own bus: they never duck the music) ────────────
  /** Filtered-noise whoosh, panned with the motion (pan from → to), peak at 60 % of dur. Put the peak on the move's fastest frame. */
  whoosh(t, { dur = 0.45, g = 1, from = -0.6, to = 0.6, lo = 350, hi = 3200 } = {}) {
    const R = this.noise(), bp = new Biquad(), peak = 0.6
    const i0 = Math.round(t * SR), n = Math.round(dur * SR)
    for (let k = 0; k < n && i0 + k < this.n; k++) {
      const u = k / n
      if (k % 32 === 0) bp.set("bp", lo * (hi / lo) ** Math.sin((Math.PI / 2) * Math.min(1, u / peak)), 0.9)
      const env = u < peak ? Math.sin((Math.PI / 2) * (u / peak)) ** 2 : Math.cos((Math.PI / 2) * ((u - peak) / (1 - peak))) ** 2
      const v = bp.run(R() * 2 - 1) * env * 0.9 * g
      const [l, r] = panLR(from + (to - from) * u)
      this.sfx[0][i0 + k] += v * l; this.sfx[1][i0 + k] += v * r
      this.verb[0][i0 + k] += v * l * 0.15; this.verb[1][i0 + k] += v * r * 0.15
    }
  }
  swish(t, o = {}) { this.whoosh(t, { dur: 0.26, lo: 1200, hi: 6500, g: 0.7, ...o }) }
  /** Riser that ends exactly at tEnd (2–5 ms before the cut it leads into). */
  riser(tEnd, { dur = 0.8, g = 1 } = {}) {
    const R = this.noise(), hp = new Biquad(), t0 = tEnd - 0.003 - dur
    let ph = 0
    const i0 = Math.round(t0 * SR), n = Math.round(dur * SR)
    for (let k = 0; k < n && i0 + k >= 0 && i0 + k < this.n; k++) {
      const u = k / n
      if (k % 32 === 0) hp.set("hp", 250 * 24 ** u, 0.8)
      ph += (TAU * (180 + 620 * u * u)) / SR
      const v = (hp.run(R() * 2 - 1) * 0.8 + 0.18 * Math.sin(ph)) * u ** 2.2 * g * 0.6
      this.sfx[0][i0 + k] += v; this.sfx[1][i0 + k] += v
      this.verb[0][i0 + k] += v * 0.2; this.verb[1][i0 + k] += v * 0.2
    }
  }
  /** The A-impact: kick + 62 → 27 Hz sub drop + noise crack + low tom into a big room. Once per film. */
  impact(t, g = 1) {
    this.kick(t, 1.2 * g, "sfx")
    this.sub(t, 62, 27, 1.1, 1.1 * g)
    const R = this.noise(), lp = new Biquad().set("lp", 2600, 0.7)
    this._add("sfx", t, 0.5, (k, tt) => lp.run(R() * 2 - 1) * Math.exp(-tt / 0.09), { gain: 0.55 * g, send: 0.6 })
    let ph = 0
    this._add("sfx", t, 0.6, (k, tt) => { ph += (TAU * (70 + 40 * Math.exp(-tt / 0.05))) / SR; return Math.sin(ph) * Math.exp(-tt / 0.3) }, { gain: 0.4 * g, send: 0.5 })
  }
  /** A B-impact: kick + short sub + crack, no room. ≤ 3 per film. */
  hit(t, g = 1) {
    this.kick(t, 0.9 * g, "sfx")
    this.sub(t, 55, 38, 0.45, 0.6 * g)
    const R = this.noise(), bp = new Biquad().set("bp", 2200, 0.6)
    this._add("sfx", t, 0.2, (k, tt) => bp.run(R() * 2 - 1) * Math.exp(-tt / 0.03), { gain: 0.35 * g, send: 0.2 })
  }
  /** Tile landing / pop-in: a tuned sine blip falling an octave. */
  pop(t, m = 84, g = 1, pan = 0) {
    let ph = 0
    const fr = mtof(m)
    this._add("sfx", t, 0.14, (k, tt) => { ph += (TAU * fr * (0.5 + 0.5 * Math.exp(-tt / 0.02))) / SR; return Math.sin(ph) * Math.exp(-tt / 0.045) * Math.min(1, tt / 0.001) }, { gain: 0.32 * g, pan, send: 0.12 })
  }
  /** Letter tick (type landing), tuned; rising pitch per word. */
  tick(t, m = 96, g = 1, pan = 0) {
    const fr = mtof(m)
    this._add("sfx", t, 0.04, (k, tt) => Math.sin(TAU * fr * tt) * Math.exp(-tt / 0.008), { gain: 0.16 * g, pan })
  }
  /** Stamp / slam thud: low body + clack. */
  stamp(t, g = 1) {
    let ph = 0
    const R = this.noise(), bp = new Biquad().set("bp", 2600, 1.1)
    this._add("sfx", t, 0.3, (k, tt) => { ph += (TAU * (55 + 110 * Math.exp(-tt / 0.03))) / SR; return Math.sin(ph) * Math.exp(-tt / 0.13) + bp.run(R() * 2 - 1) * Math.exp(-tt / 0.012) * 1.2 }, { gain: 0.6 * g, send: 0.15 })
  }
  /** Three quick high bells: sparkles flying out. */
  sparkle(t, g = 1) {
    ;[96, 100, 103].forEach((m, i) => this.bell(t + i * 0.045, m, 0.55 * g, (i - 1) * 0.5))
  }
  /** The swap motif ("tram-pa"): two mallets crossing (a rising fourth L → R against a falling fourth R → L). On every swap landing. */
  swap(t, { root = "C5", g = 1 } = {}) {
    const r = midi(root)
    this.marimba(t, r, 0.9 * g, -0.6, "sfx"); this.marimba(t, r + 5, 0.7 * g, 0.6, "sfx")
    this.marimba(t + 0.12, r + 5, 0.9 * g, 0.6, "sfx"); this.marimba(t + 0.12, r, 0.7 * g, -0.6, "sfx")
  }
  /**
   * The Trampa sonic logo: the swap motif, then a struck Fadd9 (keys + bells + soft sub) on the hit
   * at t. Put t on the mark's lock frame, in voice silence. Same every film.
   */
  logo(t, g = 1) {
    this.riser(t - 0.24, { dur: 0.36, g: 0.5 * g })
    this.swap(t - 0.24, { root: "C5", g: 0.9 * g })
    this.keys(t, [midi("F3"), midi("A3"), midi("C4"), midi("G4")], 1.6, 1.3 * g, "sfx")
    this.bell(t, midi("F6"), 0.9 * g, -0.3); this.bell(t + 0.03, midi("C7"), 0.6 * g, 0.3)
    this.sub(t, 44, 43.65, 1.4, 0.5 * g)
    this.kick(t, 0.6 * g, "sfx")
  }

  // ─── Music ─────────────────────────────────────────────────────────────────
  /**
   * The groove on the beat grid (meta.bpm, meta.phase). energy = [[t, level], …] step points:
   * 0 pad + sparse mallets, 1 half-time (kick 1 & 3, clap 2 & 4, shaker), 2 full (four on the floor,
   * offbeat hats, 8th bass, 16th mallet figure). chords: one per bar (I vi IV V in F by default).
   * dips: [[t, len], …] musical dips (low-pass + −6 dB, never silence): the Dah before the payoff.
   * Under a voice-over use level ≤ 1 while words run; level 2 only in voice gaps and on the end card.
   */
  groove({ from = 0, to = this.dur, chords = ["F", "Dm", "Bb", "C"], energy = [[0, 1]], dips = [], mallet = [0, -1, 2, -1, 1, -1, 2, 0, -1, 2, -1, 1, 2, -1, 1, -1] } = {}) {
    const lvl = (t) => energy.reduce((v, [et, l]) => (t >= et ? l : v), energy[0][1])
    const spb = 60 / this.bpm
    this.dipList.push(...dips)
    const firstBeat = Math.ceil((from - this.phase) / spb)
    for (let b = firstBeat; this.beat(b) < to; b++) {
      const t = this.beat(b), L = lvl(t), inBar = ((b % 4) + 4) % 4, bar = Math.floor(b / 4)
      const ch = chord(chords[((bar % chords.length) + chords.length) % chords.length])
      if (inBar === 0) this.pad(t, ch, spb * 4, L >= 2 ? 0.8 : 1)
      if (L >= 2 || (L >= 1 && (inBar === 0 || inBar === 2))) this.kick(t, L >= 2 ? 1 : 0.75)
      if (L >= 1 && (inBar === 1 || inBar === 3)) this.clap(t, L >= 2 ? 1 : 0.7)
      if (L >= 2) this.hat(t + spb / 2, 1, inBar === 3)
      for (let s = 0; s < 4; s++) {
        const ts = t + (s * spb) / 4
        if (ts >= to) break
        if (L >= 1 && s % 2 === 1) this.shaker(ts, L >= 2 ? 1 : 0.6)
        const step = mallet[(inBar * 4 + s) % mallet.length]
        if (step >= 0 && (L >= 2 || (L >= 1 && s % 2 === 0) || (L === 0 && s === 0 && inBar % 2 === 0))) {
          const tone = ch[step % ch.length] + 24 + (step >= 3 ? 12 : 0)
          this.marimba(ts, tone, L >= 2 ? 0.8 : 0.6, ((inBar * 4 + s) % 3) * 0.4 - 0.4)
        }
      }
      if (L >= 1) {
        const root = ch[0] - 12
        if (L >= 2) { this.bass(t + spb / 2, root, spb * 0.4); this.bass(t + spb * 0.75, root + 12, spb * 0.2, 0.6) }
        else if (inBar === 0 || inBar === 2) this.bass(t, root, spb * 0.9, 0.8)
      }
    }
  }

  /** The voice-over take (mp3 + word timings). The music sits ≥ 12 dB under it while it speaks. */
  voice({ file, offset = 0.12, words = [] }) {
    const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", file, "-f", "f32le", "-ac", "2", "-ar", String(SR), "-"], { maxBuffer: 1 << 30 })
    if (r.status !== 0) throw new Error(String(r.stderr))
    const pcm = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.byteLength / 4)
    const i0 = Math.round(offset * SR)
    for (let k = 0; k * 2 < pcm.length && i0 + k < this.n; k++) { this.voiceBus[0][i0 + k] += pcm[k * 2]; this.voiceBus[1][i0 + k] += pcm[k * 2 + 1] }
    if (words.length) this.voiceSpan = [offset + words[0].start - 0.3, offset + words[words.length - 1].end + 0.3]
  }

  // ─── Mix ───────────────────────────────────────────────────────────────────
  render() {
    const N = this.n
    // Reverb (Freeverb-style): 6 damped combs + 2 allpasses per side on the send bus.
    const verb = (x, spread) => {
      const combs = [1116, 1188, 1277, 1356, 1422, 1491].map((d) => ({ b: new Float32Array(d + spread), i: 0, s: 0 }))
      const aps = [556, 441].map((d) => ({ b: new Float32Array(d + spread), i: 0 }))
      const y = new Float32Array(N)
      for (let k = 0; k < N; k++) {
        let o = 0
        for (const c of combs) { const v = c.b[c.i]; c.s = v * 0.75 + c.s * 0.25; c.b[c.i] = x[k] * 0.015 + c.s * 0.84; c.i = (c.i + 1) % c.b.length; o += v }
        for (const a of aps) { const v = a.b[a.i]; a.b[a.i] = o + v * 0.5; o = v - o; a.i = (a.i + 1) % a.b.length }
        y[k] = o
      }
      return y
    }
    const vl = verb(this.verb[0], 0), vr = verb(this.verb[1], 23)
    // Music gain: the dips (low-pass toward 380 Hz, −6 dB, 250 ms in, 150 ms out) and the voice bed.
    const gl = new Biquad(), gr = new Biquad()
    const L = new Float32Array(N), R = new Float32Array(N)
    const ramp = (t, a, b, fin, fout) => (t < a - fin || t > b + fout ? 0 : t < a ? (t - (a - fin)) / fin : t > b ? 1 - (t - b) / fout : 1)
    for (let k = 0; k < N; k++) {
      const t = k / SR
      let dip = 0
      for (const [dt, dl] of this.dipList) dip = Math.max(dip, ramp(t, dt, dt + dl, 0.25, 0.08))
      if (k % 32 === 0) { const fc = 18000 * (380 / 18000) ** dip; gl.set("lp", fc, 0.7); gr.set("lp", fc, 0.7) }
      const bed = this.voiceSpan ? 1 - 0.75 * ramp(t, this.voiceSpan[0], this.voiceSpan[1], 0.4, 0.4) : 1
      const mg = bed * (1 - 0.5 * dip)
      L[k] = gl.run(this.music[0][k]) * mg + this.sfx[0][k] + vl[k] * 0.9 + this.voiceBus[0][k]
      R[k] = gr.run(this.music[1][k]) * mg + this.sfx[1][k] + vr[k] * 0.9 + this.voiceBus[1][k]
    }
    // Gentle bus saturation, then fade the last 40 ms so the file never ends on a click.
    for (let k = 0; k < N; k++) { L[k] = Math.tanh(L[k] * 0.9) / 0.9; R[k] = Math.tanh(R[k] * 0.9) / 0.9 }
    const fade = Math.round(0.04 * SR)
    for (let k = 0; k < fade; k++) { const g = k / fade; L[N - 1 - k] *= g; R[N - 1 - k] *= g }
    return [L, R]
  }
}

function writeWav(file, [L, R]) {
  const n = L.length, buf = Buffer.alloc(44 + n * 8)
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 8, 4); buf.write("WAVE", 8); buf.write("fmt ", 12)
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(3, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24)
  buf.writeUInt32LE(SR * 8, 28); buf.writeUInt16LE(8, 32); buf.writeUInt16LE(32, 34); buf.write("data", 36); buf.writeUInt32LE(n * 8, 40)
  for (let k = 0; k < n; k++) { buf.writeFloatLE(L[k], 44 + k * 8); buf.writeFloatLE(R[k], 48 + k * 8) }
  writeFileSync(file, buf)
}

/** Builds the film's score, masters it to −14 LUFS / −1.5 dBTP (two-pass loudnorm) and returns the WAV path. */
export async function renderScore(film, outDir, name) {
  const S = new Score({ bpm: 118, ...film.meta })
  await film.score(S)
  const raw = path.join(outDir, `${name}.score-raw.wav`), out = path.join(outDir, `${name}.score.wav`)
  writeWav(raw, S.render())
  const pass1 = spawnSync("ffmpeg", ["-hide_banner", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], { encoding: "utf8" })
  const j0 = pass1.stderr.lastIndexOf("{")
  const m = JSON.parse(pass1.stderr.slice(j0, pass1.stderr.indexOf("}", j0) + 1))
  const af = `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-af", af, "-ar", "48000", "-c:a", "pcm_s24le", out])
  if (r.status !== 0) throw new Error(String(r.stderr))
  console.log(`score ${out}  (input ${m.input_i} LUFS, ${m.input_tp} dBTP)`)
  return out
}

/** Reads timings.json written by engine/voice.mjs. */
export const readTimings = (file) => JSON.parse(readFileSync(file, "utf8"))
