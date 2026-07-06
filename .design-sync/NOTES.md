# design-sync notes (app-factory)

- This repo had no first-party design system; the sync source is `packages/ui` (`@app-factory/ui`), a curated barrel of Mantine v9 components + the shared app-factory theme (`primaryColor: indigo`, `defaultRadius: md`, Inter font stack) + an `AppProvider` (MantineProvider preconfigured with the theme). Created 2026-07-06 for this purpose.
- `vp` (Vite+) is mandated by CLAUDE.md but is NOT installed in the web-session container; workspace install/build used `pnpm` directly (`pnpm install`, `pnpm -F @app-factory/ui build`).
- Apps reference `'Inter'` in the theme but never load the font — production falls back to system fonts. Watch for `[FONT_MISSING]`.
- Playwright for the render check must be `1.56.0` (cached chromium build 1194 at `/opt/pw-browsers`; `PLAYWRIGHT_BROWSERS_PATH` is preset). Never run `playwright install`.
- DesignSync tool is unauthorized in this headless environment (`/design-login` unavailable) — first run built and verified locally; project creation + upload pending user authorization.

## Known render warns (triaged, benign)
- `[TOKENS_MISSING]` ~50 vars (`--mantine-*`, `--affix-*`, `--app-shell-*`): expected — Mantine injects theme vars at runtime via MantineProvider (`cfg.provider` = AppProvider). Verified: Button preview renders fully themed (indigo).
- `[DTS_STYLE_SYSTEM]` on @mantine/core / @types/react: style props (m/p/c/bg…) filtered from `<Name>Props` — they ARE real API on every component; taught in conventions.md instead.
- `[CSS_RUNTIME]` fired only before `cssEntry` was set; with `dist/mantine.css` copied at package build it no longer applies.

## Re-sync risks
- `packages/ui/dist/mantine.css` is a build-time copy of `node_modules/@mantine/core/styles.css` (pnpm symlink escapes the cssEntry containment bound, so the copy is required). A Mantine version bump changes it only after `pnpm -F @app-factory/ui build`.
- The curated export list in `packages/ui/src/index.ts` is the component universe — adding a Mantine component to the DS = add the export there, rebuild, re-sync.
- Preview content assumes Japanese-language apps; icons deliberately absent (no icon package installed).
