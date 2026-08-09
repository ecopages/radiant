# AGENTS.md — @ecopages/radiant-ui

Guidance for humans and agents working in `packages/radiant-ui`.

## Package

- **npm:** `@ecopages/radiant-ui`
- **Elements:** `rui-*` custom elements (light DOM)
- **Styling:** Tailwind CSS v4 authoring (`@reference` + `@apply`); `build:lib` compiles component CSS to plain CSS while preserving theme and token sources in `dist/` for consuming Tailwind builds.
- **Authoring:** Not React; see `src/Introduction.mdx` for component tiers and file layout
- **Tokens, themes, component CSS:** see [`DESIGN.md`](./DESIGN.md)

## Imports

- Cross-cutting helpers under `src/lib/` → `@/lib/...` (configured in `tsconfig.app.json`, Vite, Storybook, and `scripts/build.ts`).
- Shared types from `src/types.ts` → `@/types`.
- Same-component and sibling UI imports → `./` and `../` only.

## View host props

Views that render a DOM host should type props as `JsxHtmlProps<ComponentProps>` or `JsxHtmlPropsWithChildren<ComponentProps>` when children are accepted. Add `slot` on `ComponentProps` only when needed.

Default pattern — spread host props, keep `children` explicit:

```tsx
({ children, ...props }: JsxHtmlPropsWithChildren<RuiFooProps & { slot?: string }>) => (
	<rui-foo {...props}>{children}</rui-foo>
);
```

Self-closing hosts can spread the full props object (`<rui-meter {...props} />`); the JSX runtime peels `children` before binding attributes.

Peel props only when the view must transform or filter them:

- View-only data (`options`, `articles`, …) that must not reach the host
- `prop:` / `attr:` bindings or renamed props (`triggerLabel` → `prop:buttonLabel`, `values` → `rangeMin` / `rangeMax`). Peel every CE prop that needs an explicit `prop:` / `attr:` prefix; spread the rest.
- `class` composition with `cx()` on the same node — spread first, then `class={cx('rui-foo', className)}`. Import `cx` from `@ecopages/radiant-ui/cx` in apps; use `@/lib/cx` inside this package.
- Host vs inner-node split when the view owns the composed surface (e.g. `RuiAlert` puts `role="alert"` and BEM classes on an inner div; the CE handles dismiss)

## Adding a component

Follow `src/Introduction.mdx` (script, view, css, stories, index). Styles consume theme roles; JS API unchanged unless APG requires it.

## Documenting the public API (TSDoc)

Mirror [Custom Elements Manifest](https://custom-elements-manifest.open-wc.org/analyzer/getting-started/) tags so hover tips and docs stay in sync:

- **Script (CE):** `@element`, `@attr` / `@attribute`, `@slot`, `@fires` / `@event`, `@cssprop`, `@csspart`, `@see` (APG)
- **View (JSX):** `@cssclass` for light-DOM BEM classes — document on the export that authors the class (composable helpers and the view surface). Prefer this over listing composition classes on the CE.
- `@cssclass` is an extension for light-DOM surfaces (not a standard CEM tag like `@csspart` / `@cssprop`)

Docs pages should surface the same contract (attributes, slots, events, CSS classes) and mark APG links with `data-wai-aria` so prose styles show the APG badge. See `alert` as the POC.
