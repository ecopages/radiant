# @ecopages/radiant-ui

## 0.1.0-beta.1

### Patch Changes

- Compile published CSS with Tailwind v4 PostCSS so dist ships browser-ready styles (no `@apply` / `@reference`), while keeping theme and token values as CSS custom properties for runtime theme swaps. Output is not minified.
