---
'@ecopages/radiant-ui': minor
'@ecopages/radiant-themes': minor
---

Refresh the unreleased Radiant theme catalog with stronger control boundaries, quieter decorative borders, and accessible light and dark surfaces.

- Add the Radiant Default, High Contrast, Windows 95, Mac OS Classic, macOS, Material Design, Cloudflare, GitHub, VS Code, and Vercel theme presets.
- Refine the classic themes with native bevels, Platinum controls, striped title bars, and theme-specific scrollbars.
- Make composite fields draw one frame in every theme, including their classic-theme field treatments.
- Align Cloudflare and GitHub semantic palettes with their product systems, including consistent Cloudflare orange and Primer action roles.
- Add compact variants, component-specific styling, visible focus states, and the remaining theme control polish.

Breaking for `@ecopages/radiant-ui` consumers of `0.1.x`: the composable catalog replaces these exports, which `0.1.0` published.

- `./tokens/colors/aurora`, `./tokens/colors/basalt`, `./tokens/colors/glacier` and `./tokens/colors/palettes`
- `./themes/aurora`, `./themes/glacier` and `./themes/default-compact-soft`

The Aurora, Glacier and Basalt palettes have no replacement. The default palette is now `./tokens/colors/rui-default`, `./tokens/foundation` holds the shared foundation tokens, and the new presets ship from `@ecopages/radiant-themes`.
