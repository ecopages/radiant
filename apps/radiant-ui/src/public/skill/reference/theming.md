# Theming

Radiant UI ships one accessible default theme, Radiant Default. Components consume semantic roles (`--primary`,
`--surface`, `--radius-control`, …), not palette values.

```css
@import '@ecopages/radiant-ui/themes/default';
@import '@ecopages/radiant-ui/styles.css';
```

## Radiant Themes

Optional complete themes are published from `@ecopages/radiant-themes`, a separate package that needs
`@ecopages/radiant-ui` 0.3.0 or later: GitHub, Cloudflare, VS Code, Vercel, Material Design, High Contrast, Windows 95,
Mac OS Classic, and macOS. Each owns its shape, spacing, typography, semantic colors, and component styling. Import one
theme in place of `themes/default`, never both.

```bash
pnpm add @ecopages/radiant-ui @ecopages/radiant-themes
```

```css
@import '@ecopages/radiant-themes/github';
@import '@ecopages/radiant-ui/styles.css';
```

Named variants such as `@ecopages/radiant-themes/github/compact` use the same internal composition with compact
spacing; the public API remains a complete theme import.

Themes define `--font-sans`, `--font-heading`, and `--font-mono` stacks but bundle no font files. To use a licensed
font, load it in the app and override those variables after the theme import.

## Dark mode

Every theme, Radiant Default included, switches to dark when an ancestor has the `dark` class (usually
`<html class="dark">`). It does not follow `prefers-color-scheme` by itself: set or remove the class from the user's
preference in the app. A `.dark` section inside a light page restyles the components inside it. To retheme, override
the roles (`--primary`, `--surface`), not the `--color-*` aliases.

## Radiant Default tuning

The default's neutral, primary, and secondary scales derive from the OKLCH seeds `--rui-neutral`, `--rui-primary`, and
`--rui-secondary`; secondary defaults to primary's hue plus 40 degrees. Error, warning, and success scales use fixed
red, amber, and green seeds; info follows primary through the semantic role map. `--rui-density`, `--rui-radius-scale`, and `--rui-border-alpha` tune its
geometry and border strength. Interactive controls share the `--border` role. The foundation also
honors reduced motion, increased contrast, keyboard focus, and Windows forced-colors preferences. Dark mode remaps
colors; geometry and other foundational tokens remain mode-independent unless a theme documents otherwise.

## Token packs

`themes/default` already loads the Radiant Default packs. To change one dimension, import a pack after the theme:

```css
@import '@ecopages/radiant-ui/themes/default';
@import '@ecopages/radiant-ui/tokens/spacing/compact';
@import '@ecopages/radiant-ui/styles.css';
```

| Dimension  | Packs                                            |
| ---------- | ------------------------------------------------ |
| Spacing    | `tokens/spacing/compact`, `default`, `wide`      |
| Radius     | `tokens/radius/sharp`, `edgy`, `default`, `soft` |
| Elevation  | `tokens/elevation/default`, `flat` (no shadows)  |
| Motion     | `tokens/motion/default`, `snappy`                |
| Typography | `tokens/typography/default`                      |

Packs tune Radiant Default. An optional theme owns its shape and spacing: use its named variant (`@ecopages/radiant-themes/github/compact`) instead of layering a pack on it. Components read semantic roles (`--primary`, `--space-control-x`, `--radius-control`); never target palette steps from component CSS. A `--space-*` step follows the selected density, so it is safe to use.

## Stylesheets

Import `styles.css` once: it imports every component and primitive stylesheet exactly once. To ship only some components' CSS, read each component's `styles` list in `@ecopages/radiant-ui/style-dependencies` (JSON) and import those stylesheets in that order: the list includes the shared stylesheets the component's default composition needs. Published CSS is already compiled; theme values stay CSS custom properties, so themes can swap at runtime.
