---
'@ecopages/jsx': minor
'@ecopages/radiant': patch
'@ecopages/storybook-radiant-vite': patch
'@ecopages/vite-plugin-radiant': patch
---

Use a registered custom-element class directly as a JSX element type (`<UserCard name="Ada" />`). Declare its public props with `declare readonly [JSX_PROPS]?: Props` (`import type { JSX_PROPS } from '@ecopages/jsx'`); a tag listed in `HTMLElementTagNameMap` gets the same props. JSX finds the tag from `@customElement(...)` metadata or `customElements.getName()`, on the server too. Rendering an unregistered class, or one that extends a built-in element other than `HTMLElement`, throws a `TypeError` naming the class. `CUSTOM_ELEMENT_TAG_NAME` and `getCustomElementTagName()` are exported from `@ecopages/jsx`. Existing `JsxCustomIntrinsicElements` augmentations keep working. `getCustomElementTagName()` reads a class's own `@customElement(...)` tag only, so a subclass defined with `customElements.define()` renders its own tag instead of its parent's.
