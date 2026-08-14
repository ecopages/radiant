# AGENTS.md — @ecopages/radiant-ui

Guidance for humans and agents working in `packages/radiant-ui`.

## Package

- **npm:** `@ecopages/radiant-ui`
- **Elements:** `rui-*` custom elements (light DOM)
- **Styling:** Tailwind CSS v4 authoring (`@reference` + `@apply`); `build:lib` compiles component CSS to plain CSS while preserving theme and token sources in `dist/` for consuming Tailwind builds.
- **Authoring:** Not React; see `src/Introduction.mdx` for component tiers and file layout
- **Tokens, themes, component CSS:** see [`DESIGN.md`](./DESIGN.md)

## Start here

- Read `src/Introduction.mdx` only when adding, moving, or re-tiering a component.
- Read [`DESIGN.md`](./DESIGN.md) only when changing tokens, themes, or component CSS.
- Read the sections below that match the files being edited: views, public API docs, or package conventions.

## Component composition

- Non-atomic components should separate behavior from markup: the custom element owns state, accessibility, and coordination; JSX helpers expose the meaningful structural parts.
- Keep a convenient prop-based default composition on the primary view, but accept children for the equivalent explicit composition. Do not force consumers to subclass a custom element just to arrange its UI.
- For keyboard movement within an already-rendered composite surface, update focus and roving attributes imperatively. Re-render only when visible structure or semantic state changes.

## Imports

- Cross-cutting helpers under `src/lib/` → `@/lib/...` (configured in `tsconfig.app.json`, Vite, Storybook, and `scripts/build.ts`).
- Shared types from `src/types.ts` → `@/types`.
- Same-component and sibling UI imports → `./` and `../` only.

## View host props

Views should declare the public DOM surface they render. Custom-element views use
`JsxCustomElementAttributes<ElementClass, ComponentProps>`; native helpers use
`JsxElementProps<ExactElement>` plus the unprefixed native fields they render.

Default pattern — peel view-only fields, spread the rest, lock invariants after
the spread:

```tsx
({ children, ...props }: JsxCustomElementAttributes<RuiFooElement, RuiFooProps>) => (
	<rui-foo {...props}>{children}</rui-foo>
);
```

Self-closing hosts can spread the full props object (`<rui-meter {...props} />`); the JSX runtime peels `children` before binding attributes.

Peel props only when the view must transform or filter them:

- View-only data (`options`, `articles`, …) that must not reach the host
- `prop:` / `attr:` bindings or renamed props (`triggerLabel` → `prop:buttonLabel`, `values` → `rangeMin` / `rangeMax`). Peel every CE prop that needs an explicit `prop:` / `attr:` prefix; spread the rest.
- `class` composition with `cx()` on the same node — spread first, then `class={cx('rui-foo', className)}`. Import `cx` from `@ecopages/radiant-ui/cx` in apps; use `@/lib/cx` inside this package.
- Host vs inner-node split when the view owns the composed surface (e.g. `RuiAlert` puts `role="alert"` and BEM classes on an inner div; the CE handles dismiss)

`aria={{ ... }}` and direct canonical `aria-*` attributes can both be used; a
direct attribute wins. The same precedence applies to `data={{ ... }}` and
`data-*`. Direct `null` is a supplied value and wins over structured values and
defaults. After the spread, only write a host attribute when the value is
defined, or when the attribute is a locked invariant (`type="button"`,
`role="tablist"`, `hidden` on a popup).

For a default accessible name, keep direct `aria-label` in the forwarded props
and pass the peeled structured object through the public JSX helper:

```tsx
import { withDefaultAriaLabel } from '@ecopages/radiant-ui/aria';

function RuiFoo({ aria, ...props }: RuiFooProps) {
	return <button {...props} aria={withDefaultAriaLabel(aria, 'Open')} type="button" />;
}
```

Do not resolve the direct and structured channels in the component. JSX
normalization makes direct `aria-label` canonical. The helper fills only a
missing structured `aria.label` and preserves fields such as `aria.labelledby`.
Keep managed ARIA state explicit; do not pass it through a generic defaults
merger.

Collection item `id` is a semantic key: type it as
`Omit<JsxElementProps<ExactElement>, 'id'> & { id: string }` and map it to
`data-*` / generated linkage — never as a literal DOM `id`.

## Adding a component

Follow `src/Introduction.mdx` (script, view, css, stories, index). Styles consume theme roles; JS API unchanged unless APG requires it.

## Documenting the public API (TSDoc)

Mirror [Custom Elements Manifest](https://custom-elements-manifest.open-wc.org/analyzer/getting-started/) tags so hover tips and docs stay in sync:

- **Script (CE):** `@element`, `@attr` / `@attribute`, `@slot`, `@fires` / `@event`, `@cssprop`, `@csspart`, `@see` (APG)
- **View (JSX):** `@cssclass` for light-DOM BEM classes — document on the export that authors the class (composable helpers and the view surface). Prefer this over listing composition classes on the CE.
- `@cssclass` is an extension for light-DOM surfaces (not a standard CEM tag like `@csspart` / `@cssprop`)

Docs pages should surface the same contract (attributes, slots, events, CSS classes) and mark APG links with `data-wai-aria` so prose styles show the APG badge. See `alert` as the POC.
