# DESIGN.md — @ecopages/radiant-ui

Design-system contract: tokens, themes, and component styling for `packages/radiant-ui`.

## CSS architecture (two layers)

1. **Theme** — CSS variables (packs + semantic roles). Loaded by the app or Storybook, not by individual component stylesheets.
2. **Components** — BEM-style `.rui-*` classes that consume theme roles only.

Component CSS must **not** `@import` a theme file.

## Token tiers

### Tier 1 — composable packs (`src/styles/tokens/`)

| Directory               | Purpose                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `colors/<name>.css`     | Raw scales on `:root` only (always emitted; no `@theme` utilities)       |
| `spacing/<name>.css`    | `--space-*` scale + spacing roles                                        |
| `radius/<name>.css`     | Radius scale + `--radius-control`, `--radius-container`, `--radius-pill` |
| `elevation/<name>.css`  | `--shadow-control`, `--shadow-overlay`, `--shadow-modal`                 |
| `typography/<name>.css` | Font family, text sizes, weights, leading roles                          |
| `motion/<name>.css`     | `--duration-*`, `--ease-*`                                               |

Components must **never** reference palette steps (e.g. `--color-havelock-blue-800`) directly.

**Color packs vs `@theme`:** Put palette scales on `:root`, not `@theme`. Tailwind v4 tree-shakes unused `@theme` vars; brand presets only reference palettes via nested `var(--color-*)`, which does not keep them alive. Spacing already follows this split (`:root` values + `@theme` bridge).

**Exports:** Token/theme sources in `dist/` stay authoring CSS for Tailwind apps (semantic `@theme` remains tree-shakable). Compiled entries (`radiant-ui.css`, `styles.css`) bake in `:root` palettes for drop-in consumers.

### Tier 2 — semantic (`tokens/semantic.css`)

- Brand presets assign plain roles (`--primary`, …) on `html[data-rui-colors]` / `.dark`.
- `@theme` block maps those roles to tree-shakable Tailwind color utilities (`bg-primary`, `text-on-surface`, …).
- There is no separate `semantic.dark.css`.

Dark remaps **colors only** (including `--color-overlay`). Spacing, radius, elevation, typography, and motion stay mode-independent unless a theme explicitly documents otherwise.

**Status / notification roles** (alerts, toasts, inline validation):

| Role          | Tailwind utilities                                                           | Use                                    |
| ------------- | ---------------------------------------------------------------------------- | -------------------------------------- |
| `info`        | `bg-info-container`, `text-on-info-container`, `border-info/30`, `text-info` | Neutral guidance, informational alerts |
| `success`     | `bg-success-container`, `text-on-success-container`, `text-success`          | Completed operations                   |
| `warning`     | `bg-warning-container`, `text-on-warning-container`, `text-warning`          | Recoverable risk                       |
| `error`       | `bg-error-container`, `text-on-error-container`, `text-error`                | Blocking problems                      |
| `destructive` | `bg-destructive`, `text-on-destructive` (aliases `error`)                    | Destructive actions (buttons)          |

Each family follows the same shape as `primary` / `error`: `--<role>`, `--on-<role>`, `--<role>-container`, `--on-<role>-container`, `--<role>-light`, `--<role>-dark`. Component CSS must use these roles — never palette steps (`blue-500`, `emerald-100`, …) or raw Tailwind color scales.

Filled status surfaces (alerts) use `*-container` backgrounds. Lightweight notifications (toasts) typically keep `bg-surface` with a semantic border and accent text.

### Tier 3 — system (`tokens/system.css`)

Shared structural tokens: border widths, focus ring geometry, opacity roles, z-index stack, control/icon sizes. Imported by every theme; not swappable mood packs in v1.

## Themes

A theme is an import graph only, e.g. [`src/styles/themes/default.css`](src/styles/themes/default.css):

```css
@import '../tokens/colors/palettes.css';
@import '../tokens/spacing/default.css';
@import '../tokens/radius/default.css';
@import '../tokens/elevation/default.css';
@import '../tokens/typography/default.css';
@import '../tokens/motion/default.css';
@import '../tokens/system.css';
@import '../tokens/semantic.css';
```

**Naming:** Short names highlight swapped axes (`aurora-compact-soft`). Omitted axes use the **`default`** pack.

**Storybook:** orthogonal toolbar globals — `data-rui-colors`, `data-rui-spacing`, `data-rui-radius`, plus `.dark` for mode. Presets live under `tokens/presets/` (colors via `semantic.css`, spacing/radius via `tailwind.css`).

**Brands (`data-rui-colors`):** `glacier` (docs), `aurora`, `basalt`, `ember`. **Spacing:** `default` · `compact` · `wide`. **Radius:** `default` · `soft` · **sharp** (square; `radius/sharp.css`).

## Component stylesheet rules

1. `@reference` the theme entry or `radiant-ui.css` (for Storybook), not individual palette files.
2. Use semantic utilities / variables for anything that should respond to theme packs:
    - Geometry: spacing roles, radius roles (not `p-4`, `gap-2`, `rounded-md` for themed controls).
    - Color: semantic colors (not palette steps).
    - Depth: `--shadow-*` roles (not raw `shadow-md`).
    - Type: `--text-*` / typography utilities (not ad-hoc `text-sm` where a role exists).
    - Motion: `--duration-*` / `--ease-*` (not raw `duration-150`).
    - State: `--opacity-disabled`, z-index roles from `system.css`.
3. Structural layout (flex, grid, `min-w-0`, positioning) may use Tailwind as needed.
4. One CSS file per component directory. Do **not** `import './<name>.css'` in view `.tsx` files — that breaks Ecopages vendor prebundles. Apps load the aggregate `@ecopages/radiant-ui/styles.css` (or a theme + styles). In Storybook, declare component CSS via `parameters: { radiant: { cssImports: ['./<name>.css'] } }` in `*.stories.tsx` (with `const meta = { ... } satisfies Meta<typeof RuiX>; export default meta`); the stamp transform injects side-effect imports. Use the `withStylesheets` decorator only for skins / extras.

### Forbidden

- Importing theme CSS inside component CSS.
- Hardcoded themed geometry (`rounded-md`, `px-4`, `py-2`, `gap-2`) on controls and containers.
- New one-off CSS variables that duplicate an existing role.
- Targeting palette tokens from component CSS.

### Preferred patterns

```css
@reference '../../../styles/radiant-ui.css';

@layer components {
	.rui-example {
		border-radius: var(--radius-control);
		padding-inline: var(--space-control-x);
		padding-block: var(--space-control-y);
		gap: var(--space-inline);
		box-shadow: var(--shadow-control);
		transition-duration: var(--duration-normal);
	}
}
```

Use `@apply` with theme-mapped utilities when they exist (`rounded-control`, `bg-primary`, …).

## Adding a token

1. Decide tier: pack (Tier 1), semantic role (Tier 2), or system (Tier 3).
2. Add or extend the pack file. Color scales → `:root`. Expose via `@theme` only when Tailwind utilities are required (spacing/radius bridges, semantic roles).
3. For new **color** roles: add preset remaps + the `@theme` bridge in `semantic.css`.
4. Document the role in this file if it is part of the public contract.

## Adding a theme

1. Create `src/styles/themes/<name>.css` that imports one pack per family (non-default packs as needed) + `system.css` + `semantic.css`.
2. Do not duplicate semantic or system logic in the theme file.
3. Add a package export in `package.json`.

## Storybook

- Global styles: `src/styles/tailwind.css` → `radiant-ui.css` → `themes/default.css`.
- Toggle dark mode by adding/removing `.dark` on a root element (future toolbar).

## Related docs

- [`README.md`](./README.md) — develop and build scripts
- [`AGENTS.md`](./AGENTS.md) — agent guidance for component authoring
