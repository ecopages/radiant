---
'@ecopages/jsx': patch
'@ecopages/radiant': patch
---

A render-owning `RadiantElement` inside another host's view now keeps its server-rendered node when the parent hydrates, instead of being replaced by a new client instance. Its view, the children the parent passed it (as JSX children or through a property), focus, selection and typed input survive, the parent no longer builds a second instance of it, and `isServerRendered` reports `true`.

- In hydrate-mode SSR, a nested host that receives JSX children is stamped `data-radiant-ssr="children"`. With the hydrator installed it stays inert until the parent's view hands it its children (no event bindings; `@bindTo`, `onConnected()` and `updated()` wait, and so do render requests), then hydrates, whichever of the two tags is defined first. A nested host whose parent never renders on the client stays inert server markup.
- A server-rendered host now hydrates even when its own view has no hydration marker, for example a view whose only bindings are on the hosts it renders.
- `hydrate()` from `@ecopages/jsx` keeps the server node of a custom element that takes its children as a value (`CUSTOM_ELEMENT_CHILDREN_SYMBOL`) and binds only that element's own attributes, properties, events and children. It counts hydration markers inside nested custom elements when deciding whether the target holds server output, and inserts empty text nodes of a child list, which the server markup has no node for.
- Other custom elements, a tag defined only after the parent hydrated, and server markup that does not match the view are still rendered again by the parent.
