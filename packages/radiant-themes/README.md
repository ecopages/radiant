# @ecopages/radiant-themes

Optional composable themes and variants for [`@ecopages/radiant-ui`](../radiant-ui/README.md). Radiant UI owns one default theme; this package owns the additional catalog.

Install both packages when using an optional theme:

```bash
pnpm add @ecopages/radiant-ui @ecopages/radiant-themes
```

## Tailwind CSS applications

Import one complete theme and the component styles:

```css
@import 'tailwindcss';
@import '@ecopages/radiant-themes/github';
@import '@ecopages/radiant-ui/styles.css';
```

Named variants compose the same color roles and shared token packs. For example, `github/compact` is the GitHub theme with Radiant UI's compact spacing pack:

```css
@import 'tailwindcss';
@import '@ecopages/radiant-themes/github/compact';
@import '@ecopages/radiant-ui/styles.css';
```

The catalog keeps each theme composable as a foundation, color scale, semantic role map, and optional axis. The same
GitHub Compact entry can be assembled from those layers:

```css
@import 'tailwindcss';
@import '@ecopages/radiant-themes/foundation';
@import '@ecopages/radiant-themes/tokens/colors/github';
@import '@ecopages/radiant-themes/tokens/roles/github';
@import '@ecopages/radiant-ui/tokens/spacing/compact';
@import '@ecopages/radiant-ui/styles.css';
```

Available themes are `github`, `vscode`, and `vercel`. Each follows the document's `.dark` class for its dark mode. Density and shape can also be layered directly from `@ecopages/radiant-ui/tokens/spacing/*` and `@ecopages/radiant-ui/tokens/radius/*`.

The Vercel entry adds component-state roles for default, hover, and active control surfaces and borders. Those roles
are exported from `@ecopages/radiant-themes/tokens/components/vercel` for components that need more than the shared
semantic contract. They follow Geist's layered [color](https://vercel.com/geist/colors) and
[material](https://vercel.com/geist/materials) guidance.

## Browser-ready CSS

For applications that consume compiled CSS rather than Tailwind theme sources, load Radiant UI's base bundle, then one compiled theme and the component styles:

```css
@import '@ecopages/radiant-ui/radiant-ui.css';
@import '@ecopages/radiant-themes/compiled/github.css';
@import '@ecopages/radiant-ui/styles.css';
```

Use `compiled/github/compact.css` for the compact variant. Matching compiled entries exist for every full theme. CSS custom properties can be overridden after the imports. The Basalt default exposes `--rui-primary`, `--rui-secondary`, `--rui-neutral`, `--rui-density`, `--rui-radius-scale`, and `--rui-border-alpha` as a small set of tuning inputs. Tune and verify contrast when supplying custom colors.

The inspiration for GitHub, VS Code, and Vercel is mapped into Radiant UI's semantic and component roles; this package does not reproduce their applications pixel for pixel.
