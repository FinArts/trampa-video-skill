// Renders a film module to MP4 (+ score, contact sheet, QC).
//   node engine/render.mjs films/<slug>/film.mjs              master 1080×1920 60 fps, score, QC
//   node engine/render.mjs films/<slug>/film.mjs --draft      540×960, ≤ 8 blur samples, fast x264
//   node engine/render.mjs films/<slug>/film.mjs --stills=0,1.25,7.5   exact frames (s) → out/stills/
//   options: --from=s --to=s (part render) · --no-audio · --workers=N · --no-qc
// Every frame: film.frame(t) → SVG → resvg → a 180° shutter averaged in linear light. The number of
// sub-samples comes from a motion probe (two tiny renders at the shutter's ends), so fast moves blur
// and still frames stay one crisp sample. Samples never straddle a planned cut (film.meta.cuts).
import { spawn, spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs"
import { cpus, freemem } from "node:os"
import path from "node:path"
import { pathToFileURL, fileURLToPath } from "node:url"
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads"
import { Resvg } from "@resvg/resvg-js"
import { resetIds } from "./brand.mjs"
import { resetRegistry } from "./type.mjs"

const PROBE_W = 270

const raster = (svg, width) => new Resvg(svg, { fitTo: { mode: "width", value: width }, font: { loadSystemFonts: false }, shapeRendering: 2 }).render().pixels

/** A frame is an SVG string, or a composite { mix: [A, B], mask, over } (brand.mjs composite()). */
function rasterize(x, width) {
  if (typeof x === "string") return raster(x, width)
  const a = rasterize(x.mix[0], width), b = rasterize(x.mix[1], width)
  const m = raster(`<svg xmlns="http://www.w3.org/2000/svg" width="${W0}" height="${H0}" viewBox="0 0 ${W0} ${H0}"><rect width="${W0}" height="${H0}" fill="#000"/>${x.mask}</svg>`, width)
  const out = Buffer.alloc(a.length)
  for (let j = 0; j < a.length; j += 4) {
    const k = m[j] / 255
    out[j] = a[j] + (b[j] - a[j]) * k; out[j + 1] = a[j + 1] + (b[j + 1] - a[j + 1]) * k; out[j + 2] = a[j + 2] + (b[j + 2] - a[j + 2]) * k; out[j + 3] = 255
  }
  if (x.over) {
    const o = raster(`<svg xmlns="http://www.w3.org/2000/svg" width="${W0}" height="${H0}" viewBox="0 0 ${W0} ${H0}">${x.over}</svg>`, width)
    for (let j = 0; j < out.length; j += 4) {
      const al = o[j + 3] / 255
      if (al === 0) continue
      // resvg pixels are premultiplied
      out[j] = o[j] + out[j] * (1 - al); out[j + 1] = o[j + 1] + out[j + 1] * (1 - al); out[j + 2] = o[j + 2] + out[j + 2] * (1 - al)
    }
  }
  return out
}
const W0 = 1080, H0 = 1920

function frameSvg(film, t) {
  resetIds()
  resetRegistry()
  return film.frame(t)
}

/** Shutter window [a, b] for frame time t: 180°, centred, clipped at planned cuts. */
function shutter(t, fps, cuts) {
  const h = 0.25 / fps
  let a = t - h, b = t + h
  for (const c of cuts) {
    if (c > a && c <= t) a = c
    if (c > t && c < b) b = c - 1e-4
  }
  return [a, b]
}

function luma(px, n) {
  const y = new Float32Array(n)
  for (let i = 0; i < n; i++) y[i] = 0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]
  return y
}

/**
 * Blur length (px at output width) of the move inside the shutter. Changed pixels ÷ edge pixels
 * approximates the displacement; edges running along the move do not change, hence the 1.7 factor
 * (calibrated on pans, zooms and single movers: see the skill's probe notes).
 */
export function probe(film, a, b, outW) {
  // The changed ÷ edges ratio saturates once a move outgrows the shapes, so a big estimate is
  // re-measured over a quarter (and a sixteenth) of the shutter and scaled back up.
  let est = probeOnce(film, a, b, outW), k = 1
  while (est > 6 * k && k < 16) {
    k *= 4
    est = Math.max(est, k * probeOnce(film, a, a + (b - a) / k, outW))
  }
  return est
}

function probeOnce(film, a, b, outW) {
  const A = rasterize(frameSvg(film, a), PROBE_W), B = rasterize(frameSvg(film, b), PROBE_W)
  const ph = A.length / 4 / PROBE_W
  const ya = luma(A, PROBE_W * ph), yb = luma(B, PROBE_W * ph)
  let changed = 0, edges = 0
  for (let y = 0; y < ph - 1; y++) {
    for (let x = 0; x < PROBE_W - 1; x++) {
      const i = y * PROBE_W + x
      if (Math.abs(ya[i] - yb[i]) > 10) changed++
      if (Math.max(Math.abs(ya[i + 1] - ya[i]), Math.abs(ya[i + PROBE_W] - ya[i])) > 10) edges++
    }
  }
  return 1.7 * (changed / Math.max(edges, 30)) * (outW / PROBE_W)
}

const TO_LIN = new Float32Array(256).map((_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
const FROM_LIN = new Uint8Array(4097).map((_, i) => { const l = i / 4096; const c = l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055; return Math.round(Math.min(1, Math.max(0, c)) * 255) })

/** One output frame as RGBA bytes: probe → n sub-samples → linear-light average. */
function renderFrame(film, i, o) {
  const t = i / o.fps
  const [a, b] = shutter(t, o.fps, o.cuts)
  const crisp = (o.crisp || []).some(([c0, c1]) => t >= c0 && t <= c1)
  let n = 1
  if (!crisp && b - a > 1e-5) {
    const blurPx = probe(film, a, b, o.W)
    n = Math.max(1, Math.min(o.maxN, Math.ceil(blurPx / 1.2)))
  }
  if (n === 1) return { px: Buffer.from(rasterize(frameSvg(film, t), o.W)), n }
  let acc
  for (let k = 0; k < n; k++) {
    const ts = a + ((k + 0.5) / n) * (b - a)
    const px = rasterize(frameSvg(film, ts), o.W)
    if (!acc) acc = new Float32Array(px.length)
    for (let j = 0; j < px.length; j += 4) {
      acc[j] += TO_LIN[px[j]]; acc[j + 1] += TO_LIN[px[j + 1]]; acc[j + 2] += TO_LIN[px[j + 2]]
    }
  }
  const out = Buffer.alloc(acc.length)
  const s = 4096 / n
  for (let j = 0; j < acc.length; j += 4) {
    out[j] = FROM_LIN[Math.min(4096, Math.round(acc[j] * s))]
    out[j + 1] = FROM_LIN[Math.min(4096, Math.round(acc[j + 1] * s))]
    out[j + 2] = FROM_LIN[Math.min(4096, Math.round(acc[j + 2] * s))]
    out[j + 3] = 255
  }
  return { px: out, n }
}

// ─── Worker ──────────────────────────────────────────────────────────────────
if (!isMainThread) {
  const film = await import(workerData.filmUrl)
  parentPort.on("message", (i) => {
    const { px, n } = renderFrame(film, i, workerData.o)
    parentPort.postMessage({ i, n, px }, [px.buffer])
  })
  parentPort.postMessage({ ready: true })
}

// ─── Main ────────────────────────────────────────────────────────────────────
export function ff(args, input) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { input, maxBuffer: 1 << 30 })
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(" ")}\n${r.stderr}`)
  return r
}

async function main() {
  const argv = process.argv.slice(2)
  const filmArg = argv.find((a) => !a.startsWith("--"))
  if (!filmArg) throw new Error("usage: node engine/render.mjs films/<slug>/film.mjs [--draft] [--stills=0,1.5]")
  const opt = Object.fromEntries(argv.filter((a) => a.startsWith("--")).map((a) => { const [k, v] = a.slice(2).split("="); return [k, v ?? true] }))
  const filmPath = path.resolve(filmArg)
  const filmUrl = pathToFileURL(filmPath).href
  const film = await import(filmUrl)
  const meta = { fps: 60, W: 1080, H: 1920, cuts: [], crisp: [], ...film.meta }
  const slug = meta.slug ?? path.basename(path.dirname(filmPath))
  const outDir = path.join(path.dirname(filmPath), "out")
  mkdirSync(outDir, { recursive: true })
  const draft = !!opt.draft
  const o = { fps: meta.fps, W: draft ? meta.W / 2 : meta.W, cuts: meta.cuts, crisp: meta.crisp, maxN: draft ? 8 : Number(opt.maxblur ?? 48) }
  const H = Math.round((meta.H * o.W) / meta.W)

  if (opt.stills) {
    // Each --stills run starts a clean folder, so a sheet never mixes old and new frames.
    const sdir = path.join(outDir, "stills")
    mkdirSync(sdir, { recursive: true })
    for (const old of readdirSync(sdir)) if (old.endsWith(".png")) rmSync(path.join(sdir, old))
    for (const s of String(opt.stills).split(",")) {
      const i = Math.round(Number(s) * meta.fps)
      const { px, n } = renderFrame(film, i, o)
      const file = path.join(outDir, "stills", `${slug}-${Number(s).toFixed(2)}s.png`)
      ff(["-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${o.W}x${H}`, "-i", "-", "-frames:v", "1", file], px)
      console.log(`${file}  (${n} samples)`)
    }
    return
  }

  const total = Math.round(meta.dur * meta.fps)
  const i0 = Math.round(Number(opt.from ?? 0) * meta.fps), i1 = Math.min(total, Math.round(Number(opt.to ?? meta.dur) * meta.fps))
  const name = draft ? `${slug}-draft` : slug
  const videoOnly = path.join(outDir, `${name}.video.mp4`)
  const enc = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${o.W}x${H}`, "-r", String(meta.fps), "-i", "-", "-an",
    "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", draft ? "veryfast" : "slow", "-crf", draft ? "20" : "16", "-bf", "0",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-movflags", "+faststart", videoOnly], { stdio: ["pipe", "inherit", "inherit"] })
  const done = new Promise((res, rej) => enc.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))))

  // A worker holds a few full-size float buffers (a blurred composite frame needs ~150 MB at peak):
  // size the pool by free memory as well as cores. --workers=N overrides.
  const byMem = Math.floor(freemem() / (draft ? 160e6 : 450e6))
  const nWorkers = Number(opt.workers ?? Math.max(1, Math.min(8, cpus().length - 1, byMem)))
  const t0 = performance.now()
  const samples = new Array(total).fill(0)
  await new Promise((resolve, reject) => {
    // Frames arrive out of order; they are written in order, one at a time, waiting for ffmpeg to
    // drain its pipe (without that back-pressure Windows pipes fail with "write UNKNOWN").
    const pending = new Map()
    let next = i0, write = i0, congested = false, finished = false
    const workers = []
    const idle = new Set()
    const retry = [], tries = new Map()
    enc.stdin.on("error", reject)
    enc.stdin.on("drain", () => { congested = false; flush(); wake() })
    const room = () => !congested && pending.size < nWorkers * 2
    const give = (w) => {
      if ((retry.length || next < i1) && room()) { w.job = retry.length ? retry.shift() : next++; w.postMessage(w.job) }
      else idle.add(w)
    }
    const wake = () => { for (const w of [...idle]) if ((retry.length || next < i1) && room()) { idle.delete(w); give(w) } }
    const flush = () => {
      while (!congested && pending.has(write)) {
        const { px, n } = pending.get(write)
        pending.delete(write)
        samples[write] = n
        congested = !enc.stdin.write(Buffer.from(px.buffer, px.byteOffset, px.byteLength))
        write++
        if (write % 60 === 0) process.stdout.write(`\r${(write / meta.fps).toFixed(1)} / ${(i1 / meta.fps).toFixed(1)} s  ${((performance.now() - t0) / 1000).toFixed(0)} s elapsed `)
      }
      if (write >= i1 && !finished) { finished = true; workers.forEach((w) => w.terminate()); resolve() }
    }
    const spawnWorker = () => {
      const w = new Worker(fileURLToPath(import.meta.url), { workerData: { filmUrl, o } })
      // A worker that dies (e.g. out of memory) is replaced and its frame retried, twice at most.
      w.on("error", (err) => {
        workers.splice(workers.indexOf(w), 1); idle.delete(w)
        if (finished) return
        const n = (tries.get(w.job) ?? 0) + 1
        tries.set(w.job, n)
        if (w.job === undefined || n > 2) return reject(err)
        console.error(`\nworker failed on frame ${w.job} (${err.message}); retrying`)
        retry.push(w.job)
        spawnWorker()
      })
      w.on("message", (m) => {
        if (!m.ready) { pending.set(m.i, m); w.job = undefined; flush() }
        give(w)
        wake()
      })
      workers.push(w)
    }
    for (let k = 0; k < nWorkers; k++) spawnWorker()
  })
  enc.stdin.end()
  await done
  const secs = (performance.now() - t0) / 1000
  console.log(`\nvideo ${videoOnly}  ${secs.toFixed(0)} s, mean ${(samples.slice(i0, i1).reduce((a, b) => a + b, 0) / (i1 - i0)).toFixed(1)} samples/frame`)

  const final = path.join(outDir, `${name}.mp4`)
  let audio = null
  if (!opt["no-audio"] && film.score && i0 === 0 && i1 === total) {
    const { renderScore } = await import("./audio.mjs")
    audio = await renderScore(film, outDir, name)
  }
  if (audio) ff(["-i", videoOnly, "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-map_metadata", "-1", "-metadata", `title=${meta.title ?? "Trampa"}`, "-movflags", "+faststart", final])
  else ff(["-i", videoOnly, "-c", "copy", "-map_metadata", "-1", "-metadata", `title=${meta.title ?? "Trampa"}`, "-movflags", "+faststart", final])
  const contact = path.join(outDir, `${name}-contact.png`)
  const rows = Math.ceil(((i1 - i0) / meta.fps) * 2 / 8)
  ff(["-i", final, "-vf", `fps=2,scale=216:-1,tile=8x${rows}:padding=4:color=0x040A20`, "-frames:v", "1", contact])
  writeFileSync(path.join(outDir, `${name}.render.json`), JSON.stringify({ film: filmArg, draft, seconds: Math.round(secs), workers: nWorkers, samples }, null, 0))
  console.log(`master ${final}\ncontact ${contact}`)
  if (!opt["no-qc"] && i0 === 0 && i1 === total && existsSync(final)) {
    const { runQC } = await import("./qc.mjs")
    await runQC(film, final, { draft })
  }
}

if (isMainThread && process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
