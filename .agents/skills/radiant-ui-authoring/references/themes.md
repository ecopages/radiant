# Themes and `@ecopages/radiant-themes`

Read this when a change touches component CSS, tokens, or anything a theme can restyle. Contract and token tiers: [`DESIGN.md`](../../../../packages/radiant-ui/DESIGN.md). Consumer-facing usage: [`packages/radiant-themes/README.md`](../../../../packages/radiant-themes/README.md).

## Two packages

| Package                    | Ships                                                                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@ecopages/radiant-ui`     | Components, foundation tokens, and exactly one theme: `themes/default` (Radiant Default).                                                                        |
| `@ecopages/radiant-themes` | Optional complete themes (GitHub, Cloudflare, VS Code, Vercel, Material Design, High Contrast, Windows 95, Mac OS Classic, macOS) and a compact variant of each. |

Both are versioned together (`fixed` in `.changeset/config.json`). A theme entry is `@ecopages/radiant-themes/<theme>` or `/<theme>/compact`. Non-Tailwind apps use `compiled/<theme>.css`.

## How a theme restyles a component

A theme source (`packages/radiant-themes/src/themes/<theme>.css`) imports four layers: `foundation.css`, `tokens/colors/<theme>.css`, `tokens/roles/<theme>.css`, and `tokens/components/<theme>.css`.

- **Roles** map semantic roles (`--primary`, `--surface`, ...) to the palette.
- **Component tokens** override catalog classes directly, for example `:root .rui-treegrid__cell { @apply border-0 ... }`. They match on the same `.rui-*` class names, borders, padding and structure as `<name>.css`.

That makes a component's classes and base borders a contract with every theme. After you change a `.rui-*` selector, a border, padding, or a rule a theme may repeat:

1. `grep -rn "rui-<component>" packages/radiant-themes/src/tokens/components`.
2. Fix each theme that repeats or fights the change. A base rule a theme re-declares is not removed by editing the base alone. Example: the treegrid drew a bottom border on every row in the base and again in GitHub and macOS, so only the themes that overrode it to `border-0` looked like trees.
3. Look at the result in every theme, light and dark. Passing tests do not show this class of bug.

## Look at every theme

Build in order (a clean checkout needs the platform packages first), then screenshot:

```sh
pnpm --filter @ecopages/signals build:lib && pnpm --filter @ecopages/jsx build:lib && pnpm --filter @ecopages/radiant build:lib
pnpm --filter @ecopages/radiant-ui build:lib
pnpm --filter @ecopages/radiant-themes build:lib   # writes dist/compiled/themes/*.css
node --test packages/radiant-themes/scripts/package-exports.test.mjs
```

Pure-CSS components render without JavaScript. Load one page per theme with `dist/compiled/themes/<theme>.css` plus `packages/radiant-ui/dist/styles/styles.css`, set `data-rui-theme="<theme>"` and optionally `class="dark"` on `<html>`, and screenshot the component with Playwright. Radiant Default has no compiled file: inline `packages/radiant-ui/dist/styles/themes/default.css` through Tailwind first. Compare against a theme that already looks right.

## Radiant Default derived theming

Radiant Default derives its colors and geometry from a few variables. Set them in a stylesheet loaded after `themes/default`; a `:root` override is enough.

| Variable                         | Effect                                                                                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--rui-primary`, `--rui-neutral` | OKLCH seeds, e.g. `oklch(52% 0.19 264)`. Each generates a 50-975 scale with relative color syntax: lightness is fixed per step, chroma scales per step, hue comes from the seed. |
| `--rui-secondary`                | Defaults to the primary seed rotated 40 degrees. Set it to any color to override.                                                                                                |
| `--rui-density`                  | Multiplies the spacing scale (the tuner offers 0.85-1.15).                                                                                                                       |
| `--rui-radius-scale`             | Multiplies the radius scale (0.75-1.25).                                                                                                                                         |
| `--rui-border-alpha`             | Semantic border strength, 8-100%. `prefers-contrast: more` pins it to 100%, and that preference wins over a theme or app value.                                                  |

Tricks and limits:

- **Change hue, not individual steps.** The lightness and chroma pattern is shared, so every role moves together. Override a semantic role (`--primary`, `--on-surface`) only for a one-off; never a palette step.
- **Keep seeds away from the status hues.** Error, warning and success use fixed red, amber and green seeds, so a primary near those hues reads as a status. The info role follows primary.
- **Recheck contrast.** Text and focus pairs keep their tested defaults, but they were tested against the default seeds.
- **Compact Radiant Default:** import `@ecopages/radiant-ui/tokens/spacing/compact` after `themes/default`, or lower `--rui-density`.
- **These knobs belong to Radiant Default.** Each optional theme sets its own values, so do not document them as working in other themes.
- **Fonts:** themes define font stacks but ship no font files; apps override `--font-sans`, `--font-heading` and `--font-mono` after the theme import.
- The docs theming page has a live tuner that outputs the six inputs as copyable CSS.
