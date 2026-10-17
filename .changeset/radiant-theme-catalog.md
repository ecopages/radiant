---
'@ecopages/radiant-ui': minor
'@ecopages/radiant-themes': minor
---

Replace the `0.1.x` palette modules with a composable Radiant theme catalog, with stronger control boundaries, quieter decorative borders, and accessible light and dark surfaces.

- Add the Radiant Default, High Contrast, Windows 95, Mac OS Classic, macOS, Material Design, Cloudflare, GitHub, VS Code, and Vercel theme presets.
- Refine the classic themes with native bevels, Platinum controls, striped title bars, and theme-specific scrollbars.
- Make composite fields draw one frame in every theme, including their classic-theme field treatments.
- Align Cloudflare and GitHub semantic palettes with their product systems, including consistent Cloudflare orange and Primer action roles.
- Add compact variants, component-specific styling, visible focus states, and the remaining theme control polish.
- Refine treegrid surfaces for VS Code, GitHub, macOS, Mac OS Classic, and Windows 95, including per-level indentation and native disclosure affordances.
- Draw treegrids as trees in every theme: no divider under each row, only the header rule, so rows read by indentation and selection instead of as spreadsheet lines.

Breaking for `@ecopages/radiant-ui` consumers of `0.1.x`: the composable catalog replaces these exports, which `0.1.0` published. Remove the old import and use the replacement.

| Removed export                                                                                                         | Replacement                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `@ecopages/radiant-ui/themes/glacier`, `@ecopages/radiant-ui/themes/aurora`                                            | `@ecopages/radiant-ui/themes/default`, then tune the seed variables `--rui-primary`, `--rui-secondary` and `--rui-neutral` |
| `@ecopages/radiant-ui/themes/default-compact-soft`                                                                     | `@ecopages/radiant-ui/themes/default` followed by `@ecopages/radiant-ui/tokens/spacing/compact`                            |
| `@ecopages/radiant-ui/tokens/colors/aurora`, `tokens/colors/glacier`, `tokens/colors/basalt`, `tokens/colors/palettes` | `@ecopages/radiant-ui/tokens/colors/rui-default`, or a complete theme from `@ecopages/radiant-themes`                      |

`./themes/default` kept its path but is now the Radiant Default theme; in `0.1.0` it aliased Glacier, so its colors change. The Aurora, Glacier and Basalt palettes have no direct replacement; set the seed variables to approximate them. For a compact optional theme, import its compact entry, such as `@ecopages/radiant-themes/github/compact`. `./tokens/foundation` holds the shared foundation tokens, and the new presets ship from `@ecopages/radiant-themes`.
