# How to record the Aybolit demo GIF

A short screencast goes a long way for a portfolio. Aim for **about 60
seconds**, no audio, smooth cursor movements, and one clear action per
beat. The output lives at `docs/demo.gif` and is embedded in the README.

---

## Tool

[**Kap**](https://getkap.co) — free, open-source, exports straight to GIF.
Alternatives: [GIPHY Capture](https://giphy.com/apps/giphycapture),
[LICEcap](https://www.cockos.com/licecap/) (Mac/Win), `ffmpeg`.

---

## Setup

```bash
# Terminal 1 — backend
export GROQ_API_KEY="your-key-here"
uvicorn api.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend && npm run dev
```

Then in your browser:

1. Open `http://localhost:5173`
2. Resize the browser window to **1200 × 800** (or 1280 × 720 for 16:9)
3. Hard refresh once so font loading isn't captured (`⌘⇧R`)
4. Have a medicine-box photo ready on the Desktop — any clear shot of a
   pill box works (Aspirin, Panadol, Nurofen, etc.)
5. Switch the language toggle to whichever language you want featured
   in the recording (HY makes a strong impression for the demo)

---

## 60-second script

| Time | Action |
|------|--------|
| 00:00 – 00:05 | Show the empty app. Pause briefly so the clean layout reads. |
| 00:05 – 00:20 | Click into the **Explain** input. Type **`paratsetamol`** (the phonetic Russian-via-Latin spelling). Press *Explain medication*. While the result loads, dwell on the *Did you mean Paracetamol?* hint and the bilingual summary that appears. Scroll once to reveal the *How to take* card. |
| 00:20 – 00:35 | Click the **Interaction** tab. Type **`Aspirin`** in the first input and **`Warfarin`** in the second. Press *Check interaction*. Pause on the caution verdict + bilingual explanation. |
| 00:35 – 00:50 | Click the **Scan** tab. Drag the medicine-box photo from the Desktop into the dashed zone. Wait for OCR (~1 s). Show the extracted *Drug · Strength · Manufacturer* table. |
| 00:50 – 00:60 | Click **Explain this medication** — the app jumps back to the Explain tab and the result for the scanned drug appears. End. |

---

## Recording tips

- **No audio** — Kap → output settings → uncheck microphone.
- **Cursor**: enable "Highlight clicks" in Kap so taps are visible.
- **Speed**: don't rush. A slightly slower demo reads as confident.
  If you finish under 60 s, that's fine — under 90 s is the ceiling.
- **Frame rate**: 15 fps is enough for UI and keeps the file small
  (under 5 MB if possible). GitHub renders GIFs up to ~10 MB inline.
- **Crop** to just the browser viewport — no menu bar, no Dock.

---

## Save and commit

```bash
# Save Kap output as docs/demo.gif
git add docs/demo.gif
git commit -m "docs: add demo GIF"
git push
```

The README already references `docs/demo.gif`, so once the file exists
the embed works automatically.

---

## Alternative — `ffmpeg` from a screen recording

If you record with QuickTime first (`⌘⇧5` on Mac), convert to GIF with:

```bash
ffmpeg -i recording.mov \
  -vf "fps=15,scale=900:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  -loop 0 docs/demo.gif
```

This produces a high-quality, palette-optimised GIF.
