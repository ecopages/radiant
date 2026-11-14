# Component authoring

Architecture for `src/components/ui`. Agent rules: [`AGENTS.md`](../../../AGENTS.md). Tokens and CSS: [`DESIGN.md`](../../../DESIGN.md). Tiers and file layout: [`Introduction.mdx`](../../Introduction.mdx).

Platform vocabulary (Radiant, JSX, SSR) lives in root [`CONTEXT.md`](../../../../../CONTEXT.md). Use the catalog terms below for this package; do not load CONTEXT.md for catalog-only edits.

## Catalog terms

**Authored Children** — consumer-provided child nodes at the host boundary. They stay in parent JSX.

**View-owned Shell** — JSX helpers (or named view props) place chrome and Authored Children. The custom element coordinates behavior and queries the existing tree. It does not own a `render()` slot tree for that chrome.

**Derived Tree** — inner DOM generated from custom-element state, not from parent JSX ranges (toaster list, TOC links, calendar day grid). This is the case that still uses host `render()`.

**Composition Helper** — a JSX export or named view prop that places a named region of a View-owned Shell (`RuiDialogTitle`, `RuiNumberFieldInput`, `primary`, `trigger`). Not an HTML slot.

**Binding** — `this.$` / `this.bindings` / `this.bind(...)`. Patches JSX ranges created by the host's own `render()` or `hydrate()` pass. Does not reach parent-authored light DOM.

**bindTo** — `@bindTo`. Copies a reactive field onto the host or a `data-ref` / selector descendant without a `render()` tree. Use this for shell paint (`hidden`, `aria-expanded`, text). Not an event API and not a slot.

## Composition

Non-atomic components separate behavior from markup: the custom element owns state, accessibility, and coordination; JSX helpers expose the structural parts.

Keep a convenient prop-based default composition on the primary view, but accept children for the equivalent explicit composition. Do not force consumers to subclass a custom element just to arrange its UI.

For keyboard movement within an already-rendered composite surface, update focus and roving attributes imperatively. Re-render only when visible structure or semantic state changes. Nested `role="menu"` trees (menu-button, menubar) share `MenuTreeController`: the ARIA relationship is an immediate menuitem/menu sibling pair in light DOM, and the controller owns submenu timers, keyboard, and unportaled `PopoverController` instances. Listbox-backed popovers (select, combobox) share `ListboxPopoverController` for active-descendant navigation and `ListboxHostController` for the embedded listbox, the `string[]` value property (comma-separated on the attribute), option `aria-selected`, and optional tag-group chips. Calendar-backed date pickers share `CalendarPopoverController` for opening and closing the popover (with focus restored to the toggle on Escape or day selection), positioning, the mobile layout listener, focus-out dismissal, and day focus.

`RuiField` discovers one control: the outermost `[data-rui-control]` or known host tag. Nested hosts (an embedded `rui-listbox` inside `rui-select`) are not field controls. For `RuiField` wiring, stamp `data-rui-control` (or use a known host tag), stamp `data-rui-aria-target` or `data-rui-aria-targets` when the ARIA node is not the control host itself, and fire bubbling `rui-change`.

Native `FormData` comes from the listed control, not from `RuiField`. Named `rui-date-input`, `rui-number-field`, `rui-slider`, and `rui-knob` are form-associated (`name` on the host, like `<input name>`). `RuiField` copies its `name` to the control. `registerFieldControl` supplies value access and a submission policy: `native` (default, name the ARIA target when it is a native input), `host` (form-associated host), or `none` (store only). Register a third-party host before connecting its field; form-associated hosts extend `FormAssociatedElement` from `@ecopages/radiant/form-associated-element`. A host whose submission value is `null` while unnamed must override `formState()` so a later name does not erase its reset value. `RuiForm` validates through its store and also reads a form-associated host's own validity (`FieldControlAdapter.validity`, defaulting to the host's `validity` and `validationMessage`) as the last error source: a rule or resolver message wins, a custom `resolver` cannot disable it, and the host must call `setValidity` before emitting `rui-change`. Native `<input>` constraints and browser state restoration stay outside this protocol.

A registered host that declares `data-rui-aria-target(s)` binds the field's ARIA state itself: `RuiField` publishes `labelId`, `describedBy`, `invalid`, `required` and `disabled` on `fieldContext` and writes no `id`, `data-rui-field-managed` or `aria-*` for it. The host holds the context in a `@contextSelector` + `@state` field. A `render()` host spreads `fieldAria(field)` on its target; a host with authored DOM decorates that field with `@bindTo(fieldAriaBindings(selector))` (including the `id` the label's `htmlFor` targets; copied on connect and on field change, so a target inserted later needs `render()`). A host that sets its target declaration only when it connects is switched over on the field's next sync, which removes the `id` (when the field assigned it), `data-rui-field-managed` and `aria-*` the field wrote on the host earlier; no declaration helper is needed in the view. Catalog hosts and native inputs keep the field's direct writes.

`RuiFieldError` has a controlled mode for an error that belongs to a group rather than a control: with `error` it renders that content (falling back to `children`), is visible while non-empty, works outside `RuiField` and on the server, and stamps `data-rui-field-error-controlled`. `findFieldErrorElements` skips controlled regions, so the field never overwrites or hides them; it only gives a controlled region an `id` when missing and lists it in the control's `aria-describedby` (an empty hidden region adds nothing to the description).

## Controllers

A **controller** is a reusable class in [`src/controllers`](../../controllers) that a component composes instead of reimplementing the behavior. It is not core's `RadiantController` (`@ecopages/radiant`), which is a reactive host with its own lifecycle; a catalog controller is a plain class and needs no custom element.

The contract is `Controller` in `src/controllers/controller.ts`:

- The constructor is inert: no DOM and no `window`, so building one on the server is safe.
- `attach()` starts work; `destroy()` ends all of it. Both are idempotent, and a destroyed controller can be attached again.
- It takes elements or getters in and does no component-specific work. The component adds its own `data-rui-*` attributes and `rui-change` events.

For a host, each controller offers a one-line `createX(host, config)` factory built on `bindController`. It constructs the controller and registers `attach()` as a connected callback and `destroy()` as a cleanup callback, so the component writes no `disconnectedCallback` code for it. `host` is anything with `registerConnectedCallback` and `registerCleanupCallback`, such as a `RadiantElement`. Without a host, construct the class with getters and call `attach()` and `destroy()` directly.

```ts
class RuiPopover extends RadiantElement {
	private readonly controller = createPopoverController(this, {
		getAnchor: () => this.getAnchorElement(),
		getFloating: () => this.surfaceTarget,
		getOpen: () => this.open,
		getPlacement: () => this.placement,
	});
}
```

Before writing bespoke logic, check `src/controllers` for a controller that already does it and compose that:

- `PopoverController` (popover, hover-card, menu-button, menubar, navigation-menu; select and combobox through the listbox controller): portal mount, floating position, teardown, and, when given `onDismiss`, dismissal through a `DismissController` over the anchor and floating surface. `dismissOn` narrows it to some of `pointer`, `focus` and `escape`.
- `DismissController` (popover, hover-card, menu-button, menubar, navigation-menu, select and combobox through `PopoverController`; tooltip, dialog, sidebar, menubar, navigation-menu and the calendar popover controller directly): calls `onDismiss(reason, event)` on a pointer press outside the surface and its related elements, focus leaving them, or Escape anywhere in the document, while `getOpen()` is true. It needs no popover, so a dialog or drawer can use it. `contains(node)` and `isOutside(target)` answer the same question for components that run their own focus or pointer handling (hover-card focus handling). `escapeScope: 'tree'` limits Escape to key events that start inside the surface or its related elements, and `settleFocus` judges a focus-out after focus settles (calendar popups). Used by dialog, sidebar, navigation-menu, menubar, the calendar popover controller and tooltip directly. Select, combobox and the menu tree keep Escape in their own key handlers: it applies only to keys pressed on the control or a menu item, and each also restores focus or clears text.
- `MutationController`: a `MutationObserver` on the node `getTarget()` returns. Attaching again with another target moves it. Used by tabs, cycle-toggle, table, field and sidebar-trigger.
- `ResizeController`: a `ResizeObserver` on the elements `getTargets()` returns. Used by the toaster (one per toast) and floating positioning.
- `EventListenerController`: one or more event types on the target `getTarget()` returns (`document`, `window` or an element), with `once`, `passive` and `capture` options. The listener is typed from the target and event type (`document` and `'pointermove'` give a `PointerEvent`), and `once` detaches the controller after the first event so `attach()` registers it again. For listeners added and removed at runtime, such as a drag; use core's `@onEvent({ document: true })` when the listener lives as long as the element. Used by the toaster, sidebar (its media query and navigation events), toc, dialog registry, popover external anchor, autocomplete, hover-card and floating positioning.
- `MenuTreeController` (menu-button, menubar): nested submenu coordination. It has nothing to start on `attach()`; `destroy()` closes open branches and releases their popovers and timers.
- `ListboxPopoverController` (select, combobox): active-descendant navigation and popover positioning. Positioning does nothing until attached.
- `CalendarPopoverController` (date-field, date-range-picker): open state, positioning, focus-out dismissal and the mobile layout listener, started on `attach()`.
- `SwipeController` (carousel): reports `left`, `right`, `up` or `down` once, on the pointer-up that ends a swipe, from listeners it attaches to the element `getTarget()` returns. `axis` (`x` by default, `y` or `both`) and `threshold` (48px by default) decide what counts, and `exclude(target)` ignores a gesture that starts on, for example, a button. The direction decision is the pure `resolveSwipeDirection` in `swipe-direction.ts`. The carousel maps `left` to next and flips for a right-to-left host. A surface that follows the pointer or judges speed does not use it.
- `PointerDragController` (slider, knob, window-splitter, sidebar resize handle, toast swipe-to-dismiss): owns a pointer drag on the element `getTarget()` returns. A primary-button press (and `canStart`) captures the pointer and, until it ends, listens on `document` for move, up and cancel of that pointer only. `onStart`, `onMove` and `onEnd` receive the position (`x`, `y`), the press position (`startX`, `startY`), the delta (`dx`, `dy`), the `PointerEvent` and `elementUnderPointer()`, which does a hit test at the pointer (a captured pointer targets the dragged element, so `event.target` cannot answer it). `onEnd` reports `reason` `release`, `cancel` or `destroy` (torn down mid-drag, with capture released). It knows no values, steps or axes: the component keeps its own math, `data-dragging` and `rui-change`.
- `RovingController` (tabs, toolbar, tag-group, disclosure-group, listbox, menubar, navigation-menu bar, tree, treegrid, grid, table): roving tabindex for the items `getItems()` returns. It owns the active item and gives `0` to it and `-1` to the rest, moves focus on the arrows of `orientation` (`horizontal`, `vertical`, or `none` for no keys) and on Home/End, with `wrap`, and follows focus, so a click moves the tab stop too. `sync(preferred?)` applies tabindex (call it from `onConnected` and when the items or the selection change), `focus(item)` and `setActive(item)` move it from component code, `navigate(current, key)` routes a key the component owns, `onMove(item, event)` lets the component select or open on move, and `enabled` turns it off. Moving does not select. Typeahead, Enter/Space and expand/collapse stay in the component. The 2D collections (treegrid, grid, table) pass every cell as one flat list with `orientation: 'none'` and keep their row/column arithmetic. The navigation menu's panel content keeps the pure `navigateRovingTabindex` from `lib/roving-tabindex`, which the controller also composes.

When a component only needs the behavior for its connected lifetime and has no use for the controller afterwards, call the factory in the constructor (`createMutationController(this, {...})`) instead of keeping a field. A component that starts and stops a controller itself (field, sidebar-trigger) constructs the class directly and calls `attach()` and `destroy()`. `MenuTreeController`, `ListboxPopoverController` and `CalendarPopoverController` have factories too, and their owners hold the result in a field initializer and write no teardown. `collection-navigation` (pure helpers used by the listbox controller) lives beside them, and `ListboxHostController` stays in `components/ui/shared`: it holds no resources and reads listbox host types from the catalog.

## Multi-value `value`

Token-select hosts (`rui-select`, `rui-combobox`, `rui-listbox`, `rui-checkbox-group`, `rui-tag-group`, `rui-table`) share one protocol:

- **HTML attribute:** comma-separated tokens (`value="ca,tx"`). Empty selection **omits** the attribute.
- **JS property:** always `string[]` (`[]` when empty).
- **JSX / `Rui*` views:** `string | readonly string[] | undefined`. A string is parsed as CSV; the host still stores an array.
- **`rui-change`:** `{ value: string[] }`.

`rui-slider` is the numeric variant: attribute `50` or `25,75`, property `number[]`, JSX `number | readonly number[]`, events `{ value: number[] }`. Two numbers are range mode.

Default `@prop({ type: Array })` serializes attributes as JSON. These hosts pass `transform` (`multiValuePropOptions` / `numberArrayTransform` in `shared/multi-value.ts`) so the attribute stays CSV. Pass `defaultValue: []` (or `[50]` on slider) on each decorator call so classes do not share one array.

`@prop` host attributes default to the kebab-case form of a camelCase property (`mobileBreakpoint` is `mobile-breakpoint`). `Rui*` JSX props remain camelCase; use the kebab-case name in authored HTML. An explicit `attribute` option selects the host attribute name as configured; use a lowercase value for an attribute authored in HTML because HTML normalizes names to lowercase.

## Light-DOM ownership

Parent JSX owns **Authored Children**. Do not let a custom element `render()` place that content through `this.slotted`: catalog composites keep chrome and children in the view, as a View-owned Shell.

- **View-owned Shell:** JSX helpers (or named view props) place chrome and children. The CE has no `render()` slot tree. Query with `data-ref` / `data-*` / roles. **Never query BEM class names.** Toggle volatile attrs with `toggleAttribute`.
- **Composition Helper:** named regions in the right DOM position (`RuiDialogTitle`, `RuiNumberFieldInput`, `primary` / `secondary` props) — not `slot="…"` attributes; Radiant has no named slots.
- **Default chrome when children are omitted:** the view supplies defaults (for example `RuiNumberField` renders input + steppers when `children` is empty).
- **Stylesheet ownership:** component stylesheets are atomic: never inline child or shared CSS. `style-dependencies.json` is generated from rendered default composition and lists the complete ordered stylesheet union for selective consumers. Applications should normally import `styles.css` once; it imports each atomic and primitive stylesheet exactly once. Public `--rui-*` knobs: defaults on the host (or portaled surface root), never on an inner BEM grain — [`DESIGN.md`](../../../DESIGN.md).
- **Derived Tree:** keep `render()` when inner DOM is generated from CE state and is not parent JSX ranges (toaster list, TOC heading list, calendar day grid).
- **SSR preparation:** when a Derived Tree depends on state normally initialized in `onConnected()`, register an SSR preparation callback too. Calendar prepares its month panels from the supplied value and locale before server serialization; client connection still initializes interactive state.
- Do not use `this.slotted` as the public JSX API. Drop `slot=` on helpers and `@slot` TSDoc once view helpers own the layout.

Core Radiant still has **Slot** (`this.slotted`) as the architectural projection boundary for a render-owning host, and any host may place or forward it. Catalog composites choose not to: they do not expose it as the JSX API.

## Generated descendant ids

ARIA relationships (`aria-controls`, `aria-labelledby`, option ids) need a document-unique `id` on a descendant. That string is not a public query target — authors still query `data-ref` / `data-*` / roles. Host `id` stays on the host; do not copy or stem from it.

Use `@/lib/unique-id`:

The helper uses random UUIDs in secure contexts and random bytes on HTTP origins.

- Mint once per instance: `private readonly uid = uniqueId('rui-select')`. Suffix slots (`${this.uid}-list`).
- One descendant: `private readonly panelId = uniqueId('rui-disclosure')`.
- Do not pass `this`. Do not use `Math.random` or a page-global constant (`'rui-carousel'`).

## Numeric controls

With `trigger-kind="focus"`, `rui-select` and `rui-combobox` open the listbox only when focus arrives from outside the host (`relatedTarget` is not a descendant). Focus the host moves back itself after select, clear, toggle, or tag remove never reopens it. Select trigger and toggle clicks prevent pointer focus and open through the click handler.

`rui-meter` keeps a native `<meter>` for range semantics and renders its visual track and fill from the derived percent. This avoids browser-specific meter pseudo-elements.
`rui-sidebar-trigger` mirrors its controlled sidebar's state, mobile mode, and collapse mode onto the trigger host through one `MutationObserver`, attached in `onConnected()`. An explicit `controls` id must resolve to a `rui-sidebar`; only a trigger without `controls` uses its closest sidebar. Placement and glyph CSS read only those host attributes and the reflected `placement` attribute, so an attached trigger follows the sidebar's `mobileBreakpoint`, not the viewport. Until a trigger attaches (no `data-sidebar-mobile`), CSS guesses mobile from a 768px viewport and reads the SSR attributes of the sidebar whose pane holds the trigger, else of the only sidebar of its nearest provider (child combinators keep nested providers independent); other triggers stay visible until they attach. Detached, the trigger reports the SSR placement guess (`inset` collapsed, otherwise expanded).

The `RuiSidebarProvider` docs layout site header uses `--surface` with a `--border` divider so it matches site chrome that uses the surface role; the pane and inset use `--background`.
`rui-date-input` keeps typed digits in the visible segment draft until the unit completes, focus moves, or the control blurs. `value` and the form value stay on the last committed ISO date during that draft; only a `value` or `locale` change replaces it. A delayed selection collapse must not pull focus back from a later segment. See [`date-input/README.md`](./date-input/README.md).
Focused `rui-date-input` segments use `--focus-ring` with `--on-focus-ring` text to keep the selected segment legible.
Standalone `rui-date-input` applies its own bordered surface; Date Field and Date Range Picker keep the shared surface on their composed control row.
Slider and knob normalize off-step values. Only floating-point noise is ignored when reflecting a normalized value; display precision does not determine the committed value. Knob waits until range props in the same turn have landed before snapping, so a fractional value is not rounded against the default step.

## Two host shapes (bindings vs imperative paint)

`this.$` / `this.bindings` only patch JSX ranges the host's own `render()` or `hydrate()` pass created. They do not reach parent-authored light DOM inside the custom element. Pick one shape per component:

- **View-owned Shell** (most composites): no `render()` override, no `RadiantElement<Bindings>` generic. The view places chrome; the CE queries `data-ref` / `data-*` / roles. Copy 1:1 field values with `@bindTo`. Keep `@onUpdated` for procedures (focus, joined ARIA, branching). Do not query class names. Do not move this chrome into CE `render()` to "use bindings": the catalog keeps composites as View-owned Shells.
- **Derived Tree** (meter, toaster, calendar, TOC): override `render()` for derived structure. Use plain reads (`this.variant`, `this.entries`) for branches, lists, and `class`; use `this.$` for stable leaf text and whole attribute values that should patch without a full host rerender. Do not add `@onUpdated` + `requestUpdate()` for fields already bound with `this.$` — tracked `render()` handles structural reads; bindings handle leaves.
- Never CE `render()` + `this.slotted` for parent-owned chrome.

Omit the `Bindings` generic unless the script actually uses `this.$`, `this.bindings`, or `this.bind(...)`.

## Query fields

A `@query` field is `T | null`: a single-element query returns `null` until the view stamps the node, and under standard decorators a field typed without `| null` does not compile. An `all: true` field is `T[]`. Declare the field with the element type, bind it to a local and return early when it is missing; do not assert non-null at the use site. The package compiles with `strictPropertyInitialization` off (`tsconfig.app.json`), so the field needs no `!`. A query is uncached unless `cache: true`.

```ts
@query({ ref: 'panel' }) panelTarget: HTMLElement | null;
@query({ selector: 'input[type="radio"]', all: true }) radioTargets: HTMLInputElement[];

private setOpen(next: boolean): void {
	const panel = this.panelTarget;
	if (!panel) return;
	panel.hidden = !next;
}
```

## Connect-time sync

Do not write `connectedCallback` + `queueMicrotask(sync)` boilerplate. Override `protected onConnected()` from `RadiantElement` instead: the core invokes it after attribute catch-up, initial property sync, and (when applicable) the initial hydrate/update — on every connection, not once per instance. Rebuild in `onConnected()` whatever `disconnectedCallback` tears down (controllers, observers, listeners); guard once-only bootstrapping explicitly.

Do not confuse this with `registerConnectedCallback()` on the reactive host: those callbacks run synchronously at the start of `connectedCallback`, before attribute catch-up. Post-sync work belongs on `onConnected()`.

Keep synchronous setup that no controller covers (event listeners, observers) in `connectedCallback`, and keep behavioral deferrals (focus moves, dismiss suppression) as explicit microtasks at their trigger sites.

When a view peels a prop to seed pre-hydration output (inner control state, accessible names, shell classes), take a non-obvious default from a constant exported by the script file (`CHECKBOX_DEFAULT_VALUE`, `CAROUSEL_DEFAULTS`, `HOVER_CARD_DEFAULT_CONTENT_LABEL`) — never re-declare the literal. Do not mirror trivial defaults (`false`, `''`, `0`): an omitted attribute already hydrates to those.

## View host props

Views should declare the public DOM surface they render. Custom-element views use `JsxCustomElementAttributes<ElementClass, ComponentProps>`; native helpers use `NativeInputProps` / `NativeTextareaProps` / `NativeButtonProps` (`@/lib/native-element-props`, aliases of `JSX.IntrinsicElements`) plus view-only fields, so unprefixed attributes such as `required` type-check the same way they do on the native element. `RuiButton`'s link branch still uses `JsxElementProps<HTMLAnchorElement>`.

Each catalog custom-element class declares public JSX props with `declare readonly [JSX_PROPS]?: RuiFooProps`. JSX reads that contract for the class export (for example, `<RuiAlertElement>`) and its matching tag (for example, `<rui-alert>`). A pass-through export such as `RuiMeter` can be that class directly; `RuiMeterElement` remains an explicit alias. A real view such as `RuiToast` retains its own view props. Keep the declaration and tag-map entry beside the class. Existing `JsxCustomIntrinsicElements` augmentations remain available for compatibility.

Views import a custom-element class as a runtime value and render that class (`<RuiAlertElement>`), aliasing it when the view export has the same name. The value import evaluates the decorator registration while giving JSX the class's declared prop contract.

For the Derived Tree hosts meter, calendar, date input, TOC, toast, and toaster, use `WithoutChildren<RuiFooProps>` because the host replaces its children on its first render. Pass-through exports use the class's JSX props; keep a view wrapper only when it adds defaults, transforms, invariants, or class composition. `RuiToast` remains a helper because it transforms `toastId`.

Default pattern — peel view-only fields, spread the rest, lock invariants after the spread:

```tsx
import { RuiFoo as RuiFooElement } from './foo.script';

({ children, ...props }: JsxCustomElementAttributes<RuiFooElement, RuiFooProps>) => (
	<RuiFooElement {...props}>{children}</RuiFooElement>
);
```

A **Derived Tree** view takes no children: the host's first `render()` replaces them. When a wrapper is needed, type its props `WithoutChildren<JsxCustomElementAttributes<RuiFooElement, RuiFooProps>>` (from `src/lib/without-children.ts`, imported by relative path) and spread the full props object onto a self-closing class host (`<RuiMeterElement {...props} />`); a Composition Helper that forwards to such a view uses the same type. `WithoutChildren` adds `children?: never` rather than omitting the key: with no other attributes on the tag, the `data-*` index signature keeps TypeScript from flagging JSX body children, so `Omit` still accepts `<RuiMeter><p /></RuiMeter>`. `src/host-contract.types.tsx` pins this for every Derived Tree host and any retained view.

Peel props only when the view must transform or filter them:

- View-only data (`options`, `articles`, …) that must not reach the host
- `prop:` / `attr:` bindings or renamed props (`triggerLabel` → `prop:buttonLabel`). Peel every CE prop that needs an explicit `prop:` / `attr:` prefix; spread the rest.
- `class` composition with `cx()` on the same node — spread first, then `class={cx('rui-foo', className)}`. Import `cx` from `@ecopages/radiant-ui/cx` in apps; use `@/lib/cx` inside this package.
- Host vs inner-node split when the view owns the composed surface (e.g. `RuiAlert` puts `role="alert"` and BEM classes on an inner div; the CE handles dismiss)

`aria={{ ... }}` and direct canonical `aria-*` attributes can both be used; a direct attribute wins. The same precedence applies to `data={{ ... }}` and `data-*`. Direct `null` is a supplied value and wins over structured values and defaults. After the spread, only write a host attribute when the value is defined, or when the attribute is a locked invariant (`type="button"`, `role="tablist"`). A fixed attribute on the CE host itself, such as `rui-sidebar`'s `role="complementary"`, is declared with `@customElement(tag, { hostAttributes })` instead of written in `connectedCallback` or stamped by the view: it then reaches server output for a host authored without its view, and an authored value is kept.

## Popup visibility ownership

Popups inside parent-owned JSX trees must not bind `hidden` in the view when open state is toggled imperatively by the custom element. Parent re-renders would re-apply `hidden` and fight `moveRangeBefore`.

- **Reflected `open` on the host** (dialog, menu-button): the view seeds SSR visibility with `hidden={open ? undefined : true}`, and the controller also synchronizes the rendered surface with `toggleAttribute`. Imperative APIs and delegated triggers must not leave an initially hidden surface concealed.
- **Internal open state** (select, combobox, popover surfaces): the view omits `hidden`; the script sets initial closed state with `toggleAttribute('hidden', !open)` in `connectedCallback` / `setOpen`.
- **Shared helper:** `PopoverController` (`src/controllers`) uses `toggleAttribute` for all portaled surfaces.

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

A View-owned Shell is a **behavior host**: it queries Authored Children through `data-ref` / `data-*` / roles — never BEM class names. That query contract is public. The CE class TSDoc must describe the full child tree (required targets, per-item attrs, optional controls, attributes the host writes vs the author owns). Composition Helpers stamp the same targets; they are not a substitute for documenting them. Do not use `@slot` for this tree. Selector dialect: [`.agents/skills/radiant-ui-docs/references/query-targets.md`](../../../../../.agents/skills/radiant-ui-docs/references/query-targets.md).

Templates and a filled Tag Group example: [`.agents/skills/radiant-ui-docs/`](../../../../../.agents/skills/radiant-ui-docs/SKILL.md). Implementation playbook: [`.agents/skills/radiant-ui-authoring/`](../../../../../.agents/skills/radiant-ui-authoring/SKILL.md).

Consumer docs live in `apps/radiant-ui` (`src/content/components/`). Surface the same contract (attributes, light-DOM targets, Composition Helpers, events, CSS classes) and mark APG links with `data-wai-aria`. Tag Group is the composition-contract POC; Alert remains the page-structure POC.
