# @ecopages/storybook-radiant-vite

## 0.1.0-rc.1

### Patch Changes

- [#214](https://github.com/ecopages/radiant/pull/214) [`90304d9`](https://github.com/ecopages/radiant/commit/90304d98a4146a05a0c8e3a864794c8d42ec5073) Thanks [@andeeplus](https://github.com/andeeplus)! - Install required Storybook preview packages on Node `globalThis` during Vite SSR so `ssrLoadModule` can evaluate stories and shared helper modules that import `storybook/test` and sibling preview packages.
- Updated dependencies []:
    - @ecopages/vite-plugin-radiant@0.1.0-rc.1

## 0.1.0-rc.0

### Minor Changes

- First publish of the Storybook Vite framework for Radiant (client + SSR → hydrate story modes).
