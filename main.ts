// Vice Frame — handover program (Node 22, standard library only).
//
// The app itself is the static site in app/: plain HTML, CSS and ES
// modules that a desktop browser runs entirely offline. This program
// is only the delivery plumbing. It copies app/ and screenshots/ from
// beside this file into the output directory and writes a
// dossier.json there — the summary the make.fun judge reads — built
// with the kit's vendored library (vendor/makefun-app.ts, unmodified).
//
// In the grader the output directory is /output; anywhere else, set
// MAKEFUN_OUTPUT_DIR to stand in for it:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Try the app itself with `node serve.ts` (http://localhost:8080).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps are the scorer's own (reference/gate.json): text_max_bytes
// shapes the dossier text; the rest refuse anything the scorer would
// refuse — over 4 screenshots or one over 256 KiB, over 993 files or
// 48 MiB under app/, or a single app path over 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(`vice-frame: app, screenshots and dossier.json written to ${out}`);
