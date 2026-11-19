# vice-frame

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/0xvand/vice-frame/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/0xvand/vice-frame/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

**Vice Frame** is a cover art studio that turns your own photos into bold,
multi-panel, GTA-style poster art. Drop in a photo, pick a panel layout,
grade it — Vice Sunset, Neon Night, Golden Hour or Noir — set a heavyweight
caption, and export a share-ready PNG. Three steps, no uploads, no accounts,
no build step: the whole studio is static files that run offline in a
desktop browser.

## What it does

- **Five panel layouts** — Blockbuster (five tilted frames), Trio, Showdown,
  Grid Six and a full-bleed Hero — drawn as angled quads with shared seams
  and thick white poster dividers.
- **Your photos, framed your way** — add photos by file picker or drag and
  drop, put a different photo in every panel or spread one across all of
  them, then drag inside a panel to pan, scroll to zoom, or fine-tune with
  sliders.
- **Four colour grades** — a filter pass over the composed collage plus an
  overlay gradient, vignette and film grain, for that sunset-or-neon poster
  finish.
- **Poster lettering** — a condensed black typeface, skewed, with a hard
  accent-colour shadow and a thick dark outline; editable title and
  subtitle, size, position, title colour and accent colour.
- **Real export sizes** — Poster 1080 × 1350, Square 1080 × 1080 and Wide
  1920 × 1080 PNGs, rendered at full resolution from the same engine that
  draws the live preview.
- **Shot mode** — any scene can be reproduced from URL parameters
  (`?shot=cover&photo=neon&layout=trio&caption=...`), which is how the
  screenshots in `screenshots/` were captured; see `shots.json`.

## Run it

Serve the `app/` folder with any static file server and open it in a
desktop browser. With Node 22:

```sh
node serve.ts
# then open http://localhost:8080
```

Everything the app loads lives under `app/` — markup, styles, modules,
fonts and two sample photos — and it makes no network requests. Photos
you add are read on your own machine only and never uploaded anywhere.

To produce the submission dossier (what `main.ts` is for):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Notes

- Vice Frame is an original fan-made tool. It is **not affiliated with
  Rockstar Games or the Grand Theft Auto series**, and it contains no game
  artwork, logos, characters or fonts.
- Type is set in **Noto Sans** and **Noto Sans Display** by Google, bundled
  under `app/fonts/` and licensed under the SIL Open Font License 1.1 —
  see `app/fonts/OFL-1.1.txt`.
- The two bundled sample photos (`app/samples/`) were generated with an
  image model for this app.
- The app itself is MIT-licensed (see `LICENSE`); `vendor/makefun-app.ts`
  is the make.fun kit's dossier library, included unmodified.
