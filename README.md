# trampa-video

A Claude Code skill that makes Trampa brand videos (9:16 reels, spots, ads, bumpers) at showreel
level, rendered entirely in code: the real Trampa brand (navy + orange, the arrows mark, game-tile
stickers, the slanted trade line, Figtree / Bricolage Grotesque), seamless transitions, real motion
blur, code-made music and SFX, optional Croatian voice-over, and measured quality gates.

## Install

```bash
git clone https://github.com/FinArts/trampa-video-skill.git ~/.claude/skills/trampa-video
```

Needs Node.js 20+ and ffmpeg on PATH (Windows: `winget install OpenJS.NodeJS.LTS Gyan.FFmpeg`,
macOS: `brew install node ffmpeg`).

## Use

In Claude Code, ask for it in plain words, for example:

> Napravi 15-sekundni 9:16 reel za Trampu: predmet za predmet, bez novca.

The skill sets up a workspace (default `~/trampa-videos`) on first use, writes a storyboard,
builds the film, renders stills, a draft and a master, runs the QC gates and reviews the frames
before handing you the video.

Manual commands, from a workspace:

```bash
node ~/.claude/skills/trampa-video/engine/init.mjs ~/trampa-videos   # once
node engine/render.mjs films/predmet-za-predmet/film.mjs --draft        # quick preview
node engine/render.mjs films/predmet-za-predmet/film.mjs                # master + QC
```

Voice-over is optional and uses your own ElevenLabs key (`ELEVENLABS_API_KEY`).

## What is inside

- `SKILL.md`: the brand canon, motion system, move library, sound, workflow, storyboard template,
  quality gates and pitfalls.
- `engine/`: the renderer (SVG → resvg → 180° shutter → ffmpeg), brand drawing, type as outlines,
  transitions, the synth score, voice-over, QC.
- `films/predmet-za-predmet/film.mjs`: a complete 15 s reference film.

The Trampa name, mark and visual identity belong to Trampa. Fonts are downloaded from Google Fonts
(SIL Open Font License) at setup.
