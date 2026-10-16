# Theming

Radiant UI ships one default theme: Basalt, using comfortable spacing and the soft radius scale. Components consume
semantic roles (`--primary`, `--surface`, `--radius-control`, …), not palette values.

```css
@import '@ecopages/radiant-ui/themes/default';
@import '@ecopages/radiant-ui/styles.css';
```

Optional themes are published from `@ecopages/radiant-themes`:

```css
@import '@ecopages/radiant-themes/github';
@import '@ecopages/radiant-ui/styles.css';
```

Named variants such as `@ecopages/radiant-themes/github/compact` compose the same theme and axis definitions. Apps
can also layer spacing and radius entries directly from `@ecopages/radiant-ui/tokens/spacing/*` and
`@ecopages/radiant-ui/tokens/radius/*`.

The default's neutral, primary, and secondary scales derive from the OKLCH seeds `--rui-neutral`, `--rui-primary`, and
`--rui-secondary`. Error and warning scales use fixed red and amber seeds; info follows primary, and success follows
secondary through the semantic role map. `--rui-density`, `--rui-radius-scale`, and `--rui-border-alpha` control default
geometry and border strength. Dark mode remaps colors; geometry and other foundational tokens remain mode-independent
unless a theme documents otherwise.
