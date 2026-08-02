# @ecopages/radiant-ui

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
