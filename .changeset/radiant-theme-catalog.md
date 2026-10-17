---
'@ecopages/radiant-ui': patch
'@ecopages/radiant-themes': patch
---

Refine the theme catalog released in 0.2.0.

- Composite fields draw one frame in every theme, including the classic-theme field treatments, and the standalone `rui-date-input` surface follows the same rule.
- Treegrids read as trees in every theme: no divider under each row, only the header rule. VS Code, GitHub, macOS, Mac OS Classic and Windows 95 add per-level indentation and their native disclosure affordances.
- Cloudflare's primary orange is `#cc3a00` in light and dark mode (5:1 against white) instead of switching to the brighter orange in dark mode.
- Polish theme catalog controls across the optional themes.
