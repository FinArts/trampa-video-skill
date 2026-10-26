// QC gates for a rendered film. Runs after every full render; or: node engine/qc.mjs films/<slug>/film.mjs
// Writes out/<name>.qc.json and out/<name>-review.png (labelled key frames). A failed gate = fix it
// before anyone sees the film. Gates are numbers; the bar itself is the review against the canon.
import { spawnSync } from "node:child_process"
import { writeFileSync, existsSync } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { Resvg } from "@resvg/resvg-js"
import { C, SAFE, doc, resetIds } from "./brand.mjs"
import { REGISTRY, resetRegistry, text } from "./type.mjs"

const run = (args) => spawnSync("ffmpeg", ["-hide_banner", ...args], { encoding: "utf8", maxBuffer: 1 << 28 })

function perFrame(file, diff) {
  const vf = `scale=180:-2,format=gray,${diff ? "tblend=all_mode=difference," : ""}signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-`
  const r = run(["-i", file, "-vf", vf, "-an", "-f", "null", "-"])
  return [...r.stdout.matchAll(/YAVG=([\d.]+)/g)].map((m) => Number(m[1]))
}

function sceneCuts(file) {
  const r = run(["-i", file, "-vf", "select='gt(scene,0.12)',showinfo", "-an", "-f", "null", "-"])
  return [...r.stderr.matchAll(/pts_time:([\d.]+)/g)].map((m) => Number(m[1]))
}

function loudness(file) {
  const r = run(["-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"])
  const s = r.stderr.slice(r.stderr.lastIndexOf("Summary"))
  return { I: Number(/I:\s+(-?[\d.]+) LUFS/.exec(s)?.[1]), TP: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(s)?.[1]) }
}

const words = (s) => s.split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w)).length

/** Samples the film's text registry: holds, safe area, sizes, words on frame 0, determinism. */
function typeChecks(film, dur) {
  const step = 1 / 30
  const runs = new Map()
  const unsafe = [], small = []
  let prev = new Map()
  for (let t = 0; t <= dur + 1e-6; t += step) {
    resetIds(); resetRegistry(); film.frame(t)
    const now = new Map()
    for (const b of REGISTRY) {
      if (b.role === "deco") continue
      const key = `${b.role}|${b.str}`
      now.set(key, b)
      const p = prev.get(key)
      const still = p && Math.abs(p.x0 - b.x0) + Math.abs(p.y0 - b.y0) + Math.abs(p.x1 - b.x1) + Math.abs(p.y1 - b.y1) < 2
      const r = runs.get(key) ?? { best: 0, cur: 0, role: b.role, str: b.str }
      r.cur = still ? r.cur + step : 0
      r.best = Math.max(r.best, r.cur)
      runs.set(key, r)
      if (still) {
        if (b.x0 < SAFE.x0 - 4 || b.x1 > SAFE.x1 + 4 || b.y0 < SAFE.y0 - 4 || b.y1 > SAFE.y1 + 4) unsafe.push(`${t.toFixed(2)}s "${b.str.replace(/\n/g, " ")}" [${b.x0 | 0},${b.y0 | 0} → ${b.x1 | 0},${b.y1 | 0}]`)
        const min = b.role === "hero" ? 72 : 44
        if (b.size < min) small.push(`${t.toFixed(2)}s "${b.str}" ${b.size | 0}px < ${min}`)
      }
    }
    prev = now
  }
  const holds = [...runs.values()].filter((r) => r.role === "hero").map((r) => ({ str: r.str.replace(/\n/g, " "), held: +r.best.toFixed(2), need: Math.max(1, 0.3 * words(r.str)) }))
  resetIds(); resetRegistry(); film.frame(0)
  const frame0Words = REGISTRY.filter((b) => b.role === "hero").reduce((n, b) => n + words(b.str), 0)
  const times = [0.5, 3.3, 7.7, dur * 0.7, dur - 0.1]
  const ser = (x) => (typeof x === "string" ? x : JSON.stringify(x))
  const fwd = times.map((t) => { resetIds(); resetRegistry(); return ser(film.frame(t)) })
  const bwd = [...times].reverse().map((t) => { resetIds(); resetRegistry(); return ser(film.frame(t)) }).reverse()
  return { holds, unsafe: [...new Set(unsafe)].slice(0, 12), small: [...new Set(small)].slice(0, 12), frame0Words, deterministic: fwd.every((s, i) => s === bwd[i]) }
}

function reviewSheet(file, out, marks) {
  const cols = 4, w = 270, h = 480, pad = 18, lab = 46
  const rows = Math.ceil(marks.length / cols)
  const SW = cols * w + (cols + 1) * pad, SH = rows * (h + lab) + (rows + 1) * pad
  let body = ""
  marks.forEach(([t, label], i) => {
    const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-ss", String(t), "-i", file, "-frames:v", "1", "-vf", `scale=${w}:${h}`, "-f", "image2pipe", "-vcodec", "png", "-"], { maxBuffer: 1 << 26 })
    const x = pad + (i % cols) * (w + pad), y = pad + Math.floor(i / cols) * (h + lab + pad)
    body += `<image x="${x}" y="${y}" width="${w}" height="${h}" href="data:image/png;base64,${r.stdout.toString("base64")}"/>`
    body += text(`${t.toFixed(2)} s · ${label}`, { x: x + 2, y: y + h + 32, size: 24, face: "figtree-700", align: "left", track: 0, color: C.white, role: "deco" })
  })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}"><rect width="${SW}" height="${SH}" fill="${C.navy950}"/>${body}</svg>`
  writeFileSync(out, new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng())
}

export async function runQC(film, file, { draft = false } = {}) {
  const meta = { fps: 60, cuts: [], ...film.meta }
  const cues = meta.cues ?? {}
  const dur = meta.dur
  const diff = perFrame(file, true)
  const fps = meta.fps
  const win = []
  for (let i = 0; i + 30 <= diff.length + 1; i += 30) win.push(diff.slice(i, i + 30).reduce((a, b) => a + b, 0) / Math.min(30, diff.slice(i, i + 30).length || 1))
  const mean = diff.reduce((a, b) => a + b, 0) / diff.length
  const peak = Math.max(...win)
  const exempt = (k) => { const t0 = k * 0.5, t1 = t0 + 0.5; return [...(meta.rest ? [meta.rest] : []), ...(meta.dah ? [meta.dah] : []), [dur - 1.2, dur + 1]].some(([a, b]) => t0 < b && t1 > a) }
  const quiet = win.map((v) => v < 0.25)
  const quietShare = quiet.filter(Boolean).length / win.length
  let doubleQuiet = []
  for (let k = 1; k < quiet.length; k++) if (quiet[k] && quiet[k - 1] && !exempt(k) && !exempt(k - 1)) doubleQuiet.push(`${(k * 0.5 - 0.5).toFixed(1)}-${(k * 0.5 + 0.5).toFixed(1)}s`)
  const luma = perFrame(file, false)
  let flashes = 0
  for (let s = 0; s < dur; s += 0.5) {
    let n = 0
    for (let i = Math.round(s * fps) + 1; i < Math.min(luma.length, Math.round((s + 1) * fps)); i++) if (Math.abs(luma[i] - luma[i - 1]) > 40) n++
    flashes = Math.max(flashes, n)
  }
  const cuts = sceneCuts(file)
  const covered = (c) => (meta.transitions ?? []).some(([a, b]) => c >= a - 0.05 && c <= b + 0.05)
  const unplanned = cuts.filter((c) => !meta.cuts.some((p) => Math.abs(p - c) < 3 / fps) && !covered(c))
  const loud = existsSync(file) ? loudness(file) : {}
  const ty = typeChecks(film, dur)
  const G = []
  const gate = (name, pass, value) => G.push({ name, pass: !!pass, value })
  // Flat, hard-edged sticker art reads about 1.4× the soft-glow FIN footage the 1.3–2.8 range came from.
  gate("motion mean 1.3–4.0", mean >= 1.3 && mean <= 4.0, mean.toFixed(2))
  gate("peak ÷ mean ≥ 3.5 (one designed peak)", peak / mean >= 3.5, (peak / mean).toFixed(2))
  if (cues.payoff !== undefined) {
    // Only the portal window may beat the payoff window.
    const near = (k, c) => c !== undefined && Math.abs(k * 0.5 + 0.25 - c) <= 0.5
    const payWin = Math.max(...win.filter((_, k) => near(k, cues.payoff)))
    const rival = win.map((v, k) => [v, k]).filter(([, k]) => !near(k, cues.payoff) && !near(k, cues.portal)).sort((x, y) => y[0] - x[0])[0]
    gate("the payoff owns the peak (only the portal may beat it)", payWin >= rival[0], `payoff ${payWin.toFixed(2)} vs ${rival[0].toFixed(2)} at ${(rival[1] * 0.5).toFixed(1)} s`)
  }
  gate("quiet windows 5–35 %", quietShare >= 0.05 && quietShare <= 0.35, `${(quietShare * 100).toFixed(0)} %`)
  gate("never two quiet windows in a row (outside rest / Dah / end hold)", doubleQuiet.length === 0, doubleQuiet.join(" ") || "none")
  gate("hard cuts only where planned (meta.cuts) or covered (meta.transitions)", unplanned.length === 0, unplanned.length ? `uncovered ${unplanned.map((c) => c.toFixed(2)).join(", ")}` : `${cuts.length} detected, all planned or covered`)
  gate("≤ 3 planned hard cuts", meta.cuts.length <= 3, meta.cuts.length)
  gate("flash safety: ≤ 3 big luma jumps per second", flashes <= 3, flashes)
  if (draft) console.log("note: loudness and true peak are gated on masters only (drafts skip them)")
  if (!draft && loud.I) {
    gate("loudness −15.5…−13.5 LUFS", loud.I >= -15.5 && loud.I <= -13.5, loud.I)
    gate("true peak ≤ −1.0 dBFS", loud.TP <= -1.0, loud.TP)
  }
  gate("frame 0 alive (not black)", luma[0] > 12, luma[0]?.toFixed(1))
  gate("frame 0 hook ≤ 7 words, readable", ty.frame0Words >= 1 && ty.frame0Words <= 7, ty.frame0Words)
  if (cues.hook !== undefined) {
    // Declared time and measured motion: the hook's window must spike against the one before it.
    const k = Math.floor(cues.hook / 0.5), spike = win[k] >= 1 && win[k] >= 1.5 * (win[k - 1] ?? 0)
    gate("first impact 0.4–0.9 s (cue) and visible in the motion", cues.hook >= 0.4 && cues.hook <= 0.9 && spike, `cue ${cues.hook} s, window ${win[k]?.toFixed(2)} vs ${win[k - 1]?.toFixed(2)}`)
  }
  if (cues.payoff !== undefined) gate("payoff at 60–80 % of runtime", cues.payoff / dur >= 0.6 && cues.payoff / dur <= 0.8, `${((cues.payoff / dur) * 100).toFixed(0)} %`)
  for (const h of ty.holds) gate(`hold "${h.str.slice(0, 40)}" ≥ ${h.need.toFixed(1)} s`, h.held + 1e-6 >= h.need, `${h.held} s`)
  gate("held type inside the safe area", ty.unsafe.length === 0, ty.unsafe.join(" | ") || "ok")
  gate("held type size (hero ≥ 72 px, labels ≥ 44 px)", ty.small.length === 0, ty.small.join(" | ") || "ok")
  gate("deterministic (frames equal in any order)", ty.deterministic, ty.deterministic)
  const name = path.basename(file, ".mp4")
  const out = path.dirname(file)
  const marks = meta.review ?? [[0, "frame 0"], [cues.hook ?? 0.5, "hook hit"], [dur * 0.25, ""], [dur * 0.4, ""], [dur * 0.55, ""], [(cues.payoff ?? dur * 0.7) - 0.3, "Dah"], [cues.payoff ?? dur * 0.7, "payoff"], [dur - 0.2, "end"]]
  reviewSheet(file, path.join(out, `${name}-review.png`), marks.map(([t, l]) => [Math.min(dur - 1 / fps, Math.max(0, t)), l]))
  const windows = win.map((v, k) => `${(k * 0.5).toFixed(1)}:${v.toFixed(2)}`).join(" ")
  writeFileSync(path.join(out, `${name}.qc.json`), JSON.stringify({ gates: G, windows, cuts, loud, holds: ty.holds }, null, 1))
  const pass = G.filter((g) => g.pass).length
  console.log(`\nQC ${name}: ${pass}/${G.length} gates pass`)
  for (const g of G) console.log(`${g.pass ? " ok " : "FAIL"}  ${g.name}  →  ${g.value}`)
  console.log(`motion per 0.5 s: ${windows}`)
  console.log(`review sheet: ${path.join(out, `${name}-review.png`)}`)
  return { pass, total: G.length, gates: G }
}

if (process.argv[1] && process.argv[1].endsWith("qc.mjs")) {
  const filmPath = path.resolve(process.argv[2])
  const film = await import(pathToFileURL(filmPath).href)
  const slug = film.meta.slug ?? path.basename(path.dirname(filmPath))
  const draft = process.argv.includes("--draft")
  await runQC(film, path.join(path.dirname(filmPath), "out", `${draft ? slug + "-draft" : slug}.mp4`), { draft })
}

export { doc }
