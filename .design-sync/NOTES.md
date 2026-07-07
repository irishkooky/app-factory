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

## Preview-authoring learnings (folded from wave batches A–F, 2026-07-06)
- Container `size` renders invisibly identical inside shrink-to-fit cells — wrap in `Box w={800}` + `w="100%"` on the Container.
- Avatar: `name` + `color="initials"` auto-derives initials and color. Image: preview `fallbackSrc` with `src={null}` (broken-URI onError races the screenshot).
- List: root-level `icon` prop replaces bullets for all items.
- Select (Combobox-based): closed previews need only `data` + `defaultValue`. Slider: explicit `marks` array; `restrictToMarks`. NumberInput: native `prefix`/`suffix`/`thousandSeparator`.
- Progress multi-segment = `Progress.Root`+`Progress.Section`+`Progress.Label`; Loader `type` = oval|bars|dots; Notification `withCloseButton` defaults true.
- Stepper shows only the active step's children (correct, not a bug). Pagination supports `defaultValue` (uncontrolled). JSX literal `<`/`>` in text must be `&lt;`/`&gt;`.
- Table renders ~745px wide for 6 columns — acceptable in current cards; consider `cardMode: column` if it ever overflows the product grid.
- Overlays render open+inline with `opened` + `withinPortal={false}` + `transitionProps={{duration:0}}` under cardMode single. Drawer additionally needs an in-flow sized sibling (`Box h={560}`) because the single-card wrapper has no intrinsic height and Drawer sizes itself against it (percentage-height chain); Modal/Menu/Tooltip/Popover size intrinsically and are immune.
- The emitted `<Name>.d.ts` were gutted by the `[DTS_STYLE_SYSTEM]` package filter (@mantine/core flagged, so ALL Mantine-declared props dropped, incl. real API like `variant`/`opened`/`sections`). Fixed via `.design-sync/overrides/dts.mjs` fork (see libOverrides). Real Mantine types live at `packages/ui/node_modules/@mantine/core/lib/components/<Name>/<Name>.d.ts`.
- Known render warn: `[RENDER_THIN]` on `overlays/Modal` ("rendered height 0px") — measurement artifact of the fixed-position modal inside the single-card wrapper; the screenshot is visually complete (dialog with title/body/buttons). Benign; recheck the sheet on re-syncs.
