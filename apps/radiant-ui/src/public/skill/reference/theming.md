# Theming

Radiant UI ships one accessible default theme, Radiant Default. Components consume semantic roles (`--primary`,
`--surface`, `--radius-control`, …), not palette values.

```css
@import '@ecopages/radiant-ui/themes/default';
@import '@ecopages/radiant-ui/styles.css';
```

Optional complete themes are published from `@ecopages/radiant-themes`: GitHub, VS Code, Vercel, Material Design, High
Contrast, Windows 95, Mac OS Classic, and macOS. Each owns its shape, spacing, typography, and component styling.

```css
@import '@ecopages/radiant-themes/github';
@import '@ecopages/radiant-ui/styles.css';
```

Named variants such as `@ecopages/radiant-themes/github/compact` use the same internal composition with compact
spacing; the public API remains a complete theme import.

The default's neutral, primary, and secondary scales derive from the OKLCH seeds `--rui-neutral`, `--rui-primary`, and
`--rui-secondary`. Error and warning scales use fixed red and amber seeds; info follows primary, and success follows
secondary through the semantic role map. `--rui-density`, `--rui-radius-scale`, and `--rui-border-alpha` tune its
geometry and border strength. Interactive controls share the `--border` role. The foundation also
honors reduced motion, increased contrast, keyboard focus, and Windows forced-colors preferences. Dark mode remaps
colors; geometry and other foundational tokens remain mode-independent unless a theme documents otherwise.
