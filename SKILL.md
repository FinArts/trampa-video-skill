---
name: trampa-video
description: Makes Trampa (trampa.app, the Croatian swap marketplace: trade things without money) brand videos at showreel level, rendered in code: 9:16 reels, TikTok/Shorts/Instagram spots, ads, promos, launch clips, bumpers. Brand-true (navy + orange, game-tile stickers, the slanted trade line, the arrows mark, Figtree/Bricolage), epic seamless transitions, real motion blur, code-made music and SFX, optional Croatian ElevenLabs voice-over, measured QC. Use when the user says "Trampa video", "Trampa reel", "video za Trampu", "napravi reel/oglas/promo za Trampu", "Trampa TikTok", "Trampa spot", "Trampa motion", "animiraj Trampu", or asks for any moving brand asset for Trampa.
---

# Trampa video

You make Trampa brand films entirely in code: every frame is an SVG built from the real brand
(tokens, the mark, the game tiles), rasterised with resvg, motion-blurred with a 180° shutter in
linear light, encoded with ffmpeg, scored by a code synth, and checked by measured gates. No
stock, no AI clips, no samples. The bar is a world-class motion designer's showreel: epic,
seamless transitions, real camera motion, a designed peak, fast but readable. A calm, static,
"slideshow" video is a fail even if it is pretty.

The engine lives next to this file in `engine/` (bundled scripts, copied into each workspace).
A complete reference film is in `films/predmet-za-predmet/film.mjs`: read it before writing a
new film; it is the house style in working code.

---

## 1. Setup (once per workspace)

Needs Node.js ≥ 20 and ffmpeg (with ffprobe) on PATH.
- Windows: `winget install OpenJS.NodeJS.LTS` and `winget install Gyan.FFmpeg`, then a new terminal.
- macOS: `brew install node ffmpeg` · Linux: `sudo apt install nodejs npm ffmpeg`.

`SKILL_DIR` = this skill's base directory (Claude Code prints it when the skill loads; usually
`~/.claude/skills/trampa-video`). Pick a workspace (default `~/trampa-videos`) and run:

```bash
node "SKILL_DIR/engine/init.mjs" ~/trampa-videos
```

It copies `engine/` and the reference film, installs the two dependencies (`@resvg/resvg-js`
2.6.2, `opentype.js` 1.3.4), downloads the brand fonts (static Figtree 400/600/700/800 and
Bricolage Grotesque 700/800 TTFs from the Google Fonts CSS API, OFL) into `engine/fonts/`,
checks that every face has č ć đ š ž € „ " and that ffmpeg runs. Each workspace keeps a frozen
copy of the engine, so a later skill update never changes an old film's pixels
(`--refresh-engine` takes a newer one on purpose).

Prove the install before anything else: `node engine/render.mjs films/predmet-za-predmet/film.mjs --draft`
(about 15–60 s; it must print a QC table).

---

## 2. The bar (what "godly" means here)

These rules come from a studio whose own reels were rejected as "trash" when they were calm and
approved when they moved like a showreel. They are not taste suggestions.

1. **Frame 0 is complete and alive.** No black frame, no fade-in, no logo intro. The hook (≤ 7
   words) is readable on frame 0 and something already moves (dust, a sway, a drifting camera).
2. **A pattern interrupt at 0.4–0.9 s:** a hit that changes the frame (a hop + dust puff + ring,
   a slam), synced to a sound.
3. **The key phrase lands by 3.0 s.**
4. **One idea that reads muted in 3 seconds.** If the film needs its voice-over to make sense,
   it is not finished. Pick one image idea (a guitar gathering dust swaps for a phone; a price
   tag is cut off; 49 € becomes 0 €) and build every scene around it.
5. **Everything is a chain.** Every scene hands a carrier (a tile, a line, a colour) to the next
   (≥ 80 % of scene changes are relays, matches or covers). Never a crossfade, never "cut to a
   new slide". Hidden cuts are hidden by a cover (a band, an iris rim, a flood) or a shape match.
6. **Surge and rest.** Transition windows spike; holds rest but never die (something drifts,
   sways or breathes). One real rest (1.0–1.8 s) right before the signature move, then a
   0.2–0.35 s Dah (musical dip, dimmed frame), then the payoff.
7. **One designed peak:** the payoff (A-impact) at 60–80 % of the runtime is the loudest and
   brightest moment and owns the motion peak (only a portal may beat it).
8. **Controlled, never frantic.** Every move has anticipation, a decisive release and a settle.
   No jitter, no random per-frame noise on positions, no stepped motion. Type holds still and
   sharp long enough to read: max(1.0 s, 0.3 s × words).
9. **Real motion blur** on every fast move (the renderer does it; you only keep moves honest).
10. **Recognisably Trampa with the logo hidden:** navy ground, the hairline grid, the slanted
    orange trade line, game-tile stickers, navy-on-orange payoffs, the swap arc. The full mark
    appears only in the sign (end card).
11. **Loop seam:** the last 0.3–0.5 s hands back to frame 0 (the trade line wipes the end card
    off and the hook is back), so a looping viewer sees no seam.
12. **A pass you would be embarrassed to post is a fail**, whatever the gates say.

---

## 3. Brand canon (from the Trampa app; never invent a value)

**Identity:** navy `#071337` (ink, structure, brand surfaces) and orange `#FF9F1C` (the one
accent). Brand films are "brand moments": committed navy grounds with orange accents.

| Token | Hex | Use in video |
|---|---|---|
| navy | `#071337` | the ground of almost every frame; navy text on orange |
| navy-700 | `#132A63` | lifted details |
| navy-800 | `#0D1E4D` | the hero's lifted stage (right of the trade line) |
| navy-950 | `#040A20` | hard drop shadows under tiles, dim overlays (Dah) |
| orange | `#FF9F1C` | trade line, payoff flood, rings, accents |
| orange-200 | `#FFDCAD` | the sweep running along a trade line, URL, caption highlight |
| orange-800 | `#AA5F00` | orange text on light grounds (≥ 4.5:1) |
| mark orange | `#FF900B` | the logo's arrows and the swap trails only |
| mark ink | `#050620` | the logo's strokes on light grounds (white on navy) |
| grid | `#182345` | the 2 px hairline grid on navy (white 7 % premixed: one flat colour, never a fade) |
| paper | `#F8F9FD` | light scenes (page canvas), cards `#FFFFFF`, borders `#DDE1EC` |
| podium | gold `#F5B820`, silver `#C9D3E1`, bronze `#DE9A62` | leaderboard moments only |

Rules: orange as a background carries **navy** text, never white (white on orange is 2.1:1).
No gradients on large areas (they band in H.264/GIF): flat fills, flat grid. No grey, no black
grounds, no purple-night "tech" look, no neon glow.

**Category tones** (GAME_TONES; a category is recognised by colour before its label):

| Category | Glyph | Tone base / dark / light |
|---|---|---|
| Vozila | car | blue `#3B82F6` / `#1E40AF` / `#BFDBFE` |
| Elektronika | phone | violet `#8B5CF6` / `#5B21B6` / `#DDD6FE` |
| Moda | shirt | rose `#F43F5E` / `#9F1239` / `#FECDD3` |
| Sport | ball | emerald `#10B981` / `#065F46` / `#A7F3D0` |
| Gaming | gamepad | indigo `#6366F1` / `#3730A3` / `#C7D2FE` |
| Glazba | guitar | amber `#F59E0B` / `#92400E` / `#FDE68A` |
| Knjige | book | teal `#14B8A6` / `#115E59` / `#99F6E4` |
| Za djecu | teddy | fuchsia `#D946EF` / `#86198F` / `#F5D0FE` |
| Ljubimci | paw | orange `#FF9F1C` / `#A85A00` / `#FFDCAD` |
| Dom | sofa | lime `#84CC16` / `#3F6212` / `#D9F99D` |
| Alati | hammer | yellow `#EAB308` / `#854D0E` / `#FEF08A` |
| Nekretnine | house | cyan `#06B6D4` / `#155E75` / `#A5F3FC` |
| Ostalo | mysteryBox | navy `#2A4291` / `#071337` / `#BFD0F5` |

Also available: slate, red, green, sky tones; glyphs swap, check, star, sparkles, chat, heart,
gift, camera, crown, trophy, pin, search, bell (`engine/glyphs.json`, the app's own SVG glyphs).

**Game tiles** (`gameTile()`): the tone's face, a 4.5 % navy outline, a darker lip at the
bottom, a lighter top half and band, a gloss spot, the glyph at 76 % in sticker style (white
faces, navy 2.6 outline, the tone's colours, orange accents) with a navy drop, and a hard
navy-950 drop under the tile that deepens while it is lifted. Corner radius 30 %. Tiles tilt a
few degrees when they stand alone. They hop (crouch → spring → squash on landing), swap on arcs,
flip, never fade.

**Typography:**
- Display: **Bricolage Grotesque 800** (700 allowed) for hero lines, slams and big numbers.
  Tracking −0.02 em (never tighter than −0.03 em). Hero lines ≥ 96 px, keywords ≥ 72 px.
- UI/labels/captions/URL: **Figtree 700** (600/800). Captions 56 px.
- Wordmark: **TRAMPA**, Figtree 700, caps, tracking 0.06 em (exact outlines in
  `engine/wordmark.json`, drawn by `wordmark()`).
- Hero type sits on the centre axis x = 504 (the safe column's middle). Two-tone lines: white
  first line, orange second (the site's headline pattern), or navy on orange in payoffs.
- No tracked-uppercase eyebrows above titles, no emoji, no system fonts.

**The mark** (two interlocking arrows; viewBox `0 0 1133.86 581.86`; tight box x 31–1101,
y 26–556; loop counters: circles at (296.3, 291.6) and (836.4, 291.1), r 180.7, usable as
portals). Accent paths are orange `#FF900B`; ink paths are `#050620` on light, white on navy;
"mono" is all white (faint backdrop marks). The paths, verbatim:

```
accent: M442.72,185.74c-72.07-99.73-211.35-122.15-311.08-50.08l0,0C33.46,206.61,10.2,342.68,78.24,442.04C-3.43,323.8,24.07,161.39,141.11,76.81l0,0c118.6-85.71,284.23-59.05,369.94,59.56l7.05,9.76l-68.33,49.38L442.72,185.74z
ink:    M615.32,259.8c-3.84-0.32-6,4.32-3.29,7.06l11.22,11.3l-6.39,4.62l-68.33,49.38L434,414.93l-31.89,23.04c-80.87,58.44-193.79,40.26-252.23-40.61s-40.26-193.79,40.61-252.23c78.34-56.61,186.76-41.32,246.59,33.21c-73.5-93.38-208.24-112.93-305.45-42.68v0C33.46,206.61,10.2,342.68,78.24,442.04c1.09,1.57,2.18,3.15,3.31,4.7c1.13,1.56,2.28,3.09,3.43,4.62c86.63,114.65,249.47,139.52,366.51,54.94l214.74-155.19l6.4-4.62l7.21,14.2c1.75,3.44,6.83,2.84,7.74-0.9l22.29-92.21L615.32,259.8z
accent: M689.95,396.9c72.07,99.73,211.35,122.15,311.08,50.08l0,0c98.17-70.95,121.43-207.01,53.39-306.38c81.67,118.24,54.18,280.65-62.87,365.23l0,0c-118.6,85.71-284.23,59.05-369.94-59.56l-7.05-9.76l68.33-49.38L689.95,396.9z
ink:    M1054.43,140.6c-1.09-1.57-2.18-3.15-3.31-4.71c-1.12-1.56-2.27-3.09-3.43-4.62C961.05,16.62,798.22-8.24,681.18,76.34L466.43,231.53l-6.39,4.62l-7.21-14.2c-1.74-3.44-6.83-2.85-7.73,0.9l-22.3,92.21l94.55,7.77c3.84,0.32,6-4.32,3.29-7.06l-11.22-11.3l6.4-4.62l68.33-49.38l114.53-82.77l31.88-23.04c80.87-58.44,193.79-40.26,252.23,40.61c58.44,80.86,40.26,193.79-40.6,252.23v0c-78.34,56.61-186.76,41.32-246.59-33.21c73.5,93.38,208.24,112.93,305.45,42.68l0,0C1099.21,376.03,1122.47,239.97,1054.43,140.6z
ink:    M695.59,404.3c-1.91-2.43-3.81-4.87-5.64-7.4C691.78,399.43,693.66,401.89,695.59,404.3z
```

**Owned devices** (every frame outside the Dah and the end card carries at least one):
- **The trade line:** a 6 px orange rule on the stage slant (dx/dy = 208/480, leaning right as
  it rises), the left edge of the navy-800 stage. A brighter orange-200 stretch runs up it when an
  action lands. Thickened into a band it is the signature wipe (Z2).
- **The swap arc:** two items trade places on a half-ellipse, one over the top (away, smaller),
  one under the bottom (towards the lens, bigger, drawn last). They never overlap. Their orange
  trails are the logo's arrows being drawn.
- **Game tiles and stickers** in category tones.
- **The hairline grid** (112 px at 1080 wide, 2 px, `#182345`), drawn on a far parallax layer.
- **Navy on orange** for the payoff.

**Frame and safe areas (9:16, 1080 × 1920, 60 fps):** readable type and the logo inside
x 72–936, y 260–1300 (Reels/TikTok/Shorts UI covers the top 260 px, the right rail and the
bottom ~600 px). Hook zone y 360–800. Captions in the band y 1150–1290. Art may bleed full frame.

---

## 4. Voice, copy and claims

- **Croatian only**, standard (ijekavica), č ć đ š ž always correct. Trampa speaks in the
  polite plural „vi" form, like the app: „Zamijenite", „Objavite oglas".
- **Voice words: neighbourly, lively, honest.** Never corporate, never cute.
- **Plain language:** read every line alone, without the picture, as a stranger. Concrete nouns,
  active verbs, 2–8-word sentences, one sentence per line. A number carries its meaning.
- **Never in viewer text:** em dashes (use a full stop or a comma), exclamation marks, emoji,
  hype words („revolucionarno", „vrhunski", „premium", „najbolji", „svjetski", „inovativno"),
  clickbait openers („Jeste li znali", „Nitko vam ne govori", „Hej ekipa", „U današnjem videu"),
  question bait left unanswered, fear copy.
- **Lines the brand already owns** (reuse them verbatim):
  - „Zamijenite ono što vam ne treba za ono što trebate." (the hero headline)
  - „Trampa je mjesto za razmjenu predmeta bez novca."
  - „Predmet za predmet."
  - „Imate nešto što vam više ne treba?" / „Možda netko ima upravo ono što tražite."
  - Steps: „Objavite oglas" · „Pronađite ono što trebate" · „Predložite zamjenu" ·
    „Zamijenite i ocijenite se"
  - CTA: „Objavi oglas" · address `trampa.app`
- **Claims:** only what the product really does: listings with photos, what you want in return,
  search by term, category, city and on a map, trade proposals, messages, mutual ratings after the
  handover, points and ranks (Početnik → Cjenkač → Posrednik → Trgovac → Kolekcionar → Tramper),
  challenges, the leaderboard (Ljestvica), 13 categories. **No invented numbers:** no user counts,
  no "tisuće oglasa", no savings figures, no fake reviews or testimonials. Prices on tags are
  illustrative props (49 €), never claims.
- Hook first, brand last: the voice never says the brand name or the address; the end card signs.

---

## 5. Motion system

**Eases** (`E` in `engine/motion.mjs`; nothing visible moves linearly; no bounce, elastic or back):

| Name | Curve | Use |
|---|---|---|
| `E.glide` | (0.16, 1, 0.3, 1) | default arrival, letter rise |
| `E.settle` | (0.22, 1, 0.36, 1) | Trampa UI ease-out, small UI states |
| `E.exit` | (0.5, 0, 0.75, 0) | leaving, shrinking away |
| `E.inOut` | (0.65, 0, 0.35, 1) | swaps, camera keys, carries |
| `E.expoInOut` | (0.87, 0, 0.13, 1) | locks, pull-backs, flips, the mark assembly |
| `E.morph` | (0.83, 0, 0.17, 1) | wipes, bands |
| `E.whip` | (0.75, 0, 0.15, 1) | fast slides |
| `E.expoIn` | 2^(10(p−1)) | dives into a cut |
| `E.expoOut` | 1 − 2^(−10p) | rings, draws |
| `E.power3In` / `E.power4In` | p³ / p⁴ | drop into a slot / suck into an iris |
| `E.slam` | 2.5 % overshoot | impacts and pop-ins (a tag, a badge, a letter `pop`); never for travel or camera moves |
| `E.sway` | (0.37, 0, 0.63, 1) | ambient sway only |

**Pacing targets (9:16 reel):**

| Measure | Target |
|---|---|
| Scene change (relay, match or covered cut) | every 1.3–2.2 s |
| Micro-beat inside a hold | every 0.4–0.8 s (a hop, a pop, a sweep, a sparkle) |
| Transition length | 0.45–1.1 s (impacts stay one frame) |
| Type entrance | letters rise out of a slot, `E.glide` 0.42 s, stagger 26 ms |
| Type exit | drop back through the slot, `E.power3In` 0.22 s, stagger 8 ms; or carried off / wiped |
| Type hold (landed → exit, still and sharp) | ≥ max(1.0 s, 0.3 s × words) |
| Hero words on screen | ≤ 5 (hook ≤ 7 on frame 0) |
| Camera | never static > 0.8 s outside the rest, the Dah and the end hold |
| Shake | ≤ 3 events, ≤ 3 px (payoff ≤ 5 px), impacts only; captions never shake |
| Hard cuts | ≤ 3, all planned: into the Dah and onto the payoff (+ an impact) |
| Motion energy (QC) | mean 1.3–4.0, peak window ÷ mean ≥ 3.5, quiet windows 5–35 %, never two quiet windows in a row outside the rest/Dah/end |
| Payoff (A-impact) | 60–80 % of runtime, owns the motion peak (a portal may beat it) |
| Beat grid | 110–124 BPM (default 120); land big moves on beats |

**Structure (every film):**

| Beat | When (15 s) | What |
|---|---|---|
| HOOK | 0.0–1.0 | frame 0 complete; the hit at 0.4–0.9 s. The hook is readable from frame 0, so its hold counts from 0: ≤ 5 words can exit by ≈ 1.5 s; at 6–7 words it holds to ≈ 2.1 s and the key phrase (or the hook itself, when it is the key phrase) still lands by 3.0 s. Three short lines are fine when two would fall under 96 px |
| TURN | 1.0–3.0 | the key phrase lands by 3.0; the first relay starts (a swap) |
| PORTAL | ≈ 4–6 | the first "how did they do that": a dive through a shape into the next world (Z4 + Z3). Exactly one, declared as `cues.portal` (the cut instant). It is the only window allowed to beat the payoff; a pull-back, a swap or a wipe is not a portal and must stay under the payoff |
| BUILD | ≈ 5–8 | a relay every 1.3–2.2 s, each scene hands its carrier on |
| REST | 1.0–1.8 s | one living element (a swinging tag), nearly still |
| SIGNATURE | after the rest | the biggest owned move (the trade line cuts something) |
| DAH | 0.2–0.35 s | hard cut to a dimmed frame, music dips (never silence) |
| PAYOFF | 60–80 % | hard cut, the A-impact (slam + shockwave + burst + sub drop) |
| RESOLVE | ≈ 1–2 s | the line under the payoff |
| SIGN | last ≈ 2.4 s | trade-line wipe → the arrows swing in and lock (logo hit) → TRAMPA tracks in → trampa.app |
| LOOP | last 0.3–0.5 s | the trade line wipes back to frame 0 |

Short formats: 6 s bumper = HOOK + one swap + SIGN. 30 s = two BUILD blocks and a second rest.

**Impact ladder:**
- **A (payoff, exactly one):** preceded by the Dah. Hard cut; navy-on-orange (or white-on-navy)
  slam `E.slam` from 1.35×, a camera punch from 1.45×, a thick navy shockwave ring, a second ring,
  a 12–16 sparkle burst, shake ≤ 5 px; sound `S.impact()` + `S.sparkle()`.
- **B (≤ 3):** the hook hit, the portal exit, one mid-build hit: ring + puff or squash, shake ≤ 3
  px; `S.hit()` / `S.stamp()`.
- **C (accents):** pops on tile landings, ticks on type landings, line sweeps. No shake.

**Camera:** the 2.5D camera (`camT(cam, parallax)`): `cam = { x, y, zoom, rot, shakeX, shakeY }`
looks at a world point; draw the grid at parallax 0.6, the stage 0.85, subjects 1.0, dust 1.15.
Every hold is one long eased move (a slow push 1–3 %/s plus a drift); keys only at shot
boundaries (a key in the middle of a hold is a dead stop and reads as a quiet window). Dives are
log-space (`logZoom`) on `E.expoIn`. Hero type is drawn in screen space (outside the camera), so
the world can move under held, perfectly sharp type.

---

## 6. Move library (engine/fx.mjs, brand.mjs, motion.mjs)

| # | Move | Build it with | Notes |
|---|---|---|---|
| Z1 | **Zamjena** (swap arc) | `swapPoses(e, {a, b, rise, far, near})` + `swapTrails(e, out, geo)` + `S.swap(t)` | 0.55–0.8 s `E.inOut`; any direction (the arc bulges to the left of a → b: up for a left → right pair); draw trails first, the "far" tile (A) next, the "near" tile (B) last; the motif plays on the landing |
| Z2 | **Kosa crta** (trade-line wipe) | `tradeWipe(p, frameA, frameB, {dir, band})`, in-scene `tradeBand(p)` | `E.morph` 0.5–0.7 s; between scenes, into the sign, the loop seam; a slash across a prop |
| Z3 | **Zjenica** (iris) | `iris(frameA, frameB, {cx, cy, r, rim})` | open from the centre of a filled shape, orange rim thinning; ends past the frame corners |
| Z4 | **Kroz pločicu** (tile/screen dive) | camera `logZoom(z, 30, E.expoIn(p))` onto a point inside a tile (see the reference film's `tilePoint`) | the tile's colour fills the frame, then Z3 opens the next world |
| Z5 | **Okret** (tile flip) | `gameTile({ flip: Math.cos(π·p) })`, swap `glyph` at the edge-on frame | "A becomes B" in place; 0.45 s `E.expoInOut` |
| Z6 | **Povlačenje** (pull-back) | camera zoom 3–4 → 1 on `E.expoInOut` 0.6–0.8 s | reveals a wall of tiles (the marketplace); keep drifting after. Below zoom 1 raise `grid({ extent })` and pass `width: 2 / zoom` so the hairline stays a hairline |
| Z7 | **Raspad + nositelj** (clear and carry) | every tile but one shrinks away (`E.exit`, stagger 35 ms, farthest first); the carrier flies on an arc to the next set | a low-energy world change that keeps the payoff the peak |
| Z8 | **Hop** | `hop(t, start, {height})` → `{dy, lift, squash}` | micro-beats, the hook hit. Take-off at start + 0.08 (the hit sound goes here), landing at start + 0.46 (a `pop`) |
| Z9 | **Narančasta plima** (orange flood) | `flood(p)` or a hard cut to an orange frame | payoffs: navy type on orange |
| Z10 | **Strelice** (mark assembly) | `markAssemble(k, {cx, cy, width})`, `S.logo(lockTime)` | the arrows swing in on arcs and lock; the logo hit on the lock |
| Z11 | **Odbrojavanje** (number roll) | slot `rise`/`drop` per digit (`text` + anim) | 49 € → 0 €; digits only as the copy says them |
| Z12 | **Petlja** (loop seam) | `tradeWipe(p, signFrame, scene1(t − dur), {dir: -1})` | last 0.3–0.5 s |
| — | accents | `ring`, `burst`, `sparkle`, `streaks`, `dust`, `priceTag`, `stage({ sweep })` | rings and bursts on hits, streaks behind fast entrances, dust for life |

Rules: never the same move twice in a row; Z3/Z4 portal at most once; at least 3 match/relay
moves per film; a seamless cut is always hidden by a cover or a shape match, never a crossfade.
Escalate: each transition a little bigger than the last, up to the payoff.

---

## 7. Sound (engine/audio.mjs, all made in code)

The score is written in the film's `score(S)` from the same cue table as the picture.
- **Groove:** `S.groove({ chords, energy, dips })`: lively F-major mallet pop (I vi IV V: F Dm Bb
  C), 110–124 BPM from `meta.bpm`/`meta.phase`. `energy` steps: 0 pad + sparse mallets (the rest,
  under the logo), 1 half-time (kick 1 & 3, clap 2 & 4, shaker, bass), 2 full (four on the floor,
  offbeat hats, 8th bass, 16th mallet figure). Under a voice-over keep level ≤ 1 while words run.
- **Dips, not silence:** `dips: [[t, len]]` low-pass the music toward 380 Hz and −6 dB (the Dah).
- **SFX (additive on their own bus; they never duck the music):** `S.whoosh(t, {dur, from, to})`
  (peak at 60 % of dur: put it on the move's fastest frame, pan with the motion), `S.swish`,
  `S.riser(tEnd)` (ends 3 ms before its cut), `S.hit(t)` (B), `S.impact(t)` (A, once),
  `S.stamp(t)`, `S.pop(t, midi)` (tile landings), `S.tick(t, midi)` (type landings, rising pitch
  per word), `S.sparkle(t)`, `S.swap(t)` (the „tram-pa" motif: two mallets crossing a fourth, on
  every swap landing).
- **Sonic logo:** `S.logo(t)` = the swap motif, then a struck Fadd9 (keys, bells F6 + C7, a soft
  sub) on the mark's lock. Same in every film, in voice silence.
- **Sync:** each visual event's sound lands 2–6 frames before its visual peak; whooshes on the
  peak-velocity frame; risers end on the cut.
- **Master:** the renderer normalises to −14 LUFS integrated, true peak ≤ −1.5 dBTP (two-pass
  loudnorm) and muxes AAC 192 kb/s.
- **Never:** licensed or trending songs, stock tracks, samples, AI music, a hard silence.

**Voice-over (optional).** Reels mostly play muted, so the picture and type carry the story; a
voice-over adds reach. ElevenLabs only (cheap TTS voices sound robotic): set `ELEVENLABS_API_KEY`
in the environment (never print it; a paid plan is needed for commercial use), write
`films/<slug>/voice.txt` (one sentence per line, `[0.3]` lines are pauses: 0.2 s inside a beat,
0.3 s at a beat change, 0.45 s before the payoff line), then `node engine/voice.mjs films/<slug>/voice.txt`
→ `voice.mp3` + `timings.json` (word onsets). Lock one voice and its settings in `engine/voice.mjs`
(`VOICE`) and never change them between films; fix a mispronounced word only through `LEXICON`,
tested on one short sentence. **The picture fits the voice:** anchor every cue to a word onset
from `timings.json` (big moves start 150–250 ms early and land on the stressed syllable), never
re-synthesise to fit the picture. In the film, load the take next to the module and use it in
both the score and the picture:

```js
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
const TIM = JSON.parse(readFileSync(new URL("./timings.json", import.meta.url), "utf8"))
const at = (word, nth = 0) => TIM.offset + TIM.words.filter((w) => w.text.replace(/[^\p{L}\d]/gu, "").toLowerCase() === word)[nth].start
// cue table: const T = { hook: at("prašinu"), payoff: at("novca"), … }
// in score(S): S.voice({ file: fileURLToPath(new URL("./voice.mp3", import.meta.url)), offset: TIM.offset, words: TIM.words })
// last in frame(t): body += captions(t, TIM, { hide: (s) => s.includes("Bez novca") })
```

Hide a caption group while hero type shows the same words. The voice is ≈ 2.5 words/s; the last
word ends within [sign − 0.8, sign + 0.4] s.

---

## 8. Workflow (follow it in order)

1. **Brief** (from the user; ask only what blocks you): purpose (organic reel, ad, launch,
   bumper), length (6 / 15 / 30 s), format (9:16 default; 1:1 and 16:9 need their own layout),
   voice-over or not, the one message.
2. **One idea.** Write three one-line concepts, pick the one that reads muted in 3 s and owns a
   Trampa device. Reject anything that would work for any other brand.
3. **Storyboard** in `films/<slug>/BOARD.md` with the template below: beat map with times,
   carriers, moves, type, sound cues. Check it against §2 and §5 before writing code.
4. **Build** `films/<slug>/film.mjs` (API in §9), starting from a copy of the reference film. One
   cue table `T` drives both picture and score.
5. **Stills first:** `node engine/render.mjs films/<slug>/film.mjs --draft --stills=0,0.6,2.5,…`
   (one still per beat), then `node engine/sheet.mjs films/<slug>/out/stills 6 300` and LOOK at the
   sheet. Fix composition, scale and type before any video render.
6. **Draft:** `node engine/render.mjs films/<slug>/film.mjs --draft` (540 × 960, ≤ 8 blur
   samples, prints QC). Fix every failed gate.
7. **Master:** `node engine/render.mjs films/<slug>/film.mjs` (1080 × 1920, ≤ 48 blur samples,
   score, contact sheet, QC, review sheet).
8. **Review** (§10) against the bar with the review sheet and full-size stills; iterate until it
   passes. Then deliver (§11).

**Storyboard template (BOARD.md):**

```
# <Title> · <length> s · 9:16 · <bpm> BPM · voice: none | <voice id>
One idea (muted, 3 s): <one sentence>
Owned device: <swap arc | trade line | tiles | navy-on-orange>   Payoff: <word/visual> at <t> s (<pct> %)

| t (s) | Beat | Picture (camera · carrier → next) | Type on screen | Sound |
|---|---|---|---|---|
| 0.00 | HOOK | frame 0: … | „…" (≤ 7 words) | groove level 1 |
| 0.50 | HIT | … | | stamp + hit |
| … | TURN / PORTAL / BUILD / REST / SIGNATURE | … | … | … |
| … | DAH | hard cut, dimmed | | dip |
| … | PAYOFF | hard cut, A-impact | „…" | impact + sparkle |
| … | SIGN | Z2 wipe → Z10 mark → TRAMPA → trampa.app | | logo at lock |
| … | LOOP | Z12 back to frame 0 | | swish |

Gates to watch: hook hit <t>, key phrase lands <t>, rest <a–b>, Dah <a–b>, payoff <t>, planned cuts <…>.
```

---

## 9. Film module API

A film is one ES module, `films/<slug>/film.mjs`. Every value is a pure function of `t` (no
clock, no `Math.random`: use `rng(seed)` for layouts), so any frame renders in any order.

```js
import { C, W, H, AXIS, SAFE, doc, grid, stage, gameTile, stickerGlyph, mark, wordmark, sparkle, pill, CATEGORY, TONES, composite } from "../../engine/brand.mjs"
import { E, ease, span, bump, lerp, clamp, track, camT, worldToScreen, screenOf, about, shake, logZoom, spin, rng, rad, f } from "../../engine/motion.mjs"
import { text, rise, drop, riseDrop, pop, wave, both, fit, measure, captions } from "../../engine/type.mjs"
import { swapPoses, swapTrails, tradeWipe, tradeBand, iris, flood, ring, burst, streaks, dust, priceTag, hop, markAssemble } from "../../engine/fx.mjs"

export const meta = {
  title: "Trampa · <name>", dur: 15, fps: 60, bpm: 120, phase: 0,
  cuts: [10.25, 10.5],            // planned hard cuts (the shutter never blurs across them)
  crisp: [[10.5, 10.56]],         // frames rendered with one sharp sample (right after a slam)
  rest: [8.75, 9.8], dah: [10.25, 10.5],
  cues: { hook: 0.5, payoff: 10.5, portal: 5.35, sign: 13.35 },
  transitions: [[2.3, 3.0, "Z1 swap"], …],   // covered scene changes (QC accepts cut detection inside)
  review: [[0, "frame 0"], …],    // labelled frames for the review sheet
}
export function frame(t) { … return doc(body) }   // or a composite (tradeWipe / iris) of two doc()s
export function score(S) { S.groove({…}); S.hit(…); … }
```

Engine reference (most used):
- `doc(body, bg = C.navy)` one frame. `composite(A, B, maskBody, overBody)` raster mix of two
  frames (what `tradeWipe`/`iris` return): use it for every scene-to-scene transition.
- `gameTile({ cx, cy, size, tone, glyph, rot, lift, squash, scale, flip })`;
  `stickerGlyph({ cx, cy, size, tone, glyph, bg })`; `mark({ cx, cy, width, variant })`;
  `wordmark({ cx, y, size, track, color })`; `grid()`; `stage({ x, sweep })`; `sparkle()`; `pill()`.
- `text(str, { x, y, size, face, color, align, track, leading, anim, slot, role })`: `str` may
  contain `\n`; `color` may be an array per line; `anim(i, n, line, j, lineLen)` per glyph (`i`
  counts across all lines, `j` inside the line: rise line by line with `line` and `j`; helpers
  `rise`, `drop`, `riseDrop`, `pop`, `wave`, combine with `both`); `slot: true` clips letters at the baseline slot (draw slot
  text in screen space, or pass `screen(x, y)` if it sits inside a camera group). `fit(str, face,
  width, max)` picks the size. `role`: "hero" | "label" | "caption" | "deco" (deco skips QC).
- `camT(cam, parallax)` and its inverse `worldToScreen(cam, parallax, x, y)` (culling, pinning
  screen-space type to a moving object); `screenOf(cam, p)` gives the `screen` function for
  `text()` inside a camera group; `about(cx, cy, s)` → `{ transform, screen }` scales a group about
  a point (slams, punches) and keeps QC measuring the size the viewer sees.
- `shake(t, [[time, px]])`, `logZoom(z0, z1, k)`, `track(t, keys)`, `spin(t, w, kicks)`,
  `ease(t, start, dur, fn)`, `span`, `bump`. The renderer resets clip ids and the QC registry before
  every frame; `frame(t)` does not need to.

---

## 10. Quality gates

**Code gates** (printed after every full render; `node engine/qc.mjs films/<slug>/film.mjs [--draft]`
re-runs them): motion mean, peak ÷ mean, payoff owns the peak, quiet windows, no two quiet
windows in a row, cuts only where planned or covered, ≤ 3 hard cuts, flash safety (≤ 3 big luma
jumps per second, WCAG 2.3.1), loudness −15.5…−13.5 LUFS and true peak ≤ −1 dBFS, frame 0 alive,
hook ≤ 7 words, first impact 0.4–0.9 s (the declared cue plus a measured motion spike), payoff
at 60–80 % (the declared cue; the motion gate measures that it owns the peak), every hero line held long enough,
held type inside the safe area and big enough, determinism. **Every gate passes before anyone
sees the film.** Never pad the end or stretch the voice to pass a gate: fix the cause.

**Look at it yourself** (the gates cannot see taste): the contact sheet, the review sheet
(`out/<name>-review.png`) and full-size stills of the hook, every transition's middle, the payoff
and the end card. Score the film 0–10 on each item; pass = every item ≥ 7 and a mean ≥ 8.5; any
item ≤ 4 fails it:

1 Hook (frame 0 complete, hit on time) · 2 Chain continuity (carriers, no slideshow) ·
3 Easing and physics (anticipation, release, settle; squash on landings) · 4 Surge/rest contrast ·
5 Motion blur and crispness (no strobing copies, type sharp in holds) · 6 Composition and scale
(bold, fills the safe area, nothing timid or empty) · 7 Colour discipline (navy/orange, tones only
on tiles, no gradients) · 8 Typography (sizes, holds, slot rises, diacritics intact) ·
9 Signature moment (a rewatch trigger, on a beat) · 10 Sound-to-picture sync · 11 Music and mix
(no pumping, no audible cuts, voice intelligible) · 12 Story clarity (mute test + one-sentence
retell) · 13 Brand recognition with the logo hidden · 14 Variety against the last film ·
15 Ending (logo hit on the lock, loop seam to frame 0) · 16 Technical cleanliness.

Human tests: **logo-hidden** (still Trampa?), **mute** (does the picture tell it?), **eyes-closed**
(does the voice alone make sense?), **screenshot** (is any frame a good still?), **"could another
brand post this unchanged?"** (if yes, rework the idea).

Variety: keep a line per film in `films/LEDGER.md` (init creates it) (idea, opening, signature move, colour mood,
music energy) and change at least 3 of them for the next film.

---

## 11. Delivery

- Master: `films/<slug>/out/<slug>.mp4` (H.264 High, CRF 16, BT.709, yuv420p, 60 fps, AAC,
  faststart, metadata stripped, title only).
- Phone/upload copy (≈ 2.5 Mb/s):
  `ffmpeg -y -i films/<slug>/out/<slug>.mp4 -c:v libx264 -profile:v high -preset slow -crf 22 -maxrate 4M -bufsize 8M -pix_fmt yuv420p -c:a aac -b:a 192k -map_metadata -1 -metadata title="Trampa" -movflags +faststart films/<slug>/out/<slug>-phone.mp4`
- Cover: frame 0 (the hook): `node engine/render.mjs films/<slug>/film.mjs --stills=0`.
- Post text: one keyword sentence, 1–3 plain lines, the CTA „Objavi oglas na trampa.app.",
  3–5 hashtags (#trampa #zamjena #bezNovca …). No AI mention, no watermark.
- Report: paths, the gate table, the review sheet, and anything not verified.

---

## 12. Pitfalls (each one cost a render)

- **resvg panics** (the whole process dies) on a `clip-path`, `mask` or group `opacity` whose
  content lies fully past the **right or bottom** frame edge. The engine never uses group
  `opacity` (use `fill-opacity` or a premixed colour) and keeps clip-paths out of tiles and props;
  scene transitions are raster composites. In your own SVG: no `<g opacity>`, no clip-path around
  anything a camera can move off-frame.
- `new Resvg()` without `font: { loadSystemFonts: false }` scans every system font per frame
  (0.6 s instead of 25 ms). The engine sets it; keep it if you call resvg yourself.
- Gradients band in H.264: flat fills only; the grid is one premixed flat colour.
- A camera key in the middle of a hold is a dead stop (QC flags quiet windows): one long eased move
  per hold.
- A full-frame fast move (a whip across a wall of colourful tiles) outweighs the payoff in the
  motion gate: use Z7 (clear + carry) or a covered wipe for big world changes, and keep the payoff
  the peak (it is a hard cut with a camera punch, rings and a burst).
- A payoff that straddles a 0.5 s QC window splits its energy: put the payoff cue on a window
  start (x.0 or x.5 s).
- Draft renders cap blur at 8 samples, so very fast bands strobe in drafts; judge blur on masters.
- Text outlines come from the TTF files: if `engine/fonts/` is missing, run `node engine/setup.mjs`.
- On Windows, write scripts with Croatian text through a file editor, not a shell heredoc, and keep
  files UTF-8.
- A still at time t shows the shutter average around t: check exact poses with `--stills`.
- Memory: each render worker holds a few full-size float buffers; the pool is sized by free RAM
  and cores (≤ 8), and a frame whose worker crashes is retried. If a render still dies with
  `Array buffer allocation failed`, re-run with `--workers=4`.
- QC measures the type you see: the box of the glyphs visible in each frame (animations and slots
  included). Type drawn inside a camera or scaled group needs `screen` (`screenOf` / `about`), or its
  size and safe-area checks are wrong.
- `--stills` empties `out/stills/` first; copy stills you want to keep elsewhere.
