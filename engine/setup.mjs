// One-time setup: downloads the brand fonts (static TTFs from Google Fonts, OFL) into engine/fonts/,
// checks ffmpeg/ffprobe and the Croatian letters. Safe to re-run.  node engine/setup.mjs
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import opentype from "opentype.js"

const DIR = new URL("./fonts/", import.meta.url)
mkdirSync(DIR, { recursive: true })
// An old user agent makes the CSS API answer with plain TTF instances (one file per weight).
const CSS = "https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700;800&family=Bricolage+Grotesque:opsz,wght@96,700;96,800&display=swap"
const css = await (await fetch(CSS, { headers: { "User-Agent": "Mozilla/4.0" } })).text()
const faces = [...css.matchAll(/font-family: '([^']+)';[\s\S]*?font-weight: (\d+);[\s\S]*?url\((https:[^)]+\.ttf)\)/g)]
if (faces.length < 6) throw new Error("Google Fonts CSS did not list 6 TTF faces:\n" + css.slice(0, 400))
for (const [, family, weight, url] of faces) {
  const name = `${family.startsWith("Bricolage") ? "bricolage" : "figtree"}-${weight}.ttf`
  const file = new URL(name, DIR)
  if (!existsSync(file)) writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer()))
  const font = opentype.loadSync(fileURLToPath(file))
  const missing = [..."ČĆĐŠŽčćđšž€„“"].filter((ch) => font.charToGlyphIndex(ch) === 0)
  console.log(`${name}  ${missing.length ? "MISSING " + missing.join("") : "hr ok"}`)
  if (missing.length) process.exitCode = 1
}
for (const bin of ["ffmpeg", "ffprobe"]) {
  try {
    console.log(execFileSync(bin, ["-version"], { encoding: "utf8" }).split("\n")[0])
  } catch {
    console.error(`${bin} not found: install ffmpeg (Windows: winget install Gyan.FFmpeg · macOS: brew install ffmpeg · Linux: apt install ffmpeg) and open a new terminal`)
    process.exitCode = 1
  }
}
