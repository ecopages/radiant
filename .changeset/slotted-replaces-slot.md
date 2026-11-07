---
'@ecopages/radiant': minor
'@ecopages/jsx': minor
---

**Breaking:** a render-owning host places its children with `this.slotted` instead of `<slot>`. `this.slotted` holds what the parent passed and is `null` when there is none; `this.slottedElements` lists the top-level elements it rendered to. Where the children come from:

- a host created by a JSX view gets the view's children on every render;
- a host written in HTML captures its child nodes once, at first render, and nodes appended later are not slotted;
- a host inside another host's view receives them when that view hydrates.

| Before | After |
| --- | --- |
| `<slot />` in `render()` | `{this.slotted}` |
| `<slot>Fallback</slot>` | `{this.slotted ?? <p>Fallback</p>}` |
| `<slot name="header" />` with `slot="header"` children | a `header` property (`<x-card header={<h2 />}>`, rendered with `{this.header}`), or composition |
| `getSlotElements()`, `getSlotElement()`, `@querySlot` | `this.slottedElements` |
| `createQuerySlot` from `@ecopages/radiant/helpers` | `this.slottedElements` |

Also removed:

- named projection from HTML (`slot="name"` children);
- the `data-radiant-ssr="authored"` stamp;
- the `slot="name"` and appended-nodes development warnings;
- the `@ecopages/radiant/decorators/query-slot` and `@ecopages/radiant/helpers/create-query-slot` entries.

In `@ecopages/jsx`, `<slot>` is now an ordinary element, and `SlotJsxValue` and `isSlotJsxValue` are no longer exported.

A server-rendered host outside every host's view now always takes the page JSX's children when the page hydrates over it, with live bindings. It no longer keeps the server's children. The Radiant client bundle shrinks by about 3 KB raw.
