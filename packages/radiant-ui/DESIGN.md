# DESIGN.md — @ecopages/radiant-ui

Design-system contract: tokens, themes, and component styling for `packages/radiant-ui`.

## CSS architecture (two layers)

1. **Theme** — CSS variables (packs + semantic roles). Loaded by the app or Storybook, not by individual component stylesheets.
2. **Components** — BEM-style `.rui-*` classes that consume theme roles, plus a small public `--rui-*` override set per component.

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

Named hue scales ship steps **50–975** (12 stops). `--color-black` and `--color-white` live in `system.css` (absolute anchors, not a hue pack). The semantic gray utility scale stays **50–950** (Tailwind-shaped); presets remap it onto a pack neutral.

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

Shared structural tokens: absolute colours (`--color-black`, `--color-white`), border widths, focus ring geometry, opacity roles, z-index stack, control/icon sizes, and range-track fill (`--rui-track-mix`, `--rui-track-fill`). Imported by every theme; not a swappable mood pack in v1. `--size-control-sm/md/lg` alias `--space-8/10/12` (with rem fallbacks) so compact and wide change control height along with padding. `--size-icon-*` stay fixed. Set `--rui-track-color` on an ancestor to replace `--rui-track-fill` for slider and knob together.

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

**Storybook and docs preview:** colour, spacing, and radius come from the same pack stylesheets applications import. Storybook injects the selected spacing/radius pack into the preview document; the docs app does the same for its live preview. `data-rui-*` attributes are preview markers only (colour switching plus MutationObserver hooks). They are not an application API.

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
4. One CSS file per component directory. Do **not** `import './<name>.css'` in view `.tsx` files — that breaks Ecopages vendor prebundles. Apps load the aggregate `@ecopages/radiant-ui/styles.css` (or a theme + styles). In Storybook, declare component CSS via `parameters: { radiant: { cssImports: ['./<name>.css'] } }` in `*.stories.tsx` (with `const meta = { ... } satisfies Meta<typeof RuiX>; export default meta`); the stamp transform injects side-effect imports. For skins and other story-scoped extras, apply the `withStylesheets([...])` decorator to the story that needs them.

5. Story-support helpers (decorators, story-only components) live in `.storybook/`, never in `src/`. `src/lib` is on the published build's include list, and these files import Storybook types from a private devDependency — shipping them would emit `dist` declarations consumers cannot resolve. Import them via the `@sb/*` alias (`@sb/with-dialog`), not a relative climb out of `src`.
6. Story-support decorators take their options as arguments — write a decorator factory (`withStylesheets([css])`) or split behaviours into separate decorators (`withDialogRegistry` on `meta`, `withDialogTrigger` per story). A decorator that takes no options is a plain constant, not a zero-argument factory. Never add a `parameters` key for a decorator to read back: `parameters.radiant` is the framework's contract and rejects it, and a boolean flag anywhere else is a sign two decorators are fused into one.

### Forbidden

- Importing theme CSS inside component CSS.
- Hardcoded themed geometry (`rounded-md`, `px-4`, `py-2`, `gap-2`) on controls and containers.
- Private one-off CSS variables that copy a theme role with no public override story.
- Targeting palette tokens from component CSS.
- Declaring a public `--rui-*` default on a BEM descendant (that resets inheritance from the host / surface root).

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

Use `@apply` with theme-mapped utilities when they exist (`rounded-control`, `bg-primary`, …) for **structure**. Themable values that are public knobs use `var(--rui-…)` instead of `@apply bg-primary`.

## Component custom properties

A component may expose a **small** `--rui-<name>-*` set so consumers restyle an instance in CSS without a JS theme object. Defaults live in the stylesheet; omitted overrides keep the catalog look.

### Where to declare defaults

Declare public defaults on the **subtree root that owns the chrome**, never on an inner grain:

| Tree | Default on | Override on |
| --- | --- | --- |
| Chrome stays inside the host (`rui-switch`, `rui-dialog`, `rui-slider`) | the custom-element tag | that tag (or a more specific host selector) |
| Portaled surface (`rui-popover`, hover-card panel) | the portaled surface class (`.rui-popover`, `.rui-hover-card__content`) | that surface class |
| Presentational helper with no CE (`RuiAvatar`) | the root BEM class (`.rui-avatar`) | that class |

Size variants should **set** the same variable on that root (`--rui-avatar-size`), not restyle width/height directly.

Do not declare the same public property on a descendant: that assignment wins over an inherited host override.

`:root` remaps of `--rui-*` knobs do **not** win when the host/surface also assigns the property. Tell consumers to override on the host or surface. Global mood still goes through theme roles (`--primary`, `--space-inset`).

### What to expose

Typical public set is **5–12** knobs: surface, border, radius, padding or gap, and one or two widget sizes. Alias theme roles; do not invent a parallel palette.

```css
rui-dialog {
	--rui-dialog-max-width: 28rem;
	--rui-dialog-padding: var(--space-inset);
	--rui-dialog-radius: var(--radius-container);
	--rui-dialog-surface: var(--background);
	--rui-dialog-shadow: var(--shadow-modal);
}
```

Do **not** add knobs for every descendant property, for focus rings (use `--focus-ring`), or for disabled opacity (use `--opacity-disabled`). Native controls (button, input, badge) should keep consuming semantic roles; do not explode per-state color variables.

Shared family tokens (`--rui-track-color`, `--rui-menu-item-hover`) live once and are inherited. Prefix everything `--rui-`. Unprefixed names (`--width`, `--y`) are not allowed.

### Public vs runtime

| Kind | Document | Example |
| --- | --- | --- |
| Public theming | `@cssprop` on the CE + MDX Theming | `--rui-slider-thumb-size` |
| Host-written state | Light-DOM contract “host writes”, not `@cssprop` | `--rui-slider-fill-size`, `--rui-toast-y` |
| Family | `DESIGN.md` + each consumer `@cssprop` | `--rui-track-color` |

JS may write a public knob when a **prop** owns that value (`gap` on `rui-toaster`). Document that the attribute wins over CSS. Do not write a constant from JS onto a public knob if CSS should remain the override path.

### Documenting

`@cssprop` lists only public theming knobs and their defaults. MDX Theming names the override target (host tag or surface class) and says theme-role remaps are for global mood.

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
- [`AGENTS.md`](./AGENTS.md) — agent working rules
- [`src/components/ui/README.md`](./src/components/ui/README.md) — component authoring architecture
