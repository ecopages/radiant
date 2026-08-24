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

### Light-DOM ownership

Parent JSX owns author content. Do not let a custom element `render()` project
that content through `<slot>` — it fights `moveRangeBefore` and causes range
drift when the parent re-renders.

- **View-owned shell:** JSX helpers (or named view props) place chrome and
  children. The CE has no `render()` slot tree. Query with `data-ref` /
  `data-*` / roles. Toggle volatile attrs with `toggleAttribute`.
- **Named holes:** still required. Implement them as composition helpers in the
  right DOM position (`RuiDialogTitle`, `RuiNumberFieldInput`, `primary` /
  `secondary` props) — not as `slot="…"` + CE `<slot name="…">`.
- **Default chrome when children are omitted:** the view supplies defaults (for
  example `RuiNumberField` renders input + steppers when `children` is empty).
- **Stylesheet ownership:** component stylesheets are atomic: never inline
  child or shared CSS. `style-dependencies.json` is generated from rendered
  default composition and lists the complete ordered stylesheet union for
  selective consumers. Applications should normally import `styles.css` once;
  it imports each atomic and primitive stylesheet exactly once.
- **CE-owned derived trees:** keep `render()` when inner DOM is generated from
  CE state and is not parent JSX ranges (toaster list, TOC heading list,
  calendar day grid).
- **Do not use HTML `<slot>` as the public JSX API.** Drop `slot=` on helpers
  and `@slot` TSDoc once view helpers own the layout.

### Two host shapes (bindings vs imperative paint)

`this.$` / `this.bindings` only patch JSX ranges the host's own `render()` or
`hydrate()` pass created. They do not reach parent-authored light DOM inside the
custom element. Pick one shape per component:

- **View-owned shell** (most composites): no `render()` override, no
  `RadiantElement<Bindings>` generic. The view places chrome; the CE queries
  `data-ref` and imperatively updates volatile text, ARIA, CSS variables, and
  `toggleAttribute` during interaction. Do not move this chrome into CE
  `render()` to "use bindings" — that either reintroduces `<slot>` projection
  (range drift) or drops composable children.
- **CE-owned tree** (meter, toaster, calendar, TOC): override `render()` for
  derived structure. Use plain reads (`this.variant`, `this.entries`) for
  branches, lists, and `class`; use `this.$` for stable leaf text and whole
  attribute values that should patch without a full host rerender. Do not add
  `@onUpdated` + `requestUpdate()` for fields already bound with `this.$` —
  tracked `render()` handles structural reads; bindings handle leaves.
- **Never** CE `render()` + `<slot>` for parent-owned chrome.

Omit the `Bindings` generic unless the script actually uses `this.$`,
`this.bindings`, or `this.bind(...)`.

### Connect-time sync

Do not write `connectedCallback` + `queueMicrotask(sync)` boilerplate. Override
`protected onConnected()` from `RadiantElement` instead: the core invokes it
after attribute catch-up, initial property sync, and (when applicable) the
initial hydrate/update — on every connection, not once per instance. Rebuild in
`onConnected()` whatever `disconnectedCallback` tears down (controllers,
observers, listeners); guard once-only bootstrapping explicitly.

Do not confuse this with `registerConnectedCallback()` on the reactive host:
those callbacks run synchronously at the start of `connectedCallback`, before
attribute catch-up. Post-sync work belongs on `onConnected()`.

Keep synchronous setup (event listeners, MutationObservers) in
`connectedCallback`, and keep behavioral deferrals (focus moves, dismiss
suppression) as explicit microtasks at their trigger sites.

When a view peels a prop to seed pre-hydration output (inner control state,
accessible names, shell classes), take a non-obvious default from a constant
exported by the script file (`CHECKBOX_DEFAULT_VALUE`, `CAROUSEL_DEFAULTS`,
`HOVER_CARD_DEFAULT_CONTENT_LABEL`) —
never re-declare the literal. Do not mirror trivial defaults
(`false`, `''`, `0`): an omitted attribute already hydrates to those.

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
`role="tablist"`).

### Popup visibility ownership

Popups inside parent-owned JSX trees must not bind `hidden` in the view when
open state is toggled imperatively by the custom element. Parent re-renders
would re-apply `hidden` and fight `moveRangeBefore`.

- **Reflected `open` on the host** (dialog, menu-button): the view seeds SSR
  visibility with `hidden={open ? undefined : true}`, and the controller also
  synchronizes the rendered surface with `toggleAttribute`. Imperative APIs
  and delegated triggers must not leave an initially hidden surface concealed.
- **Internal open state** (select, combobox, popover surfaces): the view omits
  `hidden`; the script sets initial closed state with
  `toggleAttribute('hidden', !open)` in `connectedCallback` / `setOpen`.
- **Shared helper:** `PopoverController` uses `toggleAttribute` for all
  portaled surfaces.

Presentation attributes owned by the view (`aria-label`, bordered chrome) should
not be duplicated in script `syncPresentation()` helpers.

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

- **Script (CE):** `@element`, `@attr` / `@attribute`, `@fires` / `@event`, `@cssprop`, `@csspart`, `@see` (APG). Use `@slot` only when HTML projection remains the public API; otherwise document composition helpers with `@cssclass` on the view.
- **View (JSX):** `@cssclass` for light-DOM BEM classes — document on the export that authors the class (composable helpers and the view surface). Prefer this over listing composition classes on the CE.
- `@cssclass` is an extension for light-DOM surfaces (not a standard CEM tag like `@csspart` / `@cssprop`)

Docs pages should surface the same contract (attributes, composition helpers, events, CSS classes) and mark APG links with `data-wai-aria` so prose styles show the APG badge. See `alert` as the POC.
