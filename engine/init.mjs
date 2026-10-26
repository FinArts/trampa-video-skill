// Creates (or refreshes the engine of) a Trampa video workspace: copies engine/ and the reference
// film from the skill, installs the two dependencies, downloads the fonts, checks ffmpeg.
//   node <skill dir>/engine/init.mjs <workspace dir>
// Each workspace keeps its own frozen copy of the engine, so a later skill update never changes the
// pixels of a film already made. Re-run with --refresh-engine to take a newer engine on purpose.
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs"
import { execSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const ws = path.resolve(process.argv[2] ?? ".")
const refresh = process.argv.includes("--refresh-engine")
mkdirSync(ws, { recursive: true })
if (!existsSync(path.join(ws, "engine")) || refresh) {
  cpSync(path.join(SKILL, "engine"), path.join(ws, "engine"), { recursive: true, filter: (src) => !src.includes(`${path.sep}fonts${path.sep}`) && !src.endsWith(`${path.sep}fonts`) })
  console.log("engine copied")
}
const ref = path.join(ws, "films", "predmet-za-predmet", "film.mjs")
if (!existsSync(ref)) {
  mkdirSync(path.dirname(ref), { recursive: true })
  cpSync(path.join(SKILL, "films", "predmet-za-predmet", "film.mjs"), ref)
  console.log("reference film copied: films/predmet-za-predmet/film.mjs")
}
const ledger = path.join(ws, "films", "LEDGER.md")
if (!existsSync(ledger)) {
  writeFileSync(ledger, [
    "# Film ledger",
    "",
    "One line per film: change at least 3 columns from the previous film.",
    "",
    "| Date | Film | One idea | Opening | Signature move | Colour mood | Music energy |",
    "|---|---|---|---|---|---|---|",
    "| (reference) | predmet-za-predmet | a dusty guitar swaps for a phone; the price tag is cut off: 0 € | hook + hop | Z2 slash through the tag string | navy, orange payoff | 2 / rest 0 / 2 |",
    "",
  ].join("\n"))
}
if (!existsSync(path.join(ws, "package.json"))) {
  writeFileSync(path.join(ws, "package.json"), JSON.stringify({ name: "trampa-videos", private: true, type: "module", dependencies: { "@resvg/resvg-js": "2.6.2", "opentype.js": "1.3.4" } }, null, 2) + "\n")
}
execSync("npm install --no-fund --no-audit", { cwd: ws, stdio: "inherit" })
execSync("node engine/setup.mjs", { cwd: ws, stdio: "inherit" })
console.log(`\nready: ${ws}\n  node engine/render.mjs films/predmet-za-predmet/film.mjs --draft`)
