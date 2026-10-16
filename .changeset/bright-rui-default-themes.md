---
'@ecopages/radiant-ui': minor
'@ecopages/radiant-themes': minor
---

Radiant UI now ships one OKLCH-derived Radiant Default theme with stronger control boundaries and shared accessibility support. `@ecopages/radiant-themes` adds High Contrast, Windows 95, Mac OS Classic, macOS, and Material Design alongside GitHub, VS Code, and Vercel. Each optional theme includes its own font stacks, a compact variant, and component-specific styling where needed.

If your app used an earlier Radiant palette or preset export, switch to the single default theme and tune `--rui-primary`, `--rui-secondary`, and `--rui-neutral`, or install `@ecopages/radiant-themes/<theme>` for a complete visual system. For a compact layout, use that theme's `/compact` export, such as `@ecopages/radiant-themes/github/compact`. See the [theme migration guide](https://radiant.ecopages.app/docs/getting-started/theming).
