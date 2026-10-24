# @ecopages/radiant-ui

## 0.2.3

### Patch Changes

- [#388](https://github.com/ecopages/radiant/pull/388) [`6a097db`](https://github.com/ecopages/radiant/commit/6a097db52875b557ca267146f91ea7f43324b883) Thanks [@andeeplus](https://github.com/andeeplus)! - Accept native control attributes on `RuiInput`, `RuiTextarea`, `RuiButton`, and the other native input and button helpers, so props such as `required`, `autocomplete`, `name`, and `value` type-check the same way they do on the intrinsic elements.

- [#387](https://github.com/ecopages/radiant/pull/387) [`1a08f6d`](https://github.com/ecopages/radiant/commit/1a08f6d040c27dbdaed14343facc6511fab40611) Thanks [@andeeplus](https://github.com/andeeplus)! - Emit `RuiLabel`'s `htmlFor` prop as the HTML `for` attribute so the label is associated with its control.

## 0.2.2

### Patch Changes

- [#353](https://github.com/ecopages/radiant/pull/353) [`c7b9520`](https://github.com/ecopages/radiant/commit/c7b9520b8c3e81383432f31eac3f5b08e6a66cd5) Thanks [@andeeplus](https://github.com/andeeplus)! - **@ecopages/radiant**

    `@query` and `@event` check the declared field against the value they install, under standard decorators, and the type argument of `@query` and `createQuery` is now the element type. The context decorators, `@querySlot` and `createQuerySlot` are covered in their own entries.

    **Breaking:** a single-element `@query` field must include `null`, because the query returns `null` when nothing matches. With `all: true` the field is an array. A field that leaves `null` out, or an array field without `all: true`, compiled before and no longer does:

    ```ts
    // before: compiled, and `this.input.focus()` threw when the ref was missing
    @query({ ref: 'input' }) input!: HTMLInputElement;
    @query({ ref: 'item' }) items!: HTMLLIElement[];
    // after
    @query({ ref: 'input' }) input!: HTMLInputElement | null;
    @query({ ref: 'item', all: true }) items!: HTMLLIElement[];
    ```

    `all` has to be a literal `true` or `false`, or left out, because it picks the field type. `createQuery`'s `.value` is `T[]` with `all: true` and `T | null` otherwise. With a `boolean` variable for `all` it is `Element[] | Element | null`, and `createQuery` then takes no type argument. The type argument used to be the whole result:

    ```ts
    // before
    @query<HTMLElement[]>({ selector: '.item', all: true }) items!: HTMLElement[];
    createQuery<HTMLElement[]>(this, { selector: '.item', all: true });
    // after
    @query<HTMLElement>({ selector: '.item', all: true }) items!: HTMLElement[];
    createQuery<HTMLElement>(this, { selector: '.item', all: true });
    ```

    **Breaking:** `@event` installs an `EventEmitter`, so its field has to be one, and cannot be optional:

    ```ts
    // before: compiled
    @event({ name: 'change' }) change!: string;
    @event({ name: 'select' }) select?: EventEmitter<string>;
    // after
    @event({ name: 'change' }) change!: EventEmitter<string>;
    @event({ name: 'select' }) select!: EventEmitter<string>;
    ```

    Legacy decorators never see the field type and compile as before.

    **@ecopages/radiant-ui**

    Components declare their `@query` fields with `| null` and guard the places that used them. Behaviour with complete markup is unchanged.

- [#381](https://github.com/ecopages/radiant/pull/381) [`a33c600`](https://github.com/ecopages/radiant/commit/a33c60099eb614df9880d1b0a105f13f85143609) Thanks [@andeeplus](https://github.com/andeeplus)! - Make the optional themes match the systems they reference.

    - Windows 95 gains a flat menu bar with navy menu highlights, a trackbar slider, raised arrow buttons on drop-downs and combo boxes, sunken list boxes and tree views with plus/minus boxes, pale yellow tooltips, and a dark mode whose bevels read as relief. The calendar title text is no longer navy on navy.
    - Mac OS Classic styles table and tree headers, menus, tooltips, tags, sliders and progress bars as Platinum, and unselected tabs in dark mode meet 4.5:1.
    - macOS follows Sonoma AppKit: SF Pro at 13px, hairline-outlined push buttons, accent-filled default buttons, pop-up buttons, segmented tabs above their panel, and translucent menus and popovers.
    - GitHub uses Primer's roles: blue for links, focus and selected states, green limited to the primary button, the meter and success states, and Primer's grey and danger buttons.
    - Vercel uses current Geist colors and menus, VS Code follows Light Modern and Dark Modern (26px controls at 13px, secondary buttons, editor-style tabs), Cloudflare no longer uses orange for selected items and has Kumo's 26, 36 and 40px controls, Material uses the Material 3 baseline scheme, and High Contrast keeps radios round and muted text above 7:1.
    - Popovers, toasts and table headers are styled on the elements that draw them in the themes that style them: `.rui-popover`, `.rui-toast` and `.rui-table__column`.
    - The sidebar stylesheet is layered in `@layer components`, so themes can style the active item.

- Updated dependencies [[`9627747`](https://github.com/ecopages/radiant/commit/9627747aa6d583dcb256d1e46190cfe58802f02e), [`6ccd110`](https://github.com/ecopages/radiant/commit/6ccd110e62a2b562a5d1e5e2e9f62ea29eb6c340), [`c5a80bc`](https://github.com/ecopages/radiant/commit/c5a80bc279ec0a99c067eef356b88662da2be929), [`965f3ff`](https://github.com/ecopages/radiant/commit/965f3ff94e73e437f09082bd6bcaa69457e30127), [`2d5caa5`](https://github.com/ecopages/radiant/commit/2d5caa52eded75d05b4b34e66f20b86137a8ec97), [`c7b9520`](https://github.com/ecopages/radiant/commit/c7b9520b8c3e81383432f31eac3f5b08e6a66cd5), [`54fe77a`](https://github.com/ecopages/radiant/commit/54fe77a6e688b65cd0481ff273387b5782fedcc6), [`9ffeb18`](https://github.com/ecopages/radiant/commit/9ffeb18017b38af04dbed5c56f689bf9ae5b4e04), [`ce702f5`](https://github.com/ecopages/radiant/commit/ce702f503fc6b231f1a7910b62a5b0e37d7fd258), [`e2fbfed`](https://github.com/ecopages/radiant/commit/e2fbfedd7b3e9847228ed699061e7c27da8b92d3)]:
    - @ecopages/radiant@0.5.0
    - @ecopages/jsx@0.5.0
    - @ecopages/signals@0.5.0

## 0.2.1

### Patch Changes

- [#322](https://github.com/ecopages/radiant/pull/322) [`09b2088`](https://github.com/ecopages/radiant/commit/09b208841fca88373ae77c3c9e7db4e4436af225) Thanks [@andeeplus](https://github.com/andeeplus)! - Refine the theme catalog released in 0.2.0.

    - Composite fields draw one frame in every theme, including the classic-theme field treatments, and the standalone `rui-date-input` surface follows the same rule.
    - Treegrids read as trees in every theme: no divider under each row, only the header rule. VS Code, GitHub, macOS, Mac OS Classic and Windows 95 add per-level indentation and their native disclosure affordances.
    - Cloudflare's primary orange is `#cc3a00` in light and dark mode (5:1 against white) instead of switching to the brighter orange in dark mode.
    - Polish theme catalog controls across the optional themes.

- Updated dependencies [[`c9cc095`](https://github.com/ecopages/radiant/commit/c9cc095366e09d0251684a290d049f68f4c75369), [`33f9c54`](https://github.com/ecopages/radiant/commit/33f9c549f4bb23c5c6dcd8efc98d4f070a8ce88d), [`3f137ca`](https://github.com/ecopages/radiant/commit/3f137caf6c7418c4b105c45a23422c5a44f70fcb), [`dc5b87f`](https://github.com/ecopages/radiant/commit/dc5b87f6f5d4b2275cff0eb2dd9b4904f0321107), [`375b200`](https://github.com/ecopages/radiant/commit/375b20007b1a93778e1f907838e6365881420260), [`e5b9ff6`](https://github.com/ecopages/radiant/commit/e5b9ff62ac3ed1eba201d08e8054a12142d045c2), [`0121714`](https://github.com/ecopages/radiant/commit/0121714d5e3358e65256c5231cd614bd8ab81c60), [`dad8379`](https://github.com/ecopages/radiant/commit/dad8379fae51087328da8946e6a0c53bdb55f724), [`4bf5a10`](https://github.com/ecopages/radiant/commit/4bf5a10a96e2c72ffb21714b5442516eb86baf7d), [`6ff24ce`](https://github.com/ecopages/radiant/commit/6ff24cee309429cf2332d8be6e95c9a73ea194d1), [`2f53f5b`](https://github.com/ecopages/radiant/commit/2f53f5b1c67ae9ae52092b75fb30bb84acdb0234)]:
    - @ecopages/jsx@0.4.0
    - @ecopages/radiant@0.4.0
    - @ecopages/signals@0.4.0

## 0.2.0

### Minor Changes

- [#306](https://github.com/ecopages/radiant/pull/306) [`a3a8234`](https://github.com/ecopages/radiant/commit/a3a8234c107b5955ce3cd983ba4edcc3fae18821) Thanks [@andeeplus](https://github.com/andeeplus)! - Radiant UI now ships one OKLCH-derived Radiant Default theme with stronger control boundaries and shared accessibility support. `@ecopages/radiant-themes` adds High Contrast, Windows 95, Mac OS Classic, macOS, and Material Design alongside GitHub, VS Code, and Vercel. Each optional theme includes its own font stacks, a compact variant, and component-specific styling where needed.

    If your app used an earlier Radiant palette or preset export, switch to the single default theme and tune `--rui-primary`, `--rui-secondary`, and `--rui-neutral`, or install `@ecopages/radiant-themes/<theme>` for a complete visual system. For compact spacing, import `@ecopages/radiant-ui/tokens/spacing/compact` after Radiant Default, or use a complete theme's `/compact` export, such as `@ecopages/radiant-themes/github/compact`. See the [theme migration guide](https://radiant.ecopages.app/docs/getting-started/theming).

- [#306](https://github.com/ecopages/radiant/pull/306) [`a3a8234`](https://github.com/ecopages/radiant/commit/a3a8234c107b5955ce3cd983ba4edcc3fae18821) Thanks [@andeeplus](https://github.com/andeeplus)! - Make decorative borders recede. Radiant Default's semantic border alpha drops from 40% to 20%, and GitHub, VS Code, Material Design, and macOS use their subtle divider colors for `--border` instead of the strong control-border color. Control borders stay solid for accessible contrast.

### Migration from 0.1.x

0.2.0 removes these exports that 0.1.0 published. They were not listed in the notes above.

| Removed export                                                                                                         | Replacement                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `@ecopages/radiant-ui/themes/glacier`, `@ecopages/radiant-ui/themes/aurora`                                            | `@ecopages/radiant-ui/themes/default`, then tune the seed variables `--rui-primary`, `--rui-secondary` and `--rui-neutral` |
| `@ecopages/radiant-ui/themes/default-compact-soft`                                                                     | `@ecopages/radiant-ui/themes/default` followed by `@ecopages/radiant-ui/tokens/spacing/compact`                            |
| `@ecopages/radiant-ui/tokens/colors/aurora`, `tokens/colors/glacier`, `tokens/colors/basalt`, `tokens/colors/palettes` | `@ecopages/radiant-ui/tokens/colors/rui-default`, or a complete theme from `@ecopages/radiant-themes`                      |

`@ecopages/radiant-ui/themes/default` kept its path but is now the Radiant Default theme; in 0.1.0 it aliased Glacier, so its colors change. The Aurora, Glacier and Basalt palettes have no direct replacement; set the seed variables to approximate them. For a compact optional theme, import its compact entry, such as `@ecopages/radiant-themes/github/compact`.

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
