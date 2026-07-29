# @ecopages/radiant-ui

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
