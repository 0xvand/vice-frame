// Vice Frame — shot mode.
// Fixed scenes for screenshots and shareable previews, driven entirely
// by URL query parameters, e.g.
//   ?shot=cover&photo=neon&layout=trio&grade=neon&size=square
//     &caption=Midnight%20Heat&sub=After%20Dark
//   ?shot=editor&photo=boulevard&panels=boulevard,neon,boulevard
//
// shot=cover renders the cover alone at exact export pixels (the page
// is exactly the canvas); shot=editor loads the same preset into the
// full editor UI. `photo` names a bundled sample; `panels` is a comma
// list of sample keys, one per panel, and wins over `photo`/`spread`.

export const SAMPLE_URLS = {
  boulevard: 'samples/boulevard.jpg',
  neon: 'samples/neon.jpg',
};

export function parseShot() {
  const q = new URLSearchParams(location.search);
  const mode = q.get('shot');
  if (mode !== 'cover' && mode !== 'editor') return null;
  return {
    mode,
    photo: q.get('photo') || 'boulevard',
    layout: q.get('layout'),
    grade: q.get('grade'),
    size: q.get('size'),
    caption: q.get('caption'),
    sub: q.get('sub'),
    spread: q.get('spread') === '1',
    panels: q.get('panels') ? q.get('panels').split(',').map((s) => s.trim()).filter(Boolean) : null,
  };
}

// The sample key each panel should show for this shot, in panel order.
export function shotPanelKeys(shot, panelCount) {
  const keys = [];
  for (let i = 0; i < panelCount; i++) {
    if (shot.panels && shot.panels[i]) keys.push(shot.panels[i]);
    else keys.push(shot.photo);
  }
  return keys;
}

// Every distinct sample key the shot needs loaded before it can render.
export function shotPhotoKeys(shot, panelCount) {
  return [...new Set(shotPanelKeys(shot, panelCount))];
}
