---
'@ecopages/radiant-ui': minor
'@ecopages/radiant-themes': minor
---

Radiant UI now ships one seed-derived Basalt default, and optional themes plus composable variants live in `@ecopages/radiant-themes`.

Migration: install `@ecopages/radiant-themes` for GitHub, VS Code, or Vercel. The old `themes/glacier`, `themes/aurora`, their color packs, and `tokens/colors/palettes` have no direct replacement; tune Basalt's `--rui-primary`, `--rui-secondary`, and `--rui-neutral`. Replace `@ecopages/radiant-ui/themes/default-compact-soft` with `@ecopages/radiant-ui/themes/default` plus `@ecopages/radiant-ui/tokens/spacing/compact` (soft radius is included). See the [theme migration guide](https://radiant.ecopages.app/docs/getting-started/theming).
