# Component authoring

Architecture for `src/components/ui`. Agent rules: [`AGENTS.md`](../../AGENTS.md). Tokens and CSS: [`DESIGN.md`](../../DESIGN.md). Tiers and file layout: [`Introduction.mdx`](../../Introduction.mdx).

Platform vocabulary (Radiant, JSX, SSR) lives in root [`CONTEXT.md`](../../../../CONTEXT.md). Use the catalog terms below for this package; do not load CONTEXT.md for catalog-only edits.

## Catalog terms

**Authored Children** — consumer-provided child nodes at the host boundary. They stay in parent JSX.

**View-owned Shell** — JSX helpers (or named view props) place chrome and Authored Children. The custom element coordinates behavior and queries the existing tree. It does not own a `render()` slot tree for that chrome.

**Derived Tree** — inner DOM generated from custom-element state, not from parent JSX ranges (toaster list, TOC links, calendar day grid). This is the case that still uses host `render()`.

**Composition Helper** — a JSX export or named view prop that places a named region of a View-owned Shell (`RuiDialogTitle`, `RuiNumberFieldInput`, `primary`, `trigger`). Not an HTML slot.

**Binding** — `this.$` / `this.bindings` / `this.bind(...)`. Patches JSX ranges created by the host's own `render()` or `hydrate()` pass. Does not reach parent-authored light DOM.

## Composition

Non-atomic components separate behavior from markup: the custom element owns state, accessibility, and coordination; JSX helpers expose the structural parts.

Keep a convenient prop-based default composition on the primary view, but accept children for the equivalent explicit composition. Do not force consumers to subclass a custom element just to arrange its UI.

For keyboard movement within an already-rendered composite surface, update focus and roving attributes imperatively. Re-render only when visible structure or semantic state changes. Nested `role="menu"` trees (menu-button, menubar) share `MenuTreeController`: the ARIA relationship is an immediate menuitem/menu sibling pair in light DOM, and the controller owns submenu timers, keyboard, and unportaled `PopoverController` instances. Listbox-backed popovers (select, combobox) share `ListboxPopoverBehavior` for active-descendant navigation and `ListboxHostController` for the embedded listbox, the comma-separated value array, option `aria-selected`, and optional tag-group chips.

`RuiField` discovers one control: the outermost `[data-rui-control]` or known host tag. Nested hosts (an embedded `rui-listbox` inside `rui-select`) are not field controls.

## Light-DOM ownership

Parent JSX owns **Authored Children**. Do not let a custom element `render()` project that content through `<slot>` — it fights `moveRangeBefore` and causes range drift when the parent re-renders.

- **View-owned Shell:** JSX helpers (or named view props) place chrome and children. The CE has no `render()` slot tree. Query with `data-ref` / `data-*` / roles. **Never query BEM class names.** Toggle volatile attrs with `toggleAttribute`.
- **Composition Helper:** named regions in the right DOM position (`RuiDialogTitle`, `RuiNumberFieldInput`, `primary` / `secondary` props) — not `slot="…"` + CE `<slot name="…">`.
- **Default chrome when children are omitted:** the view supplies defaults (for example `RuiNumberField` renders input + steppers when `children` is empty).
- **Stylesheet ownership:** component stylesheets are atomic: never inline child or shared CSS. `style-dependencies.json` is generated from rendered default composition and lists the complete ordered stylesheet union for selective consumers. Applications should normally import `styles.css` once; it imports each atomic and primitive stylesheet exactly once.
- **Derived Tree:** keep `render()` when inner DOM is generated from CE state and is not parent JSX ranges (toaster list, TOC heading list, calendar day grid).
- Do not use HTML `<slot>` as the public JSX API. Drop `slot=` on helpers and `@slot` TSDoc once view helpers own the layout.

Core Radiant still has **Slot** as the architectural projection boundary for a render-owning host. Catalog composites do not expose HTML `<slot>` as the JSX API.

## Two host shapes (bindings vs imperative paint)

`this.$` / `this.bindings` only patch JSX ranges the host's own `render()` or `hydrate()` pass created. They do not reach parent-authored light DOM inside the custom element. Pick one shape per component:

- **View-owned Shell** (most composites): no `render()` override, no `RadiantElement<Bindings>` generic. The view places chrome; the CE queries `data-ref` / `data-*` / roles and imperatively updates volatile text, ARIA, CSS variables, and `toggleAttribute` during interaction. Do not query class names. Do not move this chrome into CE `render()` to "use bindings" — that either reintroduces `<slot>` projection (range drift) or drops composable children.
- **Derived Tree** (meter, toaster, calendar, TOC): override `render()` for derived structure. Use plain reads (`this.variant`, `this.entries`) for branches, lists, and `class`; use `this.$` for stable leaf text and whole attribute values that should patch without a full host rerender. Do not add `@onUpdated` + `requestUpdate()` for fields already bound with `this.$` — tracked `render()` handles structural reads; bindings handle leaves.
- Never CE `render()` + `<slot>` for parent-owned chrome.

Omit the `Bindings` generic unless the script actually uses `this.$`, `this.bindings`, or `this.bind(...)`.

## Connect-time sync

Do not write `connectedCallback` + `queueMicrotask(sync)` boilerplate. Override `protected onConnected()` from `RadiantElement` instead: the core invokes it after attribute catch-up, initial property sync, and (when applicable) the initial hydrate/update — on every connection, not once per instance. Rebuild in `onConnected()` whatever `disconnectedCallback` tears down (controllers, observers, listeners); guard once-only bootstrapping explicitly.

Do not confuse this with `registerConnectedCallback()` on the reactive host: those callbacks run synchronously at the start of `connectedCallback`, before attribute catch-up. Post-sync work belongs on `onConnected()`.

Keep synchronous setup (event listeners, MutationObservers) in `connectedCallback`, and keep behavioral deferrals (focus moves, dismiss suppression) as explicit microtasks at their trigger sites.

When a view peels a prop to seed pre-hydration output (inner control state, accessible names, shell classes), take a non-obvious default from a constant exported by the script file (`CHECKBOX_DEFAULT_VALUE`, `CAROUSEL_DEFAULTS`, `HOVER_CARD_DEFAULT_CONTENT_LABEL`) — never re-declare the literal. Do not mirror trivial defaults (`false`, `''`, `0`): an omitted attribute already hydrates to those.

## View host props

Views should declare the public DOM surface they render. Custom-element views use `JsxCustomElementAttributes<ElementClass, ComponentProps>`; native helpers use `JsxElementProps<ExactElement>` plus the unprefixed native fields they render.

Default pattern — peel view-only fields, spread the rest, lock invariants after the spread:

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

`aria={{ ... }}` and direct canonical `aria-*` attributes can both be used; a direct attribute wins. The same precedence applies to `data={{ ... }}` and `data-*`. Direct `null` is a supplied value and wins over structured values and defaults. After the spread, only write a host attribute when the value is defined, or when the attribute is a locked invariant (`type="button"`, `role="tablist"`).

## Popup visibility ownership

Popups inside parent-owned JSX trees must not bind `hidden` in the view when open state is toggled imperatively by the custom element. Parent re-renders would re-apply `hidden` and fight `moveRangeBefore`.

- **Reflected `open` on the host** (dialog, menu-button): the view seeds SSR visibility with `hidden={open ? undefined : true}`, and the controller also synchronizes the rendered surface with `toggleAttribute`. Imperative APIs and delegated triggers must not leave an initially hidden surface concealed.
- **Internal open state** (select, combobox, popover surfaces): the view omits `hidden`; the script sets initial closed state with `toggleAttribute('hidden', !open)` in `connectedCallback` / `setOpen`.
- **Shared helper:** `PopoverController` uses `toggleAttribute` for all portaled surfaces.

Presentation attributes owned by the view (`aria-label`, bordered chrome) should not be duplicated in script `syncPresentation()` helpers.

For a default accessible name, keep direct `aria-label` in the forwarded props and pass the peeled structured object through the public JSX helper:

```tsx
import { withDefaultAriaLabel } from '@ecopages/radiant-ui/aria';

function RuiFoo({ aria, ...props }: RuiFooProps) {
	return <button {...props} aria={withDefaultAriaLabel(aria, 'Open')} type="button" />;
}
```

Do not resolve the direct and structured channels in the component. JSX normalization makes direct `aria-label` canonical. The helper fills only a missing structured `aria.label` and preserves fields such as `aria.labelledby`. Keep managed ARIA state explicit; do not pass it through a generic defaults merger.

Collection item `id` is a semantic key: type it as `Omit<JsxElementProps<ExactElement>, 'id'> & { id: string }` and map it to `data-*` / generated linkage — never as a literal DOM `id`.

## Public API docs

Mirror [CEM](https://custom-elements-manifest.open-wc.org/analyzer/getting-started/) tags so hover text and docs stay aligned:

- **Script (CE):** `@element`, `@attr` / `@attribute`, `@fires` / `@event`, `@cssprop`, `@see` (APG). Use `@slot` only when HTML projection remains the public API.
- **View (JSX):** `@cssclass` on the export that authors the BEM class (Composition Helpers and the view surface). Prefer this over listing composition classes on the CE.
- Do not add `@csspart`. This catalog is light DOM; there are no shadow parts.
- `@cssclass` is a catalog extension, not a standard CEM tag like `@csspart` / `@cssprop`.

A View-owned Shell is a **behavior host**: it queries Authored Children through `data-ref` / `data-*` / roles — never BEM class names. That query contract is public. The CE class TSDoc must describe the full child tree (required targets, per-item attrs, optional controls, attributes the host writes vs the author owns). Composition Helpers stamp the same targets; they are not a substitute for documenting them. Do not use `@slot` for this tree. Selector dialect: [`.agents/skills/radiant-ui-docs/references/query-targets.md`](../../../../.agents/skills/radiant-ui-docs/references/query-targets.md).

Templates and a filled Tag Group example: [`.agents/skills/radiant-ui-docs/`](../../../../.agents/skills/radiant-ui-docs/SKILL.md). Implementation playbook: [`.agents/skills/radiant-ui-authoring/`](../../../../.agents/skills/radiant-ui-authoring/SKILL.md).

Consumer docs live in `apps/radiant-ui` (`src/content/components/`). Surface the same contract (attributes, light-DOM targets, Composition Helpers, events, CSS classes) and mark APG links with `data-wai-aria`. Tag Group is the composition-contract POC; Alert remains the page-structure POC.
