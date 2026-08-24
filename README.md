# RunList

Scan a photo of a postcode list, edit it into a delivery run, work through it,
and hand off each address to West Sussex iMap for pin-drop navigation.

Everything runs client-side — no backend, no accounts, no server costs.
OCR happens on-device via Tesseract.js, and the run list is saved to the
browser's `localStorage` so it survives the tab being backgrounded or
reloaded while you're out on the map site.

## How it works

1. **Scan** — take a photo of a postcode list (phone screen or printed
   sheet). OCR reads it and pulls out postcode-shaped matches, in the order
   they appear.
2. **Edit** — each stop is an editable card: fix the postcode if OCR
   misread it, add the house number/name.
3. **Copy & open iMap** — copies the full address to the clipboard and
   opens the West Sussex Rights of Way iMap in a new tab, ready to paste
   into its search box and drop a pin.
4. **Mark delivered** — tracks progress through the run; state persists
   automatically.
5. **Clear run** — wipes the list at the end, ready for the next one.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Outputs a static site to `dist/`.

## Deploying to Netlify

This repo includes a `netlify.toml` with the build command and publish
directory already set (`npm run build` → `dist`), so:

- **Git-based deploy (recommended):** push this repo to GitHub, then in
  Netlify: *Add new site → Import an existing project*, pick the repo.
  Netlify will read `netlify.toml` automatically — no manual config needed.
- **Drag-and-drop:** run `npm run build` locally, then drag the `dist`
  folder onto Netlify's deploy page.

No environment variables, secrets, or backend services required. The site
is intended for open access — no login is configured.

## Notes on OCR accuracy

Postcode extraction is regex-based (`AA9A 9AA`-style patterns) run over the
OCR output, so stray misreads on phone-screen photos (glare, moiré) are
normal — that's why every field is editable before you copy it across.
Photos of printed sheets read more reliably than photos of another screen.

## Changing the name

"RunList" is just a display string — it appears in `src/App.jsx` (the
`<span className="brand">` block) and in `vite.config.js` under the PWA
`manifest.name` / `short_name`. Update both and rebuild to rebrand.
