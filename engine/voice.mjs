// Voice-over through ElevenLabs (with-timestamps): one call per take → voice.mp3 + timings.json.
//   node engine/voice.mjs films/<slug>/voice.txt [--voice=<voice_id>] [--dry] [--force]
// voice.txt: one sentence per line; a line "[0.3]" inserts a 0.3 s pause. Key: env ELEVENLABS_API_KEY
// (never print it). The picture fits the voice: never re-synthesise to fit the picture.
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

// The locked settings (the same voice in every film: change them once, deliberately, then never).
export const VOICE = {
  voice_id: "IKne3meq5aSn9XLyUdCD", // a premade voice that reads Croatian well on eleven_multilingual_v2; replace with your chosen one
  model_id: "eleven_multilingual_v2",
  voice_settings: { stability: 0.6, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true, speed: 1.0 },
  seed: 4242,
  output_format: "mp3_44100_128",
}
/** Respellings for words the voice says wrong (the captions keep the written form). */
export const LEXICON = { "trampa.app": "trampa točka ap", "OK": "okej" }

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith("--"))
if (!file) { console.error("usage: node engine/voice.mjs films/<slug>/voice.txt [--voice=id] [--dry] [--force]"); process.exit(1) }
const dir = path.dirname(path.resolve(file))
const lines = readFileSync(file, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
const display = lines.map((l) => (/^\[[\d.]+\]$/.test(l) ? `<break time="${l.slice(1, -1)}s" />` : l)).join(" ")
let sent = display
for (const [w, say] of Object.entries(LEXICON)) sent = sent.replaceAll(w, say)
const spoken = sent.replace(/<break[^>]*>/g, "").replace(/\s+/g, " ").trim()
console.log(`${spoken.length} characters to synthesise`)
if (args.includes("--dry")) process.exit(0)
const mp3 = path.join(dir, "voice.mp3")
if (existsSync(mp3) && !args.includes("--force")) { console.log("voice.mp3 exists (--force redoes it)"); process.exit(0) }
const key = process.env.ELEVENLABS_API_KEY
if (!key) { console.error("ELEVENLABS_API_KEY is not set: make the film without a voice-over (type carries it), or set the key"); process.exit(1) }
const voiceId = args.find((a) => a.startsWith("--voice="))?.slice(8) ?? VOICE.voice_id
const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=${VOICE.output_format}`, {
  method: "POST",
  headers: { "xi-api-key": key, "content-type": "application/json" },
  body: JSON.stringify({ text: sent, model_id: VOICE.model_id, voice_settings: VOICE.voice_settings, seed: VOICE.seed }),
})
if (!res.ok) { console.error(`ElevenLabs HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`); process.exit(1) }
const j = await res.json()
writeFileSync(mp3, Buffer.from(j.audio_base64, "base64"))
// Characters → words (start of the first letter, end of the last).
const a = j.alignment
const words = []
let cur = null
a.characters.forEach((ch, i) => {
  if (/\s/.test(ch)) { if (cur) words.push(cur); cur = null; return }
  if (!cur) cur = { text: "", start: a.character_start_times_seconds[i], end: 0 }
  cur.text += ch
  cur.end = a.character_end_times_seconds[i]
})
if (cur) words.push(cur)
const clean = words.filter((w) => /[\p{L}\d]/u.test(w.text)).map((w) => ({ text: w.text, start: +w.start.toFixed(3), end: +w.end.toFixed(3) }))
writeFileSync(path.join(dir, "timings.json"), JSON.stringify({ audio: "voice.mp3", offset: 0.12, voice_id: voiceId, model_id: VOICE.model_id, seed: VOICE.seed, text: display, words: clean }, null, 1))
console.log(clean.map((w) => `${w.text}[${w.start.toFixed(2)}]`).join(" "))
