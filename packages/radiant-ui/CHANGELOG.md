# @ecopages/radiant-ui

## 0.1.0

First stable of the Radiant UI catalog: view-owned light-DOM shells, form-associated controls, and CSS knobs on the host.

### Breaking Changes

- Composite `Rui*` views own chrome and authored children in the light DOM. Custom-element `<slot>` markup from earlier pre-1.0 cuts is not the public API; migrate to the documented view helpers or equivalent light-DOM structure.
- `FormAssociation` is removed. Form-associated hosts extend `FormAssociatedElement` from `@ecopages/radiant/form-associated-element`.
- Rui JSX views type the declared root host (`JsxCustomElementAttributes` or `JsxElementProps`). Direct kebab-case ARIA/data attributes take precedence over structured values. Deprecated select/combobox option aliases and mask helper aliases are gone.
- `RuiTextarea` no longer accepts `size`; height comes from `rows` and the shared control tokens.
- `@floating-ui/dom` is gone. Tooltips and menu buttons use the in-package floating helper.

### Minor Changes

- Add composable presentational building blocks: `RuiHeadline`, `RuiHeading`, `RuiAvatar`, `RuiButtonGroup`, `RuiChip`, and `RuiChipList`. `RuiFeed` is a presentational compound component (the `rui-feed` custom element is gone).

- Add calendar, date, number, popover, select, autocomplete, and tag-group components. `RuiNumberField` is the number-entry control (`minValue` / `maxValue`).

- Drop `@floating-ui/dom` and position tooltips and menu buttons with `computeFloatingCoords` / `attachFloating` (fixed placement, primary-axis flip, cross-axis clamp).

- Complete every named hue scale to steps 50–975. `--color-black` and `--color-white` live in `tokens/system.css` so every theme gets them without loading Aurora.

- Uncontrolled `rui-sidebar` applies `mobileDefaultOpen` when the viewport crosses into mobile, not only on first connect.

- Compile published CSS with Tailwind v4 PostCSS so dist ships browser-ready styles (no `@apply` / `@reference`), while theme and token values stay CSS custom properties for runtime swaps.

- [#179](https://github.com/ecopages/radiant/pull/179) [`4f51ceb`](https://github.com/ecopages/radiant/commit/4f51cebbda41329d4629a6babe32cbed8e10e106) Thanks [@andeeplus](https://github.com/andeeplus)! - Add a `square` modifier to `RuiButton` for icon-only actions, composable with control sizes such as `sm` and `lg`.

- [#230](https://github.com/ecopages/radiant/pull/230) [`c0128ad`](https://github.com/ecopages/radiant/commit/c0128ad36b5a06dbe93d16ea15a6d8197a6ea34e) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `slidesPerView` and `slidesPerGroup` so a carousel can show a window of slides.

    **@ecopages/radiant-ui**

    - `slides-per-view` (`>= 1`, fractional peek allowed) is how many slides fill the viewport. `index` is the first visible slide.
    - `slides-per-group` is how far prev/next/autoplay/swipe move. A window of more than one slide paints separate cards; a single pane keeps chrome on the viewport.
    - Card gap, radius, border, fill, and padding are `--rui-carousel-*` custom properties with theme-token defaults. Override them on `rui-carousel`.
    - Multi-slide indicators select valid windows, including the last window. Pausing autoplay restores live-region announcements.

- [#199](https://github.com/ecopages/radiant/pull/199) [`b054bd0`](https://github.com/ecopages/radiant/commit/b054bd029bc1f4312efa73933a15d3b969e31e74) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `RuiCheckboxGroup` for coordinating multiple `RuiCheckbox` options as a single multi-value form field.

    **@ecopages/radiant-ui**

    - New `<rui-checkbox-group>` host with `RuiCheckboxGroupControl`, `options` convenience API, and `orientation` layout.
    - Comma-separated `value` protocol matches multi-select controls; integrates with `RuiField` / `RuiForm`.

- [#259](https://github.com/ecopages/radiant/pull/259) [`7cfa0e5`](https://github.com/ecopages/radiant/commit/7cfa0e5187e7b5abe910677c3c9dd32be175ef95) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `rui-date-input` / `@ecopages/radiant-ui/date-input` with per-unit locale segments, a hidden ISO form value, and spinbutton accessibility. Default markup stamps `data-rui-control` and `data-rui-control-type="date"` so standalone `RuiField` discovery works without extra attributes.

- [#259](https://github.com/ecopages/radiant/pull/259) [`8cb1f83`](https://github.com/ecopages/radiant/commit/8cb1f832e3085c0402f3766e30058e06b6f0df31) Thanks [@andeeplus](https://github.com/andeeplus)! - Date fields and range pickers now use React Aria-style locale segments instead of a single formatted text box, so tapping a unit replaces just that part and mobile keyboards stay numeric.

    **@ecopages/radiant-ui**

    - `RuiDateField` and `RuiDateRangePicker` embed `rui-date-input`; removed `dateStyle`, `masked`, and string `placeholder` props from those hosts.
    - Nested range inputs keep in-progress dates until both sides are valid; the host `value` is the committed `start/end` range only.
    - Light-DOM contract: `[data-date-field-input]` and `[data-range-start]` / `[data-range-end]` are nested `rui-date-input` hosts, not `<input type="text">`.

- [#287](https://github.com/ecopages/radiant/pull/287) [`0190865`](https://github.com/ecopages/radiant/commit/0190865052ef78782f38d245bb0f489a28d23c06) Thanks [@andeeplus](https://github.com/andeeplus)! - `rui-date-input`, `rui-number-field`, `rui-slider`, and `rui-knob` extend `FormAssociatedElement`. `FormAssociation` is removed; third-party hosts should extend the platform base. `RuiField` copies `disabled` onto a form-associated child and never names that host's inner input.

- [#163](https://github.com/ecopages/radiant/pull/163) [`0d4e4f5`](https://github.com/ecopages/radiant/commit/0d4e4f53621dbf6830fbdf23305383ad386576c4) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `RuiForm` `onSubmit`, `action`, and `method` support, plus form-context error state. `onSubmit` receives validated values; without it, forms with an action or method submit natively after validation.

- [#207](https://github.com/ecopages/radiant/pull/207) [`4ef2a9f`](https://github.com/ecopages/radiant/commit/4ef2a9f3459bc1e83e6c5b8bf14d024f68bc65ff) Thanks [@andeeplus](https://github.com/andeeplus)! - Unify listbox-backed selection across select, combobox, and standalone listbox with shared host controllers and consistent field labeling.

    - Add `ListboxHostController` and `listbox-option` helpers for embedded listbox sync, comma-separated values, and tag-group chips.
    - Export `@ecopages/radiant-ui/icons` with `RuiIconCheck` and `RuiIconX`; use them in listbox, select, combobox, tag-group, dialog, and toast.
    - Wire `RuiField` labels to composed controls through `aria-labelledby`, including listbox surfaces in form fields.

- [#195](https://github.com/ecopages/radiant/pull/195) [`a51c205`](https://github.com/ecopages/radiant/commit/a51c2058ac4fc2eda58439e79f51fbc8bf6ca9cb) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `RuiSeparator` for non-interactive horizontal and vertical dividers. Menu button and menubar now support nested submenus and `{ type: 'separator' }` entries in item trees; toolbar can divide control groups without adding a focus stop.

- [#271](https://github.com/ecopages/radiant/pull/271) [`0b05f53`](https://github.com/ecopages/radiant/commit/0b05f53c45747f6792e6a21218ca34bfcc7fc454) Thanks [@andeeplus](https://github.com/andeeplus)! - Render meter fill consistently across browsers and expose CSS properties for its track color, fill color, radius, height, and width.

- [#240](https://github.com/ecopages/radiant/pull/240) [`b8abbac`](https://github.com/ecopages/radiant/commit/b8abbac9c162317233eb8b172a559fc80faf7b21) Thanks [@andeeplus](https://github.com/andeeplus)! - Open navigation-menu flyouts as popovers under each trigger, keep the trigger bar unboxed by default, and add `openOnHover` with `hoverDelay` / `closeDelay`.

- [#179](https://github.com/ecopages/radiant/pull/179) [`0abab03`](https://github.com/ecopages/radiant/commit/0abab036d3e97af72266508d2cf026ae8b236611) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `RuiSpinner`, `RuiBadge`, and `RuiInputGroup` for loading indicators, status labels, and input addons.

    **@ecopages/radiant-ui**

    - `RuiSpinner` — inline loading indicator with `sm` / `md` / `lg` sizes.
    - `RuiBadge` — compact status label with `filled`, `outline`, `destructive`, `ghost`, and `muted` variants.
    - `RuiInputGroup` — bordered row for `RuiInput` with leading/trailing addons (`RuiInputGroupAddon`, `RuiInputGroupText`).

- [#226](https://github.com/ecopages/radiant/pull/226) [`dd21362`](https://github.com/ecopages/radiant/commit/dd213624055eb26712df1715a10735d5c88cbbfe) Thanks [@andeeplus](https://github.com/andeeplus)! - Paint 1:1 field-to-DOM copies on catalog hosts with `@bindTo` instead of `@onUpdated` glue.

    **@ecopages/radiant-ui**

    - Straight attribute, boolean, property, and text sync (hidden, aria-expanded, aria-label, input `checked` / `disabled`, and similar) now uses `@bindTo`.
    - `@onUpdated` remains for procedures: focus, describedby joins, pointer math, and any branched write.

- [#179](https://github.com/ecopages/radiant/pull/179) [`5d6adfa`](https://github.com/ecopages/radiant/commit/5d6adfa8dff3eaf414c91ba84ca90b02f8cb6fde) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `RuiHoverCard` for rich hover previews with composable trigger and content.

- [#173](https://github.com/ecopages/radiant/pull/173) [`c5f5805`](https://github.com/ecopages/radiant/commit/c5f5805a2151de186d2ff6506660eae8e6bde027) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `RuiKnob`, a rotary numeric control with a 300° value arc, keyboard stepping, and optional value readout.

- [#173](https://github.com/ecopages/radiant/pull/173) [`c5f5805`](https://github.com/ecopages/radiant/commit/c5f5805a2151de186d2ff6506660eae8e6bde027) Thanks [@andeeplus](https://github.com/andeeplus)! - Move composite JSX APIs to view-owned light-DOM shells so parent reconciliation no longer fights custom-element slot projection.

    **@ecopages/radiant-ui**

    - Composite `Rui*` views now own chrome and author children in the light DOM; coordinating custom elements query `data-ref` / `data-*` targets and toggle volatile attrs imperatively instead of re-rendering through CE `<slot>`.

        This is a breaking pre-1.0 change for consumers who authored the previous slot-based markup directly: migrate to the documented `Rui*` view helpers or equivalent light-DOM structure.

    - Migrated composites include table, dialog, form, field, select, listbox, checkbox, combobox, autocomplete, menu-button, tooltip, hover-card, switch, breadcrumb, popover, toolbar, grid, tree, treegrid, tag-group, menubar, disclosure (and group), window-splitter, number-field, navigation-menu, carousel, and sidebar (with trigger).
    - Popup visibility and placeholder state use `toggleAttribute` so parent re-renders do not fight `moveRangeBefore`.
    - Table sync narrows imperative `tabIndex` updates to structure changes and keyboard focus, avoiding churn during `aria-busy` refreshes.

- [#179](https://github.com/ecopages/radiant/pull/179) [`496bf19`](https://github.com/ecopages/radiant/commit/496bf194d90ed760120b9183f3b99b67291319c5) Thanks [@andeeplus](https://github.com/andeeplus)! - Add composable Table and Pagination primitives with keyboard navigation, row selection, sorting, accessible page navigation, and responsive table layouts.

- [#278](https://github.com/ecopages/radiant/pull/278) [`371b93c`](https://github.com/ecopages/radiant/commit/371b93cbf39b4a71d0e034d8023e425c03941fcf) Thanks [@andeeplus](https://github.com/andeeplus)! - Named `rui-date-input`, `rui-number-field`, `rui-slider`, and `rui-knob` are form-associated: `name` on the host submits through native `FormData` like `<input>`. Form reset restores the value the control was given. `RuiField` copies `name` onto that host and remains the `RuiForm` connector. Hidden form inputs on those hosts are gone.

    Registered custom controls can declare whether the host, a native input, or neither submits. Fieldset disability no longer changes an authored `disabled` attribute, and clearing a field name removes it from native submission. Empty named dates submit an empty string.

- [#230](https://github.com/ecopages/radiant/pull/230) [`14c3710`](https://github.com/ecopages/radiant/commit/14c3710b6a1328407146e29efc3e36f8e5f04300) Thanks [@andeeplus](https://github.com/andeeplus)! - Expose host-level `--rui-*` CSS knobs with catalog defaults so instances can be restyled in CSS without a JS theme object.

    **@ecopages/radiant-ui**

    - Public knobs are declared on the host (or the portaled surface). Do not set them on an inner grain — that blocks inheritance.
    - Switch, dialog, tooltip, tabs, knob, and avatar declare defaults on the host or root class. Popover and hover-card declare them on the portaled panel class.
    - Toaster stack variables are prefixed (`--rui-toaster-width`, `--rui-toast-y`, …). `gap` and `offset` attributes still win over CSS.

- [#270](https://github.com/ecopages/radiant/pull/270) [`9c0763e`](https://github.com/ecopages/radiant/commit/9c0763ec3789e47d07f3e358f1223798552538c3) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `trigger-kind` (`focus` | `manual`) on `<rui-select>` to opt into opening the listbox when the trigger receives focus, aligned with combobox `triggerKind`.

- [#179](https://github.com/ecopages/radiant/pull/179) [`feab2d2`](https://github.com/ecopages/radiant/commit/feab2d23e06f1ebe7de87b05fe29d59407d83e9f) Thanks [@andeeplus](https://github.com/andeeplus)! - Range sliders now submit `[min, max]` through forms (`name` plus `name-max`), share the numeric keyboard model with knobs, and keep vertical fill positioning in CSS.

### Patch Changes

- [#179](https://github.com/ecopages/radiant/pull/179) [`4f51ceb`](https://github.com/ecopages/radiant/commit/4f51cebbda41329d4629a6babe32cbed8e10e106) Thanks [@andeeplus](https://github.com/andeeplus)! - Give `RuiButton` slightly more inline padding than field chrome so short labels sit more comfortably at each control size.

- [#215](https://github.com/ecopages/radiant/pull/215) [`25a547b`](https://github.com/ecopages/radiant/commit/25a547b75e19f07a54d5dd6d41c82c92e8ae7774) Thanks [@andeeplus](https://github.com/andeeplus)! - Scale button and input control heights with the spacing pack so compact and wide density change both axes, not only inline padding.

- [#278](https://github.com/ecopages/radiant/pull/278) [`83565f8`](https://github.com/ecopages/radiant/commit/83565f8968c2447db4eb1604f2404796b2fe0cda) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep a partly typed `rui-date-input` date when props other than `value` or `locale` change. Before this fix, setting `label`, `min`, `max`, `disabled`, `read-only`, or `name` mid-entry threw away the typed digits. Add the `--on-focus-ring` color token (Tailwind `on-focus-ring`), paired with `--focus-ring` and defaulting to `--on-primary`, for text on a focus-ring fill.

- [#271](https://github.com/ecopages/radiant/pull/271) [`2062c0a`](https://github.com/ecopages/radiant/commit/2062c0a995f8b1bdc7741a7862421ac73fdcc4a1) Thanks [@andeeplus](https://github.com/andeeplus)! - Improve focused date input segment contrast across browser text rendering.

- [#287](https://github.com/ecopages/radiant/pull/287) [`5aed321`](https://github.com/ecopages/radiant/commit/5aed3210c1b3211ef44f2e46c3b4be14a2802192) Thanks [@andeeplus](https://github.com/andeeplus)! - `rui-date-input` commits the draft once per keystroke, focus move, or blur. Blurring no longer runs the leave and blur passes back to back, and completing a unit no longer rebuilds the segments twice. Focus reaches the next unit by the time `updateComplete` resolves, and a segment rebuild no longer pulls focus back after it has left the control.

- [#277](https://github.com/ecopages/radiant/pull/277) [`9108c56`](https://github.com/ecopages/radiant/commit/9108c568af8739bb2f672214f3a73c2341fa436a) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep date-input segment typing in a local draft until the unit completes, and stop delayed selection from stealing focus between segments.

- [#251](https://github.com/ecopages/radiant/pull/251) [`a3abae1`](https://github.com/ecopages/radiant/commit/a3abae15ab6144a9e4fc8e2d3d65b5fe938a92d4) Thanks [@andeeplus](https://github.com/andeeplus)! - Support customizable indicator position on disclosure triggers and default to chevron-down icon.

    **@ecopages/radiant-ui**

    - Add `icon` and `iconPosition` (`'start' | 'end'`) props to `RuiDisclosure` when using `trigger`.
    - Update `RuiDisclosureIcon` default chevron variant to render `RuiIconChevronDown`.
    - Export `RuiDisclosureIconProps`, `RuiDisclosurePanelProps`, `RuiDisclosureTriggerProps`, and `RuiDisclosureViewProps` from `@ecopages/radiant-ui/disclosure`.

- [#294](https://github.com/ecopages/radiant/pull/294) [`6213258`](https://github.com/ecopages/radiant/commit/621325874450fc8892b78f91ec381c94d19e0c01) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep date input and knob reset values when their form field name is assigned after the control connects.

- [#259](https://github.com/ecopages/radiant/pull/259) [`167b43c`](https://github.com/ecopages/radiant/commit/167b43cfe131cbaaa0d6a88af90cf7ee6c4fe212) Thanks [@andeeplus](https://github.com/andeeplus)! - Field ARIA wiring reads `data-rui-aria-target` / `data-rui-aria-targets` from the control host instead of a hardcoded date-field selector map. Floating surfaces keep a viewport-padded cross-axis and restore `matchAnchorWidth` styles when that option is turned off.

- [#254](https://github.com/ecopages/radiant/pull/254) [`4c2d47f`](https://github.com/ecopages/radiant/commit/4c2d47faf1a86e5a472020d31cd9a924b91a567e) Thanks [@andeeplus](https://github.com/andeeplus)! - Publish the live `FormStore` on `formContext.store` so scoped consumers can read and mutate values without reaching into the host.

    Hydration payloads still contain presentation only (`ready`, `revision`, `fields`, `errors`).

- [#212](https://github.com/ecopages/radiant/pull/212) [`ebc9a85`](https://github.com/ecopages/radiant/commit/ebc9a857c91c67a385b38f81154e3e7005c31918) Thanks [@andeeplus](https://github.com/andeeplus)! - Open hover-card on focus only when focus enters from outside the trigger/surface tree, and seed `hidden` on the preview surface before the host syncs.

- [#278](https://github.com/ecopages/radiant/pull/278) [`7562d9e`](https://github.com/ecopages/radiant/commit/7562d9e7957fbd08311a5fbc2382aeb973c9d243) Thanks [@andeeplus](https://github.com/andeeplus)! - `<rui-combobox trigger-kind="focus">` no longer ignores the next focus after it refocuses its own input. Select and combobox now share one focus-open rule: only focus arriving from outside the host opens the listbox.

- [#204](https://github.com/ecopages/radiant/pull/204) [`97b8b3b`](https://github.com/ecopages/radiant/commit/97b8b3bbcd750b59d25cd0f058381795cfb0dea4) Thanks [@andeeplus](https://github.com/andeeplus)! - Give menubar and menu-button items a visible hover fill via `--rui-menu-item-hover` (defaults to `--surface-container-low`).

- [#278](https://github.com/ecopages/radiant/pull/278) [`b0e40ef`](https://github.com/ecopages/radiant/commit/b0e40ef41333997cdb940ef84b5c643b2fde310d) Thanks [@andeeplus](https://github.com/andeeplus)! - Clamp the meter percent readout to `0%`–`100%` so out-of-range values match the native `<meter>` and the visual fill.

- [#234](https://github.com/ecopages/radiant/pull/234) [`fdaa242`](https://github.com/ecopages/radiant/commit/fdaa24217cebdef0d20b9600d717cae99838e9ed) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep comma-separated HTML `value` attributes on multi-select hosts, and expose the live JS property and `rui-change` detail as arrays.

    HTML `value="ca,tx"` is unchanged. JSX may still pass a string. If you read `element.value` or `event.detail.value` as a string, update:

    - `select.value === 'cat'` → `select.value[0] === 'cat'` or `select.value.includes('cat')`
    - `event.detail.value.split(',')` → `event.detail.value` is already `string[]`
    - Slider `value` is `number[]` (`[50]` or `[25, 75]`). Drop `values` / `rangeMin` / `rangeMax` view props; pass `value={[25, 75]}`.
    - Form `defaultValues` / `onSubmit` for those fields: prefer arrays (`{ language: ['ts'] }`, `{ volume: [50] }`). Strings and numbers still write because the host coerces them.

- [#244](https://github.com/ecopages/radiant/pull/244) [`5ddcf3e`](https://github.com/ecopages/radiant/commit/5ddcf3e4be3ea075c145d0ed2fdf73ca8faad0e1) Thanks [@andeeplus](https://github.com/andeeplus)! - Fix number-field commit on blur and give tag chips an accessible name.

    **@ecopages/radiant-ui**

    - `rui-number-field`: typed input now commits on blur. The focus/blur listeners were registered through delegation, which cannot observe non-bubbling events, so the committed `value` stayed empty after typing; they now use `focusin` / `focusout`.
    - `rui-date-range-picker`: same fix for the start/end input focus and blur handlers.
    - `rui-tag-group`: managed and authored tag chips now set `aria-label` from the item label. `listitem` has an author-only accessible name, so chips were unnamed for assistive tech and unreachable via `getByRole('listitem', { name })`.

- [#278](https://github.com/ecopages/radiant/pull/278) [`cbaf8b1`](https://github.com/ecopages/radiant/commit/cbaf8b159d63612ba72f75a431f485740f85f182) Thanks [@andeeplus](https://github.com/andeeplus)! - Apply the full narrow pagination chrome (icon-only previous / next, hidden page numbers) both below `40rem` and with `.rui-pagination--compact`, and add `previousText`, `previousLabel`, `nextText`, `nextLabel`, `pageLabel`, and `statusLabel` view props to localize the default copy.

- [#271](https://github.com/ecopages/radiant/pull/271) [`32bf820`](https://github.com/ecopages/radiant/commit/32bf8204640645170c50225d17fbcc1999f0d0f9) Thanks [@andeeplus](https://github.com/andeeplus)! - Announce the compact pagination position as “Page n of m” when the current page changes.

- [#217](https://github.com/ecopages/radiant/pull/217) [`a960b90`](https://github.com/ecopages/radiant/commit/a960b90220221bf34b792cdd57abb0941f0ee9de) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep an authored `value` through custom-element first-connect, and apply field defaults to composed select and combobox.

    **@ecopages/radiant**

    - A property assigned before upgrade, or an attribute set before first connect, is no longer replaced by an empty reflected `defaultValue`.

    **@ecopages/radiant-ui**

    - `RuiField` writes defaults to the composed select or combobox host. An embedded listbox is the parent's option surface, not a separate field control.

- [#259](https://github.com/ecopages/radiant/pull/259) [`8cb1f83`](https://github.com/ecopages/radiant/commit/8cb1f832e3085c0402f3766e30058e06b6f0df31) Thanks [@andeeplus](https://github.com/andeeplus)! - Preserve nested custom-element registration in component bundles and initialize calendar grids during SSR so date controls include their generated markup before client JavaScript runs.

- [#244](https://github.com/ecopages/radiant/pull/244) [`f6ba022`](https://github.com/ecopages/radiant/commit/f6ba022b3adbcc66c9abc25c37a34e51f4a562b9) Thanks [@andeeplus](https://github.com/andeeplus)! - Bind more catalog fields to light DOM declaratively.

    **@ecopages/radiant-ui**

    - More fields bind to light DOM declaratively via `@bindTo` (slider, knob, sidebar, sidebar-trigger, toast, toaster, date-field, date-range-picker, combobox, select, carousel). Note: `rui-toast` `dismissible` and `variant` changes now also re-sync their `data-*` attributes at update time, which previously required a remount.

- [#212](https://github.com/ecopages/radiant/pull/212) [`0b8452c`](https://github.com/ecopages/radiant/commit/0b8452c5f77aee2e7f8f8fe96d3b6112403e888e) Thanks [@andeeplus](https://github.com/andeeplus)! - Behavior hosts query `[data-ref]` instead of BEM class names.

    **@ecopages/radiant-ui**

    - Headless custom markup must stamp the published `data-ref` targets (carousel track, tooltip and hover-card trigger, form, field column, sidebar menu buttons, toaster list and toast surface). Class names remain presentation-only.

- [#173](https://github.com/ecopages/radiant/pull/173) [`c5f5805`](https://github.com/ecopages/radiant/commit/c5f5805a2151de186d2ff6506660eae8e6bde027) Thanks [@andeeplus](https://github.com/andeeplus)! - When a menu button popup includes `[data-autocomplete-input]`, opening the menu focuses that field so items can be filtered immediately.

- [#179](https://github.com/ecopages/radiant/pull/179) [`0bd6e21`](https://github.com/ecopages/radiant/commit/0bd6e21b7c28b8954ccae05f5348fb8a14b3a650) Thanks [@andeeplus](https://github.com/andeeplus)! - Make Pagination compact below 40rem: icon-only previous/next and a non-interactive `{page} / {count}` status. Numbered page controls stay on wider viewports.

- [#230](https://github.com/ecopages/radiant/pull/230) [`a1083c1`](https://github.com/ecopages/radiant/commit/a1083c1ae7ce3d7c79b7697ac08c68eb717e4e17) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep components working on HTTP origins without `crypto.randomUUID()`, and normalize off-step slider and knob values without decimal reflection loops.

- [#173](https://github.com/ecopages/radiant/pull/173) [`c5f5805`](https://github.com/ecopages/radiant/commit/c5f5805a2151de186d2ff6506660eae8e6bde027) Thanks [@andeeplus](https://github.com/andeeplus)! - Pointer drags on `RuiSlider` move focus to the active thumb so keyboard follow-up and assistive tech stay on the value being adjusted.

- [#179](https://github.com/ecopages/radiant/pull/179) [`4f51ceb`](https://github.com/ecopages/radiant/commit/4f51cebbda41329d4629a6babe32cbed8e10e106) Thanks [@andeeplus](https://github.com/andeeplus)! - Make the `xl` headline preset larger than `lg`.

- [#222](https://github.com/ecopages/radiant/pull/222) [`4a38cd3`](https://github.com/ecopages/radiant/commit/4a38cd323fcded9348ff92569f6c43a10a971613) Thanks [@andeeplus](https://github.com/andeeplus)! - Stop multi-select chip remove buttons from nesting inside a native trigger button, which aborted HTML parsing on the select docs page.

- [#294](https://github.com/ecopages/radiant/pull/294) [`6213258`](https://github.com/ecopages/radiant/commit/621325874450fc8892b78f91ec381c94d19e0c01) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep sidebar triggers scoped to the sidebar named by `controls`, and clear stale `aria-controls` when `controls` is cleared.

- [#278](https://github.com/ecopages/radiant/pull/278) [`38a55a2`](https://github.com/ecopages/radiant/commit/38a55a2535ed63d9f3826827b62c5624082f8aa9) Thanks [@andeeplus](https://github.com/andeeplus)! - Hide the inactive sidebar trigger again before hydration, and read trigger placement only from the `placement` attribute (the `rui-sidebar-trigger-placement--*` class and `data-placement` are no longer read, and the class is no longer emitted).

- [#271](https://github.com/ecopages/radiant/pull/271) [`d7ef14a`](https://github.com/ecopages/radiant/commit/d7ef14a89d89c31742dc8347442e25d5b08a21d5) Thanks [@andeeplus](https://github.com/andeeplus)! - `rui-sidebar-trigger` follows the sidebar's mobile mode once it attaches, including a breakpoint below 768px. Before hydration, trigger visibility uses the 768px viewport and only the sidebar that owns the trigger.

- [#221](https://github.com/ecopages/radiant/pull/221) [`29cb6df`](https://github.com/ecopages/radiant/commit/29cb6dfd9bd5610cad2a8c6ad4873ed4dabd54da) Thanks [@andeeplus](https://github.com/andeeplus)! - Stop slider and knob from rewriting reflected `value` when clamp only differs by IEEE rounding, which stacked overflow on the docs page.

- [#193](https://github.com/ecopages/radiant/pull/193) [`f4124c7`](https://github.com/ecopages/radiant/commit/f4124c7932315474adf1428f9ccc85362bb2c3e3) Thanks [@andeeplus](https://github.com/andeeplus)! - Slider and knob format readouts with `valuePrecision` (defaulting to the decimal places in `step`) without rounding the stored value.

- [#221](https://github.com/ecopages/radiant/pull/221) [`29cb6df`](https://github.com/ecopages/radiant/commit/29cb6dfd9bd5610cad2a8c6ad4873ed4dabd54da) Thanks [@andeeplus](https://github.com/andeeplus)! - Slider and knob unfilled tracks use `--rui-track-fill` (a mix of `--on-background`) so they stay visible on matching surfaces. `RuiSlider` and `RuiKnob` seed readout text and range geometry during SSR.

- [#259](https://github.com/ecopages/radiant/pull/259) [`1b7aaa5`](https://github.com/ecopages/radiant/commit/1b7aaa5035bb15b35a53a16edd84442b2a98dfba) Thanks [@andeeplus](https://github.com/andeeplus)! - Server-render `rui-sidebar-trigger` from the view that creates it so docs layouts include the toggle button, ARIA, and glyph before client JavaScript runs. The trigger host owns button presentation during SSR preparation and uses a stable accessible name (`triggerLabel`, defaulting to `Toggle sidebar`) across all placements.

- [#240](https://github.com/ecopages/radiant/pull/240) [`ffb342e`](https://github.com/ecopages/radiant/commit/ffb342e887b442631abcd608d07433cf5abf5051) Thanks [@andeeplus](https://github.com/andeeplus)! - Stop table row selection from double-toggling when a row checkbox is clicked, so checking a row selects it and clicking again unselects it.

- [#226](https://github.com/ecopages/radiant/pull/226) [`dd21362`](https://github.com/ecopages/radiant/commit/dd213624055eb26712df1715a10735d5c88cbbfe) Thanks [@andeeplus](https://github.com/andeeplus)! - Generated descendant ids (`aria-controls`, labelledby, option ids) are minted per instance and no longer reuse an authored host `id`.

- Updated dependencies:
    - `@ecopages/radiant@0.3.0`
    - `@ecopages/jsx@0.3.0`
    - `@ecopages/signals@0.3.0`
