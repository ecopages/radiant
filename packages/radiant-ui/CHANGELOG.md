# @ecopages/radiant-ui

## 0.1.0-rc.2

### Patch Changes

- Republish rc.2 with rebuilt distribution artifacts.

    **@ecopages/radiant-ui**

    - Ship `RuiForm` `onSubmit`, `action`, and `method` in the published package. These were documented in rc.1 but missing from the rc.1 tarball.

- Updated dependencies []:
    - @ecopages/jsx@0.3.0-rc.2
    - @ecopages/radiant@0.3.0-rc.2
    - @ecopages/signals@0.3.0-rc.2

## 0.1.0-rc.1

### Minor Changes

- [#163](https://github.com/ecopages/radiant/pull/163) [`0d4e4f5`](https://github.com/ecopages/radiant/commit/0d4e4f53621dbf6830fbdf23305383ad386576c4) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `RuiForm` `onSubmit`, `action`, and `method` support, plus form-context error state. `onSubmit` receives validated values; without it, forms with an action or method submit natively after validation.

## 0.1.0-rc.0

### Breaking Changes

- Rui JSX views now type the declared root host. Custom-element views use
  `JsxCustomElementAttributes`; native helpers use `JsxElementProps` plus the
  unprefixed native fields they render. Global attributes, events, direct and
  structured ARIA/data props, and `attr:`/`prop:` bindings are forwarded to that
  surface. View-only collections are peeled before rendering. Direct kebab-case
  ARIA/data attributes take precedence over structured values, including `null`.
  Collection item `id` values remain semantic keys (`Omit` from the host `id`)
  and are not emitted as literal DOM ids. Native helpers keep typed `prop:*`
  bindings; polymorphic hosts (`as` / `href`) derive the element type in the
  component, not by weakening `JsxElementProps`. Deprecated select/combobox
  option aliases and mask helper aliases have been removed. Component authors
  can import `withDefaultAriaLabel` from `@ecopages/radiant-ui/aria` when a
  Radiant view needs an overridable accessible-name fallback.

### Minor Changes

- [#150](https://github.com/ecopages/radiant/pull/150) [`4e2ca6e`](https://github.com/ecopages/radiant/commit/4e2ca6eccda03138df1bcfcfcfc7410165e42bbc) Thanks [@andeeplus](https://github.com/andeeplus)! - Complete every named hue scale to steps 50–975.

    **@ecopages/radiant-ui**

    - Glacier and Basalt palette hues now ship the same 12-step ramp as Aurora (50–975). Existing stops used by colour presets are unchanged.
    - The semantic gray utilities remain 50–950.

- [#148](https://github.com/ecopages/radiant/pull/148) [`bd90818`](https://github.com/ecopages/radiant/commit/bd908183584fe1e41b892a038fd4b0901ebf4f79) Thanks [@andeeplus](https://github.com/andeeplus)! - Apply `mobileDefaultOpen` when the viewport crosses into mobile, not only on first connect.

    **@ecopages/radiant-ui**

    - Uncontrolled `rui-sidebar` now closes (or opens) to `mobileDefaultOpen` when resizing below `mobileBreakpoint`, so a desktop-open pane does not become an overlay drawer.
    - Controlled `open` is left unchanged on viewport crossings; listen to `rui-sidebar-mobile-change` if the parent needs to react.

- [#149](https://github.com/ecopages/radiant/pull/149) [`5882151`](https://github.com/ecopages/radiant/commit/5882151cd5a83854e4c14235a80d4b21a89fecfd) Thanks [@andeeplus](https://github.com/andeeplus)! - Drop the textarea `size` variants.

    **@ecopages/radiant-ui**

    - `RuiTextarea` no longer accepts `size`. Height comes from `rows` and the shared control tokens.

### Patch Changes

- [#147](https://github.com/ecopages/radiant/pull/147) [`263295c`](https://github.com/ecopages/radiant/commit/263295c44755e8516a49b5b913922b10355f307f) Thanks [@andeeplus](https://github.com/andeeplus)! - Serialize nested custom-element light DOM with the active SSR renderer.

    **@ecopages/jsx**

    - Registered custom elements inside another server-rendered custom element now preserve the active SSR custom-element renderer and hydration state.

    **@ecopages/radiant-ui**

    - `RuiCycleToggle`, `RuiRadioGroup`, and `RuiSelect` no longer need `attr:` prefixes for ordinary host props during nested SSR.

- Start the rc channel from the current beta line.

- [#150](https://github.com/ecopages/radiant/pull/150) [`5497b29`](https://github.com/ecopages/radiant/commit/5497b296ec919db969f92bd462fcb5f472a2d7a4) Thanks [@andeeplus](https://github.com/andeeplus)! - Move black and white to system tokens.

    **@ecopages/radiant-ui**

    - `--color-black` and `--color-white` now live in `tokens/system.css`, so every theme gets them without loading the Aurora pack.

- Updated dependencies [[`263295c`](https://github.com/ecopages/radiant/commit/263295c44755e8516a49b5b913922b10355f307f), [`61c6bfb`](https://github.com/ecopages/radiant/commit/61c6bfbd381f0890e13d19605e292b147602e407)]:
    - @ecopages/jsx@0.3.0-rc.0
    - @ecopages/radiant@0.3.0-rc.0
    - @ecopages/signals@0.3.0-rc.0

## 0.1.0-beta.8

### Patch Changes

- Prepare the next beta release.

- Updated dependencies []:
    - @ecopages/jsx@0.3.0-beta.8
    - @ecopages/radiant@0.3.0-beta.8
    - @ecopages/signals@0.3.0-beta.8

## 0.1.0-beta.5

### Minor Changes

- Add composable presentational building blocks and refactor Feed to a compound API.

    **@ecopages/radiant-ui**

    - Add `RuiHeadline`, `RuiHeading`, `RuiAvatar`, `RuiButtonGroup`, `RuiChip`, and `RuiChipList`.
    - Refactor `RuiFeed` to a presentational compound component and remove the `rui-feed` custom element.

### Patch Changes

- Updated dependencies []:
    - @ecopages/radiant@0.3.0-beta.6
    - @ecopages/signals@0.3.0-beta.6
    - @ecopages/jsx@0.3.0-beta.6

## 0.1.0-beta.4

### Minor Changes

- [#105](https://github.com/ecopages/radiant/pull/105) [`99c22cf`](https://github.com/ecopages/radiant/commit/99c22cf843d2363ffc9e81b86c6da1595b3e67cd) Thanks [@andeeplus](https://github.com/andeeplus)! - Add calendar, date, number, popover, select, autocomplete, and tag-group components. `RuiNumberField` is the only number-entry component; use its `minValue` and `maxValue` props.

## 0.1.0-beta.3

### Patch Changes

- Prepare the next beta release.

- Updated dependencies []:
    - @ecopages/radiant@0.3.0-beta.5
    - @ecopages/signals@0.3.0-beta.5
    - @ecopages/jsx@0.3.0-beta.5

## 0.1.0-beta.2

### Minor Changes

- [#77](https://github.com/ecopages/radiant/pull/77) [`d7e737d`](https://github.com/ecopages/radiant/commit/d7e737dd972d64226940d08d4746d80fe1efe3ba) Thanks [@andeeplus](https://github.com/andeeplus)! - Remove `@floating-ui/dom` and position tooltips and menu buttons with an in-package floating helper.

    **@ecopages/radiant-ui**

    - Drop the `@floating-ui/dom` dependency.
    - `rui-tooltip` and `rui-menu-button` use `computeFloatingCoords` / `attachFloating` for fixed placement, primary-axis flip by free space, and cross-axis viewport clamping.
    - Close open menubar menus when activating a top-level item without a submenu.

## 0.1.0-beta.1

### Patch Changes

- Compile published CSS with Tailwind v4 PostCSS so dist ships browser-ready styles (no `@apply` / `@reference`), while keeping theme and token values as CSS custom properties for runtime theme swaps. Output is not minified.
